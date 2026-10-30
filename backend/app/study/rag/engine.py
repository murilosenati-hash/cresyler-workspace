import json
from pathlib import Path
from typing import AsyncGenerator


def extract_document_markdown(file_path: Path) -> tuple[str, int]:
    """
    Extrai conteúdo estruturado em Markdown usando pymupdf4llm quando disponível,
    ou faz fallback para leitura direta em arquivos texto/Markdown.
    """
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
            f"# Documento: {file_path.name}\n\n"
            "Arquivo registrado para indexação in-process (instale `pymupdf4llm`, `fastembed` e `lancedb` para extração vetorial completa).",
            1,
        )


async def stream_rag_answer(query: str, context_snippets: list[str]) -> AsyncGenerator[str, None]:
    """
    Produz eventos Server-Sent Events (SSE) para o cliente de estudo ativo.
    """
    yield f"data: {json.dumps({'event': 'status', 'message': 'Consultando base in-process (LanceDB / SQLite)...'}, ensure_ascii=False)}\n\n"

    matched = context_snippets[0][:400] if context_snippets else "Nenhum documento indexado ainda; exibindo orientação base do Study Hub."
    tokens = [
        f"**Consulta:** {query}\n\n",
        f"**Contexto Recuperado:** {matched}\n\n",
        "**Sugestão de Estudo Ativo:** Vincule este conceito a um Ticket do Kanban ou gere um flashcard SM-2 para revisão espaçada.",
    ]
    for chunk in tokens:
        payload = json.dumps({"event": "token", "text": chunk}, ensure_ascii=False)
        yield f"data: {payload}\n\n"

    yield f"data: {json.dumps({'event': 'done'}, ensure_ascii=False)}\n\n"
