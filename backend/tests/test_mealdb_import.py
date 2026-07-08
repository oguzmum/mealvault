from app.importers.mealdb import (
    import_meals,
    import_single_meal,
    lookup_meal,
    map_meal,
    parse_measure,
    search_meals,
    split_instructions,
    timer_from_text,
)

FIXTURE_MEAL = {
    "idMeal": "52772",
    "strMeal": "Teriyaki Chicken Casserole",
    "strCategory": "Chicken",
    "strArea": "Japanese",
    "strInstructions": (
        "Preheat oven to 350° F.\r\n"
        "STEP 1: Combine soy sauce and water in a saucepan, simmer for 20 minutes.\r\n"
        "Place chicken breasts in the oven for 30 minutes. Remove and shred."
    ),
    "strMealThumb": "https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg",
    "strIngredient1": "soy sauce",
    "strMeasure1": "3/4 cup",
    "strIngredient2": "water",
    "strMeasure2": "1/2 cup",
    "strIngredient3": "chicken breasts",
    "strMeasure3": "2",
    "strIngredient4": "starch",
    "strMeasure4": "To taste",
    "strIngredient5": "",
    "strMeasure5": "",
}


class TestParseMeasure:
    def test_metric(self):
        assert parse_measure("200g") == (200, "g")
        assert parse_measure("400 ml") == (400, "ml")

    def test_fractions(self):
        assert parse_measure("3/4 cup") == (0.75, "cup")
        assert parse_measure("1 1/2 tbsp") == (1.5, "tbsp")
        assert parse_measure("½ tsp") == (0.5, "tsp")

    def test_bare_number(self):
        assert parse_measure("2") == (2, None)

    def test_descriptive_text_is_not_parsed(self):
        assert parse_measure("To taste") == (None, None)
        assert parse_measure("") == (None, None)
        assert parse_measure(None) == (None, None)


class TestSplitInstructions:
    def test_splits_lines_and_strips_step_prefixes(self):
        steps = split_instructions(FIXTURE_MEAL["strInstructions"])
        assert steps[0].startswith("Preheat oven")
        assert steps[1].startswith("Combine soy sauce")

    def test_long_paragraph_is_split_at_sentences(self):
        blob = " ".join(f"Sentence number {i} with some words in it." for i in range(20))
        steps = split_instructions(blob)
        assert len(steps) > 1
        assert all(len(step) <= 320 for step in steps)


def test_timer_derived_from_minutes_mention():
    assert timer_from_text("simmer for 20 minutes") == 1200
    assert timer_from_text("bake for 30 mins until golden") == 1800
    assert timer_from_text("no timing here") is None


def test_map_meal():
    mapped = map_meal(FIXTURE_MEAL)
    assert mapped is not None
    assert mapped.external_id == "52772"
    assert mapped.tags == ["Chicken", "Japanese"]
    assert len(mapped.ingredients) == 4
    assert mapped.ingredients[0] == ("soy sauce", 0.75, "cup", "3/4 cup")
    # Descriptive measure keeps raw text but no parsed amount
    assert mapped.ingredients[3] == ("starch", None, None, "To taste")
    # Second step mentions "20 minutes" → timer attached
    assert mapped.steps[1][1] == 1200


def test_import_is_idempotent(db, client):
    first = import_meals(db, [FIXTURE_MEAL], client=None, download_images=False)
    assert first.imported == 1

    second = import_meals(db, [FIXTURE_MEAL], client=None, download_images=False)
    assert second.imported == 0
    assert second.skipped == 1

    dishes = client.get("/api/v1/dishes", params={"source": "imported"}).json()
    assert len(dishes) == 1
    dish = client.get(f"/api/v1/dishes/{dishes[0]['id']}").json()
    assert dish["source"] == "imported"
    assert dish["external_id"] == "52772"
    assert dish["kcal"] is None  # nutrition is never guessed
    assert [t["name"] for t in dish["tags"]] == ["Chicken", "Japanese"]
    assert len(dish["ingredients"]) == 4


class FakeHttpResponse:
    def __init__(self, payload: dict):
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


class FakeHttpClient:
    """Routes GET calls by which TheMealDB endpoint is hit (search vs lookup)."""

    def __init__(self, search_payload=None, lookup_payload=None):
        self.search_payload = search_payload or {"meals": []}
        self.lookup_payload = lookup_payload or {"meals": None}
        self.calls: list[dict] = []

    def get(self, url, params=None):
        self.calls.append({"url": url, "params": params})
        if url.endswith("search.php"):
            return FakeHttpResponse(self.search_payload)
        if url.endswith("lookup.php"):
            return FakeHttpResponse(self.lookup_payload)
        raise AssertionError(f"unexpected URL: {url}")


def test_search_meals_returns_result_list():
    fake = FakeHttpClient(search_payload={"meals": [FIXTURE_MEAL]})
    results = search_meals(fake, "chicken")
    assert results == [FIXTURE_MEAL]
    assert fake.calls[0]["params"] == {"s": "chicken"}


def test_lookup_meal_returns_first_match():
    fake = FakeHttpClient(lookup_payload={"meals": [FIXTURE_MEAL]})
    assert lookup_meal(fake, "52772") == FIXTURE_MEAL


def test_lookup_meal_returns_none_when_not_found():
    fake = FakeHttpClient(lookup_payload={"meals": None})
    assert lookup_meal(fake, "nope") is None


def test_lookup_meal_returns_none_for_invalid_id_string_response():
    # TheMealDB quirk: {"meals": "Invalid ID"} for malformed ids, not a list.
    fake = FakeHttpClient(lookup_payload={"meals": "Invalid ID"})
    assert lookup_meal(fake, "not-a-real-id") is None


def test_import_single_meal_creates_dish(db):
    fake = FakeHttpClient(lookup_payload={"meals": [FIXTURE_MEAL]})
    dish = import_single_meal(db, "52772", fake, download_images=False)
    assert dish is not None
    assert dish.external_id == "52772"
    assert dish.name == "Teriyaki Chicken Casserole"
    assert len(dish.ingredients) == 4


def test_import_single_meal_is_idempotent(db):
    fake = FakeHttpClient(lookup_payload={"meals": [FIXTURE_MEAL]})
    first = import_single_meal(db, "52772", fake, download_images=False)
    second = import_single_meal(db, "52772", fake, download_images=False)
    assert first.id == second.id
    # Second call never even hit TheMealDB - already-imported dishes short-circuit.
    assert len(fake.calls) == 1


def test_import_single_meal_returns_none_for_unknown_id(db):
    fake = FakeHttpClient(lookup_payload={"meals": None})
    assert import_single_meal(db, "does-not-exist", fake, download_images=False) is None


def test_import_single_meal_returns_none_for_malformed_id(db):
    fake = FakeHttpClient(lookup_payload={"meals": "Invalid ID"})
    assert import_single_meal(db, "not-a-real-id", fake, download_images=False) is None
