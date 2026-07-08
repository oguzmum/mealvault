import random
from datetime import date, timedelta

import pytest

from app.models.dish import Dish
from app.models.plan import PlanEntry, PlanSlot, UserSettings
from app.services.generator import generate_plan

MONDAY = date(2026, 7, 6)


@pytest.fixture()
def settings():
    return UserSettings(id=1, daily_kcal_target=1000)


@pytest.fixture()
def slot_id(db):
    slot = PlanSlot(name="Mittag", position=0, is_default=True)
    db.add(slot)
    db.commit()
    return slot.id


@pytest.fixture()
def two_slot_ids(db):
    slots = [
        PlanSlot(name="Frühstück", position=0, is_default=True),
        PlanSlot(name="Mittag", position=1, is_default=True),
    ]
    db.add_all(slots)
    db.commit()
    return [slot.id for slot in slots]


def add_dishes(db, count, kcal_values=None):
    dishes = []
    for index in range(count):
        kcal = kcal_values[index] if kcal_values else 400 + index * 25
        dish = Dish(name=f"Gericht {index}", kcal=kcal)
        db.add(dish)
        dishes.append(dish)
    db.commit()
    return dishes


def test_no_repeats_within_week(db, settings, two_slot_ids):
    add_dishes(db, 20)
    result = generate_plan(db, MONDAY, 7, two_slot_ids, settings, rng=random.Random(1))
    assert len(result) == 14
    dish_ids = [suggestion.dish.id for suggestion in result]
    assert len(set(dish_ids)) == len(dish_ids)


def test_daily_sum_close_to_target(db, settings, two_slot_ids):
    # Pool of dishes around 500 kcal → two meals should land near 1000
    add_dishes(db, 20, kcal_values=[450 + i * 10 for i in range(20)])
    result = generate_plan(db, MONDAY, 7, two_slot_ids, settings, rng=random.Random(2))
    by_day: dict = {}
    for suggestion in result:
        by_day.setdefault(suggestion.day, 0)
        by_day[suggestion.day] += float(suggestion.dish.kcal)
    for total in by_day.values():
        assert abs(total - 1000) <= 300


def test_prefers_dishes_with_kcal_when_available(db, settings, slot_id):
    db.add(Dish(name="Ohne Nährwerte", kcal=None))
    add_dishes(db, 10)
    result = generate_plan(db, MONDAY, 7, [slot_id], settings, rng=random.Random(3))
    assert len(result) == 7
    assert all(suggestion.dish.kcal is not None for suggestion in result)


def test_generates_plan_when_no_dish_has_kcal(db, settings, slot_id):
    for index in range(5):
        db.add(Dish(name=f"Ohne Nährwerte {index}", kcal=None))
    db.commit()
    result = generate_plan(db, MONDAY, 7, [slot_id], settings, rng=random.Random(6))
    assert len(result) == 7
    assert all(suggestion.dish.kcal is None for suggestion in result)


def test_avoids_previous_week_dishes(db, settings, slot_id):
    dishes = add_dishes(db, 10)
    # Dish 0 was eaten yesterday → should be avoided while alternatives exist
    db.add(
        PlanEntry(date=MONDAY - timedelta(days=1), slot_id=slot_id, dish_id=dishes[0].id)
    )
    db.commit()
    result = generate_plan(db, MONDAY, 7, [slot_id], settings, rng=random.Random(4))
    assert dishes[0].id not in [suggestion.dish.id for suggestion in result]


def test_repeats_only_when_pool_exhausted(db, settings, slot_id):
    add_dishes(db, 3)
    result = generate_plan(db, MONDAY, 7, [slot_id], settings, rng=random.Random(5))
    assert len(result) == 7  # still fills every slot
    assert len({suggestion.dish.id for suggestion in result}) == 3


def test_empty_dish_pool_returns_empty(db, settings, slot_id):
    assert generate_plan(db, MONDAY, 7, [slot_id], settings) == []
