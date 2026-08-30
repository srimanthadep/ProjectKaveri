/** Extracts the bare phone number (no @suffix) from a standard WhatsApp JID. */
export function jidToPhone(jid) {
  if (!jid) return null;
  return jid.split('@')[0].split(':')[0];
}

/**
 * Resolves an `@lid` (Linked ID) address to a real phone-number JID.
 *
 * WhatsApp has migrated many accounts to LID addressing, where the sender
 * JID contains no phone digits at all (e.g. `83408281698402@lid`). Any
 * lookup that assumes `jidToPhone(jid)` is a real number will silently fail
 * for these senders. Two resolution paths, in order of cost:
 *
 *   1. `phoneJidHint` — Baileys sometimes includes the real JID directly on
 *      the message envelope (`key.remoteJidAlt`). Free, no lookup needed.
 *   2. Baileys' internal Signal repository LID mapping table, populated as
 *      part of normal session/history sync.
 *
 * If both fail, the original (unresolved) JID is returned so callers can
 * decide how to degrade (e.g. show "Unknown contact" instead of a name).
 */
export async function resolvePhoneJid(sock, jid, phoneJidHint) {
  if (phoneJidHint) return phoneJidHint;
  if (!jid || !jid.endsWith('@lid')) return jid;

  try {
    const pn = await sock?.signalRepository?.lidMapping?.getPNForLID(jid);
    if (pn) return pn;
  } catch (err) {
    console.warn(`[whatsapp:lid] failed to resolve ${jid}:`, err.message);
  }
  return jid;
}

/** Converts a bare phone number (any formatting) into a standard send-JID. */
export function phoneToJid(phone) {
  const digits = String(phone).replace(/[^\d]/g, '');
  return `${digits}@s.whatsapp.net`;
}
