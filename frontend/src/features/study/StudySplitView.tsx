import React, { useEffect, useState } from "react";
import {
  API_BASE_URL,
  apiFetch,
  FlashcardItem,
  QuizQuestionItem,
  QuizSubmitResult,
} from "../../lib/api";
import { subscribeStudyStream } from "../../lib/sse";

interface DocMeta {
  id: number;
  title: string;
  study_track: string;
  total_pages: number;
  extracted_markdown?: string;
}

interface StudySplitViewProps {
  zenMode?: boolean;
  onFocusRecorded?: () => void;
}

export const StudySplitView: React.FC<StudySplitViewProps> = ({ zenMode }) => {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocMeta | null>(null);
  const [query, setQuery] = useState("Resumo dos conceitos principais");
  const [streamedText, setStreamedText] = useState("");
  const [streaming, setStreaming] = useState(false);

  // FlashcardDeck State
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [cardIndex, setCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);

  // QuickQuiz (3 perguntas) State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionItem[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<QuizSubmitResult | null>(null);

  const loadStudyHubData = async (docId?: number) => {
    try {
      const docQuery = docId ? `?document_id=${docId}` : "";
      const [docList, cards, quiz] = await Promise.all([
        apiFetch<DocMeta[]>("/study/documents"),
        apiFetch<FlashcardItem[]>(`/study/flashcards${docQuery}`),
        apiFetch<QuizQuestionItem[]>(`/study/quiz${docQuery}`),
      ]);
      setDocs(docList);
      if (docList.length > 0 && !selectedDoc) {
        setSelectedDoc(docList[0]);
      }
      setFlashcards(cards);
      setCardIndex(0);
      setIsFlipped(false);
      setQuizQuestions(quiz);
      setSelectedAnswers({});
      setQuizResult(null);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadStudyHubData();
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
      setSelectedDoc(created);
      await loadStudyHubData(created.id);
    }
  };

  const handleSelectDoc = async (doc: DocMeta) => {
    setSelectedDoc(doc);
    await loadStudyHubData(doc.id);
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

  const handleRateFlashcard = async (rating: "again" | "hard" | "good" | "easy") => {
    const current = flashcards[cardIndex];
    if (!current) return;
    try {
      const updated = await apiFetch<FlashcardItem>(`/study/flashcards/${current.id}/review`, {
        method: "POST",
        body: JSON.stringify({ rating }),
      });
      setReviewFeedback(
        `Card avaliado como '${rating.toUpperCase()}' • Próxima revisão em ${updated.interval_days} dia(s)`
      );
      setIsFlipped(false);
      setCardIndex((prev) => (prev + 1) % flashcards.length);
    } catch {
      // ignore
    }
  };

  const handleSubmitQuiz = async () => {
    const answersArray = quizQuestions.map((_, idx) =>
      selectedAnswers[idx] !== undefined ? selectedAnswers[idx] : -1
    );
    try {
      const res = await apiFetch<QuizSubmitResult>("/study/quiz/submit", {
        method: "POST",
        body: JSON.stringify({
          document_id: selectedDoc?.id ?? null,
          answers: answersArray,
        }),
      });
      setQuizResult(res);
    } catch {
      // ignore
    }
  };

  const currentCard = flashcards[cardIndex] || null;

  return (
    <section className="p-6 space-y-6">
      {/* Linha 1: FlashcardDeck Interativo + QuickQuiz de 3 Perguntas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FlashcardDeck Interativo (Frente/Verso + Avaliação) */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                🧠 FlashcardDeck Interativo (Active Recall)
              </h2>
              <p className="text-xs text-zinc-400">
                Clique no card para virar (Frente/Verso) e avalie sua retenção.
              </p>
            </div>
            <span className="rounded-full bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-0.5 text-xs text-indigo-300">
              {flashcards.length > 0 ? `${cardIndex + 1} / ${flashcards.length}` : "0 cards"}
            </span>
          </div>

          {currentCard ? (
            <>
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={`cursor-pointer rounded-xl border p-6 min-h-[170px] flex flex-col justify-center items-center text-center transition select-none ${
                  isFlipped
                    ? "border-emerald-500/50 bg-emerald-950/25 text-emerald-100"
                    : "border-indigo-500/40 bg-zinc-950 hover:border-indigo-400 text-zinc-100"
                }`}
              >
                <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-2">
                  {isFlipped ? "Verso (Resposta)" : "Frente (Pergunta — Clique para virar)"}
                </span>
                <p className="text-sm font-medium leading-relaxed">
                  {isFlipped ? currentCard.back : currentCard.front}
                </p>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => handleRateFlashcard("again")}
                    className="rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 py-2 text-xs font-semibold text-rose-200 transition"
                  >
                    1. Errei (1d)
                  </button>
                  <button
                    onClick={() => handleRateFlashcard("hard")}
                    className="rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 py-2 text-xs font-semibold text-amber-200 transition"
                  >
                    2. Difícil
                  </button>
                  <button
                    onClick={() => handleRateFlashcard("good")}
                    className="rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 py-2 text-xs font-semibold text-indigo-200 transition"
                  >
                    3. Bom
                  </button>
                  <button
                    onClick={() => handleRateFlashcard("easy")}
                    className="rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 py-2 text-xs font-semibold text-emerald-200 transition"
                  >
                    4. Fácil
                  </button>
                </div>
                {reviewFeedback && (
                  <div className="text-[11px] text-emerald-300 text-center">
                    ✅ {reviewFeedback}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-zinc-500 py-10 text-center">
              Nenhum flashcard disponível.
            </div>
          )}
        </div>

        {/* QuickQuiz Rápido de 3 Perguntas */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">
                ⚡ QuickQuiz Rápido (3 Perguntas)
              </h2>
              <p className="text-xs text-zinc-400">
                Validação imediata baseada nos seus PDFs/documentos de estudo.
              </p>
            </div>
            {quizResult && (
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/50 px-3 py-1 text-xs font-bold text-emerald-300">
                Pontuação: {quizResult.score}/{quizResult.total} ({quizResult.score_pct}%)
              </span>
            )}
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {quizQuestions.map((q, qIdx) => {
              const detail = quizResult?.details[qIdx];
              return (
                <div
                  key={q.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 space-y-2"
                >
                  <div className="text-xs font-semibold text-zinc-100">
                    {qIdx + 1}. {q.question}
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {q.options.map((opt, oIdx) => {
                      const isSelected = selectedAnswers[qIdx] === oIdx;
                      return (
                        <label
                          key={oIdx}
                          className={`flex items-center gap-2 rounded border px-2.5 py-1.5 text-xs cursor-pointer transition ${
                            isSelected
                              ? "border-indigo-500 bg-indigo-500/20 text-indigo-100"
                              : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-900"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`quiz-q-${q.id}`}
                            checked={isSelected}
                            onChange={() =>
                              setSelectedAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))
                            }
                            className="text-indigo-600"
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                  {detail && (
                    <div
                      className={`rounded px-2.5 py-1.5 text-[11px] ${
                        detail.is_correct
                          ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-950/60 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {detail.is_correct ? "✅ Correto! " : "❌ Incorreto. "}
                      {detail.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => {
                setSelectedAnswers({});
                setQuizResult(null);
              }}
              className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-xs text-zinc-300"
            >
              Reiniciar Quiz
            </button>
            <button
              onClick={handleSubmitQuiz}
              className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white"
            >
              Conferir Pontuação Agora
            </button>
          </div>
        </div>
      </div>

      {/* Linha 2: Leitor de PDF/Markdown + Assistente RAG SSE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">
                Leitor de PDFs & Apostilas (Gera Flashcards + Quiz)
              </h2>
              <p className="text-xs text-zinc-400">
                Ao enviar um PDF ou Markdown, novos Flashcards e QuickQuiz são criados automaticamente.
              </p>
            </div>
            <label className="cursor-pointer rounded-md bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white">
              📤 Upload PDF / MD
              <input
                type="file"
                accept=".pdf,.md,.txt"
                onChange={handleUpload}
                className="hidden"
              />
            </label>
          </div>

          {docs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {docs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => handleSelectDoc(d)}
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

          <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-4 min-h-[240px] max-h-[360px] overflow-y-auto text-xs text-zinc-300 whitespace-pre-wrap font-mono">
            {selectedDoc
              ? selectedDoc.extracted_markdown
              : "Nenhum documento enviado ainda. Faça upload de um PDF ou arquivo Markdown para gerar flashcards e questões personalizadas."}
          </div>
        </div>

        {!zenMode && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">
                Assistente de Estudo Ativo (SSE Stream)
              </h2>
              <p className="text-xs text-zinc-400">
                Consulta em tempo real via Server-Sent Events (/api/v1/study/rag/stream)
              </p>
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
            <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-4 min-h-[240px] text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed">
              {streamedText ||
                "Clique em 'Consultar SSE' para testar o streaming de estudo ativo em tempo real."}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
