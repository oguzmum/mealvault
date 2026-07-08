from pydantic import BaseModel


class MealDbSearchResult(BaseModel):
    external_id: str
    name: str
    thumbnail: str | None
    category: str | None
    area: str | None
    already_imported: bool
