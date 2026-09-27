// ─── ONE SENTENCE, TWO ANSWERS, FROM THE SAME FILE ────────────────────────
//
// "at grandma's house" was a home. "at grandfather's home" was not. Both
// are the same shape and the difference was a second, shorter copy of the
// relation vocabulary: 20 words written inline against REL_WORDS' 36.
//
// The inline copy was missing mommy, daddy, pops, ma, granddad,
// grandfather, wife, husband, son, daughter, nephew, niece, godmother,
// godfather, bestie, best friend, partner and fiancé(e) — and the honoree
// branch, which reads the real constant, knew every one of them. So a host
// who typed "at my daughter's house" could be given a daughter as the
// honoree and still be told she had no venue.
//
// ── WHAT THE PROBE ACTUALLY FOUND, WHICH WAS NOT THE STORY ────────────────
//
// The claim handed to me was that the short list broke "my daughter's
// house", "my wife's place" and "at grandfather's home". Driving it found
// the first two already WORKED — a separate regex captures the verbatim
// venue phrase with `[a-z]+` in the relation slot, which is a shape and not
// a list, so any single word passes it.
//
// The real failures were four, and three of them were that regex's SHAPE
// rather than any vocabulary:
//
//   my parents' house       plural possessive — the apostrophe follows
//   my folks' place         the s, and `['’]s` demanded one after it
//   my best friend's house  two words in the slot, `[a-z]+` takes one
//   my great-grandma's      a hyphen, which `[a-z]+` stops at
//
// and only the fourth, "at grandfather's home", was the missing-word bug.
// Both are fixed here; the file records the difference because a fix aimed
// at the reported cause would have missed three of the four.
import { parseSmartEventText } from '../smartParseEvent';

const NOW = new Date('2026-09-18T12:00:00Z');
const parse = (s) => parseSmartEventText(s, { now: NOW }) || {};
const kindOf = (s) => parse(s).venueKind || null;

describe('a relative’s place is a home, whichever relative', () => {
  test('THE BUG: the words only the long list knew', () => {
    // Each of these is absent from the copy that used to live at this seam.
    const missing = ['grandfather', 'granddad', 'wife', 'husband', 'son',
      'daughter', 'nephew', 'niece', 'godmother', 'godfather', 'partner',
      'mommy', 'daddy'];
    const out = {};
    for (const w of missing) out[w] = kindOf(`BBQ at ${w}'s house`);
    const want = {};
    for (const w of missing) want[w] = 'home';
    expect(out).toEqual(want);
  });

  test('…and the words it did know still work', () => {
    for (const w of ['mom', 'dad', 'grandma', 'auntie', 'uncle', 'sister', 'cousin']) {
      expect({ [w]: kindOf(`BBQ at ${w}'s house`) }).toEqual({ [w]: 'home' });
    }
  });

  test('parents and folks survive the move to the shared list', () => {
    // These two are NOT in REL_WORDS and are added at this seam only —
    // REL_WORDS also drives honoree detection, where "Parents" as a
    // person's name is a separate question nobody has ruled on. If someone
    // later folds them into the constant, this still passes; if they drop
    // them while doing it, this fails.
    expect(kindOf("BBQ at my parents' house")).toBe('home');
    expect(kindOf("BBQ at my folks' place")).toBe('home');
    expect(kindOf('BBQ at my parents house')).toBe('home');
  });
});

describe('the three shapes the verbatim-phrase regex could not read', () => {
  // These keep the host's own words as the venue, so the assertion is on
  // the phrase and not just the kind.
  test('a PLURAL possessive — the apostrophe after the s', () => {
    expect(parse("BBQ at my parents' house").venue).toBe("My parents' house");
    expect(parse("BBQ at my folks' place").venue).toBe("My folks' place");
  });

  test('TWO WORDS in the relation slot', () => {
    expect(parse("BBQ at my best friend's house").venue).toBe("My best friend's house");
    expect(parse("BBQ at my big brother's backyard").venue).toBe("My big brother's backyard");
  });

  test('a HYPHEN, which [a-z]+ stops at', () => {
    expect(parse("BBQ at my great-grandma's house").venue).toBe("My great-grandma's house");
  });

  test('and the slot is still capped at two words', () => {
    // Widening further stops naming a place and starts swallowing the
    // sentence around it.
    expect(parse("BBQ at my very best old friend's house").venue).not.toMatch(/very best old/);
  });
});

describe('NEGATIVE CONTROL: it did not widen onto venue names', () => {
  test('a business called someone’s farm is not somebody’s home', () => {
    // The reason the shared list is safe here is that REL_WORDS is closed
    // kinship vocabulary. A shape-based relation slot with no pronoun in
    // front of it would have swallowed all of these.
    for (const s of ["wedding at Anderson's Farm", "wedding at Miller's Barn",
      "reception at Smith's Garden", "party at Sarah's house"]) {
      expect({ [s]: kindOf(s) }).toEqual({ [s]: null });
    }
  });

  test('and a bare place word still needs its possessive', () => {
    // The pre-existing guarantee at this seam: "a bare 'the club' or 'the
    // hall' cannot slip in".
    for (const s of ['party at the club', 'party at the hall', 'dinner at the restaurant']) {
      expect({ [s]: kindOf(s) }).toEqual({ [s]: null });
    }
  });
});
