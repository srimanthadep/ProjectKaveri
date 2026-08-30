import { BufferJSON, initAuthCreds, proto } from '@whiskeysockets/baileys';
import { db } from '../db.js';

const MAX_SIGNAL_KEYS = 200;

const upsertStmt = db.prepare(`
  INSERT INTO whatsapp_sessions (id, data, created_at, updated_at)
  VALUES (@id, @data, strftime('%s','now'), strftime('%s','now'))
  ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = strftime('%s','now')
`);
const selectStmt = db.prepare(`SELECT data FROM whatsapp_sessions WHERE id = ?`);
const deleteStmt = db.prepare(`DELETE FROM whatsapp_sessions WHERE id = ?`);
const deleteAllForSessionStmt = db.prepare(`DELETE FROM whatsapp_sessions WHERE id LIKE ?`);
const countNonCredsStmt = db.prepare(
  `SELECT COUNT(*) AS n FROM whatsapp_sessions WHERE id LIKE ? AND id NOT LIKE ?`
);
const oldestNonCredsIdsStmt = db.prepare(`
  SELECT id FROM whatsapp_sessions
  WHERE id LIKE ? AND id NOT LIKE ?
  ORDER BY created_at ASC
  LIMIT ?
`);

function writeKey(sessionId, id, value) {
  if (value === null || value === undefined) {
    deleteStmt.run(`${sessionId}-${id}`);
    return;
  }
  const json = JSON.stringify(value, BufferJSON.replacer);
  upsertStmt.run({ id: `${sessionId}-${id}`, data: json });
}

function readKey(sessionId, id) {
  const row = selectStmt.get(`${sessionId}-${id}`);
  if (!row) return null;
  return JSON.parse(row.data, BufferJSON.reviver);
}

/**
 * Prunes old Signal pre-keys / session keys down to MAX_SIGNAL_KEYS, leaving
 * the `-creds` row untouched (it holds the master identity and must never be
 * deleted). Without this, Baileys generates a new row per pre-key and the
 * table grows unbounded over weeks of operation.
 */
function pruneOldSignalKeys(sessionId) {
  const credsLike = `${sessionId}-creds`;
  const prefix = `${sessionId}-%`;
  const { n: total } = countNonCredsStmt.get(prefix, credsLike);

  if (total > MAX_SIGNAL_KEYS) {
    const excess = total - MAX_SIGNAL_KEYS;
    const rows = oldestNonCredsIdsStmt.all(prefix, credsLike, excess);
    const del = db.prepare(`DELETE FROM whatsapp_sessions WHERE id = ?`);
    const tx = db.transaction((ids) => {
      for (const { id } of ids) del.run(id);
    });
    tx(rows);
    if (rows.length > 0) {
      console.log(`[whatsapp:auth] pruned ${rows.length} old signal keys for ${sessionId}`);
    }
  }
}

/**
 * SQLite-backed replacement for Baileys' default `useMultiFileAuthState`.
 * Keeps credentials and Signal keys in the local database instead of on
 * disk, so a container/process restart never forces a QR re-scan as long as
 * the database file persists.
 */
export async function useSqliteAuthState(sessionId = 'default-session') {
  pruneOldSignalKeys(sessionId);

  const creds = readKey(sessionId, 'creds') ?? initAuthCreds();

  const keys = {
    get: async (type, ids) => {
      const data = {};
      for (const id of ids) {
        let value = readKey(sessionId, `${type}-${id}`);
        if (type === 'app-state-sync-key' && value) {
          value = proto.Message.AppStateSyncKeyData.fromObject(value);
        }
        data[id] = value;
      }
      return data;
    },
    set: async (data) => {
      const tx = db.transaction(() => {
        for (const category of Object.keys(data)) {
          for (const id of Object.keys(data[category])) {
            const value = data[category][id];
            writeKey(sessionId, `${category}-${id}`, value);
          }
        }
      });
      tx();
      pruneOldSignalKeys(sessionId);
    },
  };

  return {
    state: { creds, keys },
    saveCreds: async () => writeKey(sessionId, 'creds', creds),
  };
}

/** True only if a phone has actually completed pairing (creds.me is set). */
export function hasSqliteAuthState(sessionId = 'default-session') {
  const creds = readKey(sessionId, 'creds');
  return Boolean(creds && creds.me);
}

/** Wipes every stored key for a session — used on explicit logout / unlink. */
export function clearSqliteAuthState(sessionId = 'default-session') {
  deleteAllForSessionStmt.run(`${sessionId}-%`);
}
