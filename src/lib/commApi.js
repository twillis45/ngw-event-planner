// ─── Communication API client (FastAPI backend) ───────────────────────────────
// Talks to the FastAPI service at REACT_APP_API_BASE_URL. When unset, the app
// keeps using its localStorage comms — isCommApiConfigured() is false and nothing
// here is called. UI wiring is deferred until the backend is deployed + testable.
//
// Sprint 58.2: channel type mapping, capabilities endpoint, email delivery fields.
// Sprint 64: stripe_configured added to capabilities, forwarded to stripeApi.
//
// The planner token is a TEMPORARY dev gate (matches backend PLANNER_DEV_TOKEN)
// until Supabase Auth is wired. It is sent as X-Planner-Token.
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { setStripeConfigured } from './stripeApi';

const BASE  = process.env.REACT_APP_API_BASE_URL;
const TOKEN = process.env.REACT_APP_PLANNER_TOKEN; // transition fallback only

export const isCommApiConfigured = () => Boolean(BASE);

// Whether planner-gated writes can be authenticated at all (Supabase sign-in or
// the legacy shared token). UI uses this to decide read-only vs. writable.
export const canAuthenticatePlanner = () => isSupabaseConfigured() || Boolean(TOKEN);

// ── Channel type mapping ─────────────────────────────────────────────────────
// Frontend uses lowercase short names ('client', 'vendor', 'team'). The backend
// expects the canonical channel_type enum ('CLIENT', 'INTERNAL_TEAM'). Vendor
// messages go through the CLIENT channel (vendor is a thread-level concept, not
// a separate backend channel).
const CHANNEL_MAP = {
  client:   'CLIENT',
  vendor:   'CLIENT',
  team:     'INTERNAL_TEAM',
  internal: 'INTERNAL_TEAM',
  // Pass-through if already uppercase
  CLIENT:        'CLIENT',
  INTERNAL_TEAM: 'INTERNAL_TEAM',
};
const mapChannel = (ch) => CHANNEL_MAP[ch] || 'CLIENT';

// Build auth headers per request: prefer the signed-in Supabase session, fall
// back to the shared dev token during the auth rollout.
async function authHeaders() {
  const headers = {};
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch { /* fall through to token */ }
  }
  if (TOKEN) headers['X-Planner-Token'] = TOKEN;
  return headers;
}

const req = async (method, path, body) => {
  if (!BASE) throw new Error('Comm API not configured');
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Comm API ${method} ${path} → ${res.status}`);
  return res.status === 204 ? null : res.json();
};

const base = (eventId) => `/api/events/${encodeURIComponent(eventId)}/communication`;

// ── Capabilities cache ───────────────────────────────────────────────────────
// Sprint 58.2: one-shot fetch of backend capabilities so the frontend knows
// whether email delivery is available. Cached per session.
let _capCache = null;
let _capPromise = null;

export const getCapabilities = async () => {
  if (_capCache) return _capCache;
  if (_capPromise) return _capPromise;
  if (!BASE) return { email_configured: false };
  _capPromise = (async () => {
    try {
      const res = await fetch(`${BASE}/api/capabilities`);
      if (!res.ok) return { email_configured: false };
      const data = await res.json();
      _capCache = data;
      if (data.stripe_configured) setStripeConfigured(true);
      return data;
    } catch {
      return { email_configured: false };
    } finally {
      _capPromise = null;
    }
  })();
  return _capPromise;
};

// Synchronous check — returns cached value or false if not yet fetched.
// Callers that need a guaranteed result should await getCapabilities() first.
export const isEmailConfigured = () => _capCache?.email_configured ?? false;

// ── Sprint 58P.4c — Public client-portal approval response ──────────────────
// Posts the client's approve/reject verdict directly. NO auth headers — the
// portal_token in the body is the credential (matched against
// metadata.portal_token persisted on the approval_request message at create
// time). Throws on non-2xx so the caller can fall back to localStorage and
// surface honest "saved on this device only" copy.
export const portalRespond = async (eventId, messageId, payload) => {
  if (!BASE) throw new Error('Comm API not configured');
  const res = await fetch(
    `${BASE}${base(eventId)}/messages/${encodeURIComponent(messageId)}/portal-respond`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.detail || `portal-respond ${res.status}`;
    const e = new Error(msg);
    e.status = res.status;
    throw e;
  }
  return res.json();
};

export const commApi = {
  listChannels:   (eventId)                       => req('GET',  `${base(eventId)}/channels`),
  ensureChannels: (eventId)                       => req('POST', `${base(eventId)}/channels/ensure`),
  listMessages:   (eventId, channelType, limit=100) => req('GET', `${base(eventId)}/channels/${mapChannel(channelType)}/messages?limit=${limit}`),
  createMessage:  (eventId, channelType, msg)     => req('POST', `${base(eventId)}/channels/${mapChannel(channelType)}/messages`, msg),
  updateMessage:  (eventId, messageId, patch)     => req('PATCH', `${base(eventId)}/messages/${messageId}`, patch),
  deleteMessage:  (eventId, messageId)            => req('DELETE', `${base(eventId)}/messages/${messageId}`),
  pinMessage:     (eventId, messageId, opts={})   => req('POST', `${base(eventId)}/messages/${messageId}/pin`, opts),
  unpinMessage:   (eventId, messageId)            => req('DELETE', `${base(eventId)}/messages/${messageId}/pin`),
  markRead:       (eventId, channelType, readerKey) => req('POST', `${base(eventId)}/channels/${mapChannel(channelType)}/read`, { reader_key: readerKey }),
  // Sprint 58P.4c — public portal verdict path; no planner auth.
  portalRespond,
  getCapabilities,
};
