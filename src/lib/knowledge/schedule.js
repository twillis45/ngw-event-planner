// ─── Research Scheduler (KOP-1 Bundle B) ───────────────────────────────────────
// Thin schedule store for recurring research campaigns. A schedule is NOT a cron —
// it's a declared research cadence for an asset+field that the operator tracks.
// Derived from playbookResearch() and campaign history; no background runner.
// Everything is pure + derived; evaluateSchedule() never calls Date.now().

import { playbookResearch } from '../playbooks/playbookRegistry';

export const SCHEDULE_FREQUENCIES = ['monthly', 'quarterly', 'semi-annual', 'annual', 'on-demand'];

// Advance a date string by a frequency (pure, no Date.now())
function addFrequency(dateStr, frequency) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  switch (frequency) {
    case 'monthly':    d.setMonth(d.getMonth() + 1); break;
    case 'quarterly':  d.setMonth(d.getMonth() + 3); break;
    case 'semi-annual': d.setMonth(d.getMonth() + 6); break;
    case 'annual':     d.setFullYear(d.getFullYear() + 1); break;
    case 'on-demand':  return null;
    default:           return null;
  }
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const msPerDay = 86_400_000;
  return Math.round((new Date(b) - new Date(a)) / msPerDay);
}

// ── Schedule shape ────────────────────────────────────────────────────────────
export function createSchedule({ assetId, fieldPath, frequency = 'quarterly', startAt, lastRunAt = null, campId = null, enabled = true, note = '' }) {
  const id = `sched-${assetId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${fieldPath.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return Object.freeze({
    id, assetId, fieldPath, frequency, campId, enabled, note,
    startAt: startAt || null,
    lastRunAt: lastRunAt || null,
    createdAt: startAt || null,
    audit: [{ at: startAt || null, action: 'created' }],
  });
}

// Is this schedule due or overdue as of `asOf`?
export function evaluateSchedule(schedule, asOf) {
  if (!schedule.enabled || schedule.frequency === 'on-demand') {
    return { due: false, overdue: false, daysUntilDue: null, daysOverdue: null, nextAt: null };
  }
  const base = schedule.lastRunAt || schedule.startAt;
  const nextAt = addFrequency(base, schedule.frequency);
  if (!nextAt) return { due: false, overdue: false, daysUntilDue: null, daysOverdue: null, nextAt: null };

  const daysUntilDue = daysBetween(asOf, nextAt);  // negative = overdue
  const overdue = daysUntilDue < 0;
  const due = overdue || daysUntilDue <= 7;        // due = overdue or within 7 days
  return { due, overdue, daysUntilDue: Math.max(0, daysUntilDue), daysOverdue: overdue ? Math.abs(daysUntilDue) : 0, nextAt };
}

// ── Corpus-wide schedule coverage ────────────────────────────────────────────
// For each playbook, derive what SHOULD be scheduled (from playbookResearch),
// then intersect with what IS scheduled. Returns per-playbook coverage + gap list.
export function buildScheduleCoverage(playbooks, schedules, asOf) {
  const schedById = schedules.reduce((m, s) => { m[`${s.assetId}::${s.fieldPath}`] = s; return m; }, {});
  let totalNeeded = 0; let totalScheduled = 0; let totalDue = 0;
  const assets = playbooks.map((pb) => {
    const needed = playbookResearch(pb, asOf);
    totalNeeded += needed.length;
    const covered = needed.map((item) => {
      const key = `${pb.type}::${item.fieldPath || item.kind}`;
      const s = schedById[key];
      if (s) {
        totalScheduled++;
        const eval_ = evaluateSchedule(s, asOf);
        if (eval_.due) totalDue++;
        return { ...item, scheduled: true, schedule: s, eval: eval_ };
      }
      return { ...item, scheduled: false, schedule: null, eval: null };
    });
    const unscheduled = covered.filter((c) => !c.scheduled);
    return { assetId: pb.type, needed: needed.length, scheduled: covered.filter((c) => c.scheduled).length, due: covered.filter((c) => c.eval?.due).length, gaps: unscheduled };
  });
  return { assets, totalNeeded, totalScheduled, totalDue, coverage: totalNeeded > 0 ? Math.round(totalScheduled / totalNeeded * 100) : 100 };
}

// ── Thin store ────────────────────────────────────────────────────────────────
const KEY = 'ngw-kas-schedules';
export function loadSchedules() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
export function saveSchedules(list) { try { localStorage.setItem(KEY, JSON.stringify(list || [])); return true; } catch { return false; } }
export function recordSchedule(s) { const list = loadSchedules().filter((x) => x.id !== s.id); list.push(s); saveSchedules(list); return list; }
export function removeSchedule(id) { const list = loadSchedules().filter((x) => x.id !== id); saveSchedules(list); return list; }
export function clearSchedules() { try { localStorage.removeItem(KEY); } catch { /* noop */ } }
