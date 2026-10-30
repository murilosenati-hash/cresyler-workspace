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
  difficulty_level: number;
  budget_cents: number;
  tutorial_guide: string | null;
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

export interface FreelanceProposalItem {
  id: number;
  client_persona_id: number;
  client_name: string;
  company: string;
  industry: string;
  title: string;
  difficulty_level: number;
  budget_cents: number;
  budget_formatted: string;
  estimated_minutes: number;
  sla_hours: number;
  stack_tags: string[];
  briefing_markdown: string;
  tutorial_guide_markdown: string;
  acceptance_criteria: AcceptanceCriterion[];
  status: string;
}

export interface DailyFocusSummary {
  date: string;
  focused_minutes_today: number;
  daily_goal_minutes: number;
  progress_pct: number;
  completed_sprints_today: number;
  goal_reached: boolean;
}

export interface LocalUserProfile {
  id: number;
  username: string;
  display_name: string;
  role_title: string;
  daily_goal_minutes: number;
  available_for_work: boolean;
  session_token?: string;
}

export interface FlashcardItem {
  id: number;
  document_id: number | null;
  front: string;
  back: string;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  last_rating: string | null;
}

export interface QuizQuestionItem {
  id: number;
  document_id: number | null;
  question: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
}

export interface QuizSubmitResult {
  score: number;
  total: number;
  score_pct: number;
  details: Array<{
    question_id: number;
    chosen_index: number;
    correct_option_index: number;
    is_correct: boolean;
    explanation: string;
  }>;
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
