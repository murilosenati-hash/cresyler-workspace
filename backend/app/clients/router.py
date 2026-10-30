from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.clients.demands.generator import generate_simulated_demand
from app.core.database import SessionDep
from app.core.models import ClientPersona

router = APIRouter(prefix="/clients", tags=["clients"])


class PersonaCreate(BaseModel):
    name: str
    company: str
    industry: str = "SaaS"
    tone: str = "Objetivo e focado em entregas incrementais"
    criteria_strictness: str = "Médio"


class GenerateDemandRequest(BaseModel):
    client_id: Optional[int] = None
    template_index: int = 0


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
