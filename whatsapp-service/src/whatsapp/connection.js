import {
  makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  proto,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import { config } from '../config.js';
import { useSqliteAuthState, hasSqliteAuthState, clearSqliteAuthState } from './authState.js';
import { getMessageFromStore } from './messageStore.js';
import { persistInboundMessage, markMessageStatus, markChatRead, recordOutboundMessage } from './inboxService.js';
import { resolvePhoneJid } from './jidUtils.js';
import { handleIncomingForBot } from '../bot/botService.js';

const logger = pino({ level: 'silent' });

let sock = null;
let connectionStatus = 'disconnected'; // 'disconnected' | 'awaiting_qr' | 'connecting' | 'connected'
let qrDataUrl = null;
let io = null; // Socket.io server instance, injected by server.js
let connecting = false; // guards against overlapping initWhatsApp() calls

export function attachSocketIo(server) {
  io = server;
}

export function getStatus() {
  return { status: connectionStatus, qr: connectionStatus === 'awaiting_qr' ? qrDataUrl : null };
}

export function getSocket() {
  return sock;
}

function emit(event, payload) {
  io?.emit(event, payload);
}

/**
 * Establishes (or re-establishes) the Baileys connection. Idempotent-ish:
 * safe to call again after a disconnect since it always tears down any
 * existing socket's listeners implicitly by reassigning `sock`.
 */
export async function initWhatsApp() {
  if (connecting) return sock;
  connecting = true;

  connectionStatus = 'connecting';
  emit('whatsapp:status', getStatus());

  const { state, saveCreds } = await useSqliteAuthState(config.sessionLabel);

  // Race the GitHub version-check network call against a short timeout so a
  // slow network never blocks QR generation. Passing `{ version: undefined }`
  // explicitly would crash Baileys' internal version checks, so pass an
  // empty options object instead when the race times out.
  const version = await Promise.race([
    fetchLatestBaileysVersion().then((r) => r.version).catch(() => null),
    new Promise((resolve) => setTimeout(() => resolve(null), 1500)),
  ]);
  const versionOpts = version ? { version } : {};

  sock = makeWASocket({
    ...versionOpts,
    auth: state,
    logger,
    browser: Browsers.ubuntu('Chrome'),
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    connectTimeoutMs: 60_000,
    keepAliveIntervalMs: 60_000,

    // Only sync the initial bootstrap + status history. Disabling history
    // sync entirely breaks LID<->phone mapping; enabling it fully floods
    // the database with years of old messages on first connect.
    shouldSyncHistoryMessage: ({ syncType }) =>
      syncType === proto.HistorySync.HistorySyncType.INITIAL_BOOTSTRAP ||
      syncType === proto.HistorySync.HistorySyncType.INITIAL_STATUS_V3,

    getMessage: async (key) => (await getMessageFromStore(key)) || { conversation: '' },
  });
  connecting = false;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      connectionStatus = 'awaiting_qr';
      qrDataUrl = await QRCode.toDataURL(qr);
      emit('whatsapp:status', getStatus());
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const errorMsg = String(lastDisconnect?.error?.message || '').toLowerCase();
      const isConflict = errorMsg.includes('conflict');
      const isLoggedOut = statusCode === DisconnectReason.loggedOut && !isConflict;
      const wasFullyAuthed = hasSqliteAuthState(config.sessionLabel);

      console.log(
        `[whatsapp] connection closed. statusCode=${statusCode} isLoggedOut=${isLoggedOut} isConflict=${isConflict} wasFullyAuthed=${wasFullyAuthed} reason=${lastDisconnect?.error?.message}`
      );

      if (isLoggedOut) {
        connectionStatus = 'disconnected';
        qrDataUrl = null;
        sock = null;
        clearSqliteAuthState(config.sessionLabel);
        emit('whatsapp:status', getStatus());
        return;
      }

      connectionStatus = 'disconnected';
      qrDataUrl = null;
      sock = null;
      if (!wasFullyAuthed && !isConflict) clearSqliteAuthState(config.sessionLabel);
      emit('whatsapp:status', getStatus());

      const retryDelayMs = wasFullyAuthed ? 3000 : 500;
      setTimeout(
        () => initWhatsApp().catch((err) => console.error('[whatsapp] reconnect failed:', err?.message || err)),
        retryDelayMs
      );
    } else if (connection === 'open') {
      connectionStatus = 'connected';
      qrDataUrl = null;
      emit('whatsapp:status', getStatus());
      console.log('[whatsapp] connection established.');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const msg of messages) {
      if (!msg.message) continue;
      try {
        const saved = await persistInboundMessage(sock, msg);
        if (saved) {
          emit('whatsapp:new-message', saved);
          emit('whatsapp:chat-update', { jid: saved.chatJid });

          // Fire-and-forget: the AI concierge automatically answers 1:1 guest inquiries
          if (!saved.fromMe && saved.type === 'text' && !msg.key.remoteJid.endsWith('@g.us')) {
            console.log(`[whatsapp:bot] Triggering AI concierge for ${saved.chatJid}: "${saved.body}"`);
            handleIncomingForBot(saved.chatJid, saved.body).catch((err) =>
              console.error('[whatsapp] bot handling failed:', err)
            );
          }
        }
      } catch (err) {
        console.error('[whatsapp] failed to persist inbound message:', err);
      }
    }
  });

  sock.ev.on('messages.update', (updates) => {
    for (const { key, update } of updates) {
      if (update.status) {
        const statusMap = { 2: 'sent', 3: 'delivered', 4: 'read' };
        const mapped = statusMap[update.status];
        if (mapped) {
          markMessageStatus(key.id, mapped);
          emit('whatsapp:message-status', { id: key.id, status: mapped });
        }
      }
    }
  });

  return sock;
}

/** Sends a plain text message to a phone-number JID (or group JID). */
export async function sendTextMessage(jid, text) {
  if (!sock || connectionStatus !== 'connected') {
    throw new Error('WhatsApp is not connected.');
  }
  const result = await sock.sendMessage(jid, { text });
  const saved = recordOutboundMessage(jid, text, result?.key?.id);
  emit('whatsapp:new-message', saved);
  emit('whatsapp:chat-update', { jid });
  return result;
}

/** Marks a chat's unread counter as cleared, locally only (no read receipts sent). */
export function markRead(jid) {
  markChatRead(jid);
}

export { resolvePhoneJid };
