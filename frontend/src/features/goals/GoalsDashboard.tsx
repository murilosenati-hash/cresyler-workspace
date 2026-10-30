import React, { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

interface GoalsSummary {
  total_tickets: number;
  completed_tickets: number;
  portfolio_cases: number;
  indexed_documents: number;
  study_goals: Array<{
    id: number;
    title: string;
    target_pomodoros: number;
    completed_pomodoros: number;
    pages_read: number;
    flashcards_reviewed: number;
  }>;
}

export const GoalsDashboard: React.FC = () => {
  const [summary, setSummary] = useState<GoalsSummary | null>(null);

  useEffect(() => {
    apiFetch<GoalsSummary>("/goals/summary").then(setSummary).catch(() => {});
  }, []);

  return (
    <section className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Metas de Estudo & Portfólio Vivo</h2>
        <p className="text-xs text-zinc-400">
          Métricas em tempo real consolidadas do banco SQLite WAL.
        </p>
      </div>

      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="text-xs text-zinc-400">Total de Tickets</div>
              <div className="text-2xl font-bold text-zinc-100 mt-1">{summary.total_tickets}</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="text-xs text-zinc-400">Tickets Concluídos</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{summary.completed_tickets}</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="text-xs text-zinc-400">Cases no Portfólio</div>
              <div className="text-2xl font-bold text-indigo-400 mt-1">{summary.portfolio_cases}</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="text-xs text-zinc-400">Documentos Indexados</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">{summary.indexed_documents}</div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-200">Metas Ativas</h3>
            {summary.study_goals.map((g) => (
              <div key={g.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-zinc-100">{g.title}</div>
                  <div className="text-xs text-zinc-400 mt-1">
                    🍅 Pomodoros: {g.completed_pomodoros}/{g.target_pomodoros} • 📖 Páginas lidas: {g.pages_read} • 🧠 Flashcards: {g.flashcards_reviewed}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
};
