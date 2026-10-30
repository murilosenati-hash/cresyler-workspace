from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ClientPersona(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    company: str
    industry: str = Field(default="SaaS")
    tone: str = Field(default="Objetivo e focado em SLA")
    criteria_strictness: str = Field(default="Médio")


class Ticket(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    description: str
    status: str = Field(default="backlog", index=True)
    priority: str = Field(default="medium")
    order: int = Field(default=0)
    client_id: Optional[int] = Field(default=None, foreign_key="clientpersona.id")
    acceptance_criteria: str = Field(default="[]")  # JSON-encoded checklist
    stack_tags: str = Field(default="Python,FastAPI,SQLite")
    sla_hours: int = Field(default=24)
    in_portfolio: bool = Field(default=False)
    case_markdown: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)


class DocumentMeta(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(index=True)
    file_path: str
    study_track: str = Field(default="Arquitetura & Backend")
    total_pages: int = Field(default=1)
    lancedb_table_name: str = Field(default="pdf_chunks")
    extracted_markdown: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)


class StudyGoal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    target_pomodoros: int = Field(default=10)
    completed_pomodoros: int = Field(default=0)
    pages_read: int = Field(default=0)
    flashcards_reviewed: int = Field(default=0)
