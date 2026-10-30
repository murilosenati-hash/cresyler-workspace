import json
from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.core.database import SessionDep
from app.core.models import ClientPersona, DocumentMeta, StudyGoal, Ticket

router = APIRouter(prefix="/goals", tags=["goals"])


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
