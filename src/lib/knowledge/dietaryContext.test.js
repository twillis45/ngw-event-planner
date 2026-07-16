// Wave-2o: a grounded dietary/allergy safety axis (FDA major allergens) — the loudest
// remaining Coverage hard-zero, explicitly named in 10+ decision labels.
import { ALL_PLAYBOOKS } from '../playbooks';
import { DIETARY_SOURCES, isGroundedDietary, effectiveDietary, detectDietaryCategory, resolveDietary } from './dietaryContext';
import { detectGapsInPlaybook } from './playbookSchema';
import { playbookDecisionBoard } from '../playbooks/index.js';

describe('dietary/allergy axis', () => {
  test('grounds the dietary/allergy decisions across playbooks', () => {
    let n = 0;
    for (const pb of ALL_PLAYBOOKS) for (const d of (pb.decisions || [])) {
      if (!detectDietaryCategory(d)) continue;
      expect(isGroundedDietary(effectiveDietary(d))).toBe(true);
      n++;
    }
    expect(n).toBeGreaterThanOrEqual(8);
  });
  test('an allergy decision grounds to the FDA allergen standard; no food-choice false positives', () => {
    expect(resolveDietary({ id: 'dietary', label: 'Collect allergies' }).sources).toContain('fda-allergens');
    for (const d of [{ id: 'sides', label: 'The sides' }, { id: 'theme', label: 'Pick a theme' }, { id: 'crab_size', label: 'Crab size' }]) {
      expect(detectDietaryCategory(d)).toBeNull();
    }
  });
  test('isGroundedDietary rejects hollow/wrong-tier/unsourced; source real+dated', () => {
    expect(isGroundedDietary({ factor: 'x', guideline: 'y', tier: 'fda-standard', sources: ['nope'] })).toBe(false);
    expect(isGroundedDietary({ factor: 'x', guideline: 'y', tier: 'wrong', sources: ['fda-allergens'] })).toBe(false);
    for (const s of Object.values(DIETARY_SOURCES)) { expect(s.url).toMatch(/^https?:/); expect(s.fetched).toMatch(/^\d{4}-\d{2}-\d{2}$/); }
  });
  test('gap-detector 0 dietary gaps; board surfaces dietaryGrounded', () => {
    let gaps = 0;
    for (const pb of ALL_PLAYBOOKS) gaps += detectGapsInPlaybook(pb).filter((g) => String(g.type).includes('dietary-ungrounded')).length;
    expect(gaps).toBe(0);
    const b = playbookDecisionBoard({ id: 'e', type: 'Crab Feast', date: '2026-09-01', guests: [{ name: 'a' }], guestEstimate: 20 });
    const rows = [...b.open, ...b.locked, ...(b.deferred || [])];
    expect(rows.some((r) => r.dietaryGrounded === true)).toBe(true);
  });
});
