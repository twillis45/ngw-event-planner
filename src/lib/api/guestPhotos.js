// ─── Guest photos API client (owner request 11/16/2026) ──────────────────────
// Talks to the FastAPI service at REACT_APP_API_BASE_URL. Mirrors
// api/helperLink.js and api/rsvp.js. Server: backend/app/routers/guest_photos.py.
//
// Guest endpoints (no sign-in; the credential is the invite code plus the
// device key this browser minted for its RSVP — pass rsvpIdempotencyKey's
// value as guestKey):
//   POST /api/public/photos/{code}                    → upload one photo
//   POST /api/public/photos/{code}/mine               → her own photos + status
//   POST /api/public/photos/{code}/{photoId}/delete   → delete one of her own
//   GET  /api/public/photos/{code}                    → host-APPROVED photos only
//   POST /api/public/photos/{code}/privacy            → "Keep my photos private to this event"
// Host endpoints (the signed-in Supabase session):
//   GET    /api/events/{id}/guest-photos              → every photo, with status
//   POST   /api/events/{id}/guest-photos/{pid}/approve
//   POST   /api/events/{id}/guest-photos/{pid}/hide
//   POST   /api/events/{id}/guest-photos/{pid}/sharing → "Don't allow sharing" (allowed: false)
//   DELETE /api/events/{id}/guest-photos/{pid}
//
// WHAT THE SERVER DECIDES, so a page never claims otherwise: uploads open at
// the event's end in the guest's local time (this phone's offset rides every
// call) and close 90 days after the last day (uploadsOpen on fetchMyGuestPhotos
// says which); every photo starts "pending" and only the host's approval shows
// it to other guests; the stored copy is a re-encoded sRGB JPEG with all
// metadata (location included) removed. HEIC is refused (415). `shareable` on
// a photo is the only permission for a Share button: approved, and neither the
// uploader nor the host kept it back (board 11/16, option C).
//
// Photo URLs are signed and last about five minutes: refetch the list to
// refresh them; never store one.
//
// Writes THROW with e.status, so a page never says "Shared" for a photo the
// server refused. Reads return a named result, so a refused request is never
// shown as an empty album.
import { authHeaders, isSignedIn } from '../apiAuth';

const BASE = process.env.REACT_APP_API_BASE_URL;
const enc = encodeURIComponent;
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const isGuestPhotosApiConfigured = () => Boolean(BASE);

// This phone's offset in minutes west of UTC (JS's own sign). The server uses
// it to open uploads at the event's end, local time.
const localOffset = () => { try { return new Date().getTimezoneOffset(); } catch { return null; } };

async function throwing(url, init) {
  if (!BASE) throw new Error('Guest photos API not configured');
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e = new Error((err && typeof err.detail === 'string' && err.detail) || `guestPhotos ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return res.json();
}

// ── Guest ──────────────────────────────────────────────────────────────────────
// file: a File/Blob from an <input type="file">. → { ok, photo: { id, status: 'pending', created_at, url } }
// Throws: 403 not open (before the event / closed), 404 bad code, 413 over 10 MB,
// 415 not a JPEG/PNG/WEBP (HEIC included), 422 no name, 429 a cap or too fast,
// 503 photo sharing not switched on.
// keepPrivate: "Keep my photos private to this event" as she set it.
export function uploadGuestPhoto(code, { guestKey, name, file, tzOffsetMin = localOffset(), keepPrivate = false }) {
  return throwing(`${BASE}/api/public/photos/${enc(code)}`, {
    method: 'POST',
    headers: {
      // The server reads the bytes to decide what the file is; this is only a claim.
      'Content-Type': (file && file.type) || 'image/jpeg',
      'X-Guest-Key': guestKey || '',
      'X-Guest-Name': enc(name || ''),
      'X-Guest-Tz-Offset': String(tzOffsetMin == null ? '' : tzOffsetMin),
      'X-Guest-Private': keepPrivate ? '1' : '0',
    },
    body: file,
  });
}

//   { ok: true, photos: [{ id, status, created_at, url, shareable }], remaining, uploadsOpen, keepPrivate }
//   { ok: false, reason: 'not-configured' | 'not-found' | 'unavailable' }
export async function fetchMyGuestPhotos(code, guestKey, { tzOffsetMin = localOffset() } = {}) {
  if (!BASE || !code || !guestKey) return { ok: false, reason: 'not-configured' };
  try {
    const body = Number.isInteger(tzOffsetMin) ? { guest_key: guestKey, tz_offset_min: tzOffsetMin } : { guest_key: guestKey };
    const res = await fetch(`${BASE}/api/public/photos/${enc(code)}/mine`, {
      method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body),
    });
    if (res.status === 404) return { ok: false, reason: 'not-found' };
    if (!res.ok) return { ok: false, reason: 'unavailable' };
    const data = await res.json();
    return {
      ok: true,
      photos: Array.isArray(data && data.photos) ? data.photos : [],
      remaining: data && typeof data.remaining === 'number' ? data.remaining : 0,
      uploadsOpen: Boolean(data && data.uploads_open),
      keepPrivate: Boolean(data && data.keep_private),
    };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

// → { ok: true, deleted: true }, or { ok: true, deleted: false } when it was
// not hers or is already gone (404). Throws on any other failure.
export async function deleteMyGuestPhoto(code, guestKey, photoId) {
  try {
    return await throwing(`${BASE}/api/public/photos/${enc(code)}/${enc(photoId)}/delete`, {
      method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ guest_key: guestKey }),
    });
  } catch (e) {
    if (e.status === 404) return { ok: true, deleted: false };
    throw e;
  }
}

//   { ok: true, photos: [{ id, url, created_at, shareable }] }   — approved only, no names
//   { ok: false, reason: 'not-configured' | 'not-found' | 'unavailable' }
export async function fetchApprovedGuestPhotos(code) {
  if (!BASE || !code) return { ok: false, reason: 'not-configured' };
  try {
    const res = await fetch(`${BASE}/api/public/photos/${enc(code)}`);
    if (res.status === 404) return { ok: false, reason: 'not-found' };
    if (!res.ok) return { ok: false, reason: 'unavailable' };
    const data = await res.json();
    return { ok: true, photos: Array.isArray(data && data.photos) ? data.photos : [] };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

// "Keep my photos private to this event": on, no Share button on any of her
// photos, anywhere. → { ok, private }. Throws (404: wrong code).
export function setMyPhotosPrivate(code, guestKey, isPrivate) {
  return throwing(`${BASE}/api/public/photos/${enc(code)}/privacy`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ guest_key: guestKey, private: Boolean(isPrivate) }),
  });
}

// ── Host ───────────────────────────────────────────────────────────────────────
//   { ok: true, photos: [{ id, guest_name, status, created_at, reviewed_at, width, height, url,
//                          uploader_private, share_blocked, shareable }], eventMax }
//   { ok: false, reason: 'not-configured' | 'signed-out' | 'forbidden' | 'unavailable' }
export async function fetchEventGuestPhotos(eventId) {
  if (!BASE || !eventId) return { ok: false, reason: 'not-configured' };
  if (!(await isSignedIn())) return { ok: false, reason: 'signed-out' };
  try {
    const res = await fetch(`${BASE}/api/events/${enc(eventId)}/guest-photos`, { headers: await authHeaders() });
    if (res.status === 401) return { ok: false, reason: 'signed-out' };
    if (res.status === 403) return { ok: false, reason: 'forbidden' };
    if (!res.ok) return { ok: false, reason: 'unavailable' };
    const data = await res.json();
    return { ok: true, photos: Array.isArray(data && data.photos) ? data.photos : [],
      eventMax: data && typeof data.event_max === 'number' ? data.event_max : null };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

// → { ok, photo }. Throws: 401, 403, 404 (not on this event).
export async function approveGuestPhoto(eventId, photoId) {
  if (!BASE) throw new Error('Guest photos API not configured');
  return throwing(`${BASE}/api/events/${enc(eventId)}/guest-photos/${enc(photoId)}/approve`,
    { method: 'POST', headers: await authHeaders() });
}

export async function hideGuestPhoto(eventId, photoId) {
  if (!BASE) throw new Error('Guest photos API not configured');
  return throwing(`${BASE}/api/events/${enc(eventId)}/guest-photos/${enc(photoId)}/hide`,
    { method: 'POST', headers: await authHeaders() });
}

// "Don't allow sharing" on one photo (allowed: false), or allow it again.
// It never changes who can SEE it. → { ok, photo }. Throws: 401, 403, 404.
export async function setGuestPhotoSharing(eventId, photoId, allowed) {
  if (!BASE) throw new Error('Guest photos API not configured');
  return throwing(`${BASE}/api/events/${enc(eventId)}/guest-photos/${enc(photoId)}/sharing`,
    { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ allowed: Boolean(allowed) }) });
}

// → { ok, deleted: true }. Throws: 401, 403, 404, 502 (the file was not removed; retry).
export async function deleteGuestPhoto(eventId, photoId) {
  if (!BASE) throw new Error('Guest photos API not configured');
  return throwing(`${BASE}/api/events/${enc(eventId)}/guest-photos/${enc(photoId)}`,
    { method: 'DELETE', headers: await authHeaders() });
}
