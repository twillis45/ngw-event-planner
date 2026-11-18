// ─── WHERE A NEW HOST CAME FROM (owner, 11/18/2026) ──────────────────────────
//
// Marketing & Pricing Review Board, step 1 ("this week"): every guest RSVP page
// and vendor brief carries a quiet "plan yours" line, and the link says where it
// came from, so the first real acquisition numbers come from actual use. The
// invite footer already had the line (host ruling 2026-07-29) but linked to the
// bare app: a guest landed on a generic start, and nothing remembered that they
// came from an invitation, so a later pass bought on their event could not be
// traced back to it.
//
// WHAT IS KEPT — and only this: which kind of page the link was on
// ('invite' | 'vendor'), the event kind of the page they came from (never its
// name, host, guests or code), and when. First touch wins and lasts 30 days.
// It rides into the next event the arriving host creates as
// `acquisitionSource`, then is spent. Nothing here identifies a person.
//
// PURE except for the storage object handed in (localStorage in the app).

export const ARRIVAL_KEY = 'ngw-arrival';
const SOURCES = new Set(['invite', 'vendor']);
const DAY = 86400000;
export const ARRIVAL_DAYS = 30;

// The kind travels as the playbook type name; anything else is dropped rather
// than stored — a URL is input, not a record.
const cleanKind = (k) => {
  const s = String(k || '').trim();
  return /^[A-Za-z0-9’'&/ .\-]{2,40}$/.test(s) ? s : '';
};

/** The "plan yours" link: this app's start, with where it came from. */
export function recruitHref(base, { from, kind } = {}) {
  if (!SOURCES.has(from)) return base;
  const q = new URLSearchParams({ from });
  const k = cleanKind(kind);
  if (k) q.set('kind', k);
  return String(base).split('?')[0] + '?' + q.toString();
}

/** An arrival read off a landing URL's search string, or null. */
export function readArrival(search) {
  try {
    const q = new URLSearchParams(String(search || ''));
    const from = q.get('from');
    if (!SOURCES.has(from)) return null;
    const kind = cleanKind(q.get('kind'));
    return { from, ...(kind ? { kind } : {}) };
  } catch { return null; }
}

/** First touch wins: an unexpired arrival already stored is kept. */
export function rememberArrival(storage, arrival, now = Date.now()) {
  if (!storage || !arrival) return;
  try {
    if (arrivalFor(storage, now)) return;
    storage.setItem(ARRIVAL_KEY, JSON.stringify({ ...arrival, at: new Date(now).toISOString() }));
  } catch { /* storage is a convenience; an arrival not kept is only a number not counted */ }
}

/** The stored arrival while it is fresh, else null. */
export function arrivalFor(storage, now = Date.now()) {
  try {
    const a = JSON.parse((storage && storage.getItem(ARRIVAL_KEY)) || 'null');
    if (!a || !SOURCES.has(a.from)) return null;
    const at = Date.parse(a.at);
    if (!Number.isFinite(at) || now - at > ARRIVAL_DAYS * DAY || at > now + DAY) return null;
    return a;
  } catch { return null; }
}

/** Spend the arrival once an event has carried it. */
export function spendArrival(storage) {
  try { storage && storage.removeItem(ARRIVAL_KEY); } catch { /* nothing to undo */ }
}

/**
 * The example sentence on the create screen. A guest who came from a
 * Friendsgiving invite sees a Friendsgiving example; everyone else sees the
 * standing one. The numbers are an EXAMPLE of a sentence, never a claim.
 */
export function exampleSentenceFor(arrival) {
  const k = arrival && cleanKind(arrival.kind);
  if (!k) return 'Mom’s 80th in Santa Fe, 30 people, June 14';
  return `${k} for 20 people, Saturday at 4`;
}
