// ─── Day-of severity reader (extracted from App.js, Sprint 64 / Figma B2) ─────
// THE single alert engine for event day. Each alert carries a 3-tier `tier`
// ('critical' | 'warning' | 'heads-up'), a bold `headline` (what's happening),
// and a separate `move` (the "→ your move" action sentence — never one blob).
// `sev`/`text` are kept as aliases so the planner EventDayBar (clock-strip)
// keeps reading them unchanged. heads-up = informational time/opportunity cues
// (golden-hour photo, next ROS segment) — escalation by REDUCTION, the calm tier.
//
// Extracted so BOTH shells read the same truth (App.js HostDaySeverityStack and
// the V2 prototype's Day stage). The one host-app-specific piece — the
// compression-aware overdue-task predicate — is injectable via
// opts.isTaskOverdue(task); the built-in default understands the playbook
// checklist's "T-N d" week labels and otherwise never invents an overdue.
import { effectiveRos } from './playbooks';
import { isVendorBooked } from './workstreams';
import { effectiveDone } from './taskEngine';
import { showsReplyTracking } from './guestMode';
import { isEventDay } from './dates';
import { taskIsOverdue } from './taskLead';

// Time-string → minutes-since-midnight. Contract (exported so both shells and
// tests read the same parser): 24-hour "HH:MM" → h*60+m; falsy input → null;
// non-numeric hour → null. NOTE: a 12-hour display string like "3:30 PM" is
// NOT understood — "30 PM" coerces to NaN and falls back to 0 minutes, so
// "3:30 PM" reads as 180 (3:30 AM). Callers with mixed-format times must
// normalize to 24h first (fmtTime12 below handles the display direction).
// Time-string → minutes since midnight. Handles BOTH storage formats —
// 24-hour ("14:05" → 845) and 12-hour display strings ("1:30 PM" → 810).
// The 12-hour path matters: vendor arrivalTime is stored as a display string
// in several paths, and parsing "1:30 PM" as 24h read it as 1:30 AM — the
// overdue-vendor alert then misfired all day (found by dayAlertsBehavior).
export const parseMin = (t) => {
  if (!t) return null;
  const s = String(t).trim();
  const ampm = /([ap])\.?m\.?/i.exec(s);
  const [h, m] = s.replace(/\s*[ap]\.?m\.?/i, '').split(':').map(Number);
  if (Number.isNaN(h)) return null;
  let hh = h;
  if (ampm) {
    const isPm = ampm[1].toLowerCase() === 'p';
    if (isPm && hh < 12) hh += 12;
    if (!isPm && hh === 12) hh = 0;
  }
  return hh * 60 + (m || 0);
};
const fmtTime12 = (t) => {
  if (!t) return '—';
  // startTime is stored inconsistently — 12-hour display strings ("3:00 PM") in
  // some paths, 24-hour clock ("15:00") in others. If it's ALREADY 12-hour, pass
  // it through: parsing it as 24h drops the "PM" (the cookout-at-3am bug).
  if (/[ap]\.?m\.?/i.test(t)) return String(t).trim();
  const [h, m] = String(t).split(':').map(Number);
  if (Number.isNaN(h)) return t;
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
// WAS: `new Date().toISOString().slice(0, 10)` — a UTC date, compared against a LOCAL
// event date. In America/New_York that flips at 8pm: at 8:30pm ET on the night of the
// party, today8601() already returned TOMORROW, `isToday(event.date)` went false, and the
// entire day-of alert stack — vendor hasn't arrived, guest allergies the caterer wasn't
// told about, payment due today, RSVP gaps — SILENTLY SWITCHED OFF, mid-event, exactly
// when a host is running the thing. (It also fired the night BEFORE, 9pm ET onward.)
// isEventDay() compares calendar dates in local time, which is the question being asked.
const isToday = (date) => isEventDay(date);

// Default overdue predicate. WAS a regex for /T-(\d+)d/ against `task.week` — and
// playbookChecklist writes PROSE there ('Week of', 'Day before'), never 'T-5d'. So this
// matched NOTHING, on every event, forever: the "N things still open" alert could not
// fire. The lead now comes from the one reader (lib/taskLead.js), off the stable
// `leadDays` the playbook authors.
const defaultOverdue = (event) => (task) => taskIsOverdue(task, event);

export function computeDayAlerts(event, opts = {}) {
  const overdue = opts.isTaskOverdue || defaultOverdue(event);
  
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const alerts = [];
  const push = (a) => alerts.push({ ...a, sev: a.tier, text: a.text || a.headline });

  if (isToday(event.date)) {
    (event.vendors || [])
      .filter(v => v.arrivalTime && isVendorBooked(v)
                && v.arrivalStatus !== 'arrived' && v.arrivalStatus !== 'completed')
      .forEach(v => {
        const vm = parseMin(v.arrivalTime);
        if (vm !== null && vm < nowMin - 10)
          push({ id: `ov-${v.id}`, tier: 'critical', headline: `${v.name} hasn't arrived`, move: `Call ${v.name} now — they were due at ${fmtTime12(v.arrivalTime)}.`, navTo: 'Arrivals' });
      });

    // Confirmed-but-unconfirmed-arrival vendor with an arrival time still ahead —
    // a day-of "make sure they're coming" critical (the Figma "Caterer hasn't
    // confirmed arrival" case). Only the soonest one, to stay calm.
    const unconfirmed = (event.vendors || [])
      .filter(v => v.name && v.arrivalTime && isVendorBooked(v)
                && v.arrivalStatus !== 'arrived' && v.arrivalStatus !== 'completed' && v.arrivalStatus !== 'delayed')
      .map(v => ({ v, m: parseMin(v.arrivalTime) }))
      .filter(x => x.m !== null && x.m >= nowMin - 10 && x.m <= nowMin + 90)
      .sort((a, b) => a.m - b.m);
    if (unconfirmed.length) {
      const { v } = unconfirmed[0];
      push({ id: `confirm-${v.id}`, tier: 'critical', headline: `${v.name} hasn't confirmed arrival`, move: `Call ${v.name} now — they're set for ${fmtTime12(v.arrivalTime)}.`, navTo: 'Arrivals' });
    }
  }

  const pending = (event.commClient || []).filter(m => m.message_type === 'approval_request' && (!m.approval_status || m.approval_status === 'pending'));
  if (pending.length)
    push({ id: 'approvals', tier: 'warning', headline: `${pending.length} approval${pending.length > 1 ? 's' : ''} waiting on a reply`, move: `Nudge them so the day-of plan can lock.`, navTo: 'Communication' });

  (event.vendors || []).filter(v => isToday(v.payDueDate) && !v.balancePaid && v.name).forEach(v =>
    push({ id: `pay-${v.id}`, tier: 'warning', headline: `Payment due today: ${v.name}`, move: `Send the balance so they're squared away.`, navTo: 'Vendors' })
  );

  // RSVPs still outstanding — headcount may shift (Figma B2 warning case).
  const yesCount = (event.guests || []).filter(g => g.rsvp === 'Yes').length;
  const pendingRsvp = (event.guests || []).filter(g => g && g.name && (!g.rsvp || g.rsvp === 'Pending' || g.rsvp === 'Maybe')).length;
  if (isToday(event.date) && pendingRsvp > 0 && showsReplyTracking(event))
    push({ id: 'rsvp-pending', tier: 'warning', headline: `${pendingRsvp} haven't RSVP'd`, move: yesCount > 0 ? `Headcount may shift — text them, or plan for ${yesCount} to be safe.` : `Headcount may shift — text them so you can plan portions.`, navTo: 'Guests' });

  // "Still open" must read the SAME done-truth every other what's-left surface uses:
  // a task the host never ticked but that real event state proves handled (effectiveDone)
  // is NOT open. Raw !t.done counted those as open, so the day-of banner nagged about
  // work already done elsewhere (audit 2026-07-22).
  const overdueCount = (event.timeline || []).filter(t => t && !effectiveDone(event, t) && overdue(t)).length;
  if (overdueCount)
    push({ id: 'overdue-tasks', tier: 'warning', headline: `${overdueCount} thing${overdueCount > 1 ? 's' : ''} still open`, move: `Knock them out or let them go — the day's already here.`, navTo: 'Planning Tasks' });

  // Guests with allergies + catering confirmed — on event day, confirm with caterer
  if (isToday(event.date)) {
    const allergyGuests = (event.guests || []).filter(g => g.rsvp === 'Yes' && g.needs && /allerg/i.test(g.needs));
    const hasCaterer = (event.vendors || []).some(v => /cater|f&b|food|beverage/i.test(v.category) && isVendorBooked(v));
    if (allergyGuests.length && hasCaterer)
      push({ id: 'dietary', tier: 'critical', headline: `${allergyGuests.length} guest${allergyGuests.length > 1 ? 's' : ''} with allergies`, move: `Confirm the swaps with your caterer before service.`, navTo: 'Guests' });
  }

  // HEADS-UP (informational, calm) — time/opportunity cues from the authored
  // run-of-show. A golden-hour / photo segment becomes "get the group photo";
  // otherwise the next upcoming segment is a gentle "next up" cue. Only on the
  // day itself, only one, never with an alarm color.
  if (isToday(event.date)) {
    let ros = [];
    try { ros = effectiveRos(event) || []; } catch { ros = []; }
    const timed = ros.filter(r => r && r.time && r.segment).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const photoSeg = timed.find(r => /golden|photo|portrait|group.?shot|sunset/i.test(r.segment) && (parseMin(r.time) ?? -1) >= nowMin - 30);
    const nextSeg = timed.find(r => { const m = parseMin(r.time); return m !== null && m >= nowMin; });
    if (photoSeg)
      push({ id: 'heads-photo', tier: 'heads-up', headline: `Golden hour at ${fmtTime12(photoSeg.time)}`, move: `Get the group photo before the light goes.`, navTo: 'Event Day Schedule' });
    else if (nextSeg)
      push({ id: 'heads-next', tier: 'heads-up', headline: `Next up at ${fmtTime12(nextSeg.time)} — ${nextSeg.segment}`, move: `A little ahead of time keeps the day calm.`, navTo: 'Event Day Schedule' });
  }

  return alerts;
}
