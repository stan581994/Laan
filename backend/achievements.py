from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session as DBSession
from models import Achievement, Session as FocusSession

ACHIEVEMENTS = {
    "first_laan": {
        "name": "First Laan",
        "description": "Complete your first session",
        "icon": "🌱",
    },
    "dedicated": {
        "name": "Dedicated",
        "description": "7-day streak",
        "icon": "🔥",
    },
    "disciplined": {
        "name": "Disciplined",
        "description": "30-day streak",
        "icon": "⚡",
    },
    "century": {
        "name": "Century",
        "description": "100 sessions total",
        "icon": "💯",
    },
    "deep_work": {
        "name": "Deep Work",
        "description": "Complete a session of 3+ hours",
        "icon": "🌊",
    },
    "clean_week": {
        "name": "Clean Week",
        "description": "5 sessions in one week",
        "icon": "📅",
    },
    "no_breaks": {
        "name": "No Breaks Needed",
        "description": "Complete a 2h+ session with 0 breaks",
        "icon": "🧘",
    },
}


def compute_streak(db: DBSession) -> int:
    """Count consecutive calendar days (backwards from today) with >= 1 completed session."""
    completed = (
        db.query(FocusSession)
        .filter(FocusSession.status == "completed")
        .all()
    )

    # Collect unique dates that have a completed session
    session_dates: set[datetime.date] = set()
    for s in completed:
        dt = s.started_at
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        session_dates.add(dt.date())

    today = datetime.now(timezone.utc).date()
    streak = 0
    current = today

    while current in session_dates:
        streak += 1
        current -= timedelta(days=1)

    return streak


def check_and_unlock(db: DBSession) -> list[str]:
    """Check all achievement conditions, unlock new ones, return list of newly unlocked keys."""
    # Fetch already-unlocked keys
    already_unlocked = {row.key for row in db.query(Achievement).all()}

    # Gather data needed for checks
    completed = (
        db.query(FocusSession)
        .filter(FocusSession.status == "completed")
        .all()
    )
    total_completed = len(completed)
    streak = compute_streak(db)

    newly_unlocked: list[str] = []

    def unlock(key: str):
        if key not in already_unlocked:
            db.add(Achievement(key=key))
            newly_unlocked.append(key)
            already_unlocked.add(key)

    # first_laan
    if total_completed >= 1:
        unlock("first_laan")

    # dedicated
    if streak >= 7:
        unlock("dedicated")

    # disciplined
    if streak >= 30:
        unlock("disciplined")

    # century
    if total_completed >= 100:
        unlock("century")

    # deep_work — any completed session with actual_duration_minutes >= 180
    if any(s.actual_duration_minutes is not None and s.actual_duration_minutes >= 180 for s in completed):
        unlock("deep_work")

    # clean_week — max count of completed sessions in any single ISO week >= 5
    week_counts: dict[tuple, int] = {}
    for s in completed:
        dt = s.started_at
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        iso = dt.isocalendar()  # (year, week, weekday)
        key = (iso[0], iso[1])
        week_counts[key] = week_counts.get(key, 0) + 1
    if week_counts and max(week_counts.values()) >= 5:
        unlock("clean_week")

    # no_breaks — any completed session with planned_duration_minutes >= 120 AND breaks_used == 0
    if any(s.planned_duration_minutes >= 120 and s.breaks_used == 0 for s in completed):
        unlock("no_breaks")

    if newly_unlocked:
        db.commit()

    return newly_unlocked
