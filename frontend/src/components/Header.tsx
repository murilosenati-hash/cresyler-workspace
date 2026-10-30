import React from "react";

interface HeaderProps {
  activeTab: "kanban" | "clients" | "study" | "goals";
  onSelectTab: (tab: "kanban" | "clients" | "study" | "goals") => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onSelectTab }) => {
  const tabs = [
    { id: "kanban", label: "Kanban (Linear)" },
    { id: "clients", label: "Clientes & Demandas" },
    { id: "study", label: "Study Hub (RAG + PDF)" },
    { id: "goals", label: "Metas & Portfólio" },
  ] as const;

  return (
    <header className="border-b border-zinc-800 bg-zinc-900/80 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
          Cresyler Workspace & Study Hub
        </h1>
        <p className="text-xs text-zinc-400">
          Monólito Modular • FastAPI + SQLite WAL + LanceDB + React
        </p>
      </div>
      <nav className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
};
