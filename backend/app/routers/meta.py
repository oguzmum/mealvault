from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.dish import Ingredient, Tag, dish_tags as DishTags
from app.schemas.dish import TagOut, TagRenameIn
from app.services.dishes import slugify
from pydantic import BaseModel, ConfigDict


class IngredientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    shopping_category: str


router = APIRouter(tags=["meta"])


@router.get("/tags", response_model=list[TagOut])
def list_tags(include_empty: bool = False, db: Session = Depends(get_db)):
    query = select(Tag, func.count(DishTags.c.dish_id)).group_by(Tag.id).order_by(Tag.name)
    if include_empty:
        # tag management page: also list tags currently unused by any dish
        query = query.outerjoin(DishTags, DishTags.c.tag_id == Tag.id)
    else:
        # filter chips (dishes/wheel pages): only tags that actually narrow results
        query = query.join(DishTags, DishTags.c.tag_id == Tag.id)

    rows = db.execute(query).all()
    return [TagOut(id=tag.id, name=tag.name, slug=tag.slug, dish_count=count) for tag, count in rows]


@router.patch("/tags/{tag_id}", response_model=TagOut)
def rename_tag(tag_id: int, payload: TagRenameIn, db: Session = Depends(get_db)):
    tag = db.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")

    name = payload.name.strip()
    slug = slugify(name)
    conflict = db.scalar(select(Tag).where(Tag.slug == slug, Tag.id != tag_id))
    if conflict is not None:
        raise HTTPException(status_code=409, detail="A tag with that name already exists")

    tag.name = name
    tag.slug = slug
    db.commit()

    dish_count = db.scalar(
        select(func.count(DishTags.c.dish_id)).where(DishTags.c.tag_id == tag.id)
    )
    return TagOut(id=tag.id, name=tag.name, slug=tag.slug, dish_count=dish_count or 0)


@router.delete("/tags/{tag_id}", status_code=204)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.get(Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(tag)
    db.commit()


@router.get("/ingredients", response_model=list[IngredientOut])
def list_ingredients(q: str | None = None, db: Session = Depends(get_db)):
    query = select(Ingredient).order_by(Ingredient.name)
    if q:
        query = query.where(Ingredient.name.ilike(f"%{q}%"))
    return db.scalars(query.limit(50)).all()
