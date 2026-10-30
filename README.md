# Cresyler Workspace & Study Hub

Plataforma integrada de alta performance da **Cresyler Labs**, projetada como um **monólito modular** unificando dois fluxos essenciais de desenvolvimento e capacitação:
1. **Kanban de Tickets Simulados com Clientes (Portfólio Vivo)**: Gestão de demandas simuladas com personas de clientes, critérios de aceite, controle de SLA e geração de cases técnicos de portfólio no estilo Linear.
2. **Hub de Leitura e Estudo Ativo com RAG In-Process**: Leitor interativo de PDFs/apostilas com extração estruturada via `pymupdf4llm`, busca vetorial in-process via `LanceDB`, embeddings CPU ultraleves via `fastembed` (ONNX) e streaming via Server-Sent Events (SSE).

---

## 🎧 Arquitetura do Sistema (Monólito Modular)

```mermaid
flowchart TD
    subgraph Frontend [Frontend SPA (React + Vite)]
        UI[React 18 + Vite + Tailwind CSS + shadcn/ui]
        KanbanDND[@dnd-kit Kanban Board - Linear style]
        PDFViewer[PDF.js Split-View Canvas]
        SSEClient[EventSource / SSE Streaming Client]
    end

    subgraph Backend [Backend Monólito Modular (FastAPI - Python 3.11+)]
        API[FastAPI Router & Lifecycle]
        
        subgraph Modules [Módulos do Sistema]
            CoreMod[core/ - Config, Database Session, Base Models]
            KanbanMod[kanban/ - Boards, Columns, Ticket Transitions]
            ClientsMod[clients/demands/ - Client Personas & Demand Engine]
            StudyMod[study/rag/ - pymupdf4llm, fastembed, LanceDB]
            GoalsMod[goals/ - OKRs, Study Metrics & Portfolio Goals]
        end
        
        DB[(SQLite WAL Mode - SQLModel)]
        VectorDB[(LanceDB In-Process Vector Store)]
        DiskFiles[(Local Storage - PDFs & Exported Cases)]
    end

    UI -->|REST / JSON| API
    SSEClient -->|SSE Streams| API
    API --> Modules
    CoreMod --> DB
    KanbanMod --> DB
    ClientsMod --> DB
    GoalsMod --> DB
    StudyMod --> VectorDB
    StudyMod --> DiskFiles
```

---

## 📚 Documentação Completa

- [Documento de Arquitetura de Software (DAS)](docs/architecture.md)
- [Especificação de Requisitos Funcionais e Técnicos (SRS)](docs/functional_spec.md)

---

## 🛠️ Stack Tecnológica Definida (Benchmark @scout)

- **Backend**: Python 3.11+, **FastAPI**, **SQLModel** (Pydantic + SQLAlchemy) e **SQLite em modo WAL** (Write-Ahead Logging).
- **RAG / Estudo Ativo**:
  - **LanceDB**: Vector database in-process (sem necessidade de container externo, alta performance colunar).
  - **pymupdf4llm**: Extração estruturada de PDFs em Markdown com suporte a tabelas e cabeçalhos.
  - **fastembed**: Geração de embeddings otimizada para CPU via runtime ONNX (`BAAI/bge-small-en-v1.5` ou multilíngue).
  - **Streaming SSE**: Respostas de RAG, chat e status de processamento transmitidos em tempo real via Server-Sent Events.
- **Frontend**: **React** (TypeScript) + **Vite**, **Tailwind CSS**, **shadcn/ui** e **@dnd-kit** (para drag-and-drop fluido estilo Linear).
- **Arquitetura**: Monólito modular com baixo acoplamento e alta coesão.

---

## 🚀 Estrutura do Repositório

```text
.
├── backend/
│   ├── app/
│   │   ├── main.py                 # Ponto de entrada FastAPI
│   │   ├── core/                   # Configurações, db engine (SQLite WAL), security
│   │   ├── kanban/                 # Regras de negócio, models e endpoints de Kanban
│   │   ├── clients/                # Personas de clientes e gerador de demandas
│   │   │   └── demands/            # Templates e lógicas de simulação
│   │   ├── study/                  # Ingestão de PDFs e serviços de estudo
│   │   │   └── rag/                # LanceDB, pymupdf4llm, fastembed e streaming SSE
│   │   └── goals/                  # Metas de estudo, pontuação e exportação de portfólio
│   ├── data/                       # Arquivos SQLite e LanceDB locais
│   ├── pyproject.toml              # Dependências Poetry / UV
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/             # shadcn/ui e componentes compartilhados
│   │   ├── features/
│   │   │   ├── kanban/             # Board @dnd-kit estilo Linear
│   │   │   ├── clients/            # Visualização e gestão de clientes
│   │   │   ├── study/              # Leitor split-view de PDFs e notas
│   │   │   └── goals/              # Dashboard de metas e cases
│   │   ├── lib/                    # Utilitários e SSE client
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── docs/
│   ├── architecture.md             # Documentação de arquitetura detalhada
│   └── functional_spec.md          # Especificação de requisitos
└── README.md
```

---

## 🔧 Guia de Configuração e Execução

### 1. Backend (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (React + Vite)
```bash
cd frontend
pnpm install
pnpm run dev
```

---

© 2026 Cresyler Labs. Todos os direitos reservados.