// ─── A RESEARCH CLAIM MUST MEET THE POLICY IT CLAIMS ────────────────────────
// `researchPolicies.js` is not advice — it is the codified research process, and
// `RESEARCH_POLICIES.pricing` says, verbatim:
//
//     corroborationRequired: true
//     note: 'Commercial prices shift monthly; always corroborate across ≥2 sources.'
//     freshnessDays: 45
//
// Measured 2026-08-07, the corpus followed the NARRATIVE half of the doctrine
// and not the MACHINE-CHECKABLE half:
//
//     45 priced items claim `cited` or `researched`
//        claim            45/45   100%
//        sufficientWhen   45/45   100%
//        >=2 sources       6/45    13%   <- violates corroborationRequired
//        date stamp        2/45     4%   <- freshnessDays:45 cannot be applied
//
// Both gaps matter, and the second is the quieter one: `freshnessDays: 45` means
// a price is stale after 45 days, and `isStaleByPolicy()` cannot evaluate an
// item with no date. An undated "researched" price is not fresh or stale — it is
// unfalsifiable, which is the one thing a grounded claim must never be.
//
// THIS IS A RATCHET, not a ban — the same shape as spacingLadder. 39 items
// cannot be re-researched by a test, and failing the build on them would just
// get the statuses downgraded to hide the problem, which is worse than the
// problem. So the counts are frozen and may only ever go DOWN. Lower the
// baselines in the same commit that earns it.
import { ALL_PLAYBOOKS } from '../playbooks/index';
import { RESEARCH_POLICIES } from '../knowledge/researchPolicies';

// Frozen 2026-08-07. LOWER THESE, NEVER RAISE THEM.
const BASELINE_UNCORROBORATED = 39;
const BASELINE_UNDATED = 43;

const claimsResearch = (p) => p && typeof p === 'object'
  && (p.verificationStatus === 'cited' || p.verificationStatus === 'researched');

const pricedItems = () => {
  const out = [];
  const seen = new Set();
  const walk = (n, pb) => {
    if (!n || typeof n !== 'object' || seen.has(n)) return;
    seen.add(n);
    if (Array.isArray(n)) { n.forEach((x) => walk(x, pb)); return; }
    // BOTH BLOCKS (2026-08-16). This walked `provenance` alone, so every cost
    // citation written into `costProvenance` was invisible to the corroboration
    // and freshness policy it invokes — five single-source cost citations were
    // authored and no gate objected. A policy that cannot see half the claims it
    // governs is not a policy.
    if ('unitCostRange' in n) {
      out.push({ pb, id: n.id, prov: n.provenance });
      if (n.costProvenance) out.push({ pb, id: `${n.id}.cost`, prov: n.costProvenance });
    }
    Object.values(n).forEach((v) => walk(v, pb));
  };
  for (const pb of ALL_PLAYBOOKS || []) walk(pb, pb.type || pb.name || '?');
  return out;
};

const sourceCount = (p) => (Array.isArray(p.sources) ? p.sources.length : (p.sources ? 1 : 0));
const isDated = (p) => Boolean(p.lastVerified || p.researchedAt);

describe('a priced claim meets the research policy it invokes', () => {
  test('the pricing policy still demands corroboration (premise)', () => {
    // If this ever flips, the gate below is measuring a rule that no longer
    // exists — which is how a dead gate starts certifying what it should catch.
    expect(RESEARCH_POLICIES.pricing.corroborationRequired).toBe(true);
    expect(RESEARCH_POLICIES.pricing.freshnessDays).toBeGreaterThan(0);
  });

  test('items claiming cited/researched carry >= 2 independent sources', () => {
    const claimed = pricedItems().filter((r) => claimsResearch(r.prov));
    expect(claimed.length).toBeGreaterThan(0);
    const bad = claimed.filter((r) => sourceCount(r.prov) < 2);
    if (bad.length > BASELINE_UNCORROBORATED) {
      throw new Error(
        `Uncorroborated research claims went UP: ${bad.length} vs baseline ${BASELINE_UNCORROBORATED}.\n`
        + 'RESEARCH_POLICIES.pricing.corroborationRequired is true — "always corroborate\n'
        + 'across >=2 sources". A single-source price is an unverified price.\n'
        + `New offenders include: ${bad.slice(0, 5).map((r) => `${r.pb}.${r.id}`).join(', ')}`);
    }
    if (bad.length < BASELINE_UNCORROBORATED) {
      throw new Error(
        `Uncorroborated claims went DOWN: ${bad.length} vs ${BASELINE_UNCORROBORATED}. `
        + 'Lower BASELINE_UNCORROBORATED in this file to lock the gain in.');
    }
  });

  test('items claiming cited/researched carry a date, so freshness is decidable', () => {
    const claimed = pricedItems().filter((r) => claimsResearch(r.prov));
    const undated = claimed.filter((r) => !isDated(r.prov));
    if (undated.length > BASELINE_UNDATED) {
      throw new Error(
        `Undated research claims went UP: ${undated.length} vs baseline ${BASELINE_UNDATED}.\n`
        + `pricing.freshnessDays is ${RESEARCH_POLICIES.pricing.freshnessDays} — isStaleByPolicy()\n`
        + 'cannot evaluate an item with no lastVerified/researchedAt. An undated claim is\n'
        + 'neither fresh nor stale, it is unfalsifiable.');
    }
    if (undated.length < BASELINE_UNDATED) {
      throw new Error(
        `Undated claims went DOWN: ${undated.length} vs ${BASELINE_UNDATED}. `
        + 'Lower BASELINE_UNDATED in this file to lock the gain in.');
    }
  });

  test('the gate bites (guard against a dead ratchet)', () => {
    // Prove the predicates on synthetic values rather than trusting that they
    // read the corpus correctly.
    expect(sourceCount({ sources: ['a', 'b'] })).toBe(2);
    expect(sourceCount({ sources: ['a'] })).toBe(1);
    expect(sourceCount({})).toBe(0);
    expect(isDated({ lastVerified: '2026-06' })).toBe(true);
    expect(isDated({ researchedAt: '2026-07-03' })).toBe(true);
    expect(isDated({ sources: ['a'] })).toBe(false);
    expect(claimsResearch({ verificationStatus: 'cited' })).toBe(true);
    expect(claimsResearch({ verificationStatus: 'synthesized' })).toBe(false);
    expect(claimsResearch('synthesized')).toBe(false);   // the string shorthand
  });
});
