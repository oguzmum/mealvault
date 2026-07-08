from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.plan import UserSettings
from app.schemas.plan import SettingsIn, SettingsOut

router = APIRouter(prefix="/settings", tags=["settings"])


def get_or_create_settings(db: Session) -> UserSettings:
    settings_row = db.get(UserSettings, 1)
    if settings_row is None:
        settings_row = UserSettings(id=1)
        db.add(settings_row)
        db.commit()
    return settings_row


@router.get("", response_model=SettingsOut)
def read_settings(db: Session = Depends(get_db)):
    return get_or_create_settings(db)


@router.put("", response_model=SettingsOut)
def update_settings(payload: SettingsIn, db: Session = Depends(get_db)):
    settings_row = get_or_create_settings(db)
    for key, value in payload.model_dump().items():
        setattr(settings_row, key, value)
    db.commit()
    return settings_row
