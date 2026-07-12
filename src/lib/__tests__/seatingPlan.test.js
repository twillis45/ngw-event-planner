// Sprint 1 "One app" — seating engine contract, extracted verbatim from the
// legacy Seating component. Locks: strict rsvp === 'Yes' filter, strict
// table === number occupancy, the || 5 table-count default, evenness math,
// the shipped auto-assign round-robin (per GUEST — preserved quirk), and the
// no-invented-guests rule for headcount-only events. No per-table capacity
// exists in the data model, so none is asserted (and none is fabricated).

import {
  buildSeatingPlan,
  confirmedGuests,
  filterGuestsByName,
  dietChipsFor,
  assignGuestToTable,
  unassignGuest,
  autoAssignByGroup,
  renameTable,
  tableLabel,
  tableCountOf,
  clampTableCount,
  DEFAULT_TABLE_COUNT,
  MEAL_SHORT,
} from '../seatingPlan';

const g = (id, over = {}) => ({ id, name: `Guest ${id}`, rsvp: 'Yes', table: null, meal: 'Standard', ...over });
const ev = (over = {}) => ({ id: 'e1', name: 'Test Event', ...over });

// ── Table count resolution ────────────────────────────────────────────────────

test('table count defaults to 5 exactly like every legacy read site (event.tables || 5)', () => {
  expect(tableCountOf(ev())).toBe(DEFAULT_TABLE_COUNT);
  expect(tableCountOf(ev({ tables: 0 }))).toBe(5);
  expect(tableCountOf(ev({ tables: 8 }))).toBe(8);
  expect(buildSeatingPlan(ev()).tableCount).toBe(5);
  expect(buildSeatingPlan(ev({ tables: 3 })).tables).toHaveLength(3);
});

test('clampTableCount mirrors the legacy input handler: never below 1, junk becomes 1', () => {
  expect(clampTableCount(7)).toBe(7);
  expect(clampTableCount('12')).toBe(12);
  expect(clampTableCount(0)).toBe(1);
  expect(clampTableCount(-4)).toBe(1);
  expect(clampTableCount('junk')).toBe(1);
  expect(clampTableCount(undefined)).toBe(1);
});

// ── Confirmed / unassigned derivation ────────────────────────────────────────

test('only strict rsvp === "Yes" guests count — Maybe/No/pending never enter seating', () => {
  const guests = [g('a'), g('b', { rsvp: 'Maybe' }), g('c', { rsvp: 'No' }), g('d', { rsvp: '' }), g('e', { rsvp: 'yes' })];
  expect(confirmedGuests(guests).map(x => x.id)).toEqual(['a']);
  const p = buildSeatingPlan(ev({ guests }));
  expect(p.totals.confirmed).toBe(1);
  expect(p.unassigned.map(x => x.id)).toEqual(['a']);
});

test('unassigned = confirmed with no table; seated = the rest; totals reconcile', () => {
  const guests = [g('a', { table: 1 }), g('b', { table: 2 }), g('c'), g('d'), g('e', { rsvp: 'No', table: 3 })];
  const p = buildSeatingPlan(ev({ guests, tables: 3 }));
  expect(p.totals.seated).toBe(2);
  expect(p.totals.unassigned).toBe(2);
  expect(p.unassigned.map(x => x.id)).toEqual(['c', 'd']);
  expect(p.totals.seated + p.totals.unassigned).toBe(p.totals.confirmed);
});

test('occupancy uses strict table === number, exactly as the legacy grid did', () => {
  // A string table value never rendered in the legacy grid — preserved, not "fixed".
  const guests = [g('a', { table: 2 }), g('b', { table: '2' }), g('c', { table: 2 })];
  const p = buildSeatingPlan(ev({ guests, tables: 3 }));
  expect(p.tables[1].count).toBe(2);
  expect(p.tables[1].guests.map(x => x.id)).toEqual(['a', 'c']);
});

// ── Per-table rollups ────────────────────────────────────────────────────────

test('per-table meal + kids rollups match the legacy card math', () => {
  const guests = [
    g('a', { table: 1, meal: 'Vegetarian', kids: 2 }),
    g('b', { table: 1, meal: 'Vegetarian' }),
    g('c', { table: 1, meal: 'Standard', kids: 1 }),
    g('d', { table: 1, meal: '—' }), // legacy excluded only '—' from the rollup
  ];
  const t1 = buildSeatingPlan(ev({ guests, tables: 2 })).tables[0];
  expect(t1.meals).toEqual({ Vegetarian: 2, Standard: 1 });
  expect(t1.kids).toBe(3);
  expect(t1.count).toBe(4);
});

test('table labels: host name wins, blank falls back to "Table N"', () => {
  const p = buildSeatingPlan(ev({ tables: 3, tableNames: ['Head Table', ''] }));
  expect(p.tables.map(t => t.label)).toEqual(['Head Table', 'Table 2', 'Table 3']);
  expect(p.tables[0].name).toBe('Head Table');
  expect(p.tables[1].name).toBeNull();
  expect(tableLabel(['Head Table'], 1)).toBe('Head Table');
  expect(tableLabel(null, 4)).toBe('Table 4');
});

// ── Balance ("evenness") + avg — the only capacity math the model has ────────

test('avgPerTable = round(confirmed / tables); null (never 0 or fake) with no confirmed guests', () => {
  const guests = [g('a'), g('b'), g('c'), g('d'), g('e')];
  expect(buildSeatingPlan(ev({ guests, tables: 2 })).totals.avgPerTable).toBe(3);
  expect(buildSeatingPlan(ev({ tables: 2 })).totals.avgPerTable).toBeNull();
});

test('tablesEven: false until anyone is seated, true for one occupied table, then max−min ≤ 1 over NON-EMPTY tables', () => {
  const base = { tables: 3 };
  expect(buildSeatingPlan(ev({ ...base, guests: [g('a')] })).totals.tablesEven).toBe(false); // seated === 0
  expect(buildSeatingPlan(ev({ ...base, guests: [g('a', { table: 1 }), g('b', { table: 1 })] })).totals.tablesEven).toBe(true); // single non-empty table
  const uneven = [g('a', { table: 1 }), g('b', { table: 1 }), g('c', { table: 1 }), g('d', { table: 2 })];
  expect(buildSeatingPlan(ev({ ...base, guests: uneven })).totals.tablesEven).toBe(false); // 3 vs 1
  const even = [g('a', { table: 1 }), g('b', { table: 1 }), g('c', { table: 2 })];
  expect(buildSeatingPlan(ev({ ...base, guests: even })).totals.tablesEven).toBe(true); // 2 vs 1, empty table 3 ignored
});

test('allSeated only when there ARE confirmed guests and none are unassigned', () => {
  expect(buildSeatingPlan(ev()).totals.allSeated).toBe(false); // empty ≠ done
  expect(buildSeatingPlan(ev({ guests: [g('a', { table: 1 })] })).totals.allSeated).toBe(true);
  expect(buildSeatingPlan(ev({ guests: [g('a', { table: 1 }), g('b')] })).totals.allSeated).toBe(false);
});

// ── Diet / accessibility chips ───────────────────────────────────────────────

test('diet chips derive only from real guest fields, in legacy order', () => {
  const guests = [
    g('a', { meal: 'Vegetarian' }),
    g('b', { meal: 'Vegan' }),
    g('c', { meal: 'Gluten-Free', kids: 2 }),
    g('d', { needs: 'wheelchair access' }),
    g('e', { rsvp: 'No', meal: 'Vegan' }), // not confirmed → not counted
  ];
  const p = buildSeatingPlan(ev({ guests }));
  expect(p.dietChips).toEqual(['Veg 2', 'GF 1', 'Kids 2', 'Wheelchair 1']);
  expect(dietChipsFor([])).toEqual([]);
});

// ── Empty / degenerate states — never invent guests ──────────────────────────

test('headcount-only event (no roster): tables exist and empty, roster arrays empty, nothing invented', () => {
  const p = buildSeatingPlan(ev({ guestCount: 40, tables: 6 }));
  expect(p.enabled).toBe(true);
  expect(p.hasRoster).toBe(false);
  expect(p.tables).toHaveLength(6);
  expect(p.tables.every(t => t.count === 0 && t.guests.length === 0)).toBe(true);
  expect(p.confirmed).toEqual([]);
  expect(p.unassigned).toEqual([]);
  expect(p.dietChips).toEqual([]);
  expect(p.totals).toEqual({ confirmed: 0, seated: 0, unassigned: 0, tableCount: 6, avgPerTable: null, tablesEven: false, allSeated: false });
});

test('null / malformed event input degrades safely', () => {
  expect(buildSeatingPlan(null).tableCount).toBe(5);
  expect(buildSeatingPlan(undefined).totals.confirmed).toBe(0);
  expect(buildSeatingPlan(ev({ guests: 'nope', tableNames: 'nope' })).hasRoster).toBe(false);
});

// ── Write-shape helpers (UI persists the returned array) ────────────────────

test('assignGuestToTable returns a NEW array with only that guest moved', () => {
  const guests = [g('a'), g('b', { rsvp: 'No' })];
  const next = assignGuestToTable(guests, 'a', 3);
  expect(next).not.toBe(guests);
  expect(next.find(x => x.id === 'a').table).toBe(3);
  expect(next.find(x => x.id === 'b')).toBe(guests[1]); // untouched rows keep identity
  expect(guests.find(x => x.id === 'a').table).toBeNull(); // input not mutated
});

test('unassignGuest writes table: null (exactly what legacy wrote)', () => {
  const next = unassignGuest([g('a', { table: 2 })], 'a');
  expect(next[0].table).toBeNull();
});

test('auto-assign by group: shipped round-robin per GUEST across tables 1..N (preserved quirk)', () => {
  const guests = [
    g('a', { group: 'Family' }),
    g('b', { group: 'Family' }),
    g('c', { group: 'Work' }),
    g('d', { group: 'Work' }),
  ];
  const next = autoAssignByGroup(guests, 3);
  // tableIdx advances per guest: a→1, b→2, c→3, d→1 (wraps)
  expect(next.map(x => x.table)).toEqual([1, 2, 3, 1]);
});

test('auto-assign leaves already-seated, ungrouped, and non-confirmed guests untouched', () => {
  const guests = [
    g('a', { group: 'Family', table: 4 }),      // already seated — skipped
    g('b'),                                      // no group — skipped
    g('c', { group: 'Family', rsvp: 'Maybe' }),  // not confirmed — skipped
    g('d', { group: 'Family' }),                 // the only one assigned
  ];
  const next = autoAssignByGroup(guests, 5);
  expect(next.map(x => x.table)).toEqual([4, null, null, 1]);
});

test('renameTable trims and returns the next names array; blank clears back to the default label', () => {
  expect(renameTable(['Head Table'], 2, '  Kids Table ')).toEqual(['Head Table', 'Kids Table']);
  expect(renameTable(undefined, 1, 'VIP')).toEqual(['VIP']);
  const cleared = renameTable(['Head Table'], 1, '   ');
  expect(cleared).toEqual(['']);
  expect(tableLabel(cleared, 1)).toBe('Table 1');
});

// ── Search + labels chrome helpers ───────────────────────────────────────────

test('filterGuestsByName: empty query passes all; otherwise case-insensitive substring; nameless rows never crash', () => {
  const list = [g('a', { name: 'Ann Alvarez' }), g('b', { name: 'Bob' }), g('c', { name: undefined })];
  expect(filterGuestsByName(list, '')).toEqual(list);
  expect(filterGuestsByName(list, 'alv').map(x => x.id)).toEqual(['a']);
  expect(filterGuestsByName(list, 'ANN').map(x => x.id)).toEqual(['a']);
  expect(filterGuestsByName(list, 'zzz')).toEqual([]);
});

test('MEAL_SHORT keeps the exact legacy pill labels', () => {
  expect(MEAL_SHORT).toEqual({ Standard: 'Std', Vegetarian: 'Veg', Vegan: 'Vgn', 'Gluten-Free': 'GF', '—': '' });
});
