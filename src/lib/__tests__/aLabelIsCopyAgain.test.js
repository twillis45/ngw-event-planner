// ─── THE LABELS WERE BEING KEPT FOR THE MATCHER, NOT FOR THE HOST ────────────
//
// `detectTimingCategory` matched on the decision's host-facing LABEL, so the
// copy was a functional string. Measured consequence: three of the five dietary
// labels were long enough to TRUNCATE on the board —
//
//   "Collect dietary restrictions + the parent's pregna…"
//   "Collect dietary restrictions + allergies with the…"
//
// — and shortening them would have silently un-grounded their deadlines,
// because the pattern needs a verb ("collect", "gather") beside the dietary
// word. They also read as unfinished CHORES in the settled fold, sitting beside
// the answer they already hold:
//
//   Collect dietary restrictions from RSVPs   Vegetarian, Nut allergy   Change
//
// An explicit `timingCategory` declares the intent instead of leaving the engine
// to infer it from prose. Same shape as `decisionType` and the authored
// `timingProvenance` this module already honoured: authored wins, else derive.
// Detection stays for the ~250 decisions that declare nothing.
//
// MEASURED BEFORE AND AFTER over every playbook — a full snapshot of each
// decision's derived type, timing category, grounding, conflict, board label,
// ask, status, route and weight basis, plus each playbook's food-plan choices
// and dietary flags. The ONLY lines that differ are the five labels themselves.
import { ALL_PLAYBOOKS, getPlaybook } from '../playbooks';
import { detectTimingCategory, effectiveTimingProvenance, isGroundedTiming } from '../knowledge/timingProvenance';
import { decisionTypeFor } from '../decisionType';

const dietaryDecisions = () => {
  const out = [];
  for (const pb of ALL_PLAYBOOKS) {
    for (const d of (pb.decisions || [])) {
      if (d && /dietar|allerg/i.test(`${d.id} ${d.label || ''}`)) out.push({ pb: pb.type, d });
    }
  }
  return out;
};

describe('a dietary label is copy again', () => {
  test('(premise) the dietary decisions are really here', () => {
    expect(dietaryDecisions().length).toBeGreaterThan(8);
  });

  test('THE POINT: the category survives any rewording of the label', () => {
    // The decoupling itself. Every decision that DECLARES a category keeps it
    // when its label is replaced with text that matches no pattern at all. If
    // this ever fails, the label has become load-bearing again.
    const declared = dietaryDecisions().filter(({ d }) => d.timingCategory);
    expect(declared.map(({ pb }) => pb).sort()).toEqual([
      'Baby Shower', 'Birthday', 'Bridal Shower', 'Crab Feast', 'Dinner Party',
    ]);
    for (const { pb, d } of declared) {
      const before = detectTimingCategory(d);
      const reworded = detectTimingCategory({ ...d, label: 'Something else entirely' });
      expect(`${pb}: ${reworded && reworded.category}`).toBe(`${pb}: ${before && before.category}`);
      expect(isGroundedTiming(effectiveTimingProvenance({ ...d, label: 'Something else entirely' }))).toBe(true);
    }
  });

  test('the new labels NAME the fact instead of ordering the host around', () => {
    // They sit beside their own recorded answer in the settled fold, so an
    // imperative reads as an unfinished chore next to a finished thing.
    const labels = Object.fromEntries(dietaryDecisions()
      .filter(({ d }) => d.timingCategory).map(({ pb, d }) => [pb, d.label]));
    expect(labels).toEqual({
      'Baby Shower': 'Dietary needs and pregnancy-safe foods',
      Birthday: 'Allergies and dietary needs',
      'Bridal Shower': 'Dietary needs and allergies',
      'Crab Feast': 'Shellfish allergies and dietary needs',
      'Dinner Party': 'Dietary needs and allergies',
    });
    for (const [pb, label] of Object.entries(labels)) {
      // No imperative opener, and short enough that the board's 52-char
      // shortener never has to truncate it — three of the five used to.
      expect(`${pb}: ${label}`).not.toMatch(/: (Collect|Ask|Confirm|Finalize|Gather|Get) /);
      expect(`${pb}: ${label.length <= 52}`).toBe(`${pb}: true`);
    }
  });

  test('NEGATIVE CONTROL: every OTHER reader of the label still works', () => {
    // The label feeds several `id + label` haystacks. All five keep a
    // dietary/allergy word, which is what those matchers need — and the multi
    // deriver in particular reads the same subject test.
    for (const t of ['Dinner Party', 'Bridal Shower', 'Crab Feast']) {
      const d = (getPlaybook(t).decisions || []).find((x) => x.id === 'dietary');
      expect(`${t}: ${decisionTypeFor(d)}`).toBe(`${t}: multi`);
    }
    for (const { pb, d } of dietaryDecisions()) {
      expect(`${pb}/${d.id}`).toBeTruthy();
      expect(/dietar|allerg/i.test(`${d.id} ${d.label || ''}`)).toBe(true);
    }
  });

  test('NEGATIVE CONTROL: nothing else in the corpus declared a category', () => {
    // The declaration is opt-in and narrow. If this count climbs without a
    // reason, someone is declaring their way around the detector rather than
    // fixing a pattern.
    const all = [];
    for (const pb of ALL_PLAYBOOKS) {
      for (const d of (pb.decisions || [])) if (d && d.timingCategory) all.push(`${pb.type}/${d.id}`);
    }
    expect(all.length).toBe(5);
  });
});
