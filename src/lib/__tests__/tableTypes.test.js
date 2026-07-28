// ─── Table types + per-table seat counts (host directive 2026-07-28) ─────────
// "logic to adjust how many each table sits. type of tables."
//
// The rule this must not break: seatingPlan refused to fabricate a capacity off
// data that didn't exist, and that still holds. Capacity appears only when the
// host DECLARES a type (a published dimensional fact) or overrides a table.
// Undeclared stays null — unknown, never a confident-looking zero.
const {
  TABLE_TYPES, TABLE_TYPE_SOURCES, tableTypeById, tableTypeOf,
  seatsForTable, roomSeats, withTableType, withTableSeats,
} = require('../tableTypes');
const { buildSeatingPlan } = require('../seatingPlan');
const { groundingSourceCatalog } = require('../knowledge/groundingSources');

describe('the type registry is well-formed and grounded', () => {
  test('every type has a whole comfortable count and a max that is not smaller', () => {
    expect(TABLE_TYPES.length).toBeGreaterThanOrEqual(6);
    const ids = new Set();
    for (const t of TABLE_TYPES) {
      expect(ids.has(t.id)).toBe(false); ids.add(t.id);
      expect(Number.isInteger(t.seats)).toBe(true);
      expect(Number.isInteger(t.seatsMax)).toBe(true);
      expect(t.seatsMax).toBeGreaterThanOrEqual(t.seats);
      expect(['round', 'long']).toContain(t.shape);
      expect(String(t.label).trim().length).toBeGreaterThan(2);
    }
  });

  test('a standing cocktail table honestly seats nobody', () => {
    expect(tableTypeById('cocktail').seats).toBe(0);
    expect(tableTypeById('cocktail').seatsMax).toBe(4); // …unless you add stools
  });

  test('the capacity registry is joined into the grounding catalog', () => {
    expect(Object.keys(TABLE_TYPE_SOURCES).length).toBeGreaterThan(0);
    const cat = groundingSourceCatalog();
    const axes = cat.map((a) => a.axis || a.label || a.name).filter(Boolean);
    expect(axes.join(' | ')).toMatch(/Table & seating capacity/);
  });

  test('junk never resolves to a type', () => {
    expect(tableTypeById('')).toBe(null);
    expect(tableTypeById('not-a-table')).toBe(null);
    expect(tableTypeById(null)).toBe(null);
  });
});

describe('seatsForTable resolves in the declared order of authority', () => {
  const ev = (extra) => ({ id: 's', type: 'Reunion', tables: 3, ...extra });

  test('unknown stays unknown — no capacity is invented', () => {
    const s = seatsForTable(ev(), 1);
    expect(s.seats).toBe(null);
    expect(s.basis).toBe('unknown');
  });

  test('a declared type supplies the published count', () => {
    const s = seatsForTable(ev({ tableTypes: ['round-60'] }), 1);
    expect(s.seats).toBe(8);
    expect(s.seatsMax).toBe(10);
    expect(s.basis).toBe('type');
  });

  test('a room-wide default applies where no type is declared', () => {
    const s = seatsForTable(ev({ seatsPerTable: 7 }), 2);
    expect(s.seats).toBe(7);
    expect(s.basis).toBe('room');
  });

  test('the host override for THIS table beats everything', () => {
    const s = seatsForTable(ev({ tableTypes: ['round-60'], seatsPerTable: 7, tableSeats: [10] }), 1);
    expect(s.seats).toBe(10);
    expect(s.basis).toBe('host');
    // the type still tells us the squeeze ceiling
    expect(s.seatsMax).toBe(10);
  });

  test('a whole-room type is a legitimate answer for every table', () => {
    const e = ev({ tableType: 'banquet-8' });
    expect(tableTypeOf(e, 1).id).toBe('banquet-8');
    expect(seatsForTable(e, 3).seats).toBe(8);
  });

  test('fractional or junk overrides never become a capacity', () => {
    expect(seatsForTable(ev({ tableSeats: [8.4] }), 1).seats).toBe(9);  // whole things only
    expect(seatsForTable(ev({ tableSeats: ['x'] }), 1).basis).toBe('unknown');
    expect(seatsForTable(ev({ tableSeats: [0] }), 1).basis).toBe('unknown');
  });
});

describe('the room rollup refuses a partial total', () => {
  test('all known → a real total; any unknown → null', () => {
    const all = { id: 'r', tables: 3, tableTypes: ['round-60', 'round-60', 'banquet-8'] };
    expect(roomSeats(all, 3)).toEqual({ total: 24, known: 3, of: 3 });
    const some = { id: 'r', tables: 3, tableTypes: ['round-60'] };
    expect(roomSeats(some, 3).total).toBe(null);
    expect(roomSeats(some, 3).known).toBe(1);
  });
});

describe('the seating plan carries capacity through', () => {
  const guests = [
    { id: 'a', name: 'A', rsvp: 'Yes', table: 1 },
    { id: 'b', name: 'B', rsvp: 'Yes', table: 1 },
    { id: 'c', name: 'C', rsvp: 'Yes', table: 1, plusOne: 'Jo' }, // two chairs
  ];

  test('open seats appear once a type is declared', () => {
    const sp = buildSeatingPlan({ id: 'p', type: 'Reunion', tables: 1, tableTypes: ['round-60'], guests });
    const t = sp.tables[0];
    expect(t.count).toBe(4);        // three rows, one with a plus-one
    expect(t.seats).toBe(8);
    expect(t.open).toBe(4);
    expect(t.over).toBe(false);
    expect(t.typeLabel).toBe('60" round');
    expect(t.shape).toBe('round');
  });

  test('with no type, open is null — never a confident zero', () => {
    const sp = buildSeatingPlan({ id: 'p', type: 'Reunion', tables: 1, guests });
    expect(sp.tables[0].seats).toBe(null);
    expect(sp.tables[0].open).toBe(null);
    expect(sp.tables[0].over).toBe(false);
  });

  test('over-capacity is flagged only against a real number', () => {
    const sp = buildSeatingPlan({ id: 'p', type: 'Reunion', tables: 1, tableTypes: ['sweetheart'], guests });
    expect(sp.tables[0].seats).toBe(2);
    expect(sp.tables[0].over).toBe(true);
    expect(sp.tables[0].open).toBe(0);   // clamped, never negative
  });
});

describe('write helpers touch one table and nothing else', () => {
  test('setting a type leaves neighbours alone and pads honestly', () => {
    const next = withTableType({ tableTypes: ['round-60'] }, 3, 'banquet-8');
    expect(next).toEqual(['round-60', '', 'banquet-8']);
  });
  test('an unknown type id clears rather than storing junk', () => {
    expect(withTableType({ tableTypes: ['round-60'] }, 1, 'nope')).toEqual(['']);
  });
  test('seat overrides round up and clear on null', () => {
    expect(withTableSeats({}, 2, 9.2)).toEqual([null, 10]);
    expect(withTableSeats({ tableSeats: [8] }, 1, null)).toEqual([null]);
  });
});
