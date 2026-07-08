"""Import dishes from TheMealDB (https://www.themealdb.com).

TheMealDB is free for development and educational use with the test API
key "1". The full catalogue (~300 meals) is fetched via search.php?f=a..z.
Meals carry ingredients with free-text measures, instructions, a category,
an area (cuisine) and a thumbnail - but no nutrition data, so nutrition
fields stay empty (never guessed) and no cook time.

Re-imports are idempotent: meals whose TheMealDB id already exists are
skipped, which also preserves local edits to previously imported dishes.
"""

import re
import string
import uuid
from dataclasses import dataclass, field
from pathlib import Path

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.dish import Dish, DishIngredient, DishSource, RecipeStep
from app.services.dishes import get_or_create_ingredient, get_or_create_tag

API_BASE = "https://www.themealdb.com/api/json/v1/1"

# TheMealDB does not state servings; its recipes typically serve about four.
# Documented assumption - only affects portion-scaling math, never nutrition.
DEFAULT_SERVINGS = 4

UNICODE_FRACTIONS = {"½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3}

_MEASURE_RE = re.compile(
    r"^(?P<number>\d+\s+\d+/\d+|\d+/\d+|\d+[.,]\d+|\d+|[½¼¾⅓⅔])\s*(?P<unit>.*)$"
)
_STEP_PREFIX_RE = re.compile(r"^(step\s*\d+[:.)]?|\d+[:.)])\s*", re.IGNORECASE)
_TIMER_RE = re.compile(r"(\d+)\s*(?:minutes|minute|mins|min)\b", re.IGNORECASE)

MAX_STEP_LENGTH = 300
MAX_UNIT_LENGTH = 25
MAX_TIMER_MINUTES = 180


def parse_measure(measure: str | None) -> tuple[float | None, str | None]:
    """Parse "200g" / "1 1/2 tbsp" / "½ cup" into (amount, unit).

    Returns (None, None) for purely descriptive measures like "To serve" or
    when the unit part is too wordy to be a real unit - callers keep the raw
    text for display in that case.
    """
    raw = (measure or "").strip()
    if not raw:
        return None, None

    match = _MEASURE_RE.match(raw)
    if match is None:
        return None, None

    number = match.group("number")
    if number in UNICODE_FRACTIONS:
        amount = UNICODE_FRACTIONS[number]
    elif "/" in number:
        parts = number.split()
        whole = float(parts[0]) if len(parts) == 2 else 0.0
        numerator, denominator = parts[-1].split("/")
        amount = whole + float(numerator) / float(denominator)
    else:
        amount = float(number.replace(",", "."))

    unit = match.group("unit").strip() or None
    if unit is not None and len(unit) > MAX_UNIT_LENGTH:
        return None, None
    return amount, unit


def split_instructions(text: str | None) -> list[str]:
    """Split an instruction blob into steps.

    Primary split is on line breaks (dropping "STEP 1"-style prefixes);
    overly long paragraphs are additionally split at sentence boundaries.
    """
    if not text:
        return []

    lines = [_STEP_PREFIX_RE.sub("", line).strip() for line in re.split(r"[\r\n]+", text)]
    lines = [line for line in lines if len(line) > 2]

    steps: list[str] = []
    for line in lines:
        if len(line) <= MAX_STEP_LENGTH:
            steps.append(line)
            continue
        sentences = re.split(r"(?<=[.!?])\s+", line)
        chunk = ""
        for sentence in sentences:
            if chunk and len(chunk) + len(sentence) > MAX_STEP_LENGTH:
                steps.append(chunk.strip())
                chunk = sentence
            else:
                chunk = f"{chunk} {sentence}".strip()
        if chunk:
            steps.append(chunk)
    return steps


def timer_from_text(text: str) -> int | None:
    """Derive an optional step timer from an explicit "... 20 minutes" mention."""
    match = _TIMER_RE.search(text)
    if match is None:
        return None
    minutes = int(match.group(1))
    if not 1 <= minutes <= MAX_TIMER_MINUTES:
        return None
    return minutes * 60


@dataclass
class MappedMeal:
    external_id: str
    name: str
    tags: list[str]
    image_url: str | None
    ingredients: list[tuple[str, float | None, str | None, str | None]]  # name, amount, unit, raw
    steps: list[tuple[str, int | None]]  # text, timer_seconds
    description: str | None = None


def map_meal(meal: dict) -> MappedMeal | None:
    external_id = (meal.get("idMeal") or "").strip()
    name = (meal.get("strMeal") or "").strip()
    if not external_id or not name:
        return None

    tags: list[str] = []
    for tag_source in (meal.get("strCategory"), meal.get("strArea")):
        value = (tag_source or "").strip()
        if value and value.lower() != "unknown":
            tags.append(value)

    ingredients = []
    for index in range(1, 21):
        ingredient_name = (meal.get(f"strIngredient{index}") or "").strip()
        if not ingredient_name:
            continue
        measure = (meal.get(f"strMeasure{index}") or "").strip()
        amount, unit = parse_measure(measure)
        ingredients.append((ingredient_name, amount, unit, measure or None))

    steps = [(text, timer_from_text(text)) for text in split_instructions(meal.get("strInstructions"))]

    return MappedMeal(
        external_id=external_id,
        name=name,
        tags=tags,
        image_url=(meal.get("strMealThumb") or "").strip() or None,
        ingredients=ingredients,
        steps=steps,
    )


@dataclass
class ImportStats:
    imported: int = 0
    skipped: int = 0
    errors: list[str] = field(default_factory=list)


def fetch_all_meals(client: httpx.Client) -> list[dict]:
    meals: dict[str, dict] = {}
    for letter in string.ascii_lowercase:
        response = client.get(f"{API_BASE}/search.php", params={"f": letter})
        response.raise_for_status()
        for meal in response.json().get("meals") or []:
            meal_id = meal.get("idMeal")
            if meal_id:
                meals[meal_id] = meal
    return list(meals.values())


def search_meals(client: httpx.Client, query: str) -> list[dict]:
    """Search TheMealDB by name; each result already carries full detail
    (ingredients, instructions, etc.), same shape as a single lookup."""
    response = client.get(f"{API_BASE}/search.php", params={"s": query})
    response.raise_for_status()
    meals = response.json().get("meals")
    return meals if isinstance(meals, list) else []


def lookup_meal(client: httpx.Client, external_id: str) -> dict | None:
    response = client.get(f"{API_BASE}/lookup.php", params={"i": external_id})
    response.raise_for_status()
    # TheMealDB returns {"meals": "Invalid ID"} (a string, not a list) for
    # malformed ids, instead of the usual {"meals": null}.
    meals = response.json().get("meals")
    return meals[0] if isinstance(meals, list) and meals else None


def download_image(client: httpx.Client, image_url: str) -> str | None:
    """Store the small preview thumbnail locally; returns the /uploads path."""
    try:
        response = client.get(f"{image_url}/small")
        if response.status_code != 200:
            response = client.get(image_url)
        response.raise_for_status()
    except httpx.HTTPError:
        return None

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"mealdb-{uuid.uuid4().hex}.jpg"
    (upload_dir / filename).write_bytes(response.content)
    return f"/uploads/{filename}"


def _build_dish(db: Session, mapped: MappedMeal) -> Dish:
    dish = Dish(
        name=mapped.name,
        source=DishSource.imported,
        external_id=mapped.external_id,
        base_servings=DEFAULT_SERVINGS,
    )
    dish.ingredients = [
        DishIngredient(
            ingredient=get_or_create_ingredient(db, ingredient_name),
            position=position,
            amount=amount,
            unit=unit,
            raw_text=raw_text,
        )
        for position, (ingredient_name, amount, unit, raw_text) in enumerate(mapped.ingredients)
    ]
    dish.steps = [
        RecipeStep(position=position, text=text, timer_seconds=timer)
        for position, (text, timer) in enumerate(mapped.steps)
    ]
    dish.tags = [get_or_create_tag(db, tag_name) for tag_name in mapped.tags]
    return dish


def import_meals(
    db: Session,
    meals: list[dict],
    client: httpx.Client | None = None,
    download_images: bool = True,
) -> ImportStats:
    stats = ImportStats()
    existing_ids = set(
        db.scalars(select(Dish.external_id).where(Dish.external_id.is_not(None))).all()
    )

    for raw_meal in meals:
        mapped = map_meal(raw_meal)
        if mapped is None:
            stats.errors.append(f"Unusable meal payload: {raw_meal.get('idMeal')}")
            continue
        if mapped.external_id in existing_ids:
            stats.skipped += 1
            continue

        dish = _build_dish(db, mapped)
        if download_images and client is not None and mapped.image_url:
            dish.image_path = download_image(client, mapped.image_url)

        db.add(dish)
        existing_ids.add(mapped.external_id)
        stats.imported += 1

    db.commit()
    return stats


def run_import(db: Session, download_images: bool = True) -> ImportStats:
    """Bulk-import the full ~300-dish catalogue. Not run automatically; see
    `import_single_meal` for the search-and-add-one-at-a-time flow used by
    the UI. Kept as a manual escape hatch (`python -m app.cli import-mealdb`)."""
    with httpx.Client(timeout=30) as client:
        meals = fetch_all_meals(client)
        return import_meals(db, meals, client=client, download_images=download_images)


def import_single_meal(
    db: Session, external_id: str, client: httpx.Client, download_images: bool = True
) -> Dish | None:
    """Import exactly one TheMealDB meal by id. Returns the existing dish if
    it was already imported (idempotent), or None if TheMealDB has no such id."""
    existing = db.scalar(select(Dish).where(Dish.external_id == external_id))
    if existing is not None:
        return existing

    raw_meal = lookup_meal(client, external_id)
    if raw_meal is None:
        return None
    mapped = map_meal(raw_meal)
    if mapped is None:
        return None

    dish = _build_dish(db, mapped)
    if download_images and mapped.image_url:
        dish.image_path = download_image(client, mapped.image_url)

    db.add(dish)
    db.commit()
    db.refresh(dish)
    return dish
