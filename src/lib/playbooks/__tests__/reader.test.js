import { getPlaybook, playbookTasks, topPlaybookTask, playbookBudgetCategories, topPlaybookDecision } from '../index';

const DP = (over) => ({
  id: 'e1',
  name: 'Test Dinner',
  type: 'Dinner Party',
  date: '2026-06-20',
  guestCount: 12,
  ...over,
});

describe('getPlaybook registry', () => {
  test('resolves Dinner Party case-insensitively', () => {
    expect(getPlaybook('Dinner Party')).toBeTruthy();
    expect(getPlaybook('dinner party')).toBeTruthy();
    expect(getPlaybook('  DINNER PARTY ')).toBeTruthy();
  });
  test('returns null for non-dinner-party / unknown / empty', () => {
    expect(getPlaybook('Wedding')).toBeNull();
    expect(getPlaybook('')).toBeNull();
    expect(getPlaybook(undefined)).toBeNull();
  });
});

describe('quantity-resolved operational candidate (the success condition)', () => {
  test('on event day, ice resolves to "Buy ice — 18 lbs today"', () => {
    const t = topPlaybookTask(DP({ date: '2026-06-20' }), '2026-06-20');
    expect(t).toBeTruthy();
    expect(t.title).toBe('Buy ice — 18 lbs today');
    expect(t.quantity).toBe(18);
    expect(t.category).toBe('operational');
    expect(t.level).toBe('attention');
    expect(t.primaryRoute.tab).toBe('Planning Tasks');
  });

  test('quantity scales with guest count (8 guests → 12 lbs ice)', () => {
    const t = topPlaybookTask(DP({ date: '2026-06-20', guestCount: 8 }), '2026-06-20');
    expect(t.title).toBe('Buy ice — 12 lbs today');
  });

  test('no guest count present → decision-first: suppress the buy, ask for the count (55G)', () => {
    // Pre-55G this surfaced "Buy ice — 12 lbs" against the typical-guests
    // fallback. Decision-first now refuses to size a buy with no headcount and
    // surfaces the prerequisite decision instead. (Budget categories still use
    // the typical-guests fallback — see playbookBudgetCategories tests.)
    const ev = { id: 'e1', type: 'Dinner Party', date: '2026-06-20' };
    expect(topPlaybookTask(ev, '2026-06-20')).toBeNull();
    expect(topPlaybookDecision(ev, '2026-06-20').decision).toBe('guestCount');
  });
});

describe('window gating', () => {
  test('day before the event, a T-1d essential (due today) outranks ice (tomorrow)', () => {
    const t = topPlaybookTask(DP({ date: '2026-06-20' }), '2026-06-19');
    expect(t.dueInDays).toBe(0);
    expect(t.dueLabel).toBe('today');
    expect(t.title).toMatch(/ today$/);
    expect(t.title).not.toMatch(/ice/); // ice is tomorrow here, not the top
  });

  test('20 days out, nothing is in window → no operational candidate', () => {
    expect(playbookTasks(DP({ date: '2026-06-20' }), '2026-05-31')).toEqual([]);
    expect(topPlaybookTask(DP({ date: '2026-06-20' }), '2026-05-31')).toBeNull();
  });

  test('past-due purchases are dropped (not nagged)', () => {
    // event yesterday: every buyAt offset is in the past → empty
    expect(playbookTasks(DP({ date: '2026-06-13' }), '2026-06-14')).toEqual([]);
  });
});

describe('non-applicability (existing behavior must be unaffected)', () => {
  test('non-dinner-party event → no candidates', () => {
    expect(playbookTasks(DP({ type: 'Wedding' }), '2026-06-20')).toEqual([]);
  });
  test('unknown type → no candidates', () => {
    expect(playbookTasks(DP({ type: 'Quinceañera Gala' }), '2026-06-20')).toEqual([]);
  });
  test('missing date → no candidates', () => {
    expect(playbookTasks(DP({ date: undefined }), '2026-06-20')).toEqual([]);
  });
  test('null event → []', () => {
    expect(playbookTasks(null, '2026-06-20')).toEqual([]);
  });
});

describe('playbookBudgetCategories (engine-derived typical setup)', () => {
  test('Dinner Party → grounded budget categories, NO venue line', () => {
    const cats = playbookBudgetCategories('Dinner Party', 8);
    expect(cats).toBeTruthy();
    const labels = cats.map((c) => c.label);
    expect(labels).toContain('Food & groceries');
    expect(labels).toContain('Drinks & bar');
    expect(labels.some((l) => /venue/i.test(l))).toBe(false);
    // every row carries a positive low/high range
    cats.forEach((c) => {
      expect(c.high).toBeGreaterThanOrEqual(c.low);
      expect(c.low).toBeGreaterThan(0);
    });
  });

  test('amounts scale with guest count (16 guests cost ~2x 8 guests on food)', () => {
    const f8 = playbookBudgetCategories('Dinner Party', 8).find((c) => c.label === 'Food & groceries');
    const f16 = playbookBudgetCategories('Dinner Party', 16).find((c) => c.label === 'Food & groceries');
    expect(f16.low).toBeGreaterThan(f8.low);
    expect(f16.high).toBeGreaterThan(f8.high);
  });

  test('falls back to typical guests when count missing', () => {
    expect(playbookBudgetCategories('Dinner Party')).toBeTruthy();
  });

  test('non-playbook type → null (caller uses share-based estimate)', () => {
    expect(playbookBudgetCategories('Wedding', 120)).toBeNull();
    expect(playbookBudgetCategories('', 10)).toBeNull();
  });
});

// ── Sprint 55D: Phase-1 host playbooks ────────────────────────────────────────
describe('55D registration + canonical alias resolution', () => {
  test('all 5 Phase-1 host playbooks resolve by canonical type', () => {
    ['Dinner Party', 'Birthday', 'Baby Shower', 'Get-Together', 'Graduation'].forEach((t) => {
      expect(getPlaybook(t)).toBeTruthy();
      expect(getPlaybook(t).type).toBe(t);
    });
  });
  test('aliases + free-text resolve through the taxonomy', () => {
    expect(getPlaybook('Birthday Party').type).toBe('Birthday');
    expect(getPlaybook('Graduation Party').type).toBe('Graduation');
    expect(getPlaybook('Backyard BBQ').type).toBe('Get-Together');
    expect(getPlaybook('cookout').type).toBe('Get-Together');
    expect(getPlaybook('potluck').type).toBe('Get-Together');
  });
  test('non-host / unsupported types stay null (existing fallback intact)', () => {
    ['Wedding', 'Conference', 'Corporate Event', 'Gala', 'Quinceañera', ''].forEach((t) => {
      expect(getPlaybook(t)).toBeNull();
    });
  });
});

describe('55D per-playbook engine behavior', () => {
  const CASES = [
    { type: 'Birthday', guests: 20 },
    { type: 'Baby Shower', guests: 25 },
    { type: 'Get-Together', guests: 16 },
    { type: 'Graduation', guests: 35 },
  ];
  const ev = (type, date, guestCount) => ({ id: 'e1', type, date, guestCount });

  CASES.forEach(({ type, guests }) => {
    describe(type, () => {
      test('produces in-window operational candidates that scale with guests', () => {
        // event 1 day out → T-1d purchases due today
        const small = playbookTasks(ev(type, '2026-06-20', 4), '2026-06-19');
        const big = playbookTasks(ev(type, '2026-06-20', guests), '2026-06-19');
        expect(small.length).toBeGreaterThan(0);
        expect(big.length).toBeGreaterThan(0);
        // a per-guest essential task should cost/size more at higher headcount
        const perGuestBig = big.find((t) => t.quantity != null && /lb|drinks|buns|favor/.test(t.unit));
        const perGuestSmall = small.find((t) => t.item === (perGuestBig || {}).item);
        if (perGuestBig && perGuestSmall) {
          expect(perGuestBig.quantity).toBeGreaterThan(perGuestSmall.quantity);
        }
      });

      test('window gating: 30 days out → no candidates', () => {
        expect(playbookTasks(ev(type, '2026-06-20', guests), '2026-05-21')).toEqual([]);
      });

      test('budget rows derive from purchases, grounded, NO venue line', () => {
        const cats = playbookBudgetCategories(type, guests);
        expect(cats).toBeTruthy();
        expect(cats.length).toBeGreaterThanOrEqual(4);
        const labels = cats.map((c) => c.label.toLowerCase());
        expect(labels.some((l) => /venue/.test(l))).toBe(false);
        expect(labels).toContain('food & groceries');
        expect(labels).toContain('drinks & bar');
        cats.forEach((c) => {
          expect(c.low).toBeGreaterThan(0);
          expect(c.high).toBeGreaterThanOrEqual(c.low);
        });
      });

      test('budget total scales up with guest count', () => {
        const sum = (g) => playbookBudgetCategories(type, g).reduce((a, c) => a + c.low, 0);
        expect(sum(guests * 2)).toBeGreaterThan(sum(guests));
      });
    });
  });

  test('every Phase-1 playbook has all 6 budget categories represented', () => {
    ['Dinner Party', 'Birthday', 'Baby Shower', 'Get-Together', 'Graduation'].forEach((type) => {
      const cats = playbookBudgetCategories(type, 20).map((c) => c.label);
      ['Food & groceries', 'Drinks & bar'].forEach((must) => expect(cats).toContain(must));
    });
  });
});

// ── Sprint 55G: decision-first gating (Pattern 001) ───────────────────────────
describe('55G decision-first gate', () => {
  const guests = (over) => Array.from({ length: 12 }, (_, i) => ({ id: 'g' + i, name: 'G' + i, rsvp: 'Yes', meal: 'Standard', needs: '', ...(over ? over(i) : {}) }));
  // 1 day out → T-1d per-guest purchases (protein etc.) are in-window today.
  const dp = (over) => ({ id: 'e1', type: 'Dinner Party', date: '2026-06-20', guestCount: 12, ...over });
  const ASOF = '2026-06-19';

  test('unresolved headcount (a pending Maybe) → surface "Confirm final guest count", block per-guest buys', () => {
    const ev = dp({ guests: guests((i) => (i === 11 ? { rsvp: 'Maybe' } : {})) });
    const d = topPlaybookDecision(ev, ASOF);
    expect(d).toBeTruthy();
    expect(d.category).toBe('decision');
    expect(d.title).toBe('Confirm final guest count');
    expect(d.primaryRoute.tab).toBe('Guests');
    // protein (per-guest, food) must NOT surface as a buy while the count is open
    const tasks = playbookTasks(ev, ASOF);
    expect(tasks.some((t) => /protein/i.test(t.title))).toBe(false);
  });

  test('no count at all → still surfaces the count decision', () => {
    const ev = { id: 'e1', type: 'Dinner Party', date: '2026-06-20', guestCount: 0, guestEstimate: '', guests: [] };
    // no guest list + no count → count unresolved, but dietary "no-list" resolved
    const d = topPlaybookDecision(ev, ASOF);
    expect(d && d.decision).toBe('guestCount');
  });

  test('resolved headcount (all Yes, dietary recorded) → no decision, buy surfaces', () => {
    const ev = dp({ guests: guests((i) => (i === 3 ? { needs: 'Nut allergy' } : {})) });
    expect(topPlaybookDecision(ev, ASOF)).toBeNull();
    expect(topPlaybookTask(ev, ASOF)).toBeTruthy();
  });

  test('dietary unresolved (count locked, no meal/needs) → surface "Collect dietary", block food', () => {
    const ev = dp({ guests: guests((i) => ({ meal: 'Standard', needs: '' })) }); // all Yes, nothing recorded
    const d = topPlaybookDecision(ev, ASOF);
    expect(d && d.decision).toBe('dietary');
    expect(d.title).toMatch(/dietary/i);
    const tasks = playbookTasks(ev, ASOF);
    expect(tasks.some((t) => t.phase === 'food')).toBe(false);
  });

  test('dietary resolved (a guest has a recorded need) → no dietary decision', () => {
    const ev = dp({ guests: guests((i) => (i === 0 ? { needs: 'Vegan' } : {})) });
    expect(topPlaybookDecision(ev, ASOF)).toBeNull();
  });

  test('estimate-only event (no guest list) is NOT falsely blocked', () => {
    const ev = { id: 'e1', type: 'Dinner Party', date: '2026-06-20', guestEstimate: '12', guests: [] };
    expect(topPlaybookDecision(ev, ASOF)).toBeNull();
    expect(topPlaybookTask(ev, ASOF)).toBeTruthy();
  });

  test('gate only fires when a purchase is actually in window (far-out event → no nag)', () => {
    const ev = dp({ date: '2026-07-20', guests: guests((i) => (i === 11 ? { rsvp: 'Maybe' } : {})) });
    expect(topPlaybookDecision(ev, '2026-06-19')).toBeNull(); // 31 days out, nothing in window
  });

  test('non-playbook event → no decision (existing behavior intact)', () => {
    expect(topPlaybookDecision({ id: 'e', type: 'Wedding', date: '2026-06-20', guests: [{ rsvp: 'Maybe' }] }, ASOF)).toBeNull();
  });

  test('priority: when BOTH count and dietary are open, guest count wins', () => {
    const ev = dp({ guests: guests((i) => ({ rsvp: i === 11 ? 'Maybe' : 'Yes', meal: 'Standard', needs: '' })) });
    expect(topPlaybookDecision(ev, ASOF).decision).toBe('guestCount');
  });
});
