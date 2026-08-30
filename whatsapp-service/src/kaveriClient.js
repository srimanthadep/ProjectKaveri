import { config } from './config.js';

/**
 * HTTP client for the Kaveri FastAPI backend. This is the ONLY way the
 * WhatsApp service ever touches guest, booking, or payment data — there is
 * no direct database connection to the Kaveri schema. The service
 * authenticates as a dedicated owner-role service account (seeded by
 * backend/init_db.py) so it can resolve guests across all three
 * properties, but every call still goes through the same RBAC-enforced
 * REST API a browser would use.
 */
let accessToken = null;
let refreshToken = null;
let tokenExpiresAt = 0;

async function login() {
  const res = await fetch(`${config.kaveriApiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: config.serviceEmail, password: config.servicePassword }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`[kaveriClient] service login failed (${res.status}): ${detail}`);
  }
  const data = await res.json();
  accessToken = data.access_token;
  refreshToken = data.refresh_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000 - 15_000; // refresh 15s early
  console.log('[kaveriClient] authenticated as service account.');
}

async function refreshAccessToken() {
  if (!refreshToken) return login();
  const res = await fetch(`${config.kaveriApiUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    // Refresh token expired/revoked — fall back to a fresh login.
    return login();
  }
  const data = await res.json();
  accessToken = data.access_token;
  refreshToken = data.refresh_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000 - 15_000;
}

async function ensureAuthenticated() {
  if (!accessToken) return login();
  if (Date.now() >= tokenExpiresAt) return refreshAccessToken();
}

async function apiFetch(pathname, options = {}, { retried = false } = {}) {
  await ensureAuthenticated();

  const res = await fetch(`${config.kaveriApiUrl}${pathname}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401 && !retried) {
    // Access token was invalidated server-side (e.g. account deactivated
    // mid-session) — force a fresh login once, then give up.
    await login();
    return apiFetch(pathname, options, { retried: true });
  }

  return res;
}

/** Looks up a guest by WhatsApp phone number. Returns null if no match. */
export async function resolveGuestByPhone(phone) {
  if (!phone) return null;
  const res = await apiFetch(`/guests?phone=${encodeURIComponent(phone)}&limit=1`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.items?.[0] ?? null;
}

/** Fetches a guest's most relevant bookings (upcoming first) for bot context. */
export async function getGuestBookings(guestId, { limit = 5 } = {}) {
  const res = await apiFetch(`/bookings?guest_id=${guestId}&limit=${limit}&sort=-check_in`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? [];
}

/** Fetches payments recorded against a specific booking. */
export async function getBookingPayments(bookingId) {
  const res = await apiFetch(`/bookings/${bookingId}/payments`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? data ?? [];
}

/** Fetches a single booking by id (used to build "resend voucher" replies). */
export async function getBooking(bookingId) {
  const res = await apiFetch(`/bookings/${bookingId}`);
  if (!res.ok) return null;
  return res.json();
}
