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
import { eventClock } from './eventWhen';
import { localISO, getToday } from './dates';
import { taskLeadDays, taskIsOverdue } from './taskLead';
import { inferPromisesFromVendor, promiseNeedsHost } from './vendorAccountability/derive';
import { typicalDurationHours } from './startTime';
import { effectiveRos } from './playbooks';
import { parseMin } from './dayAlerts';
import { isVendorBooked } from './workstreams';
import { vendorDisplayName } from './vendorDisplayName';
import { stepTitle } from './dayOfEdits';

const DAY = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
const plus = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// THE EVENT'S HOUR (owner, 11/18/2026: "Calendar should show on day and time
// of event"). startTime is "16:00" (the app's own clock) or what the host typed
// ("4:00 PM", "4 pm"). Anything that is not a clock gives no hour — never a guess.
const clockMinutes = (s) => {
  const m = /^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m?\.?$/i.exec(String(s || '').trim()) || /^(\d{1,2}):(\d{2})()$/.exec(String(s || '').trim());
  if (!m) return null;
  let h = Number(m[1]); const min = Number(m[2] || 0);
  if (min > 59) return null;
  if (m[3]) { if (h < 1 || h > 12) return null; h = (h % 12) + (/p/i.test(m[3]) ? 12 : 0); } else if (h > 23) return null;
  return h * 60 + min;
};
const pad2 = (n) => String(n).padStart(2, '0');
const clockLabel = (mins) => `${(Math.floor(mins / 60) % 12) || 12}:${pad2(mins % 60)} ${mins >= 720 ? 'PM' : 'AM'}`;
// Start in minutes, and whether the host set it (a 'derived' hour is the app's
// suggestion: shown in the app as one, never written into a calendar as fact).
const eventStart = (ev) => {
  // The calendar entry starts when guests arrive (lib/eventWhen.eventClock, cause 5).
  const typed = clockMinutes(ev.startTime);
  const c = eventClock(ev);
  const mins = typed == null ? null : (c.arrivalMin != null ? c.arrivalMin : typed);
  return mins == null ? null : { mins, suggested: String(ev.startTimeSource || '') === 'derived' };
};

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
    const at = eventStart(ev);
    for (let d = start, i = 1; d <= end; d = plus(d, 1), i += 1) {
      items.push({ id: 'event-' + i, date: localISO(d), kind: 'event',
        label: end > start ? `${ev.name || 'The event'} — day ${i}` : (ev.name || 'The event'), done: false, overdue: false,
        ...(i === 1 && at ? { time: clockLabel(at.mins), timeSuggested: at.suggested } : {}) });
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
const icsText = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const fold = (line) => {
  // Lines longer than 75 octets are folded (RFC 5545 §3.1).
  const out = []; let rest = line;
  while (rest.length > 74) { out.push(rest.slice(0, 74)); rest = ' ' + rest.slice(74); }
  out.push(rest);
  return out.join('\r\n');
};
const compact = (iso) => String(iso).slice(0, 10).replace(/-/g, '');

// The event day at the hour the HOST set (a suggested hour stays all-day), as a
// floating local time — the calendar shows it at that clock time wherever the
// host's calendar is. It ends after the playbook's authored run length; with
// none authored it has a start and no end, rather than an invented length.
function timedEntry(ev, it) {
  if (it.kind !== 'event' || !it.time || it.timeSuggested) return null;
  const at = eventStart(ev); const day = DAY(it.date);
  if (!at || !day) return null;
  const stampOf = (d) => `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`;
  const begin = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(at.mins / 60), at.mins % 60);
  const hours = typicalDurationHours(ev);
  const lines = ['DTSTART:' + stampOf(begin)];
  if (hours) lines.push('DTEND:' + stampOf(new Date(begin.getTime() + hours * 3600000)));
  return { lines, start: `${pad2(Math.floor(at.mins / 60))}:${pad2(at.mins % 60)}`, minutes: hours ? Math.round(hours * 60) : null };
}

export function calendarIcs(event, now) {
  const ev = event || {};
  const { items } = calendarItems(ev, now);
  const name = String(ev.name || 'The event').trim();
  const stamp = new Date(now || Date.now()).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//No Guesswork//Plan Calendar//EN', 'CALSCALE:GREGORIAN',
    // Non-standard, and apps disagree on unescaping it: drop , and ; instead.
    'X-WR-CALNAME:' + name.replace(/[,;\\]/g, ' ').split(/\s+/).filter(Boolean).join(' ') + ' — plan'];
  for (const it of items) {
    if (it.done) continue;
    const day = DAY(it.date);
    if (!day) continue;
    const next = localISO(plus(day, 1));
    const when = timedEntry(ev, it);
    lines.push('BEGIN:VEVENT',
      'UID:' + icsText(`${ev.id || 'event'}-${it.id}@ngw-plan`),
      'DTSTAMP:' + stamp,
      ...(when ? when.lines : ['DTSTART;VALUE=DATE:' + compact(it.date), 'DTEND;VALUE=DATE:' + compact(next)]),
      'SUMMARY:' + icsText(it.kind === 'event' ? it.label : (it.kind === 'vendor' ? 'Vendor: ' : 'To do: ') + it.label),
      'DESCRIPTION:' + icsText(`From your plan for ${name}.`),
      'TRANSP:TRANSPARENT',
      'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

// ─── THE SUBSCRIPTION FEED'S DATA (owner, 11/16/2026: "need subscription
// calendar") ─────────────────────────────────────────────────────────────────
// While the host's feed is on (`calendarCode` set), every save carries the
// dated items the Calendar view shows, so the server's .ics route only
// formats them and never re-derives a date (backend/app/routers/calendar_feed.py).
// Feed off: the list is dropped from the saved plan.
export function calendarFeedItems(event, now) {
  return calendarItems(event, now).items
    .filter((it) => !it.done)
    .map((it) => {
      const when = timedEntry(event || {}, it);
      return { id: it.id, date: it.date, kind: it.kind, label: it.label,
        ...(when ? { start: when.start, ...(when.minutes ? { minutes: when.minutes } : {}) } : {}) };
    });
}

/** The plan as it should be saved: with the feed list while the feed is on, without it otherwise. */
export function withCalendarFeed(data, now) {
  if (!data || typeof data !== 'object') return data;
  if (!String(data.calendarCode || '').trim()) {
    if (!('calendarFeed' in data)) return data;
    const { calendarFeed: _drop, ...rest } = data;
    return rest;
  }
  try { return { ...data, calendarFeed: calendarFeedItems(data, now) }; } catch { return data; }
}

// ─── THE DAY IN HER CALENDAR (owner, 11/26/2026: "Yes" to calendar reminders;
// "As rendered is fine") ─────────────────────────────────────────────────────
// Nothing reached her with the app closed on the day. These are the day's
// timed moments as calendar entries, each with its own alarm, so the phone's
// calendar reminds her: every timed step on the run, each booked vendor's
// arrival, and the guests' arrival (her own start time, never a suggested one).
// A reminder says what is DUE, never that it is late: the calendar cannot know
// whether the caterer came. That stays the app's alert. A step with no time has
// no reminder. Times are floating local, like the rest of this file.
const hm = (mins) => `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`;

/** @returns {Array<{id, date, time, label, detail?}>} in date and time order. label is the short title. */
/**
 * @param {Date} [now] when given, reminders at or before it are left out (owner,
 *   11/27/2026): a calendar entry for a step already done is noise. Compared in
 *   the phone's own zone, like the times themselves (they float: the host travels
 *   with the event).
 */
export function dayReminders(event, now) {
  const ev = event || {};
  const first = DAY(ev.date);
  if (!first) return [];
  const dayIso = (n) => localISO(plus(first, Math.max(0, (Number(n) || 1) - 1)));
  const out = [];
  let ros = [];
  try { ros = effectiveRos(ev) || []; } catch (_e) { ros = Array.isArray(ev.ros) ? ev.ros : []; }
  ros.forEach((r, i) => {
    const m = r && r.time ? parseMin(r.time) : null;
    if (m == null || !String(r.segment || '').trim()) return;
    out.push({ id: 'ros-' + (r.id || i), date: dayIso(r.day), time: hm(m), label: stepTitle(r) || String(r.segment).trim(), detail: String(r.segment).trim() });
  });
  (Array.isArray(ev.vendors) ? ev.vendors : []).forEach((v) => {
    if (!v || !v.arrivalTime || !isVendorBooked(v)) return;
    const m = parseMin(v.arrivalTime);
    if (m == null) return;
    out.push({ id: 'vendor-' + v.id, date: dayIso(v.day), time: hm(m), label: (vendorDisplayName(v) || 'A vendor') + ' due' });
  });
  const at = eventStart(ev);
  if (at && !at.suggested && !out.some((x) => x.date === dayIso(1) && x.time === hm(at.mins) && /arriv|guest/i.test(x.label))) {
    out.push({ id: 'guests', date: dayIso(1), time: hm(at.mins), label: 'Guests arrive' });
  }
  const t = now instanceof Date && !Number.isNaN(now.getTime()) ? now.getTime() : null;
  const ahead = t == null ? out : out.filter((x) => {
    const [y, mo, d] = x.date.split('-').map(Number); const [h, mi] = x.time.split(':').map(Number);
    return new Date(y, mo - 1, d, h, mi).getTime() > t;
  });
  return ahead.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

/** The reminders as one calendar file. lead: minutes before (10) or 0 for at the time. */
export function dayRemindersIcs(event, opts, now) {
  const ev = event || {};
  const lead = Math.max(0, Number(opts && opts.lead) || 0);
  const name = String(ev.name || 'The event').trim();
  const stamp = new Date(now || Date.now()).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//No Guesswork//Day Reminders//EN', 'CALSCALE:GREGORIAN'];
  for (const r of dayReminders(ev, now ? new Date(now) : undefined)) {
    lines.push('BEGIN:VEVENT',
      'UID:' + icsText(`${ev.id || 'event'}-${r.id}-${r.date}@ngw-day`),
      'DTSTAMP:' + stamp,
      'DTSTART:' + compact(r.date) + 'T' + r.time.replace(':', '') + '00',
      'SUMMARY:' + icsText(r.label),
      'DESCRIPTION:' + icsText(r.detail && r.detail !== r.label ? r.detail + '\n' + name : name),
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsText(r.label), 'TRIGGER:' + (lead ? `-PT${lead}M` : 'PT0M'), 'END:VALARM',
      'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
