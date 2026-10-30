# Especificação de Requisitos Funcionais e Técnicos (SRS)

**Projeto**: Cresyler Workspace & Study Hub  
**Organização**: Cresyler Labs  
**Status**: Aprovado para Implementação (Versão 2.0 - Benchmark @scout)  

---

## 1. Escopo e Propósito

Este documento especifica os requisitos de negócio, arquitetura modular e contratos de API da plataforma **Cresyler Workspace & Study Hub**. A plataforma é estruturada como um **Monólito Modular** em FastAPI + SQLModel com persistência SQLite (WAL) e LanceDB in-process para estudo ativo.

---

## 2. Requisitos por Módulo

### Módulo 1: `core` (Infraestrutura e Sessão)
- **RF-C01 (Configuração e Banco)**: Inicialização do SQLite com WAL (`PRAGMA journal_mode=WAL`), conexão síncrona/assíncrona via SQLModel e injeção de dependência FastAPI (`SessionDep`).
- **RF-C02 (Tratamento de Exceções & Logging)**: Middleware padronizado de erro e logging estruturado.

### Módulo 2: `kanban` (Quadro Estilo Linear)
- **RF-K01 (Colunas e Transições)**: Suporte a colunas ordenáveis (`backlog`, `discovery`, `in_progress`, `qa_review`, `client_approval`, `completed`).
- **RF-K02 (Interação Fluida com @dnd-kit)**: Drag-and-drop no frontend com persistência imediata de reordenação (indexação decimal ou inteira com `order`).
- **RF-K03 (Checklist de Critérios de Aceite)**: Checklist interativo que bloqueia avanço para QA caso pendente.

### Módulo 3: `clients/demands` (Simulação de Clientes)
- **RF-CD01 (Personas de Clientes)**: Perfis configuráveis (Startups, Empresas Tradicionais, Clientes Críticos, Clientes Ágeis) com critérios de avaliação.
- **RF-CD02 (Gerador de Briefings / Demandas)**: Geração de chamados simulados com contextualização, regras de negócio e SLA.
- **RF-CD03 (Simulação de Retorno)**: Avaliação de entrega de ticket com aprovação ou feedbacks de correção.

### Módulo 4: `study/rag` (Estudo Ativo, LanceDB & SSE)
- **RF-SR01 (Extração de PDF com `pymupdf4llm`)**: Parsing de apostilas/PDFs gerando Markdown estruturado limpo com preservação de tabelas e hierarquia de tópicos.
- **RF-SR02 (Embeddings CPU via `fastembed`)**: Vetorização in-process com modelo ONNX sem necessidade de GPU.
- **RF-SR03 (Índice In-Process com `LanceDB`)**: Armazenamento e busca vetorial de chunks sem container externo em `data/lancedb/`.
- **RF-SR04 (Streaming SSE)**: Endpoint Server-Sent Events `/api/v1/study/rag/stream` para streaming de respostas e progresso de indexação em tempo real.
- **RF-SR05 (Flashcards & Revisão Espaçada)**: Geração de cartões de estudo vinculados a trechos e algoritmo SM-2.

### Módulo 5: `goals` (Metas & Portfólio)
- **RF-G01 (Metas de Estudo e Pomodoro)**: Acompanhamento de tempo de foco e cards revisados.
- **RF-G02 (Compilação de Portfólio)**: Exportação de tickets concluídos como cases de portfólio em Markdown estático com prints, badges de tecnologias e métricas de resolução.

---

## 3. Requisitos Não-Funcionais (RNF)

- **RNF-01 (In-Process Footprint)**: Backend deve rodar consumindo menos de 250MB de RAM base utilizando SQLite WAL, LanceDB e fastembed ONNX.
- **RNF-02 (Zero Docker Obrigatório para Dev)**: Setup completo possível em menos de 2 minutos apenas com Python 3.11+ e Node.js 18+.
- **RNF-03 (Fluidez de UI)**: Respostas de drag-and-drop a 60 FPS no frontend React com `@dnd-kit` e optimistic updates.
- **RNF-04 (Streaming sem Bloqueio)**: As respostas de RAG devem iniciar streaming SSE no frontend em menos de 400ms do primeiro token.

---

## 4. Matriz de Endpoints da API (FastAPI)

| Método | Rota | Módulo | Descrição |
|---|---|---|---|
| `GET` | `/api/v1/kanban/boards` | `kanban` | Obtém quadro e colunas com tickets ordenados |
| `POST` | `/api/v1/kanban/tickets` | `kanban` | Criação de ticket |
| `PATCH` | `/api/v1/kanban/tickets/{id}/move` | `kanban` | Movimentação / reordenação de coluna (@dnd-kit) |
| `GET` | `/api/v1/clients/personas` | `clients/demands` | Lista personas de clientes disponíveis |
| `POST` | `/api/v1/clients/demands/generate` | `clients/demands` | Gera nova demanda simulada |
| `POST` | `/api/v1/study/upload` | `study/rag` | Upload de PDF e extração via `pymupdf4llm` |
| `GET` | `/api/v1/study/rag/stream` | `study/rag` | SSE Stream de consulta/estudo com LanceDB |
| `GET` | `/api/v1/goals/summary` | `goals` | Resumo de métricas de estudo e tickets |
| `POST` | `/api/v1/goals/portfolio/export/{id}` | `goals` | Gera case de portfólio em Markdown |