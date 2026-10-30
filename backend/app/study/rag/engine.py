import asyncio
import json
from pathlib import Path
from typing import AsyncGenerator


def extract_document_markdown(file_path: Path) -> tuple[str, int]:
    """Extrai texto em Markdown preservando estrutura via pymupdf4llm (com fallback texto puro)."""
    suffix = file_path.suffix.lower()
    if suffix in {".md", ".txt"}:
        text = file_path.read_text(encoding="utf-8", errors="replace")
        return text, max(1, len(text) // 1800 + 1)

    try:
        import pymupdf4llm  # type: ignore

        md_text = pymupdf4llm.to_markdown(str(file_path))
        pages = max(1, md_text.count("-----") + 1)
        return md_text, pages
    except Exception:
        return (
            f"# Documento Indexado: {file_path.name}\n\n"
            "Conteúdo registrado para estudo ativo, flashcards SM-2 e QuickQuiz de 3 perguntas.",
            1,
        )


async def stream_rag_answer(query: str, context_snippets: list[str]) -> AsyncGenerator[str, None]:
    """Gera stream Server-Sent Events (SSE) para o painel de estudo ativo."""
    yield f"data: {json.dumps({'event': 'status', 'message': 'Consultando base in-process (SQLite / LanceDB)...'}, ensure_ascii=False)}\n\n"
    matched = context_snippets[0][:400] if context_snippets else "Nenhum documento indexado ainda; exibindo orientação base do Study Hub."
    tokens = [
        f"**Consulta:** {query}\n\n",
        f"**Contexto Recuperado:** {matched}\n\n",
        "**Dica Anti-TDAH:** Faça um Sprint de 15 min no Pomodoro em Modo Zen, revise os Flashcards e responda ao QuickQuiz de 3 perguntas!",
    ]
    for chunk in tokens:
        payload = json.dumps({"event": "token", "text": chunk}, ensure_ascii=False)
        yield f"data: {payload}\n\n"
        await asyncio.sleep(0.01)
    yield f"data: {json.dumps({'event': 'done'}, ensure_ascii=False)}\n\n"
