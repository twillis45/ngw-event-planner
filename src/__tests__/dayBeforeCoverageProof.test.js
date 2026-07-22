// ─── DAY-BEFORE COVERAGE PROOF — the compressed plan drops no concern family ──
// The third Layer-1 proof of the 2026-07-22 process ask, guarding the W4 class:
// the day-before plan showed "Buy the remaining items" while the unresolved
// guest count that SIZES those buys was silently absent — the compression had
// no section for a concern family the canonical readers flagged.
//
// The invariant: for every playbook, at every day-before-window state (T-2/T-1/
// T-0), each concern family the CANONICAL readers flag must surface as an open
// section in buildDayBeforePlan — and every open section must carry a route AND
// a CTA (a named concern with no way to act is the W14 dead-end class). The
// test re-derives each concern from the same reader the plan should consult,
// so plan-vs-reader drift fails here, not on a hero.
import {
  ALL_PLAYBOOKS, playbookTypicalGuests, playbookChecklist,
  guestCountResolved, playbookFoodPlan, playbookCapacity,
} from '../lib/playbooks';
import { buildDayBeforePlan } from '../lib/dayBefore';
import { rainPlanStatus } from '../lib/weather';
import { isVendorConfirmed } from '../lib/workstreams';
import { effectiveDone } from '../lib/taskEngine';

const mkEvent = (pb, plusDays, extras = {}) => {
  const d = new Date(); d.setDate(d.getDate() + plusDays); d.setHours(12);
  const typical = playbookTypicalGuests(pb.type) || 16;
  const ev = {
    id: 'cov-' + pb.type.toLowerCase().replace(/[^a-z]+/g, '-'),
    type: pb.type, name: 'Coverage ' + pb.type,
    date: d.toISOString().slice(0, 10),
    venue: 'Backyard', venueKind: 'home',
    guestMode: 'count', guestCount: 0, guestEstimate: typical,
    budget: [], vendors: [], timeline: [],
    guests: [
      { id: 'cov-g1', name: 'Denise & Ray', rsvp: 'Yes' },
      { id: 'cov-g2', name: 'Marcus', rsvp: 'Maybe' },
      { id: 'cov-g3', name: 'Aunt Cee', rsvp: '' },
    ],
    ...extras,
  };
  try {
    ev.timeline = (playbookChecklist(ev) || []).map((r, i) => ({
      id: r.id, week: r.week || '', leadDays: r.leadDays != null ? r.leadDays : null,
      task: r.task || '', done: i % 2 === 0, owner: '', category: r.category || '',
    }));
  } catch { /* coverage runs on whatever the playbook yields */ }
  return ev;
};

// A vendor in exactly the not-locked-in shape the plan's own gap filter reads.
const GAP_VENDOR = {
  id: 'cov-v1', name: 'Bay Catering', category: 'Catering', status: 'Deposit Paid',
  cost: 900, depositAmt: 200, depositPaid: true, balancePaid: false,
  contractSigned: true, arrivalTime: '',
};

const sectionByKey = (plan, key) => (plan.sections || []).find(s => s && s.key === key) || null;

// concern family → [reader-derived "is it open?", section key]
const FAMILIES = (ev, plan) => {
  const out = [];
  try { out.push(['count', !guestCountResolved(ev).resolved, sectionByKey(plan, 'count')]); } catch { /* reader crash belongs elsewhere */ }
  try {
    const fp = playbookFoodPlan(ev);
    const unboughtFood = (fp && Array.isArray(fp.list))
      ? fp.list.filter(i => i && !i.skipped && i.group !== 'Supplies' && !((ev.foodGot || {})[i.id])).length : 0;
    let unboughtGear = 0;
    try {
      const cap = playbookCapacity(ev);
      const items = (cap && Array.isArray(cap.groups)) ? cap.groups.flatMap(g => g.items || []) : [];
      unboughtGear = items.filter(i => i && !i.skipped && !i.owned).length;
    } catch { /* honest zero */ }
    out.push(['shopping', unboughtFood + unboughtGear > 0, sectionByKey(plan, 'shopping')]);
  } catch { /* ignore */ }
  try { out.push(['rain', !rainPlanStatus(ev).hasPlan, sectionByKey(plan, 'rain')]); } catch { /* ignore */ }
  if ((ev.vendors || []).length) {
    const gaps = ev.vendors.filter(v => v && (!isVendorConfirmed(v) || !String(v.arrivalTime || '').trim())).length;
    out.push(['vendors', gaps > 0, sectionByKey(plan, 'vendors')]);
  }
  try {
    const open = (ev.timeline || []).filter(t => t && t.task && !effectiveDone(ev, t)).length;
    out.push(['tasks', open > 0, sectionByKey(plan, 'tasks')]);
  } catch { /* ignore */ }
  return out;
};

const STATES = [['T-2', 2], ['T-1', 1], ['T-0', 0]];

for (const pb of ALL_PLAYBOOKS) {
  if (!pb || !pb.type) continue;
  describe(`day-before coverage — ${pb.type}`, () => {
    for (const [label, plus] of STATES) {
      test(`${label}: every flagged family has an open, actionable section`, () => {
        const ev = mkEvent(pb, plus, { vendors: [{ ...GAP_VENDOR }] });
        const plan = buildDayBeforePlan(ev);
        expect(plan && plan.applicable).toBe(true);

        const misses = [];
        for (const [family, flagged, section] of FAMILIES(ev, plan)) {
          if (!flagged) continue; // reader says settled — the plan owes nothing
          if (!section || !(section.open > 0)) { misses.push(`${family}: flagged by its reader but no open section`); continue; }
          // W14 dead-end class: an open concern must carry a way to act.
          if (!section.route) misses.push(`${family}: open section with no route`);
          if (!section.cta) misses.push(`${family}: open section with no CTA`);
        }
        expect(misses).toEqual([]);

        // The headline's arithmetic is the sections' own sum — one ledger.
        const sum = (plan.sections || []).reduce((n, s) => n + (s.open || 0), 0);
        expect(plan.openCount).toBe(sum);
      });
    }
  });
}
