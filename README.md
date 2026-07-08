# MealVault

Self-hosted meal planning for a small household: manage your own dishes, plan your week with drag & drop, track nutrition, find recipes by the ingredients you have at home, spin up a random suggestion when you can't decide, and take an auto-generated shopping list to the supermarket.

I built this because almost every day we end up asking the same question: what should we eat today? 
Answering it eats up mental energy, and more often than not we settle for something less healthy just to make a decision. I'm also paying closer attention to what I eat these days - calories, nutrients - and wanted a way to plan for that consciously instead of guessing. On top of that, I wanted a place to collect my own meals and recipes, and to write down the cooking basics I'm still learning as a relative beginner in the kitchen.

This will run on my homeserver and I'm planning to share it with family memebers. So German UI for now :D

Built with Claude, using Fable 5 - wanted to try it out for a while and this project was a good excuse.

## Features

- **Dish database** - CRUD for your own dishes with ingredients & amounts, step-by-step instructions, cook time, tags, per-serving nutrition (kcal/protein/carbs/fat), optional photo upload, and dynamic portion scaling
- **Recipe steps & cooking basics** - optional countdown timer per step; a beginner-friendly "Koch-Grundlagen" section (sautéing, blanching, deglazing, Maillard …) auto-linked from recipe steps via keywords
- **Search** - full-text dish search, tag/cook-time/kcal filters, and ingredient-based search: enter what's in your fridge and get dishes sorted by how many ingredients you're missing (threshold configurable)
- **Weekly planner** - Mo–Su grid with breakfast, dinner and customizable slots, drag & drop system, per-day and per-week nutrition sums
- **Plan generator** - greedy suggestion that targets your daily kcal goal, avoids repeating dishes within 7 days, and is fully editable before applying
- **Random picker** - scrolling reel over your dish list (fast to slow spin, endless-looking loop), pre-filterable by the same tag system, tucked behind a dropdown
- **Shopping list** - generated from the week's plan, amounts aggregated across dishes and scaled by planned servings, categorized for the supermarket (produce / dairy / meat & fish / pantry / …)
- **TheMealDB recipe import** - search TheMealDB by name and add individual recipes to your own collection on demand, clearly marked as `imported` and independent from your own dishes (no bulk import - you pick what you actually want)

## Quick start

Run natively (needs local Postgres via Docker, see below)
```bash
./dev-start.sh
```
- Frontend: http://localhost:5173
- API + OpenAPI docs: http://localhost:8000/docs

Or run fully in Docker
```bash
docker compose up --build
```
- Frontend: http://localhost:3000
- API + OpenAPI docs: http://localhost:8000/docs

On the first start the backend runs database migrations and seeds the cooking-basics content. Optional overrides live in [.env.example](.env.example).

### Backend (`backend/`)

FastAPI as a pure JSON REST API (`/api/v1`), PostgreSQL via SQLAlchemy 2 with Alembic migrations from day one (no `create_all` in production code). Uploaded and imported images are stored on a local volume and served under `/uploads`.
CORS origins are configured per environment via `CORS_ORIGINS`.

- `app/models` - SQLAlchemy models (dishes, ingredients, steps, tags, plan entries, shopping lists, cooking basics, settings)
- `app/routers` - REST endpoints; OpenAPI/Swagger comes for free from FastAPI
- `app/services` - core logic: nutrition aggregation, ingredient matching, plan generator, shopping-list aggregation, shopping-category mapping
- `app/importers` - TheMealDB search/import (single recipe, plus an unwired bulk-import function)
- `tests` - pytest suite against in-memory SQLite

### Frontend (`frontend/`)

React (Vite, TypeScript) single-page app talking to the API with React Query.
Styling is Tailwind CSS v4. Drag & drop uses dnd-kit, the random-picker reel animation framer-motion.
All user-facing strings are German and live in `src/locales/de.json` (react-i18next), so additional languages can be added without touching components.

- `src/pages` - one component per screen
- `src/components` - layout, UI primitives (Card/Button/Chip/ProgressBar) and feature components
- `src/api` - typed API hooks per domain
- In dev the Vite server proxies `/api` and `/uploads` to `localhost:8000`; in production nginx serves the build and the API origin is baked in via `VITE_API_BASE_URL`

## Public recipe data source

Recipe import uses **[TheMealDB](https://www.themealdb.com)** with the free test API key `1`, which TheMealDB explicitly allows for development and educational use (a paid key is required for public app-store releases).
Chosen over alternatives because it is keyless for this use case and has clean structured data (ingredients with measures, category, cuisine, images).

From **Gerichte → Rezept importieren** you can search TheMealDB by name and add individual recipes to your own collection one at a time - there's no automatic bulk import, so your dish list only ever contains what you actually picked. Adding the same recipe twice is a no-op (matched by TheMealDB id). Trade-offs of the source data, handled as follows:

- **No nutrition data** - imported dishes keep empty nutrition fields; values are never guessed.
- **Free-text measures** ("1 cup", "½ tsp") - parsed into amount + unit where possible; otherwise the raw text is kept and shown as-is (and listed separately on shopping lists instead of being summed).
- **English content** - imported recipes stay English while the UI chrome is German.
- **No servings info** - imported dishes assume 4 base servings (only affects portion scaling).

There's also a `run_import()` function in `app/importers/mealdb.py` for bulk-seeding the whole ~300-dish catalogue in one go (idempotent, existing dishes are skipped) - currently not wired up to the CLI, so it's only reachable by calling it directly (e.g. in a shell or a one-off script), not via a documented command yet.

## Development

```bash
# Backend (needs a running PostgreSQL, see backend/.env.example)
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/alembic upgrade head
.venv/bin/python -m app.cli   # seeds cooking basics
.venv/bin/uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev        # http://localhost:5173, proxies /api to :8000

# Tests
cd backend && .venv/bin/python -m pytest
cd frontend && npm test
```

## CI/CD

`.github/workflows/build.yml` runs both test suites on every push/PR and, on pushes to `main`, builds the `backend` and `frontend` Docker images and pushes them to GitHub Container Registry - each with a commit-SHA tag **and** the `latest` tag.

## Out of scope (for now)

Multi-user accounts/auth, URL recipe import, pantry management, e-ink display integration, native mobile app. The web UI is responsive; single household usage is assumed.
