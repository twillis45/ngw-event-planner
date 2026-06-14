import { getPlaybook, playbookTasks, topPlaybookTask } from '../index';

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
