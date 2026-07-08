from datetime import date as date_type

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.dish import DishListItem


class PlanSlotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    position: int
    is_default: bool


class PlanSlotIn(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class PlanSlotMove(BaseModel):
    direction: str = Field(pattern="^(up|down)$")


class PlanEntryIn(BaseModel):
    date: date_type
    slot_id: int
    dish_id: int
    servings: int = Field(default=1, ge=1, le=50)


class PlanEntryUpdate(BaseModel):
    date: date_type | None = None
    slot_id: int | None = None
    dish_id: int | None = None
    servings: int | None = Field(default=None, ge=1, le=50)


class PlanEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: date_type
    slot_id: int
    servings: int
    dish: DishListItem


class DayNutritionOut(BaseModel):
    day: date_type
    kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    incomplete: bool


class NutritionTotalsOut(BaseModel):
    kcal: float
    protein_g: float
    carbs_g: float
    fat_g: float
    incomplete: bool


class PlanOut(BaseModel):
    start: date_type
    days: int
    entries: list[PlanEntryOut]
    day_sums: list[DayNutritionOut]
    totals: NutritionTotalsOut


class SettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    daily_kcal_target: int
    daily_protein_target_g: int
    daily_carbs_target_g: int
    daily_fat_target_g: int
    default_max_missing: int


class SettingsIn(BaseModel):
    daily_kcal_target: int = Field(ge=500, le=10000)
    daily_protein_target_g: int = Field(ge=0, le=1000)
    daily_carbs_target_g: int = Field(ge=0, le=2000)
    daily_fat_target_g: int = Field(ge=0, le=1000)
    default_max_missing: int = Field(ge=0, le=10)
