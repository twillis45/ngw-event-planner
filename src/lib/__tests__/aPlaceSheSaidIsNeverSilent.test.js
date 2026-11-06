// Gold run (GOLD-01, 11/5/2026): "…about 75 guests in the Maryland/DC area…"
// set no place and listed nothing under "didn't make it". The phrase sat inside
// a clause the guest count had consumed, so the clause-level check saw it as
// used. And "cookout in Maryland for 30" dropped the state the same way.
import { parseSmartEventText, unusedClauses } from '../smartParseEvent';

const GOLD01 = "Wanda's 50th birthday and 30-year Army retirement, about 75 guests in the Maryland/DC area, black and gold, formal Army recognition followed by a celebration, food, bar, DJ and photography, budget $5,000.";

test('a plainly named state is kept as the state', () => {
  const p = parseSmartEventText('cookout in Maryland for 30');
  expect(p.venueState).toBe('MD');
  expect(p.venueCity).toBe(null);   // the town is still asked, never guessed
});

test('a region is not guessed into a state…', () => {
  const p = parseSmartEventText(GOLD01);
  expect(p.venueState).toBe(null);
  expect(p.venueCity).toBe(null);
});

test('…and it is disclosed, not swallowed by the guest-count clause', () => {
  const dropped = unusedClauses(GOLD01).join(' | ');
  expect(dropped).toMatch(/Maryland\/DC area/);
});

test('a place the plan did use is not reported', () => {
  expect(unusedClauses('reunion in Santa Fe, New Mexico for 40 in June').join(' | ')).not.toMatch(/Santa Fe/);
  expect(unusedClauses('cookout in Maryland for 30 on Saturday').join(' | ')).not.toMatch(/Maryland/);
});
