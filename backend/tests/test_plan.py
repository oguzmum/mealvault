from datetime import date

import pytest

from app.models.dish import Dish
from app.models.plan import PlanEntry, PlanSlot
from app.services.nutrition import aggregate_nutrition


def make_dish(**overrides) -> Dish:
    defaults = dict(name="Testgericht", kcal=500, protein_g=30, carbs_g=50, fat_g=20)
    defaults.update(overrides)
    return Dish(**defaults)


def make_slot(**overrides) -> PlanSlot:
    defaults = dict(name="Mittag", position=0, is_default=True)
    defaults.update(overrides)
    return PlanSlot(**defaults)


class TestAggregateNutrition:
    def test_sums_per_day_and_total(self):
        start = date(2026, 7, 6)  # a Monday
        slot = make_slot()
        entries = [
            PlanEntry(date=start, slot=slot, servings=1, dish=make_dish()),
            PlanEntry(date=start, slot=slot, servings=2, dish=make_dish(kcal=300, protein_g=10, carbs_g=40, fat_g=5)),
            PlanEntry(date=date(2026, 7, 8), slot=slot, servings=1, dish=make_dish()),
        ]
        day_sums, totals = aggregate_nutrition(entries, start, 7)

        assert len(day_sums) == 7
        assert day_sums[0].kcal == 500 + 2 * 300
        assert day_sums[0].protein_g == 30 + 2 * 10
        assert day_sums[1].kcal == 0
        assert day_sums[2].kcal == 500
        assert totals.kcal == 1600
        assert totals.fat_g == 20 + 2 * 5 + 20
        assert totals.incomplete is False

    def test_missing_nutrition_marks_incomplete(self):
        start = date(2026, 7, 6)
        entries = [
            PlanEntry(
                date=start,
                slot=make_slot(),
                servings=1,
                dish=make_dish(kcal=None, protein_g=None, carbs_g=None, fat_g=None),
            ),
        ]
        day_sums, totals = aggregate_nutrition(entries, start, 7)
        assert day_sums[0].kcal == 0
        assert day_sums[0].incomplete is True
        assert totals.incomplete is True

    def test_entries_outside_range_are_ignored(self):
        start = date(2026, 7, 6)
        entries = [
            PlanEntry(date=date(2026, 7, 20), slot=make_slot(), servings=1, dish=make_dish()),
        ]
        _, totals = aggregate_nutrition(entries, start, 7)
        assert totals.kcal == 0


@pytest.fixture()
def dish_id(client):
    return client.post(
        "/api/v1/dishes",
        json={"name": "Dal", "kcal": 430, "protein_g": 22, "carbs_g": 58, "fat_g": 12,
              "tags": [], "ingredients": [], "steps": []},
    ).json()["id"]


@pytest.fixture()
def slot_id(client):
    return client.get("/api/v1/plan/slots").json()[0]["id"]


def test_plan_create_and_get(client, dish_id, slot_id):
    entry = {"date": "2026-07-06", "slot_id": slot_id, "dish_id": dish_id, "servings": 1}
    created = client.post("/api/v1/plan/entries", json=entry)
    assert created.status_code == 201
    assert created.json()["dish"]["name"] == "Dal"

    plan = client.get("/api/v1/plan", params={"start": "2026-07-06"}).json()
    assert len(plan["entries"]) == 1
    assert plan["totals"]["kcal"] == 430
    assert plan["day_sums"][0]["kcal"] == 430
    assert plan["day_sums"][1]["kcal"] == 0


def test_plan_allows_multiple_dishes_in_same_slot(client, dish_id, slot_id):
    entry = {"date": "2026-07-06", "slot_id": slot_id, "dish_id": dish_id, "servings": 1}
    client.post("/api/v1/plan/entries", json=entry)
    client.post("/api/v1/plan/entries", json=entry)

    plan = client.get("/api/v1/plan", params={"start": "2026-07-06"}).json()
    assert len(plan["entries"]) == 2
    assert plan["day_sums"][0]["kcal"] == 2 * 430


def test_plan_update_entry(client, dish_id, slot_id):
    entry_id = client.post(
        "/api/v1/plan/entries",
        json={"date": "2026-07-06", "slot_id": slot_id, "dish_id": dish_id, "servings": 1},
    ).json()["id"]

    updated = client.patch(f"/api/v1/plan/entries/{entry_id}", json={"servings": 3})
    assert updated.status_code == 200
    assert updated.json()["servings"] == 3

    plan = client.get("/api/v1/plan", params={"start": "2026-07-06"}).json()
    assert len(plan["entries"]) == 1
    assert plan["totals"]["kcal"] == 3 * 430


def test_plan_delete_entry(client, dish_id, slot_id):
    entry_id = client.post(
        "/api/v1/plan/entries",
        json={"date": "2026-07-06", "slot_id": slot_id, "dish_id": dish_id, "servings": 1},
    ).json()["id"]
    assert client.delete(f"/api/v1/plan/entries/{entry_id}").status_code == 204
    plan = client.get("/api/v1/plan", params={"start": "2026-07-06"}).json()
    assert plan["entries"] == []


def test_plan_rejects_unknown_dish(client, slot_id):
    response = client.post(
        "/api/v1/plan/entries",
        json={"date": "2026-07-06", "slot_id": slot_id, "dish_id": 9999, "servings": 1},
    )
    assert response.status_code == 404


def test_plan_rejects_unknown_slot(client, dish_id):
    response = client.post(
        "/api/v1/plan/entries",
        json={"date": "2026-07-06", "slot_id": 9999, "dish_id": dish_id, "servings": 1},
    )
    assert response.status_code == 404


def test_settings_roundtrip(client):
    defaults = client.get("/api/v1/settings").json()
    assert defaults["daily_kcal_target"] == 2000

    updated = client.put(
        "/api/v1/settings",
        json={**defaults, "daily_kcal_target": 2400},
    )
    assert updated.status_code == 200
    assert client.get("/api/v1/settings").json()["daily_kcal_target"] == 2400


class TestPlanSlots:
    def test_lists_two_default_slots(self, client):
        slots = client.get("/api/v1/plan/slots").json()
        assert [s["name"] for s in slots] == ["Frühstück", "Mittag"]
        assert all(s["is_default"] for s in slots)

    def test_creates_custom_slot_at_the_end(self, client):
        client.get("/api/v1/plan/slots")  # ensure defaults exist
        created = client.post("/api/v1/plan/slots", json={"name": "Snack"})
        assert created.status_code == 201
        assert created.json()["is_default"] is False

        slots = client.get("/api/v1/plan/slots").json()
        assert [s["name"] for s in slots] == ["Frühstück", "Mittag", "Snack"]

    def test_moves_custom_slot_between_defaults(self, client):
        client.post("/api/v1/plan/slots", json={"name": "Snack"})
        slots = client.get("/api/v1/plan/slots").json()
        snack_id = next(s["id"] for s in slots if s["name"] == "Snack")

        client.post(f"/api/v1/plan/slots/{snack_id}/move", json={"direction": "up"})
        client.post(f"/api/v1/plan/slots/{snack_id}/move", json={"direction": "up"})

        reordered = client.get("/api/v1/plan/slots").json()
        assert [s["name"] for s in reordered] == ["Snack", "Frühstück", "Mittag"]

    def test_default_slot_cannot_be_deleted(self, client):
        default_id = client.get("/api/v1/plan/slots").json()[0]["id"]
        response = client.delete(f"/api/v1/plan/slots/{default_id}")
        assert response.status_code == 400

    def test_custom_slot_can_be_deleted_and_cascades_entries(self, client, dish_id):
        snack_id = client.post("/api/v1/plan/slots", json={"name": "Snack"}).json()["id"]
        client.post(
            "/api/v1/plan/entries",
            json={"date": "2026-07-06", "slot_id": snack_id, "dish_id": dish_id, "servings": 1},
        )

        assert client.delete(f"/api/v1/plan/slots/{snack_id}").status_code == 204

        plan = client.get("/api/v1/plan", params={"start": "2026-07-06"}).json()
        assert plan["entries"] == []
        assert snack_id not in [s["id"] for s in client.get("/api/v1/plan/slots").json()]
