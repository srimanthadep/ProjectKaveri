# Production-Grade WhatsApp Automation, Inbox & Gemini AI Bot Architecture

This document serves as the complete technical specification, architectural blueprint, and implementation reference for building an enterprise-grade WhatsApp integration. It is designed to be self-contained so that any software engineer or AI agent can replicate this architecture in entirely new and different projects.

---

## Table of Contents

1. [Executive Summary & System Architecture](#1-executive-summary--system-architecture)
2. [PostgreSQL-Backed Session Engine & Signal Key Optimization](#2-postgresql-backed-session-engine--signal-key-optimization)
3. [Connection Lifecycle, QR Generation & Resilient Reconnection](#3-connection-lifecycle-qr-generation--resilient-reconnection)
4. [WhatsApp Inbox & Real-Time Sync Engine](#4-whatsapp-inbox--real-time-sync-engine)
5. [Background Queue Worker & Message Dispatcher](#5-background-queue-worker--message-dispatcher)
6. [Gemini AI Automated Patient Bot System](#6-gemini-ai-automated-patient-bot-system)
7. [Frontend Real-Time Chat System](#7-frontend-real-time-chat-system)
8. [Complete Database Schemas & Migrations](#8-complete-database-schemas--migrations)
9. [Step-by-Step Implementation Guide for New Projects](#9-step-by-step-implementation-guide-for-new-projects)

---

## 1. Executive Summary & System Architecture

### 1.1 The Challenge
Standard open-source WhatsApp libraries (specifically `@whiskeysockets/baileys`) write session files, encryption keys, and credentials directly to the local filesystem (`auth_info_baileys/`). When deploying to containerized, cloud, or serverless platforms (such as Render, Railway, AWS ECS, Heroku, or Docker containers), the local disk is ephemeral:
- Every code redeployment or container restart wipes local files, forcing users to re-scan the QR code.
- Signal encryption keys multiply rapidly (thousands of keys generated for multi-device sync), causing massive database bloat if stored naively in PostgreSQL.
- Baileys no longer keeps chat history in memory across reconnects, requiring a dedicated persistence layer for inbox UI.
- Inbound WhatsApp messages can easily flood AI APIs, creating expensive billing loops or exposing sensitive database data if security boundaries are loose.

### 1.2 The Solution Architecture
This architecture uses a multi-tier, decoupled design:

```
                      +-------------------------------------------------------------+
                      |                   FRONTEND CLIENT (React/Vite)               |
                      |  - TanStack Query Cache for Chat & Message Threads          |
                      |  - Socket.io for Real-Time Incoming Messages & Status       |
                      |  - Server-Sent Events (SSE) for Real-Time QR Code Streaming |
                      +------------------------------+------------------------------+
                                                     |
                                                     | HTTPS / WSS
                                                     v
+----------------------------------------------------+---------------------------------------------------+
|                                       EXPRESS BACKEND CORE                                            |
|                                                                                                       |
|  +--------------------------------+   +---------------------------------+   +----------------------+  |
|  |     WHATSAPP INBOX LAYER       |   |      WHATSAPP AUTH ADAPTER      |   |   SSE QR STREAM ROUTE|  |
|  |  - Message unwrap & parse      |   |  - Custom Postgres Auth State   |   |  - Streams DataURL   |  |
|  |  - Media upload to Cloudinary  |   |  - Signal key row pruning       |   |    QR codes to UI    |  |
|  |  - Real-time Socket.io emit    |   |  - BufferJSON serializer        |   +----------------------+  |
|  +----------------+---------------+   +----------------+----------------+                              |
|                   |                                    |                                               |
|                   v                                    v                                               |
|  +-----------------------------------------------------+--------------------------------------------+  |
|  |                             BAILEYS SOCKET RUNTIME (@whiskeysockets/baileys)                     |  |
|  |  - WebSocket to WhatsApp Servers                                                                 |  |
|  |  - E2E Signal Encryption (Pre-Keys, Sender Keys, Sessions)                                       |  |
|  |  - Filtered History Sync (INITIAL_BOOTSTRAP only)                                                |  |
|  +----------------+------------------------------------+--------------------------------------------+  |
|                   |                                    ^                                               |
|                   | (Inbound Text)                     | (Send Message)                                |
|                   v                                    |                                               |
|  +----------------+---------------+   +----------------+----------------+                              |
|  |     AI BOT SERVICE (Gemini)    |   |      BACKGROUND WORKER QUEUE    |                              |
|  |  - Rate limiting & turn logging|   |  - SQLite FIFO Queue            |                              |
|  |  - LID -> Phone resolver       |   |  - Rate limiting & token bucket |                              |
|  |  - Grounded Context Builder    |   |  - Retry exponential backoff    |                              |
|  |  - Gemini 3.1 Flash-Lite API   |   |  - Lazy PDF/Media generators    |                              |
|  |  - Deterministic Action Engine |   +----------------+----------------+                              |
|  +----------------+---------------+                    ^                                               |
|                   | (Action: Resend Invoice/Presc)     | (Fallback / Async Enqueue)                    |
|                   +------------------------------------+                                               |
+----------------------------------------------------+---------------------------------------------------+
                                                     |
                                    +----------------+----------------+
                                    |                                 |
                                    v                                 v
                     +------------------------------+  +-------------------------------+
                     |     POSTGRESQL DATABASE      |  |      SQLITE LOCAL STORE       |
                     |  - whatsapp_sessions         |  |  - queues (pending jobs)      |
                     |  - whatsapp_chats            |  |  - media_cache                |
                     |  - whatsapp_messages         |  |  - ack_tracking               |
                     |  - whatsapp_contacts         |  +-------------------------------+
                     |  - whatsapp_bot_messages     |
                     |  - whatsapp_message_log      |
                     +------------------------------+
```

---

## 2. PostgreSQL-Backed Session Engine & Signal Key Optimization

### 2.1 The Problem with Baileys Auth
Baileys uses the Signal protocol, which requires storing:
1. `creds`: The main authentication keys, identity keys, noise keys, registration IDs, and account metadata (`creds.me`).
2. `keys`: Signal keys including `app-state-sync-key`, `session`, `pre-key`, `sender-key`, and `sender-key-memory`.

In high-volume WhatsApp connections, Baileys creates a new database row for every single pre-key and participant sender-key. Within weeks, the database table can explode to **50,000+ rows**, exceeding connection timeouts and cloud database storage limits.

### 2.2 The Solution: BufferJSON & Auto-Pruning PostgreSQL Adapter (`whatsapp.auth.js`)

#### 1. Binary Serialization via BufferJSON
Signal keys contain Node.js `Buffer` objects. Standard `JSON.stringify` converts Buffers to plain arrays, destroying their cryptographic integrity. Baileys provides `BufferJSON.replacer` and `BufferJSON.reviver` to serialize Buffers into `{"type": "Buffer", "data": [...]}` and reconstitute them properly.

```javascript
// Writing keys to Postgres
const json = JSON.stringify(data, BufferJSON.replacer);
await dbService.query(
  'INSERT INTO whatsapp_sessions (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, created_at = NOW()',
  [`${sessionId}-${id}`, json]
);

// Reading keys from Postgres
const res = await dbService.query('SELECT data FROM whatsapp_sessions WHERE id = $1', [`${sessionId}-${id}`]);
if (res.rows.length > 0) {
  return JSON.parse(res.rows[0].data, BufferJSON.reviver);
}
```

#### 2. Row Optimization & Pruning Algorithm
- **`creds` row is IMMORTAL**: The record named `${sessionId}-creds` must NEVER be deleted. It holds the cryptographic master key and phone association (`creds.me`).
- **Signal keys are ephemeral**: Old Signal session keys and pre-keys are regenerated on the fly by Baileys if needed.
- **The 200-Key Threshold**: Every time `usePostgresAuthState` initializes, it counts the keys for the session. If keys exceed 200, it removes the oldest keys while strictly excluding `-creds`.

```javascript
// Prune old signal keys — keep only the most recent 200 keys
const countRes = await dbService.query(
  `SELECT COUNT(*) FROM whatsapp_sessions WHERE id LIKE $1 AND id NOT LIKE $2`,
  [`${sessionId}-%`, `${sessionId}-creds`]
);
const totalKeys = parseInt(countRes.rows[0].count || 0);

if (totalKeys > 200) {
  const pruneRes = await dbService.query(`
    DELETE FROM whatsapp_sessions
    WHERE id IN (
      SELECT id FROM whatsapp_sessions
      WHERE id LIKE $1 AND id NOT LIKE $2
      ORDER BY created_at ASC
      LIMIT $3
    )
  `, [`${sessionId}-%`, `${sessionId}-creds`, totalKeys - 200]);
  
  if (pruneRes.rowCount > 0) {
    console.log(`[WhatsApp Auth] Pruned ${pruneRes.rowCount} old signal keys.`);
  }
}
```

#### 3. Checking Session Readiness
To know if the app has a valid session without initiating a full socket connection:
```javascript
export const hasPostgresAuthState = async (sessionId = 'default-session') => {
  const res = await dbService.query(
    'SELECT data FROM whatsapp_sessions WHERE id = $1',
    [`${sessionId}-creds`]
  );
  if (res.rows.length === 0) return false;
  const creds = JSON.parse(res.rows[0].data, BufferJSON.reviver);
  return Boolean(creds && creds.me); // True only if phone is paired
};
```

---

## 3. Connection Lifecycle, QR Generation & Resilient Reconnection

### 3.1 Socket Initialization Safeguards (`whatsapp.service.js`)

When creating the Baileys socket (`makeWASocket`), three critical optimizations prevent cold-start crashes, slow QR generation, and database saturation:

#### 1. Version Fetch Timeout Race
`fetchLatestBaileysVersion()` calls GitHub without a timeout. If the network is slow, QR generation blocks. We race it against a 1.5-second timeout:
```javascript
const version = await Promise.race([
  fetchLatestBaileysVersion().then((r) => r.version).catch(() => null),
  new Promise((resolve) => setTimeout(() => resolve(null), 1500)),
]);
// CRITICAL: If timed out, pass empty object so Baileys uses its built-in default.
// Do NOT pass { version: undefined }, which crashes Baileys internal version checks.
const socketOpts = version ? { version } : {};
```

#### 2. Selective History Sync Control
- Blanket-disabling all history sync (`() => false`) stops Baileys from receiving the **LID <-> Phone Number mapping**, breaking patient identification.
- Blanket-enabling sync dumps thousands of old contacts and messages, running thousands of sequential SQL queries that choke the database connection pool.
- **The Solution**: Allow only `INITIAL_BOOTSTRAP` and `INITIAL_STATUS_V3`:

```javascript
sock = makeWASocket({
  ...socketOpts,
  auth: state,
  browser: Browsers.ubuntu('Chrome'),
  printQRInTerminal: false,
  syncFullHistory: false,
  markOnlineOnConnect: false,
  connectTimeoutMs: 60000,
  keepAliveIntervalMs: 60000,
  
  shouldSyncHistoryMessage: ({ syncType }) =>
    syncType === proto.HistorySync.HistorySyncType.INITIAL_BOOTSTRAP ||
    syncType === proto.HistorySync.HistorySyncType.INITIAL_STATUS_V3,
    
  getMessage: async (key) => {
    const msg = await getMessageFromStore(key);
    return msg || { conversation: '' };
  }
});
```

### 3.2 Real-Time QR Streaming via Server-Sent Events (SSE)

Instead of polling HTTP endpoints for QR updates, the backend provides an SSE stream (`/api/whatsapp/qr-stream`).

```javascript
// Backend Route
router.get('/qr-stream', authSSE, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendUpdate = () => {
    const status = getStatus(); // returns { status: 'awaiting_qr' | 'connected', qr: 'data:image/png;base64,...' }
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
```

### 3.3 Connection State & Disconnect Handling

```javascript
sock.ev.on('connection.update', async (update) => {
  const { connection, lastDisconnect, qr } = update;

  if (qr) {
    connectionStatus = 'awaiting_qr';
    qrCode = await QRCode.toDataURL(qr);
  }

  if (connection === 'close') {
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
    const isFullyAuth = await hasPostgresAuthState('default-session');

    if (!shouldReconnect || !isFullyAuth) {
      // User explicitly unlinked device from their phone
      connectionStatus = 'disconnected';
      qrCode = null;
      sock = null;
      if (!isFullyAuth) {
        await dbService.query("DELETE FROM whatsapp_sessions WHERE id LIKE 'default-session-%'");
      }
    } else {
      // Temporary network disconnect / server redeploy: reconnect in 5 seconds
      connectionStatus = 'disconnected';
      setTimeout(() => initWhatsApp(), 5000);
    }
  } else if (connection === 'open') {
    connectionStatus = 'connected';
    qrCode = null;
  }
});
```

---

## 4. WhatsApp Inbox & Real-Time Sync Engine

### 4.1 Persistence Layer Architecture (`whatsapp.inbox.service.js`)

PostgreSQL is the single source of truth for the inbox. Every socket event is decoded, normalized, saved to PostgreSQL, and pushed to active clients via Socket.io.

```
WhatsApp Event -> unwrapMessage() -> extractContent() -> Upsert DB -> Emit Socket.io
```

#### 1. Unwrapping Nested WhatsApp Envelopes
Modern WhatsApp wraps messages in multiple envelope layers (view-once, ephemeral timer, device-sent receipts). The unwrapper recursively reaches the payload:
```javascript
const unwrapMessage = (message) => {
  if (!message) return message;
  if (message.ephemeralMessage) return unwrapMessage(message.ephemeralMessage.message);
  if (message.viewOnceMessage) return unwrapMessage(message.viewOnceMessage.message);
  if (message.viewOnceMessageV2) return unwrapMessage(message.viewOnceMessageV2.message);
  if (message.viewOnceMessageV2Extension) return unwrapMessage(message.viewOnceMessageV2Extension.message);
  if (message.documentWithCaptionMessage) return unwrapMessage(message.documentWithCaptionMessage.message);
  if (message.deviceSentMessage) return unwrapMessage(message.deviceSentMessage.message);
  return message;
};
```

#### 2. Media Decryption & Cloud Offloading
Binary media is decrypted using Baileys' `downloadMediaMessage`, uploaded to Cloudinary, and the persistent HTTPS URL is saved in `whatsapp_messages.media_url`.
```javascript
if (MEDIA_TYPES.has(type)) {
  const buffer = await downloadMediaMessage(msg, 'buffer', {}, { reuploadRequest: sock?.updateMediaMessage });
  if (buffer && buffer.length) {
    mediaUrl = await uploadMediaToCloud(buffer, type, mimetype);
  }
}
```

#### 3. Address Book Name vs. PushName Priority
WhatsApp provides two names:
- **`pushName`**: The nickname set by the sender in their own WhatsApp profile (often emojis, first names, or nicknames).
- **`name`**: The real contact name saved in the business address book.

The database stores both in `whatsapp_contacts`, ensuring the authoritative address book name always overrides the ephemeral `pushName`:
```sql
SELECT c.jid, COALESCE(c.name, ct.name, ct.push_name) AS name, ...
FROM whatsapp_chats c
LEFT JOIN whatsapp_contacts ct ON ct.jid = c.jid;
```

#### 4. The `getMessage` Store for Signal Retry Receipts
If a patient's device requests a message re-encryption receipt (or poll decryption), Baileys requires the original raw message. We store the raw JSON in PostgreSQL (`raw jsonb`) and retrieve it via `getMessageFromStore(key)`:
```javascript
export const getMessageFromStore = async (key) => {
  const res = await dbService.query('SELECT raw FROM whatsapp_messages WHERE id = $1', [key?.id]);
  if (res.rows.length && res.rows[0].raw) {
    const revived = JSON.parse(JSON.stringify(res.rows[0].raw), BufferJSON.reviver);
    return revived?.message || undefined;
  }
  return undefined;
};
```

---

## 5. Background Queue Worker & Message Dispatcher

### 5.1 Architecture of `sqliteQueue.service.js` and `whatsapp-worker.js`

To prevent high-volume operations (e.g. daily appointment reminders, PDF invoice generation) from blocking the Node.js event loop or getting dropped during temporary disconnects, messages pass through a local SQLite queue (`better-sqlite3`).

```
App Feature (Invoice Created)
         |
         v
+-------------------------------+
|  Is WhatsApp Connected Now?   |
+---------------+---------------+
        |               |
   (YES)|           (NO)|
        v               v
 [Immediate Send]   [Push to SQLite Queue]
        |               |
  (If it Fails)         v
        +-----> [Worker Polls Every 5s]
                        |
                        v
                 [Token Bucket Rate Limiter]
                        |
                        v
                 [Lazy PDF / Image Generation]
                        |
                        v
                 [Send via Baileys Socket]
                        |
                        v
                 [Record Outbound Log in Postgres]
```

### 5.2 Key Queue Features
1. **Deduplication Key (`dedupKey`)**: Prevents duplicate reminders or invoices if triggered multiple times.
2. **Token Bucket Rate Limiter**: Caps outbound throughput (e.g., 5 messages/sec) to avoid WhatsApp spam triggers and IP bans.
3. **Recipient Batching**: If multiple messages are queued for the same phone number within a few seconds, the worker automatically merges them into a single coherent message.
4. **Lazy Media Generation inside Worker**: Heavy PDF generation (e.g. rendering Puppeteer HTML or PDFKit invoices) is deferred until the worker is actively sending the job, keeping API request-response cycles ultra-fast.
5. **Stale Job Recovery**: If a worker process dies mid-send, stale `in_progress` jobs older than 5 minutes are safely reset to `pending`.

---

## 6. Gemini AI Automated Patient Bot System

### 6.1 Security Boundary: How Gemini Safely Accesses Database Data

A common architectural vulnerability is giving an AI model direct SQL query tools or raw access to the entire database. This project implements a **Deterministic Grounded Context Boundary**:

```
Inbound WhatsApp Message ("When is my next appointment?")
                      |
                      v
1. Extract Sender Phone Number from JID (Resolve @lid if needed)
                      |
                      v
2. Backend Queries Postgres ONLY for this specific Patient
   - SELECT * FROM appointments WHERE patient_id = ...
   - SELECT * FROM invoices WHERE patient_id = ...
   - SELECT * FROM prescriptions WHERE patient_id = ...
                      |
                      v
3. Construct Restricted JSON Context Object (No PHI of other patients)
                      |
                      v
4. Send Prompt + Grounded Context + Chat History -> Gemini 3.1 Flash-Lite
                      |
                      v
5. Gemini Returns Structured JSON: { reply: "...", action: "...", actionId: "..." }
                      |
                      v
6. Backend Executes Verified Action (e.g. Resend PDF Invoice) & Sends Reply
```

### 6.2 The Linked ID (`@lid`) Resolution Mechanism

WhatsApp has migrated millions of accounts to **LID (Linked ID)** addressing mode. Instead of sending messages from `919876543210@s.whatsapp.net`, WhatsApp sends them from opaque IDs like `83408281698402@lid`, which contains no phone digits.

If an application attempts to look up a patient using `@lid` digits, it will fail 100% of the time. The bot resolves `@lid` using two layers:

```javascript
const resolvePhoneJid = async (jid, phoneJidHint) => {
  // Layer 1: Fast path from message envelope (msg.key.remoteJidAlt)
  if (phoneJidHint) return phoneJidHint;

  // Layer 2: Baileys internal signal repository LID mapping
  if (!jid || !jid.endsWith('@lid')) return jid;
  try {
    const sock = getSocket();
    const pn = await sock?.signalRepository?.lidMapping?.getPNForLID(jid);
    if (pn) return pn;
  } catch (e) {
    console.warn(`[WA Bot] Failed to resolve LID ${jid}:`, e.message);
  }
  return jid;
};
```

### 6.3 Grounded Context Construction (`whatsapp.bot.service.js`)

When a message arrives, the backend retrieves verified data for only that patient:

```javascript
const buildPatientContext = async (patient) => {
  const today = new Date().toISOString().slice(0, 10);

  const [apptRes, invRes, presRes] = await Promise.all([
    dbService.query(
      `SELECT id, date, time, type, status, doctor_name, reason FROM appointments
       WHERE patient_id = $1 AND is_deleted = FALSE AND date >= $2 AND status != 'Cancelled'
       ORDER BY date ASC, time ASC LIMIT 5`,
      [patient.id, today]
    ),
    dbService.query(
      `SELECT id, created_at, total, paid_amount, status FROM invoices
       WHERE patient_id = $1 AND is_deleted = FALSE ORDER BY created_at DESC LIMIT 5`,
      [patient.id]
    ),
    dbService.query(
      `SELECT id, created_at, doctor_name, diagnosis, medicines, next_visit_date FROM prescriptions
       WHERE patient_id = $1 AND is_deleted = FALSE ORDER BY created_at DESC LIMIT 3`,
      [patient.id]
    )
  ]);

  return {
    name: patient.name,
    phone: patient.phone,
    upcomingAppointments: apptRes.rows.map(r => ({ ... })),
    recentInvoices: invRes.rows.map(r => ({ ... })),
    recentPrescriptions: presRes.rows.map(r => ({ ... }))
  };
};
```

### 6.4 Gemini System Prompt & Strict JSON Output Contract (`ai.service.js`)

The AI bot uses `gemini-3.1-flash-lite` (or standard Gemini Flash) with `response_mime_type: "application/json"`.

```javascript
const systemPrompt = `You are "Siara AI", the WhatsApp assistant for Siara Dental Clinic, replying directly to a patient over WhatsApp.
You must return the response in strict JSON format:
{
  "reply": "The exact WhatsApp message text to send back to the patient. Keep it warm, concise, and use simple WhatsApp-friendly formatting (e.g. *bold*).",
  "action": "none" | "resend_invoice" | "resend_prescription",
  "actionId": "the specific invoice or prescription id to resend, or null if action is none"
}

CLINIC INFO:
${JSON.stringify(CLINIC_INFO, null, 2)}

PATIENT RECORD (this is the ONLY patient data you may reference — it belongs to the person you are speaking with):
${JSON.stringify(patientContext, null, 2)}

CRITICAL RULES:
1. STRICT FACTS ONLY: Never invent appointment dates, invoice amounts, or medicine names. Only use what is in PATIENT RECORD.
2. NO MEDICAL DIAGNOSIS: For "how/when to take medicine" questions, only restate the instructions already present in their prescription record. If an urgent symptom is described, advise them to call ${CLINIC_INFO.phone}.
3. RESEND DOCUMENTS: If the patient asks for their invoice or prescription, set "action" accordingly and "actionId" to the relevant ID.
4. NO PHI LEAKAGE: Never mention other patients or clinic-wide data.
5. TONE: 2-5 sentences max, friendly and professional.`;
```

### 6.5 Gemini REST API Caller with Usage & Token Auditing

```javascript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${config.GEMINI_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: fullContents,
      generationConfig: {
        temperature: 0.1,
        max_output_tokens: 512,
        response_mime_type: "application/json"
      }
    })
  }
);
```

---

## 7. Frontend Real-Time Chat System

### 7.1 Architecture: TanStack Query + Socket.IO Cache Invalidation

The frontend UI is modeled after WhatsApp Web, with a two-pane responsive layout (`ChatList` on the left, `ChatThread` on the right).

```
Backend Socket.io Emits (whatsapp:new-message, whatsapp:chat-update, whatsapp:message-status)
                                      |
                                      v
           useWhatsappRealtime Hook bridges events directly into TanStack Query Cache
                                      |
       +------------------------------+------------------------------+
       |                                                             |
       v                                                             v
Updates ['wa-chats'] Query Cache              Updates ['wa-messages', chatJid] Query Cache
(Updates unread badges, last preview)         (Appends bubble, updates ticks)
```

### 7.2 Optimistic Updates & Failure Rollback (`ChatThread.tsx`)

When the user types a message and hits Send:
1. An optimistic message object with `id: temp-12345` and `status: 'sending'` is instantly appended to the UI.
2. The HTTP request `POST /api/whatsapp/chats/:jid/messages` is dispatched.
3. On success, the real message ID from Baileys replaces the temporary ID.
4. On failure, the temporary bubble is removed and a toast notification is displayed.

```typescript
const handleSend = (text: string) => {
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const optimistic: WaMessage = {
    id: tempId,
    chatJid: chat.jid,
    senderJid: null,
    fromMe: true,
    body: text,
    type: 'text',
    mediaUrl: null,
    status: 'sending',
    timestamp: Date.now(),
  };

  appendMessageToThread(queryClient, chat.jid, optimistic);

  sendMutation.mutate(text, {
    onSuccess: (res) => reconcileOptimisticId(queryClient, chat.jid, tempId, res.id),
    onError: (err) => {
      toast.error('Failed to send message');
      removeMessageFromThread(queryClient, chat.jid, tempId);
    },
  });
};
```

---

## 8. Complete Database Schemas & Migrations

### 8.1 PostgreSQL Migration Script (`schema.sql`)

```sql
-- 1. WhatsApp Auth Session State (E2E Signal keys & Master Credentials)
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wa_sessions_created ON whatsapp_sessions(created_at ASC);

-- 2. WhatsApp Chat Metadata
CREATE TABLE IF NOT EXISTS whatsapp_chats (
    jid TEXT PRIMARY KEY,                    -- e.g. 919876543210@s.whatsapp.net
    name TEXT,                               -- Custom address book name
    is_group BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,                         -- Cloudinary profile photo URL
    last_message_preview TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    unread_count INT DEFAULT 0,
    participant_count INT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wa_chats_last_msg ON whatsapp_chats(last_message_at DESC NULLS LAST);

-- 3. WhatsApp Contact Directory
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
    jid TEXT PRIMARY KEY,
    name TEXT,                               -- Authoritative address book name
    push_name TEXT,                          -- WhatsApp profile nickname
    avatar_url TEXT
);

-- 4. WhatsApp Messages (Full message history)
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id TEXT PRIMARY KEY,                     -- Baileys message key.id
    chat_jid TEXT REFERENCES whatsapp_chats(jid) ON DELETE CASCADE,
    sender_jid TEXT,
    from_me BOOLEAN,
    body TEXT,                               -- Message text or media caption
    message_type TEXT,                       -- text | image | video | audio | document | sticker
    media_url TEXT,                          -- Cloudinary CDN asset URL
    status TEXT,                             -- sent | delivered | read
    timestamp TIMESTAMP WITH TIME ZONE,
    raw JSONB                                -- Full BufferJSON payload for Signal retries
);
CREATE INDEX IF NOT EXISTS idx_wa_messages_chat_ts ON whatsapp_messages (chat_jid, timestamp DESC);

-- 5. WhatsApp AI Bot Conversation Turns (For Rate Limiting & History)
CREATE TABLE IF NOT EXISTS whatsapp_bot_messages (
    id SERIAL PRIMARY KEY,
    jid TEXT NOT NULL,
    patient_id TEXT,
    role TEXT NOT NULL,                      -- 'user' | 'assistant'
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wa_bot_msgs_jid_created ON whatsapp_bot_messages(jid, created_at DESC);

-- 6. Outbound Application Message Log (Audit trail)
CREATE TABLE IF NOT EXISTS whatsapp_message_log (
    id SERIAL PRIMARY KEY,
    phone TEXT,
    action TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'sent',
    error TEXT,
    patient_id TEXT,
    patient_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_wa_log_created ON whatsapp_message_log(created_at DESC);
```

### 8.2 SQLite Background Queue Schema

```sql
CREATE TABLE IF NOT EXISTS queues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,                        -- 'text' | 'media' | 'background'
  action TEXT NOT NULL,                      -- 'sendWelcome', 'sendInvoice', etc.
  payload TEXT,                              -- JSON encoded payload
  dedup_key TEXT,                            -- Unique deduplication identifier
  jid TEXT,                                  -- Recipient JID for batching
  status TEXT NOT NULL DEFAULT 'pending',    -- 'pending' | 'in_progress' | 'done' | 'failed'
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  run_at INTEGER,                            -- Epoch MS execution time
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_queues_type_status_runat ON queues(type, status, run_at, created_at);
CREATE INDEX IF NOT EXISTS idx_queues_jid ON queues(jid, type, status);
```

---

## 9. Step-by-Step Implementation Guide for New Projects

To replicate this exact technology stack in a brand new project, follow this checklist:

### Step 1: Install Core Dependencies
```bash
# Backend dependencies
npm install @whiskeysockets/baileys qrcode better-sqlite3 jsonwebtoken socket.io cloudinary dotenv pg

# Frontend dependencies
npm install @tanstack/react-query socket.io-client lucide-react sonner
```

### Step 2: Environment Configuration (`.env`)
```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# Google Gemini AI
GEMINI_API_KEY=AIzaSy...

# Cloudinary (Media Hosting)
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=your_secret

# Security & Limits
AUTH_SECRET=your_jwt_secret_key
WA_BOT_RATE_LIMIT_PER_HOUR=20
WA_ENABLE_INBOX_PERSIST=true
```

### Step 3: Deployment Best Practices & Pitfalls to Avoid
1. **Never use local disk for session state**: Always route Baileys through `usePostgresAuthState`.
2. **Always prune Signal keys**: Keep a maximum of 200–500 keys in `whatsapp_sessions` to prevent table bloat.
3. **Always handle `@lid` addresses**: Look up real phone numbers via `remoteJidAlt` or `lidMapping`.
4. **Never give Gemini direct database access**: Build a localized, JSON-grounded context object in Node.js first, then pass it to the model with strict formatting constraints.
5. **Always use structured JSON output for AI tools**: Use `response_mime_type: "application/json"` with an explicit `action` and `actionId` schema rather than parsing raw text.
6. **Guard queue worker ticks**: Use an execution lock (`guarded = (fn) => ...`) to ensure slow outbound sends never trigger duplicate concurrent worker runs.

---
*Documented and certified from production implementation.*
