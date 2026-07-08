"""Persistence helpers shared by the dish router and the importer."""

import re
import unicodedata

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.dish import Dish, DishIngredient, Ingredient, RecipeStep, Tag
from app.schemas.dish import DishIn
from app.services.categorize import categorize_ingredient


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value or "tag"


def normalize_ingredient_name(name: str) -> str:
    return " ".join(name.strip().lower().split())


def get_or_create_ingredient(db: Session, name: str) -> Ingredient:
    normalized = normalize_ingredient_name(name)
    ingredient = db.scalar(select(Ingredient).where(Ingredient.name_normalized == normalized))
    if ingredient is None:
        ingredient = Ingredient(
            name=name.strip(),
            name_normalized=normalized,
            shopping_category=categorize_ingredient(name),
        )
        db.add(ingredient)
        db.flush()
    return ingredient


def get_or_create_tag(db: Session, name: str) -> Tag:
    slug = slugify(name)
    tag = db.scalar(select(Tag).where(Tag.slug == slug))
    if tag is None:
        tag = Tag(name=name.strip(), slug=slug)
        db.add(tag)
        db.flush()
    return tag


def apply_dish_payload(db: Session, dish: Dish, payload: DishIn) -> Dish:
    """Set scalar fields and replace nested collections from a DishIn payload."""
    dish.name = payload.name
    dish.description = payload.description
    dish.cook_time_minutes = payload.cook_time_minutes
    dish.base_servings = payload.base_servings
    dish.kcal = payload.kcal
    dish.protein_g = payload.protein_g
    dish.carbs_g = payload.carbs_g
    dish.fat_g = payload.fat_g

    dish.ingredients = [
        DishIngredient(
            ingredient=get_or_create_ingredient(db, item.ingredient_name),
            position=index,
            amount=item.amount,
            unit=item.unit,
            raw_text=item.raw_text,
        )
        for index, item in enumerate(payload.ingredients)
    ]
    dish.steps = [
        RecipeStep(position=index, text=step.text, timer_seconds=step.timer_seconds)
        for index, step in enumerate(payload.steps)
    ]

    # Deduplicate tags by slug while preserving order
    seen: set[str] = set()
    tags: list[Tag] = []
    for tag_name in payload.tags:
        slug = slugify(tag_name)
        if slug in seen:
            continue
        seen.add(slug)
        tags.append(get_or_create_tag(db, tag_name))
    dish.tags = tags

    return dish
