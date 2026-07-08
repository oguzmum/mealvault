import enum
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Table,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DishSource(str, enum.Enum):
    user = "user"
    imported = "imported"


class ShoppingCategory(str, enum.Enum):
    produce = "produce"
    dairy = "dairy"
    meat_fish = "meat_fish"
    pantry = "pantry"
    frozen = "frozen"
    other = "other"


dish_tags = Table(
    "dish_tags",
    Base.metadata,
    Column("dish_id", ForeignKey("dishes.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Dish(Base):
    __tablename__ = "dishes"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    cook_time_minutes: Mapped[int | None]
    base_servings: Mapped[int] = mapped_column(Integer, default=2)

    # Nutrition per serving; nullable because imported dishes may not provide it
    kcal: Mapped[float | None] = mapped_column(Numeric(8, 1))
    protein_g: Mapped[float | None] = mapped_column(Numeric(8, 1))
    carbs_g: Mapped[float | None] = mapped_column(Numeric(8, 1))
    fat_g: Mapped[float | None] = mapped_column(Numeric(8, 1))

    image_path: Mapped[str | None] = mapped_column(String(500))
    source: Mapped[DishSource] = mapped_column(
        Enum(DishSource, native_enum=False, length=20), default=DishSource.user
    )
    # TheMealDB id for imported dishes; makes re-imports idempotent
    external_id: Mapped[str | None] = mapped_column(String(50), unique=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    ingredients: Mapped[list["DishIngredient"]] = relationship(
        back_populates="dish",
        cascade="all, delete-orphan",
        order_by="DishIngredient.position",
    )
    steps: Mapped[list["RecipeStep"]] = relationship(
        back_populates="dish",
        cascade="all, delete-orphan",
        order_by="RecipeStep.position",
    )
    tags: Mapped[list["Tag"]] = relationship(secondary=dish_tags, order_by="Tag.name")


class Ingredient(Base):
    __tablename__ = "ingredients"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    # Lowercased/trimmed key so "Feta" and "feta " resolve to the same row
    name_normalized: Mapped[str] = mapped_column(String(200), unique=True)
    shopping_category: Mapped[ShoppingCategory] = mapped_column(
        Enum(ShoppingCategory, native_enum=False, length=20), default=ShoppingCategory.other
    )


class DishIngredient(Base):
    __tablename__ = "dish_ingredients"

    id: Mapped[int] = mapped_column(primary_key=True)
    dish_id: Mapped[int] = mapped_column(ForeignKey("dishes.id", ondelete="CASCADE"))
    ingredient_id: Mapped[int] = mapped_column(ForeignKey("ingredients.id"))
    position: Mapped[int] = mapped_column(Integer, default=0)

    # Parsed amount/unit when available; raw_text keeps the original free-text
    # measure (e.g. "1 cup" from TheMealDB) as display fallback
    amount: Mapped[float | None] = mapped_column(Numeric(10, 2))
    unit: Mapped[str | None] = mapped_column(String(30))
    raw_text: Mapped[str | None] = mapped_column(String(200))

    dish: Mapped[Dish] = relationship(back_populates="ingredients")
    ingredient: Mapped[Ingredient] = relationship(lazy="joined")

    # Proxies so pydantic's from_attributes validation can read these directly
    @property
    def ingredient_name(self) -> str:
        return self.ingredient.name

    @property
    def shopping_category(self) -> ShoppingCategory:
        return self.ingredient.shopping_category


class RecipeStep(Base):
    __tablename__ = "recipe_steps"

    id: Mapped[int] = mapped_column(primary_key=True)
    dish_id: Mapped[int] = mapped_column(ForeignKey("dishes.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer, default=0)
    text: Mapped[str] = mapped_column(Text)
    timer_seconds: Mapped[int | None]

    dish: Mapped[Dish] = relationship(back_populates="steps")


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    slug: Mapped[str] = mapped_column(String(100), unique=True)
