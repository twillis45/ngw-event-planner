// ─── FOUR ANSWERS TO ONE QUESTION, AND NONE MAY WEAR ANOTHER'S AUTHORITY ──
//
// Three published sources landed today — GSA caps, DOT fares, Inside Airbnb
// bands — and none of them reached a host, deliberately. The risk in wiring
// them is not that a number is wrong; it is that the WEAKEST number ends up
// looking like the strongest.
//
// So the ladder is ordered by what we actually know, every rung names
// itself, and the bottom rung is null rather than a fallback:
//
//   picked    the host chose a place and the page showed a price
//   cheapest  a shortlist exists; the least expensive on it
//   listings  Inside Airbnb's asking band for a whole place that size
//   federal   GSA's per-night cap, which is a ceiling on ONE ROOM
//   null      none of the above
//
// THE UNITS DO NOT MATCH AND ARE NOT RECONCILED. `listings` prices a whole
// place; `federal` caps one room. Converting between them needs a room
// count, and lodgingIntel refuses to guess one ("a party does not divide
// into rooms by arithmetic — couples, children, singles"). Multiplying a
// room cap by a guessed room count here would be that same invention with a
// federal citation attached, so each rung carries its unit and nothing is
// silently converted.
import { lodgingBasisFor, isOwnEvidence } from '../lodgingBasisLadder';

const ev = (over) => ({
  id: 'e', type: 'Birthday', date: '2027-06-17',
  guestCount: 8, venueCity: 'San Francisco', state: 'CA',
  ...over,
});

describe('the host’s own evidence outranks every published average', () => {
  test('a PICKED place with a shown price wins, and is a stay not a night', () => {
    // A pick is `event.lodging` matched by url first and then by
    // `hotelName` — NOT a `chosen` flag on the option, and not `name`
    // either. Both were invented by earlier drafts of this fixture.
    // lodgingFloor.js:42.
    const b = lodgingBasisFor(ev({
      lodging: { hotelName: 'The villa' },
      lodgingOptions: [{ name: 'The villa', priceShown: 4200 }],
    }));
    expect(b.rung).toBe('picked');
    expect(b.unit).toBe('stay');
    expect(b.perNight).toBe(false);
    expect(b.low).toBe(4200);
    expect(isOwnEvidence(b)).toBe(true);
  });

  test('a shortlist with no pick gives the cheapest, still the host’s own', () => {
    const b = lodgingBasisFor(ev({
      lodgingOptions: [{ name: 'A', priceShown: 5200 }, { name: 'B', priceShown: 3100 }],
    }));
    expect(b.rung).toBe('cheapest');
    expect(b.low).toBe(3100);
    expect(isOwnEvidence(b)).toBe(true);
  });

  test('THE ORDERING: a shortlist beats listings even where both exist', () => {
    // San Francisco is one of the 34 Airbnb regions, so both rungs are
    // available here. A real price on a real place the host is looking at
    // must win — a published median is not better evidence than the page
    // she is reading.
    const withList = lodgingBasisFor(ev({
      lodgingOptions: [{ name: 'A', priceShown: 3100 }],
    }));
    const without = lodgingBasisFor(ev({}));
    expect(withList.rung).toBe('cheapest');
    expect(without.rung).toBe('listings');
  });
});

describe('the published rungs, in order', () => {
  test('listings answer for a covered region at the party’s size', () => {
    const b = lodgingBasisFor(ev({ guestCount: 8 }));
    expect(b.rung).toBe('listings');
    expect(b.unit).toBe('place-night');
    expect(b.perNight).toBe(true);
    expect(b.low).toBeLessThan(b.high);
    expect(b.source).toBe('Inside Airbnb');
    expect(b.basis).toMatch(/before cleaning and service fees/i);
  });

  test('the federal cap answers where listings cannot', () => {
    // Annapolis is not one of the 34 regions, but it is CONUS.
    const b = lodgingBasisFor(ev({ venueCity: 'Annapolis', state: 'MD', guestCount: 8 }));
    expect(b.rung).toBe('federal');
    expect(b.unit).toBe('room-night');
    expect(b.source).toBe('GSA per diem');
    expect(b.basis).toMatch(/maximum/i);
    expect(isOwnEvidence(b)).toBe(false);
  });

  test('a seasonal federal cap reads the event DATE', () => {
    const feb = lodgingBasisFor(ev({ venueCity: 'Gulf Shores', state: 'AL', date: '2027-02-14' }));
    const jul = lodgingBasisFor(ev({ venueCity: 'Gulf Shores', state: 'AL', date: '2027-07-04' }));
    expect(feb.low).toBe(134);
    expect(jul.low).toBe(216);
  });
});

describe('what it refuses', () => {
  test('outside CONUS there is nothing, not a national average', () => {
    expect(lodgingBasisFor(ev({ venueCity: 'Honolulu', state: 'HI' }))).toBeNull();
  });

  test('no state, no answer — a city alone is never enough', () => {
    expect(lodgingBasisFor(ev({ venueCity: 'Austin', state: '', venueState: '' }))).toBeNull();
  });

  test('a shortlist with no PRICES does not promote itself to a floor', () => {
    // lodgingFloor's own refusal, delegated unchanged: "no listing, no
    // number — null, not a guess". The ladder must fall THROUGH it to a
    // published rung, never fabricate a stay total from an unpriced pick.
    const b = lodgingBasisFor(ev({
      lodging: { hotelName: 'Somewhere' },
      lodgingOptions: [{ name: 'Somewhere', priceShown: null }],
    }));
    expect(b.rung).toBe('listings');   // fell through, did not invent a stay
    expect(b.unit).toBe('place-night');
  });
});

describe('THE UNITS ARE NEVER SILENTLY RECONCILED', () => {
  test('every rung says what its number counts', () => {
    const cases = [
      [ev({ lodgingOptions: [{ name: 'A', priceShown: 3100 }] }), 'stay', false],
      [ev({}), 'place-night', true],
      [ev({ venueCity: 'Annapolis', state: 'MD' }), 'room-night', true],
    ];
    for (const [e, unit, perNight] of cases) {
      const b = lodgingBasisFor(e);
      expect({ [unit]: [b.unit, b.perNight] }).toEqual({ [unit]: [unit, perNight] });
    }
  });

  test('a room cap is never multiplied into a party total', () => {
    // The guess lodgingIntel refuses. Eight guests do not become four rooms
    // here or anywhere: the federal rung returns the SAME number regardless
    // of party size, because it is a per-room ceiling and nothing about the
    // party changes it.
    const two = lodgingBasisFor(ev({ venueCity: 'Annapolis', state: 'MD', guestCount: 2 }));
    const twenty = lodgingBasisFor(ev({ venueCity: 'Annapolis', state: 'MD', guestCount: 20 }));
    expect(two.low).toBe(twenty.low);
    expect(two.unit).toBe('room-night');
  });

  test('but the LISTINGS rung does move with the party, because it prices the place', () => {
    const small = lodgingBasisFor(ev({ guestCount: 2 }));
    const big = lodgingBasisFor(ev({ guestCount: 10 }));
    expect(small.rung).toBe('listings');
    expect(big.rung).toBe('listings');
    expect(big.low).toBeGreaterThan(small.low);
  });
});
