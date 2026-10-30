import json
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.clients.demands.generator import (
    LEVEL_1_PROPOSALS,
    build_proposal_for_persona,
    generate_simulated_demand,
)
from app.core.database import SessionDep
from app.core.models import ClientPersona, FreelanceProposal, LocalUser, Ticket

router = APIRouter(prefix="/clients", tags=["clients"])


class PersonaCreate(BaseModel):
    name: str
    company: str
    industry: str = "SaaS"
    tone: str = "Objetivo e focado em entregas incrementais"
    criteria_strictness: str = "Baixo (Nível 1)"


class GenerateDemandRequest(BaseModel):
    client_id: Optional[int] = None
    template_index: int = 0


class AvailabilityToggleRequest(BaseModel):
    available_for_work: bool


def _serialize_proposal(p: FreelanceProposal, persona: Optional[ClientPersona]) -> dict:
    return {
        "id": p.id,
        "client_persona_id": p.client_persona_id,
        "client_name": persona.name if persona else "Cliente Externo",
        "company": persona.company if persona else "Cresyler Partner",
        "industry": persona.industry if persona else "Tech",
        "title": p.title,
        "difficulty_level": p.difficulty_level,
        "budget_cents": p.budget_cents,
        "budget_formatted": f"R$ {p.budget_cents / 100:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
        "estimated_minutes": p.estimated_minutes,
        "sla_hours": p.sla_hours,
        "stack_tags": [t.strip() for t in p.stack_tags.split(",") if t.strip()],
        "briefing_markdown": p.briefing_markdown,
        "tutorial_guide_markdown": p.tutorial_guide_markdown,
        "acceptance_criteria": json.loads(p.acceptance_criteria or "[]"),
        "status": p.status,
    }


@router.get("/personas")
def list_personas(session: SessionDep):
    return session.exec(select(ClientPersona)).all()


@router.post("/personas", status_code=201)
def create_persona(payload: PersonaCreate, session: SessionDep):
    persona = ClientPersona(**payload.model_dump())
    session.add(persona)
    session.commit()
    session.refresh(persona)
    return persona


@router.get("/availability")
def get_availability(session: SessionDep):
    user = session.exec(select(LocalUser)).first()
    return {"available_for_work": bool(user.available_for_work) if user else False}


@router.patch("/availability")
def set_availability(payload: AvailabilityToggleRequest, session: SessionDep):
    user = session.exec(select(LocalUser)).first()
    if not user:
        user = LocalUser(available_for_work=payload.available_for_work)
    else:
        user.available_for_work = payload.available_for_work
    session.add(user)
    session.commit()
    session.refresh(user)

    # Se ficou disponível e não há propostas pendentes, gera um lote de oportunidades Nível 1
    if user.available_for_work:
        pending = session.exec(
            select(FreelanceProposal).where(FreelanceProposal.status == "pending")
        ).all()
        if not pending:
            personas = list(session.exec(select(ClientPersona)).all())
            if personas:
                for idx in range(len(LEVEL_1_PROPOSALS)):
                    persona = personas[idx % len(personas)]
                    session.add(build_proposal_for_persona(persona, idx))
                session.commit()

    pending_count = len(
        session.exec(select(FreelanceProposal).where(FreelanceProposal.status == "pending")).all()
    )
    return {
        "available_for_work": user.available_for_work,
        "pending_proposals_count": pending_count,
    }


@router.get("/proposals")
def list_proposals(session: SessionDep, status: str = "pending"):
    stmt = select(FreelanceProposal).order_by(FreelanceProposal.id.desc())
    if status != "all":
        stmt = stmt.where(FreelanceProposal.status == status)
    proposals = list(session.exec(stmt).all())
    personas = {p.id: p for p in session.exec(select(ClientPersona)).all()}
    return [_serialize_proposal(p, personas.get(p.client_persona_id)) for p in proposals]


@router.post("/proposals/generate", status_code=201)
def generate_new_proposal(payload: GenerateDemandRequest, session: SessionDep):
    if payload.client_id is not None:
        persona = session.get(ClientPersona, payload.client_id)
    else:
        persona = session.exec(select(ClientPersona)).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Nenhuma persona encontrada")

    proposal = build_proposal_for_persona(persona, payload.template_index)
    session.add(proposal)
    session.commit()
    session.refresh(proposal)
    return _serialize_proposal(proposal, persona)


@router.post("/proposals/{proposal_id}/accept")
def accept_proposal(proposal_id: int, session: SessionDep):
    proposal = session.get(FreelanceProposal, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")

    proposal.status = "accepted"
    session.add(proposal)

    ticket = Ticket(
        title=proposal.title,
        description=proposal.briefing_markdown,
        status="backlog",
        priority="medium",
        client_id=proposal.client_persona_id,
        difficulty_level=proposal.difficulty_level,
        budget_cents=proposal.budget_cents,
        tutorial_guide=proposal.tutorial_guide_markdown,
        acceptance_criteria=proposal.acceptance_criteria,
        stack_tags=proposal.stack_tags,
        sla_hours=proposal.sla_hours,
    )
    session.add(ticket)
    session.commit()
    session.refresh(proposal)
    session.refresh(ticket)
    return {
        "status": "accepted",
        "proposal_id": proposal.id,
        "ticket": {
            "id": ticket.id,
            "title": ticket.title,
            "status": ticket.status,
            "difficulty_level": ticket.difficulty_level,
            "budget_cents": ticket.budget_cents,
            "tutorial_guide": ticket.tutorial_guide,
        },
    }


@router.post("/proposals/{proposal_id}/reject")
def reject_proposal(proposal_id: int, session: SessionDep):
    proposal = session.get(FreelanceProposal, proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    proposal.status = "rejected"
    session.add(proposal)
    session.commit()
    session.refresh(proposal)
    return {"status": "rejected", "proposal_id": proposal.id}


@router.post("/demands/generate", status_code=201)
def create_simulated_demand(payload: GenerateDemandRequest, session: SessionDep):
    if payload.client_id is not None:
        persona = session.get(ClientPersona, payload.client_id)
    else:
        persona = session.exec(select(ClientPersona)).first()

    if not persona:
        raise HTTPException(status_code=404, detail="Nenhuma persona de cliente encontrada")

    ticket = generate_simulated_demand(persona, payload.template_index)
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return ticket
