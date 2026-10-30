import React from "react";

export const GoalsDashboard: React.FC = () => {
  return (
    <section className="p-6">
      <h2 className="text-base font-semibold text-zinc-100 mb-2">Metas de Estudo & Exportador de Portfólio</h2>
      <p className="text-sm text-zinc-400">
        Transforme tickets concluídos em Cases de Portfólio documentados em Markdown via <code>POST /api/v1/goals/portfolio/export/:id</code>.
      </p>
    </section>
  );
};
