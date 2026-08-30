/**
 * Client for the floating Gemini assistant's backend proxy
 * (POST /ai/chat on the FastAPI backend — see backend/app/routers/ai.py).
 *
 * Stateless: the full conversation history is sent on every call since the
 * server persists nothing about the chat itself. Auth is optional — if the
 * caller is logged in, the request includes their bearer token so the
 * backend can build role-scoped context (their own bookings, property,
 * etc.); anonymous visitors still get a response with public context only.
 */

export interface ChatTurn {
  role: 'user' | 'model';
  content: string;
}

export interface ChatResponse {
  data: string;
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

export async function chatWithAI(
  message: string,
  history: ChatTurn[] = [],
  currentView?: string
): Promise<ChatResponse> {
  const token = localStorage.getItem('kaveri_stays_jwt_token');

  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, history, current_view: currentView }),
  });

  if (!res.ok) {
    let message = `Chat request failed (${res.status}).`;
    try {
      const body = await res.json();
      message = body?.error?.message || message;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new Error(message);
  }

  return res.json();
}
