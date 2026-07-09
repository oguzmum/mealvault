from app.models.dish import Tag


def test_list_tags_excludes_unused_tags(client, db, sample_dish_payload):
    client.post("/api/v1/dishes", json=sample_dish_payload)

    db.add(Tag(name="Unused Tag", slug="unused-tag"))
    db.commit()

    response = client.get("/api/v1/tags")
    assert response.status_code == 200
    slugs = [t["slug"] for t in response.json()]
    assert slugs == ["high-protein"]
