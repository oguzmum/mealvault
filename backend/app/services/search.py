"""Ingredient-based dish matching ("what can I cook with what's at home?")."""

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.dish import Dish
from app.services.dishes import normalize_ingredient_name

# Substring matches shorter than this are ignored to limit false positives
# (e.g. "ei" would otherwise match "Reis" and "Wein").
MIN_SUBSTRING_LENGTH = 4


@dataclass
class DishMatch:
    dish: Dish
    total: int
    matched: int
    missing: list[str]


def ingredient_is_covered(pantry_item: str, ingredient_name: str) -> bool:
    """True if a pantry entry covers a dish ingredient.

    Exact normalized match always counts. Additionally a substring match in
    either direction is accepted for longer words, so "Tomaten" covers
    "Cherrytomaten" and "Zwiebel" covers "Rote Zwiebeln".
    """
    pantry_normalized = normalize_ingredient_name(pantry_item)
    ingredient_normalized = normalize_ingredient_name(ingredient_name)
    if not pantry_normalized:
        return False
    if pantry_normalized == ingredient_normalized:
        return True
    if len(pantry_normalized) >= MIN_SUBSTRING_LENGTH and pantry_normalized in ingredient_normalized:
        return True
    if len(ingredient_normalized) >= MIN_SUBSTRING_LENGTH and ingredient_normalized in pantry_normalized:
        return True
    return False


def match_ingredients(pantry: list[str], ingredient_names: list[str]) -> tuple[int, list[str]]:
    """Return (matched count, missing ingredient names) for one dish."""
    missing = [
        name
        for name in ingredient_names
        if not any(ingredient_is_covered(item, name) for item in pantry)
    ]
    return len(ingredient_names) - len(missing), missing


def search_dishes_by_ingredients(
    db: Session, pantry: list[str], max_missing: int
) -> list[DishMatch]:
    """All dishes cookable with at most `max_missing` missing ingredients.

    Sorted by fewest missing ingredients first, then by match ratio.
    """
    dishes = db.scalars(
        select(Dish).options(selectinload(Dish.ingredients), selectinload(Dish.tags))
    ).all()

    results: list[DishMatch] = []
    for dish in dishes:
        ingredient_names = [item.ingredient.name for item in dish.ingredients]
        if not ingredient_names:
            continue
        matched, missing = match_ingredients(pantry, ingredient_names)
        if len(missing) <= max_missing:
            results.append(
                DishMatch(dish=dish, total=len(ingredient_names), matched=matched, missing=missing)
            )

    results.sort(key=lambda r: (len(r.missing), -(r.matched / r.total), r.dish.name))
    return results
