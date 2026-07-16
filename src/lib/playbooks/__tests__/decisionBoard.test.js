// playbookDecisionBoard — the host "Decisions" reader (Figma 1692:3). Pure, derived
// entirely from existing engine state (guestCountResolved / attendanceBand /
// dietaryResolved / foundation facts / authored decisions[]). No fabricated counts.
import { playbookFoodPlan, playbookDecisionOptions, playbookDecisionBoard, playbookHostDifficulty } from '../index';

const roster = (yes, no, pending) => ([
  ...Array.from({ length: yes }, (_, i) => ({ name: `Y${i}`, rsvp: 'Yes' })),
  ...Array.from({ length: no }, (_, i) => ({ name: `N${i}`, rsvp: 'No' })),
  ...Array.from({ length: pending }, (_, i) => ({ name: `P${i}`, rsvp: '' })),
]);

describe('playbookDecisionBoard — shape + safety', () => {
  test('null/empty event → empty board', () => {
    // 2026-07-15: the empty shape now also carries the priority-tier board fields
    // (hostDifficulty, heartAtRisk) so the return is one consistent shape.
    // Wave-2b: `deferred` (the horizon "comes up closer" bucket) joins the shape too.
    expect(playbookDecisionBoard(null)).toEqual({ open: [], locked: [], deferred: [], headcount: null, hostDifficulty: null, heartAtRisk: false });
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
    expect(b.open.find((r) => r.id === 'f-date')).toMatchObject({ status: 'ready', label: 'Lock the date' });
    expect(b.open.find((r) => r.id === 'f-headcount')).toMatchObject({ status: 'ready' });
    expect(b.locked.find((r) => r.id === 'f-date')).toBeUndefined();
  });

  test('date + venue + locked headcount → all three settle into LOCKED', () => {
    const b = playbookDecisionBoard(
      { id: 'e', type: 'Dinner Party', date: '2026-02-01', venue: 'The Loft', guestMode: 'count', guestCount: 30 },
      '2026-01-01',
    );
    expect(b.locked.find((r) => r.id === 'f-date')).toMatchObject({ status: 'locked' });
    expect(b.locked.find((r) => r.id === 'f-venue')).toMatchObject({ status: 'locked', because: 'The Loft' });
    expect(b.locked.find((r) => r.id === 'f-headcount')).toMatchObject({ status: 'locked', because: '30 guests' });
    // A locked count is never also the hero.
    expect(b.headcount).toBeNull();
    // Venue is never nagged when unset (home hosting) — no open venue row.
    const b2 = playbookDecisionBoard({ id: 'e', type: 'Dinner Party', date: '2026-02-01' }, '2026-01-01');
    expect(b2.open.find((r) => r.id === 'f-venue')).toBeUndefined();
    expect(b2.locked.find((r) => r.id === 'f-venue')).toBeUndefined();
  });
});

describe('headcount hero — only with genuinely outstanding RSVPs, honest math', () => {
  test('roster with replies still out → hero with confirmed/outstanding/invited', () => {
    const b = playbookDecisionBoard({ id: 'e', type: 'Dinner Party', date: '2026-02-01', guests: roster(22, 6, 12) }, '2026-01-01');
    expect(b.headcount).toMatchObject({ confirmed: 22, outstanding: 12, invited: 40 });
    expect(b.headcount.because).toBe('22 confirmed · 12 still out of 40 invited');
    // Not duplicated as an open or locked row.
    expect(b.open.find((r) => r.id === 'f-headcount')).toBeUndefined();
    expect(b.locked.find((r) => r.id === 'f-headcount')).toBeUndefined();
  });

  test('fully-replied roster (no one out) → headcount settles, no hero', () => {
    const b = playbookDecisionBoard({ id: 'e', type: 'Dinner Party', date: '2026-02-01', guests: roster(20, 4, 0) }, '2026-01-01');
    expect(b.headcount).toBeNull();
    expect(b.locked.find((r) => r.id === 'f-headcount')).toMatchObject({ status: 'locked' });
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

  test('OVERDUE-ON-CREATION: an event just created close to its date is TIGHT, not overdue', () => {
    // Created 2026-01-01, event 2026-01-05 (4 days out). The format decision has a
    // 21-day lead — it was NEVER reachable, so it must read "tight," not "overdue."
    const b = playbookDecisionBoard(
      { id: 'e', type: 'Dinner Party', date: '2026-01-05', createdAt: '2026-01-01T09:00:00Z', guests: roster(22, 6, 12) },
      '2026-01-01',
    );
    const fmt = b.open.find((r) => r.id === 'format');
    expect(fmt.status).toBe('ready');              // not 'overdue' — no blame on a fresh event
    // warm, forward copy — a first move, not a deadline or a scold
    expect(fmt.because).toMatch(/good place to start/i);
    expect(fmt.because).not.toMatch(/Was due/);
    expect(fmt.because).not.toMatch(/tight/i);     // no pressure word in the first thirty seconds
    // and it does NOT inflate the overdue count that drives "N past their easy window"
    expect(b.open.filter((r) => r.status === 'overdue').length).toBe(0);
  });

  test('OVERDUE-ON-CREATION: a decision reachable at creation but ignored IS still overdue', () => {
    // Created 2025-12-01 (35 days of runway), event 2026-01-05, now 2026-01-01.
    // The 21-day-lead format decision WAS reachable at creation, so ignoring it → genuinely overdue.
    const b = playbookDecisionBoard(
      { id: 'e', type: 'Dinner Party', date: '2026-01-05', createdAt: '2025-12-01T09:00:00Z', guests: roster(22, 6, 12) },
      '2026-01-01',
    );
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

  test('every open decision is actionable — a TRUTHFUL route, or inline settle on the row itself', () => {
    // CTA SOURCE-OF-TRUTH (50-scenario audit, 2026-07-07): a foodFocus route may
    // only name a decision the food plan's "Your choices" card actually renders.
    // Optioned decisions outside that list (seating, theme, shade…) settle
    // INLINE on the board row (playbookDecisionOptions) — routeless by design,
    // never a lying deep link.
    const ev = { id: 'e', type: 'Dinner Party', date: '2026-02-01', guests: roster(22, 6, 12) };
    const b = playbookDecisionBoard(ev, '2026-01-01');
    const find = (id) => b.open.find((r) => r.id === id);
    const fp = playbookFoodPlan(ev);
    const foodChoiceIds = new Set(((fp && fp.choices) || []).map((c) => c && c.id));
    // Every foodFocus route names a choice the destination renders — no exceptions.
    b.open.concat(b.locked || []).forEach((r) => {
      if (r.route && r.route.foodFocus) expect(foodChoiceIds.has(r.route.foodFocus)).toBe(true);
    });
    // Every open row is still actionable: a route, or inline options on the row.
    b.open.forEach((r) => {
      const inline = !!playbookDecisionOptions(ev, r.id);
      expect(!!r.route || inline).toBe(true);
    });
    expect(find('seating')).toBeTruthy();
  });

  test('open rows are ordered overdue → ready → waiting', () => {
    const b = playbookDecisionBoard({ id: 'e', type: 'Dinner Party', date: '2026-01-05', guests: roster(22, 6, 12) }, '2026-01-01');
    const ranks = { overdue: 0, ready: 1, waiting: 2 };
    const seq = b.open.map((r) => ranks[r.status]);
    const sorted = [...seq].sort((a, b2) => a - b2);
    expect(seq).toEqual(sorted);
  });
});

describe('decision priority tier (DECISION_SCHEMA_SPEC §4.A/§6) — fields, ordering, heart, hostDifficulty', () => {
  // Retirement's `tribute` is the reference heart-moment decision (deliversHeartMoment,
  // weight:high, emotionalWeight:high, reversibility:costly, difmCapable:needs-host).
  const retirement = (extra) => ({ id: 'e', type: 'Retirement Party', date: '2026-02-01', guests: roster(30, 4, 6), ...extra });

  test('open rows carry the five priority fields from the source decision', () => {
    const b = playbookDecisionBoard(retirement(), '2026-01-01');
    const tribute = [...b.open, ...b.locked].find((r) => r.id === 'tribute');
    expect(tribute).toMatchObject({
      deliversHeartMoment: true,
      weight: 'high',
      emotionalWeight: 'high',
      reversibility: 'costly',
      difmCapable: 'needs-host',
    });
    // music is authored low-weight, non-heart — the fields pass through as authored.
    const music = [...b.open, ...b.locked].find((r) => r.id === 'music');
    expect(music).toMatchObject({ weight: 'low', deliversHeartMoment: false });
  });

  test('within a status band, the heart-moment decision floats above lower-weight peers', () => {
    const b = playbookDecisionBoard(retirement(), '2026-01-01');
    const ready = b.open.filter((r) => r.status === 'ready');
    const ti = ready.findIndex((r) => r.id === 'tribute');
    const mi = ready.findIndex((r) => r.id === 'music');
    // Both must be in the ready band for this comparison to mean anything.
    if (ti >= 0 && mi >= 0) expect(ti).toBeLessThan(mi);
  });

  test('status band is still PRIMARY — overdue → ready → waiting is never broken by weight', () => {
    const b = playbookDecisionBoard(retirement({ date: '2026-01-05' }), '2026-01-01');
    const ranks = { overdue: 0, ready: 1, waiting: 2 };
    const seq = b.open.map((r) => ranks[r.status]);
    expect(seq).toEqual([...seq].sort((a, b2) => a - b2));
  });

  test('heartAtRisk is true while the tribute is open, false once it is settled', () => {
    const open = playbookDecisionBoard(retirement(), '2026-01-01');
    expect(open.heartAtRisk).toBe(true);
    const settled = playbookDecisionBoard(retirement({ foodChoices: { tribute: '3-5 pre-assigned speakers' } }), '2026-01-01');
    expect(settled.heartAtRisk).toBe(false);
    expect(settled.locked.find((r) => r.id === 'tribute')).toBeTruthy();
  });

  test('hostDifficulty is exposed on the board and via the helper', () => {
    const b = playbookDecisionBoard(retirement(), '2026-01-01');
    expect(b.hostDifficulty).toBe('moderate');
    expect(playbookHostDifficulty(retirement())).toBe('moderate');
    expect(playbookHostDifficulty({ id: 'e', type: 'Unknown Type' })).toBeNull();
  });
});

describe('Wave-2a prioritization recovery (DECISION_SCHEMA_SPEC §4.A/§6)', () => {
  const roster2 = (yes, no, pending) => ([
    ...Array.from({ length: yes }, (_, i) => ({ name: `Y${i}`, rsvp: 'Yes' })),
    ...Array.from({ length: no }, (_, i) => ({ name: `N${i}`, rsvp: 'No' })),
    ...Array.from({ length: pending }, (_, i) => ({ name: `P${i}`, rsvp: '' })),
  ]);
  const idx = (rows, id) => rows.findIndex((r) => r.id === id);

  // (1) ALL-AXIS SORT — reversibility/emotionalWeight actually move the order, not
  // just weight or the deadline. Crab, event today: steam_vs_order is LESS overdue
  // than where_buy (-7 vs -10) yet ranks ABOVE it, because it's harder to reverse
  // (reversibility:'costly' vs 'reversible'). A weight+soonest-due sort would rank
  // the more-overdue where_buy first — proving the reversibility axis participates.
  test('reversibility + emotionalWeight participate — a less-overdue but harder-to-undo decision outranks a more-overdue reversible peer', () => {
    const crab = { id: 'e', type: 'Crab Feast', date: '2026-01-15', guestMode: 'count', guestCount: 20 };
    const b = playbookDecisionBoard(crab, '2026-01-15');
    const steam = b.open.find((r) => r.id === 'steam_vs_order');
    const where = b.open.find((r) => r.id === 'where_buy');
    expect(steam && where).toBeTruthy();
    // steam is LESS overdue than where_buy…
    expect(steam.daysOut).toBeGreaterThan(where.daysOut);
    // …yet ranks higher, because reversibility:'costly' beats 'reversible'.
    expect(idx(b.open, 'steam_vs_order')).toBeLessThan(idx(b.open, 'where_buy'));
    // and low-weight sides/drinks sink below the med-weight rows (weight participates).
    expect(idx(b.open, 'steam_vs_order')).toBeLessThan(idx(b.open, 'sides'));
    expect(idx(b.open, 'crab_size')).toBeLessThan(idx(b.open, 'drinks'));
    // high-weight dietary (allergy safety) leads them all.
    expect(idx(b.open, 'dietary')).toBe(0);
  });

  // (2) GUARDED CROSS-BAND HEART-FLOAT — retirement mixed band (event 15 days out).
  // OLD model (status-primary): tribute is READY, so it sank BELOW all seven overdue
  // rows → rank 8. NEW model: the heart-moment tribute floats above the LOW/MED
  // overdue admin rows (format/bar/help) to rank ~5, WITHOUT passing any genuinely
  // urgent high-weight overdue (venue/surprise/invite/food_style).
  test('a READY heart-moment decision floats above LOW/MED overdue admin, but never above a high-weight overdue', () => {
    const b = playbookDecisionBoard({ id: 'e', type: 'Retirement Party', date: '2026-02-01', guests: roster2(30, 4, 6) }, '2026-01-17');
    const tribute = b.open.find((r) => r.id === 'tribute');
    expect(tribute.status).toBe('ready');
    expect(tribute.deliversHeartMoment).toBe(true);
    const ti = idx(b.open, 'tribute');
    // Floats ABOVE the soft (low/med-weight) overdue admin rows.
    for (const softId of ['format', 'bar', 'help']) {
      const row = b.open.find((r) => r.id === softId);
      expect(row.status).toBe('overdue');
      expect(['low', 'med']).toContain(row.weight);
      expect(ti).toBeLessThan(idx(b.open, softId));
    }
    // GUARD: every genuinely urgent (high-weight) OVERDUE decision still leads it —
    // no real high-stakes overdue item is hidden below the floated heart moment.
    const highOverdue = b.open.filter((r) => r.status === 'overdue' && r.weight === 'high');
    expect(highOverdue.length).toBeGreaterThan(0);
    for (const r of highOverdue) expect(idx(b.open, r.id)).toBeLessThan(ti);
    // Status order is legitimately no longer monotonic here (the float is the point):
    // a 'ready' tribute sits above three 'overdue' rows — the wave-1 bug, now fixed.
    const rank = { overdue: 0, ready: 1, waiting: 2 };
    const seq = b.open.map((r) => rank[r.status]);
    expect(seq).not.toEqual([...seq].sort((a, c) => a - c));
  });

  // (3) AGING / DECAY — an overdue decision's effective rank rises the longer it's
  // ignored, bounded. Retirement 'music' (low-weight) overdue 1 day vs 13 days: the
  // aged instance scores strictly higher, and the climb is capped (never overpowers
  // a full status tier).
  test('an overdue decision climbs as it ages, bounded by the decay cap', () => {
    const ev = { id: 'e', type: 'Retirement Party', date: '2026-02-01', guests: roster2(30, 4, 6) };
    const fresh = playbookDecisionBoard(ev, '2026-01-19').open.find((r) => r.id === 'music'); // overdue ~1d
    const aged = playbookDecisionBoard(ev, '2026-01-31').open.find((r) => r.id === 'music');  // overdue ~13d
    expect(fresh.status).toBe('overdue');
    expect(aged.status).toBe('overdue');
    expect(-aged.daysOut).toBeGreaterThan(-fresh.daysOut); // genuinely more overdue
    // climbs…
    expect(aged.priorityScore).toBeGreaterThan(fresh.priorityScore);
    // …but bounded: the age contribution alone can never exceed the 6-pt decay cap,
    // so a low-weight item never leaps a full status tier purely on age.
    expect(aged.priorityScore - fresh.priorityScore).toBeLessThanOrEqual(6);
  });

  // (4) SHOW THE WORK — every open row carries a host-facing rankReason; when the
  // source decision declares priorityBasis, the reason PREFERS its authored
  // rationale; otherwise a derived reason is used.
  test('rankReason is present on every open row and prefers an authored priorityBasis.rationale', () => {
    const ret = playbookDecisionBoard({ id: 'e', type: 'Retirement Party', date: '2026-02-01', guests: roster2(30, 4, 6) }, '2026-01-17');
    for (const r of ret.open) {
      expect(typeof r.rankReason).toBe('string');
      expect(r.rankReason.trim().length).toBeGreaterThan(0);
    }
    // tribute's source decision carries priorityBasis → rankReason is its rationale.
    const tribute = ret.open.find((r) => r.id === 'tribute');
    expect(tribute.priorityBasis).toBeTruthy();
    expect(typeof tribute.priorityBasis.rationale).toBe('string');
    expect(tribute.rankReason).toBe(tribute.priorityBasis.rationale.trim());

    // Dinner Party's decisions now carry authored priorityBasis too (fleet-wide priority-axis
    // authoring), so its rows also prefer the authored rationale — the show-your-work path
    // reaches every event type, not just the 2 flagships. (The DERIVED reason fallback for an
    // un-authored decision is unit-tested in decisionBoardWave2b.test.js.)
    const dp = playbookDecisionBoard({ id: 'e', type: 'Dinner Party', date: '2026-01-05', guests: roster2(22, 6, 12) }, '2026-01-01');
    const fmt = dp.open.find((r) => r.id === 'format');
    expect(fmt.status).toBe('overdue');
    expect(fmt.priorityBasis).toBeTruthy();
    expect(fmt.rankReason).toBe(fmt.priorityBasis.rationale.trim());
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

  test('unknown / missing ids return null; optioned decisions settle inline (HOST-AUDIT-1)', () => {
    // Doctrine change: ANY decision with authored options settles inline —
    // seating included. Inline settle is the deepest link.
    expect(playbookDecisionOptions(evt, 'seating')).toMatchObject({ id: 'seating' });
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

describe('POP-1C — vendor-blocked route uses the canonical isVendorBooked, not an inline regex', () => {
  // Anniversary's "help" decision has blocks:['vendors'] with no options overlap
  // with food-choice, so its route always resolves via _firstUndoneVendorRoute.
  const anniversaryEvent = (vendors) => ({ id: 'e', type: 'Anniversary', date: '2026-03-01', guests: roster(20, 2, 3), vendors });

  test('a "Deposit Paid" vendor is treated as booked — route prioritizes the genuinely undone vendor over it', () => {
    const b = playbookDecisionBoard(anniversaryEvent([
      { id: 'v1', name: 'DJ Co', status: 'Deposit Paid' },
      { id: 'v2', name: 'Bartender Co', status: 'Considering' },
    ]), '2026-01-01');
    const help = [...b.open, ...b.locked].find((r) => r.id === 'help');
    expect(help.route.vendorId).toBe('v2'); // the old buggy regex would have matched v1 as "undone" too and picked whichever sorted first
  });

  test('a "Contracted" vendor is treated as booked the same way', () => {
    const b = playbookDecisionBoard(anniversaryEvent([
      { id: 'v1', name: 'Caterer Co', status: 'Contracted' },
      { id: 'v2', name: 'Bartender Co', status: 'Considering' },
    ]), '2026-01-01');
    const help = [...b.open, ...b.locked].find((r) => r.id === 'help');
    expect(help.route.vendorId).toBe('v2');
  });

  test('a genuinely un-booked vendor (e.g. "Considering") still gets routed to', () => {
    const b = playbookDecisionBoard(anniversaryEvent([{ id: 'v1', name: 'Bartender Co', status: 'Considering' }]), '2026-01-01');
    const help = [...b.open, ...b.locked].find((r) => r.id === 'help');
    expect(help.route.vendorId).toBe('v1');
  });
});
