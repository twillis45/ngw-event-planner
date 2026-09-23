// ─── THIRTEEN STEPPERS, OR TWO AND A DOOR ────────────────────────────────────
//
// The same dietary control renders on two surfaces and they disagreed about how
// much of it to show. Measured on the Santa Fe 80th:
//
//   food sheet      Vegetarian · Vegan · "+ 11 more — Pescatarian · Gluten-free
//                   · Dairy-free · Nut allergy …" · "+ Other"
//   Calls to make   all thirteen steppers, expanded, every time
//
// Thirteen −/+ rows is most of a phone screen spent on questions the host has
// not been asked and mostly will not answer.
//
// THIS FINISHES A HALF-DONE CONSOLIDATION. The 2026-07-11 food-plan audit found
// the TAG LIST hand-typed in three places and merged it into one `DIET_TAGS`. It
// did not merge the ORDERING AND PARTITION rule, so the vocabulary stayed in
// sync while the behaviour drifted. Both now read `dietRowsFor`.
import fs from 'fs';
import path from 'path';
import { DIET_TAGS, dietRowsFor, anyDietFlagged } from '../dietRows';

const ev = (dietCounts) => ({ id: 'd', type: 'Birthday', dietCounts });

describe('the dietary rows fold the same way everywhere', () => {
  test('(premise) the vocabulary really is long enough for this to matter', () => {
    expect(DIET_TAGS.length).toBe(13);
  });

  test('THE FIX: an untouched event offers two, and a door to the rest', () => {
    const r = dietRowsFor(ev({}));
    expect(r.active).toEqual([]);
    expect(r.quick).toEqual(['Vegetarian', 'Vegan']);
    expect(r.rest.length).toBe(11);
    // Every tag is still reachable — this is a fold, not a deletion.
    expect([...r.quick, ...r.rest].sort()).toEqual([...DIET_TAGS].sort());
  });

  test('expanded shows everything and leaves nothing behind the door', () => {
    const r = dietRowsFor(ev({}), { expanded: true });
    expect(r.quick.length).toBe(13);
    expect(r.rest).toEqual([]);
  });

  test('A COUNT IS AN ANSWER: answered tags are never folded away', () => {
    // The reason the partition cannot be a plain slice(0, 2) over the
    // vocabulary. Kosher sits 9th and would vanish behind the fold; it is the
    // host's own input, so it leads.
    const r = dietRowsFor(ev({ Kosher: 3, 'Nut allergy': 1 }));
    expect(r.active).toEqual(['Nut allergy', 'Kosher']);
    expect(r.rest).not.toContain('Kosher');
    expect(r.rest).not.toContain('Nut allergy');
    expect(r.totalActive).toBe(4);
  });

  test('many answers all stay visible — the fold never hides host input', () => {
    const many = { Vegetarian: 1, Vegan: 1, Kosher: 1, Halal: 1, Shellfish: 1, 'Soy allergy': 1 };
    const r = dietRowsFor(ev(many));
    expect(r.active.length).toBe(6);
    for (const k of Object.keys(many)) expect(r.active).toContain(k);
  });

  test('a host-typed diet is an answer too, and is not duplicated as a blank row', () => {
    // Compared lower-cased: a custom "vegetarian" must not reappear as an
    // unanswered "Vegetarian" stepper beside the count it already has.
    const r = dietRowsFor(ev({ 'Low FODMAP': 2, vegetarian: 1 }));
    expect(r.customs).toContain('Low FODMAP');
    expect(r.quick).not.toContain('Vegetarian');
    expect(r.rest).not.toContain('Vegetarian');
    expect(r.totalActive).toBe(3);
  });

  test('flaggedCount counts the vocabulary, so two surfaces cannot count it differently', () => {
    // It is the number the summary lines read. A custom entry is a real count
    // but is not a DIET_TAG, which is the distinction that drifted.
    const r = dietRowsFor(ev({ Vegan: 2, 'Low FODMAP': 1 }));
    expect(r.flaggedCount).toBe(1);
    expect(r.totalActive).toBe(3);
  });

  test('anyDietFlagged sees customs as well as tags', () => {
    expect(anyDietFlagged(ev({}))).toBe(false);
    expect(anyDietFlagged(ev({ Vegan: 0 }))).toBe(false);
    expect(anyDietFlagged(ev({ Vegan: 1 }))).toBe(true);
    expect(anyDietFlagged(ev({ 'Low FODMAP': 1 }))).toBe(true);
    expect(anyDietFlagged(null)).toBe(false);
  });

  test('NEGATIVE CONTROL: a zero or junk count is not an answer', () => {
    const r = dietRowsFor(ev({ Vegan: 0, Kosher: null, Halal: 'x' }));
    expect(r.active).toEqual([]);
    expect(r.quick).toEqual(['Vegetarian', 'Vegan']);
  });

  test('the hardened vocabulary is still VISIBLE to the sweep that enumerates them', () => {
    // Freezing the list nearly hid it. `dietVocabularyResolves` walks the tree
    // for `DIET_TAGS = [...]` and its pattern did not allow an
    // `Object.freeze(` between the `=` and the `[`, so moving the vocabulary
    // here and hardening it dropped that sweep from two files to one — the gate
    // built to find every copy stopped seeing the canonical one. Asserted from
    // this side too, so the two cannot drift apart again.
    const src = fs.readFileSync(path.join(__dirname, '..', 'dietRows.js'), 'utf8');
    const m = src.match(/DIET_TAGS\s*=\s*(?:Object\.freeze\(\s*)?\[([^\]]*)\]/);
    expect(m).toBeTruthy();
    expect(m[1]).toMatch(/'Vegetarian'/);
  });

  test('NEGATIVE CONTROL: the vocabulary is frozen and ordered as authored', () => {
    // Surfaces render in list order, so a reshuffle silently changes which two
    // tags are offered first on every screen.
    expect(DIET_TAGS[0]).toBe('Vegetarian');
    expect(DIET_TAGS[1]).toBe('Vegan');
    expect(Object.isFrozen(DIET_TAGS)).toBe(true);
    // 'Shellfish', never legacy's 'Shellfish allergy' — DIET_KEYWORDS keys on
    // the short form, so the long one silently flags nothing.
    expect(DIET_TAGS).toContain('Shellfish');
    expect(DIET_TAGS).not.toContain('Shellfish allergy');
  });
});
