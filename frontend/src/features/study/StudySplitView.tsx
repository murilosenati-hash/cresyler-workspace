import React from "react";

export const StudySplitView: React.FC = () => {
  return (
    <section className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="text-base font-semibold text-zinc-100 mb-2">Leitor de PDFs & Apostilas (Split-View)</h2>
        <p className="text-sm text-zinc-400">
          Upload processado com <code>pymupdf4llm</code> e indexado no <code>LanceDB</code>.
        </p>
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="text-base font-semibold text-zinc-100 mb-2">Assistente de Estudo Ativo (SSE Stream)</h2>
        <p className="text-sm text-zinc-400">
          Streaming em tempo real via <code>GET /api/v1/study/rag/stream</code>.
        </p>
      </div>
    </section>
  );
};
