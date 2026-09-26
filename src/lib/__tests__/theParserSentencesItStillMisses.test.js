// ─── WHAT THE PARSER STILL MISSES, PINNED SO IT CANNOT DRIFT ────────────────
//
// THIS FILE REPLACES `zzverify.test.js`, which was a committed DEBUGGING PROBE:
// eleven `console.log` lines and one `expect(true).toBe(true)`. It ran in CI on
// every build, printed real parser output to the log, and asserted nothing.
//
// Two things were wrong with that and only one of them was the assertion.
//
// 1. IT WAS A DIAGNOSIS SOMEBODY ABANDONED. Its own output contains two real
//    defects. Whoever wrote it was looking straight at them — the nulls are
//    right there in the printed line — and never turned looking into a gate.
//
// 2. THE NAME WAS A TRAP. `zz*.test.js` is this project's throwaway-probe
//    convention; sessions create and delete those files constantly. A single
//    `rm src/lib/__tests__/zz*.test.js` would have deleted a tracked file, and
//    because it asserted nothing, the suite would have stayed green and nobody
//    would have learned it was gone. Found by a review board, 2026-09-26.
//
// ── DEFECT 1: THE POSSESSIVE LOSES THE HONOREE ─────────────────────────────
//
// "birthday party for mom"  ->  honoree "Mom"        WORKS
// "mom's 80th birthday"     ->  honoree null         DOES NOT
//
// Measured across the whole family — `mom's`, `moms`, `my mom's`, `dad's`,
// `grandma's` — every possessive form returns null. Only the `for <person>`
// construction is read. "Mom's 80th birthday" is not an edge case; it is how
// people say this out loud, and the milestone IS extracted from the same
// string, so the parser reads the sentence and drops the person in it.
//
// ── DEFECT 2: THE CITY RESOLVER IS CASE-SENSITIVE, AND ONE PATH IS INCOHERENT ─
//
//   "in Chicago june 14"  ->  venueCity "Chicago"  isDestination true    OK
//   "in miami june 14"    ->  venueCity null       isDestination false   MISS  [FIXED 9/26]
//   "in vegas june 14"    ->  venueCity null       isDestination false   MISS  [vocabulary]
//   "in Vegas june 14"    ->  venueCity null       isDestination TRUE    INCOHERENT
//
// Lowercase city names do not resolve at all, which matters because a host
// typing fast does not capitalise. And the capitalised nickname is worse than
// a miss: `isDestination: true` with `venueCity: null` is a state that says
// "this is a trip" and cannot say where to. Every downstream reader of
// isDestination — the lodging floor, the travel-led budget band, the
// destination checklist — is then reasoning about a destination event with no
// destination.
//
// ── WHY THIS PINS RATHER THAN FIXES ────────────────────────────────────────
//
// Both are real and neither is a one-line change. The honoree fix touches the
// possessive-stripping path shared with venue and type extraction; the city
// fix touches `resolveSpokenCity`'s vocabulary and its case handling, which
// feeds the gazetteer and the destination gate. Pinned here, named, with the
// exact strings — the treatment this repo gives NO_SINGLE_GATEWAY and
// KNOWN_BAND_DISAGREEMENTS — so the next person changing the parser finds out
// immediately whether they fixed or widened them.
import { parseSmartEventText } from '../smartParseEvent';

const f = (s, k) => parseSmartEventText(s)[k];

describe('what the parser reads today', () => {
  test('(premise) the parser is reading these sentences at all', () => {
    // Without this every "is null" assertion below could pass because parsing
    // failed outright, which is a different bug wearing the same result.
    expect(f("mom's 80th birthday, 30 people", 'milestone')).toBe('80th');
    expect(f('birthday in Chicago june 14 2027, 30 people', 'venueCity')).toBe('Chicago');
    expect(f('birthday party at my house, 30 people', 'venueKind')).toBe('home');
  });

  test('the working constructions still work', () => {
    expect(f('birthday party for mom, 30 people', 'honoree')).toBe('Mom');
    expect(f('sweet 16 for my daughter, 30 people', 'honoree')).toBe('Daughter');
    expect(f('sweet 16 for my daughter, 30 people', 'type')).toBe('Sweet 16');
    expect(f('birthday party at noon, 30 people', 'startTime')).toBe('12:00 PM');
    expect(f('birthday party thanksgiving 2027, 30 people', 'date')).toBe('2027-11-25');
    expect(f('birthday party in Las Vegas NV june 14 2027, 30 people', 'venueCity')).toBe('Las Vegas');
  });

  test('KNOWN GAP 1: every possessive form loses the honoree', () => {
    // If any of these starts returning a name, the gap is closing and this
    // test should be narrowed to whatever is left — it must not be deleted
    // wholesale, or the remaining forms go unwatched again.
    const possessives = [
      "mom's 80th birthday, 30 people",
      'moms 80th birthday, 30 people',
      "my mom's 80th birthday, 30 people",
      "dad's retirement, 30 people",
      "grandma's 90th, 30 people",
    ];
    expect(possessives.map((s) => f(s, 'honoree'))).toEqual([null, null, null, null, null]);
    // …while the milestone IS read out of the same string, which is what makes
    // this a dropped field rather than an unparsed sentence.
    expect(f("mom's 80th birthday, 30 people", 'milestone')).toBe('80th');
  });

  // ── GAP 2 CLOSED 2026-09-26, AND NARROWED TO WHAT IS LEFT ─────────────────
  //
  // The header above described this as one gap about "case handling and
  // vocabulary". It was two, and separating them is what made it fixable.
  //
  // CASE was a single `[A-Z]` in the "in <Place>" capture in smartParseEvent.
  // resolveSpokenCity had been case-insensitive the whole time — it lowercases
  // its key — so the town was being thrown away one layer before the resolver
  // ever saw it. A whitelist-only lowercase second pass now recovers it, and
  // `spokenCity` joined the destination gate so that case cannot change
  // isDestination either. The capital stays on the path that feeds the
  // destination gate raw, where it is doing a second job as a proper-noun test.
  //
  // VOCABULARY is what remains, and it is not about case at all: "vegas" and
  // "Vegas" both fail, because the curated usCities list holds "Las Vegas" and
  // no nicknames. That is pinned below and in 2b.
  test('lowercase cities resolve now — case is not the gap any more', () => {
    expect(f('birthday in miami june 14 2027, 30 people', 'venueCity')).toBe('Miami');
    expect(f('reunion in asheville aug 3 2027, 30 people', 'venueCity')).toBe('Asheville');
    expect(f('birthday in las vegas june 14 2027, 30 people', 'venueCity')).toBe('Las Vegas');
    // Capitalised gives the identical answer — the property that matters is
    // that the shift key cannot change what the app understood.
    for (const c of ['miami', 'Miami', 'chicago', 'Chicago']) {
      const p = parseSmartEventText(`birthday in ${c} june 14 2027, 30 people`);
      expect({ city: p.venueCity, dest: p.isDestination })
        .toEqual({ city: c[0].toUpperCase() + c.slice(1), dest: true });
    }
  });

  test('NEGATIVE CONTROL: the lowercase pass did not admit non-places', () => {
    // The risk the fix carried. The capital letter was also keeping ordinary
    // lowercase nouns after "in" out of the destination gate, so the second
    // pass is whitelist-only: a word resolveSpokenCity does not know reaches
    // nothing. If this ever goes red, "in the backyard" is inventing a trip.
    for (const s of ['cookout in the backyard for 20 people',
      'birthday in my house june 14 2027, 30 people',
      'birthday in the church hall june 14 2027, 30 people',
      'party in the park june 14 2027, 30 people']) {
      const p = parseSmartEventText(s);
      expect({ [s]: { city: p.venueCity, dest: p.isDestination } })
        .toEqual({ [s]: { city: null, dest: false } });
    }
  });

  test('KNOWN GAP 2, WHAT IS LEFT: nicknames are not in the vocabulary', () => {
    // Not a case problem — both spellings fail, and the curated list holds the
    // full name. Closing this means deciding whether "Vegas", "Philly", "NYC"
    // and "DC" earn alias entries, which is a data ruling, not a parser fix.
    expect(f('birthday in vegas june 14 2027, 30 people', 'venueCity')).toBeNull();
    expect(f('birthday in Vegas june 14 2027, 30 people', 'venueCity')).toBeNull();
    // …while the full name resolves, which is what makes this vocabulary.
    expect(f('birthday in las vegas june 14 2027, 30 people', 'venueCity')).toBe('Las Vegas');
  });

  test('KNOWN GAP 2b, THE WORSE HALF: a destination with nowhere to go', () => {
    // `isDestination: true` with `venueCity: null` tells every downstream
    // reader — lodgingFloor, the travel_led band, the destination checklist —
    // that this is a trip, while refusing to say where. A plain miss would be
    // safer than this.
    const r = parseSmartEventText('birthday in Vegas june 14 2027, 30 people');
    expect(r.isDestination).toBe(true);
    expect(r.venueCity).toBeNull();
  });

  test('NEGATIVE CONTROL: the incoherent pair is NOT how a resolved city behaves', () => {
    // Guards the assertion above from passing for the wrong reason. A city the
    // resolver knows produces both halves together.
    const ok = parseSmartEventText('birthday in Chicago june 14 2027, 30 people');
    expect(ok.isDestination).toBe(true);
    expect(ok.venueCity).toBe('Chicago');
  });
});
