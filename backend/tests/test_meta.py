from app.models.dish import Tag


def test_list_tags_excludes_unused_tags(client, db, sample_dish_payload):
    client.post("/api/v1/dishes", json=sample_dish_payload)

    db.add(Tag(name="Unused Tag", slug="unused-tag"))
    db.commit()

    response = client.get("/api/v1/tags")
    assert response.status_code == 200
    slugs = [t["slug"] for t in response.json()]
    assert slugs == ["high-protein"]


def test_list_tags_includes_dish_count(client, sample_dish_payload):
    client.post("/api/v1/dishes", json=sample_dish_payload)
    client.post("/api/v1/dishes", json=sample_dish_payload | {"name": "Second Dish"})

    response = client.get("/api/v1/tags")
    assert response.status_code == 200
    [tag] = response.json()
    assert tag["dish_count"] == 2


def test_list_tags_include_empty_returns_unused_tags(client, db, sample_dish_payload):
    client.post("/api/v1/dishes", json=sample_dish_payload)
    db.add(Tag(name="Unused Tag", slug="unused-tag"))
    db.commit()

    response = client.get("/api/v1/tags", params={"include_empty": True})
    assert response.status_code == 200
    by_slug = {t["slug"]: t["dish_count"] for t in response.json()}
    assert by_slug == {"high-protein": 1, "unused-tag": 0}


def test_rename_tag_updates_name_and_slug(client, sample_dish_payload):
    dish = client.post("/api/v1/dishes", json=sample_dish_payload).json()
    [tag] = client.get("/api/v1/tags").json()

    response = client.patch(f"/api/v1/tags/{tag['id']}", json={"name": "Protein Reich"})
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Protein Reich"
    assert body["slug"] == "protein-reich"

    updated_dish = client.get(f"/api/v1/dishes/{dish['id']}").json()
    assert updated_dish["tags"][0]["name"] == "Protein Reich"


def test_rename_tag_conflict_returns_409(client, sample_dish_payload):
    client.post("/api/v1/dishes", json=sample_dish_payload)
    client.post(
        "/api/v1/dishes",
        json=sample_dish_payload | {"name": "Second Dish", "tags": ["Quick"]},
    )
    tags = {t["name"]: t["id"] for t in client.get("/api/v1/tags").json()}

    response = client.patch(f"/api/v1/tags/{tags['Quick']}", json={"name": "High Protein"})
    assert response.status_code == 409


def test_rename_tag_not_found_returns_404(client):
    response = client.patch("/api/v1/tags/999", json={"name": "Whatever"})
    assert response.status_code == 404


def test_delete_tag_removes_it_without_deleting_dish(client, db, sample_dish_payload):
    dish = client.post("/api/v1/dishes", json=sample_dish_payload).json()
    [tag] = client.get("/api/v1/tags").json()

    response = client.delete(f"/api/v1/tags/{tag['id']}")
    assert response.status_code == 204

    # The test client shares one long-lived session across requests, so the
    # already-loaded Dish/tags stay cached in memory after the cascade delete;
    # a real request gets a fresh session and wouldn't need this.
    db.expire_all()

    assert client.get("/api/v1/tags").json() == []
    dish_response = client.get(f"/api/v1/dishes/{dish['id']}")
    assert dish_response.status_code == 200
    assert dish_response.json()["tags"] == []


def test_delete_tag_not_found_returns_404(client):
    response = client.delete("/api/v1/tags/999")
    assert response.status_code == 404
