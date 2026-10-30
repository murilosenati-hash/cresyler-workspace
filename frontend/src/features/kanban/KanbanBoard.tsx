import React, { useEffect, useState } from "react";
import {
  AcceptanceCriterion,
  apiFetch,
  ClientPersona,
  FreelanceProposalItem,
  KanbanBoardResponse,
  KanbanColumn,
  TicketItem,
} from "../../lib/api";

interface KanbanBoardProps {
  onFocusRecorded?: () => void;
}

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  medium: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  low: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
};

function formatBrl(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = () => {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [personas, setPersonas] = useState<Record<number, ClientPersona>>({});
  const [availableForWork, setAvailableForWork] = useState<boolean>(false);
  const [proposals, setProposals] = useState<FreelanceProposalItem[]>([]);
  const [showProposalsModal, setShowProposalsModal] = useState<boolean>(false);
  const [expandedTutorialId, setExpandedTutorialId] = useState<number | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [draggedTicketId, setDraggedTicketId] = useState<number | null>(null);
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newTags, setNewTags] = useState("Python,FastAPI,SQLite");

  const loadBoard = async () => {
    try {
      setErrorMsg(null);
      const [boardData, personaList, availData, proposalList] = await Promise.all([
        apiFetch<KanbanBoardResponse>("/kanban/boards"),
        apiFetch<ClientPersona[]>("/clients/personas"),
        apiFetch<{ available_for_work: boolean }>("/clients/availability"),
        apiFetch<FreelanceProposalItem[]>("/clients/proposals?status=pending"),
      ]);
      setColumns(boardData.columns);
      const map: Record<number, ClientPersona> = {};
      personaList.forEach((p) => {
        map[p.id] = p;
      });
      setPersonas(map);
      setAvailableForWork(availData.available_for_work);
      setProposals(proposalList);
    } catch (err: any) {
      setErrorMsg(err.message || "Falha ao carregar o quadro Kanban");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoard();
  }, []);

  const handleToggleAvailability = async () => {
    try {
      setErrorMsg(null);
      const nextState = !availableForWork;
      await apiFetch("/clients/availability", {
        method: "PATCH",
        body: JSON.stringify({ available_for_work: nextState }),
      });
      setAvailableForWork(nextState);
      await loadBoard();
      if (nextState) {
        setShowProposalsModal(true);
        setInfoMsg(
          "Modo Freelance Ativo! Você está Disponível para Trabalho — confira as propostas Nível 1 dos clientes."
        );
      } else {
        setInfoMsg("Modo Freelance pausado. Foque apenas nos cards atuais do seu quadro.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao alternar disponibilidade");
    }
  };

  const handleAcceptProposal = async (proposal: FreelanceProposalItem) => {
    try {
      setErrorMsg(null);
      const res = await apiFetch<{ ticket: { id: number; title: string } }>(
        `/clients/proposals/${proposal.id}/accept`,
        { method: "POST" }
      );
      setInfoMsg(
        `Proposta aceita! Card "${res.ticket.title}" adicionado ao Backlog com tutorial passo a passo.`
      );
      await loadBoard();
      setExpandedTutorialId(res.ticket.id);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao aceitar proposta");
    }
  };

  const handleRejectProposal = async (proposalId: number) => {
    try {
      setErrorMsg(null);
      await apiFetch(`/clients/proposals/${proposalId}/reject`, { method: "POST" });
      await loadBoard();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao recusar proposta");
    }
  };

  const handleGenerateMoreProposals = async () => {
    try {
      const randomTpl = Math.floor(Math.random() * 4);
      await apiFetch("/clients/proposals/generate", {
        method: "POST",
        body: JSON.stringify({ template_index: randomTpl }),
      });
      await loadBoard();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao gerar nova proposta");
    }
  };

  const handleResetZeroInbox = async () => {
    try {
      await apiFetch("/kanban/boards/reset", { method: "DELETE" });
      setInfoMsg("Quadro Kanban zerado (Zero Inbox)! Aceite uma proposta quando quiser iniciar.");
      await loadBoard();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao zerar quadro");
    }
  };

  const handleMoveTicket = async (
    ticket: TicketItem,
    targetColumnId: string,
    updatedCriteria?: AcceptanceCriterion[]
  ) => {
    try {
      setErrorMsg(null);
      setInfoMsg(null);
      await apiFetch(`/kanban/tickets/${ticket.id}/move`, {
        method: "PATCH",
        body: JSON.stringify({
          status: targetColumnId,
          order: ticket.order,
          acceptance_criteria: updatedCriteria ?? ticket.acceptance_criteria,
        }),
      });
      await loadBoard();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao mover ticket");
    }
  };

  const handleToggleCriterion = async (ticket: TicketItem, index: number) => {
    const updated = ticket.acceptance_criteria.map((c, idx) =>
      idx === index ? { ...c, done: !c.done } : c
    );
    await handleMoveTicket(ticket, ticket.status, updated);
  };

  const handleCreateCustomTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      setErrorMsg(null);
      await apiFetch("/kanban/tickets", {
        method: "POST",
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim() || "Demanda técnica criada no Workspace.",
          status: "backlog",
          priority: newPriority,
          stack_tags: newTags,
          sla_hours: 24,
          difficulty_level: 1,
          budget_cents: 15000,
          acceptance_criteria: [
            { item: "Implementar funcionalidade principal", done: false },
            { item: "Validar testes automatizados", done: false },
          ],
        }),
      });
      setNewTitle("");
      setNewDesc("");
      setShowNewModal(false);
      await loadBoard();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao criar ticket");
    }
  };

  const handleExportPortfolio = async (ticketId: number) => {
    try {
      setErrorMsg(null);
      await apiFetch(`/goals/portfolio/export/${ticketId}`, { method: "POST" });
      setInfoMsg(`Ticket #${ticketId} exportado como Case de Portfólio!`);
      await loadBoard();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao exportar portfólio");
    }
  };

  const totalTickets = columns.reduce((acc, col) => acc + col.tickets.length, 0);

  return (
    <section className="p-6">
      {/* Barra de Topo do Kanban v3: Toggle Disponível para Trabalho + Propostas de Clientes */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-base font-semibold text-zinc-100">
              Quadro Kanban & Simulador Freelance
            </h2>
            <span className="rounded-full bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-0.5 text-xs text-indigo-300">
              {totalTickets} {totalTickets === 1 ? "card ativo" : "cards ativos"}
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            O quadro inicia limpo para evitar sobrecarga visual. Ative o modo <strong>Disponível para Trabalho</strong> e escolha 1 proposta Nível 1 por vez.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Toggle Disponível para Trabalho */}
          <button
            onClick={handleToggleAvailability}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              availableForWork
                ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-200"
                : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                availableForWork ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
              }`}
            />
            {availableForWork ? "Disponível para Trabalho (ON)" : "Disponível para Trabalho (OFF)"}
          </button>

          {/* Botão de Propostas de Clientes */}
          <button
            onClick={() => setShowProposalsModal(true)}
            className="rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 px-3 py-1.5 text-xs font-semibold text-amber-200 transition flex items-center gap-1.5"
          >
            📬 Propostas de Clientes
            <span className="rounded-full bg-amber-500 text-zinc-950 px-1.5 py-0 text-[10px] font-bold">
              {proposals.length}
            </span>
          </button>

          <button
            onClick={() => setShowNewModal(!showNewModal)}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition"
          >
            + Card Manual
          </button>

          {totalTickets > 0 && (
            <button
              onClick={handleResetZeroInbox}
              className="rounded-lg bg-zinc-900 hover:bg-rose-950/60 border border-zinc-800 hover:border-rose-500/40 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-rose-200 transition"
              title="Zerar Quadro (Zero Inbox)"
            >
              🧹 Limpar
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-xs text-rose-200 flex items-center justify-between">
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white font-bold">
            ✕
          </button>
        </div>
      )}

      {infoMsg && (
        <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-4 py-2.5 text-xs text-emerald-200 flex items-center justify-between">
          <span>✅ {infoMsg}</span>
          <button onClick={() => setInfoMsg(null)} className="text-emerald-400 hover:text-white font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Estado Zero-Inbox orientativo quando o quadro está limpo */}
      {!loading && totalTickets === 0 && (
        <div className="mb-6 rounded-xl border border-dashed border-indigo-500/40 bg-indigo-950/20 p-6 text-center space-y-3">
          <div className="text-sm font-semibold text-indigo-200">
            ✨ Quadro Limpo (Zero Inbox Anti-Paralisia)
          </div>
          <p className="text-xs text-zinc-400 max-w-xl mx-auto">
            Nenhum ticket acumula sem a sua permissão. Ative o toggle <strong>Disponível para Trabalho</strong> ou clique em <strong>Propostas de Clientes</strong> para analisar demandas Nível 1 (Estagiário/Júnior) com contexto, valor e tutorial guiado.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setShowProposalsModal(true)}
              className="rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-4 py-2 text-xs transition"
            >
              📬 Ver {proposals.length} Propostas de Clientes (Nível 1)
            </button>
          </div>
        </div>
      )}

      {showNewModal && (
        <form
          onSubmit={handleCreateCustomTicket}
          className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900/90 p-4 grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          <input
            type="text"
            placeholder="Título do ticket..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="rounded bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-100 md:col-span-2"
            required
          />
          <input
            type="text"
            placeholder="Tags (ex: Python,FastAPI,SQLite)"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            className="rounded bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-100"
          />
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            className="rounded bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-100"
          >
            <option value="high">Prioridade Alta</option>
            <option value="medium">Prioridade Média</option>
            <option value="low">Prioridade Baixa</option>
          </select>
          <input
            type="text"
            placeholder="Descrição do escopo técnico..."
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="rounded bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-100 md:col-span-3"
          />
          <button
            type="submit"
            className="rounded bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white"
          >
            Salvar no Backlog
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-sm text-zinc-400 py-12 text-center">
          Carregando quadro Kanban do SQLite WAL...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {columns.map((col, colIndex) => (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedTicketId !== null) {
                  const found = columns
                    .flatMap((c) => c.tickets)
                    .find((t) => t.id === draggedTicketId);
                  if (found && found.status !== col.id) {
                    handleMoveTicket(found, col.id);
                  }
                  setDraggedTicketId(null);
                }
              }}
              className="rounded-xl border border-zinc-800/90 bg-zinc-900/50 p-3 min-h-[440px] flex flex-col"
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800/80">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  {col.title}
                </h3>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                  {col.tickets.length}
                </span>
              </div>

              <div className="flex-1 space-y-3">
                {col.tickets.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-800/70 p-4 text-center text-xs text-zinc-600">
                    Sem cards nesta etapa
                  </div>
                ) : (
                  col.tickets.map((ticket) => {
                    const persona = ticket.client_id ? personas[ticket.client_id] : null;
                    const prevCol = colIndex > 0 ? columns[colIndex - 1] : null;
                    const nextCol = colIndex < columns.length - 1 ? columns[colIndex + 1] : null;
                    const doneCount = ticket.acceptance_criteria.filter((c) => c.done).length;
                    const totalCrit = ticket.acceptance_criteria.length;
                    const isTutorialOpen = expandedTutorialId === ticket.id;

                    return (
                      <article
                        key={ticket.id}
                        draggable
                        onDragStart={() => setDraggedTicketId(ticket.id)}
                        className="rounded-lg border border-zinc-800 bg-zinc-950/90 p-3 shadow-sm hover:border-indigo-500/50 transition cursor-grab active:cursor-grabbing space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[11px] text-zinc-500">
                            #{ticket.id} • Nível {ticket.difficulty_level || 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                              {formatBrl(ticket.budget_cents || 15000)}
                            </span>
                            <span
                              className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                                PRIORITY_BADGE[ticket.priority] || PRIORITY_BADGE.medium
                              }`}
                            >
                              {ticket.priority}
                            </span>
                          </div>
                        </div>

                        <h4 className="text-xs font-semibold text-zinc-100 leading-snug">
                          {ticket.title}
                        </h4>

                        <p className="text-[11px] text-zinc-400 line-clamp-3 leading-relaxed">
                          {ticket.description}
                        </p>

                        {persona && (
                          <div className="rounded bg-zinc-900 border border-zinc-800/80 px-2 py-1 text-[11px] text-zinc-300">
                            🏢 <span className="font-medium">{persona.company}</span>
                            <span className="text-zinc-500"> • {persona.name}</span>
                          </div>
                        )}

                        {ticket.tutorial_guide && (
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedTutorialId(isTutorialOpen ? null : ticket.id)
                              }
                              className="w-full rounded bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 px-2 py-1 text-[11px] font-medium text-indigo-200 text-left flex items-center justify-between"
                            >
                              <span>📘 Tutorial Passo a Passo (Modo Professor)</span>
                              <span>{isTutorialOpen ? "▲" : "▼"}</span>
                            </button>
                            {isTutorialOpen && (
                              <div className="mt-1.5 rounded bg-zinc-900/95 border border-zinc-800 p-2.5 text-[11px] text-zinc-200 whitespace-pre-wrap leading-relaxed">
                                {ticket.tutorial_guide}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1">
                          {ticket.stack_tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400"
                            >
                              {tag}
                            </span>
                          ))}
                          <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-500">
                            ⏱ SLA {ticket.sla_hours}h
                          </span>
                        </div>

                        {totalCrit > 0 && (
                          <div className="pt-1.5 border-t border-zinc-900 space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-zinc-400">
                              <span>Critérios de Aceite</span>
                              <span>
                                {doneCount}/{totalCrit}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {ticket.acceptance_criteria.map((crit, idx) => (
                                <label
                                  key={idx}
                                  className="flex items-start gap-1.5 text-[11px] text-zinc-300 cursor-pointer hover:text-white"
                                >
                                  <input
                                    type="checkbox"
                                    checked={crit.done}
                                    onChange={() => handleToggleCriterion(ticket, idx)}
                                    className="mt-0.5 rounded border-zinc-700 bg-zinc-900 text-indigo-600"
                                  />
                                  <span className={crit.done ? "line-through text-zinc-500" : ""}>
                                    {crit.item}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-2 border-t border-zinc-900 flex items-center justify-between gap-1">
                          {prevCol ? (
                            <button
                              onClick={() => handleMoveTicket(ticket, prevCol.id)}
                              className="rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2 py-1 text-[10px] text-zinc-300"
                              title={`Voltar para ${prevCol.title}`}
                            >
                              ← {prevCol.title.split(" ")[0]}
                            </button>
                          ) : (
                            <span />
                          )}

                          {col.id === "completed" && !ticket.in_portfolio && (
                            <button
                              onClick={() => handleExportPortfolio(ticket.id)}
                              className="rounded bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 px-2 py-1 text-[10px] text-indigo-200"
                            >
                              ★ Gerar Case
                            </button>
                          )}

                          {nextCol && (
                            <button
                              onClick={() => handleMoveTicket(ticket, nextCol.id)}
                              className="rounded bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 px-2 py-1 text-[10px] text-indigo-200 ml-auto"
                              title={`Avançar para ${nextCol.title}`}
                            >
                              {nextCol.title.split(" ")[0]} →
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Propostas de Clientes Nível 1 (Estagiário / Júnior) */}
      {showProposalsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                  📬 Propostas de Clientes — Nível 1 (Estagiário / Júnior)
                </h3>
                <p className="text-xs text-zinc-400">
                  Analise o escopo, prazo e valor fictício. Ao clicar em <strong>[Aceitar]</strong>, a demanda vai para o Backlog com tutorial passo a passo.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateMoreProposals}
                  className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200"
                >
                  + Nova Proposta
                </button>
                <button
                  onClick={() => setShowProposalsModal(false)}
                  className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 text-xs text-zinc-300 font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {proposals.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <p className="text-xs text-zinc-400">
                  Nenhuma proposta pendente na fila no momento.
                </p>
                <button
                  onClick={handleGenerateMoreProposals}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white"
                >
                  Gerar Novas Propostas Nível 1
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {proposals.map((prop) => (
                  <div
                    key={prop.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                          Nível {prop.difficulty_level} • Estagiário/Jr
                        </span>
                        <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-xs font-bold text-emerald-300">
                          {prop.budget_formatted}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-zinc-100">{prop.title}</h4>

                      <div className="text-[11px] text-zinc-400">
                        🏢 <strong>{prop.company}</strong> ({prop.client_name}) • ⏱ Tempo est.:{" "}
                        <strong>{prop.estimated_minutes} min</strong> (Prazo SLA: {prop.sla_hours}h)
                      </div>

                      <div className="rounded-lg bg-zinc-900/90 border border-zinc-800 p-2.5 text-xs text-zinc-300 whitespace-pre-wrap">
                        {prop.briefing_markdown}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {prop.stack_tags.map((t) => (
                          <span
                            key={t}
                            className="rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-800/80 flex items-center gap-2">
                      <button
                        onClick={() => handleAcceptProposal(prop)}
                        className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-semibold text-white transition"
                      >
                        ✅ Aceitar (Mover p/ Backlog)
                      </button>
                      <button
                        onClick={() => handleRejectProposal(prop.id)}
                        className="rounded-lg bg-zinc-900 hover:bg-rose-950/60 border border-zinc-800 hover:border-rose-500/40 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-rose-200 transition"
                      >
                        ✕ Recusar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
