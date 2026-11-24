// ─── THE NUMBERS AGREE AT THE SOURCE (UX_11 rule 12; cohesion audit batch C) ──
//
// The screen sweep is hostv2/e2e/theNumbersAgree.spec.mjs. This pins the
// readers it found disagreeing, over every sample and every playbook, so each
// count has one source a surface cannot drift from:
//   #4  "N items still to get" (the day-before row) is the shopping list's own
//       remainder, linesLeftToBuy; the rentals are a count of their own;
//   #6  "everyone has a seat" (the board's What's counted and Who sits where)
//       is one claim, seatingClaim, and never true below the plan's floor;
//   #20 "N vendors are still unpriced" counts hired vendors only (hiredVendors);
//   #5  no money figure is called "left to spend".
jest.mock('@app/lib/failureTelemetry', () => require('../failureTelemetry'), { virtual: true });
jest.mock('@app/lib/playbooks', () => require('../playbooks'), { virtual: true });
jest.mock('@app/lib/artworkMarks', () => require('../artworkMarks'), { virtual: true });
jest.mock('@app/lib/welcomeGate', () => require('../welcomeGate'), { virtual: true });
jest.mock('@app/lib/eventDates', () => require('../eventDates'), { virtual: true });
jest.mock('@app/lib/customEventStore', () => require('../customEventStore'), { virtual: true });
jest.mock('@app/lib/inviteTone', () => require('../inviteTone'), { virtual: true });
jest.mock('@app/theme/palette', () => require('../../theme/palette'), { virtual: true });
jest.mock('@app/data/sampleEventsExtra', () => require('../../data/sampleEventsExtra'), { virtual: true });
jest.mock('@app/data/sampleEventsDMV', () => require('../../data/sampleEventsDMV'), { virtual: true });
jest.mock('@app/data/wandaGoldEvent', () => require('../../data/wandaGoldEvent'), { virtual: true });
jest.mock('@app/data/repastSampleEvent', () => require('../../data/repastSampleEvent'), { virtual: true });

const { ALL_SAMPLES } = require('../../../hostv2/src/eventPool.js');
const pbm = require('../playbooks');
const { buildDayBeforePlan } = require('../dayBefore');
const { linesLeftToBuy } = require('../itemCounts');
const { buildSeatingPlan, seatingClaim } = require('../seatingPlan');
const { positiveAttention } = require('../positiveAttention');
const { unpricedVendorCount, budgetHeroCopy } = require('../budgetCopy');
const { hiredVendors } = require('../workstreams');
const { MONEY_LABELS } = require('../moneyFigures');

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayOut = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12, 0, 0, 0); return iso(d); };

// Every sample, moved to tomorrow so its day-before plan applies, plus every
// playbook at three sizes.
const events = () => {
  const out = ALL_SAMPLES.map((e) => ({ ...e, date: dayOut(1), endDate: undefined }));
  for (const pb of pbm.ALL_PLAYBOOKS) {
    for (const g of [14, 40, 120]) {
      out.push({ id: `ev-${pb.type}-${g}`, type: pb.type, name: 'N', date: dayOut(1), startTime: '15:00', startTimeSource: 'host',
        venue: 'Elm Court Hall', venueKind: 'venue', venueCity: 'Springfield, VA', guestMode: 'count', guestCount: g,
        guests: [], vendors: [], budget: [], timeline: [] });
    }
  }
  return out;
};

test('premise: the sweep reaches the samples, Wanda among them, and every playbook', () => {
  const evs = events();
  expect(evs.some((e) => e.id === 'ev-x-wanda')).toBe(true);
  expect(evs.length).toBeGreaterThan(pbm.ALL_PLAYBOOKS.length * 3);
});

test('#4: the day-before "still to get" is the shopping list’s remainder, and the rentals are counted apart', () => {
  const bad = [];
  let rentalsSeen = 0;
  for (const ev of events()) {
    let day; try { day = buildDayBeforePlan(ev); } catch (e) { continue; }
    if (!day || !day.applicable) continue;
    const row = (day.sections || []).find((s) => s.key === 'shopping');
    if (!row) continue;
    const plan = pbm.playbookFoodPlan(ev);
    const left = plan ? linesLeftToBuy(plan, ev).length : 0;
    if (row.listLeft !== left) bad.push(`${ev.id}: still to get ${row.listLeft}, list remainder ${left}`);
    if ((row.openFood || 0) + (row.openSupplies || 0) !== row.listLeft) bad.push(`${ev.id}: food + supplies ≠ still to get`);
    if (row.listLeft + (row.openGear || 0) !== row.open) bad.push(`${ev.id}: list + rentals ≠ the section's open`);
    if (row.openGear) rentalsSeen += 1;
    if (row.openGear && /everything’s bought|all in hand/i.test(row.detail)) bad.push(`${ev.id}: "${row.detail}" with ${row.openGear} rentals open`);
  }
  expect(bad).toEqual([]);
  expect(rentalsSeen).toBeGreaterThan(0); // premise: some plans have rentals open
});

test('#4: on Wanda’s day the row reads the 31 on the list, not 37', () => {
  const wanda = events().find((e) => e.id === 'ev-x-wanda');
  const row = buildDayBeforePlan(wanda).sections.find((s) => s.key === 'shopping');
  const plan = pbm.playbookFoodPlan(wanda);
  expect(row.listLeft).toBe(plan.shoppingCount - (plan.shoppingBought || 0));
  expect(row.openGear).toBeGreaterThan(0);
});

test('#6: "everyone has a seat" is one claim, never below the plan’s floor', () => {
  const bad = [];
  for (const ev of events()) {
    const sp = buildSeatingPlan(ev);
    const claim = seatingClaim(ev, sp);
    const floor = pbm.eventSizing(ev).floor;
    if (claim.everyoneSeated && sp.totals.seated < floor) bad.push(`${ev.id}: everyone seated with ${sp.totals.seated} of a ${floor} floor`);
    if (claim.everyoneSeated && !sp.totals.allSeated) bad.push(`${ev.id}: everyone seated with confirmed guests unseated`);
    const board = positiveAttention(ev, {}).items.some((i) => i.key === 'Seating');
    if (board !== claim.everyoneSeated) bad.push(`${ev.id}: the board ${board ? 'claims' : 'withholds'} the seat claim, the seating sheet ${claim.everyoneSeated ? 'claims' : 'withholds'} it`);
  }
  expect(bad).toEqual([]);
});

test('#6: Wanda’s 17 seated on a plan for 75 is not everyone; a full small roster is', () => {
  const wanda = events().find((e) => e.id === 'ev-x-wanda');
  const c = seatingClaim(wanda);
  expect([c.rosterSeated, c.everyoneSeated, c.plannedFor]).toEqual([true, false, 75]);
  const small = { id: 's', type: 'Birthday', guestMode: 'list', guests: [{ id: 'a', name: 'Avery Lane', rsvp: 'Yes', table: 1 }, { id: 'b', name: 'Riley Stone', rsvp: 'Yes', table: 1 }], tables: 1 };
  expect(seatingClaim(small).everyoneSeated).toBe(true);
});

test('#20: "still unpriced" counts hired vendors only', () => {
  const bad = [];
  for (const ev of events()) {
    const hiredUnpriced = hiredVendors(ev).filter((v) => String(v.name || '').trim() && !(Number(v.cost) > 0) && !(v.cost === 0 && v.costAgreed === true)).length;
    if (unpricedVendorCount(ev) !== hiredUnpriced) bad.push(`${ev.id}: ${unpricedVendorCount(ev)} unpriced vs ${hiredUnpriced} hired unpriced`);
  }
  expect(bad).toEqual([]);
  const wanda = events().find((e) => e.id === 'ev-x-wanda');
  expect(unpricedVendorCount(wanda)).toBe(2);
  expect(budgetHeroCopy(wanda).caveat).toMatch(/^2 vendors are still unpriced/);
});

test('#5: no money figure is called "left to spend"', () => {
  for (const w of Object.values(MONEY_LABELS)) expect(w).not.toMatch(/left to spend/i);
});
