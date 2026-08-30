import { db } from '../db.js';

const insertStmt = db.prepare(`
  INSERT INTO queues (type, action, payload, dedup_key, jid, status, attempts, run_at, created_at, updated_at)
  VALUES (@type, @action, @payload, @dedup_key, @jid, 'pending', 0, @run_at, @now, @now)
`);

const claimStmt = db.prepare(`
  UPDATE queues SET status = 'in_progress', updated_at = @now
  WHERE id = (
    SELECT id FROM queues
    WHERE status = 'pending' AND (run_at IS NULL OR run_at <= @now)
    ORDER BY created_at ASC
    LIMIT 1
  )
  RETURNING *
`);

const completeStmt = db.prepare(`UPDATE queues SET status = 'done', updated_at = @now WHERE id = @id`);
const failStmt = db.prepare(`
  UPDATE queues SET status = @status, attempts = attempts + 1, last_error = @error, updated_at = @now
  WHERE id = @id
`);
const resetStaleStmt = db.prepare(`
  UPDATE queues SET status = 'pending', updated_at = @now
  WHERE status = 'in_progress' AND updated_at < @cutoff
`);

/**
 * Enqueues a send/background job. `dedupKey`, if provided, is enforced by a
 * unique index — a second enqueue with the same key is a silent no-op
 * (returns without inserting), preventing duplicate reminders if a caller
 * retries after a timeout.
 */
export function enqueue({ type, action, payload = {}, dedupKey = null, jid = null, delayMs = 0 }) {
  const now = Date.now();
  try {
    insertStmt.run({
      type,
      action,
      payload: JSON.stringify(payload),
      dedup_key: dedupKey,
      jid,
      run_at: delayMs > 0 ? now + delayMs : null,
      now,
    });
    return true;
  } catch (err) {
    if (String(err.message).includes('UNIQUE constraint failed')) {
      return false; // duplicate dedupKey — already queued or already sent
    }
    throw err;
  }
}

/** Atomically claims the next eligible pending job, or null if none are ready. */
export function claimNextJob() {
  const row = claimStmt.get({ now: Date.now() });
  if (!row) return null;
  return { ...row, payload: row.payload ? JSON.parse(row.payload) : {} };
}

export function completeJob(id) {
  completeStmt.run({ id, now: Date.now() });
}

export function failJob(id, error, { permanent = false } = {}) {
  failStmt.run({ id, error: String(error), status: permanent ? 'failed' : 'pending', now: Date.now() });
}

/** Resets jobs stuck in-progress for longer than `maxAgeMs` back to pending — recovers from a worker crash mid-send. */
export function recoverStaleJobs(maxAgeMs = 5 * 60 * 1000) {
  resetStaleStmt.run({ cutoff: Date.now() - maxAgeMs, now: Date.now() });
}
