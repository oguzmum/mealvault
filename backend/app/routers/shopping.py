from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models.dish import ShoppingCategory
from app.models.shopping import ShoppingList, ShoppingListItem
from app.services.shopping import build_shopping_list

router = APIRouter(tags=["shopping"])


class ShoppingItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: ShoppingCategory
    amount: float | None
    unit: str | None
    note: str | None
    checked: bool


class ShoppingListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    start_date: date
    end_date: date
    items: list[ShoppingItemOut]


class GenerateListIn(BaseModel):
    start: date
    end: date


class ItemPatch(BaseModel):
    checked: bool


@router.post("/shopping-lists/generate", response_model=ShoppingListOut)
def generate_list(payload: GenerateListIn, db: Session = Depends(get_db)):
    if payload.end < payload.start:
        raise HTTPException(status_code=422, detail="end must not be before start")
    return build_shopping_list(db, payload.start, payload.end)


@router.get("/shopping-lists/current", response_model=ShoppingListOut | None)
def get_current_list(start: date | None = None, db: Session = Depends(get_db)):
    """Latest generated list, optionally the one for a specific start date."""
    query = select(ShoppingList).options(selectinload(ShoppingList.items))
    if start is not None:
        query = query.where(ShoppingList.start_date == start)
    query = query.order_by(ShoppingList.created_at.desc(), ShoppingList.id.desc()).limit(1)
    return db.scalar(query)


@router.patch("/shopping-list-items/{item_id}", response_model=ShoppingItemOut)
def patch_item(item_id: int, payload: ItemPatch, db: Session = Depends(get_db)):
    item = db.get(ShoppingListItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Shopping list item not found")
    item.checked = payload.checked
    db.commit()
    return item
