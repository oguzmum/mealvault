from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.basic import CookingBasic

router = APIRouter(prefix="/basics", tags=["basics"])


class CookingBasicOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    title: str
    content: str
    keywords: list[str]


@router.get("", response_model=list[CookingBasicOut])
def list_basics(db: Session = Depends(get_db)):
    return db.scalars(select(CookingBasic).order_by(CookingBasic.title)).all()


@router.get("/{slug}", response_model=CookingBasicOut)
def get_basic(slug: str, db: Session = Depends(get_db)):
    basic = db.scalar(select(CookingBasic).where(CookingBasic.slug == slug))
    if basic is None:
        raise HTTPException(status_code=404, detail="Cooking basic not found")
    return basic
