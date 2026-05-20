import math
import os
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from achievements import check_and_unlock
from database import get_db
from models import Session as FocusSession, Site

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

HOST_AGENT_URL = os.getenv("HOST_AGENT_URL", "http://localhost:7072")


def _get_active_domains(db: Session) -> list[str]:
    sites = db.query(Site).filter(Site.is_active == True).all()  # noqa: E712
    return [s.domain for s in sites]


def _call_agent(action: str, domains: list[str]) -> None:
    """Call the host agent to block/restore domains. Non-fatal on error."""
    try:
        if action == "block":
            httpx.post(
                f"{HOST_AGENT_URL}/{action}",
                json={"domains": domains},
                timeout=5.0,
            )
        else:
            httpx.post(
                f"{HOST_AGENT_URL}/{action}",
                timeout=5.0,
            )
    except Exception:
        pass  # Non-fatal


def _elapsed_minutes(started_at: datetime) -> int:
    return int(
        (datetime.now(timezone.utc) - started_at.replace(tzinfo=timezone.utc)).total_seconds() / 60
    )


class SessionStart(BaseModel):
    task_name: str
    description: Optional[str] = None
    planned_duration_minutes: int


@router.get("/active")
def get_active_session(db: Session = Depends(get_db)):
    session = (
        db.query(FocusSession).filter(FocusSession.status == "active").first()
    )
    return session  # returns None (serialised as null) if not found


@router.get("/")
def list_sessions(db: Session = Depends(get_db)):
    return (
        db.query(FocusSession).order_by(FocusSession.started_at.desc()).all()
    )


@router.post("/start", status_code=201)
def start_session(body: SessionStart, db: Session = Depends(get_db)):
    existing = db.query(FocusSession).filter(FocusSession.status == "active").first()
    if existing:
        raise HTTPException(status_code=409, detail="A session is already active")

    breaks_budget = math.ceil(body.planned_duration_minutes / 40)

    session = FocusSession(
        task_name=body.task_name,
        description=body.description,
        planned_duration_minutes=body.planned_duration_minutes,
        breaks_budget=breaks_budget,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    domains = _get_active_domains(db)
    _call_agent("block", domains)

    return session


@router.post("/{session_id}/break")
def take_break(session_id: int, db: Session = Depends(get_db)):
    session = db.query(FocusSession).filter(FocusSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.breaks_used >= session.breaks_budget:
        raise HTTPException(status_code=400, detail="Break budget exhausted")

    session.breaks_used += 1
    db.commit()
    db.refresh(session)
    return session


@router.post("/{session_id}/end")
def end_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(FocusSession).filter(FocusSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    elapsed = _elapsed_minutes(session.started_at)
    session.actual_duration_minutes = elapsed
    session.completed_at = datetime.now(timezone.utc)
    session.status = "completed" if elapsed >= session.planned_duration_minutes else "failed"
    db.commit()
    db.refresh(session)

    _call_agent("restore", [])

    newly_unlocked = check_and_unlock(db) if session.status == "completed" else []

    return {"session": session, "newly_unlocked": newly_unlocked}


@router.post("/{session_id}/abandon")
def abandon_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(FocusSession).filter(FocusSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = "abandoned"
    session.completed_at = datetime.now(timezone.utc)
    session.actual_duration_minutes = _elapsed_minutes(session.started_at)
    db.commit()
    db.refresh(session)

    _call_agent("restore", [])

    return session
