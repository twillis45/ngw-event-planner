// Live check, 11/19/2026: "Envelope test dinner on December 6 at 6 pm at
// Vida's…" became "My Elopement". The keyword was a bare /elope/ and matched
// inside "envelope". A word that only CONTAINS elope is not an elopement.
import { resolveCanonicalType } from '../eventTaxonomy.mjs';
import { parseSmartEventText } from '../smartParseEvent';

test.each([
  ['Envelope test dinner on December 6 at 6 pm', 'Elopement', false],
  ['Antelope Valley cookout', 'Elopement', false],
  ['Penelope’s 30th birthday', 'Elopement', false],
  ['We eloped! Small party after', 'Elopement', true],
  ['Our elopement in Sedona', 'Elopement', true],
  ['Eloping in Big Sur, 6 people', 'Elopement', true],
  ['A micro-wedding for 20', 'Elopement', true],
])('%s → elopement: %s', (text, type, isIt) => {
  expect(resolveCanonicalType(text) === type).toBe(isIt);
});

test('the sentence that misread is read as a dinner, not an elopement', () => {
  const r = parseSmartEventText("Envelope test dinner on December 6 at 6 pm at Vida's for 8 in Oxon Hill, MD");
  expect(r.type).not.toBe('Elopement');
});
