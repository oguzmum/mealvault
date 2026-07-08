import sys

from app.database import SessionLocal

def seed_basics() -> None:
    from app.services.basics_seed import seed_cooking_basics

    with SessionLocal() as db:
        created = seed_cooking_basics(db)
    print(f"Cooking basics seeded ({created} new entries).")

def main():
	seed_basics()

if __name__ == "__main__":
    sys.exit(main())
