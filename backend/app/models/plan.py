from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.dish import Dish


class PlanSlot(Base):
    """A named row in the weekly plan grid (e.g. "Frühstück", "Mittag").

    The two seeded slots are marked `is_default` and cannot be deleted;
    users can add, reorder, and remove any further slots (e.g. a snack).
    """

    __tablename__ = "plan_slots"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    position: Mapped[int] = mapped_column(Integer)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)


class PlanEntry(Base):
    """One dish planned for a specific day and slot.

    Weeks are plain date ranges; there is no separate week entity. A given
    day/slot may hold several entries (e.g. two dishes for one slot).
    """

    __tablename__ = "plan_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    slot_id: Mapped[int] = mapped_column(ForeignKey("plan_slots.id", ondelete="CASCADE"))
    dish_id: Mapped[int] = mapped_column(ForeignKey("dishes.id", ondelete="CASCADE"))
    servings: Mapped[int] = mapped_column(Integer, default=1)

    dish: Mapped[Dish] = relationship(lazy="joined")
    slot: Mapped[PlanSlot] = relationship(lazy="joined")


class UserSettings(Base):
    """Single-row table with the household's nutrition targets."""

    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    daily_kcal_target: Mapped[int] = mapped_column(Integer, default=2000)
    daily_protein_target_g: Mapped[int] = mapped_column(Integer, default=100)
    daily_carbs_target_g: Mapped[int] = mapped_column(Integer, default=250)
    daily_fat_target_g: Mapped[int] = mapped_column(Integer, default=70)
    default_max_missing: Mapped[int] = mapped_column(Integer, default=2)
