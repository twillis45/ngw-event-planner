// ─── "AT VIDA'S" NAMES A PLACE, NOT THE PERSON BEING CELEBRATED ─────────────
//
// Found 11/15/2026 building the Friendsgiving playbook. The owner's own test
// event, typed the way people say it — "Friendsgiving at Vida's Saturday for
// 15" — came back with honoree "Vida": a dinner AT a friend's place was
// planned as a party FOR her, and the honoree reaches the event name and the
// invite. "Birthday at Grandma's house" was already guarded (a place noun
// follows the possessive); the bare form, where "at" alone says it is a place,
// was not.
//
// The rule: a possessive that directly follows "at" is where, not who. The
// honoree can still be named elsewhere in the same sentence ("for Vida").
import { parseSmartEventText } from '../smartParseEvent';

const NOW = new Date('2026-11-15T12:00:00');
const p = (s) => parseSmartEventText(s, { now: NOW });

describe('a possessive right after "at" is a place', () => {
  test.each([
    "Friendsgiving at Vida's Saturday for 15",
    "Dinner party at Marcus's, 8 people",
    'game night at Keisha’s on Friday, 6 people',
    "party at Mom's, 20 people",
  ])('%s → no honoree', (s) => {
    expect(p(s).honoree).toBe(null);
  });

  test('the bare place becomes the venue', () => {
    expect(p("Friendsgiving at Vida's Saturday for 15").venue).toBe("Vida's");
    expect(p('game night at Keisha’s on Friday, 6 people').venue).toBe('Keisha’s');
  });
});

describe('negative controls — a real honoree is still found', () => {
  test("a possessive that does not follow \"at\" still names who", () => {
    expect(p("Vida's 40th birthday at the park, 30 people").honoree).toBe('Vida');
    expect(p("Mom's 80th birthday, 30 people").honoree).toBe('Mom');
  });
  test('the honoree named with "for" survives a place possessive in the same sentence', () => {
    expect(p("surprise party for Vida at Marcus's, 20 people").honoree).toBe('Vida');
  });
  test("a business named for someone keeps its whole name (Anderson's Farm)", () => {
    expect(p("wedding at Anderson's Farm, 100 people").venue).not.toBe("Anderson's");
    // 11/16/2026: the whole business name is now kept as the venue
    // (aVenueSheNamedIsKept.test.js). It is a venue, never the host's home.
    expect(p("wedding at Anderson's Farm, 100 people").venue).toBe("Anderson's Farm");
    expect(p("wedding at Anderson's Farm, 100 people").venueKind).not.toBe('home');
  });
  test('an address after the place keeps its verbatim venue', () => {
    const r = p("Friendsgiving at Vida's - 120 Maple Ave, Pasadena, MD for 15");
    expect(r.honoree).toBe(null);
    expect(r.venue).toMatch(/^Vida's/);
  });
});

// The place's NAME does not carry its street (11/15/2026, live screenshot): the
// chip read "Vida's - 271 Whitaker Rd" while the street was already parsed into
// its own field. The name is the name; the street stays in venueAddress.
describe('a place name and its street are separate', () => {
  test.each([
    ["Friendsgiving this Saturday at Vida's - 120 Maple Ave, Pasadena, MD for 15", "Vida's"],
    ["Friendsgiving this Saturday at Vida's, 120 Maple Ave, Pasadena, MD for 15", "Vida's"],
  ])('%s → venue %s, street kept separately', (s, name) => {
    const r = p(s);
    expect(r.venue).toBe(name);
    expect(r.venueAddress).toBe('120 Maple Ave');
  });
});
