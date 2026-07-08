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
import { showsReplyTracking } from './guestMode';

const parseMin = (t) => { if (!t) return null; const [h, m] = String(t).split(':').map(Number); return Number.isNaN(h) ? null : h * 60 + (m || 0); };
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
const today8601 = () => new Date().toISOString().slice(0, 10);

// Default overdue predicate: the playbook checklist's own "T-N d" offsets
// worked back from the event date. Anything else honestly reads not-overdue.
const defaultOverdue = (event) => (task) => {
  if (!task || task.done || !event.date) return false;
  const m = /T-(\d+)\s*d/i.exec(String(task.week || ''));
  if (!m) return false;
  const due = new Date(event.date + 'T00:00:00');
  due.setDate(due.getDate() - parseInt(m[1], 10));
  return due <= new Date(new Date().setHours(0, 0, 0, 0));
};

export function computeDayAlerts(event, opts = {}) {
  const overdue = opts.isTaskOverdue || defaultOverdue(event);
  const td = today8601();
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const alerts = [];
  const push = (a) => alerts.push({ ...a, sev: a.tier, text: a.text || a.headline });

  if (event.date === td) {
    (event.vendors || [])
      .filter(v => v.arrivalTime && ['Confirmed', 'Contracted', 'Deposit Paid'].includes(v.status)
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
      .filter(v => v.name && v.arrivalTime && ['Confirmed', 'Contracted', 'Deposit Paid'].includes(v.status)
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

  (event.vendors || []).filter(v => v.payDueDate === td && !v.balancePaid && v.name).forEach(v =>
    push({ id: `pay-${v.id}`, tier: 'warning', headline: `Payment due today: ${v.name}`, move: `Send the balance so they're squared away.`, navTo: 'Vendors' })
  );

  // RSVPs still outstanding — headcount may shift (Figma B2 warning case).
  const yesCount = (event.guests || []).filter(g => g.rsvp === 'Yes').length;
  const pendingRsvp = (event.guests || []).filter(g => g && g.name && (!g.rsvp || g.rsvp === 'Pending' || g.rsvp === 'Maybe')).length;
  if (event.date === td && pendingRsvp > 0 && showsReplyTracking(event))
    push({ id: 'rsvp-pending', tier: 'warning', headline: `${pendingRsvp} haven't RSVP'd`, move: yesCount > 0 ? `Headcount may shift — text them, or plan for ${yesCount} to be safe.` : `Headcount may shift — text them so you can plan portions.`, navTo: 'Guests' });

  const overdueCount = (event.timeline || []).filter(t => t && !t.done && overdue(t)).length;
  if (overdueCount)
    push({ id: 'overdue-tasks', tier: 'warning', headline: `${overdueCount} thing${overdueCount > 1 ? 's' : ''} still open`, move: `Knock them out or let them go — the day's already here.`, navTo: 'Planning Tasks' });

  // Guests with allergies + catering confirmed — on event day, confirm with caterer
  if (event.date === td) {
    const allergyGuests = (event.guests || []).filter(g => g.rsvp === 'Yes' && g.needs && /allerg/i.test(g.needs));
    const hasCaterer = (event.vendors || []).some(v => /cater|f&b|food|beverage/i.test(v.category) && ['Confirmed', 'Contracted', 'Deposit Paid'].includes(v.status));
    if (allergyGuests.length && hasCaterer)
      push({ id: 'dietary', tier: 'critical', headline: `${allergyGuests.length} guest${allergyGuests.length > 1 ? 's' : ''} with allergies`, move: `Confirm the swaps with your caterer before service.`, navTo: 'Guests' });
  }

  // HEADS-UP (informational, calm) — time/opportunity cues from the authored
  // run-of-show. A golden-hour / photo segment becomes "get the group photo";
  // otherwise the next upcoming segment is a gentle "next up" cue. Only on the
  // day itself, only one, never with an alarm color.
  if (event.date === td) {
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
