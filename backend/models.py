from datetime import datetime
from typing import Optional
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class Site(Base):
    __tablename__ = "sites"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    domain: Mapped[str] = mapped_column(unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=func.now(), nullable=False)


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    task_name: Mapped[str] = mapped_column(nullable=False)
    description: Mapped[Optional[str]] = mapped_column(nullable=True)
    planned_duration_minutes: Mapped[int] = mapped_column(nullable=False)
    actual_duration_minutes: Mapped[Optional[int]] = mapped_column(nullable=True)
    breaks_budget: Mapped[int] = mapped_column(nullable=False)
    breaks_used: Mapped[int] = mapped_column(default=0, nullable=False)
    status: Mapped[str] = mapped_column(default="active", nullable=False)
    started_at: Mapped[datetime] = mapped_column(default=func.now(), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)


class Achievement(Base):
    __tablename__ = "achievements"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    key: Mapped[str] = mapped_column(unique=True, nullable=False)
    unlocked_at: Mapped[datetime] = mapped_column(default=func.now(), nullable=False)


class UserGoal(Base):
    __tablename__ = "user_goals"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    goal_type: Mapped[str] = mapped_column(default="sessions_per_week", nullable=False)
    target_value: Mapped[float] = mapped_column(default=5.0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), nullable=False)
