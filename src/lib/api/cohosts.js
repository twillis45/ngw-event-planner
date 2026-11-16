// Per-event co-hosts (owner ruling 11/16/2026). See backend/app/routers/cohosts.py
// and supabase/migrations/026_event_cohosts.sql.
import { authHeaders } from '../apiAuth';

const BASE = process.env.REACT_APP_API_BASE_URL;
const enc = encodeURIComponent;

export const isCohostApiConfigured = () => Boolean(BASE);

async function call(path, init = {}) {
  if (!BASE) return { ok: false, status: 0, reason: 'not-configured' };
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(await authHeaders()), ...(init.headers || {}) } });
    let body = null;
    try { body = await res.json(); } catch { body = null; }
    if (!res.ok) return { ok: false, status: res.status, reason: (body && body.detail) || 'unavailable' };
    return { ok: true, ...(body || {}) };
  } catch {
    return { ok: false, status: 0, reason: 'unavailable' };
  }
}

/** → { ok, cohosts: [{ id, email, status: 'invited'|'joined' }] } */
export const listCohosts = (eventId) => call(`/api/events/${enc(eventId)}/cohosts`);

/** → { ok, cohosts, emailed, already_invited } | { ok:false, status, reason } (reason is the server's own sentence) */
export const inviteCohost = (eventId, email) => call(`/api/events/${enc(eventId)}/cohosts`, { method: 'POST', body: JSON.stringify({ email }) });

/** The host removes a co-host, or a co-host removes themselves. */
export const removeCohost = (eventId, cohostId) => call(`/api/events/${enc(eventId)}/cohosts/${enc(cohostId)}`, { method: 'DELETE' });

/** On sign-in: invites to this person's confirmed email become theirs. → { ok, events: [eventId] } */
export const claimCohostInvites = () => call('/api/cohosts/claim', { method: 'POST' });

/** A co-host leaves the event themselves. */
export const leaveCohostedEvent = (eventId) => call(`/api/events/${enc(eventId)}/cohosts/me`, { method: 'DELETE' });
