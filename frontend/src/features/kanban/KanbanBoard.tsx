import React from "react";

export const KanbanBoard: React.FC = () => {
  const columns = [
    "Backlog",
    "Discovery / Spec",
    "Em Desenvolvimento",
    "Code Review / QA",
    "Validação do Cliente",
    "Concluído / Portfólio",
  ];

  return (
    <section className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-100">Quadro de Demandas (@dnd-kit)</h2>
        <span className="text-xs text-zinc-400">Sincronizado com /api/v1/kanban/boards</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {columns.map((title) => (
          <div key={title} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 min-h-[320px]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
              {title}
            </h3>
            <div className="text-xs text-zinc-500">Arraste cards aqui</div>
          </div>
        ))}
      </div>
    </section>
  );
};
