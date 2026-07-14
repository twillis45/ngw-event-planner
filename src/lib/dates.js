// Canonical day-difference math — ONE source of truth so every surface agrees on
// "how many days until the event". A YYYY-MM-DD string is parsed as LOCAL midnight
// and measured from local midnight today, so the result is a clean integer that
// never drifts by a day with the time of day or timezone.
//
// This reconciles a latent bug: the weather window was gated in two places that
// computed the day count differently — daysUntil (local-midnight to local-midnight)
// vs an inline `ceil((new Date(iso) - new Date())/day)` (UTC-midnight to now). They
// disagreed by a day right at the 14-day boundary, so a forecast occasionally
// wouldn't show for an event sitting exactly 14 days out.

// Read "now" through Date.now() rather than a bare `new Date()` so a caller can pin
// the clock. Not a test affordance: this module's whole job is time, and time you
// cannot pin is time you cannot check.
export const getToday = (now) => { const d = now ? new Date(now) : new Date(Date.now()); d.setHours(0, 0, 0, 0); return d; };

// Whole CALENDAR days from today until `d`. Both sides are midnight, so the result
// is an exact integer and the clock never moves the date: the day before the event
// answers 1 at dawn and at 11pm alike.
//
// This is THE reader. On 2026-07-14 vendorIntelligence.js and vendorCopilot.js were
// each found carrying a private copy that subtracted a wall-clock INSTANT from a
// midnight — `Math.round((eventMidnight - Date.now()) / 86400000)` — under a comment
// declaring them "deliberately self-contained — no import from elsewhere." At 3pm the
// day before, nine hours remain, nine hours round to zero days, and the vendor
// surfaces began announcing "Event Day" and "needed today" to a host whose event was
// tomorrow. CommunicationHub had a third copy that reached the same lie by a different
// route: `new Date('2026-08-04')` parses as UTC midnight, so east of Greenwich its
// ceil() said "Today" the evening before.
//
// Days between two DATES is a calendar question, not a duration question. Anything
// asking it imports this. A private copy of this arithmetic is a bug, not an
// optimization — that is the whole finding.
export const daysUntil = (d, now) => {
  if (!d) return null;
  const target = d instanceof Date ? getToday(d) : new Date(String(d).slice(0, 10) + 'T00:00:00');
  return isNaN(target) ? null : Math.round((target - getToday(now)) / 86400000);
};

/** True only on the event's actual calendar date — all day, and only that day. */
export const isEventDay = (d, now) => daysUntil(d, now) === 0;

/** True once the event's date has passed. */
export const isPastEvent = (d, now) => { const n = daysUntil(d, now); return n != null && n < 0; };

// ── TIME INTELLIGENCE ─────────────────────────────────────────────────────────
// ONE source for "is this event date usable, and what is its standing relative to
// today?" Built on daysUntil so every surface (create flow, Where & when, the action
// plan) agrees. `minLeadDays` lets a caller pass the plan's longest lead time so a date
// that's technically future but too soon for the prep can be flagged as 'rushed'.
//
// status: 'missing' | 'invalid' | 'past' | 'today' | 'tomorrow' | 'rushed' | 'soon' | 'ok'
//   blocking=true means you cannot plan FORWARD on it (no date, unparseable, or in the past).
export const eventDateStatus = (d, opts = {}) => {
  const minLeadDays = Number(opts.minLeadDays) || 0;
  if (!d) return { valid: false, status: 'missing', days: null, blocking: true, severity: 'error', reason: 'Pick a date to build the plan around.' };
  const days = daysUntil(d);
  if (days === null) return { valid: false, status: 'invalid', days: null, blocking: true, severity: 'error', reason: "That date doesn't look right — check it." };
  const dayWord = (n) => `${n} day${n === 1 ? '' : 's'}`;
  if (days < 0)  return { valid: false, status: 'past',     days, blocking: true,  severity: 'error', reason: `That's ${dayWord(-days)} ago — pick a future date.` };
  if (days === 0) return { valid: true, status: 'today',    days, blocking: false, severity: 'info',  reason: "It's today — you're in day-of mode." };
  if (days === 1) return { valid: true, status: 'tomorrow', days, blocking: false, severity: 'warn',  reason: 'Tomorrow — tight, but doable.' };
  if (minLeadDays && days < minLeadDays) return { valid: true, status: 'rushed', days, blocking: false, severity: 'warn', reason: `Only ${dayWord(days)} out — some prep windows are already compressed.` };
  if (days <= 7) return { valid: true, status: 'soon', days, blocking: false, severity: 'info', reason: `${dayWord(days)} out.` };
  return { valid: true, status: 'ok', days, blocking: false, severity: 'info', reason: `${dayWord(days)} out.` };
};

// RSVP deadline — the date guests should reply by. Default = event date − 7 days (same
// local-midnight model as daysUntil). An explicit event.rsvpDeadline override wins. Returns
// { iso, days, hard, source } — hard=false when the event is <7 days out (no firm date to give;
// the ask becomes "as soon as you can"). null when there's no usable event date.
export const rsvpDeadlineFor = (event) => {
  if (!event || !event.date) return null;
  if (event.rsvpDeadline) return { iso: event.rsvpDeadline, days: daysUntil(event.rsvpDeadline), hard: true, source: 'override' };
  const dte = daysUntil(event.date);
  if (dte === null) return null;
  if (dte < 7) return { iso: null, days: dte, hard: false, source: 'soon' };
  const base = new Date(String(event.date).slice(0, 10) + 'T00:00:00');
  base.setDate(base.getDate() - 7);
  const iso = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
  return { iso, days: daysUntil(iso), hard: true, source: 'derived' };
};

// A single plan task's temporal standing, given its IDEAL lead (days-before-event, e.g. 7
// for a "T-7d" task) and how many days remain. Drives the action plan: a task whose ideal
// window has already passed is 'overdue' (do it ASAP), not silently "upcoming".
//   'unknown' | 'past-event' | 'overdue' | 'due' | 'due-soon' | 'upcoming'
export const taskTimeStatus = (leadDays, daysToEvent) => {
  if (daysToEvent === null || daysToEvent === undefined) return 'unknown';
  if (daysToEvent < 0) return 'past-event';
  const slack = daysToEvent - (Number(leadDays) || 0); // cushion vs the ideal window
  if (slack < 0) return 'overdue';
  if (slack === 0) return 'due';
  if (slack <= 1) return 'due-soon';
  return 'upcoming';
};
