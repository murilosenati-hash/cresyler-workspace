# Documento de Arquitetura de Software (DAS)

**Projeto**: Cresyler Workspace & Study Hub  
**Organização**: Cresyler Labs  
**Autor**: Time de Engenharia & Arquitetura  
**Versão**: 2.0.0 (Atualizado com Benchmark Técnico)  

---

## 1. Visão Geral e Princípios Arquiteturais

O **Cresyler Workspace & Study Hub** adota o padrão de **Monólito Modular** de alta performance e baixa complexidade operacional. Toda a arquitetura foi desenhada para rodar de forma leve em ambiente local ou servidor enxuto, sem dependência de containers pesados ou múltiplos daemons externos.

### Decisões Fundamentais (ADR Summary)
1. **Monólito Modular**: Divisão interna estrita em 5 domínios (`core`, `kanban`, `clients/demands`, `study/rag`, `goals`), permitindo fácil manutenção, evolução independente de módulos e compartilhamento direto de tipos e sessão.
2. **SQLite em Modo WAL + SQLModel**: Concorrência leitor/escritor otimizada com zero-config de banco, tipagem unificada com Pydantic e SQLAlchemy via SQLModel.
3. **LanceDB In-Process + fastembed (ONNX)**: Armazenamento vetorial colunar sem necessidade de servidor pgvector ou qdrant. Embeddings processados diretamente em CPU via ONNX Runtime com `fastembed`, reduzindo overhead de memória e latência.
4. **pymupdf4llm**: Extração nativa de PDFs diretamente para Markdown estruturado (preservando títulos, listas e tabelas), otimizando a qualidade do chunking.
5. **Streaming Server-Sent Events (SSE)**: Feedback em tempo real durante processamento de documentos e respostas do assistente de estudo.
6. **React + Vite + @dnd-kit**: Frontend SPA ultra-rápido com experiência de quadro Kanban inspirada no Linear.

---

## 2. Visão de Sistema e Componentes

```mermaid
flowchart TB
    subgraph FrontendApp [Frontend SPA - React + Vite]
        UI[Tailwind CSS + shadcn/ui Views]
        LinearBoard[@dnd-kit Drag-and-Drop Kanban Board]
        DocViewer[PDF.js Canvas & Split-View Markdown Notes]
        SSEStreamer[SSE EventSource Subscriber]
    end

    subgraph BackendApp [Backend Modular Monolith - FastAPI (Python 3.11+)]
        Router[FastAPI Application Router]
        
        subgraph ModCore [core/]
            Config[App Settings & Env]
            DBEngine[SQLModel Engine / SQLite WAL Session]
        end
        
        subgraph ModKanban [kanban/]
            BoardService[Kanban Board & Column Manager]
            TicketService[Ticket State Machine & Checklist]
        end
        
        subgraph ModClients [clients/demands/]
            PersonaEngine[Client Persona Registry]
            DemandGenerator[Simulated Demand & SLA Engine]
        end
        
        subgraph ModStudy [study/rag/]
            PDFParser[pymupdf4llm Markdown Extractor]
            EmbeddingEngine[fastembed ONNX CPU Embedder]
            RAGPipeline[LanceDB Vector Search & Query Expander]
            SSEService[Streaming Event Producer]
        end
        
        subgraph ModGoals [goals/]
            PortfolioEngine[Portfolio Case Builder & Metrics]
            StudyGoals[Study Track & Streak Evaluator]
        end
    end

    subgraph LocalStorage [Camada de Persistência Local]
        SQLiteFile[(data/cresyler.db - SQLite WAL)]
        LanceDBDir[(data/lancedb/ - Vector Store)]
        PDFStore[(data/uploads/ - Original PDFs)]
    end

    UI -->|REST / JSON| Router
    LinearBoard -->|REST / JSON| Router
    SSEStreamer -->|SSE Streams /stream/study| SSEService
    
    Router --> ModKanban
    Router --> ModClients
    Router --> ModStudy
    Router --> ModGoals
    
    ModCore --> SQLiteFile
    ModKanban --> DBEngine
    ModClients --> DBEngine
    ModGoals --> DBEngine
    
    ModStudy --> PDFParser
    PDFParser --> EmbeddingEngine
    EmbeddingEngine --> LanceDBDir
    ModStudy --> PDFStore
```

---

## 3. Estrutura e Responsabilidades dos Módulos

### 3.1 `core`
- Gerencia a conexão com o banco SQLite (`sqlite:///data/cresyler.db`) aplicando `PRAGMA journal_mode=WAL;` e `PRAGMA synchronous=NORMAL;`.
- Fornece dependências FastAPI para injeção de sessão (`get_session`).
- Define modelos base e utilitários transversais de logging e erro.

### 3.2 `kanban`
- Implementa a gestão de colunas customizáveis e tickets.
- Suporta reordenação em tempo real com `@dnd-kit` no frontend.
- Controla o ciclo de vida: `Backlog` -> `Discovery` -> `In Progress` -> `QA/Review` -> `Client Approval` -> `Portfolio Ready`.

### 3.3 `clients/demands`
- Mantém personas pré-configuradas e customizadas (ex: fintech, e-commerce, startup).
- Gera briefings com critérios de aceite objetivos, tags de stack e regras de aprovação ou devolução.

### 3.4 `study/rag`
- **Extração com `pymupdf4llm`**: Converte PDFs diretamente em blocos Markdown semanticamente ricos.
- **Embeddings com `fastembed`**: Roda o modelo `bge-small-en-v1.5` ou `multilingual` em CPU local com latência mínima via ONNX Runtime.
- **Busca com `LanceDB`**: Tabela embutida `pdf_chunks` com busca por similaridade de cosseno.
- **Streaming SSE**: Rota `/api/v1/study/query/stream` transmitindo tokens e fontes encontradas.

### 3.5 `goals`
- Acompanhamento de metas de estudo (páginas lidas, flashcards revisados, pomodoros).
- Conversão de tickets finalizados em páginas de portfólio públicas/exportáveis em Markdown estático.

---

## 4. Esquema de Dados (SQLModel)

```python
# Modelos Principais SQLModel
class ClientPersona(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    company: str
    tone: str
    criteria_strictness: str

class Ticket(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    status: str = Field(default="backlog")
    order: int = Field(default=0)
    client_id: Optional[int] = Field(default=None, foreign_key="clientpersona.id")
    acceptance_criteria: str  # JSON-encoded checklist
    in_portfolio: bool = Field(default=False)
    case_markdown: Optional[str] = None

class DocumentMeta(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    file_path: str
    total_pages: int
    lancedb_table_name: str
```

---

## 5. Diretrizes de Desenvolvimento e Performance

- **Sem Containers Obrigatórios**: O desenvolvedor pode iniciar o projeto apenas com `uvicorn` e `vite`.
- **Zero Overhead de Memória**: O fastembed com ONNX consome menos de 200MB de RAM e não requer GPU dedicada.
- **Confiabilidade**: O modo WAL do SQLite garante que leituras concorrentes da API não sejam bloqueadas por escritas.