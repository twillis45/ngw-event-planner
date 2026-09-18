// ─── THE PICKER THE HOST TAPS WAS THE ONE STORE NOBODY READ ──────────────────
//
// A dietary fact can live in three places in this app:
//
//   1. `event.dietCounts`            the diet drill-in — WHICH and HOW MANY
//   2. `event.guests[].needs/allergens/diets/meal`   the roster — WHICH and WHO
//   3. `event.foodChoices.dietary`   the playbook decision's own option CHIPS
//
// `playbookFoodPlan` built its `activeDiets` union from (1) and (2). MEASURED
// on a Crab Feast, tapping "Nut allergy" and "Shellfish" on the decision chips:
//
//   specialDiets []   dietaryResolved false   flagged items: NONE
//
// Byte-identical to recording nothing at all — while the board counted the
// decision as settled and the toast said so. The SAME restriction arriving
// through either of the other two doors flags "Blue crabs -> shellfish" and
// "Steamed shrimp -> shellfish".
//
// On the decision whose own `why` reads: "One guest with an allergy needs a
// separate plate kept away from the crab steam and the tools."
//
// This was also the real answer to a question asked earlier the same day —
// which of the two collection mechanisms is better for safety. The honest
// answer turned out to be neither of the two being compared: the chips, the
// mechanism most hosts will actually touch, reached nothing at all. Making
// those chips multi-select earlier today fixed what they RECORDED and what
// they DISPLAYED; it did not make one spread item safer, because the store
// they write to had no reader in the flagging engine.
//
// THE TIERING IS PRESERVED, NOT FLATTENED. Chips join as a FLAG source only:
//   - they do NOT join `specialDiets`, which carries counts they cannot know
//   - they do NOT set `dietaryResolved`, which means resolved PER GUEST
// A chip answer says WHICH restrictions exist at this table. It does not claim
// how many guests have them, or that anyone asked each guest by name.
import { playbookFoodPlan, ALL_PLAYBOOKS, DIET_KEYWORD_KEYS, DIET_TAGS_WITHOUT_KEYWORDS } from '../playbooks';
import { isMultiDecision } from '../decisionType';

const crab = (extra) => ({
  id: 'e', type: 'Crab Feast', date: '2026-10-10',
  guestMode: 'count', guestCount: 12, guests: [], foodChoices: {}, ...extra,
});

const flagged = (ev) => {
  const fp = playbookFoodPlan(ev);
  return (fp.list || []).filter((i) => i && i.dietFlags && i.dietFlags.length)
    .map((i) => `${i.short} -> ${i.dietFlags.join(',')}`).sort();
};
const plan = (ev) => playbookFoodPlan(ev);

const ROSTER = [
  { id: 'g1', name: 'Ana', needs: 'nut allergy' },
  { id: 'g2', name: 'Ben', allergens: ['Shellfish'] },
];

describe('a restriction flags the spread whichever door it came through', () => {
  test('(premise) this menu CAN be flagged, and is not flagged by default', () => {
    // Without this, every assertion below passes over an empty list. The Crab
    // Feast spread carries blue crabs and shrimp — real shellfish lines.
    expect(flagged(crab({}))).toEqual([]);
    expect((plan(crab({})).list || []).length).toBeGreaterThan(5);
  });

  test('THE FIX: the decision chips now flag the same lines as the other two', () => {
    const viaChips = flagged(crab({ foodChoices: { dietary: ['Nut allergy', 'Shellfish'] } }));
    const viaCounts = flagged(crab({ dietCounts: { 'Nut allergy': 1, Shellfish: 2 } }));
    const viaRoster = flagged(crab({ guestMode: 'roster', guests: ROSTER }));
    expect(viaChips.length).toBeGreaterThan(0);
    expect(viaChips).toEqual(viaCounts);
    expect(viaChips).toEqual(viaRoster);
    expect(viaChips).toEqual(['Blue crabs -> shellfish', 'Steamed shrimp -> shellfish']);
  });

  test('a single pick-one string works too, not just a multi list', () => {
    // Every event stored before the multi change holds a bare string here.
    expect(flagged(crab({ foodChoices: { dietary: 'Shellfish' } })))
      .toEqual(['Blue crabs -> shellfish', 'Steamed shrimp -> shellfish']);
  });

  test('NEGATIVE CONTROL: chips claim no COUNT they cannot know', () => {
    // `specialDiets` is "3 guests are vegetarian". A chip says a restriction
    // exists, not how many people have it. Inventing a count here would be the
    // fabrication this whole lane exists to prevent.
    expect(plan(crab({ foodChoices: { dietary: ['Shellfish'] } })).specialDiets).toEqual([]);
    expect(plan(crab({ dietCounts: { Shellfish: 2 } })).specialDiets).toEqual([{ diet: 'Shellfish', count: 2 }]);
  });

  test('NEGATIVE CONTROL: chips do not claim the question is RESOLVED', () => {
    // `dietaryResolved` means the host went guest by guest. Only the roster
    // earns it, and it still does.
    expect(plan(crab({ foodChoices: { dietary: ['Shellfish'] } })).dietaryResolved).toBe(false);
    expect(plan(crab({ dietCounts: { Shellfish: 2 } })).dietaryResolved).toBe(false);
    expect(plan(crab({ guestMode: 'roster', guests: ROSTER })).dietaryResolved).toBe(true);
  });

  test('NEGATIVE CONTROL: an emptied or junk chip answer flags nothing', () => {
    // '' is what an emptied multi list stores. A label the matcher does not
    // know is dropped rather than guessed at.
    for (const v of ['', [], null, undefined, ['Not A Real Diet'], '   ']) {
      expect(flagged(crab({ foodChoices: { dietary: v } }))).toEqual([]);
    }
  });
});

describe('the chip vocabulary is inside the resolution gate', () => {
  // `dietVocabularyResolves.test.js` enumerates arrays named DIET_TAGS /
  // DIETARY_TAGS / DIET_OPTIONS. The playbook decisions' own `options:` arrays
  // are a SIXTH vocabulary and were outside that sweep — which matters now that
  // they reach the matcher. Same rule, applied to the strings a host taps.
  const KNOWN = new Set([...DIET_KEYWORD_KEYS, ...DIET_TAGS_WITHOUT_KEYWORDS]);

  const chipTags = () => {
    const out = [];
    for (const pb of ALL_PLAYBOOKS) {
      for (const d of (pb.decisions || [])) {
        if (!d || !isMultiDecision(d)) continue;
        for (const o of (d.options || [])) {
          out.push({ tag: typeof o === 'string' ? o : (o && (o.label || o.id)) || '', where: `${pb.type}/${d.id}` });
        }
      }
    }
    return out;
  };

  test('(premise) the sweep finds real chip vocabularies', () => {
    const tags = chipTags();
    expect(tags.length).toBeGreaterThan(20);
    expect(new Set(tags.map((t) => t.where)).size).toBe(3);
  });

  test('EVERY chip a host can tap resolves, or is declared unmappable', () => {
    const orphans = chipTags().filter((t) => !KNOWN.has(t.tag));
    expect(orphans.map((o) => `${o.tag} (${o.where})`)).toEqual([]);
  });
});
