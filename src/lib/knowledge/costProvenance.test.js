// Wave-2i: cost-factor provenance grounded against REAL market sources (USDA/BLS retail
// meat prices, 2026 catering per-person data, the DMV crab survey) — moving the Grounding
// dimension's weakest sub-dim (cost) off 1/46.
import { ALL_PLAYBOOKS } from '../playbooks';
import { COST_SOURCES, isGroundedCost, costSourcesFor } from './costProvenance';
import { detectGapsInPlaybook } from './playbookSchema';
import { playbookDecisionBoard } from '../playbooks/index.js';

describe('cost provenance grounding', () => {
  test('a researched fraction of cost factors is grounded to real sources (was 1/46)', () => {
    let withProv = 0; let grounded = 0;
    for (const pb of ALL_PLAYBOOKS) {
      for (const d of (pb.decisions || [])) {
        if (!d.costFactorProvenance) continue;
        withProv++;
        if (isGroundedCost(d.costFactorProvenance)) {
          grounded++;
          expect(costSourcesFor(d.costFactorProvenance).length).toBeGreaterThan(0);
          for (const s of d.costFactorProvenance.sources) expect(COST_SOURCES[s]).toBeTruthy();
        }
      }
    }
    // the Grounding lever: "even 10/46 with a costResearched predicate lifts the cap off 2%."
    //
    // FLOOR LOWERED 16 -> 15 on 2026-08-01 (Phase 5C.1), DELIBERATELY, not as a regression.
    // Juneteenth Cookout / `menu` had its grounding WITHDRAWN because verification showed the
    // cited source does not support the claim: usda-meat-2026 prices brisket (~$4.50/lb) within
    // ~4% of pork chops (~$4.33/lb) so it cannot support a ~20% brisket premium, and it is a
    // meat series containing no seafood at all, so the mixed-grill+seafood leg was ungroundable
    // under any reading. The decision's VALUES are unchanged; only the evidence label moved to
    // 'synthesized'. See docs/playbooks/PHASE_5C_1_EXECUTION_REPORT.md.
    //
    // This is a ratchet: it must not be lowered again to accommodate a future withdrawal
    // without the same written justification, and it should RISE as claims are properly
    // re-grounded. A smaller truthful knowledge base beats a larger questionable one.
    expect(grounded).toBeGreaterThanOrEqual(15); // wave-2v grounded 6 more service-tier factors
    expect(grounded).toBeLessThan(withProv); // honest — most are still a research backlog
  });

  test('wave-2v: host/caterer/potluck service-tier factors ground to catering-perperson', () => {
    // the labor-driven service-tier ladder the catering source explicitly establishes.
    const good = { tier: 'researched', sources: ['catering-perperson-2026'] };
    expect(isGroundedCost(good)).toBe(true);
    // …but a seafood-boil protein claim must NOT ground to the meat source (no seafood data)
    // and a drink cost-% claim must NOT ground to a removed/absent bar source — both stay synthesized.
    expect(isGroundedCost({ tier: 'researched', sources: ['bar-provision-2026'] })).toBe(false);
    expect(COST_SOURCES['bar-provision-2026']).toBeUndefined();
  });

  test('isGroundedCost rejects synthesized / sourceless / bogus-source provenance', () => {
    expect(isGroundedCost(null)).toBe(false);
    expect(isGroundedCost({ tier: 'synthesized', sources: ['usda-meat-2026'] })).toBe(false);
    expect(isGroundedCost({ tier: 'researched', sources: [] })).toBe(false);
    expect(isGroundedCost({ tier: 'researched', sources: ['not-real'] })).toBe(false);
    expect(isGroundedCost({ tier: 'researched', sources: ['usda-meat-2026'] })).toBe(true);
  });

  test('every COST_SOURCES entry is a real, dated, attributed source', () => {
    for (const [, s] of Object.entries(COST_SOURCES)) {
      expect(s.url).toMatch(/^https?:\/\//);
      expect(s.fetched).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(String(s.org).length).toBeGreaterThan(3);
      expect(String(s.claim).length).toBeGreaterThan(30);
    }
  });

  test('gap-detector counts the shrinking cost-research backlog (grounded ones no longer flagged)', () => {
    let flagged = 0; let groundedFlagged = 0;
    for (const pb of ALL_PLAYBOOKS) {
      const costGaps = detectGapsInPlaybook(pb).filter((g) => String(g.type).includes('cost-unresearched'));
      flagged += costGaps.length;
      for (const g of costGaps) {
        const d = pb.decisions.find((x) => x.id === g.id);
        if (d && isGroundedCost(d.costFactorProvenance)) groundedFlagged++;
      }
    }
    // researched factors are NOT flagged; the remaining synthesized ones are the honest backlog.
    expect(groundedFlagged).toBe(0);
    expect(flagged).toBeGreaterThan(0); // backlog still exists — not overclaimed
  });

  test('the board surfaces costGrounded (reaches runtime)', () => {
    const b = playbookDecisionBoard({ id: 'e', type: 'Graduation', date: '2026-09-01', guests: [], guestEstimate: 30 });
    const rows = [...b.open, ...b.locked, ...(b.deferred || [])];
    expect(rows.some((r) => r.costGrounded === true)).toBe(true);
  });
});
