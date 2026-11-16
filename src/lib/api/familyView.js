// The read-only family link (owner, 11/16/2026). Public: the long code in the
// link is the only credential. See backend/app/routers/family_view.py for what
// the plan carries — and, more to the point, what it never does.
const BASE = process.env.REACT_APP_API_BASE_URL;

export const isFamilyViewConfigured = () => Boolean(BASE);

/** → { ok: true, plan } | { ok: false, reason: 'not-found' | 'unavailable' | 'not-configured' } */
export async function fetchFamilyPlan(code) {
  if (!BASE || !code) return { ok: false, reason: 'not-configured' };
  try {
    const res = await fetch(`${BASE}/api/public/family/${encodeURIComponent(code)}`);
    if (res.status === 404) return { ok: false, reason: 'not-found' };
    if (!res.ok) return { ok: false, reason: 'unavailable' };
    const data = await res.json();
    return data && data.plan ? { ok: true, plan: data.plan } : { ok: false, reason: 'unavailable' };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/** A long random code for the link (24+ characters, URL-safe). */
export function newFamilyCode() {
  const bytes = new Uint8Array(18);
  (globalThis.crypto || window.crypto).getRandomValues(bytes);
  return 'fam-' + Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 30);
}
