def test_create_and_get_dish(client, sample_dish_payload):
    response = client.post("/api/v1/dishes", json=sample_dish_payload)
    assert response.status_code == 201
    dish = response.json()
    assert dish["name"] == "Hähnchen-Bowl"
    assert dish["source"] == "user"
    assert [i["ingredient_name"] for i in dish["ingredients"]] == [
        "Hähnchenbrust", "Reis", "Avocado",
    ]
    assert dish["ingredients"][0]["shopping_category"] == "meat_fish"
    assert dish["steps"][0]["timer_seconds"] == 900
    assert dish["tags"][0]["slug"] == "high-protein"

    fetched = client.get(f"/api/v1/dishes/{dish['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["kcal"] == 610


def test_update_replaces_nested_collections(client, sample_dish_payload):
    dish_id = client.post("/api/v1/dishes", json=sample_dish_payload).json()["id"]

    updated_payload = {
        **sample_dish_payload,
        "name": "Bowl Deluxe",
        "ingredients": [{"ingredient_name": "Reis", "amount": 200, "unit": "g"}],
        "steps": [{"text": "Alles neu."}],
        "tags": ["Vegan", "Vegan"],
    }
    response = client.put(f"/api/v1/dishes/{dish_id}", json=updated_payload)
    assert response.status_code == 200
    dish = response.json()
    assert dish["name"] == "Bowl Deluxe"
    assert len(dish["ingredients"]) == 1
    assert len(dish["steps"]) == 1
    # Duplicate tags collapse to one
    assert [t["slug"] for t in dish["tags"]] == ["vegan"]


def test_ingredient_reuse_is_case_insensitive(client, sample_dish_payload):
    client.post("/api/v1/dishes", json=sample_dish_payload)
    second = {
        **sample_dish_payload,
        "name": "Reispfanne",
        "ingredients": [{"ingredient_name": "  reis ", "amount": 150, "unit": "g"}],
    }
    client.post("/api/v1/dishes", json=second)

    ingredients = client.get("/api/v1/ingredients", params={"q": "reis"}).json()
    assert len(ingredients) == 1
    assert ingredients[0]["name"] == "Reis"


def test_list_filters(client, sample_dish_payload):
    client.post("/api/v1/dishes", json=sample_dish_payload)
    client.post(
        "/api/v1/dishes",
        json={
            "name": "Kürbissuppe",
            "cook_time_minutes": 45,
            "kcal": 320,
            "tags": ["Vegan"],
            "ingredients": [],
            "steps": [],
        },
    )

    assert len(client.get("/api/v1/dishes").json()) == 2
    assert [d["name"] for d in client.get("/api/v1/dishes", params={"q": "kürbis"}).json()] == [
        "Kürbissuppe"
    ]
    assert len(client.get("/api/v1/dishes", params={"tags": ["vegan"]}).json()) == 1
    assert len(client.get("/api/v1/dishes", params={"max_time": 30}).json()) == 1
    assert len(client.get("/api/v1/dishes", params={"kcal_max": 400}).json()) == 1


def test_delete_dish(client, sample_dish_payload):
    dish_id = client.post("/api/v1/dishes", json=sample_dish_payload).json()["id"]
    assert client.delete(f"/api/v1/dishes/{dish_id}").status_code == 204
    assert client.get(f"/api/v1/dishes/{dish_id}").status_code == 404
