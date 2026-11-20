// ─── OPEN THE EVENT AN ALERT IS ABOUT (11/20/2026) ─────────────────────────
// An alert email or device notification says "Jordan replied Yes — Ana's
// 40th". Opening it used to land on whichever event the host had open last,
// which can be a different one. The link now carries `?event=<id>`; the app
// reads it once, removes it from the address bar, and opens that event only
// if it is one of the host's own (an id for anything else does nothing).

const ID = /^[A-Za-z0-9_.:-]{1,64}$/;

/** `{ id, url }` — the event id (or null) and the address without it. PURE. */
export function readEventLink(href) {
  try {
    const u = new URL(href);
    const raw = u.searchParams.get('event');
    if (raw == null) return { id: null, url: href };
    u.searchParams.delete('event');
    return { id: ID.test(raw) ? raw : null, url: u.toString() };
  } catch { return { id: null, url: href }; }
}

/** At load: the linked event id, if any, removed from the address bar. */
export function takeEventLink(win) {
  const w = win || (typeof window !== 'undefined' ? window : null);
  if (!w) return null;
  const { id, url } = readEventLink(w.location.href);
  if (url !== w.location.href) { try { w.history.replaceState(null, '', url); } catch { /* stays; harmless */ } }
  return id;
}

/** Whether `id` is one of the host's own events in any of the given lists. PURE. */
export function isOwnEvent(id, ...lists) {
  if (!id) return false;
  return lists.some(l => Array.isArray(l) && l.some(e => e && e.id === id));
}
