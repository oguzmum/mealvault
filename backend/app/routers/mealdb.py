import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.importers.mealdb import import_single_meal, map_meal, search_meals
from app.models.dish import Dish
from app.schemas.dish import DishOut
from app.schemas.mealdb import MealDbSearchResult

router = APIRouter(prefix="/mealdb", tags=["mealdb"])


@router.get("/search", response_model=list[MealDbSearchResult])
def search(q: str, db: Session = Depends(get_db)):
    query = q.strip()
    if len(query) < 2:
        return []

    with httpx.Client(timeout=15) as client:
        raw_meals = search_meals(client, query)

    imported_ids = set(
        db.scalars(select(Dish.external_id).where(Dish.external_id.is_not(None))).all()
    )

    results = []
    for raw in raw_meals:
        mapped = map_meal(raw)
        if mapped is None:
            continue
        results.append(
            MealDbSearchResult(
                external_id=mapped.external_id,
                name=mapped.name,
                thumbnail=mapped.image_url,
                category=(raw.get("strCategory") or "").strip() or None,
                area=(raw.get("strArea") or "").strip() or None,
                already_imported=mapped.external_id in imported_ids,
            )
        )
    return results


@router.post("/import/{external_id}", response_model=DishOut)
def import_dish(external_id: str, db: Session = Depends(get_db)):
    with httpx.Client(timeout=30) as client:
        dish = import_single_meal(db, external_id, client)
    if dish is None:
        raise HTTPException(status_code=404, detail="Recipe not found on TheMealDB")
    return db.get(
        Dish,
        dish.id,
        options=[selectinload(Dish.ingredients), selectinload(Dish.steps), selectinload(Dish.tags)],
    )
