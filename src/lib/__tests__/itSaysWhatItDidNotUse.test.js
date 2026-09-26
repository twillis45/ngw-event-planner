// ─── THE APP ATE THREE FACTS AND SAID NOTHING ───────────────────────────────
//
// Found driving an 80th birthday from the cold open, 2026-09-23. The host typed:
//
//   "Mom's 80th birthday party on June 14 2027, about 45 people, at the church
//    hall in Baltimore, sit-down lunch, she uses a walker"
//
// The plan never mentioned the walker, the sit-down lunch, or the church hall's
// kind. Not misparsed — dropped in silence, across all 21 captured screens. For
// an 80th birthday, mobility is the constraint that decides venue access,
// seating and where the cake table goes.
//
// ── WHY THIS IS NOT A WALKER PARSER ─────────────────────────────────────────
//
// Adding one extractor leaves the NEXT dropped fact just as silent. The app
// instead says what it did not use, and hands it back — the same doctrine as
// every other refusal in this codebase: disclose rather than invent or hide.
//
// ── AND WHY THE MEASUREMENT IS THE PARSER ITSELF ────────────────────────────
//
// A keyword list for "things we can't parse" would fall behind the parser the
// first time someone taught it a new field, and would then tell a host their
// headcount was missed when it was read. That is worse than the bug. So the
// decision is made by re-parsing WITHOUT each clause: identical output across
// all 25 fields means the clause provably contributed nothing.
import { unusedClauses, parseSmartEventText } from '../smartParseEvent';

const SENTENCE = "Mom's 80th birthday party on June 14 2027, about 45 people, "
  + 'at the church hall in Baltimore, sit-down lunch, she uses a walker';

describe('(premise) the drop is real and this is the sentence that found it', () => {
  test('the parser reads the date, the count and the city — and nothing else', () => {
    // Without this, "it reports two unused clauses" could be passing over a
    // parser that understood nothing at all.
    const p = parseSmartEventText(SENTENCE);
    expect(p.type).toBe('Birthday');
    expect(p.guests).toBe(45);
    expect(p.venueCity).toMatch(/Baltimore/i);
  });

  test('and nothing in its 25 fields carries the walker', () => {
    const p = parseSmartEventText(SENTENCE);
    expect(JSON.stringify(p)).not.toMatch(/walker|mobility/i);
  });
});

describe('it names exactly what it did not use', () => {
  test('the two genuinely dropped clauses, and only those', () => {
    expect(unusedClauses(SENTENCE)).toEqual(['sit-down lunch', 'she uses a walker']);
  });

  test('IT NEVER CLAIMS TO HAVE MISSED SOMETHING IT READ', () => {
    // The failure mode that would be worse than the original bug. The headcount,
    // the date and the city all reached the plan; saying otherwise would destroy
    // the trust this disclosure exists to protect.
    const out = unusedClauses(SENTENCE).join(' | ');
    expect(out).not.toMatch(/45|people/i);
    expect(out).not.toMatch(/June|2027/i);
    expect(out).not.toMatch(/Baltimore/i);
  });
});

describe('it stays silent whenever it has nothing to hand back', () => {
  test('a sentence the parser fully consumes reports nothing', () => {
    expect(unusedClauses('Birthday party on June 14 2027, 45 people, in Baltimore MD')).toEqual([]);
  });

  test('a single clause has nothing to compare against', () => {
    // One clause with no separators: removing it leaves nothing, so "unused" is
    // not a question that can be asked.
    expect(unusedClauses('a birthday party in Baltimore')).toEqual([]);
  });

  test('and it refuses empty, short and broken input rather than guessing', () => {
    expect(unusedClauses('')).toEqual([]);
    expect(unusedClauses(null)).toEqual([]);
    expect(unusedClauses('hi')).toEqual([]);
    expect(unusedClauses(undefined)).toEqual([]);
  });
});

describe('it generalises past the sentence that found it', () => {
  test('a different unparsed constraint is reported the same way', () => {
    // The point of not writing a walker parser: the mechanism does not know
    // what a walker is, so the next unhandled fact is disclosed too.
    const out = unusedClauses('Retirement party on May 2 2027, 30 people, in Austin TX, '
      + 'he is allergic to shellfish');
    expect(out).toContain('he is allergic to shellfish');
  });

  test('…and a clause the parser DOES understand never appears', () => {
    const out = unusedClauses('Wedding on May 2 2027, 120 people, in Austin TX, adults only');
    // kidsPolicy is a real parsed field, so this clause contributes.
    expect(out).not.toContain('adults only');
  });
});

// ─── AND IT CANNOT GO BACK TO NEEDING THE HOST'S COMMAS ─────────────────────
//
// The disclosure above shipped 2026-09-23 and went SILENT two days later on a
// sentence a host actually typed:
//
//   "50th birthday nov 2027 8 couples 5 nights Disneyland 2 excursions airbnb
//    accomodations"
//
// It returned [] — a clean bill of health — because clauses were split on
// commas, "and" and semicolons, and that sentence has none. One clause meant
// "nothing to compare against", so the function bailed. Add commas to the
// IDENTICAL words and it answered correctly. The self-knowledge was intact and
// gated on punctuation the host never typed, which is the worst version of this
// bug: the mechanism built to stop silent drops was itself silently dropping.
//
// A review board raised this sentence on 2026-09-26 as an unconsumed clause —
// "the parser hears '2 excursions' and hands it to nothing." That reading is
// wrong, and measuring it is how the board's own doctrine says to find out:
// `unusedClauses` IS the consumer, HostShellV2 renders it under "Didn't make it
// into the plan", and the host is told the plan won't know about it. What was
// actually missing was a test on THIS sentence — the per-word fallback was
// built, shipped and never pinned, so the fix could regress in silence exactly
// the way the bug did.
//
// SO THIS PINS PUNCTUATION-INDEPENDENCE, not excursions. Three spellings of one
// sentence must produce the same answer; a splitter that needs commas fails the
// first and passes the others, which is precisely the shape of the regression.
//
// RED-PROOFED by restoring the pre-fix behaviour — returning [] whenever the
// comma split yields fewer than two clauses. The no-punctuation case went red
// and the comma'd cases stayed green, which is the bug reproducing on demand.
describe('the disclosure does not depend on how the host punctuated', () => {
  const WORDS = '50th birthday nov 2027 8 couples 5 nights Disneyland 2 excursions airbnb accomodations';
  const SHAPES = {
    'no punctuation at all, as the host typed it': WORDS,
    'commas between every fact': '50th birthday, nov 2027, 8 couples, 5 nights, '
      + 'Disneyland, 2 excursions, airbnb accomodations',
    'commas and an "and"': '50th birthday nov 2027, 8 couples, 5 nights Disneyland, '
      + '2 excursions and airbnb accomodations',
  };

  test('(premise) the parser reads almost all of this sentence', () => {
    // Without this, "it reports one unused clause" could be passing over a
    // sentence the parser failed outright — a different bug with the same
    // result. Measured: eight fields land, including a landmark resolved to a
    // city and "8 couples" doubled to a headcount.
    const p = parseSmartEventText(WORDS);
    expect(p.guests).toBe(16);
    expect(p.nights).toBe(5);
    expect(p.venueCity).toBe('Anaheim');
    expect(p.lodgingKind).toBe('rental');
    expect(p.isDestination).toBe(true);
  });

  test('every punctuation shape hands back the same one clause', () => {
    for (const [name, text] of Object.entries(SHAPES)) {
      expect({ [name]: unusedClauses(text) }).toEqual({ [name]: ['2 excursions'] });
    }
  });

  test('NEGATIVE CONTROL: it never claims to have missed what it read', () => {
    // The couples, the nights, the landmark and the lodging kind all reached
    // the plan. Naming any of them here would be the trust-destroying failure
    // this whole mechanism exists to avoid — and "accomodations" sits beside
    // "airbnb", which WAS read, so a naive per-word test would report it.
    for (const text of Object.values(SHAPES)) {
      const out = unusedClauses(text).join(' | ');
      expect(out).not.toMatch(/couple|night|Disneyland|airbnb|accomodation/i);
    }
  });
});

// ─── AND IT DOES NOT TELL A HOST IT LOST THE YEAR IT USED ───────────────────
//
// MEASURED 2026-09-26 while pinning the punctuation fix above, and it is the
// failure this whole file calls worse than the original bug. Every ordinary US
// date format puts a comma before the year, which made the year its own clause;
// removing it changed nothing, because "June 14" already resolves to the next
// June 14 and that IS 2027. So the clause passed the unused test while the
// plan's date was 2027-06-14, and the host was told the plan would not know
// about a year it was actively using.
//
// `alreadyInThePlan` in unusedClauses now asks the other question — is this
// clause ABSENT from the parse — because only that one licenses the sentence
// "the plan won't know about it".
//
// WHAT THE PREMISE TEST CAUGHT, worth keeping. This block first listed four
// dated sentences and asserted all four stopped reporting the year. Two of them
// do not resolve a year AT ALL: "birthday party November, 2027" returns
// date null AND monthYear null — the comma between a bare month and its year
// breaks the date parse outright. For those, "2027" really did not make it into
// the plan, and reporting it is the mechanism working. Had the premise test not
// been there, the guard could have been widened until it silenced them too, and
// the bug it was built to fix would have been re-created in the fix.
//
// (That the comma'd bare month-year parses to nothing is a separate parser gap.
// It is left alone here and stays HONEST rather than silent, which is the whole
// doctrine — but it is a gap, and the split below is where somebody will find
// it.)
//
// RED-PROOFED by deleting the `alreadyInThePlan` guard from unusedClauses: both
// sentences in the first test below reported ["2027"] again, "2 excursions" was
// unaffected, and the two no-date sentences did not move — the bug reproducing
// on demand and nothing else moving with it.
describe('a fact the plan is holding is never reported as dropped', () => {
  // The year IS read in these two — a comma before the year is the ordinary way
  // to write a full US date.
  const YEAR_READ = [
    'birthday party on June 14, 2027, 30 people, in Austin TX',
    'wedding May 2, 2027, 120 people, Austin TX',
  ];
  // The year is NOT read in these two — the comma after a bare month breaks the
  // date parse, so the host genuinely lost it.
  const YEAR_LOST = [
    'birthday party November, 2027, 30 people, in Austin TX',
    'birthday party nov, 2027, 30 people, in Austin TX',
  ];

  test('(premise) the two groups really do differ in whether the year landed', () => {
    // This is the assertion that stopped the guard from being widened into the
    // original bug. Without it, "the year is not reported" would pass over a
    // parser that never read the year.
    for (const s of YEAR_READ) expect(parseSmartEventText(s).date).toMatch(/^2027-/);
    for (const s of YEAR_LOST) {
      const p = parseSmartEventText(s);
      expect({ date: p.date, monthYear: p.monthYear }).toEqual({ date: null, monthYear: null });
    }
  });

  test('a year the plan is using is NOT handed back as dropped', () => {
    for (const s of YEAR_READ) expect({ [s]: unusedClauses(s) }).toEqual({ [s]: [] });
  });

  test('…and a year the plan really lost still IS handed back', () => {
    // The other half of the guard. Silencing these would re-create the exact
    // bug this file exists to close, in the fix for its false alarm.
    for (const s of YEAR_LOST) expect({ [s]: unusedClauses(s) }).toEqual({ [s]: ['2027'] });
  });

  test('NEGATIVE CONTROL: the guard silences redundancy, not genuine misses', () => {
    // The guard can only remove reports, so the risk it carries is over-
    // silencing. A clause whose words are absent from the parse must survive it
    // — including one sitting in the same sentence as a comma'd year.
    expect(unusedClauses('birthday party on June 14, 2027, 30 people, in Austin TX, '
      + 'she uses a walker')).toEqual(['she uses a walker']);
    expect(unusedClauses('50th birthday nov 2027 8 couples 5 nights Disneyland '
      + '2 excursions airbnb accomodations')).toEqual(['2 excursions']);
  });
});
