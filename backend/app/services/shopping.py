"""Build a categorized shopping list from the plan entries of a date range.

Parsed amounts of the same ingredient and unit are summed (scaled by planned
servings relative to the dish's base servings). Free-text measures that could
not be parsed are kept verbatim in the item note instead of being guessed.
"""

from dataclasses import dataclass, field
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.dish import Dish, ShoppingCategory
from app.models.plan import PlanEntry
from app.models.shopping import ShoppingList, ShoppingListItem


@dataclass
class _Aggregate:
    name: str
    category: ShoppingCategory
    amounts: dict[str | None, float] = field(default_factory=dict)
    raw_texts: list[str] = field(default_factory=list)


def aggregate_entries(entries: list[PlanEntry]) -> list[_Aggregate]:
    by_ingredient: dict[str, _Aggregate] = {}

    for entry in entries:
        dish = entry.dish
        factor = entry.servings / dish.base_servings if dish.base_servings else 1
        for item in dish.ingredients:
            ingredient = item.ingredient
            aggregate = by_ingredient.setdefault(
                ingredient.name_normalized,
                _Aggregate(name=ingredient.name, category=ingredient.shopping_category),
            )
            if item.amount is not None:
                unit = item.unit or None
                scaled = float(item.amount) * factor
                aggregate.amounts[unit] = aggregate.amounts.get(unit, 0.0) + scaled
            elif item.raw_text:
                aggregate.raw_texts.append(item.raw_text)

    return sorted(by_ingredient.values(), key=lambda a: (a.category.value, a.name.lower()))


def build_shopping_list(db: Session, start: date, end: date) -> ShoppingList:
    """Create (or replace) the shopping list for a date range.

    Checked state carries over for items with the same name and unit, so
    regenerating after a plan tweak doesn't lose shopping progress.
    """
    entries = db.scalars(
        select(PlanEntry)
        .where(PlanEntry.date >= start, PlanEntry.date <= end)
        .options(selectinload(PlanEntry.dish).selectinload(Dish.ingredients))
    ).all()

    previous = db.scalar(
        select(ShoppingList)
        .where(ShoppingList.start_date == start, ShoppingList.end_date == end)
        .options(selectinload(ShoppingList.items))
    )
    previously_checked: set[tuple[str, str | None]] = set()
    if previous is not None:
        previously_checked = {
            (item.name.lower(), item.unit) for item in previous.items if item.checked
        }
        db.delete(previous)
        db.flush()

    shopping_list = ShoppingList(start_date=start, end_date=end)
    for aggregate in aggregate_entries(list(entries)):
        note = " + ".join(aggregate.raw_texts) if aggregate.raw_texts else None
        if aggregate.amounts:
            for unit, total in aggregate.amounts.items():
                shopping_list.items.append(
                    ShoppingListItem(
                        name=aggregate.name,
                        category=aggregate.category,
                        amount=round(total, 2),
                        unit=unit,
                        note=note,
                        checked=(aggregate.name.lower(), unit) in previously_checked,
                    )
                )
                note = None  # attach leftover raw texts to the first unit row only
        else:
            shopping_list.items.append(
                ShoppingListItem(
                    name=aggregate.name,
                    category=aggregate.category,
                    amount=None,
                    unit=None,
                    note=note,
                    checked=(aggregate.name.lower(), None) in previously_checked,
                )
            )

    db.add(shopping_list)
    db.commit()
    db.refresh(shopping_list)
    return shopping_list
