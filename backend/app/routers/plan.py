from datetime import date as date_type
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.dish import Dish
from app.models.plan import PlanEntry, PlanSlot
from app.schemas.plan import (
    DayNutritionOut,
    NutritionTotalsOut,
    PlanEntryIn,
    PlanEntryOut,
    PlanEntryUpdate,
    PlanOut,
    PlanSlotIn,
    PlanSlotMove,
    PlanSlotOut,
)
from app.schemas.dish import DishListItem
from app.services.generator import generate_plan
from app.services.nutrition import aggregate_nutrition
from app.routers.settings import get_or_create_settings
from pydantic import BaseModel, Field

router = APIRouter(prefix="/plan", tags=["plan"])

DEFAULT_SLOTS = ["Frühstück", "Mittag"]


def get_or_create_default_slots(db: Session) -> list[PlanSlot]:
    slots = db.scalars(select(PlanSlot).order_by(PlanSlot.position)).all()
    if slots:
        return list(slots)
    slots = [
        PlanSlot(name=name, position=index, is_default=True)
        for index, name in enumerate(DEFAULT_SLOTS)
    ]
    db.add_all(slots)
    db.commit()
    return slots


@router.get("/slots", response_model=list[PlanSlotOut])
def list_slots(db: Session = Depends(get_db)):
    return get_or_create_default_slots(db)


@router.post("/slots", response_model=PlanSlotOut, status_code=201)
def create_slot(payload: PlanSlotIn, db: Session = Depends(get_db)):
    existing = get_or_create_default_slots(db)
    next_position = max((slot.position for slot in existing), default=-1) + 1
    slot = PlanSlot(name=payload.name, position=next_position, is_default=False)
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


@router.post("/slots/{slot_id}/move", response_model=list[PlanSlotOut])
def move_slot(slot_id: int, payload: PlanSlotMove, db: Session = Depends(get_db)):
    slots = get_or_create_default_slots(db)
    index = next((i for i, slot in enumerate(slots) if slot.id == slot_id), None)
    if index is None:
        raise HTTPException(status_code=404, detail="Slot not found")

    swap_with = index - 1 if payload.direction == "up" else index + 1
    if 0 <= swap_with < len(slots):
        slots[index].position, slots[swap_with].position = (
            slots[swap_with].position,
            slots[index].position,
        )
        db.commit()

    return db.scalars(select(PlanSlot).order_by(PlanSlot.position)).all()


@router.delete("/slots/{slot_id}", status_code=204)
def delete_slot(slot_id: int, db: Session = Depends(get_db)):
    slot = db.get(PlanSlot, slot_id)
    if slot is None:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.is_default:
        raise HTTPException(status_code=400, detail="Default slots cannot be deleted")
    db.delete(slot)
    db.commit()


@router.get("", response_model=PlanOut)
def get_plan(
    start: date_type,
    days: int = Query(default=7, ge=1, le=31),
    db: Session = Depends(get_db),
):
    end = start + timedelta(days=days)
    entries = db.scalars(
        select(PlanEntry)
        .where(PlanEntry.date >= start, PlanEntry.date < end)
        .order_by(PlanEntry.date)
    ).all()
    day_sums, totals = aggregate_nutrition(entries, start, days)
    return PlanOut(
        start=start,
        days=days,
        entries=[PlanEntryOut.model_validate(entry) for entry in entries],
        day_sums=[DayNutritionOut(**vars(day)) for day in day_sums],
        totals=NutritionTotalsOut(**vars(totals)),
    )


@router.post("/entries", response_model=PlanEntryOut, status_code=201)
def create_entry(payload: PlanEntryIn, db: Session = Depends(get_db)):
    """Add a dish to a day/slot (a slot may hold several dishes)."""
    if db.get(Dish, payload.dish_id) is None:
        raise HTTPException(status_code=404, detail="Dish not found")
    if db.get(PlanSlot, payload.slot_id) is None:
        raise HTTPException(status_code=404, detail="Slot not found")

    entry = PlanEntry(**payload.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.patch("/entries/{entry_id}", response_model=PlanEntryOut)
def update_entry(entry_id: int, payload: PlanEntryUpdate, db: Session = Depends(get_db)):
    """Edit an existing entry in place, e.g. to move it to another slot."""
    entry = db.get(PlanEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Plan entry not found")

    data = payload.model_dump(exclude_unset=True)
    if "dish_id" in data and db.get(Dish, data["dish_id"]) is None:
        raise HTTPException(status_code=404, detail="Dish not found")
    if "slot_id" in data and db.get(PlanSlot, data["slot_id"]) is None:
        raise HTTPException(status_code=404, detail="Slot not found")
    for key, value in data.items():
        setattr(entry, key, value)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/entries/{entry_id}", status_code=204)
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.get(PlanEntry, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Plan entry not found")
    db.delete(entry)
    db.commit()


class GenerateIn(BaseModel):
    start: date_type
    days: int = Field(default=7, ge=1, le=14)
    slot_ids: list[int] | None = Field(default=None, min_length=1)


class GeneratedEntry(BaseModel):
    date: date_type
    slot_id: int
    dish: DishListItem


class GenerateOut(BaseModel):
    entries: list[GeneratedEntry]


class ApplyIn(BaseModel):
    entries: list[PlanEntryIn]


@router.post("/generate", response_model=GenerateOut)
def generate(payload: GenerateIn, db: Session = Depends(get_db)):
    """Suggest a plan for the given range; nothing is persisted."""
    settings_row = get_or_create_settings(db)
    slot_ids = payload.slot_ids
    if slot_ids is None:
        slot_ids = [slot.id for slot in get_or_create_default_slots(db)]
    suggestions = generate_plan(db, payload.start, payload.days, slot_ids, settings_row)
    return GenerateOut(
        entries=[
            GeneratedEntry(
                date=slot.day,
                slot_id=slot.slot_id,
                dish=DishListItem.model_validate(slot.dish),
            )
            for slot in suggestions
        ]
    )


@router.post("/apply", response_model=dict)
def apply_plan(payload: ApplyIn, db: Session = Depends(get_db)):
    """Persist an (edited) suggestion as new plan entries, added to any slot."""
    for item in payload.entries:
        if db.get(Dish, item.dish_id) is None:
            raise HTTPException(status_code=404, detail=f"Dish {item.dish_id} not found")
        db.add(PlanEntry(**item.model_dump()))
    db.commit()
    return {"applied": len(payload.entries)}
