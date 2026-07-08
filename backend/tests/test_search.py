import pytest

from app.services.search import ingredient_is_covered, match_ingredients


class TestIngredientIsCovered:
    def test_exact_match_ignores_case_and_whitespace(self):
        assert ingredient_is_covered(" Reis ", "reis")

    def test_substring_match_covers_compounds(self):
        assert ingredient_is_covered("Tomaten", "Cherrytomaten")
        assert ingredient_is_covered("Zwiebel", "Rote Zwiebeln")

    def test_short_fragments_do_not_match(self):
        # "Ei" must not cover "Reis" or "Wein"
        assert not ingredient_is_covered("Ei", "Reis")
        assert not ingredient_is_covered("Ei", "Wein")

    def test_unrelated_does_not_match(self):
        assert not ingredient_is_covered("Feta", "Hähnchenbrust")


class TestMatchIngredients:
    def test_counts_matched_and_missing(self):
        matched, missing = match_ingredients(
            ["Tomaten", "Zwiebel", "Olivenöl"],
            ["Cherrytomaten", "Zwiebel", "Feta", "Olivenöl"],
        )
        assert matched == 3
        assert missing == ["Feta"]

    def test_empty_pantry_misses_everything(self):
        matched, missing = match_ingredients([], ["Reis", "Feta"])
        assert matched == 0
        assert missing == ["Reis", "Feta"]


@pytest.fixture()
def dishes_for_search(client):
    def create(name, ingredient_names):
        return client.post(
            "/api/v1/dishes",
            json={
                "name": name,
                "ingredients": [{"ingredient_name": n} for n in ingredient_names],
                "steps": [],
                "tags": [],
            },
        ).json()

    create("Caprese", ["Tomaten", "Mozzarella", "Basilikum", "Olivenöl"])
    create("Aglio e Olio", ["Spaghetti", "Knoblauch", "Olivenöl", "Chili"])
    create("Gulasch", ["Rindfleisch", "Zwiebel", "Paprika", "Tomatenmark", "Paprikapulver"])
    return client


def test_search_endpoint_sorts_by_missing(dishes_for_search):
    client = dishes_for_search
    response = client.post(
        "/api/v1/search/by-ingredients",
        json={
            "ingredients": ["Tomaten", "Mozzarella", "Basilikum", "Olivenöl", "Knoblauch"],
            "max_missing": 2,
        },
    )
    assert response.status_code == 200
    results = response.json()

    # Caprese: 0 missing; Aglio e Olio: 2 missing (Spaghetti, Chili); Gulasch: 5 missing → excluded
    assert [r["dish"]["name"] for r in results] == ["Caprese", "Aglio e Olio"]
    assert results[0]["missing"] == []
    assert results[0]["matched"] == 4
    assert sorted(results[1]["missing"]) == ["Chili", "Spaghetti"]


def test_search_respects_max_missing_zero(dishes_for_search):
    client = dishes_for_search
    results = client.post(
        "/api/v1/search/by-ingredients",
        json={
            "ingredients": ["Tomaten", "Mozzarella", "Basilikum", "Olivenöl"],
            "max_missing": 0,
        },
    ).json()
    assert [r["dish"]["name"] for r in results] == ["Caprese"]
