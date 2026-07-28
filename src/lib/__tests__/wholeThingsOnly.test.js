// ─── PHYSICAL THINGS COME IN WHOLE UNITS (host report 2026-07-28) ────────────
//
// "cant have 1.2 tables". The capacity builder scales an authored per-guest
// factor through resolveQuantity — the SAME helper the food plan uses, where
// 2.5 lbs of meat is a real answer. Nobody had drawn the line between "how much
// food" and "how many things", so a Reunion of 12 asked for 1.4 tables and 7.2
// folding chairs, and a Cookout of 23 asked for 0.7 canopies. Worse, the seating
// map then did Array.from({length: 1.4}) — drawing ONE table under a label that
// said 1.4, so the picture and the copy disagreed with each other AND reality.
//
// Coverage rounds UP: you need at least the computed amount, so 1.4 tables is 2.
// This sweeps every playbook at several sizes so the class cannot regrow.
const { playbookCapacity, ALL_PLAYBOOKS } = require('../playbooks');
const { tableCountOf, clampTableCount, buildSeatingPlan } = require('../seatingPlan');

const iso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12); return d.toISOString().slice(0, 10); };

describe('capacity rows are whole things', () => {
  test('no playbook, at any size, asks for a fraction of a physical rental', () => {
    const bad = [];
    for (const pb of ALL_PLAYBOOKS) {
      const type = pb.label || pb.type || pb.id;
      for (const guestCount of [1, 8, 12, 23, 37, 85, 140]) {
        let cap = null;
        try { cap = playbookCapacity({ id: 'w', type, date: iso(40), guestCount }); } catch { continue; }
        for (const it of ((cap && cap.items) || [])) {
          if (!it || !Number.isFinite(Number(it.qty))) continue;
          if (Number(it.qty) % 1 !== 0) bad.push(`${type}@${guestCount} :: ${it.short} = ${it.qty}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  test('coverage rounds UP, never down — a partial need is still a whole rental', () => {
    // A Cookout of 23 previously produced 0.7 canopies; whatever the factor, the
    // answer must be a whole number ≥ 1 when any need exists at all.
    const cap = playbookCapacity({ id: 'w', type: 'Cookout', date: iso(40), guestCount: 23 });
    const items = (cap && cap.items) || [];
    expect(items.length).toBeGreaterThan(0);
    for (const it of items) {
      if (!Number.isFinite(Number(it.qty))) continue;
      expect(Number.isInteger(Number(it.qty))).toBe(true);
      expect(Number(it.qty)).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('the seating model never reports a fractional table', () => {
  test('a derived count is whole', () => {
    for (const guestCount of [1, 12, 23, 37, 85]) {
      const n = tableCountOf({ id: 't', type: 'Reunion', date: iso(40), guestCount });
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(1);
    }
  });

  test('a fractional count ALREADY PERSISTED on an event is healed on read', () => {
    // Events saved before the fix can carry event.tables = 1.2 forever.
    expect(tableCountOf({ id: 't', type: 'Reunion', tables: 1.2 })).toBe(2);
    expect(tableCountOf({ id: 't', type: 'Reunion', tables: 4.4 })).toBe(5);
    expect(tableCountOf({ id: 't', type: 'Reunion', tables: 6 })).toBe(6);
  });

  test('the ± stepper clamp only ever yields whole tables ≥ 1', () => {
    expect(clampTableCount(1.2)).toBe(2);
    expect(clampTableCount(0)).toBe(1);
    expect(clampTableCount(-3)).toBe(1);
    expect(clampTableCount('junk')).toBe(1);
    expect(clampTableCount(7)).toBe(7);
  });
});

describe('a meal nobody named never prints as a meal', () => {
  // Host report 2026-07-28: a table row read "Table 1  undefined 2". The rollup
  // rejected only the '—' sentinel, so a guest with no meal recorded bucketed
  // under the key `undefined` and the label printed it raw.
  const plan = (guests) => buildSeatingPlan({ id: 'm', type: 'Reunion', tables: 1, guests });

  test('guests with no meal are simply absent from the breakdown', () => {
    const sp = plan([
      { id: 'a', name: 'A', rsvp: 'Yes', table: 1 },                       // no meal at all
      { id: 'b', name: 'B', rsvp: 'Yes', table: 1, meal: '' },             // blank
      { id: 'c', name: 'C', rsvp: 'Yes', table: 1, meal: '—' },            // the sentinel
      { id: 'd', name: 'D', rsvp: 'Yes', table: 1, meal: 'Vegetarian' },   // a real answer
    ]);
    const meals = sp.tables[0].meals;
    expect(Object.keys(meals)).toEqual(['Vegetarian']);
    expect(meals.Vegetarian).toBe(1);
    expect(JSON.stringify(meals)).not.toMatch(/undefined|null/);
  });

  test('a plus-one with no meal recorded adds no phantom plate', () => {
    const sp = plan([{ id: 'a', name: 'A', rsvp: 'Yes', table: 1, meal: 'Standard', plusOne: 'Jo' }]);
    expect(Object.keys(sp.tables[0].meals)).toEqual(['Standard']);
  });
});
