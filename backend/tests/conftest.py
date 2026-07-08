import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app import models  # noqa: F401  (registers all models on Base.metadata)

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, _):
    # SQLite ignores ON DELETE CASCADE unless FK enforcement is turned on
    # per-connection; Postgres (used in production) enforces it natively.
    dbapi_connection.execute("PRAGMA foreign_keys=ON")
TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@pytest.fixture()
def db():
    Base.metadata.create_all(engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


@pytest.fixture()
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def sample_dish_payload():
    return {
        "name": "Hähnchen-Bowl",
        "cook_time_minutes": 25,
        "base_servings": 4,
        "kcal": 610,
        "protein_g": 48,
        "carbs_g": 52,
        "fat_g": 22,
        "tags": ["High Protein"],
        "ingredients": [
            {"ingredient_name": "Hähnchenbrust", "amount": 400, "unit": "g"},
            {"ingredient_name": "Reis", "amount": 300, "unit": "g"},
            {"ingredient_name": "Avocado", "amount": 2, "unit": "Stk"},
        ],
        "steps": [
            {"text": "Reis kochen.", "timer_seconds": 900},
            {"text": "Hähnchen braten.", "timer_seconds": 480},
            {"text": "Anrichten."},
        ],
    }
