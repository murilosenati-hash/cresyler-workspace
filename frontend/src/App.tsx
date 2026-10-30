import React, { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { KanbanBoard } from "./features/kanban/KanbanBoard";
import { ClientsPanel } from "./features/clients/ClientsPanel";
import { StudySplitView } from "./features/study/StudySplitView";
import { GoalsDashboard } from "./features/goals/GoalsDashboard";
import { apiFetch, DailyFocusSummary, LocalUserProfile } from "./lib/api";

export function App() {
  const [activeTab, setActiveTab] = useState<"kanban" | "clients" | "study" | "goals">("kanban");
  const [zenMode, setZenMode] = useState<boolean>(false);
  const [dailyFocus, setDailyFocus] = useState<DailyFocusSummary | null>(null);
  const [profile, setProfile] = useState<LocalUserProfile | null>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  const [loginName, setLoginName] = useState("Tomy");
  const [loginUser, setLoginUser] = useState("tomy");
  const [loginRole, setLoginRole] = useState("Dev Jr / Estagiário • Automação & Web");
  const [loginPin, setLoginPin] = useState("1234");
  const [loginGoal, setLoginGoal] = useState(45);

  const loadTopBarData = async () => {
    try {
      const [focusData, profileData] = await Promise.all([
        apiFetch<DailyFocusSummary>("/goals/daily-focus"),
        apiFetch<LocalUserProfile>("/goals/profile"),
      ]);
      setDailyFocus(focusData);
      setProfile(profileData);
      setLoginName(profileData.display_name);
      setLoginUser(profileData.username);
      setLoginRole(profileData.role_title);
      setLoginGoal(profileData.daily_goal_minutes);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadTopBarData();
  }, []);

  const handleSaveProfileLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await apiFetch<LocalUserProfile>("/goals/profile/login", {
        method: "POST",
        body: JSON.stringify({
          username: loginUser,
          display_name: loginName,
          role_title: loginRole,
          pin: loginPin,
          daily_goal_minutes: loginGoal,
        }),
      });
      setProfile(updated);
      localStorage.setItem("cresyler_local_user", JSON.stringify(updated));
      setShowLoginModal(false);
      loadTopBarData();
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        zenMode={zenMode}
        onToggleZenMode={() => setZenMode(!zenMode)}
        dailyFocus={dailyFocus}
        onRefreshFocus={loadTopBarData}
        profile={profile}
        onOpenLoginModal={() => setShowLoginModal(true)}
      />

      {zenMode && (
        <div className="bg-purple-950/60 border-b border-purple-500/30 px-6 py-2 flex items-center justify-between text-xs text-purple-200">
          <span>
            🧘 <strong>Modo Zen / Hiperfoco Ativo:</strong> Abas secundárias ocultas para proteger sua atenção em 1 única tarefa de 15 minutos.
          </span>
          <button
            onClick={() => setZenMode(false)}
            className="rounded bg-purple-800/60 hover:bg-purple-700 px-2.5 py-0.5 text-[11px] text-white"
          >
            Sair do Modo Zen
          </button>
        </div>
      )}

      <main className="flex-1">
        {activeTab === "kanban" && <KanbanBoard onFocusRecorded={loadTopBarData} />}
        {activeTab === "clients" && <ClientsPanel />}
        {activeTab === "study" && <StudySplitView zenMode={zenMode} onFocusRecorded={loadTopBarData} />}
        {activeTab === "goals" && <GoalsDashboard />}
      </main>

      {/* Modal de Login / Perfil Local */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-zinc-100">
                  🔐 Login & Perfil Local do Desenvolvedor
                </h3>
                <p className="text-xs text-zinc-400">
                  Autenticação local persistida no SQLite WAL + navegador
                </p>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-zinc-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfileLogin} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Nome de Exibição</label>
                <input
                  type="text"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Usuário (@handle)</label>
                  <input
                    type="text"
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">PIN Local</label>
                  <input
                    type="password"
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Cargo / Foco Atual</label>
                <input
                  type="text"
                  value={loginRole}
                  onChange={(e) => setLoginRole(e.target.value)}
                  className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Meta Diária de Foco (minutos/dia - recomendado 30 a 45 min)
                </label>
                <input
                  type="number"
                  min={15}
                  max={180}
                  step={15}
                  value={loginGoal}
                  onChange={(e) => setLoginGoal(Number(e.target.value))}
                  className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-2 text-xs text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white"
                >
                  Entrar / Salvar Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
