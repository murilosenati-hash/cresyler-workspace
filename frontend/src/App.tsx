import React, { useState } from "react";
import { Header } from "./components/Header";
import { KanbanBoard } from "./features/kanban/KanbanBoard";
import { ClientsPanel } from "./features/clients/ClientsPanel";
import { StudySplitView } from "./features/study/StudySplitView";
import { GoalsDashboard } from "./features/goals/GoalsDashboard";

export function App() {
  const [activeTab, setActiveTab] = useState<"kanban" | "clients" | "study" | "goals">("kanban");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Header activeTab={activeTab} onSelectTab={setActiveTab} />
      <main className="flex-1">
        {activeTab === "kanban" && <KanbanBoard />}
        {activeTab === "clients" && <ClientsPanel />}
        {activeTab === "study" && <StudySplitView />}
        {activeTab === "goals" && <GoalsDashboard />}
      </main>
    </div>
  );
}

export default App;
