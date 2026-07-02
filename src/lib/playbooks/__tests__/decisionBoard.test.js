// playbookDecisionBoard — the host "Decisions" reader (Figma 1692:3). Pure, derived
// entirely from existing engine state (guestCountResolved / attendanceBand /
// dietaryResolved / foundation facts / authored decisions[]). No fabricated counts.
import { playbookDecisionBoard, playbookDecisionOptions } from '../index';

const roster = (yes, no, pending) => ([
  ...Array.from({ length: yes }, (_, i) => ({ name: `Y${i}`, rsvp: 'Yes' })),
  ...Array.from({ length: no }, (_, i) => ({ name: `N${i}`, rsvp: 'No' })),
  ...Array.from({ length: pending }, (_, i) => ({ name: `P${i}`, rsvp: '' })),
]);

describe('playbookDecisionBoard — shape + safety', () => {
  test('null/empty event → empty board', () => {
    expect(playbookDecisionBoard(null)).toEqual({ open: [], locked: [], headcount: null });
    const b = playbookDecisionBoard({ id: 'e', type: 'Unknown Type' });
    expect(Array.isArray(b.open)).toBe(true);
    expect(Array.isArray(b.locked)).toBe(true);
  });

  test('every row carries the contract fields', () => {
    const b = playbookDecisionBoard({ id: 'e', type: 'Dinner Party', date: '2026-02-01', guests: roster(22, 6, 12) }, '2026-01-01');
    for (const r of [...b.open, ...b.locked]) {
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('label');
      expect(['ready', 'waiting', 'overdue', 'locked']).toContain(r.status);
      expect(r).toHaveProperty('because');
      expect(r).toHaveProperty('route');
    }
  });
});

describe('foundation facts lock when set', () => {
  test('no date + no count → open "lock the date" + "lock your guest count"; no fabricated headcount', () => {
    const b = playbookDecisionBoard({ id: 'e', type: 'Dinner Party' });
    expect(b.headcount).toBeNull();
    expect(b.open.find((r) => r.id === 'date')).toMatchObject({ status: 'ready', label: 'Lock the date' });
    expect(b.open.find((r) => r.id === 'headcount')).toMatchObject({ status: 'ready' });
    expect(b.locked.find((r) => r.id === 'date')).toBeUndefined();
  });

  test('date + venue + locked headcount → all three settle into LOCKED', () => {
    const b = playbookDecisionBoard(
      { id: 'e', type: 'Dinner Party', date: '2026-02-01', venue: 'The Loft', guestMode: 'count', guestCount: 30 },
      '2026-01-01',
    );
    expect(b.locked.find((r) => r.id === 'date')).toMatchObject({ status: 'locked' });
    expect(b.locked.find((r) => r.id === 'venue')).toMatchObject({ status: 'locked', because: 'The Loft' });
    expect(b.locked.find((r) => r.id === 'headcount')).toMatchObject({ status: 'locked', because: '30 guests' });
    // A locked count is never also the hero.
    expect(b.headcount).toBeNull();
    // Venue is never nagged when unset (home hosting) — no open venue row.
    const b2 = playbookDecisionBoard({ id: 'e', type: 'Dinner Party', date: '2026-02-01' }, '2026-01-01');
    expect(b2.open.find((r) => r.id === 'venue')).toBeUndefined();
    expect(b2.locked.find((r) => r.id === 'venue')).toBeUndefined();
  });
});

describe('headcount hero — only with genuinely outstanding RSVPs, honest math', () => {
  test('roster with replies still out → hero with confirmed/outstanding/invited', () => {
    const b = playbookDecisionBoard({ id: 'e', type: 'Dinner Party', date: '2026-02-01', guests: roster(22, 6, 12) }, '2026-01-01');
    expect(b.headcount).toMatchObject({ confirmed: 22, outstanding: 12, invited: 40 });
    expect(b.headcount.because).toBe('22 confirmed · 12 still out of 40 invited');
    // Not duplicated as an open or locked row.
    expect(b.open.find((r) => r.id === 'headcount')).toBeUndefined();
    expect(b.locked.find((r) => r.id === 'headcount')).toBeUndefined();
  });

  test('fully-replied roster (no one out) → headcount settles, no hero', () => {
    const b = playbookDecisionBoard({ id: 'e', type: 'Dinner Party', date: '2026-02-01', guests: roster(20, 4, 0) }, '2026-01-01');
    expect(b.headcount).toBeNull();
    expect(b.locked.find((r) => r.id === 'headcount')).toMatchObject({ status: 'locked' });
  });
});

describe('decision status derivation', () => {
  test('ready / waiting derive from prerequisites; no pick yet', () => {
    const b = playbookDecisionBoard({ id: 'e', type: 'Dinner Party', date: '2026-02-01', guests: roster(22, 6, 12) }, '2026-01-01');
    // format has no dependsOn and is far from due → ready
    expect(b.open.find((r) => r.id === 'format')).toMatchObject({ status: 'ready' });
    // menu dependsOn [format, dietary]; neither settled → waiting
    const menu = b.open.find((r) => r.id === 'menu');
    expect(menu.status).toBe('waiting');
    expect(menu.because).toMatch(/Waiting on/);
    // seating dependsOn [format] → waiting
    expect(b.open.find((r) => r.id === 'seating')).toMatchObject({ status: 'waiting' });
  });

  test('overdue when the T-Nd deadline is past and not locked', () => {
    // event 4 days out: format (T-21d) is 17 days overdue.
    const b = playbookDecisionBoard({ id: 'e', type: 'Dinner Party', date: '2026-01-05', guests: roster(22, 6, 12) }, '2026-01-01');
    const fmt = b.open.find((r) => r.id === 'format');
    expect(fmt.status).toBe('overdue');
    expect(fmt.because).toMatch(/Was due/);
  });

  test('a made pick locks the decision out of OPEN into LOCKED', () => {
    const b = playbookDecisionBoard(
      { id: 'e', type: 'Dinner Party', date: '2026-02-01', guests: roster(22, 6, 12), foodChoices: { format: 'Family-style' } },
      '2026-01-01',
    );
    expect(b.open.find((r) => r.id === 'format')).toBeUndefined();
    expect(b.locked.find((r) => r.id === 'format')).toMatchObject({ status: 'locked', because: 'Family-style' });
    // and the dependent menu/seating no longer wait on format (format is met now).
    const menu = b.open.find((r) => r.id === 'menu');
    expect(menu.because).not.toMatch(/the format/);
  });

  test('every open decision is actionable — it carries a route to where it settles', () => {
    const b = playbookDecisionBoard({ id: 'e', type: 'Dinner Party', date: '2026-02-01', guests: roster(22, 6, 12) }, '2026-01-01');
    const find = (id) => b.open.find((r) => r.id === id);
    // A food/menu choice (format blocks the menu) settles inline on the Plan tab's "Your choices".
    expect(find('format').route).toMatchObject({ tab: 'Planning', foodFocus: 'format' });
    // Non-menu decisions (seating layout, hiring help) are ALSO actionable now — they route to where the
    // host settles them (no dead, chevron-less prompt). The board re-derives from the plan on every change,
    // so updating that field/row moves the row OPEN → LOCKED on its own.
    expect(find('seating')).toBeTruthy();
    expect(find('seating').route).toBeTruthy();
    expect(find('help')).toBeTruthy();
    expect(find('help').route).toBeTruthy();
    // Invariant: no open row is ever routeless (would render as a dead prompt).
    expect(b.open.every((r) => r.route)).toBe(true);
  });

  test('open rows are ordered overdue → ready → waiting', () => {
    const b = playbookDecisionBoard({ id: 'e', type: 'Dinner Party', date: '2026-01-05', guests: roster(22, 6, 12) }, '2026-01-01');
    const ranks = { overdue: 0, ready: 1, waiting: 2 };
    const seq = b.open.map((r) => ranks[r.status]);
    const sorted = [...seq].sort((a, b2) => a - b2);
    expect(seq).toEqual(sorted);
  });
});

describe('playbookDecisionOptions — inline-settle accessor for the Decisions board', () => {
  const evt = { id: 'e', type: 'Dinner Party', date: '2026-02-01' };

  test('a menu decision id returns its option list + engine-default chosen', () => {
    const o = playbookDecisionOptions(evt, 'format');
    expect(o).toBeTruthy();
    expect(o.id).toBe('format');
    expect(Array.isArray(o.options) && o.options.length).toBeTruthy();
    // chosen falls back to the SAME choicePickFor() default the spread/budget use,
    // so it's a member of the option set before the host has touched anything.
    expect(o.options).toContain(o.chosen);
  });

  test('an explicit pick becomes the chosen value (single-source foodChoices)', () => {
    const picked = { ...evt, foodChoices: { format: 'Family-style' } };
    expect(playbookDecisionOptions(picked, 'format').chosen).toBe('Family-style');
  });

  test('non-menu / unknown / missing ids return null (board keeps route-away)', () => {
    expect(playbookDecisionOptions(evt, 'seating')).toBeNull();
    expect(playbookDecisionOptions(evt, 'nope')).toBeNull();
    expect(playbookDecisionOptions(null, 'format')).toBeNull();
    expect(playbookDecisionOptions(evt, '')).toBeNull();
  });

  test('every menu decision on the board has a resolvable option set', () => {
    const b = playbookDecisionBoard(evt, '2026-01-01');
    const menuRows = [...b.open, ...b.locked].filter((r) => r.route && r.route.foodFocus);
    expect(menuRows.length).toBeGreaterThan(0);
    for (const r of menuRows) {
      const o = playbookDecisionOptions(evt, r.id);
      expect(o).toBeTruthy();
      expect(o.options.length).toBeGreaterThan(0);
    }
  });
});

describe('ordering guard (kept)', () => {
  test('open rows are ordered overdue → ready → waiting', () => {
    const b = playbookDecisionBoard({ id: 'e', type: 'Dinner Party', date: '2026-01-05', guests: roster(22, 6, 12) }, '2026-01-01');
    const ranks = { overdue: 0, ready: 1, waiting: 2 };
    const seq = b.open.map((r) => ranks[r.status]);
    const sorted = [...seq].sort((a, b2) => a - b2);
    expect(seq).toEqual(sorted);
  });
});
