import React from "react";

export const ClientsPanel: React.FC = () => {
  return (
    <section className="p-6">
      <h2 className="text-base font-semibold text-zinc-100 mb-2">Personas de Clientes & Gerador de Briefings</h2>
      <p className="text-sm text-zinc-400">
        Simule demandas realistas com SLA e critérios de aceite via <code>POST /api/v1/clients/demands/generate</code>.
      </p>
    </section>
  );
};
