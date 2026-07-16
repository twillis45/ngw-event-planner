import { militaryCeremonyContext, detectMilitaryCeremony, isGroundedMilitary, MILITARY_SOURCES } from './militaryRetirement';

describe('other ceremonies — promotion', () => {
  const promo = { type: 'Custom', name: 'Dad’s Army promotion to Major', story: 'promotion and pinning ceremony' };
  test('a promotion is detected and built, grounded', () => {
    expect(detectMilitaryCeremony(promo)).toBe('promotion');
    const c = militaryCeremonyContext(promo);
    expect(c.ceremony).toBe('promotion');
    expect(c.branch).toBe('army');
    expect(isGroundedMilitary(c)).toBe(true);
  });
  test('every promotion decision HOLDS its source provenance (ids resolve)', () => {
    const c = militaryCeremonyContext(promo);
    expect(c.decisions.length).toBeGreaterThanOrEqual(5);
    c.decisions.forEach((d) => {
      expect(Array.isArray(d.militaryContext.sources)).toBe(true);
      d.militaryContext.sources.forEach((s) => expect(MILITARY_SOURCES[s]).toBeTruthy());
    });
    // the oath decision cites the statute
    expect(c.decisions.find((d) => d.id === 'prom_oath').militaryContext.sources).toContain('oath-5usc-3331');
  });
  test('a retirement still routes through the ceremony context', () => {
    const c = militaryCeremonyContext({ type: 'Retirement Party', story: '30 years in the Navy' });
    expect(c.ceremony).toBe('retirement');
    expect(c.branch).toBe('navy');
  });
  test('a civilian event is not a military ceremony', () => {
    expect(detectMilitaryCeremony({ type: 'Birthday', story: 'turning 40' })).toBeNull();
  });
});
