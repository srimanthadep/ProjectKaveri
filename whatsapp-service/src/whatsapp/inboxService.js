import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { db } from '../db.js';
import { unwrapMessage, extractContent } from './messageStore.js';
import { uploadMediaToLocal } from './mediaStore.js';
import { resolveGuestByPhone } from '../kaveriClient.js';
import { jidToPhone } from './jidUtils.js';

const upsertChatStmt = db.prepare(`
  INSERT INTO whatsapp_chats (jid, name, is_group, last_message_preview, last_message_at, unread_count, guest_id, guest_name, updated_at)
  VALUES (@jid, @name, @is_group, @preview, @ts, @unread_delta, @guest_id, @guest_name, strftime('%s','now'))
  ON CONFLICT(jid) DO UPDATE SET
    name = COALESCE(excluded.name, whatsapp_chats.name),
    last_message_preview = excluded.last_message_preview,
    last_message_at = excluded.last_message_at,
    unread_count = whatsapp_chats.unread_count + excluded.unread_count,
    guest_id = COALESCE(excluded.guest_id, whatsapp_chats.guest_id),
    guest_name = COALESCE(excluded.guest_name, whatsapp_chats.guest_name),
    updated_at = strftime('%s','now')
`);

const insertMessageStmt = db.prepare(`
  INSERT OR REPLACE INTO whatsapp_messages
    (id, chat_jid, sender_jid, from_me, body, message_type, media_url, status, timestamp, raw)
  VALUES (@id, @chat_jid, @sender_jid, @from_me, @body, @message_type, @media_url, @status, @timestamp, @raw)
`);

const updateStatusStmt = db.prepare(`UPDATE whatsapp_messages SET status = ? WHERE id = ?`);
const resetUnreadStmt = db.prepare(`UPDATE whatsapp_chats SET unread_count = 0 WHERE jid = ?`);
const upsertContactStmt = db.prepare(`
  INSERT INTO whatsapp_contacts (jid, name, push_name)
  VALUES (@jid, @name, @push_name)
  ON CONFLICT(jid) DO UPDATE SET
    name = COALESCE(excluded.name, whatsapp_contacts.name),
    push_name = COALESCE(excluded.push_name, whatsapp_contacts.push_name)
`);

/**
 * Persists one inbound Baileys message event to SQLite and returns a plain
 * object suitable for a Socket.io emit. Resolves the sender to a Kaveri
 * guest by phone number on first contact with a chat, so the concierge
 * inbox shows real guest names instead of raw JIDs.
 */
export async function persistInboundMessage(sock, msg) {
  const remoteJid = msg.key.remoteJid;
  if (!remoteJid || remoteJid === 'status@broadcast') return null;

  const isGroup = remoteJid.endsWith('@g.us');
  const fromMe = Boolean(msg.key.fromMe);
  const rawMessage = unwrapMessage(msg.message);
  const { type, body, mimetype } = extractContent(rawMessage);

  let mediaUrl = null;
  if (['image', 'video', 'audio', 'document', 'sticker'].includes(type)) {
    try {
      const buffer = await downloadMediaMessage(
        msg,
        'buffer',
        {},
        { reuploadRequest: sock?.updateMediaMessage }
      );
      if (buffer?.length) {
        mediaUrl = await uploadMediaToLocal(buffer, type, mimetype);
      }
    } catch (err) {
      console.warn('[whatsapp:inbox] media download failed:', err.message);
    }
  }

  const timestamp = Number(msg.messageTimestamp) * 1000 || Date.now();
  const pushName = msg.pushName || null;

  let guestId = null;
  let guestName = null;
  if (!isGroup && !fromMe) {
    const phone = jidToPhone(remoteJid);
    try {
      const guest = await resolveGuestByPhone(phone);
      if (guest) {
        guestId = guest.id;
        guestName = guest.full_name;
      }
    } catch (err) {
      console.warn('[whatsapp:inbox] guest resolution failed:', err.message);
    }
  }

  upsertContactStmt.run({ jid: remoteJid, name: guestName, push_name: pushName });

  upsertChatStmt.run({
    jid: remoteJid,
    name: guestName || pushName,
    is_group: isGroup ? 1 : 0,
    preview: body || `[${type}]`,
    ts: timestamp,
    unread_delta: fromMe ? 0 : 1,
    guest_id: guestId,
    guest_name: guestName,
  });

  insertMessageStmt.run({
    id: msg.key.id,
    chat_jid: remoteJid,
    sender_jid: fromMe ? null : (msg.key.participant || remoteJid),
    from_me: fromMe ? 1 : 0,
    body,
    message_type: type,
    media_url: mediaUrl,
    status: fromMe ? 'sent' : 'delivered',
    timestamp,
    raw: JSON.stringify(msg, (_key, value) =>
      value?.type === 'Buffer' ? value : value instanceof Uint8Array ? { type: 'Buffer', data: Array.from(value) } : value
    ),
  });

  return {
    id: msg.key.id,
    chatJid: remoteJid,
    senderJid: fromMe ? null : (msg.key.participant || remoteJid),
    fromMe,
    body,
    type,
    mediaUrl,
    status: fromMe ? 'sent' : 'delivered',
    timestamp,
    guestId,
    guestName,
    pushName,
  };
}

export function markMessageStatus(messageId, status) {
  updateStatusStmt.run(status, messageId);
}

export function markChatRead(jid) {
  resetUnreadStmt.run(jid);
}

export function listChats() {
  return db
    .prepare(
      `SELECT jid, name, is_group AS isGroup, avatar_url AS avatarUrl,
              last_message_preview AS lastMessagePreview, last_message_at AS lastMessageAt,
              unread_count AS unreadCount, guest_id AS guestId, guest_name AS guestName
       FROM whatsapp_chats
       ORDER BY last_message_at DESC NULLS LAST`
    )
    .all();
}

export function listMessages(jid, { limit = 50, before = null } = {}) {
  const rows = before
    ? db
        .prepare(
          `SELECT id, chat_jid AS chatJid, sender_jid AS senderJid, from_me AS fromMe, body,
                  message_type AS type, media_url AS mediaUrl, status, timestamp
           FROM whatsapp_messages
           WHERE chat_jid = ? AND timestamp < ?
           ORDER BY timestamp DESC LIMIT ?`
        )
        .all(jid, before, limit)
    : db
        .prepare(
          `SELECT id, chat_jid AS chatJid, sender_jid AS senderJid, from_me AS fromMe, body,
                  message_type AS type, media_url AS mediaUrl, status, timestamp
           FROM whatsapp_messages
           WHERE chat_jid = ?
           ORDER BY timestamp DESC LIMIT ?`
        )
        .all(jid, limit);

  return rows.reverse().map((r) => ({ ...r, fromMe: Boolean(r.fromMe) }));
}

export function recordOutboundMessage(jid, text, messageId) {
  const timestamp = Date.now();
  const id = messageId || `out-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  try {
    upsertChatStmt.run({
      jid,
      name: null,
      is_group: jid.endsWith('@g.us') ? 1 : 0,
      preview: text,
      ts: timestamp,
      unread_delta: 0,
      guest_id: null,
      guest_name: null,
    });

    insertMessageStmt.run({
      id,
      chat_jid: jid,
      sender_jid: null,
      from_me: 1,
      body: text,
      message_type: 'text',
      media_url: null,
      status: 'sent',
      timestamp,
      raw: null,
    });
  } catch (err) {
    console.warn('[inboxService] failed to record outbound message:', err.message);
  }

  return {
    id,
    chatJid: jid,
    senderJid: null,
    fromMe: true,
    body: text,
    type: 'text',
    mediaUrl: null,
    status: 'sent',
    timestamp,
  };
}
