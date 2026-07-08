from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.dish import DishListItem
from app.services.search import search_dishes_by_ingredients

router = APIRouter(prefix="/search", tags=["search"])


class IngredientSearchIn(BaseModel):
    ingredients: list[str] = Field(min_length=1)
    max_missing: int = Field(default=2, ge=0, le=10)


class IngredientSearchResult(BaseModel):
    dish: DishListItem
    total: int
    matched: int
    missing: list[str]


@router.post("/by-ingredients", response_model=list[IngredientSearchResult])
def search_by_ingredients(payload: IngredientSearchIn, db: Session = Depends(get_db)):
    matches = search_dishes_by_ingredients(db, payload.ingredients, payload.max_missing)
    return [
        IngredientSearchResult(
            dish=DishListItem.model_validate(match.dish),
            total=match.total,
            matched=match.matched,
            missing=match.missing,
        )
        for match in matches
    ]
