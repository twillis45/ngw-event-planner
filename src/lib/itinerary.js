// ─── Guest itinerary — ONE schedule, projected for guests ────────────────────
// (Destination + Multi-Day program, Slice A, 2026-07-27.)
//
// The host's run-of-show is operational truth (grill on at 11:30, owners,
// setup). Guests need the PROGRAM: what's happening, which day, roughly when.
// This module builds that projection from, in order of authority:
//   1. event.itinerary — the host's own edited rows (host-owned once touched)
//   2. the playbook's authored multi-day agenda (schedules.agenda "Day N ..."
//      rows — written for Team Retreat in 2026 and never consumed until now)
//   3. a PROPOSED arc for the flagship reunion shape (McCoy, *Generations*/ASA:
//      arrival evening → the cookout as the climax → worship + farewell close),
//      offered only when the event actually spans multiple days — propose,
//      never silently commit (the host edits or clears it like any proposal).
//
// HONESTY: day-part SLOTS only ("Saturday afternoon"), never an invented clock
// time — the same never-paint-a-fake-clock ruling as The Day board. A time
// renders only when the HOST typed one on their own row.

import { spanNights } from './dates';

const SLOTS = ['morning', 'midday', 'afternoon', 'evening', 'night'];
const SLOT_RANK = SLOTS.reduce((m, s, i) => ((m[s] = i + 1), m), {});

/** "Day 2 afternoon" → { day: 2, slot: 'afternoon' }; null when not day-anchored. */
export function parseAgendaWhen(when) {
  const m = String(when || '').trim().match(/^day\s*(\d{1,2})\s*(morning|midday|afternoon|evening|night)?$/i);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  if (!Number.isFinite(day) || day < 1 || day > 31) return null;
  return { day, slot: m[2] ? m[2].toLowerCase() : null };
}

/** Weekday label for day N of the event ("Friday" for day 1 of a Fri start). */
export function dayLabelFor(event, dayIndex) {
  const start = event && event.date ? String(event.date).slice(0, 10) : null;
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return `Day ${dayIndex}`;
  const d = new Date(start + 'T12:00:00');
  d.setDate(d.getDate() + (dayIndex - 1));
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

// The flagship reunion arc — PROPOSED, with its grounding attached. Slots only.
const REUNION_ARC = [
  { day: 1, slot: 'evening', title: 'Meet & greet', note: 'everyone lands, keep it easy', anchor: true },
  { day: 2, slot: 'afternoon', title: 'The cookout — the big gathering', note: 'the day everyone came for', anchor: true },
  { day: 3, slot: 'morning', title: 'Worship service', note: 'optional — the traditional close', anchor: false },
  { day: 3, slot: 'midday', title: 'Farewell brunch & goodbyes', note: null, anchor: true },
];
const REUNION_ARC_PROVENANCE = {
  tier: 'researched',
  note: 'The documented reunion weekend arc: arrival evening, the shared meal as the climax, worship + farewell close (McCoy, Generations/ASA; reunion-planning consensus, research dossier 2026-07-26).',
};

const normRow = (r) => {
  if (!r) return null;
  const day = Math.max(1, Math.round(Number(r.day) || 1));
  const slot = SLOTS.includes(String(r.slot || '').toLowerCase()) ? String(r.slot).toLowerCase() : null;
  const title = String(r.title || r.what || '').trim();
  if (!title) return null;
  return {
    day, slot,
    time: String(r.time || '').trim() || null, // only ever host-typed
    title,
    note: String(r.note || '').trim() || null,
    anchor: !!r.anchor,
  };
};

const sortRows = (rows) => [...rows].sort((a, b) =>
  (a.day - b.day) || ((a.slot ? SLOT_RANK[a.slot] : 99) - (b.slot ? SLOT_RANK[b.slot] : 99)));

/**
 * The guest-facing program. Returns { relevant, source, rows, provenance }.
 * getPlaybook is injected to keep this module playbook-import-free (the invite
 * bundle loads it; same constitution as eventWhen/venueFor).
 */
export function guestItinerary(event, getPlaybook) {
  const ev = event || {};

  // 1 · host-owned rows win outright
  if (Array.isArray(ev.itinerary) && ev.itinerary.length) {
    const rows = sortRows(ev.itinerary.map(normRow).filter(Boolean));
    if (rows.length) return { relevant: true, source: 'host', rows, provenance: null };
  }

  // 2 · authored playbook agenda ("Day N ..." rows only — T-offset rows are crew)
  const pb = (() => { try { return getPlaybook ? getPlaybook(ev.type) : null; } catch { return null; } })();
  const agenda = pb && pb.schedules && Array.isArray(pb.schedules.agenda) ? pb.schedules.agenda : [];
  const authored = agenda
    .map((r) => {
      const at = parseAgendaWhen(r && r.when);
      return at ? normRow({ ...at, title: r.what }) : null;
    })
    .filter(Boolean);
  if (authored.length) {
    return {
      relevant: true, source: 'playbook', rows: sortRows(authored),
      provenance: { tier: 'authored', note: `${ev.type}'s own multi-day plan.` },
    };
  }

  // 3 · the proposed reunion arc — multi-day reunions only, clipped to the span
  if (String(ev.type || '') === 'Reunion' && spanNights(ev) >= 1) {
    const days = spanNights(ev) + 1;
    const rows = REUNION_ARC.filter((r) => r.day <= days).map(normRow).filter(Boolean);
    if (rows.length) return { relevant: true, source: 'proposed', rows: sortRows(rows), provenance: REUNION_ARC_PROVENANCE };
  }

  return { relevant: false, source: null, rows: [], provenance: null };
}
