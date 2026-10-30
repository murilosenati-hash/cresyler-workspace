export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

export interface AcceptanceCriterion {
  item: string;
  done: boolean;
}

export interface TicketItem {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  order: number;
  client_id: number | null;
  acceptance_criteria: AcceptanceCriterion[];
  stack_tags: string[];
  sla_hours: number;
  in_portfolio: boolean;
}

export interface KanbanColumn {
  id: string;
  title: string;
  tickets: TicketItem[];
}

export interface KanbanBoardResponse {
  columns: KanbanColumn[];
  total_tickets: number;
}

export interface ClientPersona {
  id: number;
  name: string;
  company: string;
  industry: string;
  tone: string;
  criteria_strictness: string;
}

export async function apiFetch<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const errJson = await response.json();
      detail = errJson.detail || JSON.stringify(errJson);
    } catch {
      detail = await response.text();
    }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}
