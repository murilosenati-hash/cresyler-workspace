import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import select

from app.core.config import UPLOADS_DIR
from app.core.database import SessionDep
from app.core.models import DocumentMeta, Flashcard, QuizQuestion, StudyGoal
from app.study.rag.engine import extract_document_markdown, stream_rag_answer

router = APIRouter(prefix="/study", tags=["study"])


class FlashcardReviewRequest(BaseModel):
    rating: str  # again | hard | good | easy


class QuizSubmitRequest(BaseModel):
    document_id: Optional[int] = None
    answers: list[int]


def _generate_study_materials_from_doc(session: SessionDep, doc: DocumentMeta) -> None:
    """Gera flashcards e 3 questões de QuickQuiz baseadas no documento enviado."""
    text_body = (doc.extracted_markdown or "").strip()
    lines = [ln.strip("# *-\t") for ln in text_body.splitlines() if len(ln.strip()) > 20]
    snippet_1 = lines[0] if len(lines) > 0 else f"Conceito central abordado em {doc.title}"
    snippet_2 = lines[1] if len(lines) > 1 else f"Aplicação prática do documento {doc.title}"

    session.add_all([
        Flashcard(
            document_id=doc.id,
            front=f"[{doc.title}] Qual é o ponto-chave destacado logo no início do material?",
            back=snippet_1[:260],
        ),
        Flashcard(
            document_id=doc.id,
            front=f"[{doc.title}] Como aplicar o conteúdo de '{doc.study_track}' na prática?",
            back=snippet_2[:260],
        ),
    ])

    session.add_all([
        QuizQuestion(
            document_id=doc.id,
            question=f"De acordo com o documento '{doc.title}', qual afirmação reflete melhor seu conteúdo principal?",
            options_json=json.dumps([
                snippet_1[:120],
                "O documento recomenda desativar todos os logs e testes automatizados.",
                "O material trata exclusivamente de hardware analógico sem uso de código.",
                "Nenhuma validação de dados é necessária na entrada da aplicação.",
            ], ensure_ascii=False),
            correct_option_index=0,
            explanation=f"Trecho extraído diretamente de {doc.title}: '{snippet_1[:140]}'",
        ),
        QuizQuestion(
            document_id=doc.id,
            question=f"Qual trilha de estudo e formato estruturado foram utilizados na indexação de '{doc.title}'?",
            options_json=json.dumps([
                "Imagem bitmap sem camada de texto",
                f"Trilha '{doc.study_track}' com extração estruturada em Markdown ({doc.total_pages} pág.)",
                "Arquivo binário proprietário sem suporte a busca",
                "Planilha temporária descartada sem persistência",
            ], ensure_ascii=False),
            correct_option_index=1,
            explanation=f"O arquivo foi processado na trilha '{doc.study_track}' preservando cabeçalhos em Markdown.",
        ),
        QuizQuestion(
            document_id=doc.id,
            question=f"Sobre o segundo ponto abordado em '{doc.title}', qual é a diretriz correta?",
            options_json=json.dumps([
                "Ignorar tratamento de exceções em produção",
                "Executar scripts sem ambiente virtual ou controle de versão",
                snippet_2[:120],
                "Substituir bancos de dados por variáveis globais voláteis",
            ], ensure_ascii=False),
            correct_option_index=2,
            explanation=f"Confirmado no material base: '{snippet_2[:140]}'",
        ),
    ])
    session.commit()


@router.get("/documents")
def list_documents(session: SessionDep):
    return session.exec(select(DocumentMeta).order_by(DocumentMeta.id.desc())).all()


@router.post("/upload", status_code=201)
async def upload_document(
    session: SessionDep,
    file: UploadFile = File(...),
    study_track: str = Form(default="Arquitetura & Backend"),
):
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename or "documento.md").name
    dest_path = UPLOADS_DIR / safe_name
    content = await file.read()
    dest_path.write_bytes(content)

    extracted_md, pages = extract_document_markdown(dest_path)
    doc = DocumentMeta(
        title=safe_name,
        file_path=str(dest_path),
        study_track=study_track,
        total_pages=pages,
        extracted_markdown=extracted_md,
    )
    session.add(doc)
    session.commit()
    session.refresh(doc)

    goal = session.exec(select(StudyGoal)).first()
    if goal:
        goal.pages_read += max(1, pages)
        session.add(goal)
        session.commit()

    _generate_study_materials_from_doc(session, doc)
    session.refresh(doc)
    return doc


@router.get("/flashcards")
def list_flashcards(session: SessionDep, document_id: Optional[int] = None):
    stmt = select(Flashcard).order_by(Flashcard.id.asc())
    if document_id is not None:
        doc_cards = list(
            session.exec(stmt.where(Flashcard.document_id == document_id)).all()
        )
        if doc_cards:
            return doc_cards
    return list(session.exec(stmt).all())


@router.post("/flashcards/{card_id}/review")
def review_flashcard(card_id: int, payload: FlashcardReviewRequest, session: SessionDep):
    card = session.get(Flashcard, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard não encontrado")

    rating = payload.rating.lower()
    if rating == "again":
        card.repetitions = 0
        card.interval_days = 1
        card.ease_factor = max(1.3, round(card.ease_factor - 0.2, 2))
    elif rating == "hard":
        card.repetitions += 1
        card.interval_days = max(1, int(card.interval_days * 1.2))
        card.ease_factor = max(1.3, round(card.ease_factor - 0.15, 2))
    elif rating == "good":
        card.repetitions += 1
        card.interval_days = max(2, int(card.interval_days * card.ease_factor))
    else:  # easy
        card.repetitions += 1
        card.interval_days = max(4, int(card.interval_days * card.ease_factor * 1.3))
        card.ease_factor = round(card.ease_factor + 0.15, 2)

    card.last_rating = rating
    session.add(card)

    goal = session.exec(select(StudyGoal)).first()
    if goal:
        goal.flashcards_reviewed += 1
        session.add(goal)

    session.commit()
    session.refresh(card)
    return card


@router.get("/quiz")
def get_quick_quiz(session: SessionDep, document_id: Optional[int] = None):
    stmt = select(QuizQuestion).order_by(QuizQuestion.id.desc())
    questions = []
    if document_id is not None:
        questions = list(
            session.exec(
                select(QuizQuestion)
                .where(QuizQuestion.document_id == document_id)
                .order_by(QuizQuestion.id.asc())
            ).all()
        )
    if not questions:
        questions = list(session.exec(stmt).all())[:3]
        questions.reverse()

    return [
        {
            "id": q.id,
            "document_id": q.document_id,
            "question": q.question,
            "options": json.loads(q.options_json or "[]"),
            "correct_option_index": q.correct_option_index,
            "explanation": q.explanation,
        }
        for q in questions[:3]
    ]


@router.post("/quiz/submit")
def submit_quick_quiz(payload: QuizSubmitRequest, session: SessionDep):
    quiz_items = get_quick_quiz(session, payload.document_id)
    if not quiz_items:
        raise HTTPException(status_code=404, detail="Nenhuma questão disponível")

    correct_count = 0
    details = []
    for idx, item in enumerate(quiz_items):
        chosen = payload.answers[idx] if idx < len(payload.answers) else -1
        is_correct = chosen == item["correct_option_index"]
        if is_correct:
            correct_count += 1
        details.append({
            "question_id": item["id"],
            "chosen_index": chosen,
            "correct_option_index": item["correct_option_index"],
            "is_correct": is_correct,
            "explanation": item["explanation"],
        })

    total = len(quiz_items)
    score_pct = int(round((correct_count / total) * 100)) if total else 0
    return {
        "score": correct_count,
        "total": total,
        "score_pct": score_pct,
        "details": details,
    }


@router.get("/rag/stream")
async def rag_stream(session: SessionDep, q: str = "Resumo dos pontos principais"):
    docs = session.exec(select(DocumentMeta)).all()
    snippets = [d.extracted_markdown for d in docs if d.extracted_markdown]
    return StreamingResponse(
        stream_rag_answer(q, snippets),
        media_type="text/event-stream",
    )
