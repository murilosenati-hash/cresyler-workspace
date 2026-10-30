import React, { useEffect, useState } from "react";
import {
  AcceptanceCriterion,
  apiFetch,
  ClientPersona,
  KanbanBoardResponse,
  KanbanColumn,
  TicketItem,
} from "../../lib/api";

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  medium: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  low: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
};

export const KanbanBoard: React.FC = () => {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [personas, setPersonas] = useState<Record<number, ClientPersona>>({});
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
      const [boardData, personaList] = await Promise.all([
        apiFetch<KanbanBoardResponse>("/kanban/boards"),
        apiFetch<ClientPersona[]>("/clients/personas"),
      ]);
      setColumns(boardData.columns);
      const map: Record<number, ClientPersona> = {};
      personaList.forEach((p) => {
        map[p.id] = p;
      });
      setPersonas(map);
    } catch (err: any) {
      setErrorMsg(err.message || "Falha ao carregar o quadro Kanban");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoard();
  }, []);

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

  const handleGenerateSimulatedDemand = async () => {
    try {
      setErrorMsg(null);
      const randomTpl = Math.floor(Math.random() * 2);
      const created = await apiFetch<TicketItem>("/clients/demands/generate", {
        method: "POST",
        body: JSON.stringify({ template_index: randomTpl }),
      });
      setInfoMsg(`Nova demanda gerada: ${created.title}`);
      await loadBoard();
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao gerar demanda");
    }
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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            Quadro de Demandas (Linear Style)
            <span className="rounded-full bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-0.5 text-xs text-indigo-300">
              {totalTickets} tickets ativos
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Arraste os cards entre colunas ou use os botões de avanço. O checklist de aceite valida a entrada em QA (RF-K03).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateSimulatedDemand}
            className="rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 transition"
          >
            ⚡ Simular Demanda de Cliente
          </button>
          <button
            onClick={() => setShowNewModal(!showNewModal)}
            className="rounded-md bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition"
          >
            + Novo Ticket
          </button>
          <button
            onClick={loadBoard}
            className="rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-400"
            title="Recarregar Quadro"
          >
            ↻
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-xs text-rose-200 flex items-center justify-between">
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white font-bold">✕</button>
        </div>
      )}

      {infoMsg && (
        <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-4 py-2.5 text-xs text-emerald-200 flex items-center justify-between">
          <span>✅ {infoMsg}</span>
          <button onClick={() => setInfoMsg(null)} className="text-emerald-400 hover:text-white font-bold">✕</button>
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
        <div className="text-sm text-zinc-400 py-12 text-center">Carregando quadro Kanban do SQLite WAL...</div>
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
              className="rounded-xl border border-zinc-800/90 bg-zinc-900/50 p-3 min-h-[480px] flex flex-col"
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
                    Sem tickets nesta etapa
                  </div>
                ) : (
                  col.tickets.map((ticket) => {
                    const persona = ticket.client_id ? personas[ticket.client_id] : null;
                    const prevCol = colIndex > 0 ? columns[colIndex - 1] : null;
                    const nextCol = colIndex < columns.length - 1 ? columns[colIndex + 1] : null;
                    const doneCount = ticket.acceptance_criteria.filter((c) => c.done).length;
                    const totalCrit = ticket.acceptance_criteria.length;

                    return (
                      <article
                        key={ticket.id}
                        draggable
                        onDragStart={() => setDraggedTicketId(ticket.id)}
                        className="rounded-lg border border-zinc-800 bg-zinc-950/90 p-3 shadow-sm hover:border-indigo-500/50 transition cursor-grab active:cursor-grabbing space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[11px] text-zinc-500">#{ticket.id}</span>
                          <div className="flex items-center gap-1.5">
                            {ticket.in_portfolio && (
                              <span className="rounded bg-indigo-500/20 border border-indigo-500/40 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300">
                                ★ Portfólio
                              </span>
                            )}
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
    </section>
  );
};
