// ─── The host's photo (owner, 11/24/2026: renders r3-2, r3-3, r3-4) ──────────
// One photo per account, opt-in. Server: backend/app/routers/host_photos.py.
//   POST   /api/host-photo                    the cropped JPEG as the body → { version }
//   GET    /api/host-photo                    her own photo, for her screens
//   DELETE /api/host-photo                    the file is deleted
//   GET    /api/public/host-photo/{code}?v=   a guest's invite, by invite code
// The profile keeps ONLY the version (profile.hostPhoto); never the image.
// Writes THROW with e.status, so a screen never says "Saved" for a photo the
// server refused.
import { authHeaders } from '../apiAuth';

const BASE = process.env.REACT_APP_API_BASE_URL;
const enc = encodeURIComponent;

export const isHostPhotoApiConfigured = () => Boolean(BASE);

async function throwing(res) {
  if (res.ok) return res;
  const err = await res.json().catch(() => ({}));
  const e = new Error((err && typeof err.detail === 'string' && err.detail) || `hostPhoto ${res.status}`);
  e.status = res.status;
  throw e;
}

/** blob: a square JPEG. → { ok, version } */
export async function uploadHostPhoto(blob) {
  if (!BASE) throw new Error('Host photo API not configured');
  const auth = await authHeaders();
  delete auth['Content-Type'];
  const res = await fetch(`${BASE}/api/host-photo`, {
    method: 'POST', headers: { ...auth, 'Content-Type': 'image/jpeg' }, body: blob,
  });
  await throwing(res);
  return res.json();
}

export async function removeHostPhoto() {
  if (!BASE) throw new Error('Host photo API not configured');
  const res = await fetch(`${BASE}/api/host-photo`, { method: 'DELETE', headers: await authHeaders() });
  await throwing(res);
  return res.json();
}

// Her own photo as an object URL, one per version (the image is never stored).
const mine = new Map();
export async function myHostPhotoUrl(version) {
  if (!BASE || !version) return null;
  if (mine.has(version)) return mine.get(version);
  try {
    const res = await fetch(`${BASE}/api/host-photo?v=${enc(version)}`, { headers: await authHeaders() });
    if (!res.ok) return null;
    const url = URL.createObjectURL(await res.blob());
    mine.set(version, url);
    return url;
  } catch { return null; }
}

/** The photo on a guest's invite: by invite code, the version busting caches. */
export function publicHostPhotoUrl(code, version) {
  if (!BASE || !code || !/^[0-9a-f]{12}$/.test(String(version || ''))) return null;
  return `${BASE}/api/public/host-photo/${enc(code)}?v=${enc(version)}`;
}
