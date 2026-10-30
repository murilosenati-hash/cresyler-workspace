import json
from pathlib import Path
from typing import Annotated, Generator
from fastapi import Depends
from sqlalchemy import event
from sqlmodel import Session, SQLModel, create_engine, select

from .config import DATA_DIR, UPLOADS_DIR, LANCEDB_DIR, settings
from .models import ClientPersona, StudyGoal, Ticket

DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
LANCEDB_DIR.mkdir(parents=True, exist_ok=True)

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if settings.database_url.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]


def init_db() -> None:
    """Cria tabelas SQLModel e popula dados iniciais (personas e tickets de exemplo) se vazio."""
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        existing_persona = session.exec(select(ClientPersona)).first()
        if not existing_persona:
            personas = [
                ClientPersona(
                    name="Helena Vasconcelos",
                    company="NovaPay Fintech",
                    industry="Fintech",
                    tone="Rigorosa com segurança, idempotência e testes automatizados",
                    criteria_strictness="Rigoroso",
                ),
                ClientPersona(
                    name="Lucas Andrade",
                    company="Veloce Logística",
                    industry="Logística & E-commerce",
                    tone="Pragmático, focado em automação de planilhas/PDFs e velocidade",
                    criteria_strictness="Médio",
                ),
                ClientPersona(
                    name="Marina Costa",
                    company="Pulse HealthTech",
                    industry="Saúde Digital",
                    tone="Colaborativa, valoriza UX limpa e documentação clara",
                    criteria_strictness="Médio",
                ),
            ]
            session.add_all(personas)
            session.commit()
            for p in personas:
                session.refresh(p)

            initial_tickets = [
                Ticket(
                    title="API de Conciliação de Comprovantes PDF",
                    description="Extrair valores e datas de comprovantes em PDF e validar divergências no SQLite.",
                    status="in_progress",
                    priority="high",
                    order=1,
                    client_id=personas[0].id,
                    acceptance_criteria=json.dumps([
                        {"item": "Endpoint POST /api/v1/study/upload validando extensão PDF", "done": True},
                        {"item": "Extrair texto estruturado em Markdown", "done": True},
                        {"item": "Retornar resumo via SSE stream", "done": False},
                    ], ensure_ascii=False),
                    stack_tags="Python,FastAPI,SQLite,pymupdf4llm",
                    sla_hours=24,
                ),
                Ticket(
                    title="Automação de Alertas de SLA no Quadro Kanban",
                    description="Implementar bloqueio de transição para QA quando o checklist de aceite estiver incompleto.",
                    status="backlog",
                    priority="medium",
                    order=2,
                    client_id=personas[1].id,
                    acceptance_criteria=json.dumps([
                        {"item": "Validar todos os itens do checklist antes de mover para qa_review", "done": True},
                        {"item": "Persistir nova ordem da coluna no SQLite WAL", "done": True},
                    ], ensure_ascii=False),
                    stack_tags="FastAPI,SQLModel,React,@dnd-kit",
                    sla_hours=16,
                ),
            ]
            session.add_all(initial_tickets)
            session.add(
                StudyGoal(
                    title="Dominar Monólito Modular FastAPI + SQLModel + RAG In-Process",
                    target_pomodoros=12,
                    completed_pomodoros=3,
                    pages_read=18,
                    flashcards_reviewed=25,
                )
            )
            session.commit()
