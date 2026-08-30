import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';

fs.mkdirSync(path.dirname(path.resolve(config.dbPath)), { recursive: true });
fs.mkdirSync(path.resolve(config.mediaDir), { recursive: true });

export const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
// Schema. SQLite equivalents of the reference architecture's PostgreSQL
// tables — same shapes, adapted to a single-file embedded store so this
// service has no external database dependency beyond the FastAPI backend
// it calls for guest/booking data.
// ---------------------------------------------------------------------------
db.exec(`
  -- 1. WhatsApp auth session state (Signal keys & master credentials).
  CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_wa_sessions_created ON whatsapp_sessions(created_at ASC);

  -- 2. Chat metadata (one row per conversation thread).
  CREATE TABLE IF NOT EXISTS whatsapp_chats (
    jid TEXT PRIMARY KEY,
    name TEXT,
    is_group INTEGER NOT NULL DEFAULT 0,
    avatar_url TEXT,
    last_message_preview TEXT,
    last_message_at INTEGER,
    unread_count INTEGER NOT NULL DEFAULT 0,
    guest_id INTEGER,
    guest_name TEXT,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_wa_chats_last_msg ON whatsapp_chats(last_message_at DESC);

  -- 3. Contact directory (address book name vs. WhatsApp pushName).
  CREATE TABLE IF NOT EXISTS whatsapp_contacts (
    jid TEXT PRIMARY KEY,
    name TEXT,
    push_name TEXT,
    avatar_url TEXT
  );

  -- 4. Full message history.
  CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id TEXT PRIMARY KEY,
    chat_jid TEXT NOT NULL REFERENCES whatsapp_chats(jid) ON DELETE CASCADE,
    sender_jid TEXT,
    from_me INTEGER NOT NULL DEFAULT 0,
    body TEXT,
    message_type TEXT NOT NULL DEFAULT 'text',
    media_url TEXT,
    status TEXT NOT NULL DEFAULT 'sent',
    timestamp INTEGER NOT NULL,
    raw TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_wa_messages_chat_ts ON whatsapp_messages(chat_jid, timestamp DESC);

  -- 5. AI bot conversation turns (history + rate limiting).
  CREATE TABLE IF NOT EXISTS whatsapp_bot_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jid TEXT NOT NULL,
    guest_id INTEGER,
    role TEXT NOT NULL,
    message TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_wa_bot_msgs_jid_created ON whatsapp_bot_messages(jid, created_at DESC);

  -- 6. Outbound audit log (booking confirmations, broadcasts, etc).
  CREATE TABLE IF NOT EXISTS whatsapp_message_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT,
    action TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'sent',
    error TEXT,
    guest_id INTEGER,
    guest_name TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_wa_log_created ON whatsapp_message_log(created_at DESC);

  -- 7. Background send queue.
  CREATE TABLE IF NOT EXISTS queues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    action TEXT NOT NULL,
    payload TEXT,
    dedup_key TEXT,
    jid TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    run_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_queues_type_status_runat ON queues(type, status, run_at, created_at);
  CREATE INDEX IF NOT EXISTS idx_queues_jid ON queues(jid, type, status);
  CREATE UNIQUE INDEX IF NOT EXISTS uq_queues_dedup ON queues(dedup_key) WHERE dedup_key IS NOT NULL;
`);

export default db;
