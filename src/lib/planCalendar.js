// ─── THE PLANNING CALENDAR (owner, 11/16/2026: "yes to the calendar view.
// Week and month toggle") ────────────────────────────────────────────────────
//
// The checklist and the vendors' open promises, laid out by date. It is a VIEW
// of what the plan already holds — nothing is typed into a calendar, so it can
// never disagree with the checklist:
//   · a checklist step is due on the event date plus its lead (taskLeadDays,
//     the one lead policy), done/overdue by the same rules the checklist uses;
//   · a vendor's open promise is due on its own dueDate (vendorAccountability);
//   · the event day itself (each day of a multi-day event).
// A step with no lead has no date; it is COUNTED, never placed on a guessed day.
//
// Dates are local YYYY-MM-DD strings and all arithmetic runs on local midnights
// (the dates.js convention), so a calendar never shifts a day across a time
// zone. PURE except for the optional `now`.
import { localISO, getToday } from './dates';
import { taskLeadDays, taskIsOverdue } from './taskLead';
import { inferPromisesFromVendor, promiseNeedsHost } from './vendorAccountability/derive';

const DAY = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
const plus = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/**
 * @returns {{ items: Array<{date,kind,label,done,overdue,id}>, undated: number }}
 *   kind: 'event' | 'task' | 'vendor'. Sorted by date, the event first on its day.
 */
export function calendarItems(event, now) {
  const ev = event || {};
  const start = DAY(ev.date);
  const items = [];
  let undated = 0;
  if (start) {
    const end = DAY(ev.endDate) && DAY(ev.endDate) > start ? DAY(ev.endDate) : start;
    for (let d = start, i = 1; d <= end; d = plus(d, 1), i += 1) {
      items.push({ id: 'event-' + i, date: localISO(d), kind: 'event',
        label: end > start ? `${ev.name || 'The event'} — day ${i}` : (ev.name || 'The event'), done: false, overdue: false });
    }
  }
  for (const t of Array.isArray(ev.timeline) ? ev.timeline : []) {
    if (!t || !String(t.task || '').trim()) continue;
    const lead = taskLeadDays(t);
    if (!start || lead == null) { undated += 1; continue; }
    let overdue = false;
    try { overdue = taskIsOverdue(t, ev, now); } catch { overdue = false; }
    items.push({ id: 'task-' + (t.id || t.task), date: localISO(plus(start, lead)), kind: 'task',
      label: String(t.task).trim(), done: Boolean(t.done), overdue });
  }
  const today = localISO(getToday(now));
  for (const v of Array.isArray(ev.vendors) ? ev.vendors : []) {
    let open = [];
    try { open = (inferPromisesFromVendor(v, ev) || []).filter(promiseNeedsHost); } catch { open = []; }
    for (const p of open) {
      if (!p || !p.dueDate) continue;
      items.push({ id: 'vendor-' + (v.id || v.name) + '-' + (p.key || p.promiseText), date: String(p.dueDate).slice(0, 10), kind: 'vendor',
        label: `${v.name || 'Vendor'}: ${p.promiseText || 'follow up'}`, done: false, overdue: String(p.dueDate).slice(0, 10) < today });
    }
  }
  const rank = { event: 0, vendor: 1, task: 2 };
  items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : rank[a.kind] - rank[b.kind]));
  return { items, undated };
}

/** The 7 days (Sunday first) of the week holding `anchor`. */
export function weekDays(anchor) {
  const d = DAY(anchor) || getToday();
  const sun = plus(d, -d.getDay());
  return Array.from({ length: 7 }, (_, i) => localISO(plus(sun, i)));
}

/** The month holding `anchor`, as whole weeks (Sunday first); days outside the month are flagged. */
export function monthWeeks(anchor) {
  const d = DAY(anchor) || getToday();
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const weeks = [];
  for (let s = plus(first, -first.getDay()); s <= last; s = plus(s, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => {
      const day = plus(s, i);
      return { date: localISO(day), inMonth: day.getMonth() === first.getMonth() };
    }));
  }
  return weeks;
}

/** Move an anchor by whole weeks or months. Month moves land on the 1st. */
export function shiftAnchor(anchor, view, n) {
  const d = DAY(anchor) || getToday();
  if (view === 'month') return localISO(new Date(d.getFullYear(), d.getMonth() + n, 1));
  return localISO(plus(d, 7 * n));
}

/** "November 2026" or "Nov 15 – 21, 2026". */
export function rangeLabel(anchor, view) {
  const d = DAY(anchor) || getToday();
  if (view === 'month') return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const days = weekDays(anchor).map(DAY);
  const a = days[0]; const b = days[6];
  const sameMonth = a.getMonth() === b.getMonth();
  const left = a.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const right = sameMonth ? String(b.getDate()) : b.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${left} – ${right}, ${b.getFullYear()}`;
}

// ─── ADD TO MY CALENDAR (owner, 11/16/2026: "calendar needs likely app
// integration") ──────────────────────────────────────────────────────────────
// A standard .ics file (RFC 5545) the host opens in Apple, Google or Outlook
// Calendar: the event day(s), every dated step not yet done, and vendors' open
// promises, each an all-day entry. A ONE-TIME COPY: the words on the button say
// so, because a calendar file cannot update itself when the plan changes.
// Stable UIDs, so an app that recognizes them updates rather than duplicates.
const icsText = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const fold = (line) => {
  // Lines longer than 75 octets are folded (RFC 5545 §3.1).
  const out = []; let rest = line;
  while (rest.length > 74) { out.push(rest.slice(0, 74)); rest = ' ' + rest.slice(74); }
  out.push(rest);
  return out.join('\r\n');
};
const compact = (iso) => String(iso).slice(0, 10).replace(/-/g, '');

export function calendarIcs(event, now) {
  const ev = event || {};
  const { items } = calendarItems(ev, now);
  const name = String(ev.name || 'The event').trim();
  const stamp = new Date(now || Date.now()).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//No Guesswork//Plan Calendar//EN', 'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:' + icsText(name + ' — plan')];
  for (const it of items) {
    if (it.done) continue;
    const day = DAY(it.date);
    if (!day) continue;
    const next = localISO(plus(day, 1));
    lines.push('BEGIN:VEVENT',
      'UID:' + icsText(`${ev.id || 'event'}-${it.id}@ngw-plan`),
      'DTSTAMP:' + stamp,
      'DTSTART;VALUE=DATE:' + compact(it.date),
      'DTEND;VALUE=DATE:' + compact(next),
      'SUMMARY:' + icsText(it.kind === 'event' ? it.label : (it.kind === 'vendor' ? 'Vendor: ' : 'To do: ') + it.label),
      'DESCRIPTION:' + icsText(`From your plan for ${name}.`),
      'TRANSP:TRANSPARENT',
      'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
