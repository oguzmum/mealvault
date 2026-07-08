from tests.test_mealdb_import import FIXTURE_MEAL


def test_search_returns_mapped_results(client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.mealdb.search_meals", lambda http_client, query: [FIXTURE_MEAL]
    )
    response = client.get("/api/v1/mealdb/search", params={"q": "chicken"})
    assert response.status_code == 200
    results = response.json()
    assert len(results) == 1
    assert results[0]["external_id"] == "52772"
    assert results[0]["name"] == "Teriyaki Chicken Casserole"
    assert results[0]["already_imported"] is False


def test_search_marks_already_imported_dishes(client, db, monkeypatch):
    from app.importers.mealdb import import_meals

    import_meals(db, [FIXTURE_MEAL], client=None, download_images=False)
    monkeypatch.setattr(
        "app.routers.mealdb.search_meals", lambda http_client, query: [FIXTURE_MEAL]
    )

    response = client.get("/api/v1/mealdb/search", params={"q": "chicken"})
    assert response.json()[0]["already_imported"] is True


def test_search_requires_at_least_two_characters(client, monkeypatch):
    called = False

    def fake_search(http_client, query):
        nonlocal called
        called = True
        return []

    monkeypatch.setattr("app.routers.mealdb.search_meals", fake_search)
    response = client.get("/api/v1/mealdb/search", params={"q": "a"})
    assert response.status_code == 200
    assert response.json() == []
    assert called is False


def test_import_creates_dish(client, monkeypatch):
    from app.importers.mealdb import import_single_meal

    from tests.test_mealdb_import import FakeHttpClient

    def fake_import_single_meal(db, external_id, http_client):
        fake_mealdb = FakeHttpClient(lookup_payload={"meals": [FIXTURE_MEAL]})
        return import_single_meal(db, external_id, fake_mealdb, download_images=False)

    monkeypatch.setattr("app.routers.mealdb.import_single_meal", fake_import_single_meal)

    response = client.post("/api/v1/mealdb/import/52772")
    assert response.status_code == 200
    body = response.json()
    assert body["external_id"] == "52772"
    assert body["source"] == "imported"


def test_import_returns_404_for_unknown_id(client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.mealdb.import_single_meal", lambda db, external_id, http_client: None
    )
    response = client.post("/api/v1/mealdb/import/does-not-exist")
    assert response.status_code == 404
