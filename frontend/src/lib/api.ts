export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

export async function apiFetch<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error (${response.status}): ${errorBody}`);
  }
  return response.json() as Promise<T>;
}
