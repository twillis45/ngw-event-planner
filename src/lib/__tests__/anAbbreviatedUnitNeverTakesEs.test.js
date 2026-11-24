// ─── AN ABBREVIATED UNIT NEVER TAKES "ES" ────────────────────────────────────
//
// HANDOFF #240 trap: `shortUnit` pluralized "oz" to "ozes". Its rule adds "es"
// to a word ending in x, z, ch or sh (box → boxes, batch → batches), and "oz"
// ends in z. An abbreviation is not a word: "oz", "ct", "fl oz", "qt", "pt",
// "gal", "pk" and "doz" read the same for one or many. "lb" keeps its "lbs"
// (the file's own rule, "lb" → "lbs"), which is an "s", never an "es".
import { shortUnit } from '../playbooks';

describe('abbreviations stay as written for any quantity', () => {
  test.each([
    ['oz', 3, 'oz'],
    ['oz', 1, 'oz'],
    ['fl oz', 12, 'fl oz'],
    ['ct', 24, 'ct'],
    ['qt', 2, 'qt'],
    ['pt', 2, 'pt'],
    ['gal', 2, 'gal'],
    ['pk', 2, 'pk'],
    ['doz', 2, 'doz'],
  ])('%s × %d reads "%s"', (unit, qty, want) => {
    expect(shortUnit(unit, qty)).toBe(want);
  });

  test('a measure leading a phrase keeps the same rule: "oz dry pasta" is never "ozes dry pasta"', () => {
    expect(shortUnit('oz dry pasta', 8)).toBe('oz dry pasta');
  });

  test('no unit in the corpus\'s abbreviation set ever ends in "es" once pluralized', () => {
    for (const u of ['oz', 'lb', 'ct', 'fl oz', 'qt', 'pt', 'gal', 'pk', 'doz']) {
      expect(shortUnit(u, 5)).not.toMatch(/es$/);
    }
  });
});

describe('words still pluralize as before', () => {
  test.each([
    ['lb', 2, 'lbs'],
    ['box', 2, 'boxes'],
    ['batch', 3, 'batches'],
    ['loaf', 2, 'loaves'],
    ['bottle', 2, 'bottles'],
    ['cups cooked', 2, 'cups cooked'],
    ['lb dry pasta', 2, 'lbs dry pasta'],
    ['snack serving', 2, 'snack servings'],
  ])('%s × %d reads "%s"', (unit, qty, want) => {
    expect(shortUnit(unit, qty)).toBe(want);
  });
});
