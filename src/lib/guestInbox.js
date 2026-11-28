// ─── THE WORDS FOR GUEST QUESTIONS, INVITE OPENS AND GUEST PHOTOS (11/16/2026) ─
//
// One pure place for the lines the host and the guest read, so their honesty
// is checkable in jest:
//   · "opened", never "read" or "seen" (the server can only know a page load);
//   · a waiting count only when there is one;
//   · a photo's status says what it is waiting for (UX_06: never a bare
//     "pending");
//   · no "her"/"his": the app does not know, so it does not say.
// Server shapes: backend/app/routers/guest_messages.py, guest_photos.py.

const first = (name) => String(name || '').trim().split(/\s+/)[0] || '';

const at = (iso) => {
  const d = new Date(String(iso || ''));
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Threads that wait on the host: unanswered and not blocked. */
export function questionsWaiting(rows) {
  return (Array.isArray(rows) ? rows : []).filter((r) => r && r.unanswered && !r.blocked).length;
}

export function questionsWaitingLine(n) {
  if (!n || n < 1) return null;
  return n === 1 ? '1 guest question waiting' : `${n} guest questions waiting`;
}

/** Unanswered first, then the latest activity first (the server's order, kept on the client). */
export function sortThreads(rows) {
  const latest = (r) => [r.last_guest_at, r.last_host_at, r.created_at].map(at).filter(Boolean)
    .reduce((m, d) => Math.max(m, d.getTime()), 0);
  return [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    const ua = a.unanswered && !a.blocked ? 0 : 1;
    const ub = b.unanswered && !b.blocked ? 0 : 1;
    return ua - ub || latest(b) - latest(a);
  });
}

const stamp = (d, opts = {}) => {
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...opts });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', ...opts });
  return `${date}, ${time}`;
};

/** "Ana last opened the invite Nov 16, 8:42 PM" — or null without a name and a real time. */
export function openedLine(row, opts = {}) {
  const name = first(row && row.guest_name);
  const d = at(row && row.last_opened_at);
  if (!name || !d) return null;
  return `${name} last opened the invite ${stamp(d, opts)}`;
}

/** One day's anonymous total: "Nov 16: opened 5 times on 3 devices". */
export function openDayLine(row) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String((row && row.day) || ''));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  const opens = Number(row.opens) || 0;
  const devices = Number(row.distinct_devices) || 0;
  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${label}: opened ${opens === 1 ? 'once' : `${opens} times`} on ${devices} ${devices === 1 ? 'device' : 'devices'}`;
}

/** What a guest's own photo is waiting for. */
export function photoStatusLabel(status) {
  if (status === 'approved') return 'Approved — other guests can see it';
  if (status === 'hidden') return 'Your host chose not to show this one';
  return 'Waiting for your host to approve it';
}

/** The host's line when photos wait for approval, else null. */
/** How many guest photos wait for the host's approval. */
export const photosWaitingCount = (photos) => (Array.isArray(photos) ? photos : []).filter((p) => p && p.status === 'pending').length;

export function photosWaitingLine(photos) {
  const n = photosWaitingCount(photos);
  if (!n) return null;
  return n === 1 ? '1 guest photo waiting for you to approve' : `${n} guest photos waiting for you to approve`;
}
