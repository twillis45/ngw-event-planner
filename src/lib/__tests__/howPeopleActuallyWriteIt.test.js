// ─── THE PARSER AGAINST HOW PEOPLE ACTUALLY WRITE ───────────────────────────
//
// Built 2026-09-23 by measuring a corpus of real phrasings rather than the
// tidy sentences a regex expects. Every case below FAILED before the work in
// this commit, and each one is a way people genuinely write — not invented
// variety to pad a suite.
//
// The corpus is grouped by what broke, because the groups have different
// severities and the worst one is not the longest.
import { parseSmartEventText } from '../smartParseEvent';

const P = (s) => parseSmartEventText(s);

// ─────────────────────────────────────────────────────────────────────────────
describe('MONEY — the only case that returned a WRONG number', () => {
  test('"budget 1.5k" was $1, and a wrong figure is worse than a missing one', () => {
    // The capture had no decimal point, so it took the "1" and then the (k)?
    // could not match past the ".". A host who said fifteen hundred dollars was
    // recorded as having one dollar, and every downstream sizing read that.
    expect(P('cookout june 14 2027, 30 people, budget 1.5k').budget).toBe(1500);
    expect(P('cookout, 30 people, $2.5k').budget).toBe(2500);
  });

  test('the ways people say thousands', () => {
    expect(P('cookout, 30 people, spend about 2k').budget).toBe(2000);
    expect(P('cookout, 30 people, under 3 grand').budget).toBe(3000);
    expect(P('cookout, 30 people, up to $4000').budget).toBe(4000);
    expect(P('cookout, 30 people, no more than 6k').budget).toBe(6000);
  });

  test('A HEADCOUNT IS NEVER READ AS MONEY', () => {
    // The verb forms ("spend about", "under", "around") require a money marker
    // — $, k or grand — precisely so "about 45 people" cannot become a budget
    // of 45. Without that guard this feature would invent money on every plan.
    expect(P('cookout june 14 2027, about 45 people').budget).toBe(null);
    expect(P('cookout, around 20 people').budget).toBe(null);
    expect(P('cookout, up to 30 people').budget).toBe(null);
  });

  test('and "grand" is admitted where a bare "g" is not', () => {
    // "5G" is a phone network at least as often as five thousand dollars, and
    // this whole block exists because of a wrong number.
    expect(P('cookout, 30 people, 3 grand').budget).toBe(3000);
    expect(P('cookout, 30 people, 5G service').budget).toBe(null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('TYPES — two playbooks nobody could ask for by name', () => {
  test('Card Party and Day Party both used to come back Birthday', () => {
    // Real playbooks in the corpus, unreachable from free text. A host typing
    // the name of the thing they are planning got a birthday plan.
    expect(P('card party june 14 2027, 12 people, Baltimore MD').type).toBe('Card Party');
    expect(P('day party june 14 2027, 60 people, Baltimore MD').type).toBe('Day Party');
  });

  test('…and their own vocabulary reaches them too', () => {
    // Not invented slang: Card Party's playbook header defines it around Spades
    // and Bid Whist; Day Party's calls it the "grown folks" afternoon social.
    expect(P('spades night june 14 2027, 12 people').type).toBe('Card Party');
    expect(P('bid whist at my place june 14 2027, 8 people').type).toBe('Card Party');
    expect(P('grown folks party june 14 2027, 40 people').type).toBe('Day Party');
    expect(P('grown and sexy june 14 2027, 40 people').type).toBe('Day Party');
  });

  test('"day party" does not collide with Sunday, which this file already feared', () => {
    // \bday only matches the standalone word — "Sunday" has no boundary before
    // its "day". The taxonomy documents an earlier bug where it did collide.
    expect(P('big game this sunday, 5 people').type).toBe('Watch Party');
    expect(P('sunday dinner june 14 2027, 8 people').type).toBe('Dinner Party');
  });

  test('the words that say an event without saying which kind', () => {
    // "the function", "pull up" and "linkup" returned NO TYPE at all, so a host
    // who wrote the way people text got an empty plan instead of a correctable
    // one. They resolve through the generic fallback — and SAY they did.
    for (const s of ['the function is june 14 2027, 40 folks',
      'pull up june 14 2027, 50 people', 'family linkup july 4 2027, 25 people']) {
      expect(P(s).type).toBeTruthy();
      expect(P(s).typeBasis).toBe('generic');
    }
  });

  test('GET-TOGETHER IS A REAL TYPE AND IS NEVER HEDGED', () => {
    // It reads generic and is not. Listing it among the generic words made the
    // parser hedge a type the host named exactly — the same false hedge the
    // mechanism exists to prevent, committed by the mechanism.
    expect(P('get together june 14 2027, 20 people').type).toBe('Get-Together');
    expect(P('get together june 14 2027, 20 people').typeBasis).toBe('named');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('COUNTS — the number was said out loud and dropped', () => {
  test('an approximation marker does not erase the number', () => {
    // Both returned nothing, so the plan sized itself to the playbook typical
    // instead of to the count the host gave.
    expect(P('cookout june 14 2027, 20ish people').guests).toBe(20);
    expect(P('cookout june 14 2027, 20 or so').guests).toBe(20);
  });

  test('dozens are exact counts, not vagueness', () => {
    expect(P('dinner june 14 2027 for a dozen').guests).toBe(12);
    expect(P('dinner june 14 2027 for half a dozen').guests).toBe(6);
    expect(P('cookout june 14 2027 for a couple dozen').guests).toBe(24);
    expect(P('cookout june 14 2027 for two dozen').guests).toBe(24);
  });

  test('A DIGIT ALWAYS WINS OVER A DOZEN OF SOMETHING ELSE', () => {
    // The dozen branch is consulted only when no digit form matched, so
    // "a dozen chairs" can never become the guest count.
    expect(P('cookout june 14 2027, 20 people and a dozen chairs').guests).toBe(20);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DATES — the day-before-month form', () => {
  test('"the 14th of June" returned no date at all', () => {
    // An ordinary English way to write a date, and the dominant way in most of
    // the world. The month-first matcher cannot see it.
    expect(P('cookout on the 14th of june 2027, 30 people').date).toBe('2027-06-14');
    expect(P('cookout the 4th of july 2027, 30 people').date).toBe('2027-07-04');
    expect(P('cookout 14 of june 2027, 30 people').date).toBe('2027-06-14');
  });

  test('NEGATIVE CONTROL: the forms that already worked are untouched', () => {
    // The day-first matcher runs BEFORE the month-first one, so this is where a
    // regression would show up first.
    expect(P('cookout june 14 2027, 30 people').date).toBe('2027-06-14');
    expect(P('cookout 6/14/2027, 30 people').date).toBe('2027-06-14');
    expect(P('cookout june 14 2027, 20 people').guests).toBe(20);
  });

  test('and a headcount sitting near a month is not read as a day', () => {
    expect(P('cookout, 20 people').date).toBe(null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('the whole sentence, the way it would really arrive', () => {
  test('a text-message plan parses end to end', () => {
    const p = P('day party the 14th of june 2027, 20ish people, Baltimore MD, spend about 2k');
    expect(p.type).toBe('Day Party');
    expect(p.typeBasis).toBe('named');
    expect(p.date).toBe('2027-06-14');
    expect(p.guests).toBe(20);
    expect(p.budget).toBe(2000);
    expect(p.venueCity).toMatch(/baltimore/i);
    expect(p.venueState).toBe('MD');
  });

  test('TWO LIMITS, RECORDED RATHER THAN PAPERED OVER', () => {
    // 1. A spelled-out state needs a locative preposition, because without one
    //    "Virginia Washington" is a person as easily as a place.
    expect(P('cookout june 14 2027, 20 people, in baltimore maryland').venueCity).toMatch(/baltimore/i);
    expect(P('cookout june 14 2027, 20 people, baltimore maryland').venueCity).toBe(null);

    // 2. An all-lower-case city+abbreviation is NOT read, and the fix for it was
    //    written, measured and thrown away. Relaxing the case requirement turned
    //    "food is on me" into the town of "food is on", Maine — a dozen state
    //    codes are ordinary words (ok, hi, me, in, or, la, pa, id, oh, de, co).
    //    A wrong town moves weather, market, venue and the travel lane. The host
    //    is asked instead of guessed at.
    expect(P('cookout june 14 2027, 20 people, baltimore md').venueCity).toBe(null);
    expect(P('cookout june 14 2027, 20 people, Baltimore MD').venueCity).toMatch(/Baltimore/);
    expect(P('cookout june 14, 20 people, food is on me').venueCity).toBe(null);
  });
});
