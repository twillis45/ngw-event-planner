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

// ─── THE SYSTEMATIC PASS ────────────────────────────────────────────────────
//
// The block above came from phrasings I thought to try. This one came from
// sweeping EVERY field the parser returns against a corpus of real phrasings —
// 54 of them, of which 25 read on the first run. Everything below was in the
// other 29.
import { resolveHoliday } from '../holidayDates.mjs';

describe('HOLIDAYS — computed, not guessed', () => {
  const N = new Date('2026-09-23T12:00:00Z');

  test('every one of them, against the published 2027 calendar', () => {
    // Fixed dates and published rules ("the fourth Thursday in November"), so
    // this is arithmetic. Checked against the real calendar rather than against
    // what the code happens to produce — which is how the first version was
    // caught shifting four holidays to the wrong day.
    const cal = {
      'thanksgiving 2027': '2027-11-25', 'christmas 2027': '2027-12-25',
      'christmas eve 2027': '2027-12-24', 'new years eve 2027': '2027-12-31',
      'juneteenth 2027': '2027-06-19', '4th of july 2027': '2027-07-04',
      'memorial day 2027': '2027-05-31', 'labor day 2027': '2027-09-06',
      'mothers day 2027': '2027-05-09', 'fathers day 2027': '2027-06-20',
      'halloween 2027': '2027-10-31', 'easter 2027': '2027-03-28',
      'mlk day 2027': '2027-01-18', 'presidents day 2027': '2027-02-15',
    };
    for (const [text, want] of Object.entries(cal)) {
      expect(`${text} -> ${resolveHoliday(text, N).date}`).toBe(`${text} -> ${want}`);
    }
  });

  test('"X weekend" resolves to the Saturday, which is a stated choice', () => {
    // A three-day span, and holiday-weekend events land on Saturday far more
    // often than on the Monday. The host sees the date before anything is built
    // on it; returning nothing was the worse answer.
    expect(resolveHoliday('labor day weekend 2027', N).date).toBe('2027-09-04');
    expect(resolveHoliday('memorial day weekend 2027', N).date).toBe('2027-05-29');
  });

  test('THE ALTERNATION BUG THAT SHIFTED FOUR HOLIDAYS', () => {
    // `a|b` + '\\s*weekend' binds the suffix to `b` alone, so a BARE
    // "thanksgiving" tested true for "weekend" and was silently moved back to
    // the preceding Saturday. Thanksgiving, Christmas Eve, New Year's Eve and
    // MLK Day were all wrong, and all four looked plausible.
    expect(resolveHoliday('thanksgiving 2027', N).weekend).toBe(false);
    expect(resolveHoliday('christmas eve 2027', N).weekend).toBe(false);
    expect(resolveHoliday('mlk day 2027', N).weekend).toBe(false);
  });

  test('an explicit date in the same sentence always wins', () => {
    // A holiday NAME is a weaker signal than a date the host wrote out. The
    // holiday pass runs after every explicit form for exactly this reason.
    expect(P('cookout june 14 2027 the weekend after juneteenth, 30 people').date)
      .toBe('2027-06-14');
  });

  test('and they reach the parser, not just the module', () => {
    expect(P('thanksgiving dinner 2027, 20 people').date).toBe('2027-11-25');
    expect(P('juneteenth cookout 2027, 50 people').date).toBe('2027-06-19');
    expect(P('christmas eve dinner 2027, 12 people').date).toBe('2027-12-24');
  });
});

describe('THE FIELDS THE SWEEP FOUND EMPTY', () => {
  test('"at my house" was not in the home list at all', () => {
    // venueKind drives the whole home-versus-booked-venue lane, and the
    // commonest phrasing of all was missing while "my place" and "our house"
    // were both present.
    expect(P('birthday party at my house, 30 people').venueKind).toBe('home');
    expect(P('cookout at moms house, 30 people').venueKind).toBe('home');
    expect(P("cookout at my sister's place, 30 people").venueKind).toBe('home');
  });

  test('THE ROOMS PEOPLE RENT — the 80th drive typed one and lost it', () => {
    // "at the church hall in Baltimore" kept the city and dropped the hall.
    const a = P('birthday party at the church hall, 30 people');
    expect(a.venue).toMatch(/church hall/i);
    expect(a.venueKind).toBe('venue');          // booked, not home
    expect(P('cookout at the vfw, 30 people').venueKind).toBe('venue');
    expect(P('reception at the banquet hall, 30 people').venue).toMatch(/banquet hall/i);
  });

  test('NEGATIVE CONTROL: a home is still a home', () => {
    // The venue additions must not flip a backyard into a booked venue.
    expect(P('cookout in the backyard, 30 people').venueKind).toBe('home');
    expect(P('cookout at the club, 30 people').venueKind).toBe('');
  });

  test('"noon" is a clock — a recorded call, reversed in the open', () => {
    // The golden corpus pinned startTime null for "at noon" under the reasoning
    // that noon is a bucket word. Noon is definitionally 12:00 PM and needs no
    // reading to resolve, which is this parser's own test for `said-exact`.
    expect(P('birthday party at noon, 30 people').startTime).toBe('12:00 PM');
    expect(P('dinner at midnight, 10 people').startTime).toBe('12:00 AM');
    expect(P('dinner at half past six pm, 10 people').startTime).toBe('6:30 PM');
  });

  test('HALF PAST READS EXACTLY AS THE DIGIT FORM DOES — basis and all', () => {
    // A CORRECTION. The first version required a meridiem and I defended that
    // as principled. It was not: "dinner at 6:30" already resolves to 6:30 PM
    // through the shared grading, because the word "dinner" supplies the
    // bucket. Refusing the words while reading the digits was inconsistent, so
    // it feeds the same grading now instead of returning its own verdict.
    for (const [digits, words] of [
      ['dinner at 6:30, 10 people', 'dinner at half past six, 10 people'],
      ['dinner at 6:30 pm, 10 people', 'dinner at half past six pm, 10 people'],
      ['brunch at 10:30, 10 people', 'brunch at half past ten, 10 people'],
      ['cookout at 2:30, 10 people', 'cookout at half past two, 10 people'],
    ]) {
      const a = P(digits); const b = P(words);
      expect(`${b.startTime}/${b.startTimeBasis}`).toBe(`${a.startTime}/${a.startTimeBasis}`);
    }
    // …and the three grades are genuinely exercised above, or this proves nothing.
    expect(P('dinner at half past six, 10 people').startTimeBasis).toBe('said-with-bucket');
    expect(P('dinner at half past six pm, 10 people').startTimeBasis).toBe('said-exact');
    expect(P('cookout at half past two, 10 people').startTimeBasis).toBe('said-hour-only');
  });

  test('the honoree is usually a relationship, not a name', () => {
    // Only a capitalised name resolved, so most milestone birthdays — thrown
    // for exactly these people, written exactly this way — carried no honoree.
    expect(P('birthday party for mom, 30 people').honoree).toBe('Mom');
    expect(P('birthday for my grandmother, 30 people').honoree).toBe('Grandmother');
    expect(P('birthday party for Vida, 30 people').honoree).toBe('Vida');
  });

  test('a milestone said as a verb', () => {
    expect(P('moms turning 80, 30 people').milestone).toBe('80th');
    expect(P('she turns 41 in june, 30 people').milestone).toBe('41st');
    expect(P('he turns 13 next year, 20 people').milestone).toBe('13th');   // not 13rd
  });

  test('a season with the year said outright', () => {
    // Naming the year is MORE specific than "next summer" and returned less.
    expect(P('birthday party summer 2027, 30 people').monthYear.label).toBe('Summer 2027');
    expect(P('reunion fall 2028, 60 people').monthYear.label).toBe('Fall 2028');
  });

  test('kids policy, the way it is actually announced', () => {
    expect(P('day party 21 and up, 40 people').kidsPolicy).toBe('adults_only');
    expect(P('cookout kid friendly, 30 people').kidsPolicy).toBe('kids_welcome');
    expect(P('cookout bring the kids, 30 people').kidsPolicy).toBe('kids_welcome');
    expect(P('cookout june 14 2027, 30 people').kidsPolicy).toBe(null);
  });
});
