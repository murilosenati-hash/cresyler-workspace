import { API_BASE_URL } from "./api";

export function subscribeStudyStream(
  query: string,
  onToken: (text: string) => void,
  onDone?: () => void
): () => void {
  const url = `${API_BASE_URL}/study/rag/stream?q=${encodeURIComponent(query)}`;
  const source = new EventSource(url);

  source.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.event === "token" && payload.text) {
        onToken(payload.text);
      } else if (payload.event === "done") {
        source.close();
        onDone?.();
      }
    } catch {
      // Ignore malformed SSE lines
    }
  };

  source.onerror = () => {
    source.close();
    onDone?.();
  };

  return () => source.close();
}
