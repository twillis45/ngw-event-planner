import { ALL_PLAYBOOKS } from './index';

// Contract linter for the Playbook Doctrine (docs/PLAYBOOK_DOCTRINE.md). Two tiers:
//  • HARD invariants — must always pass (well-formed data the engine relies on).
//  • RATCHETED gaps — the known rollout debt (missing costFactors, id/category drift). Each has a
//    BASELINE that can only go DOWN: the suite fails if a gap COUNT rises above baseline (regression)
//    or falls below it (fix landed — lower the baseline). The printed lists are the Admin red→green
//    checklist. Goal: every baseline reaches 0.

const CATEGORY_SET = new Set(['food', 'beverage', 'decor', 'rental', 'cleanup', 'logistics']);
const isCostAffecting = (d) => Array.isArray(d.blocks) && (d.blocks.includes('food') || d.blocks.includes('beverage'));

function collect() {
  const costFactorGaps = []; const idPrefixGaps = []; const categoryGaps = [];
  const qtyMixGaps = []; const foodNoCost = []; const badCostFactors = []; const noType = []; const dupDecisionIds = [];
  for (const pb of ALL_PLAYBOOKS) {
    const type = pb.type || '(no type)';
    if (typeof pb.type !== 'string' || !pb.type.trim()) noType.push(JSON.stringify(Object.keys(pb).slice(0, 3)));
    const purchaseIds = new Set((pb.purchases || []).map((p) => p.id));
    const seenDecIds = new Set();
    for (const d of (pb.decisions || [])) {
      if (d && d.id != null) { if (seenDecIds.has(d.id)) dupDecisionIds.push(`${type}:${d.id}`); else seenDecIds.add(d.id); }
      // A costFactor GAP = a food/beverage decision with ≥2 real options that neither declares
      // costFactors NOR is explicitly marked noCostEffect. Empty-option stubs (nothing to price) and
      // acknowledged non-costers (scale/payment/scope decisions — guest count already scales quantity)
      // are NOT gaps: silence would be a lie, but an explicit `noCostEffect: true` is a decision.
      if (isCostAffecting(d) && !d.costFactors && !d.noCostEffect && Array.isArray(d.options) && d.options.length >= 2) costFactorGaps.push(`${type}:${d.id}`);
      if (d.costFactors && d.noCostEffect) badCostFactors.push(`${type}:${d.id} has BOTH costFactors and noCostEffect`);
      if (d.costFactors) {
        const opts = new Set(d.options || []);
        for (const k of Object.keys(d.costFactors)) {
          if (!opts.has(k)) badCostFactors.push(`${type}:${d.id} costFactor key "${k}" is not an option`);
          const v = Number(d.costFactors[k]);
          if (!(Number.isFinite(v) && v > 0)) badCostFactors.push(`${type}:${d.id} costFactor "${k}"=${d.costFactors[k]} not a positive number`);
        }
        if (!Array.isArray(d.affects) || !d.affects.length) badCostFactors.push(`${type}:${d.id} has costFactors but no affects[]`);
        else for (const pid of d.affects) if (!purchaseIds.has(pid)) badCostFactors.push(`${type}:${d.id} affects "${pid}" — not a purchase id`);
      }
    }
    for (const p of (pb.purchases || [])) {
      if (!/^p_/.test(String(p.id || ''))) idPrefixGaps.push(`${type}:${p.id}`);
      if (!CATEGORY_SET.has(p.category)) categoryGaps.push(`${type}:${p.id} cat="${p.category}"`);
      if (('qtyPerGuest' in p) && ('qtyFlat' in p)) qtyMixGaps.push(`${type}:${p.id}`);
      if ((p.category === 'food' || p.category === 'beverage') && !Array.isArray(p.unitCostRange)) foodNoCost.push(`${type}:${p.id}`);
    }
  }
  return { costFactorGaps, idPrefixGaps, categoryGaps, qtyMixGaps, foodNoCost, badCostFactors, noType, dupDecisionIds };
}

const G = collect();

// ── HARD invariants — always green ──────────────────────────────────────────
describe('playbook contract — hard invariants', () => {
  test('every playbook has a string type', () => { expect(G.noType).toEqual([]); });
  test('decision ids are unique within each playbook', () => {
    if (G.dupDecisionIds.length) console.error('DUPLICATE DECISION IDS:\n' + G.dupDecisionIds.join('\n'));
    expect(G.dupDecisionIds).toEqual([]);
  });
  test('every costFactors block is well-formed (keys ⊆ options, positive, affects → real purchase ids)', () => {
    if (G.badCostFactors.length) console.error('BAD COST FACTORS:\n' + G.badCostFactors.join('\n'));
    expect(G.badCostFactors).toEqual([]);
  });
});

// ── RATCHETED rollout gaps — the ceiling can only go DOWN ────────────────────
// Each BASELINE is the current gap count = a no-regression CEILING. Adding a NEW gap fails CI. As the
// rollout (step 3) fixes gaps, lower the baseline to the new count — the drop is visible progress in git.
// Calibrated 2026-07-02. Goal: every baseline reaches 0 (then the contract is fully enforced).
const BASELINE = {
  costFactorGaps: 0,  // COMPLETE 2026-07-02 — all 25 playbooks wired; remainder is empty-stub or noCostEffect
  idPrefixGaps: 0,    // FIXED 2026-07-02 — reunion + sundayDinner renamed p- → p_
  categoryGaps: 0,    // clean — keep it: no vendor names in purchases.category
  qtyMixGaps: 0,      // clean — keep it: no purchase mixes qtyPerGuest + qtyFlat
  foodNoCost: 0,      // clean — keep it: every food/beverage item is costable
};

describe('playbook contract — rollout gaps (no-regression ceiling, ratchet to zero)', () => {
  for (const key of Object.keys(BASELINE)) {
    test(`${key} ≤ ${BASELINE[key]} (currently ${G[key].length})`, () => {
      if (G[key].length) console.error(`\n[${key}] ${G[key].length} gap(s):\n  ` + G[key].join('\n  '));
      expect(G[key].length).toBeLessThanOrEqual(BASELINE[key]);
    });
  }
});
