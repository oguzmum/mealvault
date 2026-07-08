from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.dish import ShoppingCategory


class ShoppingList(Base):
    __tablename__ = "shopping_lists"

    id: Mapped[int] = mapped_column(primary_key=True)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    items: Mapped[list["ShoppingListItem"]] = relationship(
        back_populates="shopping_list",
        cascade="all, delete-orphan",
        order_by="ShoppingListItem.name",
    )


class ShoppingListItem(Base):
    __tablename__ = "shopping_list_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    list_id: Mapped[int] = mapped_column(ForeignKey("shopping_lists.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(200))
    category: Mapped[ShoppingCategory] = mapped_column(
        Enum(ShoppingCategory, native_enum=False, length=20), default=ShoppingCategory.other
    )
    # Aggregated parsed amount; None when only free-text measures were available
    amount: Mapped[float | None] = mapped_column(Numeric(10, 2))
    unit: Mapped[str | None] = mapped_column(String(30))
    # Display fallback for unparseable measures (e.g. "1 cup + n. B.")
    note: Mapped[str | None] = mapped_column(String(300))
    checked: Mapped[bool] = mapped_column(Boolean, default=False)

    shopping_list: Mapped[ShoppingList] = relationship(back_populates="items")
