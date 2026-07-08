"""Nutrition aggregation for plan views (per day and per date range)."""

from dataclasses import dataclass, field
from datetime import date, timedelta

from app.models.plan import PlanEntry


@dataclass
class NutritionSum:
    kcal: float = 0.0
    protein_g: float = 0.0
    carbs_g: float = 0.0
    fat_g: float = 0.0
    # True when at least one aggregated dish has no nutrition data,
    # so the sums are lower bounds rather than exact values
    incomplete: bool = False

    def add_entry(self, entry: PlanEntry) -> None:
        dish = entry.dish
        if dish.kcal is None:
            self.incomplete = True
        self.kcal += float(dish.kcal or 0) * entry.servings
        self.protein_g += float(dish.protein_g or 0) * entry.servings
        self.carbs_g += float(dish.carbs_g or 0) * entry.servings
        self.fat_g += float(dish.fat_g or 0) * entry.servings


@dataclass
class DayNutrition(NutritionSum):
    day: date = field(default_factory=date.today)


def aggregate_nutrition(
    entries: list[PlanEntry], start: date, days: int
) -> tuple[list[DayNutrition], NutritionSum]:
    """Per-day sums for every day in [start, start+days) plus the range total."""
    by_day = {start + timedelta(days=offset): DayNutrition(day=start + timedelta(days=offset)) for offset in range(days)}
    totals = NutritionSum()

    for entry in entries:
        day_sum = by_day.get(entry.date)
        if day_sum is None:
            continue
        day_sum.add_entry(entry)
        totals.add_entry(entry)

    return list(by_day.values()), totals
