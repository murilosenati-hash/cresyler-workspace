import json
from typing import Annotated, Generator
from fastapi import Depends
from sqlalchemy import event, text
from sqlmodel import Session, SQLModel, create_engine, select

from .config import DATA_DIR, LANCEDB_DIR, UPLOADS_DIR, settings
from .models import (
    ClientPersona,
    Flashcard,
    FreelanceProposal,
    LocalUser,
    QuizQuestion,
    StudyGoal,
)

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


def _ensure_ticket_v3_columns(session: Session) -> None:
    """Garante migração leve no SQLite caso a tabela ticket já exista de versões anteriores."""
    rows = session.exec(text("PRAGMA table_info(ticket);")).all()
    existing_cols = {r[1] for r in rows}
    if "difficulty_level" not in existing_cols:
        session.exec(text("ALTER TABLE ticket ADD COLUMN difficulty_level INTEGER DEFAULT 1;"))
    if "budget_cents" not in existing_cols:
        session.exec(text("ALTER TABLE ticket ADD COLUMN budget_cents INTEGER DEFAULT 15000;"))
    if "tutorial_guide" not in existing_cols:
        session.exec(text("ALTER TABLE ticket ADD COLUMN tutorial_guide TEXT;"))
    session.commit()


def init_db() -> None:
    """Cria tabelas SQLModel e popula personas, usuário local, propostas Nível 1 e flashcards iniciais.
    O quadro Kanban inicia LIMPO/ZERADO por padrão (v3 Zero Inbox)."""
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        _ensure_ticket_v3_columns(session)

        user = session.exec(select(LocalUser)).first()
        if not user:
            session.add(
                LocalUser(
                    username="tomy",
                    display_name="Tomy",
                    role_title="Dev Jr / Estagiário • Automação & Web",
                    pin="1234",
                    daily_goal_minutes=45,
                    available_for_work=False,
                )
            )
            session.commit()

        personas = list(session.exec(select(ClientPersona)).all())
        if not personas:
            personas = [
                ClientPersona(
                    name="Helena Vasconcelos",
                    company="NovaPay Fintech",
                    industry="Fintech",
                    tone="Didática, valoriza logs claros e scripts Python bem estruturados",
                    criteria_strictness="Médio",
                ),
                ClientPersona(
                    name="Lucas Andrade",
                    company="Veloce Logística",
                    industry="Logística & E-commerce",
                    tone="Pragmático, focado em automação de planilhas CSV e ganho de tempo",
                    criteria_strictness="Baixo (Nível 1)",
                ),
                ClientPersona(
                    name="Marina Costa",
                    company="Pulse HealthTech",
                    industry="Saúde Digital",
                    tone="Colaborativa, valoriza interfaces web limpas e rotas FastAPI simples",
                    criteria_strictness="Baixo (Nível 1)",
                ),
            ]
            session.add_all(personas)
            session.commit()
            for p in personas:
                session.refresh(p)

        existing_proposals = session.exec(select(FreelanceProposal)).first()
        if not existing_proposals and personas:
            from app.clients.demands.generator import build_proposal_for_persona

            for idx in range(4):
                persona = personas[idx % len(personas)]
                session.add(build_proposal_for_persona(persona, idx))
            session.commit()

        existing_cards = session.exec(select(Flashcard)).first()
        if not existing_cards:
            session.add_all([
                Flashcard(
                    front="Qual comando SQLite ativa o modo de alta concorrência para leitura e escrita simultânea?",
                    back="PRAGMA journal_mode=WAL; (Write-Ahead Logging), combinado com PRAGMA synchronous=NORMAL;.",
                ),
                Flashcard(
                    front="Como ler um arquivo de forma segura em Python garantindo o fechamento automático do recurso?",
                    back="Usando o gerenciador de contexto `with Path('dados.txt').open('r', encoding='utf-8') as f:`.",
                ),
                Flashcard(
                    front="Qual protocolo HTTP unidirecional é ideal para transmitir respostas de IA token a token no FastAPI?",
                    back="Server-Sent Events (SSE) via `StreamingResponse(..., media_type='text/event-stream')`.",
                ),
                Flashcard(
                    front="O que a regra RF-K03 valida antes de mover um card para Code Review / QA no Kanban?",
                    back="Verifica se todos os itens do `acceptance_criteria` estão marcados como `done: true`.",
                ),
            ])
            session.commit()

        existing_quiz = session.exec(select(QuizQuestion)).first()
        if not existing_quiz:
            session.add_all([
                QuizQuestion(
                    question="Em Python, qual biblioteca padrão é recomendada para registrar eventos e erros em arquivo com níveis INFO/ERROR?",
                    options_json=json.dumps(["print()", "logging", "sys.stdout", "traceback_only"], ensure_ascii=False),
                    correct_option_index=1,
                    explanation="O módulo `logging` permite configurar `basicConfig(filename='execucao.log', level=logging.INFO)` com timestamps padronizados.",
                ),
                QuizQuestion(
                    question="No FastAPI, qual status HTTP padrão indica que um novo recurso (ex: Ticket ou Tarefa) foi criado com sucesso em um POST?",
                    options_json=json.dumps(["200 OK", "201 Created", "204 No Content", "422 Unprocessable Entity"], ensure_ascii=False),
                    correct_option_index=1,
                    explanation="O código 201 Created confirma semântica RESTful de criação de recurso.",
                ),
                QuizQuestion(
                    question="Por que utilizamos Sprints curtos de 15 minutos (Micro-Pomodoro) no Study Hub Anti-TDAH?",
                    options_json=json.dumps([
                        "Para forçar 8 horas seguidas sem pausa",
                        "Para reduzir a barreira de ativação, evitar paralisia por análise e gerar vitórias rápidas",
                        "Porque o banco SQLite desconecta após 15 minutos",
                        "Para substituir completamente os testes automatizados",
                    ], ensure_ascii=False),
                    correct_option_index=1,
                    explanation="Blocos de 15 minutos eliminam a fricção de começar e mantêm o hiperfoco com recompensa imediata.",
                ),
            ])
            session.commit()

        existing_goal = session.exec(select(StudyGoal)).first()
        if not existing_goal:
            session.add(
                StudyGoal(
                    title="Dominar Automação Python, FastAPI & Conquistar Estágio/Freelas",
                    target_pomodoros=12,
                    completed_pomodoros=0,
                    pages_read=0,
                    flashcards_reviewed=0,
                )
            )
            session.commit()
