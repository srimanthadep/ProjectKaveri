import express from 'express';
import { config, isGeminiEnabled } from './config.js';
import { requireServiceToken } from './authMiddleware.js';
import { initWhatsApp, getStatus, sendTextMessage, markRead } from './whatsapp/connection.js';
import { listChats, listMessages } from './whatsapp/inboxService.js';
import { enqueue } from './queue/queueService.js';
import { listOutboundLog } from './queue/messageLog.js';
import { phoneToJid } from './whatsapp/jidUtils.js';
import { clearSqliteAuthState } from './whatsapp/authState.js';

export const router = express.Router();

router.use(requireServiceToken);

// ---------------------------------------------------------------------------
// Connection lifecycle
// ---------------------------------------------------------------------------

router.get('/status', (req, res) => {
  res.json({ ...getStatus(), botEnabled: isGeminiEnabled() });
});

router.post('/connect', async (req, res) => {
  try {
    await initWhatsApp();
    res.json(getStatus());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', async (req, res) => {
  clearSqliteAuthState(config.sessionLabel);
  res.json({ ok: true });
});

/**
 * Real-time QR streaming via Server-Sent Events instead of polling — the
 * client opens one connection and receives a push every 1.5s until the
 * pairing completes, at which point the stream closes itself.
 */
router.get('/qr-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendUpdate = () => {
    const status = getStatus();
    res.write(`data: ${JSON.stringify(status)}\n\n`);
    if (status.status === 'connected') {
      clearInterval(interval);
      res.end();
    }
  };

  const interval = setInterval(sendUpdate, 1500);
  sendUpdate();

  req.on('close', () => clearInterval(interval));
});

// ---------------------------------------------------------------------------
// Inbox
// ---------------------------------------------------------------------------

router.get('/chats', (req, res) => {
  res.json({ items: listChats() });
});

router.get('/chats/:jid/messages', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 100);
  const before = req.query.before ? Number(req.query.before) : null;
  res.json({ items: listMessages(req.params.jid, { limit, before }) });
});

router.post('/chats/:jid/read', (req, res) => {
  markRead(req.params.jid);
  res.json({ ok: true });
});

/** Sends immediately if connected; otherwise enqueues for the worker to retry. */
router.post('/chats/:jid/messages', async (req, res) => {
  const { text } = req.body ?? {};
  if (!text || !text.trim()) {
    return res.status(422).json({ error: 'text is required.' });
  }

  const status = getStatus();
  if (status.status === 'connected') {
    try {
      const result = await sendTextMessage(req.params.jid, text);
      return res.status(201).json({ id: result?.key?.id ?? null, queued: false });
    } catch (err) {
      // Fall through to queueing rather than failing the request outright.
      console.warn('[routes] immediate send failed, queueing instead:', err.message);
    }
  }

  enqueue({ type: 'text', action: 'send_text', payload: { text }, jid: req.params.jid });
  res.status(202).json({ queued: true });
});

// ---------------------------------------------------------------------------
// Outbound broadcast (booking confirmations, reminders) — called by the
// Kaveri backend/frontend rather than a human typing in the inbox.
// ---------------------------------------------------------------------------

router.post('/send', (req, res) => {
  const { phone, text, dedupKey } = req.body ?? {};
  if (!phone || !text) {
    return res.status(422).json({ error: 'phone and text are required.' });
  }
  const jid = phoneToJid(phone);
  const queued = enqueue({ type: 'text', action: 'send_text', payload: { text }, jid, dedupKey });
  res.status(202).json({ queued });
});

router.get('/log', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 200);
  res.json({ items: listOutboundLog({ limit }) });
});
