// ─── THE RESEARCH PIPELINE COULD NOT ADD A COST FACTOR, ONLY REFINE ONE ─────
//
// `costFactors` are not hand-authored — they are fed by the KCR research
// pipeline: a campaign targets `decisions[id].costFactors`, findings come back,
// and `proposePlaybookUpdate` merges a consensus value in.
//
// MEASURED 2026-09-24: 101 of the 152 decisions that can carry a cost factor
// carry none, and **every one of them was unreachable by that pipeline**.
//
// (The first measurement said 93 of 144. That was taken with a narrower
// candidate rule, before `costFactorCandidate` was written down as one
// predicate both the picker and this test read. The denominator moved because
// the rule did, not because the corpus did — recorded rather than quietly
// restated.)
//
// Three independent reasons, each on its own enough to stop the whole thing:
//
//   campaign.js      the field-path picker filtered on
//                    `d.costFactors && Object.keys(...).length`, so it only
//                    ever offered a research target for a decision that
//                    ALREADY had one.
//   playbookMerge.js the merge looped `Object.keys(target.costFactors || {})`,
//                    so with no existing keys the loop never ran and nothing
//                    was written — even if a campaign had been aimed there.
//   playbookMerge.js (pre-existing, older than both) the path parser split on
//                    '[' and stripped ']' by hand, so
//                    `decisions[food_style].costFactors` resolved to the id
//                    `food_style.costFactors` and matched nothing. NO DECISION
//                    PATH HAS EVER RESOLVED.
//
// ── WHY THREE AND NOT ONE ───────────────────────────────────────────────────
//
// They are three stages of one pipeline — pick a target, resolve the path,
// write the value — and each one hid the next. The picker only ever offered
// decisions that already had cost factors, so the merge was only ever exercised
// on decisions that already had them, so "cannot add a key" never showed. And
// nothing ever aimed at a decision path, so the parser that could not read one
// never had to. Each defect made the one behind it unobservable. That is why
// fixing any single one of them would have changed nothing measurable, and why
// the gap read for months like an authoring backlog instead of a broken pipe.
//
// So the loop was closed: the 51 could be sharpened forever and the 101 could
// never be started. That is a pipeline defect, not an authoring backlog.
import { ALL_PLAYBOOKS } from '../playbooks';
import { getFieldPaths, costFactorCandidate } from '../knowledge/campaign';
import { proposePlaybookUpdate } from '../knowledge/playbookMerge';

// `prepareEvidenceReview` reads `extractedFacts`, not `facts` — my first
// fixture used the wrong key and produced an empty review, which looked like a
// merge failure and was a test bug.
const EV = (option, value) => ([{
  id: 'e1', source: 'test-source',
  extractedFacts: [{ fact: `cost_factor_${option}`, value: String(value), confidence: 'high' }],
}]);

describe('(premise) the gap is real and has a real denominator', () => {
  test('102 of 153 cost-affecting decisions carry no cost factors', () => {
    let candidates = 0; let without = 0;
    for (const pb of ALL_PLAYBOOKS) for (const d of (pb.decisions || [])) {
      if (!costFactorCandidate(d)) continue;
      candidates++;
      if (!d.costFactors || !Object.keys(d.costFactors).length) without++;
    }
    expect(candidates).toBe(153);
    expect(without).toBe(102);
  });
});

describe('the picker can now aim at them', () => {
  test('it offers 153 targets where it offered 51', () => {
    let offered = 0;
    for (const pb of ALL_PLAYBOOKS) offered += getFieldPaths(pb).filter((p) => p.kind === 'cost-factor').length;
    expect(offered).toBe(153);
  });

  test('and a target with nothing yet says so in its label', () => {
    // The operator picking a campaign should know whether they are starting a
    // field or sharpening one.
    const withNone = ALL_PLAYBOOKS.flatMap((pb) => getFieldPaths(pb))
      .filter((p) => p.kind === 'cost-factor' && /none yet/.test(p.label));
    expect(withNone.length).toBeGreaterThan(50);
  });

  test('IT DOES NOT OFFER A DECISION THAT CANNOT CARRY ONE', () => {
    // A decision with no real choice, or one whose blocks name nothing that
    // costs money, is not a cost-factor target. Without this the picker turns
    // into a list of every decision in the corpus.
    expect(costFactorCandidate({ options: ['a', 'b'], blocks: ['run_of_show'] })).toBe(false);
    expect(costFactorCandidate({ options: ['a'], blocks: ['food'] })).toBe(false);
    expect(costFactorCandidate({ blocks: ['food'] })).toBe(false);
    expect(costFactorCandidate(null)).toBe(false);
    // …and it reads the one vocabulary, so a plural still matches.
    expect(costFactorCandidate({ options: ['a', 'b'], blocks: ['vendors'] })).toBe(true);
  });
});

describe('THE MERGE CAN NOW WRITE ONE THAT WAS NEVER THERE', () => {
  const pb = () => ({
    type: 'Test',
    decisions: [{
      id: 'food_style', label: 'How is food handled?',
      options: ['Host cooks', 'Order trays', 'Full catering'],
      default: 'Host cooks', blocks: ['food'],
    }],
  });

  test('a decision with no costFactors gets the researched option', () => {
    const out = proposePlaybookUpdate(pb(), 'decisions[food_style].costFactors',
      EV('Full catering', 1.8), true);
    expect(out.status).not.toBe('error');
    // Asserted on the MERGED PLAYBOOK, not on `changes`. `changes` carries the
    // consensus in whatever shape `consensusValue` returned; the playbook is
    // what would actually ship, and it is the only one of the two that proves
    // the write landed on the decision.
    const merged = out.playbook.decisions.find((d) => d.id === 'food_style');
    expect(merged.costFactors['Full catering']).toBe(1.8);
    expect(merged.costFactorProvenance.tier).toBe('researched');
  });

  test('THE DEFAULT IS NEVER A KEY — a factor is relative to it', () => {
    // Seeding from options MINUS the default is what reproduces the corpus's
    // own convention: 42 of 51 authored key sets match that rule exactly.
    const out = proposePlaybookUpdate(pb(), 'decisions[food_style].costFactors',
      EV('Host cooks', 1.0), true);
    expect(Object.keys(out.changes || {})).not.toContain('Host cooks');
  });

  test('IT WRITES NOTHING WITHOUT A FACT — the safety the whole change rests on', () => {
    // Seeding more options widens what research MAY fill. It must never invent
    // a multiplier for an option nobody researched, or this fix would be the
    // thing it was built to prevent.
    const out = proposePlaybookUpdate(pb(), 'decisions[food_style].costFactors',
      EV('Full catering', 1.8), true);
    const keys = Object.keys(out.changes || {});
    expect(keys).toEqual(['Full catering']);
    expect(keys).not.toContain('Order trays');
  });

  test('an authored key set is still used verbatim, not replaced by the seed', () => {
    // The 9 decisions whose authors deliberately left cost-neutral options out
    // must keep that judgement. Existing keys win; the seed is only a fallback.
    const withFactors = {
      type: 'Test',
      decisions: [{
        id: 'food_style', label: 'Food', options: ['Host cooks', 'Order trays', 'Full catering'],
        default: 'Host cooks', blocks: ['food'], costFactors: { 'Full catering': 1.5 },
      }],
    };
    const out = proposePlaybookUpdate(withFactors, 'decisions[food_style].costFactors',
      EV('Order trays', 1.2), true);
    // 'Order trays' is not an authored key, so research for it is not written.
    expect(Object.keys(out.changes || {})).not.toContain('Order trays');
  });
});
