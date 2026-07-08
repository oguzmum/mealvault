"""Greedy weekly plan generator.

Strategy: for every requested slot, pick the dish whose kcal per serving is
closest to the remaining daily budget divided by the remaining slots of that
day. A small random choice among the top candidates keeps suggestions varied.
Dishes are not repeated within one suggestion, and dishes planned in the 7
days before the target week are avoided while alternatives exist. Dishes
without kcal data still participate (sorted after kcal-known ones, since they
can't be steered toward a target) so generation works before any nutrition
data exists.
"""

import random
from dataclasses import dataclass
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.dish import Dish
from app.models.plan import PlanEntry, UserSettings

# Pick randomly among this many closest candidates for variety
CANDIDATE_POOL_SIZE = 3


@dataclass
class SlotSuggestion:
    day: date
    slot_id: int
    dish: Dish


def _pick(
    dishes: list[Dish],
    used_ids: set[int],
    recently_used_ids: set[int],
    target_kcal: float,
    rng: random.Random,
) -> Dish | None:
    pool = [d for d in dishes if d.id not in used_ids and d.id not in recently_used_ids]
    if not pool:
        # Not enough fresh dishes: allow ones from the previous week
        pool = [d for d in dishes if d.id not in used_ids]
    if not pool:
        # Fewer dishes than slots: repetition becomes unavoidable
        pool = dishes
    if not pool:
        return None

    def distance(d: Dish) -> float:
        return abs(float(d.kcal) - target_kcal) if d.kcal is not None else float("inf")

    candidates = sorted(pool, key=distance)
    return rng.choice(candidates[:CANDIDATE_POOL_SIZE])


def generate_plan(
    db: Session,
    start: date,
    days: int,
    slot_ids: list[int],
    settings: UserSettings,
    rng: random.Random | None = None,
) -> list[SlotSuggestion]:
    rng = rng or random.Random()

    dishes = list(db.scalars(select(Dish).options(selectinload(Dish.tags))).all())
    if not dishes:
        return []

    recently_used_ids = set(
        db.scalars(
            select(PlanEntry.dish_id).where(
                PlanEntry.date >= start - timedelta(days=7), PlanEntry.date < start
            )
        ).all()
    )

    suggestions: list[SlotSuggestion] = []
    used_ids: set[int] = set()

    for day_offset in range(days):
        day = start + timedelta(days=day_offset)
        remaining_kcal = float(settings.daily_kcal_target)
        for slot_index, slot_id in enumerate(slot_ids):
            slots_left = len(slot_ids) - slot_index
            target = max(remaining_kcal / slots_left, 0)
            dish = _pick(dishes, used_ids, recently_used_ids, target, rng)
            if dish is None:
                continue
            used_ids.add(dish.id)
            if dish.kcal is not None:
                remaining_kcal -= float(dish.kcal)
            suggestions.append(SlotSuggestion(day=day, slot_id=slot_id, dish=dish))

    return suggestions
