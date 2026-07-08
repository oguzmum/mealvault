import pytest


@pytest.fixture()
def planned_week(client):
    """Two dishes sharing onions planned in the same week."""
    ofen = client.post(
        "/api/v1/dishes",
        json={
            "name": "Ofengemüse",
            "base_servings": 2,
            "ingredients": [
                {"ingredient_name": "Zwiebeln", "amount": 200, "unit": "g"},
                {"ingredient_name": "Zucchini", "amount": 2, "unit": "Stk"},
                {"ingredient_name": "Feta", "amount": 100, "unit": "g"},
            ],
            "steps": [], "tags": [],
        },
    ).json()
    gulasch = client.post(
        "/api/v1/dishes",
        json={
            "name": "Gulasch",
            "base_servings": 2,
            "ingredients": [
                {"ingredient_name": "Zwiebeln", "amount": 200, "unit": "g"},
                {"ingredient_name": "Rindfleisch", "amount": 600, "unit": "g"},
                {"ingredient_name": "Salz", "raw_text": "n. B."},
            ],
            "steps": [], "tags": [],
        },
    ).json()
    slot_id = client.get("/api/v1/plan/slots").json()[-1]["id"]
    client.post("/api/v1/plan/entries", json={
        "date": "2026-07-06", "slot_id": slot_id, "dish_id": ofen["id"], "servings": 2,
    })
    client.post("/api/v1/plan/entries", json={
        "date": "2026-07-07", "slot_id": slot_id, "dish_id": gulasch["id"], "servings": 2,
    })
    return client


def generate(client):
    return client.post(
        "/api/v1/shopping-lists/generate",
        json={"start": "2026-07-06", "end": "2026-07-12"},
    ).json()


def item_by_name(items, name):
    return next(i for i in items if i["name"] == name)


def test_aggregates_same_ingredient_across_dishes(planned_week):
    result = generate(planned_week)
    onions = item_by_name(result["items"], "Zwiebeln")
    # 200 g from each dish, both planned at their base servings → 400 g
    assert onions["amount"] == 400
    assert onions["unit"] == "g"
    assert onions["category"] == "produce"


def test_scales_by_planned_servings(planned_week):
    client = planned_week
    # Plan Ofengemüse for 4 servings instead of its base 2 → amounts double
    plan = client.get("/api/v1/plan", params={"start": "2026-07-06"}).json()
    ofen_entry = next(e for e in plan["entries"] if e["date"] == "2026-07-06")
    client.patch(f"/api/v1/plan/entries/{ofen_entry['id']}", json={"servings": 4})
    result = generate(client)
    assert item_by_name(result["items"], "Zucchini")["amount"] == 4
    assert item_by_name(result["items"], "Zwiebeln")["amount"] == 400 + 200


def test_unparsed_measure_kept_as_note(planned_week):
    result = generate(planned_week)
    salt = item_by_name(result["items"], "Salz")
    assert salt["amount"] is None
    assert salt["note"] == "n. B."


def test_checked_state_survives_regeneration(planned_week):
    client = planned_week
    first = generate(client)
    onions = item_by_name(first["items"], "Zwiebeln")
    client.patch(f"/api/v1/shopping-list-items/{onions['id']}", json={"checked": True})

    second = generate(client)
    assert item_by_name(second["items"], "Zwiebeln")["checked"] is True
    assert item_by_name(second["items"], "Feta")["checked"] is False


def test_current_returns_latest(planned_week):
    client = planned_week
    generated = generate(client)
    current = client.get("/api/v1/shopping-lists/current").json()
    assert current["id"] == generated["id"]
    # 6 dish ingredients collapse into 5 items (shared onions aggregate)
    assert len(current["items"]) == 5
