import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config.js';
import { router } from './routes.js';
import { attachSocketIo, initWhatsApp, getStatus } from './whatsapp/connection.js';
import { startWorker } from './queue/worker.js';

const app = express();
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json());

// Served media (local-disk substitute for a Cloudinary CDN). No auth on
// these paths since they're opaque, randomly-named files — acceptable for
// internal/demo use; put behind a signed URL if this ever faces the public
// internet with sensitive attachments.
app.use('/media', express.static(path.resolve(config.mediaDir)));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'kaveri-whatsapp-service' }));

// Deliberately UNAUTHENTICATED, minimal status endpoint used only by the QR
// pairing page below. Exposes just { status, qr } — no message content, no
// send capability, nothing guest-identifying. Everything else that touches
// real data (chats, messages, /send) stays behind requireServiceToken on
// the /api/whatsapp router further down.
app.get('/pair/status', (req, res) => {
  res.json(getStatus());
});

// Human-facing QR pairing page — no token needed, since it only talks to
// the unauthenticated endpoint above.
app.use('/pair', express.static(path.resolve(import.meta.dirname, 'public')));
app.get('/', (req, res) => res.redirect('/pair/pair.html'));

app.use('/api/whatsapp', router);

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: config.corsOrigins, credentials: true },
});

io.on('connection', (socket) => {
  console.log(`[socket.io] client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`[socket.io] client disconnected: ${socket.id}`));
});

attachSocketIo(io);

server.listen(config.port, () => {
  console.log(`[whatsapp-service] listening on http://localhost:${config.port}`);
  startWorker();
  // Auto-connect on boot if a session already exists; if not, the frontend
  // triggers POST /api/whatsapp/connect to start a fresh QR pairing.
  initWhatsApp().catch((err) => console.error('[whatsapp-service] initial connect failed:', err));
});

process.on('uncaughtException', (err) => {
  console.error('[whatsapp-service:uncaughtException]', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[whatsapp-service:unhandledRejection]', reason?.message || reason);
});

process.on('SIGTERM', () => {
  console.log('[whatsapp-service] shutting down...');
  server.close(() => process.exit(0));
});
