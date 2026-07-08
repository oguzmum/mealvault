from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CookingBasic(Base):
    """Short explanation of a basic cooking technique (for beginners).

    `keywords` holds trigger words (German and English); recipe steps whose
    text contains one of them get a link to this entry at render time, so
    imported dishes are covered without manual linking.
    """

    __tablename__ = "cooking_basics"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text)
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list)
