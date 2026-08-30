import { db } from '../db.js';
import { config } from '../config.js';

const countStmt = db.prepare(`
  SELECT COUNT(*) AS n FROM whatsapp_bot_messages
  WHERE jid = ? AND role = 'assistant' AND created_at >= ?
`);

/**
 * Caps AI replies per WhatsApp number per hour. Protects against runaway
 * Gemini API spend if a single number gets spammed, loops with another bot,
 * or a message triggers a reply that triggers another reply.
 */
export function isBotRateLimited(jid) {
  const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
  const { n } = countStmt.get(jid, oneHourAgo);
  return n >= config.botRateLimitPerHour;
}
