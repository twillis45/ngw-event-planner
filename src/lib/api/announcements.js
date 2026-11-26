// ─── Announcements API client (11/16/2026; server: backend/app/routers/announcements.py) ─
// Host (signed-in session):
//   GET    /api/events/{id}/announcements        → { announcements, limits, email_guests }
//   POST   /api/events/{id}/announcements        → post one (3 a day, 20 per event)
//   DELETE /api/events/{id}/announcements/{aid}  → take it off the invite
// Invite (no sign-in): GET /api/public/announcements/{code} → [{ body, created_at }]
//
// Reads return a named result (a refusal is never shown as "no updates");
// posting returns { ok:false, status, reason } with the server's own sentence,
// so a limit is said in the server's words.
import { authHeaders, isSignedIn } from '../apiAuth';

const BASE = process.env.REACT_APP_API_BASE_URL;
const enc = encodeURIComponent;

export const isAnnouncementsApiConfigured = () => Boolean(BASE);

async function call(path, init = {}, auth = true) {
  if (!BASE) return { ok: false, status: 0, reason: 'not-configured' };
  if (auth && !(await isSignedIn())) return { ok: false, status: 401, reason: 'signed-out' };
  try {
    const headers = { 'Content-Type': 'application/json', ...(auth ? await authHeaders() : {}) };
    const res = await fetch(`${BASE}${path}`, { ...init, headers });
    let body = null;
    try { body = await res.json(); } catch { body = null; }
    if (!res.ok) {
      const reason = res.status === 401 ? 'signed-out' : res.status === 403 ? 'forbidden'
        : (body && typeof body.detail === 'string' && body.detail) || 'unavailable';
      return { ok: false, status: res.status, reason };
    }
    return { ok: true, ...(body || {}) };
  } catch {
    return { ok: false, status: 0, reason: 'unavailable' };
  }
}

export const listAnnouncements = (eventId) => call(`/api/events/${enc(eventId)}/announcements`);
export const postAnnouncement = (eventId, body) => call(`/api/events/${enc(eventId)}/announcements`, { method: 'POST', body: JSON.stringify({ body }) });
export const removeAnnouncement = (eventId, id) => call(`/api/events/${enc(eventId)}/announcements/${enc(id)}`, { method: 'DELETE' });
export const fetchInviteAnnouncements = (code) => call(`/api/public/announcements/${enc(code)}`, {}, false);
