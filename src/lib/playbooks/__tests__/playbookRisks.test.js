import { playbookRisks } from '../index';

describe('playbookRisks — surfaces authored risk→fix wisdom, never invents', () => {
  test('Dinner Party returns authored risks sorted by severity (critical first)', () => {
    const rk = playbookRisks({ type: 'Dinner Party' });
    expect(rk).toBeTruthy();
    expect(rk.count).toBeGreaterThan(0);
    // critical/high rank ahead of med/low
    const ranks = rk.items.map((r) => r.rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    // every item carries both the "what goes wrong" and the "fix"
    for (const r of rk.items) {
      expect(r.trigger.length).toBeGreaterThan(0);
      expect(r.mitigation.length).toBeGreaterThan(0);
    }
    // the dietary risk is authored as critical and leads
    expect(rk.items[0].severity).toBe('critical');
  });
  test('null for an unknown type or no event (never fabricates a risk)', () => {
    expect(playbookRisks({ type: 'Totally Made Up Type' })).toBeNull();
    expect(playbookRisks(null)).toBeNull();
  });
  test('several culture-forward playbooks carry authored risks', () => {
    for (const type of ['Juneteenth Cookout', 'The Cookout', 'Kwanzaa Gathering']) {
      const rk = playbookRisks({ type });
      expect(rk && rk.count).toBeGreaterThan(0);
    }
  });
  test('domain scoping surfaces only the relevant authored risks (guests ⊂ all)', () => {
    const all = playbookRisks({ type: 'Dinner Party' });
    const guests = playbookRisks({ type: 'Dinner Party' }, 'guests');
    expect(guests).toBeTruthy();
    expect(guests.count).toBeGreaterThan(0);
    expect(guests.count).toBeLessThan(all.count); // a strict subset
    // the headcount/dietary/capacity risks are guest-domain; ice/cleanup are not
    const ids = guests.items.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining(['r_headcount']));
    expect(ids).not.toContain('r_ice');
    expect(ids).not.toContain('r_cleanup');
  });
});
