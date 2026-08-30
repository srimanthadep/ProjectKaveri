import { claimNextJob, completeJob, failJob, recoverStaleJobs } from './queueService.js';
import { TokenBucket } from './rateLimiter.js';
import { sendTextMessage, getStatus } from '../whatsapp/connection.js';
import { logOutboundMessage } from './messageLog.js';

const MAX_ATTEMPTS = 5;
const TICK_MS = 2000;

const bucket = new TokenBucket({ capacity: 5, refillPerSecond: 5 });

let ticking = false;

/**
 * Ensures overlapping ticks never run concurrently — if a send is slow
 * (large media, slow network), the next setInterval tick waits rather than
 * starting a second concurrent drain of the same queue.
 */
function guarded(fn) {
  return async (...args) => {
    if (ticking) return;
    ticking = true;
    try {
      await fn(...args);
    } finally {
      ticking = false;
    }
  };
}

async function processJob(job) {
  const { jid, action, payload } = job;

  if (action === 'send_text') {
    await sendTextMessage(jid, payload.text);
    logOutboundMessage({ phone: jid, action, message: payload.text, status: 'sent' });
    return;
  }

  throw new Error(`Unknown queue action: ${action}`);
}

const tick = guarded(async () => {
  recoverStaleJobs();

  if (getStatus().status !== 'connected') return; // nothing we can send right now

  // Drain as many jobs as the bucket allows in this tick, rather than one
  // job per tick, so a backlog clears promptly once connected.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (!bucket.tryConsume()) break;
    const job = claimNextJob();
    if (!job) break;

    try {
      await processJob(job);
      completeJob(job.id);
    } catch (err) {
      const permanent = job.attempts + 1 >= MAX_ATTEMPTS;
      failJob(job.id, err.message, { permanent });
      logOutboundMessage({
        phone: job.jid,
        action: job.action,
        message: JSON.stringify(job.payload),
        status: 'failed',
        error: err.message,
      });
      console.error(`[queue] job ${job.id} (${job.action}) failed:`, err.message);
    }
  }
});

let intervalHandle = null;

export function startWorker() {
  if (intervalHandle) return;
  intervalHandle = setInterval(() => {
    tick().catch((err) => console.error('[queue] tick error:', err));
  }, TICK_MS);
  console.log('[queue] worker started.');
}

export function stopWorker() {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = null;
}
