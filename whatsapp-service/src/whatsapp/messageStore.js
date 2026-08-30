import { BufferJSON } from '@whiskeysockets/baileys';
import { db } from '../db.js';

const rawSelectStmt = db.prepare(`SELECT raw FROM whatsapp_messages WHERE id = ?`);

/**
 * Required by Baileys for Signal retry/poll-decryption receipts: if a
 * recipient's device requests re-encryption of a message, Baileys needs the
 * original message content to resend it. Without this, message delivery to
 * multi-device recipients can silently fail after the first attempt.
 */
export async function getMessageFromStore(key) {
  if (!key?.id) return undefined;
  const row = rawSelectStmt.get(key.id);
  if (!row?.raw) return undefined;
  try {
    const revived = JSON.parse(row.raw, BufferJSON.reviver);
    return revived?.message ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Recursively unwraps envelope layers WhatsApp adds around the actual
 * message content (ephemeral timers, view-once, device-sent receipts).
 */
export function unwrapMessage(message) {
  if (!message) return message;
  if (message.ephemeralMessage) return unwrapMessage(message.ephemeralMessage.message);
  if (message.viewOnceMessage) return unwrapMessage(message.viewOnceMessage.message);
  if (message.viewOnceMessageV2) return unwrapMessage(message.viewOnceMessageV2.message);
  if (message.viewOnceMessageV2Extension) return unwrapMessage(message.viewOnceMessageV2Extension.message);
  if (message.documentWithCaptionMessage) return unwrapMessage(message.documentWithCaptionMessage.message);
  if (message.deviceSentMessage) return unwrapMessage(message.deviceSentMessage.message);
  return message;
}

const MEDIA_TYPES = new Set(['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage']);

/** Extracts a normalized { type, body } pair from an unwrapped message object. */
export function extractContent(message) {
  if (!message) return { type: 'unknown', body: null };

  if (message.conversation) return { type: 'text', body: message.conversation };
  if (message.extendedTextMessage) return { type: 'text', body: message.extendedTextMessage.text };

  for (const mediaType of MEDIA_TYPES) {
    if (message[mediaType]) {
      return {
        type: mediaType.replace('Message', ''),
        body: message[mediaType].caption || null,
        mimetype: message[mediaType].mimetype,
      };
    }
  }

  if (message.reactionMessage) {
    return { type: 'reaction', body: message.reactionMessage.text || null };
  }

  return { type: 'unknown', body: null };
}
