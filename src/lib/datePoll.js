// ─── THE DATE POLL: "ASK ON THE INVITE" (owner pick B, 11/21/2026) ───────────
//
// Group Trip's "Offer two or three date ranges…" and Team Retreat's "Poll the
// team…" had no button. The host now offers up to three ranges on Date & time
// (event.dateOptions); each guest ticks every range that works on the invite,
// before the attendance question; the ticks ride the RSVP reply (migration
// 034, `date_picks`) and land on the guest's row as `datePicks`. The host
// sees "N can make it — names" per range and taps "Use these dates", which
// writes the event's dates. Nothing here guesses: a tally is the guests' own
// ticks, and with no ticks it is empty.

import { eventDatesPatch } from './eventDates';

export const MAX_DATE_OPTIONS = 3;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** The ranges the host offered, complete ones only, in order (≤3). */
export function dateOptionsOf(event) {
  const raw = Array.isArray(event && event.dateOptions) ? event.dateOptions : [];
  return raw.filter((o) => o && o.id && ISO.test(String(o.start || '')) && ISO.test(String(o.end || '')))
    .slice(0, MAX_DATE_OPTIONS);
}

const day = (iso) => new Date(iso + 'T12:00:00');
const short = (iso) => day(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', '');

/** "Sat Jan 30 – Tue Feb 2" — the range as a person reads it. */
export function rangeLabel(o) {
  if (!o || !ISO.test(String(o.start || ''))) return '';
  if (!ISO.test(String(o.end || '')) || o.end === o.start) return short(o.start);
  return short(o.start) + ' – ' + short(o.end);
}

/** A fresh option id that no current option uses. */
export function nextDateOptionId(options) {
  const used = new Set((options || []).map((o) => o && o.id));
  for (let i = 1; ; i += 1) if (!used.has('d' + i)) return 'd' + i;
}

/**
 * Per offered range: who said it works. Reads only the guests' own ticks
 * (guests[].datePicks). `answered` counts guests who ticked anything;
 * `asked` is the guest list (0 in headcount mode, where nobody can answer).
 */
export function datePollTally(event) {
  const options = dateOptionsOf(event);
  const guests = (Array.isArray(event && event.guests) ? event.guests : []).filter((g) => g && String(g.name || '').trim());
  const picked = (g) => (Array.isArray(g.datePicks) ? g.datePicks : []);
  const rows = options.map((o) => {
    const who = guests.filter((g) => picked(g).includes(o.id)).map((g) => String(g.name).trim().split(/\s+/)[0]);
    return { id: o.id, start: o.start, end: o.end, label: rangeLabel(o), count: who.length, names: who };
  });
  const answered = guests.filter((g) => picked(g).some((id) => options.some((o) => o.id === id))).length;
  return { rows, answered, asked: guests.length };
}

/** "Use these dates": the event's dates become this range, and the poll is settled. */
export function dateOptionPatch(event, id) {
  const o = dateOptionsOf(event).find((x) => x.id === id);
  if (!o) return null;
  // Through the one date setter (lib/eventDates), so the poll writes the same
  // shape Date & time does and closes the same open questions.
  const p = eventDatesPatch(event, { date: o.start, endDate: o.end });
  return p ? { ...p, dateOptionUsed: o.id } : null;
}

/** The poll rows are done once the host used one of the ranges. */
export function datePollSettled(event) {
  const used = event && event.dateOptionUsed;
  return !!used && dateOptionsOf(event).some((o) => o.id === used);
}
