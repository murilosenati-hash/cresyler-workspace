from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


class LocalUser(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(default="tomy", index=True)
    display_name: str = Field(default="Tomy")
    role_title: str = Field(default="Dev Jr / Estagiário • Automação & Web")
    pin: str = Field(default="1234")
    daily_goal_minutes: int = Field(default=45)
    available_for_work: bool = Field(default=False)
    created_at: datetime = Field(default_factory=utc_now)


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
    difficulty_level: int = Field(default=1)
    budget_cents: int = Field(default=15000)
    tutorial_guide: Optional[str] = Field(default=None)
    acceptance_criteria: str = Field(default="[]")  # JSON-encoded checklist
    stack_tags: str = Field(default="Python,FastAPI,SQLite")
    sla_hours: int = Field(default=24)
    in_portfolio: bool = Field(default=False)
    case_markdown: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)


class FreelanceProposal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    client_persona_id: int = Field(foreign_key="clientpersona.id")
    title: str
    difficulty_level: int = Field(default=1)  # 1: Estagiário/Júnior
    budget_cents: int = Field(default=15000)
    estimated_minutes: int = Field(default=30)
    sla_hours: int = Field(default=24)
    stack_tags: str = Field(default="Python,Automação,CSV")
    briefing_markdown: str
    tutorial_guide_markdown: str
    acceptance_criteria: str = Field(default="[]")
    status: str = Field(default="pending", index=True)  # pending, accepted, rejected
    created_at: datetime = Field(default_factory=utc_now)


class FocusSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_type: str = Field(default="study")  # study | ticket_dev
    ticket_id: Optional[int] = Field(default=None, foreign_key="ticket.id")
    duration_seconds: int = Field(default=900)  # 15 min = 900s
    completed: bool = Field(default=True)
    session_date: str = Field(default_factory=today_str, index=True)
    created_at: datetime = Field(default_factory=utc_now)


class Flashcard(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    document_id: Optional[int] = Field(default=None)
    front: str
    back: str
    interval_days: int = Field(default=1)
    ease_factor: float = Field(default=2.5)
    repetitions: int = Field(default=0)
    last_rating: Optional[str] = Field(default=None)


class QuizQuestion(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    document_id: Optional[int] = Field(default=None)
    question: str
    options_json: str
    correct_option_index: int = Field(default=0)
    explanation: str


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
