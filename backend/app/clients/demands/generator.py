import json
from app.core.models import ClientPersona, FreelanceProposal, Ticket

LEVEL_1_PROPOSALS = [
    {
        "title": "Automação Python: Limpeza de Planilha CSV e Log de Erros",
        "difficulty_level": 1,
        "budget_cents": 18000,
        "estimated_minutes": 25,
        "sla_hours": 24,
        "stack_tags": "Python,CSV,Logging,Pathlib",
        "briefing_markdown": (
            "Precisamos de um script em Python que leia um arquivo `clientes.csv`, filtre linhas com e-mail vazio "
            "e gere um arquivo `relatorio_limpo.csv` registrando quantas linhas foram ignoradas em `execucao.log`."
        ),
        "tutorial_guide_markdown": (
            "### Guia Passo a Passo (Nível 1 - Estagiário/Júnior)\n\n"
            "1. **Crie o arquivo `limpar_csv.py`** no VS Code.\n"
            "2. **Importe os módulos nativos**: `import csv, logging` e `from pathlib import Path`.\n"
            "3. **Configure o log**: `logging.basicConfig(filename='execucao.log', level=logging.INFO)`.\n"
            "4. **Abra o CSV com `csv.DictReader`**, valide se `row.get('email')` não está vazio e salve as linhas válidas.\n"
            "5. **Teste no terminal**: `python3 limpar_csv.py` e verifique se `execucao.log` foi criado."
        ),
        "acceptance_criteria": [
            {"item": "Ler arquivo CSV usando módulo nativo csv ou pandas", "done": False},
            {"item": "Filtrar registros sem e-mail e gravar aviso no execucao.log", "done": False},
            {"item": "Exportar arquivo limpo final e testar execução", "done": False},
        ],
    },
    {
        "title": "Landing Page Responsiva de Captura de Leads (HTML + Tailwind)",
        "difficulty_level": 1,
        "budget_cents": 22000,
        "estimated_minutes": 30,
        "sla_hours": 36,
        "stack_tags": "HTML,TailwindCSS,React,Frontend",
        "briefing_markdown": (
            "Criar uma seção Hero limpa com formulário de captura (Nome, E-mail e Botão CTA) em modo dark "
            "com validação básica de campo obrigatório e feedback visual ao enviar."
        ),
        "tutorial_guide_markdown": (
            "### Guia Passo a Passo (Nível 1 - Web/Frontend)\n\n"
            "1. **Estrutura semântica**: Crie um `<section>` centralizado com `max-w-xl mx-auto p-6`.\n"
            "2. **Formulário controlado**: Use `useState` para armazenar `nome`, `email` e `enviado`.\n"
            "3. **Validação simples**: No `onSubmit`, previna o reload (`e.preventDefault()`) e exiba uma mensagem de sucesso.\n"
            "4. **Estilização**: Utilize classes utilitárias do Tailwind (`bg-zinc-900 border-zinc-800 rounded-xl`)."
        ),
        "acceptance_criteria": [
            {"item": "Criar seção Hero com título, subtítulo e formulário", "done": False},
            {"item": "Validar campos obrigatórios antes do envio", "done": False},
            {"item": "Exibir alerta de confirmação ao submeter", "done": False},
        ],
    },
    {
        "title": "Rota FastAPI de Healthcheck e Cadastro Simples de Tarefas",
        "difficulty_level": 1,
        "budget_cents": 25000,
        "estimated_minutes": 35,
        "sla_hours": 24,
        "stack_tags": "Python,FastAPI,Pydantic,REST",
        "briefing_markdown": (
            "Implementar um endpoint `POST /tarefas` e `GET /tarefas` usando FastAPI e Pydantic para validar "
            "título e prioridade da tarefa, retornando status HTTP 201 na criação."
        ),
        "tutorial_guide_markdown": (
            "### Guia Passo a Passo (Nível 1 - Backend FastAPI)\n\n"
            "1. **Defina o schema Pydantic**: `class TarefaIn(BaseModel): titulo: str; prioridade: str = 'media'`.\n"
            "2. **Crie a rota POST**: `@app.post('/tarefas', status_code=201)` adicionando o item em memória ou SQLite.\n"
            "3. **Crie a rota GET**: `@app.get('/tarefas')` retornando a lista de tarefas cadastradas.\n"
            "4. **Valide via Swagger UI** acessando `/docs` ou executando `pytest`."
        ),
        "acceptance_criteria": [
            {"item": "Criar modelo Pydantic para validação de entrada", "done": False},
            {"item": "Implementar endpoints GET e POST com status 201", "done": False},
            {"item": "Testar resposta JSON via cliente HTTP ou Pytest", "done": False},
        ],
    },
    {
        "title": "Web Scraper Básico de Cotações e Exportação JSON",
        "difficulty_level": 1,
        "budget_cents": 20000,
        "estimated_minutes": 25,
        "sla_hours": 48,
        "stack_tags": "Python,HTTPX,JSON,Automação",
        "briefing_markdown": (
            "Desenvolver um script Python que consulte uma API pública de cotações, extraia os valores do dia "
            "e salve um resumo formatado em `cotacoes_hoje.json` com carimbo de data/hora."
        ),
        "tutorial_guide_markdown": (
            "### Guia Passo a Passo (Nível 1 - Automação Python)\n\n"
            "1. **Faça a requisição HTTP**: Use `httpx.get(url, timeout=10)` ou `urllib.request`.\n"
            "2. **Trate erros de rede**: Envolva em um bloco `try/except` garantindo resiliência.\n"
            "3. **Salve o JSON**: Use `json.dump(dados, f, indent=2, ensure_ascii=False)`."
        ),
        "acceptance_criteria": [
            {"item": "Realizar requisição HTTP com timeout configurado", "done": False},
            {"item": "Extrair campos principais e adicionar timestamp", "done": False},
            {"item": "Salvar resultado em arquivo .json formatado", "done": False},
        ],
    },
]

# Alias para compatibilidade
DEMAND_TEMPLATES = LEVEL_1_PROPOSALS


def build_proposal_for_persona(persona: ClientPersona, template_index: int = 0) -> FreelanceProposal:
    tpl = LEVEL_1_PROPOSALS[template_index % len(LEVEL_1_PROPOSALS)]
    return FreelanceProposal(
        client_persona_id=persona.id or 1,
        title=f"[{persona.company}] {tpl['title']}",
        difficulty_level=tpl["difficulty_level"],
        budget_cents=tpl["budget_cents"],
        estimated_minutes=tpl["estimated_minutes"],
        sla_hours=tpl["sla_hours"],
        stack_tags=tpl["stack_tags"],
        briefing_markdown=f"**Solicitante:** {persona.name} ({persona.company})\n\n{tpl['briefing_markdown']}",
        tutorial_guide_markdown=tpl["tutorial_guide_markdown"],
        acceptance_criteria=json.dumps(tpl["acceptance_criteria"], ensure_ascii=False),
        status="pending",
    )


def generate_simulated_demand(persona: ClientPersona, template_index: int = 0) -> Ticket:
    tpl = LEVEL_1_PROPOSALS[template_index % len(LEVEL_1_PROPOSALS)]
    return Ticket(
        title=f"[{persona.company}] {tpl['title'].strip()}",
        description=f"Demanda Nível 1 solicitada por {persona.name}: {tpl['briefing_markdown']}",
        status="backlog",
        priority="medium",
        client_id=persona.id,
        difficulty_level=tpl["difficulty_level"],
        budget_cents=tpl["budget_cents"],
        tutorial_guide=tpl["tutorial_guide_markdown"],
        acceptance_criteria=json.dumps(tpl["acceptance_criteria"], ensure_ascii=False),
        stack_tags=tpl["stack_tags"],
        sla_hours=tpl["sla_hours"],
    )
