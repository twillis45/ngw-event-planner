// DAYBEFORE-DIFM-1 — compression contract: honest counts of OPEN work, calm
// permission for settled work, first-undone deep links, no guest copy.

import { buildDayBeforePlan } from '../dayBefore';
import { playbookFoodPlan } from '../playbooks';

// LOCAL date parts — toISOString() is UTC and drifts a day ahead of local
// between 8 PM and midnight Eastern, making the window tests time-of-day flaky.
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };

const ev = (over = {}) => ({
  id: 'e-db', recordKind: 'host_event', name: 'DB Crab Feast', type: 'Crab Feast',
  date: inDays(1), venueKind: 'home', venueCity: 'Annapolis', guestMode: 'count', guestCount: 20,
  guests: [], budget: [], timeline: [], vendors: [], ...over,
});

test('time gate: applies only from two days out through the day', () => {
  expect(buildDayBeforePlan(ev({ date: inDays(5) })).applicable).toBe(false);
  expect(buildDayBeforePlan(ev({ date: inDays(2) })).applicable).toBe(true);
  expect(buildDayBeforePlan(ev({ date: inDays(1) })).applicable).toBe(true);
  expect(buildDayBeforePlan(ev({ date: inDays(-1) })).applicable).toBe(false);
});

test('open tasks counted honestly; nothing open reads as permission to stop', () => {
  const busy = buildDayBeforePlan(ev({ timeline: [
    { id: 't1', task: 'Pick up crabs', done: false }, { id: 't2', task: 'Ice run', done: false }, { id: 't3', task: 'Done thing', done: true },
  ] }));
  const tasks = busy.sections.find(s => s.key === 'tasks');
  expect(tasks.open).toBe(2);
  expect(tasks.route).toEqual({ tab: 'Planning Tasks', taskId: '__compressed__' });
  const calm = buildDayBeforePlan(ev()).sections.find(s => s.key === 'tasks');
  expect(calm.open).toBe(0);
  expect(calm.detail).toMatch(/Stop worrying/);
  expect(calm.route).toBeNull();
});

test('vendor section: suppressed when vendorless; first-undone row when gaps', () => {
  const none = buildDayBeforePlan(ev());
  expect(none.sections.find(s => s.key === 'vendors')).toBeUndefined();
  const gaps = buildDayBeforePlan(ev({ vendors: [
    { id: 'v1', name: 'Anacostia Frame & Film', status: 'Confirmed', arrivalTime: '12:00' },
    { id: 'v2', name: 'Beltway Sound Collective', status: 'Quoted' },
  ] }));
  const vsec = gaps.sections.find(s => s.key === 'vendors');
  expect(vsec.open).toBe(1);
  expect(vsec.route).toEqual({ tab: 'Vendors', vendorId: 'v2' });
});

// SSOT #1 — this row's copy is "N to lock in" / "Everyone you hired is locked in",
// so a booked-but-not-CONFIRMED vendor must still count as open. The bar here is
// isVendorConfirmed, not isVendorBooked: a 'Deposit Paid' vendor with nothing else
// outstanding (deposit settled, COI clear, arrival time set) used to produce zero
// gaps and green "Everyone you hired is locked in" while a Confirm action was still
// live on the vendor sheet — the two surfaces contradicted each other.
test('vendor section: booked-but-not-confirmed still counts as open (no false "locked in")', () => {
  const clean = { depositAmt: 0, depositPaid: true, coiStatus: 'ok', arrivalTime: '12:00' };
  const plan = buildDayBeforePlan(ev({ vendors: [
    { id: 'v1', name: 'Anacostia Frame & Film', status: 'Confirmed', ...clean },
    // nothing left EXCEPT the confirm itself — the exact over-claim state
    { id: 'v2', name: 'Beltway Sound Collective', status: 'Deposit Paid', ...clean },
  ] }));
  const vsec = plan.sections.find(s => s.key === 'vendors');
  expect(vsec.open).toBe(1);
  expect(vsec.route).toEqual({ tab: 'Vendors', vendorId: 'v2' });

  // and when every vendor IS fully locked in, the row goes quiet — the calm state
  // stays reachable, so this is a truthfulness bar, not a permanently-open nag.
  const done = buildDayBeforePlan(ev({ vendors: [
    { id: 'v1', name: 'Anacostia Frame & Film', status: 'Confirmed', ...clean },
    { id: 'v2', name: 'Beltway Sound Collective', status: 'Confirmed', ...clean },
  ] }));
  expect(done.sections.find(s => s.key === 'vendors').open).toBe(0);
});

test('rain: saved plan is stop-worrying; missing routes to the shared rain target', () => {
  const dry = buildDayBeforePlan(ev({ rainPlan: 'Garage.' })).sections.find(s => s.key === 'rain');
  expect(dry.open).toBe(0);
  expect(dry.route).toBeNull();
  const wet = buildDayBeforePlan(ev()).sections.find(s => s.key === 'rain');
  expect(wet.route).toEqual({ tab: 'Event Details', focusField: 'rain-plan' });
});

test('guest note is a LINK, never embedded copy', () => {
  const plan = buildDayBeforePlan(ev());
  const g = plan.sections.find(s => s.key === 'guests');
  expect(g.route.tab).toBe('Guests');
  expect(g.route.focusField).toBe('guests-invites-e-db');
  const all = JSON.stringify(plan);
  // Ban actual guest-message markers (the drafted note starts "Hi everyone");
  // descriptive words like "bring" are fine — the plan may DESCRIBE the note.
  expect(all).not.toMatch(/Hi everyone|rsvpUrl|Please reply/);
});

test('deep-link doctrine: every routed section carries an anchor or row id', () => {
  const plan = buildDayBeforePlan(ev({ timeline: [{ id: 't1', task: 'x', done: false }], vendors: [{ id: 'v1', name: 'X', status: 'Quoted' }] }));
  plan.sections.filter(s => s.route).forEach(s => {
    // ROW-LEVEL CTA RULE (2026-07-07): foodFocus is a first-class row id —
    // the shopping/helper rows land on the exact food line, not a section top.
    expect(s.route.focusField || s.route.vendorId || s.route.taskId || s.route.foodFocus).toBeTruthy();
  });
});

// RECON-I5 lock: the day-before shopping row's FOOD scope is playbookFoodPlan's
// own remainder (itemCount − boughtCount, which excludes the Supplies group) —
// the list's Supplies lines count with the capacity gear instead, and the split
// always reassembles the row's total. Same fact, one number, everywhere.
test('shopping food scope equals playbookFoodPlan itemCount − boughtCount; split reassembles', () => {
  const base = ev();
  const plan = playbookFoodPlan(base);
  expect(plan && plan.itemCount).toBeGreaterThan(0); // the fixture really has a food plan
  const shopping = buildDayBeforePlan(base).sections.find(s => s.key === 'shopping');
  expect(shopping.openFood).toBe(plan.itemCount - plan.boughtCount);
  expect(shopping.openFood + shopping.openSupplies).toBe(shopping.open);

  // buying one FOOD line moves exactly the food part, and stays reconciled
  const firstFood = plan.list.find(i => i && !i.skipped && i.group !== 'Supplies');
  const bought = ev({ foodGot: { [firstFood.id]: true } });
  const plan2 = playbookFoodPlan(bought);
  const shopping2 = buildDayBeforePlan(bought).sections.find(s => s.key === 'shopping');
  expect(shopping2.openFood).toBe(plan2.itemCount - plan2.boughtCount);
  expect(shopping2.openFood).toBe(shopping.openFood - 1);
  expect(shopping2.openSupplies).toBe(shopping.openSupplies);
});

test('never marks anything done; headline reflects real open count', () => {
  const busy = buildDayBeforePlan(ev({ timeline: [{ id: 't1', task: 'x', done: false }] }));
  expect(busy.openCount).toBeGreaterThan(0);
  expect(busy.headline).toMatch(/still matter/);
  expect(JSON.stringify(busy)).not.toMatch(/all done|completed|✓/i);
});

describe('the copy tells the truth about WHICH day it is', () => {
  // Found by looking at a marketing screenshot of the day-of surface, which is
  // the most important screen in the product: it read "TODAY · YOUR DAY-BEFORE
  // PLAN" over a module headed "How tomorrow starts". The window runs T-2
  // through T-0 and only the headline was ever day-aware, so at T-0 the app
  // told a host how tomorrow starts while they were standing in today.
  const at = (daysOut) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + daysOut);
    return d.toISOString().slice(0, 10);
  };
  const cuesLabelFor = (daysOut) => {
    const plan = buildDayBeforePlan({
      id: 'ev-copy', type: 'Cookout', date: at(daysOut), guestCount: 20,
      startTime: '16:00',
      ros: [{ time: '15:00', segment: 'Light the grill' }, { time: '16:00', segment: 'Doors' }],
    });
    if (!plan || !plan.applicable) return null;
    const cues = (plan.sections || []).find((s) => s.key === 'cues');
    return cues ? cues.label : null;
  };

  test('PREMISE — the cues section exists across the window', () => {
    // Without this the assertions below pass on a section that never renders,
    // which is the same green for a completely different reason.
    for (const d of [0, 1, 2]) expect(cuesLabelFor(d)).toBeTruthy();
  });

  test('on the day it says TODAY, not tomorrow', () => {
    expect(cuesLabelFor(0)).toMatch(/today/i);
    expect(cuesLabelFor(0)).not.toMatch(/tomorrow/i);
  });

  test('the day before, it still says tomorrow', () => {
    // Red-proofs the fix: hardcoding "today" would pass the test above and be
    // wrong on the day that copy was actually written for.
    expect(cuesLabelFor(1)).toMatch(/tomorrow/i);
  });

  test('two days out it commits to neither', () => {
    const l = cuesLabelFor(2);
    expect(l).not.toMatch(/today/i);
    expect(l).not.toMatch(/tomorrow/i);
  });
});
