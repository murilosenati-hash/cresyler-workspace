import React, { useEffect, useState } from "react";
import { apiFetch, ClientPersona, TicketItem } from "../../lib/api";

export const ClientsPanel: React.FC = () => {
  const [personas, setPersonas] = useState<ClientPersona[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const loadPersonas = async () => {
    const data = await apiFetch<ClientPersona[]>("/clients/personas");
    setPersonas(data);
  };

  useEffect(() => {
    loadPersonas();
  }, []);

  const generateDemandFor = async (clientId: number, tplIdx: number) => {
    const ticket = await apiFetch<TicketItem>("/clients/demands/generate", {
      method: "POST",
      body: JSON.stringify({ client_id: clientId, template_index: tplIdx }),
    });
    setMsg(`Demanda criada no Backlog: ${ticket.title} (#${ticket.id})`);
  };

  return (
    <section className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-100">Personas de Clientes & Gerador de Briefings</h2>
        <p className="text-xs text-zinc-400">
          Gere demandas simuladas para treinar automações Python, APIs FastAPI e integração com banco SQLite.
        </p>
      </div>

      {msg && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-4 py-2.5 text-xs text-emerald-200">
          ✅ {msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {personas.map((p) => (
          <div key={p.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="rounded bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 text-[11px] text-indigo-300">
                {p.industry}
              </span>
              <span className="text-[11px] text-zinc-400">Rigor: {p.criteria_strictness}</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">{p.company}</h3>
              <p className="text-xs text-zinc-400">{p.name}</p>
            </div>
            <p className="text-xs text-zinc-300 bg-zinc-950/70 p-2.5 rounded border border-zinc-800/80">
              “{p.tone}”
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => generateDemandFor(p.id, 0)}
                className="flex-1 rounded bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1.5 text-xs font-medium text-white transition"
              >
                + Demanda Automação
              </button>
              <button
                onClick={() => generateDemandFor(p.id, 1)}
                className="flex-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition"
              >
                + Demanda RAG/PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
