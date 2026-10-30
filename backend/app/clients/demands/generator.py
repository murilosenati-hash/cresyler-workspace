import json
from app.core.models import ClientPersona, Ticket

DEMAND_TEMPLATES = [
    {
        "title": "Pipeline de Automação de Relatórios Financeiros",
        "description": "Cliente solicita script/endpoint para consolidar CSVs e PDFs de faturamento mensal com log de auditoria.",
        "priority": "high",
        "sla_hours": 18,
        "stack_tags": "Python,FastAPI,SQLite,Automacao",
        "acceptance_criteria": [
            {"item": "Validar colunas obrigatórias do relatório de entrada", "done": False},
            {"item": "Persistir histórico de execução no banco SQLite", "done": False},
            {"item": "Exportar resumo consolidado em Markdown/JSON", "done": False},
        ],
    },
    {
        "title": " Indexador Semântico de Manuais Operacionais (RAG)",
        "description": "Converter apostilas técnicas em chunks pesquisáveis para responder dúvidas da equipe de operações em tempo real.",
        "priority": "medium",
        "sla_hours": 24,
        "stack_tags": "FastAPI,pymupdf4llm,LanceDB,SSE",
        "acceptance_criteria": [
            {"item": "Extrair seções preservando cabeçalhos Markdown", "done": False},
            {"item": "Disponibilizar consulta via Server-Sent Events (SSE)", "done": False},
        ],
    },
]


def generate_simulated_demand(persona: ClientPersona, template_index: int = 0) -> Ticket:
    tpl = DEMAND_TEMPLATES[template_index % len(DEMAND_TEMPLATES)]
    return Ticket(
        title=f"[{persona.company}] {tpl['title'].strip()}",
        description=f"Demanda solicitada por {persona.name} ({persona.tone}): {tpl['description']}",
        status="backlog",
        priority=tpl["priority"],
        client_id=persona.id,
        acceptance_criteria=json.dumps(tpl["acceptance_criteria"], ensure_ascii=False),
        stack_tags=tpl["stack_tags"],
        sla_hours=tpl["sla_hours"],
    )
