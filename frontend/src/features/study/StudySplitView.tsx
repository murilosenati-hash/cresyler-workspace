import React, { useEffect, useState } from "react";
import { API_BASE_URL, apiFetch } from "../../lib/api";
import { subscribeStudyStream } from "../../lib/sse";

interface DocMeta {
  id: number;
  title: string;
  study_track: string;
  total_pages: number;
  extracted_markdown?: string;
}

export const StudySplitView: React.FC = () => {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocMeta | null>(null);
  const [query, setQuery] = useState("Resumo dos conceitos principais");
  const [streamedText, setStreamedText] = useState("");
  const [streaming, setStreaming] = useState(false);

  const loadDocs = async () => {
    const list = await apiFetch<DocMeta[]>("/study/documents");
    setDocs(list);
    if (list.length > 0 && !selectedDoc) {
      setSelectedDoc(list[0]);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("study_track", "Arquitetura & Backend");
    const res = await fetch(`${API_BASE_URL}/study/upload`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const created = (await res.json()) as DocMeta;
      await loadDocs();
      setSelectedDoc(created);
    }
  };

  const handleAskStream = () => {
    setStreamedText("");
    setStreaming(true);
    subscribeStudyStream(
      query,
      (token) => setStreamedText((prev) => prev + token),
      () => setStreaming(false)
    );
  };

  return (
    <section className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Leitor de PDFs & Apostilas (Split-View)</h2>
            <p className="text-xs text-zinc-400">Extração em Markdown estruturado via pymupdf4llm</p>
          </div>
          <label className="cursor-pointer rounded-md bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white">
            📤 Upload PDF / MD
            <input type="file" accept=".pdf,.md,.txt" onChange={handleUpload} className="hidden" />
          </label>
        </div>

        {docs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {docs.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDoc(d)}
                className={`rounded px-2.5 py-1 text-xs border ${
                  selectedDoc?.id === d.id
                    ? "bg-indigo-600/30 border-indigo-500 text-indigo-200"
                    : "bg-zinc-950 border-zinc-800 text-zinc-400"
                }`}
              >
                📄 {d.title} ({d.total_pages} pág.)
              </button>
            ))}
          </div>
        )}

        <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-4 min-h-[280px] max-h-[420px] overflow-y-auto text-xs text-zinc-300 whitespace-pre-wrap font-mono">
          {selectedDoc
            ? selectedDoc.extracted_markdown
            : "Nenhum documento enviado ainda. Faça upload de um PDF ou arquivo Markdown para extrair o conteúdo estruturado."}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">Assistente de Estudo Ativo (SSE Stream)</h2>
          <p className="text-xs text-zinc-400">Consulta em tempo real via Server-Sent Events (/api/v1/study/rag/stream)</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 rounded bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-xs text-zinc-100"
          />
          <button
            onClick={handleAskStream}
            disabled={streaming}
            className="rounded bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white"
          >
            {streaming ? "Transmitindo..." : "Consultar SSE"}
          </button>
        </div>
        <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-4 min-h-[280px] text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
          {streamedText || "Clique em 'Consultar SSE' para testar o streaming de estudo ativo em tempo real."}
        </div>
      </div>
    </section>
  );
};
