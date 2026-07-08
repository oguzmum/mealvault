import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.config import settings
from app.database import get_db
from app.models.dish import Dish, DishSource, Tag, dish_tags
from app.schemas.dish import DishIn, DishListItem, DishOut
from app.services.dishes import apply_dish_payload

router = APIRouter(prefix="/dishes", tags=["dishes"])

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_IMAGE_BYTES = 10 * 1024 * 1024


def get_dish_or_404(db: Session, dish_id: int) -> Dish:
    dish = db.get(
        Dish,
        dish_id,
        options=[selectinload(Dish.ingredients), selectinload(Dish.steps), selectinload(Dish.tags)],
    )
    if dish is None:
        raise HTTPException(status_code=404, detail="Dish not found")
    return dish


@router.get("", response_model=list[DishListItem])
def list_dishes(
    db: Session = Depends(get_db),
    q: str | None = None,
    tags: list[str] = Query(default=[]),
    max_time: int | None = Query(default=None, ge=0),
    kcal_min: float | None = Query(default=None, ge=0),
    kcal_max: float | None = Query(default=None, ge=0),
    source: DishSource | None = None,
):
    query = select(Dish).options(selectinload(Dish.tags)).order_by(Dish.name)
    if q:
        query = query.where(Dish.name.ilike(f"%{q}%"))
    if max_time is not None:
        query = query.where(Dish.cook_time_minutes <= max_time)
    if kcal_min is not None:
        query = query.where(Dish.kcal >= kcal_min)
    if kcal_max is not None:
        query = query.where(Dish.kcal <= kcal_max)
    if source is not None:
        query = query.where(Dish.source == source)
    for slug in tags:
        # One EXISTS per slug: dish must carry every requested tag
        query = query.where(
            select(dish_tags)
            .join(Tag, Tag.id == dish_tags.c.tag_id)
            .where(dish_tags.c.dish_id == Dish.id, Tag.slug == slug)
            .exists()
        )
    return db.scalars(query).all()


@router.post("", response_model=DishOut, status_code=201)
def create_dish(payload: DishIn, db: Session = Depends(get_db)):
    dish = apply_dish_payload(db, Dish(), payload)
    db.add(dish)
    db.commit()
    return get_dish_or_404(db, dish.id)


@router.get("/{dish_id}", response_model=DishOut)
def get_dish(dish_id: int, db: Session = Depends(get_db)):
    return get_dish_or_404(db, dish_id)


@router.put("/{dish_id}", response_model=DishOut)
def update_dish(dish_id: int, payload: DishIn, db: Session = Depends(get_db)):
    dish = get_dish_or_404(db, dish_id)
    apply_dish_payload(db, dish, payload)
    db.commit()
    return get_dish_or_404(db, dish_id)


@router.delete("/{dish_id}", status_code=204)
def delete_dish(dish_id: int, db: Session = Depends(get_db)):
    dish = get_dish_or_404(db, dish_id)
    if dish.image_path:
        _delete_image_file(dish.image_path)
    db.delete(dish)
    db.commit()


@router.post("/{dish_id}/image", response_model=DishOut)
def upload_dish_image(dish_id: int, file: UploadFile, db: Session = Depends(get_db)):
    dish = get_dish_or_404(db, dish_id)

    extension = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if extension is None:
        raise HTTPException(status_code=415, detail="Only JPEG, PNG or WebP images are allowed")

    content = file.file.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds the 10 MB limit")

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{extension}"
    (upload_dir / filename).write_bytes(content)

    if dish.image_path:
        _delete_image_file(dish.image_path)
    dish.image_path = f"/uploads/{filename}"
    db.commit()
    return get_dish_or_404(db, dish_id)


def _delete_image_file(image_path: str) -> None:
    candidate = Path(settings.upload_dir) / Path(image_path).name
    candidate.unlink(missing_ok=True)
