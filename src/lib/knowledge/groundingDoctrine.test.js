import { normalizeTier, isGroundedTier, tierInfo, groundingLadder, GROUNDING_TIERS } from './groundingDoctrine';
import { groundingSourceCatalog, groundingSourceStats } from './groundingSources';

describe('grounding doctrine — one consistent tier vocabulary', () => {
  test('canonical tiers pass through unchanged', () => {
    ['cited', 'established-consensus', 'researched', 'synthesized', 'reasoned'].forEach((t) => {
      expect(normalizeTier(t)).toBe(t);
    });
  });

  test('domain "standard" tiers normalize to established-consensus', () => {
    ['ada-standard', 'fda-standard', 'noaa-standard', 'legal-standard', 'planning-standard', 'childcare-standard', 'consensus']
      .forEach((t) => expect(normalizeTier(t)).toBe('established-consensus'));
  });

  test('heuristic tiers normalize to synthesized (honest, ungrounded)', () => {
    ['regional-heuristic', 'trade-heuristic'].forEach((t) => {
      expect(normalizeTier(t)).toBe('synthesized');
      expect(isGroundedTier(t)).toBe(false);
    });
  });

  test('grounded ladder: cited/established/researched count, synthesized/reasoned do not', () => {
    expect(isGroundedTier('established-consensus')).toBe(true);
    expect(isGroundedTier('researched')).toBe(true);
    expect(isGroundedTier('ada-standard')).toBe(true);      // via normalization
    expect(isGroundedTier('synthesized')).toBe(false);
    expect(isGroundedTier('reasoned')).toBe(false);
    expect(isGroundedTier('made-up')).toBe(false);          // off-ladder → not grounded
  });

  test('tierInfo is always honest for an unknown tier', () => {
    const info = tierInfo('totally-invented');
    expect(info.grounded).toBe(false);
    expect(info.rank).toBe(-1);
    expect(info.label).toBe('totally-invented');
  });

  test('the ladder is ordered most→least grounded', () => {
    const ranks = groundingLadder().map((r) => r.rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
    expect(groundingLadder()[0].tier).toBe('cited');
  });

  // Two authored shapes exist: newer axes (military/destination/timing/cost) put `tier`
  // on the source object; older axes (accessibility/cultural/dietary…) carry the tier on
  // the per-decision context and leave the source tier blank. The doctrine invariant is
  // narrower than "every source has a tier": every source tier that IS authored must
  // normalize onto the canonical ladder — no orphan vocabulary.
  test('every AUTHORED source tier normalizes onto the ladder (no orphan tiers)', () => {
    const cat = groundingSourceCatalog();
    const offLadder = cat
      .flatMap((g) => g.sources)
      .filter((s) => s.tier && !GROUNDING_TIERS[s.canonTier]);
    expect(offLadder.map((s) => `${s.id}:${s.tier}`)).toEqual([]);
  });

  test('admin stats group by canonical rung', () => {
    const stats = groundingSourceStats();
    Object.keys(stats.byTier).forEach((t) => {
      expect(t === 'unspecified' || !!GROUNDING_TIERS[t]).toBe(true);
    });
  });
});
