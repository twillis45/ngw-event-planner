import { getPlaybook, playbookTasks, topPlaybookTask, playbookBudgetCategories } from '../index';

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

  test('falls back to playbook typical guests when no count present', () => {
    const t = topPlaybookTask(
      { id: 'e1', type: 'Dinner Party', date: '2026-06-20' },
      '2026-06-20',
    );
    // default 8 guests → 12 lbs ice
    expect(t.title).toBe('Buy ice — 12 lbs today');
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
