// ─── WHICH HOST-FACING COPY IS SECRETLY A FUNCTIONAL STRING ──────────────────
//
// Rewriting five dietary labels earlier today went fine, and it went fine BY
// LUCK: every new label happened to keep a dietary word, which is what the
// `id + label` haystacks scattered through the engine needed. Nothing in the
// tree would have said so if one had not.
//
// This measures it instead of assuming. For every decision in the corpus it
// swaps ONLY the label for a neutral string and diffs everything the engine
// derives — decision type, timing category, timing grounding, timing conflict,
// board status, route, weight basis, and all thirteen knowledge-context
// groundings. Anything that moves is copy doing a job.
//
// MEASURED 2026-09-18: **38 of 260 decisions (15%) change engine behaviour when
// only their label changes.** The full map is pinned below, so a future label
// rewrite that silently un-grounds something fails HERE and names what it cost.
//
// WHAT EACH CLASS COSTS A HOST
//
//   knowledge-context  A grounded claim disappears. "Is there a bar for the
//                      grown-ups?" grounds `legal`; neutral, it does not, and
//                      the host loses the alcohol-liability context on a
//                      decision that is entirely about serving alcohol.
//   timing-category /  The deadline stops citing its source. The row still
//   timing-grounding   shows a date; it just no longer says where the date
//                      came from, which is the whole point of the registry.
//   timing-conflict    A contradiction between our deadline and its source
//                      appears or disappears. Three venue decisions ("Indoor
//                      or outdoor?") currently SUPPRESS a venue-booking match
//                      via the antiPattern — there the label is doing correct,
//                      load-bearing work the id cannot do, and neutralising it
//                      makes the engine wrongly read them as booking calls.
//   route              The row's tap target moves. Losing `fp-diet-e` sends a
//                      host collecting allergies somewhere else entirely.
//
// SO THIS IS NOT ALL DEBT. For the antiPattern cases the label IS the
// distinguishing signal and should stay one. The point of the gate is that the
// coupling is now VISIBLE and counted, not that all 38 should be converted.
//
// THE ESCAPE HATCH, when a label genuinely has to change: declare the fact
// instead of implying it. `timingCategory` was added for exactly this and is
// authored on five decisions; `decisionType` works the same way. Declaring
// beats widening a pattern, which is how a false positive gets in.
import { ALL_PLAYBOOKS, playbookDecisionBoard } from '../playbooks';
import {
  detectTimingCategory, effectiveTimingProvenance, isGroundedTiming, timingConflict,
} from '../knowledge/timingProvenance';
import { decisionTypeFor } from '../decisionType';

const NEUTRAL = 'Something else entirely';
const CTX = ['cultural', 'military', 'destination', 'accessibility', 'legal', 'venue',
  'weather', 'human', 'dietary', 'budget', 'childcare', 'timing', 'cost'];

const derive = (d, board) => {
  const rows = board ? [...(board.locked || []), ...(board.open || [])] : [];
  const row = rows.find((r) => r && r.id === d.id);
  const cat = detectTimingCategory(d);
  return {
    type: decisionTypeFor(d),
    cat: cat ? cat.category : null,
    grounded: isGroundedTiming(effectiveTimingProvenance(d)),
    conflict: timingConflict(d) ? timingConflict(d).direction : null,
    status: row && row.status,
    route: JSON.stringify(row && row.route),
    weightBasis: row && row.importanceBasis,
    ctx: CTX.filter((k) => row && row[`${k}Grounded`]).join('+'),
  };
};

// The board is built from the playbook's own decisions array, so a label swap
// has to go through it. Restored immediately — a leaked mutation would poison
// every suite that runs after this one.
const boardWith = (pb, decisions) => {
  const saved = pb.decisions;
  if (decisions) pb.decisions = decisions;
  const ev = { id: 'e', type: pb.type, date: '2026-09-28', guestMode: 'count', guestCount: 20, guests: [], foodChoices: {} };
  let b = null;
  try { b = playbookDecisionBoard(ev, '2026-09-18'); } finally { pb.decisions = saved; }
  return b;
};

const couplingMap = () => {
  const map = {};
  for (const pb of ALL_PLAYBOOKS) {
    const real = boardWith(pb, null);
    for (const d of (pb.decisions || [])) {
      if (!d || !d.id || !d.label) continue;
      const swapped = (pb.decisions || []).map((x) => (x && x.id === d.id ? { ...x, label: NEUTRAL } : x));
      const a = derive(d, real);
      const b = derive({ ...d, label: NEUTRAL }, boardWith(pb, swapped));
      const kinds = new Set();
      if (a.cat !== b.cat) kinds.add('timing-category');
      if (a.grounded !== b.grounded) kinds.add('timing-grounding');
      if (a.conflict !== b.conflict) kinds.add('timing-conflict');
      if (a.route !== b.route) kinds.add('route');
      if (a.ctx !== b.ctx) kinds.add('knowledge-context');
      if (a.type !== b.type) kinds.add('decision-type');
      if (a.status !== b.status) kinds.add('status');
      if (a.weightBasis !== b.weightBasis) kinds.add('weight-basis');
      if (kinds.size) map[`${pb.type}/${d.id}`] = [...kinds].sort();
    }
  }
  return map;
};

// Measured 2026-09-18. Changing a label is allowed — it just has to land here
// deliberately, with the cost named in the commit.
const PINNED = {
  'Anniversary/beverage': ['knowledge-context'],
  'Anniversary/guestlist': ['knowledge-context', 'route'],
  'Anniversary/menu': ['knowledge-context', 'timing-category', 'timing-grounding'],
  'Anniversary/venue': ['timing-category', 'timing-conflict'],
  'Bachelorette Party/dinner': ['knowledge-context', 'route'],
  'Bachelorette Party/drinkers': ['knowledge-context'],
  'Conference/sponsor_model': ['knowledge-context'],
  'Day Party/venue': ['knowledge-context'],
  'Dinner Party/menu': ['knowledge-context', 'timing-category', 'timing-grounding'],
  'Dinner Party/seating': ['knowledge-context'],
  'Elopement/photography': ['knowledge-context', 'timing-category', 'timing-grounding'],
  'Engagement Party/invite': ['knowledge-context', 'route'],
  'Engagement Party/venue': ['timing-category', 'timing-conflict'],
  'Ethiopian Coffee Ceremony/fasting_spread': ['knowledge-context'],
  'Gender Reveal/venue': ['knowledge-context', 'timing-category', 'timing-conflict'],
  'Get-Together/shade': ['knowledge-context'],
  'Halloween Party/drinks': ['knowledge-context'],
  'Holiday Party/alcohol_service': ['knowledge-context'],
  'Holiday Party/signature': ['knowledge-context'],
  'Housewarming/drinks': ['knowledge-context'],
  'Juneteenth Cookout/drinks': ['knowledge-context'],
  'Juneteenth Cookout/shade': ['knowledge-context'],
  'Quinceañera/court_size': ['knowledge-context'],
  'Quinceañera/dress': ['knowledge-context', 'timing-category', 'timing-grounding'],
  'Quinceañera/vals_song': ['knowledge-context'],
  'Retirement Party/invite': ['knowledge-context', 'route'],
  'Retirement Party/surprise': ['knowledge-context'],
  'Reunion/kids-plan': ['knowledge-context'],
  'Reunion/venue-setting': ['knowledge-context', 'timing-category', 'timing-grounding'],
  'The Cookout/game_day': ['route'],
  'The Cookout/shade_seating': ['knowledge-context'],
  'Vow Renewal/beverage': ['knowledge-context'],
  'Vow Renewal/guestlist': ['knowledge-context', 'route'],
  'Vow Renewal/menu': ['knowledge-context', 'timing-category', 'timing-grounding'],
  'Watch Party/screen': ['knowledge-context'],
  'Wedding/guestcount': ['knowledge-context'],
  'Wedding/music': ['knowledge-context', 'timing-category', 'timing-grounding'],
  'Wedding/vendor_team': ['knowledge-context'],
};

describe('which labels are load-bearing', () => {
  test('(premise) the probe really swaps labels on a real corpus', () => {
    // Without this, an empty or broken sweep reports zero coupling and reads
    // as good news.
    const total = ALL_PLAYBOOKS.reduce((n, pb) => n + (pb.decisions || []).filter((d) => d && d.label).length, 0);
    expect(total).toBeGreaterThan(250);
    // And the detector must genuinely read the label. Asserted on a SYNTHETIC
    // decision, not a corpus one: pinning a real label here would make every
    // legitimate copy edit fail this test too, pointing at the probe instead of
    // at the finding. (Learned by red-proofing this file — rewording one
    // corpus label failed three tests, and only one of them was the news.)
    const synthetic = { id: 'music', label: 'Music — band or DJ', when: 'T-240d' };
    expect(detectTimingCategory(synthetic).category).toBe('entertainment');
    expect(detectTimingCategory({ ...synthetic, label: NEUTRAL })).toBe(null);
  });

  test('THE MAP: exactly these decisions depend on their own copy', () => {
    expect(couplingMap()).toEqual(PINNED);
  });

  test('the swap leaves the corpus unmutated', () => {
    // This probe writes to `pb.decisions` and restores it. A leak would poison
    // every suite that runs after this one, which is the worst kind of failure
    // because it lands somewhere else.
    //
    // Compared against a snapshot taken here rather than against a hardcoded
    // label, so an ordinary copy edit never fails this test — it has one job
    // and it is not guarding wording.
    const before = ALL_PLAYBOOKS.map((pb) => (pb.decisions || []).map((d) => d && d.label).join('|')).join('\n');
    couplingMap();
    const after = ALL_PLAYBOOKS.map((pb) => (pb.decisions || []).map((d) => d && d.label).join('|')).join('\n');
    expect(after).toBe(before);
  });

  test('NO label decides a decision TYPE, a STATUS, or a WEIGHT basis', () => {
    // These three are the dangerous ones and they are currently clean. A label
    // that decided whether a restriction list is multi-select, or whether a row
    // is overdue, or how important it is, would make copy edits genuinely
    // unsafe rather than merely lossy. `decisionType` and authored `weight`
    // exist so it never has to.
    const kinds = new Set(Object.values(PINNED).flat());
    for (const dangerous of ['decision-type', 'status', 'weight-basis']) {
      expect([...kinds]).not.toContain(dangerous);
    }
  });

  test('the three venue vetoes are the label doing CORRECT work', () => {
    // Neutralising these labels does not lose a grounding — it ADDS a wrong
    // one. "Indoor or outdoor?" is not a venue-booking call, and the
    // antiPattern reads the label to say so. Converting these to declarations
    // would throw information away.
    for (const k of ['Anniversary/venue', 'Engagement Party/venue', 'Gender Reveal/venue']) {
      expect(`${k}: ${PINNED[k].includes('timing-conflict')}`).toBe(`${k}: true`);
    }
    const eng = ALL_PLAYBOOKS.find((p) => p.type === 'Engagement Party');
    const venue = (eng.decisions || []).find((d) => d.id === 'venue');
    expect(detectTimingCategory(venue)).toBe(null);
    expect(timingConflict(venue)).toBe(null);
    expect(timingConflict({ ...venue, label: NEUTRAL }).direction).toBe('late');
  });

  test('a declared fact survives any rewording — the escape hatch works', () => {
    // The five dietary decisions declare `timingCategory` and are absent from
    // the map above for that reason. This is what to do when a label has to
    // change: declare the fact rather than widen a pattern.
    const declared = [];
    for (const pb of ALL_PLAYBOOKS) {
      for (const d of (pb.decisions || [])) if (d && d.timingCategory) declared.push(`${pb.type}/${d.id}`);
    }
    expect(declared.length).toBe(5);
    for (const k of declared) expect(Object.keys(PINNED)).not.toContain(k);
  });
});
