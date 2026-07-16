import { groundingSourceCatalog, groundingSourceStats, resolveGroundingSource } from './groundingSources';

describe('grounding provenance catalog (admin)', () => {
  test('unions every grounded axis with its cited sources', () => {
    const cat = groundingSourceCatalog();
    expect(cat.length).toBeGreaterThanOrEqual(10);
    cat.forEach((g) => {
      expect(typeof g.axis).toBe('string');
      expect(g.sources.length).toBeGreaterThan(0);
      g.sources.forEach((s) => { expect(s.id).toBeTruthy(); expect(s.title).toBeTruthy(); });
    });
    expect(cat.find((g) => /military/i.test(g.axis))).toBeTruthy();
  });
  test('stats roll up axes + sources + tiers', () => {
    const st = groundingSourceStats();
    expect(st.axes).toBeGreaterThanOrEqual(10);
    expect(st.sources).toBeGreaterThan(st.axes);
    expect(Object.keys(st.byTier).length).toBeGreaterThan(0);
  });
  test('resolves a cited id to its full citation across registries', () => {
    const r = resolveGroundingSource('ar-600-25');
    expect(r).toBeTruthy();
    expect(r.axis).toMatch(/military/i);
    expect(r.title).toMatch(/AR 600-25/i);
    expect(resolveGroundingSource('nope-not-real')).toBeNull();
  });
});
