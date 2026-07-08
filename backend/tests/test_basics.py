from app.services.basics_seed import SEED_BASICS, seed_cooking_basics


def test_seed_is_idempotent(db):
    assert seed_cooking_basics(db) == len(SEED_BASICS)
    assert seed_cooking_basics(db) == 0


def test_basics_endpoints(client, db):
    seed_cooking_basics(db)

    listed = client.get("/api/v1/basics").json()
    assert len(listed) == len(SEED_BASICS)

    detail = client.get("/api/v1/basics/anschwitzen")
    assert detail.status_code == 200
    body = detail.json()
    assert body["title"] == "Anschwitzen"
    assert "anschwitzen" in body["keywords"]

    assert client.get("/api/v1/basics/gibt-es-nicht").status_code == 404
