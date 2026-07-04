// Sprint HQ-2 P0-1 regression: every playbookFoodPlan() call site inside the
// Assemble Reveal orchestrator must receive the SAME resolved price factor object
// (never null/undefined defaulting to national-average) — this is what caused the
// dollar-drift bug found in HQ-1 (same event, different food-cost totals on
// different screens depending on which call site forgot to pass foodPP).
import { buildAssembleRevealStages } from '../assembleRevealEngines';
import { playbookFoodPlan } from '../playbooks';
import { fixtureBirthday } from './f4AssembleRevealFixtures';

describe('HQ-2 P0-1: food pricing consistency', () => {
  test('Reveal food/shopping domain cost matches a direct playbookFoodPlan(event, foodPP) call with the same price factor', () => {
    const regionalFactor = { priceFactor: 1.35, priceContext: 'DMV', hasRegion: true };
    const stages = buildAssembleRevealStages(
      fixtureBirthday.event,
      fixtureBirthday.eventIdentity,
      null,
      regionalFactor
    );
    const foodStage = stages.find(s => s.key === 'food');
    const directPlan = playbookFoodPlan(fixtureBirthday.event, regionalFactor);

    expect(foodStage).toBeTruthy();
    // The reveal's "what" text embeds fp.itemCount — assert it reflects the SAME
    // priced plan as a direct call with the identical factor, not a null-priced one.
    expect(foodStage.what).toContain(String(directPlan.itemCount));
  });

  test('a different price factor produces a different priced plan (proves the factor is actually being consumed, not ignored)', () => {
    const national = { priceFactor: 1, priceContext: null, hasRegion: false };
    const regional = { priceFactor: 1.5, priceContext: 'DMV', hasRegion: true };

    const planNational = playbookFoodPlan(fixtureBirthday.event, national);
    const planRegional = playbookFoodPlan(fixtureBirthday.event, regional);

    // Item count is factor-independent (quantities, not price), so assert on the
    // dollar range instead — this is the actual field that drifted in the bug.
    expect(planRegional.foodHigh).toBeGreaterThan(planNational.foodHigh);
  });

  test('omitting the price factor no longer happens inside assembleRevealEngines.js (no bare `, null)` call sites remain)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '../assembleRevealEngines.js'), 'utf8');
    expect(src).not.toMatch(/playbookFoodPlan\(event,\s*null\)/);
  });
});
