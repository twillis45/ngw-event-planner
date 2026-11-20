// ─── A STEP THE CHECKLIST CALLS HANDLED IS NOT OVERDUE (hero-clears, 11/20/2026) ──
//
// Driven on the built app: an event whose checklist read "Every step is
// handled — the plan has them. 3 no longer needed" while the board hero said
// "Catch up on this step. — Order the balloons — Overdue by 5 days." The step
// it named had been RETIRED (its gate closed; the checklist files it under "no
// longer needed").
//
// The checklist's "is this step done?" lived in the shell
// (isTimelineStepResolved): ticked or proven by the event (effectiveDone), OR
// retired, OR the arrivals grid holding a real flight, OR a food shop whose
// list is all bought. The overdue policy every engine reads (taskIsOverdue,
// and through it getEventReadiness and the ladder's "Catch up on overdue
// planning tasks") knew only the first. Three of four ways a step is handled
// were invisible to the hero, so the hero kept asking for finished steps.
//
// One predicate now (taskEngine.timelineStepResolved), read by the shell's
// checklist and by the overdue policy.
import { taskIsOverdue } from '../taskLead';
import { timelineStepResolved } from '../taskEngine';
import { getEventReadiness } from '../../CommandCenter';
import { playbookFoodPlan, hostBuysLine } from '../playbooks';

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };

const base = (patch) => ({
  id: 'hc-steps', type: 'Other', name: 'Test', date: inDays(20), guestEstimate: 20,
  venue: 'Lakeside Hall', vendors: [], guests: [], ...patch,
});

describe('a retired step', () => {
  const retired = { id: 'a', task: 'Order the balloons', leadDays: -25, retired: true };
  test('is resolved, and so not overdue', () => {
    const ev = base({ timeline: [retired] });
    expect(timelineStepResolved(ev, retired)).toBe(true);
    expect(taskIsOverdue(retired, ev)).toBe(false);
  });
  test('three of them do not put the timeline at risk', () => {
    const tl = [
      retired,
      { id: 'b', task: 'Rent folding tables', leadDays: -24, retired: true },
      { id: 'c', task: 'Book the photo booth', leadDays: -23, retired: true },
    ];
    const r = getEventReadiness(base({ timeline: tl }));
    expect(r.timeline.status).not.toBe('AT_RISK');
    expect(r.timeline.note).not.toMatch(/overdue/);
  });
  test('control: the same step not retired is overdue', () => {
    const open = { ...retired, retired: false };
    expect(taskIsOverdue(open, base({ timeline: [open] }))).toBe(true);
  });
});

describe('the arrivals grid with a real flight on it', () => {
  const grid = { id: 'g', task: 'Build the arrivals / departures grid', leadDays: -25 };
  const dest = (air) => base({
    isDestination: true, timeline: [grid],
    guests: [{ id: 'g1', name: 'Jordan Avery', rsvp: 'Yes', travel: air ? { air } : {} }],
  });
  test('is resolved, and so not overdue', () => {
    const ev = dest({ arriveDate: inDays(19), airportCode: 'SAF' });
    expect(timelineStepResolved(ev, grid)).toBe(true);
    expect(taskIsOverdue(grid, ev)).toBe(false);
  });
  test('control: an empty grid is still overdue', () => {
    expect(taskIsOverdue(grid, dest(null))).toBe(true);
  });
});

describe('a food shop whose list is all bought', () => {
  const shop = { id: 's', task: 'Buy the food and drinks for the party', leadDays: -25 };
  const party = (gotAll) => {
    const ev = base({ type: 'Birthday', timeline: [shop] });
    const list = (playbookFoodPlan(ev) || {}).list || [];
    const got = {};
    list.filter((i) => i && !i.skipped && hostBuysLine(i)).forEach((i, k) => { if (gotAll || k > 0) got[i.id] = true; });
    return { ...ev, foodGot: got };
  };
  test('is resolved, and so not overdue', () => {
    const ev = party(true);
    expect(timelineStepResolved(ev, shop)).toBe(true);
    expect(taskIsOverdue(shop, ev)).toBe(false);
  });
  test('control: one line still to buy keeps it overdue', () => {
    expect(taskIsOverdue(shop, party(false))).toBe(true);
  });
});

// The tight-timeline lead ("Catch up on this step.") read `!t.done` for open.
describe('the tight-timeline lead', () => {
  const { deriveEventCompressionSummary } = require('../workflowCompression');
  const { daysUntil } = require('../dates');
  test('does not put a retired step in "do now"', () => {
    const tl = [
      { id: 'a', task: 'Order the balloons', leadDays: -25, retired: true },
      { id: 'b', task: 'Rent folding tables', leadDays: -24, retired: true },
    ];
    const c = deriveEventCompressionSummary(base({ timeline: tl }), daysUntil);
    expect(((c && c.doNow) || []).map((t) => t.id)).toEqual([]);
  });
  test('control: the same steps open are in "do now"', () => {
    const tl = [
      { id: 'a', task: 'Order the balloons', leadDays: -25 },
      { id: 'b', task: 'Rent folding tables', leadDays: -24 },
    ];
    const c = deriveEventCompressionSummary(base({ timeline: tl }), daysUntil);
    expect(((c && c.doNow) || []).length).toBeGreaterThan(0);
  });
});
