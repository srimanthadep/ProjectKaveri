import { db } from '../db.js';

const insertStmt = db.prepare(`
  INSERT INTO whatsapp_message_log (phone, action, message, status, error, guest_id, guest_name, created_at)
  VALUES (@phone, @action, @message, @status, @error, @guest_id, @guest_name, strftime('%s','now'))
`);

/** Audit trail for every outbound send attempt, successful or not. */
export function logOutboundMessage({ phone, action, message, status = 'sent', error = null, guestId = null, guestName = null }) {
  insertStmt.run({ phone, action, message, status, error, guest_id: guestId, guest_name: guestName });
}

export function listOutboundLog({ limit = 50 } = {}) {
  return db
    .prepare(
      `SELECT id, phone, action, message, status, error, guest_id AS guestId, guest_name AS guestName, created_at AS createdAt
       FROM whatsapp_message_log ORDER BY created_at DESC LIMIT ?`
    )
    .all(limit);
}
