from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.dish import Ingredient, Tag
from app.schemas.dish import TagOut
from pydantic import BaseModel, ConfigDict


class IngredientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    shopping_category: str


router = APIRouter(tags=["meta"])


@router.get("/tags", response_model=list[TagOut])
def list_tags(db: Session = Depends(get_db)):
    return db.scalars(select(Tag).order_by(Tag.name)).all()


@router.get("/ingredients", response_model=list[IngredientOut])
def list_ingredients(q: str | None = None, db: Session = Depends(get_db)):
    query = select(Ingredient).order_by(Ingredient.name)
    if q:
        query = query.where(Ingredient.name.ilike(f"%{q}%"))
    return db.scalars(query.limit(50)).all()
