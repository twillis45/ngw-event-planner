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
