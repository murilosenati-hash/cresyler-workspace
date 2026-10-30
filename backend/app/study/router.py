from pathlib import Path
from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import StreamingResponse
from sqlmodel import select

from app.core.config import UPLOADS_DIR
from app.core.database import SessionDep
from app.core.models import DocumentMeta
from app.study.rag.engine import extract_document_markdown, stream_rag_answer

router = APIRouter(prefix="/study", tags=["study"])


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
    return doc


@router.get("/rag/stream")
async def rag_stream(session: SessionDep, q: str = "Resumo dos pontos principais"):
    docs = session.exec(select(DocumentMeta)).all()
    snippets = [d.extracted_markdown for d in docs if d.extracted_markdown]
    return StreamingResponse(
        stream_rag_answer(q, snippets),
        media_type="text/event-stream",
    )
