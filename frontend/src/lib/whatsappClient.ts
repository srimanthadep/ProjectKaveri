/**
 * Client for Kaveri WhatsApp Service (http://localhost:4500)
 * Connects to REST routes on /api/whatsapp and SSE / Socket.io for real-time events.
 */

export interface WhatsAppStatus {
  status: 'disconnected' | 'awaiting_qr' | 'connecting' | 'connected';
  qr: string | null;
  botEnabled?: boolean;
}

export interface WaChat {
  jid: string;
  name: string | null;
  isGroup: number;
  avatarUrl: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: number | null;
  unreadCount: number;
  guestId: number | null;
  guestName: string | null;
}

export interface WaMessage {
  id: string;
  chatJid: string;
  senderJid: string | null;
  fromMe: boolean;
  body: string | null;
  type: string;
  mediaUrl: string | null;
  status: 'sent' | 'delivered' | 'read';
  timestamp: number;
}

export interface WaLogItem {
  id: number;
  phone: string;
  action: string;
  message: string;
  status: string;
  error?: string | null;
  guestId?: number | null;
  guestName?: string | null;
  createdAt?: number;
}

const WA_BASE = (import.meta as any).env?.VITE_WHATSAPP_API_URL || 'http://localhost:4500';
const SERVICE_TOKEN =
  (import.meta as any).env?.VITE_WHATSAPP_SERVICE_TOKEN || '';

const authHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${SERVICE_TOKEN}`,
};

export async function getPairStatus(): Promise<WhatsAppStatus> {
  try {
    const res = await fetch(`${WA_BASE}/pair/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { status: 'disconnected', qr: null, botEnabled: false };
  }
}

export async function getWhatsAppStatus(): Promise<WhatsAppStatus> {
  try {
    const res = await fetch(`${WA_BASE}/api/whatsapp/status`, {
      headers: authHeaders,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return getPairStatus();
  }
}

export async function initWhatsAppConnection(): Promise<WhatsAppStatus> {
  const res = await fetch(`${WA_BASE}/api/whatsapp/connect`, {
    method: 'POST',
    headers: authHeaders,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Failed to initiate connection (${res.status})`);
  }
  return res.json();
}

export async function logoutWhatsApp(): Promise<{ ok: boolean }> {
  const res = await fetch(`${WA_BASE}/api/whatsapp/logout`, {
    method: 'POST',
    headers: authHeaders,
  });
  if (!res.ok) throw new Error(`Logout failed (${res.status})`);
  return res.json();
}

export async function listWaChats(): Promise<WaChat[]> {
  const res = await fetch(`${WA_BASE}/api/whatsapp/chats`, {
    headers: authHeaders,
  });
  if (!res.ok) throw new Error(`Failed to fetch chats (${res.status})`);
  const data = await res.json();
  return data.items || [];
}

export async function listWaMessages(jid: string, limit = 50): Promise<WaMessage[]> {
  const res = await fetch(
    `${WA_BASE}/api/whatsapp/chats/${encodeURIComponent(jid)}/messages?limit=${limit}`,
    { headers: authHeaders }
  );
  if (!res.ok) throw new Error(`Failed to fetch messages (${res.status})`);
  const data = await res.json();
  return data.items || [];
}

export async function sendWaMessage(jid: string, text: string): Promise<{ id: string; queued: boolean }> {
  const res = await fetch(
    `${WA_BASE}/api/whatsapp/chats/${encodeURIComponent(jid)}/messages`,
    {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ text }),
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Failed to send message (${res.status})`);
  }
  return res.json();
}

export async function markWaChatRead(jid: string): Promise<{ ok: boolean }> {
  const res = await fetch(
    `${WA_BASE}/api/whatsapp/chats/${encodeURIComponent(jid)}/read`,
    {
      method: 'POST',
      headers: authHeaders,
    }
  );
  return res.json();
}

export async function sendWaBroadcast(phone: string, text: string, dedupKey?: string): Promise<{ queued: boolean }> {
  const res = await fetch(`${WA_BASE}/api/whatsapp/send`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ phone, text, dedupKey }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Broadcast failed (${res.status})`);
  }
  return res.json();
}

export async function listWaOutboundLog(limit = 50): Promise<WaLogItem[]> {
  const res = await fetch(`${WA_BASE}/api/whatsapp/log?limit=${limit}`, {
    headers: authHeaders,
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || [];
}

export const WHATSAPP_SERVICE_URL = WA_BASE;
export const WHATSAPP_TOKEN = SERVICE_TOKEN;
