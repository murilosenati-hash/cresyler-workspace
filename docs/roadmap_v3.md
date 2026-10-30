# Especificação Funcional e Roadmap v3: Foco, Gamificação & Simulação Freelance

**Projeto**: Cresyler Workspace & Study Hub  
**Versão**: 3.0.0-draft  
**Status**: Aprovado para Implementação com Diretrizes do Tomy  
**Responsável**: Time de Arquitetura & Documentação (@scribe)  

---

## 1. Visão Geral e Justificativa da v3

Com base no feedback crítico do produto, a v3 ajusta a curva de dificuldade e foca na usabilidade real de rotina, combate à procrastinação/TDAH e simulação fiel do ecossistema de trabalho freelance para construção de portfólio.

Os cinco pilares fundamentais são:
1. **Demandas Realistas e Graduais com Tutoriais Embutidos (Nível 1 - Júnior/Estágio)**.
2. **Modo Freelance 'Disponível para Trabalho' com Inbox de Propostas (Quadro Inicial Limpo)**.
3. **Study Hub Anti-TDAH & Gamificado (Quizzes de 5 min, Sprints de 15 min com trava e Active Recall)**.
4. **Tracking de Tempo & Meta Diária Visual (30 a 60 min de foco diário)**.
5. **Autenticação & Sessão Local Enxuta**.

---

## 2. Especificação Detalhada por Pilar

### Pilar 1: Demandas Graduais & Tutoriais Passo a Passo Embutidos
- **Classificação de Nível de Dificuldade**:
  - `Nível 1 (Júnior/Estagiário)`: Scripts Python básicos, web scraping simples (BeautifulSoup), landing pages em HTML/Tailwind, automações de planilhas/CSV, bots simples de Telegram/Discord, rotas CRUD elementares.
  - `Nível 2 (Pleno Inicial)`: Integrações com APIs externas, autenticação JWT, refatorações com testes unitários.
  - `Nível 3 (Avançado)`: Otimização de queries, arquitetura distribuída e filas.
- **Guia Técnico Embutido na Tarefa (`Tab: Guia de Implementação`)**:
  - Cada ticket do Nível 1 conterá uma aba de apoio contendo: 
    - Contexto técnico e objetivo da entrega;
    - Passo a passo detalhado (*"Como começar"*, *"Estrutura recomendada de arquivos"*, *"Comandos para rodar"*);
    - Links e referências rápidas para a documentação técnica relevante;
    - Checklist de auto-revisão antes de submeter ao cliente.

### Pilar 2: Modo Freelance sob Demanda & Inbox de Propostas
- **Estado Inicial do Board (Zero Inbox)**:
  - O quadro Kanban inicia limpo (sem poluição visual ou dezenas de tickets gerados automaticamente).
- **Toggle 'Disponível para Trabalho' (Freelance Switch)**:
  - Componente de switch no topo da tela (*Status: Offline / Disponível para Propostas*).
  - Quando ativado, o sistema simula a chegada de propostas de clientes na **Caixa de Entrada / Modal de Oportunidades**.
- **Fluxo de Decisão da Proposta**:
  - Visualização de proposta com: Persona do Cliente, Descrição da Dor, Orçamento Simulado ($), Prazo Estimado (SLA) e Nível de Dificuldade.
  - Ações:
    - **[Recusar Proposta]**: Arquiva a proposta sem penalidade.
    - **[Aceitar Proposta]**: Move a demanda automaticamente para a coluna `Backlog / Discovery` do Kanban e inicia o tracking do ticket.

### Pilar 3: Study Hub Anti-TDAH & Estudo Ativo Gamificado (Síntese @scout)
- **Micro-Pomodoro de 15 min com Micro-Recompensa**:
  - Timer curto focado em vencer a barreira da inércia (15 min de sprint ininterrupto).
  - Ao concluir, desbloqueia micro-recompensa visual/gamificada (badge de foco, som sutil de conquista, incremento na barra diária e streak de consistência).
- **Modo Zen de Hiperfoco**:
  - Alternador de tela cheia que colapsa distrações: oculta sidebars, cabeçalhos secundários e notificações.
  - Trava visual temporária para blindar a atenção durante a execução do sprint.
- **FlashcardDeck (3D Flip & SM-2/Leitner em SQLite)**:
  - Interface interativa com animação CSS 3D de virada de cartão (Front: pergunta/conceito; Back: resposta direta e citação).
  - Algoritmo simplificado de repetição espaçada (SM-2 / Leitner Box) com persistência local direta no SQLite (armazenando `interval_days`, `ease_factor`, `repetitions` e `next_review_date`).
- **QuickQuiz (3 a 5 Perguntas com Distratores & Feedback Imediato)**:
  - Quiz gerado a partir do PDF indexado: 3 a 5 perguntas objetivas com distratores inteligentes.
  - Resolução rápida (<= 5 minutos) com validação instantânea, pontuação e explicação fundamentada no trecho exato do material.
- **Split-View Sincronizada com `react-resizable-panels`**:
  - Painel dividido e redimensionável horizontalmente (`react-resizable-panels`): leitor de PDF à esquerda e bloco de notas / quizzes / flashcards à direita.
  - Sistema de citação direta: clicar em uma pergunta ou anotação faz scroll automático e destaque visual da página e do parágrafo original no PDF.
- **Active Recall ('Explique com suas palavras')**:
  - Caixa reflexiva ao final de cada bloco de estudo onde o estudante sintetiza em 2 a 3 frases o que aprendeu, com validação semântica de tópicos.

### Pilar 4: Tracking de Tempo & Meta Diária Visual
- **Barra de Progresso de Foco Diário**:
  - Meta diária configurável (padrão: 30 a 60 minutos de foco real).
  - Widget circular/linear no topo: *"Tempo focado hoje: 35/45 min (77%)"*, atualizado em tempo real pelos timers de estudo ou desenvolvimento.
- **Histórico de Consistência (Streak)**:
  - Registro de dias consecutivos atingindo a meta mínima diária (heatmap estilo GitHub).

### Pilar 5: Sistema de Autenticação & Sessão Local
- **Autenticação Local Descomplicada**:
  - Suporte a perfil local (Single-User ou Multi-Perfil local com PIN/Senha simples) persistido no SQLite.
  - Gestão de sessão via cookie HTTP-only ou Bearer Token persistente sem necessidade de provedores OAuth complexos.
  - Possibilidade de troca rápida de perfil local ou modo convidado.

---

## 3. Modelo de Dados Atualizado (Módulos Afetados)

```python
# Extensões propostas no SQLModel

class FreelanceProposal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    client_persona_id: int = Field(foreign_key="clientpersona.id")
    title: str
    difficulty_level: int = Field(default=1)  # 1: Júnior, 2: Pleno, 3: Sênior
    budget_cents: int
    estimated_minutes: int
    briefing_markdown: str
    tutorial_guide_markdown: str  # Passo a passo embutido
    status: str = Field(default="pending")  # pending, accepted, rejected
    created_at: datetime = Field(default_factory=datetime.utcnow)

class FocusSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    session_type: str  # "study" | "ticket_dev"
    ticket_id: Optional[int] = Field(default=None, foreign_key="ticket.id")
    duration_seconds: int
    completed: bool = Field(default=True)
    date: date = Field(default_factory=date.today)

class QuizQuestion(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    document_id: int
    question: str
    options_json: str  # List of 4 options
    correct_option_index: int
    explanation: str
```

---

## 4. Próximos Passos para o @dev

1. **Branch / Migração**: Criar modelos de `FreelanceProposal`, `FocusSession`, `Flashcard` (com atributos SM-2) e extensão de `Ticket` com `difficulty_level` e `tutorial_guide`.
2. **Rotas Backend**: Implementar endpoints `/api/v1/clients/proposals/incoming`, `/accept`, `/reject`, `/api/v1/study/quizzes` e `/api/v1/goals/focus-sessions`.
3. **Componentes Frontend**: Implementar no React o Toggle de Freelance, Modal de Propostas, Micro-Pomodoro de 15 min com Modo Zen, FlashcardDeck (3D flip), QuickQuiz e Split-view com `react-resizable-panels`.