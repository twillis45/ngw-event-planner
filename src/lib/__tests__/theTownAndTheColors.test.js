// ─── TWO CREATION DEFECTS, BOTH SMALL, BOTH LOCAL ───────────────────────────
//
// Reproduced 2026-10-18 for Sprint 0 P1-4. Neither is a missing capability;
// both are the parser mis-reading a sentence it already tries to read.
//
// ── 1 · "the" IS NOT A TOWN ────────────────────────────────────────────────
//
//   "40 guests in the Maryland/DC area"  →  venueCity: "the"
//
// ONE CHARACTER CAUSES IT. The matcher at smartParseEvent.js:968 is written
// as `([A-Z][a-zA-Z…]+)\s+(<state names>)` — the leading `[A-Z]` is a
// deliberate proper-noun test, and the comment eighty lines above says so in
// as many words: the capital is "a cheap proper-noun test standing between
// 'in the backyard' and a fabricated destination event." But the regex carries
// the `i` flag so the spelled-out state names match in any case, and `i`
// applies to the WHOLE pattern — so `[A-Z]` matches lowercase too and the test
// it was doing silently stopped happening. "the" became a city.
//
// The file already owns the right vocabulary for this: `NOT_A_PLACE` lists
// `the`, `our`, `my`, every month and every weekday. It is declared a hundred
// lines BELOW this branch, so the branch could never have used it.
//
// WHAT IT COSTS. `venueCity` feeds geocoding, weather, the shopping list,
// lodging search and maps. "the, MD" geocodes to nothing, and the surfaces
// that depend on it go quiet with no error — the exact silent-failure shape
// `cityText.js` was written to prevent.
//
// ── 2 · A COLOUR PAIR IS A THEME ───────────────────────────────────────────
//
//   "black and gold theme"  →  theme: "black and gold"
//   "black and gold"        →  theme: null, and both words reported dropped
//
// The host said the same thing twice as far as she is concerned. Requiring the
// literal word "theme" means the commonest way of saying it is the one way
// that fails.
//
// DELIBERATELY NARROW. Only a clause that is ENTIRELY colours joined by and/&/
// a slash reads as a colour scheme. "black tie" is a dress code, not a palette,
// and one colour on its own is a word in a sentence, not a decision.
import { parseSmartEventText } from '../smartParseEvent';

const parse = (t) => parseSmartEventText(t, {});

describe('"the" is not a town', () => {
  test('the measured sentence no longer commits a garbage city', () => {
    expect(parse('40 guests in the Maryland/DC area').venueCity).not.toBe('the');
  });

  test('it commits NOTHING rather than guessing a better one', () => {
    // "Maryland/DC area" is a region, not a City, ST, and this file's standing
    // rule is that a guessed location is worse than asking. Null is the honest
    // answer; the host is asked "Which town?" as she already is for every
    // other unresolvable place.
    expect(parse('40 guests in the Maryland/DC area').venueCity).toBeFalsy();
  });

  test('the full sentence it was found in', () => {
    const p = parse('retirement party, 40 guests in the Maryland/DC area, black and gold');
    expect(p.venueCity).not.toBe('the');
    // And the rest of the sentence still parses — this is a narrow repair.
    expect(p.type).toBe('Retirement Party');
  });

  test('no other filler word can become a town either', () => {
    const fillers = ['in the Virginia area', 'in our Maryland office', 'in my Texas hometown'];
    expect(fillers.map((s) => parse(s).venueCity || null)).toEqual([null, null, null]);
  });

  test('CONTROL — a spelled-out state with a real town still resolves', () => {
    // The branch exists for these, and the measured case that created it was
    // the Santa Fe 80th. Breaking them to fix "the" would be a bad trade.
    const got = ['in Santa Fe New Mexico', 'in Austin Texas', 'in Baltimore Maryland']
      .map((s) => parse(s).venueCity);
    expect(got).toEqual(['Santa Fe', 'Austin', 'Baltimore']);
  });

  test('CONTROL — the lowercase recovery path is untouched', () => {
    // "in austin tx" recovers the city through the curated whitelist. That is a
    // different branch and must keep working.
    expect(parse('cookout in austin tx for 30').venueCity).toBeTruthy();
  });
});

describe('a colour pair is a theme, said either way', () => {
  test('without the literal word', () => {
    expect(parse('retirement party, black and gold').theme).toBe('black and gold');
  });

  test('and with it, exactly as before', () => {
    expect(parse('retirement party, black and gold theme').theme).toBe('black and gold');
  });

  test('the provenance says which way it was said', () => {
    // A colour pair read as a palette is a weaker reading than the host using
    // the word, and the difference is recorded rather than flattened — the same
    // discipline as typeBasis and destinationBasis.
    expect(parse('retirement party, black and gold theme').themeBasis).toBe('stated');
    expect(parse('retirement party, black and gold').themeBasis).toBe('colors');
  });

  test('other pairings and separators', () => {
    const got = [
      'party, navy and blush',
      'party, black & gold',
      'party, burgundy/ivory',
      'party, red, white and blue',
    ].map((s) => parse(s).theme);
    expect(got).toEqual(['navy and blush', 'black & gold', 'burgundy/ivory', 'red, white and blue']);
  });

  test('NEGATIVE — a dress code is not a palette', () => {
    expect(parse('retirement party, black tie optional').theme).toBeFalsy();
  });

  test('NEGATIVE — one colour on its own is a word, not a decision', () => {
    expect(parse('party with a red velvet cake').theme).toBeFalsy();
    expect(parse('retirement party, gold').theme).toBeFalsy();
  });

  test('NEGATIVE — nothing colour-like leaves it null, as before', () => {
    expect(parse("Mom's 80th in Santa Fe, sit-down lunch").theme).toBeFalsy();
    expect(parse("Mom's 80th in Santa Fe, sit-down lunch").themeBasis).toBe(null);
  });

  test('and the colours stop being reported as dropped', () => {
    // They were listed under "Didn't make it into the plan" while being
    // exactly the kind of fact the theme field exists to hold.
    const { unusedClauses } = require('../smartParseEvent');
    expect(unusedClauses('retirement party, 40 guests in Bowie MD, black and gold', {}))
      .not.toContain('black and gold');
  });
});
