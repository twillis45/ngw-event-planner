// C4 — THE FOOD-ONLY COUNTS ARE NOT A COMPLETION SIGNAL.
//
// playbookFoodPlan() exposes `boughtCount` / `itemCount`, and BOTH exclude the
// Supplies group (`isFood = i.group !== 'Supplies'` — playbooks/index.js). They
// answer "how much of the FOOD is bought?", which is a fine question for the food
// hero. They do NOT answer "is the shopping done?".
//
// HostShellV2 had a useEffect that PERSISTED `done: true` onto every timeline step
// matching /buy|shop/ as soon as `boughtCount >= itemCount`. So ticking the crabs
// and the corn silently wrote off "Buy ice, charcoal and paper goods" — and it was
// a real write, so every reader agreed and the step vanished from the checklist for
// good. The host never buys the ice.
//
// The file's own DISPLAY predicate (isTimelineStepResolved) was already strict —
// it requires every non-skipped item, Supplies included, and refuses an empty list.
// Two predicates for one concept, and the looser one was the one that persisted.
//
// This test pins the divergence at the source, so nothing can license a completion
// claim off the food-only counts again.

import { playbookFoodPlan } from '../playbooks';

const crabFeast = (over = {}) => ({
  id: 'e-c4', type: 'Crab Feast', date: '2026-08-20',
  guestMode: 'count', guestCount: 20, guests: [], foodGot: {}, ...over,
});

test('boughtCount/itemCount EXCLUDE supplies — they are a food metric, not a done metric', () => {
  const fp = playbookFoodPlan(crabFeast());
  const all = (fp.list || []).filter(i => !i.skipped);
  const supplies = all.filter(i => i.group === 'Supplies');

  expect(supplies.length).toBeGreaterThan(0);          // ice, charcoal, paper goods…
  expect(fp.itemCount).toBe(all.length - supplies.length);
  expect(fp.itemCount).toBeLessThan(all.length);        // the gap that caused the bug
});

test('every FOOD item bought does NOT mean the shopping is done', () => {
  const base = crabFeast();
  const fp0 = playbookFoodPlan(base);
  const all = (fp0.list || []).filter(i => !i.skipped);

  // The host ticks every FOOD item. Supplies are untouched.
  const foodGot = {};
  all.filter(i => i.group !== 'Supplies').forEach(i => { foodGot[i.id] = true; });

  const fp = playbookFoodPlan(crabFeast({ foodGot }));

  // The food-only counter now reads "complete" — this is what the write trusted.
  expect(fp.boughtCount).toBeGreaterThanOrEqual(fp.itemCount);

  // …but real items remain unbought. Anything that treats the line above as
  // "shopping done" is lying, and it used to WRITE that lie into the event.
  const stillUnbought = all.filter(i => !foodGot[i.id]);
  expect(stillUnbought.length).toBeGreaterThan(0);
  expect(stillUnbought.every(i => i.group === 'Supplies')).toBe(true);

  // The honest predicate (the one HostShellV2's display already used, and which the
  // write now uses too): every non-skipped item, supplies included.
  const trulyDone = all.every(i => foodGot[i.id] === true);
  expect(trulyDone).toBe(false);
});

test('ticking the supplies too DOES complete the shopping — the calm state is reachable', () => {
  const base = crabFeast();
  const all = (playbookFoodPlan(base).list || []).filter(i => !i.skipped);
  const foodGot = {};
  all.forEach(i => { foodGot[i.id] = true; });          // food AND supplies

  const trulyDone = all.every(i => foodGot[i.id] === true);
  expect(trulyDone).toBe(true);
});

test('an EMPTY list is not a completed list', () => {
  // The strict predicate refuses `[].every(...) === true`, which is the empty-reads-
  // as-complete trap (UX_08: "zero is a value, null is missing").
  const active = [];
  const naive = active.every(i => i.got);              // true — the trap
  const honest = active.length > 0 && active.every(i => i.got);
  expect(naive).toBe(true);
  expect(honest).toBe(false);
});
