import { db } from '../db.js';
import { config, isGeminiEnabled } from '../config.js';
import { resolveGuestByPhone, getBooking } from '../kaveriClient.js';
import { buildGuestContext } from './contextBuilder.js';
import { askGeminiConcierge } from './geminiClient.js';
import { isBotRateLimited } from './botRateLimit.js';
import { jidToPhone } from '../whatsapp/jidUtils.js';
import { sendTextMessage } from '../whatsapp/connection.js';

const insertTurnStmt = db.prepare(`
  INSERT INTO whatsapp_bot_messages (jid, guest_id, role, message, created_at)
  VALUES (@jid, @guest_id, @role, @message, strftime('%s','now'))
`);

const historyStmt = db.prepare(`
  SELECT role, message FROM whatsapp_bot_messages
  WHERE jid = ? ORDER BY created_at DESC LIMIT ?
`);

function recordTurn(jid, guestId, role, message) {
  try {
    insertTurnStmt.run({ jid, guest_id: guestId ?? null, role, message });
  } catch (err) {
    console.warn('[bot:db] failed to record bot turn:', err.message);
  }
}

function getHistory(jid, limit = 6) {
  try {
    return historyStmt.all(jid, limit).reverse();
  } catch {
    return [];
  }
}

/**
 * Executes the "resend voucher/receipt" action Gemini requested, by
 * formatting a follow-up text from data fetched through the Kaveri API.
 */
async function executeAction(action, actionId) {
  if (!actionId) return null;
  const booking = await getBooking(actionId).catch(() => null);
  if (!booking) return null;

  if (action === 'resend_voucher') {
    return (
      `*Booking Voucher — #${booking.id}*\n` +
      `Room ${booking.room_number} · ${booking.check_in} to ${booking.check_out}\n` +
      `Status: ${booking.status}\n` +
      `Total: ₹${booking.total_amount} · Paid: ₹${booking.total_paid} · Balance: ₹${booking.balance}`
    );
  }

  if (action === 'resend_receipt') {
    return (
      `*Payment Summary — Booking #${booking.id}*\n` +
      `Total paid so far: ₹${booking.total_paid}\n` +
      `Outstanding balance: ₹${booking.balance}`
    );
  }

  return null;
}

/**
 * Full concierge turn: resolve sender to a guest (or handle as prospective guest),
 * rate-limit, build grounded context, ask Gemini AI, execute any action, and send the WhatsApp reply.
 */
export async function handleIncomingForBot(jid, text) {
  if (!isGeminiEnabled()) {
    console.warn('[bot] Gemini API key not configured, skipping AI reply.');
    return;
  }
  if (!text || !text.trim()) return;

  if (isBotRateLimited(jid)) {
    console.warn(`[bot] rate limit hit for ${jid}, skipping AI reply.`);
    return;
  }

  console.log(`[bot] processing inbound message from ${jid}: "${text}"`);

  const phone = jidToPhone(jid);
  let guest = null;
  if (phone) {
    try {
      guest = await resolveGuestByPhone(phone);
    } catch (err) {
      console.warn(`[bot] guest resolution lookup failed:`, err.message);
    }
  }

  recordTurn(jid, guest?.id ?? null, 'user', text);

  const guestContext = await buildGuestContext(guest);
  const history = getHistory(jid);

  let result;
  try {
    result = await askGeminiConcierge({ guestContext, userMessage: text, history });
  } catch (err) {
    console.error('[bot] Gemini call failed:', err.message);
    return;
  }

  let replyText = result.reply;
  if (result.action && result.action !== 'none') {
    const actionText = await executeAction(result.action, result.actionId);
    if (actionText) replyText = `${replyText}\n\n${actionText}`;
  }

  console.log(`[bot] sending auto-reply to ${jid}: "${replyText}"`);

  try {
    await sendTextMessage(jid, replyText);
    recordTurn(jid, guest?.id ?? null, 'assistant', replyText);
    console.log(`[bot] successfully delivered auto-reply to ${jid}`);
  } catch (err) {
    console.error('[bot] failed to send reply:', err.message);
  }
}
