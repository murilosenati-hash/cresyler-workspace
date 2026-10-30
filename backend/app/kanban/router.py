import json
from typing import Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import delete, select

from app.core.database import SessionDep
from app.core.models import FreelanceProposal, Ticket

router = APIRouter(prefix="/kanban", tags=["kanban"])

KANBAN_COLUMNS = [
    {"id": "backlog", "title": "Backlog"},
    {"id": "discovery", "title": "Discovery / Spec"},
    {"id": "in_progress", "title": "Em Desenvolvimento"},
    {"id": "qa_review", "title": "Code Review / QA"},
    {"id": "client_approval", "title": "Validação do Cliente"},
    {"id": "completed", "title": "Concluído / Portfólio"},
]
VALID_COLUMN_IDS = {col["id"] for col in KANBAN_COLUMNS}


class TicketCreate(BaseModel):
    title: str
    description: str
    status: str = "backlog"
    priority: str = "medium"
    client_id: Optional[int] = None
    difficulty_level: int = 1
    budget_cents: int = 15000
    tutorial_guide: Optional[str] = None
    acceptance_criteria: list[dict[str, Any]] = []
    stack_tags: str = "Python,FastAPI,SQLite"
    sla_hours: int = 24


class TicketMoveRequest(BaseModel):
    status: str
    order: int = 0
    acceptance_criteria: Optional[list[dict[str, Any]]] = None


@router.get("/boards")
def get_boards(session: SessionDep):
    tickets = session.exec(select(Ticket).order_by(Ticket.order, Ticket.id)).all()
    columns = []
    for col in KANBAN_COLUMNS:
        col_tickets = [
            {
                "id": t.id,
                "title": t.title,
                "description": t.description,
                "status": t.status,
                "priority": t.priority,
                "order": t.order,
                "client_id": t.client_id,
                "difficulty_level": t.difficulty_level,
                "budget_cents": t.budget_cents,
                "tutorial_guide": t.tutorial_guide,
                "acceptance_criteria": json.loads(t.acceptance_criteria or "[]"),
                "stack_tags": [tag.strip() for tag in t.stack_tags.split(",") if tag.strip()],
                "sla_hours": t.sla_hours,
                "in_portfolio": t.in_portfolio,
            }
            for t in tickets
            if t.status == col["id"]
        ]
        columns.append({"id": col["id"], "title": col["title"], "tickets": col_tickets})
    return {"columns": columns, "total_tickets": len(tickets)}


@router.delete("/boards/reset")
def reset_board(session: SessionDep):
    """Zera os tickets do quadro Kanban e restaura as propostas de clientes para 'pending'."""
    session.exec(delete(Ticket))
    proposals = session.exec(select(FreelanceProposal)).all()
    for p in proposals:
        p.status = "pending"
        session.add(p)
    session.commit()
    return {"status": "reset", "total_tickets": 0}


@router.post("/tickets", status_code=201)
def create_ticket(payload: TicketCreate, session: SessionDep):
    if payload.status not in VALID_COLUMN_IDS:
        raise HTTPException(status_code=400, detail=f"Coluna inválida: {payload.status}")
    ticket = Ticket(
        title=payload.title,
        description=payload.description,
        status=payload.status,
        priority=payload.priority,
        client_id=payload.client_id,
        difficulty_level=payload.difficulty_level,
        budget_cents=payload.budget_cents,
        tutorial_guide=payload.tutorial_guide,
        acceptance_criteria=json.dumps(payload.acceptance_criteria, ensure_ascii=False),
        stack_tags=payload.stack_tags,
        sla_hours=payload.sla_hours,
    )
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket


@router.patch("/tickets/{ticket_id}/move")
def move_ticket(ticket_id: int, payload: TicketMoveRequest, session: SessionDep):
    if payload.status not in VALID_COLUMN_IDS:
        raise HTTPException(status_code=400, detail=f"Coluna de destino inválida: {payload.status}")

    ticket = session.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")

    if payload.acceptance_criteria is not None:
        ticket.acceptance_criteria = json.dumps(payload.acceptance_criteria, ensure_ascii=False)

    criteria_list = json.loads(ticket.acceptance_criteria or "[]")
    # RF-K03: Bloqueia avanço para QA/aprovação/concluído se houver itens pendentes no checklist
    if payload.status in {"qa_review", "client_approval", "completed"} and criteria_list:
        pending = [c.get("item") for c in criteria_list if not c.get("done", False)]
        if pending:
            raise HTTPException(
                status_code=422,
                detail=f"Checklist de critérios de aceite pendente antes de '{payload.status}': {pending}",
            )

    ticket.status = payload.status
    ticket.order = payload.order
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket
