import { playbookDayOfChecklist } from '../index';

describe('playbookDayOfChecklist — engine-driven, type-appropriate, honest', () => {
  test('returns authored items for a known OUTDOOR type (BBQ → food/fire/weather), sorted by severity', () => {
    const rc = playbookDayOfChecklist({ type: 'Backyard BBQ' }); // resolves → Get-Together playbook
    expect(rc).toBeTruthy();
    expect(rc.isDefault).toBe(false);
    expect(rc.count).toBeGreaterThan(0);
    // severity order (high→low) preserved
    const ranks = rc.items.map((i) => i.rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    // every item carries the render/persistence contract
    for (const it of rc.items) {
      expect(it.id.length).toBeGreaterThan(0);
      expect(it.label.length).toBeGreaterThan(0);
      expect(it.key).toBe(it.id); // key === id so confirm-state persists
    }
    const ids = rc.items.map((i) => i.id);
    // an outdoor grill cookout DOES carry these hazards
    expect(ids).toEqual(expect.arrayContaining(['food', 'grill', 'weather', 'power']));
  });

  test('indoor Dinner Party gets a LIGHTER set — no grill/fire, no weather/canopy', () => {
    const rc = playbookDayOfChecklist({ type: 'Dinner Party' });
    expect(rc).toBeTruthy();
    expect(rc.isDefault).toBe(false);
    const ids = rc.items.map((i) => i.id);
    // honesty rule: an indoor seated dinner has no grill/fire or outdoor weather risk
    expect(ids).not.toContain('grill');
    expect(ids).not.toContain('weather');
    // it DOES carry food safety + an allergy check
    expect(ids).toEqual(expect.arrayContaining(['food', 'allergies']));
  });

  test('the BBQ and Dinner Party lists differ by type (not a shared hardcoded list)', () => {
    const bbq = playbookDayOfChecklist({ type: 'Backyard BBQ' }).items.map((i) => i.id);
    const dinner = playbookDayOfChecklist({ type: 'Dinner Party' }).items.map((i) => i.id);
    expect(bbq).not.toEqual(dinner);
    expect(bbq).toContain('grill'); // outdoor only
    expect(dinner).not.toContain('grill');
  });

  test('falls back to the universal DEFAULT for an unknown / un-authored type', () => {
    const rc = playbookDayOfChecklist({ type: 'Totally Made Up Type' });
    expect(rc).toBeTruthy();
    expect(rc.isDefault).toBe(true);
    expect(rc.count).toBeGreaterThan(0);
    // default is honest — food safety + cleanup + emergency, no grill/weather hazard
    const ids = rc.items.map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(['food', 'emergency']));
    expect(ids).not.toContain('grill');
    // still carries id + label
    for (const it of rc.items) {
      expect(it.id.length).toBeGreaterThan(0);
      expect(it.label.length).toBeGreaterThan(0);
    }
  });

  test('null for no event (never fabricates a checklist out of nothing)', () => {
    expect(playbookDayOfChecklist(null)).toBeNull();
  });

  test('several culture-forward / outdoor cooking playbooks author their own list', () => {
    for (const type of ['Juneteenth Cookout', 'The Cookout', 'Fish Fry', 'Low Country Boil', 'Day Party']) {
      const rc = playbookDayOfChecklist({ type });
      expect(rc && rc.isDefault).toBe(false);
      expect(rc.count).toBeGreaterThan(0);
    }
  });
});
