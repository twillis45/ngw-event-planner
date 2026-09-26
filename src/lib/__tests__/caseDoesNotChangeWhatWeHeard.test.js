// ─── THE SHIFT KEY WAS CHANGING WHAT THE APP UNDERSTOOD ─────────────────────
//
// Asked for after the lowercase-city fix on 2026-09-26: "look for other parser
// case sensitive issues." Swept every `[A-Z]`-requiring capture in
// smartParseEvent by parsing each sentence twice, once as a careful typist
// writes it and once as a host in a hurry does, and diffing the whole result.
// Six of twelve shapes disagreed:
//
//   "in Austin TX"          city + state        "in austin tx"    NOTHING
//   "trip to Nashville"     city                "…nashville"      no city
//   "flying to Denver"      destination         "…denver"         NOT a destination
//   "in Austin, TX"         city + state        "in austin, tx"   no state
//   "in Asheville, North Carolina"  city+state  lowercase         no state
//   "Aisha's 40th"          honoree             "aisha's 40th"    no honoree
//
// The "flying to" row is the costly one: isDestination flipped to FALSE, and a
// miss there silently deletes the whole travel stack — lodging, transport, the
// reveal's lodging stage — which smartParseEvent's own header calls the worse
// failure. Over a shift key.
//
// ── THE FIX IS ONE MECHANISM, NOT SIX PATCHES ──────────────────────────────
//
// Every one of these is the same `[A-Z]` standing in as a cheap proper-noun
// test. It cannot simply be deleted, because those captures ALSO feed the
// destination gate with their raw words, where the capital is the only thing
// between "in the backyard" and an invented trip. So the lowercase captures are
// WHITELIST-ONLY: they exist to be handed to resolveSpokenCity, which admits a
// name solely by membership in the curated usCities list and never invents a
// state. A word it does not know reaches nothing.
//
// The same sweep found the capitalised paths had a bug of their own — "flying
// to Denver Aug 3 2027" carried no city at all, because the capture took
// "Denver Aug" and the whitelist rightly does not know it. `resolveLoose`
// shortens the phrase from the right, longest first, so "las vegas" still beats
// "las"; all four captures now use it, so a trailing word cannot sink a town on
// one path and not another.
//
// ── WHAT IS DELIBERATELY STILL CASE-SENSITIVE ──────────────────────────────
//
// TWO-LETTER STATE ABBREVIATIONS. Thirteen of the fifty are ordinary lowercase
// English words — al co de hi id in la me ma ne ok or pa — so matching them
// case-insensitively turns "in the park or the hall" into Park, OR. That is
// asserted below rather than described, because it is the reason a fix that
// looks obviously right is wrong. A lowercase sentence recovers the CITY and
// leaves the state to the host, which is this file's standing rule regardless:
// never invent a state.
//
// RED-PROOFED by deleting the lowercase captures and the awayLowerM branch:
// every "same answer either way" case below went red and every negative
// control stayed green.
import { parseSmartEventText } from '../smartParseEvent';

const slim = (p) => ({ city: p.venueCity || null, dest: !!p.isDestination });

describe('case does not change the town we heard', () => {
  const PAIRS = [
    ['in <city>', 'birthday in Miami june 14 2027, 30 people', 'birthday in miami june 14 2027, 30 people'],
    ['in <two-word city>', 'birthday in Las Vegas june 14 2027, 30 people', 'birthday in las vegas june 14 2027, 30 people'],
    ['in <city> <ST>', 'birthday June 14 2027, 30 people, in Austin TX', 'birthday June 14 2027, 30 people, in austin tx'],
    ['trip to <city>', 'bachelorette weekend trip to Nashville, 12 people', 'bachelorette weekend trip to nashville, 12 people'],
    ['flying to <city>', 'reunion flying to Denver Aug 3 2027, 30 people', 'reunion flying to denver aug 3 2027, 30 people'],
  ];

  test('(premise) the careful spelling really does carry a town', () => {
    // Without this, "both spellings agree" could pass over two sentences that
    // both understood nothing — agreement on failure is not the property.
    for (const [name, upper] of PAIRS) {
      expect({ [name]: slim(parseSmartEventText(upper)).city }).not.toEqual({ [name]: null });
    }
  });

  test('the hurried spelling carries the same town and the same trip', () => {
    for (const [name, upper, lower] of PAIRS) {
      expect({ [name]: slim(parseSmartEventText(lower)) })
        .toEqual({ [name]: slim(parseSmartEventText(upper)) });
    }
  });

  test('a trailing word does not sink the town on ANY of the four captures', () => {
    // The capitalised bug the sweep turned up. Each of these puts a word the
    // whitelist cannot use directly after the town.
    expect(parseSmartEventText('reunion flying to Denver Aug 3 2027, 30 people').venueCity).toBe('Denver');
    expect(parseSmartEventText('reunion in Asheville Aug 3 2027, 30 people').venueCity).toBe('Asheville');
    // …and the longest phrase still wins over its own first word.
    expect(parseSmartEventText('birthday in Las Vegas june 14 2027, 30 people').venueCity).toBe('Las Vegas');
  });
});

describe('NEGATIVE CONTROLS: the loosening invented nothing', () => {
  test('ordinary lowercase nouns after "in" are not places', () => {
    // The job the capital letter was really doing. If any of these resolves,
    // the whitelist gate has been bypassed and the app is inventing trips.
    for (const s of ['cookout in the backyard for 20 people',
      'birthday in my house june 14 2027, 30 people',
      'birthday in the church hall june 14 2027, 30 people',
      'party in the park june 14 2027, 30 people',
      'dinner going to the store for 10 people']) {
      expect({ [s]: slim(parseSmartEventText(s)) }).toEqual({ [s]: { city: null, dest: false } });
    }
  });

  test('THE COLLISION THAT KEEPS STATE ABBREVIATIONS CAPITALISED', () => {
    // "or" is Oregon. Thirteen of the fifty abbreviations are English words, so
    // this sentence is what a case-insensitive abbreviation match would turn
    // into an event in Park, Oregon. This is the assertion that makes the
    // exception a measured decision instead of an unfinished job.
    const p = parseSmartEventText('party in the park or the hall for 30 people');
    expect({ city: p.venueCity, state: p.venueState }).toEqual({ city: null, state: null });
  });

  test('a lowercase state resolves too — owner ruling 2026-09-26', () => {
    // This test first asserted the opposite: city back, state left to the host.
    // The owner ruled that hosts type "austin tx" and the state has to come
    // with it, so the discrimination moved off the STATE and onto the CITY.
    // Two tiers, both going through the unchanged parseVenueLocation gate:
    // a whitelist-known town vouches for any abbreviation anywhere, and an
    // unknown town needs the sentence to delimit it AND the abbreviation to
    // not be an English word.
    for (const [lower, upper] of [
      ['birthday June 14 2027, 30 people, in austin tx', 'birthday June 14 2027, 30 people, in Austin TX'],
      ['cookout in silver spring md, 30 people', 'cookout in Silver Spring MD, 30 people'],
      ['party in portland or, 30 people', 'party in Portland OR, 30 people'],
    ]) {
      const a = parseSmartEventText(lower); const b = parseSmartEventText(upper);
      expect({ [lower]: { city: a.venueCity, state: a.venueState } })
        .toEqual({ [lower]: { city: b.venueCity, state: b.venueState } });
      expect(a.venueState).toBeTruthy();   // premise: the pair really carries a state
    }
  });

  test('a town the whitelist does not know still needs the sentence to delimit it', () => {
    // Tier B, and the line that keeps the old rejection's failure from coming
    // back. "in greenbelt md" says where the town starts; "abt 45 ppl greenbelt
    // md" does not, and a town is not guessed at from undelimited words.
    expect(parseSmartEventText('reunion in greenbelt md aug 3 2027, 30 people').venueCity).toBe('Greenbelt');
    expect(parseSmartEventText('reunion abt 45 ppl greenbelt md aug 3 2027').venueCity).toBeNull();
    // A multi-word town survives, which a "just take the last word" rule could
    // not — that rule reads "silver spring md" as Spring, MD.
    expect(parseSmartEventText('cookout in silver spring md, 30 people').venueCity).toBe('Silver Spring');
  });
});

describe('KNOWN GAPS the sweep found and did not close', () => {
  test('a lowercase full state name resolves — closed in the same pass', () => {
    // Measured while building the two tiers: parseVenueLocation already read
    // "asheville, north carolina" perfectly and only the capitalised capture
    // could reach it. A spelled-out state after a comma is not ambiguous the
    // way a two-letter code is, so it needs no word-collision guard.
    expect(parseSmartEventText('reunion in asheville, north carolina, 30 people').venueState).toBe('NC');
    expect(parseSmartEventText('reunion in Asheville, North Carolina, 30 people').venueState).toBe('NC');
  });

  test('a lowercase possessive still loses the honoree', () => {
    // "Aisha's 40th birthday" names her; "aisha's 40th birthday" does not.
    // Unfixable the same way as the others: there is no whitelist of first
    // names to gate on, and lowercasing the capture would admit "tomorrow's"
    // and "the park's" as people. Related to KNOWN GAP 1 in
    // theParserSentencesItStillMisses.test.js, which is about relationship
    // words ("mom's") failing in BOTH cases — a vocabulary gap, not this one.
    expect(parseSmartEventText("Aisha's 40th birthday, 30 people").honoree).toBe('Aisha');
    expect(parseSmartEventText("aisha's 40th birthday, 30 people").honoree).toBeNull();
  });
});
