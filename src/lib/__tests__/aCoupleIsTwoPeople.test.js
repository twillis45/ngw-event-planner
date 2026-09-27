// ─── ONE PARENT'S 50TH, ANNOUNCED WITHOUT THE OTHER ───────────────────────
//
// "Mom and Dad's 50th anniversary" returned the honoree "Dad".
//
// That is not a miss. It is a WRONG ANSWER, and the honoree reaches the
// event name and the invite — so the app would have put one parent's name
// on a card for both of them. For a 50th anniversary a couple is not an
// edge case; it is the ordinary case.
//
// MEASURED 2026-09-27, every couple form did it:
//
//   Mom and Dad's 50th anniversary  -> Dad
//   Grandma and Grandpa's 60th      -> Grandpa
//   Denise and Robert's 50th        -> Robert
//   Mom & Dad's 50th                -> Dad
//
// WHY. The capitalised-possessive branch takes one or two CONSECUTIVE
// capitalised words. "Mom and Dad" is not consecutive — the lower-case
// "and" breaks the run — so the match restarted at the second name and
// found a perfectly good, perfectly wrong honoree.
import { parseSmartEventText } from '../smartParseEvent';

const NOW = new Date('2026-09-18T12:00:00Z');
const who = (s) => (parseSmartEventText(s, { now: NOW }) || {}).honoree || null;

describe('both halves of the couple', () => {
  test('THE BUG: relations', () => {
    expect(who("Mom and Dad's 50th anniversary")).toBe('Mom and Dad');
    expect(who("Grandma and Grandpa's 60th")).toBe('Grandma and Grandpa');
    expect(who("my mom and dad's 50th")).toBe('Mom and Dad');
    // Lower case too — the same gap this file closed for the singular form
    // on 2026-09-23, since a host typing fast does not capitalise.
    expect(who("mom and dad's 50th")).toBe('Mom and Dad');
  });

  test('THE BUG: names', () => {
    expect(who("Denise and Robert's 50th")).toBe('Denise and Robert');
  });

  test('an ampersand is read and then written as a word', () => {
    // "Mom & Dad's" is how a host types it; "Mom and Dad" is how an invite
    // should read it.
    expect(who("Mom & Dad's 50th")).toBe('Mom and Dad');
    expect(who("Denise & Robert's 50th")).toBe('Denise and Robert');
  });
});

describe('the singular cases are untouched', () => {
  test('one person is still one person', () => {
    expect(who("Mom's 80th")).toBe('Mom');
    expect(who("mom's 80th")).toBe('Mom');
    expect(who("Denise's 80th")).toBe('Denise');
    expect(who('80th birthday for my grandmother')).toBe('Grandmother');
  });
});

describe('NEGATIVE CONTROLS: the guards that were already here', () => {
  test('a lower-case pair of NAMES still resolves to nothing', () => {
    // There is no whitelist of first names and guessing one would invent a
    // person. The relation branch is case-insensitive because its
    // vocabulary is closed; the name branch is not, and must stay that way
    // — a single /i regex for both would make [A-Z] match lower case and
    // collapse the distinction this file rests on.
    expect(who("denise and robert's 50th")).toBeNull();
  });

  test('NOT_WHO still holds against a pair', () => {
    // A possessive followed by a place noun names WHERE, and one followed
    // by "Day" names a holiday. Neither names who — and the couple branch
    // must not be the hole that lets them back in.
    expect(who("party at Mom and Dad's house")).toBeNull();
    expect(who("BBQ at Grandma and Grandpa's place")).toBeNull();
    expect(who("Mother's Day brunch")).toBeNull();
  });

  test('and a place is still a place — which is how the SECOND bug surfaced', () => {
    // This control was written to check the couple branch had not stolen
    // the venue. It failed, and not because of the couple branch: "at Mom
    // and Dad's house" had never been a home, for exactly the same reason
    // "Mom and Dad's 50th" had named only Dad. The relation slot at the
    // home seam took one person too.
    //
    // Fixed in the same commit, through a shared REL_PAIR, so the two
    // seams cannot drift apart again the way the two relation lists did.
    for (const s of ["BBQ at Mom and Dad's house", "BBQ at mom and dad's house",
      "BBQ at Grandma and Grandpa's place", "BBQ at my parents' house"]) {
      const r = parseSmartEventText(s, { now: NOW }) || {};
      expect({ [s]: r.venueKind }).toEqual({ [s]: 'home' });
      // …and the place still does not become a person.
      expect({ [s]: r.honoree || null }).toEqual({ [s]: null });
    }
  });
});
