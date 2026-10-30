import React, { useEffect, useState } from "react";
import { apiFetch, DailyFocusSummary, LocalUserProfile } from "../lib/api";

interface HeaderProps {
  activeTab: "kanban" | "clients" | "study" | "goals";
  onSelectTab: (tab: "kanban" | "clients" | "study" | "goals") => void;
  zenMode: boolean;
  onToggleZenMode: () => void;
  dailyFocus: DailyFocusSummary | null;
  onRefreshFocus: () => void;
  profile: LocalUserProfile | null;
  onOpenLoginModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  zenMode,
  onToggleZenMode,
  dailyFocus,
  onRefreshFocus,
  profile,
  onOpenLoginModal,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(15 * 60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [sprintToast, setSprintToast] = useState<string | null>(null);

  const tabs = [
    { id: "kanban", label: "Kanban Freelance" },
    { id: "study", label: "Study Hub Anti-TDAH" },
    { id: "clients", label: "Clientes & Briefings" },
    { id: "goals", label: "Metas & Portfólio" },
  ] as const;

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          handleCompleteSprint(900);
          return 15 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const handleCompleteSprint = async (durationSecs = 900) => {
    try {
      await apiFetch("/goals/focus-sessions", {
        method: "POST",
        body: JSON.stringify({
          session_type: activeTab === "study" ? "study" : "ticket_dev",
          duration_seconds: durationSecs,
          completed: true,
        }),
      });
      setSecondsLeft(15 * 60);
      setTimerRunning(false);
      onRefreshFocus();
      setSprintToast("+15 min registrados na Meta Diária! 🔥");
      setTimeout(() => setSprintToast(null), 4000);
    } catch {
      // ignore
    }
  };

  const handleChangeGoalTarget = async (minutes: number) => {
    try {
      await apiFetch("/goals/daily-focus/target", {
        method: "PATCH",
        body: JSON.stringify({ daily_goal_minutes: minutes }),
      });
      onRefreshFocus();
    } catch {
      // ignore
    }
  };

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");

  const focusedMins = dailyFocus?.focused_minutes_today ?? 0;
  const targetMins = dailyFocus?.daily_goal_minutes ?? 45;
  const progressPct = dailyFocus?.progress_pct ?? 0;

  return (
    <header className="border-b border-zinc-800 bg-zinc-900/95 px-6 py-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-zinc-100">
                Cresyler Workspace & Study Hub
              </h1>
              <span className="rounded bg-indigo-500/20 border border-indigo-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                v3 Anti-TDAH
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Sprints de 15 min • Demandas Freelance Nível 1 • Flashcards & QuickQuiz
            </p>
          </div>
        </div>

        {/* Micro-Pomodoro 15 min + Modo Zen + Meta Diária */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Widget Pomodoro 15 min */}
          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5">
            <span className="text-xs">🍅</span>
            <div className="font-mono text-sm font-bold text-amber-300">{mins}:{secs}</div>
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                timerRunning
                  ? "bg-amber-600 text-white"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              }`}
            >
              {timerRunning ? "Pausar" : "Focar 15m"}
            </button>
            <button
              onClick={() => handleCompleteSprint(900)}
              className="rounded bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 px-2 py-0.5 text-[11px] text-emerald-300"
              title="Registrar Sprint de 15 min concluído"
            >
              ✓ +15m
            </button>
            <button
              onClick={onToggleZenMode}
              className={`rounded px-2 py-0.5 text-[11px] font-medium border transition ${
                zenMode
                  ? "bg-purple-600 border-purple-400 text-white"
                  : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white"
              }`}
              title="Ativar/Desativar Modo Zen (Hiperfoco sem distrações)"
            >
              🧘 {zenMode ? "Zen ON" : "Modo Zen"}
            </button>
          </div>

          {/* Widget de Meta Diária (30-45 min) */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 min-w-[210px]">
            <div className="flex items-center justify-between text-[11px] mb-1 gap-2">
              <span className="text-zinc-300 font-medium">
                🎯 Meta Diária: <strong className="text-emerald-400">{focusedMins}</strong>/{targetMins} min
              </span>
              <select
                value={targetMins}
                onChange={(e) => handleChangeGoalTarget(Number(e.target.value))}
                className="bg-zinc-900 border border-zinc-800 rounded px-1 py-0 text-[10px] text-zinc-300"
                title="Ajustar Meta Diária"
              >
                <option value={30}>30m</option>
                <option value={45}>45m</option>
                <option value={60}>60m</option>
              </select>
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  progressPct >= 100 ? "bg-emerald-400" : "bg-indigo-500"
                }`}
                style={{ width: `${Math.min(100, progressPct)}%` }}
              />
            </div>
          </div>

          {/* Botão de Login/Perfil Local */}
          <button
            onClick={onOpenLoginModal}
            className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 hover:border-indigo-500/50 px-3 py-1.5 text-left transition"
            title="Abrir Perfil / Login Local"
          >
            <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
              {(profile?.display_name || "T")[0].toUpperCase()}
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-100 leading-none">
                {profile?.display_name || "Tomy"}
              </div>
              <div className="text-[10px] text-zinc-400 leading-tight">
                {profile?.role_title || "Dev Jr / Estagiário"}
              </div>
            </div>
          </button>
        </div>
      </div>

      {sprintToast && (
        <div className="rounded border border-emerald-500/40 bg-emerald-950/60 px-3 py-1 text-xs text-emerald-200">
          {sprintToast}
        </div>
      )}

      {!zenMode && (
        <nav className="flex flex-wrap gap-2 pt-1 border-t border-zinc-800/70">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
};
