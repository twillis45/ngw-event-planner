// ─── A VERB DECIDED WHETHER THE APP KNEW ITS OWN DEADLINE WAS SOURCED ────────
//
// The `dietary_collection` timing category maps ONE act — collect the guests'
// dietary needs before the food is committed — to a sourced cadence: gather
// with the invitations/RSVPs, final list to the caterer ~1–2 weeks out.
//
// Its pattern required the verb "collect" or "gather" beside the dietary word.
// MEASURED across all 45 playbooks / 262 decisions, eleven decisions carry a
// dietary subject and ten of them grounded. The one that did not:
//
//   Crab Feast/dietary   "Ask your guests about shellfish allergies"   T-10d
//
// It is the same act, on the same cadence, and its T-10d sits squarely inside
// the sourced 5–45 day window. It grounded on NOTHING because its label opens
// with "Ask" instead of "Collect". A verb synonym was deciding whether the app
// could say where its deadline came from — on the highest-stakes dietary
// decision in the corpus, the one whose entire menu is the allergen.
//
// THE REGISTRY'S OWN RULE governs the fix: false negatives are acceptable, a
// false positive is not. So the new alternative is narrow — it requires the
// word "guests" between the ask and the dietary word, catching the act of
// asking THE GUESTS rather than any label containing both words.
//
// MEASURED BEFORE AND AFTER over the whole corpus: exactly one of 262 rows
// changes. Nothing else moves.
//
// NOT WIDENED FOR: Bachelorette Party/drinkers, "Drinking mix + dietary/
// no-alcohol needs". That one stays null on purpose — its subject is the
// drinking mix, not the act of collecting restrictions, and catching it would
// be the false positive this registry exists to avoid.
import { ALL_PLAYBOOKS, getPlaybook } from '../playbooks';
import {
  detectTimingCategory, effectiveTimingProvenance, isGroundedTiming, timingConflict,
} from '../knowledge/timingProvenance';

const decisionOf = (type, id) =>
  ((getPlaybook(type) || {}).decisions || []).find((d) => d && d.id === id);

const allDecisions = () => {
  const out = [];
  for (const pb of ALL_PLAYBOOKS) {
    for (const d of (pb.decisions || [])) if (d && d.id) out.push({ pb: pb.type, d });
  }
  return out;
};

describe('the same act grounds however the label words it', () => {
  test('(premise) the corpus and the detector are both really here', () => {
    const all = allDecisions();
    expect(all.length).toBeGreaterThan(250);
    expect(all.filter(({ d }) => detectTimingCategory(d)).length).toBeGreaterThan(25);
  });

  test('THE FIX: Crab Feast asks rather than collects, and now grounds', () => {
    const d = decisionOf('Crab Feast', 'dietary');
    expect(d.label).toBe('Ask your guests about shellfish allergies');
    const cat = detectTimingCategory(d);
    expect(cat && cat.category).toBe('dietary_collection');
    expect(isGroundedTiming(effectiveTimingProvenance(d))).toBe(true);
    // T-10d is INSIDE the sourced window, so this is a grounding, not a conflict.
    expect(timingConflict(d)).toBe(null);
  });

  test('every dietary-COLLECTION decision now grounds, by whatever verb', () => {
    // I expected Dinner Party here and it is deliberately absent. Its label —
    // "Collect dietary restrictions + allergies WITH THE INVITE" — matches the
    // INVITATION category first, which the registry says in as many words:
    // "Placed after invitation so an 'Invite + dietary ask' decision grounds on
    // invitation-SEND timing." Asking with the invitations is paced by when the
    // invitations go out. Recording the correction rather than widening the
    // expectation, because the ordering is the design.
    const collectors = allDecisions().filter(({ d }) => {
      const cat = detectTimingCategory(d);
      return cat && cat.category === 'dietary_collection';
    });
    expect(collectors.map(({ pb, d }) => `${pb}/${d.id}`).sort()).toEqual([
      'Baby Shower/dietary',
      'Birthday/dietary',
      'Bridal Shower/dietary',
      'Crab Feast/dietary',
    ]);
    // Dinner Party still grounds — on the invitation cadence, not this one.
    expect(isGroundedTiming(effectiveTimingProvenance(decisionOf('Dinner Party', 'dietary')))).toBe(true);
  });

  test('NEGATIVE CONTROL: the drinking-mix call stays out', () => {
    // "Drinking mix + dietary/no-alcohol needs" is about the bar, not about
    // collecting restrictions. Catching it would be a false positive, which
    // this registry's header says is the one unacceptable error.
    const d = decisionOf('Bachelorette Party', 'drinkers');
    expect(d.label).toMatch(/drinking mix/i);
    expect(detectTimingCategory(d)).toBe(null);
  });

  test('NEGATIVE CONTROL: the menu-lock and food-style calls stay out', () => {
    // The antiPattern is untouched and still load-bearing: the widened verb
    // must not drag a menu decision into the dietary-collection cadence.
    for (const { d } of allDecisions()) {
      const cat = detectTimingCategory(d);
      if (!cat || cat.category !== 'dietary_collection') continue;
      expect(`${d.id} ${d.label}`).not.toMatch(/\bmenu\b|food[ _]?style|who (handles|provides)/i);
    }
  });

  test('NEGATIVE CONTROL: most decisions still ground on nothing', () => {
    // If widening a verb ever moved this needle much, the pattern went too far.
    const all = allDecisions();
    const grounded = all.filter(({ d }) => isGroundedTiming(effectiveTimingProvenance(d)));
    expect(grounded.length).toBeLessThan(all.length * 0.5);
  });
});
