// ─── legacyCopy — STORED-COPY-MIGRATION-1 ─────────────────────────────────────
//
// HOST-LANGUAGE-AUDIT-1 fixed the lock-language in CODE, but events saved
// before it still carry the old template strings in their stored timelines
// ("…lock the final headcount"), so existing hosts kept seeing banned copy.
// This normalizes ONLY known, exact legacy template phrases at load time —
// never free-text the host wrote themselves (every pattern below is a string
// we authored). Idempotent: running it twice changes nothing; events without
// matches are returned untouched (same reference, no re-render churn).

import { isPlausibleCityText } from './cityText';

const REPLACEMENTS = [
  // [exact legacy phrase, doctrine copy]
  ['lock the final headcount', 'confirm the final guest count'],
  ['Lock the headcount and rentals', 'Finalize the headcount and rentals'],
  ['Lock the headcount', 'Finalize the headcount'],
  ['lock the headcount', 'finalize the headcount'],
];

function migrateText(text) {
  let t = String(text);
  for (const [from, to] of REPLACEMENTS) {
    if (t.includes(from)) t = t.split(from).join(to);
  }
  return t;
}

export function migrateLegacyTaskCopy(events) {
  if (!Array.isArray(events)) return events;
  let anyEvent = false;
  const out = events.map((ev) => {
    if (!ev || !Array.isArray(ev.timeline)) return ev;
    let changed = false;
    const timeline = ev.timeline.map((t) => {
      if (!t || typeof t.task !== 'string') return t;
      const next = migrateText(t.task);
      if (next === t.task) return t;
      changed = true;
      return { ...t, task: next };
    });
    if (!changed) return ev;
    anyEvent = true;
    return { ...ev, timeline };
  });
  return anyEvent ? out : events;
}

// ── LOCATION FIELD HEAL (Todd, 2026-07-07) ───────────────────────────────────
// The pollution incident left whole venue strings ("VFW Post 3150 — Alexandria,
// VA") in CITY fields. At load: an implausible city value moves to the empty
// venue field (it plainly IS the venue) and the city field clears. Exact same
// idempotent, reference-preserving contract as the copy migration above.

export function migrateLegacyLocationFields(events) {
  if (!Array.isArray(events)) return events;
  let any = false;
  const out = events.map((ev) => {
    if (!ev) return ev;
    let next = ev;
    for (const field of ['venueCity', 'city']) {
      const v = String(next[field] || '').trim();
      if (v && !isPlausibleCityText(v)) {
        any = true;
        next = { ...next, [field]: '' };
        if (!String(next.venue || '').trim()) next.venue = v; // the text was the venue all along
      }
    }
    return next;
  });
  return any ? out : events;
}
