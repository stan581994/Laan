from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from achievements import ACHIEVEMENTS, compute_streak
from database import get_db
from models import Achievement, Session as FocusSession, UserGoal

router = APIRouter(prefix="/api", tags=["stats"])


def _monday_of_current_week() -> datetime:
    today = datetime.now(timezone.utc).date()
    monday = today - timedelta(days=today.weekday())
    return datetime(monday.year, monday.month, monday.day, tzinfo=timezone.utc)


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    streak = compute_streak(db)

    total_completed = (
        db.query(func.count(FocusSession.id))
        .filter(FocusSession.status == "completed")
        .scalar()
        or 0
    )

    total_minutes = (
        db.query(func.sum(FocusSession.actual_duration_minutes))
        .filter(FocusSession.status == "completed")
        .scalar()
        or 0
    )
    total_hours = round(total_minutes / 60, 2)

    monday = _monday_of_current_week()
    sessions_this_week = (
        db.query(func.count(FocusSession.id))
        .filter(
            FocusSession.status == "completed",
            FocusSession.started_at >= monday,
        )
        .scalar()
        or 0
    )

    goal = db.query(UserGoal).first()
    if not goal:
        goal = UserGoal()
        db.add(goal)
        db.commit()
        db.refresh(goal)

    weekly_progress = min(1.0, sessions_this_week / goal.target_value) if goal.target_value > 0 else 0.0

    unlocked_keys = {row.key for row in db.query(Achievement).all()}
    achievements = [
        {
            "key": key,
            **meta,
            "unlocked": key in unlocked_keys,
        }
        for key, meta in ACHIEVEMENTS.items()
    ]

    return {
        "streak": streak,
        "total_completed": total_completed,
        "total_hours": total_hours,
        "sessions_this_week": sessions_this_week,
        "weekly_goal": goal.target_value,
        "weekly_progress": weekly_progress,
        "achievements": achievements,
    }


class GoalUpdate(BaseModel):
    target_value: float
    goal_type: str = "sessions_per_week"


@router.put("/goals")
def update_goal(body: GoalUpdate, db: Session = Depends(get_db)):
    goal = db.query(UserGoal).first()
    if not goal:
        goal = UserGoal(goal_type=body.goal_type, target_value=body.target_value)
        db.add(goal)
    else:
        goal.goal_type = body.goal_type
        goal.target_value = body.target_value
        goal.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(goal)
    return goal
