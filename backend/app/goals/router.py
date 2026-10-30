import json
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.core.database import SessionDep
from app.core.models import (
    ClientPersona,
    DocumentMeta,
    FocusSession,
    LocalUser,
    StudyGoal,
    Ticket,
    today_str,
)

router = APIRouter(prefix="/goals", tags=["goals"])


class FocusSessionCreate(BaseModel):
    session_type: str = "study"  # study | ticket_dev
    ticket_id: Optional[int] = None
    duration_seconds: int = 900  # 15 min default
    completed: bool = True


class DailyGoalUpdate(BaseModel):
    daily_goal_minutes: int = 45


class LocalLoginRequest(BaseModel):
    username: str = "tomy"
    display_name: str = "Tomy"
    role_title: str = "Dev Jr / Estagiário • Automação & Web"
    pin: str = "1234"
    daily_goal_minutes: int = 45


def _compute_daily_focus(session: SessionDep) -> dict:
    user = session.exec(select(LocalUser)).first()
    goal_minutes = user.daily_goal_minutes if user else 45
    today = today_str()
    sessions_today = list(
        session.exec(
            select(FocusSession).where(
                FocusSession.session_date == today,
                FocusSession.completed == True,  # noqa: E712
            )
        ).all()
    )
    total_seconds = sum(s.duration_seconds for s in sessions_today)
    focused_minutes = int(round(total_seconds / 60))
    progress_pct = min(100, int(round((focused_minutes / max(1, goal_minutes)) * 100)))
    return {
        "date": today,
        "focused_minutes_today": focused_minutes,
        "daily_goal_minutes": goal_minutes,
        "progress_pct": progress_pct,
        "completed_sprints_today": len(sessions_today),
        "goal_reached": focused_minutes >= goal_minutes,
    }


@router.get("/daily-focus")
def get_daily_focus(session: SessionDep):
    return _compute_daily_focus(session)


@router.post("/focus-sessions", status_code=201)
def record_focus_session(payload: FocusSessionCreate, session: SessionDep):
    fs = FocusSession(
        session_type=payload.session_type,
        ticket_id=payload.ticket_id,
        duration_seconds=payload.duration_seconds,
        completed=payload.completed,
    )
    session.add(fs)

    goal = session.exec(select(StudyGoal)).first()
    if goal and payload.completed:
        goal.completed_pomodoros += 1
        session.add(goal)

    session.commit()
    session.refresh(fs)
    return {
        "session_id": fs.id,
        "daily_focus": _compute_daily_focus(session),
    }


@router.patch("/daily-focus/target")
def update_daily_goal_target(payload: DailyGoalUpdate, session: SessionDep):
    user = session.exec(select(LocalUser)).first()
    if not user:
        user = LocalUser(daily_goal_minutes=payload.daily_goal_minutes)
    else:
        user.daily_goal_minutes = max(15, min(180, payload.daily_goal_minutes))
    session.add(user)
    session.commit()
    return _compute_daily_focus(session)


@router.get("/profile")
def get_local_profile(session: SessionDep):
    user = session.exec(select(LocalUser)).first()
    if not user:
        user = LocalUser()
        session.add(user)
        session.commit()
        session.refresh(user)
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "role_title": user.role_title,
        "daily_goal_minutes": user.daily_goal_minutes,
        "available_for_work": user.available_for_work,
    }


@router.post("/profile/login")
def login_or_update_profile(payload: LocalLoginRequest, session: SessionDep):
    user = session.exec(select(LocalUser)).first()
    if not user:
        user = LocalUser()
    user.username = payload.username.strip() or "tomy"
    user.display_name = payload.display_name.strip() or "Tomy"
    user.role_title = payload.role_title.strip() or "Dev Jr / Estagiário"
    user.pin = payload.pin.strip() or "1234"
    user.daily_goal_minutes = max(15, min(180, payload.daily_goal_minutes))
    session.add(user)
    session.commit()
    session.refresh(user)
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "role_title": user.role_title,
        "daily_goal_minutes": user.daily_goal_minutes,
        "available_for_work": user.available_for_work,
        "session_token": f"local-session-{user.username}",
    }


@router.get("/summary")
def get_goals_summary(session: SessionDep):
    tickets = session.exec(select(Ticket)).all()
    docs = session.exec(select(DocumentMeta)).all()
    goals = session.exec(select(StudyGoal)).all()
    completed_tickets = [t for t in tickets if t.status == "completed"]
    portfolio_cases = [t for t in tickets if t.in_portfolio]
    return {
        "total_tickets": len(tickets),
        "completed_tickets": len(completed_tickets),
        "portfolio_cases": len(portfolio_cases),
        "indexed_documents": len(docs),
        "study_goals": goals,
        "daily_focus": _compute_daily_focus(session),
    }


@router.post("/portfolio/export/{ticket_id}")
def export_portfolio_case(ticket_id: int, session: SessionDep):
    ticket = session.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")

    persona = session.get(ClientPersona, ticket.client_id) if ticket.client_id else None
    client_label = f"{persona.company} ({persona.name})" if persona else "Cresyler Labs Internal"
    criteria = json.loads(ticket.acceptance_criteria or "[]")
    criteria_md = "\n".join(
        f"- [{'x' if c.get('done') else ' '}] {c.get('item')}" for c in criteria
    ) or "- [x] Entrega validada"

    case_md = (
        f"# Case de Portfólio: {ticket.title}\n\n"
        f"- **Cliente / Persona:** {client_label}\n"
        f"- **Stack Tecnológica:** `{ticket.stack_tags}`\n"
        f"- **SLA Acordado:** {ticket.sla_hours}h\n\n"
        f"## 1. Desafio de Negócio\n{ticket.description}\n\n"
        f"## 2. Critérios de Aceite Cumpridos\n{criteria_md}\n"
    )
    ticket.in_portfolio = True
    ticket.case_markdown = case_md
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return {
        "ticket_id": ticket.id,
        "in_portfolio": ticket.in_portfolio,
        "case_markdown": ticket.case_markdown,
    }
