// ─── TASK 1: the tier defect, gated (Phase 5F.4) ─────────────────────────────
//
// THE DEFECT. The source picker validated SOURCE compatibility and nothing
// validated EVIDENCE TIER compatibility. `format()` carries the authored tier
// forward, so a purchase already on `norm` or `trade-heuristic` kept it invisibly.
// Two records published citing APPROVED sources with qtyGrounded=false:
//
//   The Cookout   tier="trade-heuristic"  sources=["reddy-ice-2026"]      grounded=false
//   Quinceanera   tier="norm"             sources=["bar-provision-2026"]  grounded=false
//
// The UI said "Will ground". The runtime predicate disagreed. Nothing reported it.
//
// The gate now evaluates source compatibility AND tier compatibility AND the real
// runtime predicate before a publish path is allowed. Tiers are NEVER auto-upgraded.
import { publishKCR } from './knowledgeChange';
import { groundingHonesty, wouldGround } from './sourceAuthority';

const AT = '2026-08-04T10:00:00.000Z';
const rec = (prov) => ({
  id: 'k', status: 'approved', assetId: 'The Cookout', fieldPath: 'p_ice.provenance',
  type: 'correction', trigger: 'validation',
  proposal: { newValue: prov, newProvenance: prov },
  evidence: [], review: { sme: { decision: 'approve' }, editorial: { decision: 'approve' }, governance: { decision: 'approve' } },
  audit: [], createdAt: AT, currentValue: null,
});
const prov = (tier, sources) => ({
  tier, confidence: 'medium', verificationStatus: 'researched', sources, note: 'n',
});

describe('the five required cases', () => {
  test('1. researched + approved source -> PASS', () => {
    const { kcr } = publishKCR(rec(prov('researched', ['reddy-ice-2026'])), { versionId: 'v1', asOf: AT });
    expect(kcr.status).toBe('published');
    expect(wouldGround('p_ice.provenance', prov('researched', ['reddy-ice-2026']))).toBe(true);
  });

  test('2. trade-heuristic + approved source -> BLOCK', () => {
    // The exact Cookout record.
    expect(() => publishKCR(rec(prov('trade-heuristic', ['reddy-ice-2026'])), { versionId: 'v1', asOf: AT }))
      .toThrow(/evidence tier "trade-heuristic" does not satisfy isGroundedItemQty/);
  });

  test('3. norm + approved source -> BLOCK', () => {
    // The exact Quinceanera record.
    expect(() => publishKCR(rec(prov('norm', ['bar-provision-2026'])), { versionId: 'v1', asOf: AT }))
      .toThrow(/evidence tier "norm" does not satisfy isGroundedItemQty/);
  });

  test('4. invalid source -> BLOCK', () => {
    for (const bad of ['not-a-source', 'https://www.reddyice.com/', 'usda-meat-2026']) {
      expect(() => publishKCR(rec(prov('researched', [bad])), { versionId: 'v1', asOf: AT }))
        .toThrow(/not an approved source|cannot ground a quantity/);
    }
  });

  test('5. a published record cannot claim grounded unless the runtime predicate returns true', () => {
    // The invariant, swept: anything that survives the gate must satisfy the same
    // predicate the host runs. No record can exist that lists sources and does not ground.
    const cases = [
      prov('researched', ['reddy-ice-2026']),
      prov('researched', ['bar-provision-2026']),
      prov('researched', ['webstaurant-protein-2026']),
    ];
    for (const p of cases) {
      const { kcr } = publishKCR(rec(p), { versionId: 'v1', asOf: AT });
      expect(kcr.status).toBe('published');
      expect(wouldGround('p_ice.provenance', kcr.proposal.newValue)).toBe(true);
    }
  });
});

describe('the gate is narrow on purpose', () => {
  test('an UNSOURCED heuristic is honest and still publishes on any tier', () => {
    // A heuristic that says it is a heuristic makes no claim it cannot keep.
    // Blocking these would have forced every legacy note out of the corpus.
    for (const tier of ['trade-heuristic', 'norm', 'estimate']) {
      const { kcr } = publishKCR(rec({ tier, confidence: 'low', note: 'a stated heuristic' }),
        { versionId: 'v1', asOf: AT });
      expect(kcr.status).toBe('published');
    }
  });

  test('a NON-provenance field is not this gate’s business', () => {
    const k = { ...rec(0.08), fieldPath: 'p_oldbay.qtyPerGuest', assetId: 'Crab Feast',
      proposal: { newValue: 0.08, newProvenance: prov('researched', ['reddy-ice-2026']) } };
    expect(publishKCR(k, { versionId: 'v1', asOf: AT }).kcr.status).toBe('published');
  });
});

describe('the tier is never auto-upgraded', () => {
  test('the gate REFUSES and explains rather than promoting the tier', () => {
    const r = groundingHonesty('p_ice.provenance', prov('norm', ['bar-provision-2026']));
    expect(r.ok).toBe(false);
    expect(r.tier).toBe('norm');
    expect(r.status).toMatch(/Will NOT ground/);
    expect(r.error).toMatch(/Set the tier to "researched" if the research was actually done/);
    expect(r.error).toMatch(/do not publish a record that looks sourced and is not/);
  });

  test('the verdict names the predicate, so the message cannot be merely plausible', () => {
    expect(groundingHonesty('p_ice.provenance', prov('researched', ['reddy-ice-2026'])).status)
      .toMatch(/Will ground/);
  });
});
