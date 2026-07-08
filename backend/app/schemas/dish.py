from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.dish import DishSource, ShoppingCategory


class TagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str


class DishIngredientIn(BaseModel):
    ingredient_name: str = Field(min_length=1, max_length=200)
    amount: float | None = Field(default=None, ge=0)
    unit: str | None = Field(default=None, max_length=30)
    raw_text: str | None = Field(default=None, max_length=200)


class DishIngredientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ingredient_name: str
    shopping_category: ShoppingCategory
    amount: float | None
    unit: str | None
    raw_text: str | None


class RecipeStepIn(BaseModel):
    text: str = Field(min_length=1)
    timer_seconds: int | None = Field(default=None, ge=1)


class RecipeStepOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    position: int
    text: str
    timer_seconds: int | None


class DishIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    cook_time_minutes: int | None = Field(default=None, ge=0)
    base_servings: int = Field(default=2, ge=1, le=50)
    kcal: float | None = Field(default=None, ge=0)
    protein_g: float | None = Field(default=None, ge=0)
    carbs_g: float | None = Field(default=None, ge=0)
    fat_g: float | None = Field(default=None, ge=0)
    tags: list[str] = []
    ingredients: list[DishIngredientIn] = []
    steps: list[RecipeStepIn] = []


class DishListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    cook_time_minutes: int | None
    kcal: float | None
    image_path: str | None
    source: DishSource
    tags: list[TagOut]


class DishOut(DishListItem):
    description: str | None
    base_servings: int
    protein_g: float | None
    carbs_g: float | None
    fat_g: float | None
    external_id: str | None
    created_at: datetime
    ingredients: list[DishIngredientOut]
    steps: list[RecipeStepOut]
