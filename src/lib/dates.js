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

export const getToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

export const daysUntil = (d) => {
  if (!d) return null;
  const target = new Date(String(d).slice(0, 10) + 'T00:00:00');
  return isNaN(target) ? null : Math.ceil((target - getToday()) / 86400000);
};

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
