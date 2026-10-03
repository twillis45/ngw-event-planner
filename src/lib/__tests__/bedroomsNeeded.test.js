process.env.REACT_APP_API_BASE_URL = 'https://example.test';
const { bedroomsNeeded, LODGING_MUST_HAVES } = require('../lodgingIntel');
describe('bedroom derivation', () => {
  test("the host's own Anaheim case: 16, no roster detail -> 8", () => {
    const r = bedroomsNeeded({ guestCount: 16 });
    expect(r.rooms).toBe(8); expect(r.basis).toBe('assumed');
  });
  test('8 couples on the roster -> 8, from the roster', () => {
    const guests = Array.from({ length: 8 }, (_, i) => ({ name: `A${i}`, plusOne: `B${i}` }));
    const r = bedroomsNeeded({ guests });
    expect(r.rooms).toBe(8); expect(r.basis).toBe('roster'); expect(r.couples).toBe(8);
  });
  test('couples plus singles plus kids', () => {
    const guests = [{ name: 'a', plusOne: 'b' }, { name: 'c', plusOne: 'd' }, { name: 'e' }, { name: 'f', kids: 3 }];
    const r = bedroomsNeeded({ guests });
    expect(r.couples).toBe(2); expect(r.singles).toBe(2); expect(r.kids).toBe(3);
    expect(r.rooms).toBe(2 + 2 + 2);
  });
  test('no guests at all -> null, never a zero', () => {
    expect(bedroomsNeeded({})).toBe(null);
  });
  test('the new catalog entries exist and carry what they claim', () => {
    const by = (id) => LODGING_MUST_HAVES.find((m) => m.id === id);
    expect(by('bedrooms').need({ guestCount: 16 })).toBe(8);
    expect(by('bedrooms').reads({ bedrooms: 5 })).toBe(5);
    expect(by('baths').need({ guestCount: 16 })).toBe(6);
    expect(by('freecancel').match.test('Free cancellation')).toBe(true);
    expect(by('superhost').match.test('Superhost')).toBe(true);
    expect(by('grill').match.test('Private backyard with BBQ near the Plaza')).toBe(true);
  });
});

// ── A NUMBER THE CARD ANSWERS IS NOT A MENTION ─────────────────────────────
// The point of making bedrooms numeric: "5 bedrooms against a need of 8" is a
// FINDING the host can act on, where the old prose scoring could only report
// an absence.
const { rankCandidates, suggestedMustHaves } = require('../lodgingIntel');

describe('a measured shortfall is a finding, not an absence', () => {
  const ev = { guestCount: 16, type: 'reunion', lodgingMustHaves: ['bedrooms'] };

  test('short of the need: named, and it does not clear', () => {
    const { ranked } = rankCandidates([{ name: 'Small house', bedrooms: 5, beds: 20 }], ev);
    expect(ranked[0].short).toEqual(['enough bedrooms: 5 of 8']);
    expect(ranked[0].matched).not.toContain('Enough bedrooms');
    expect(ranked[0].unknown).not.toContain('Enough bedrooms');
    // AND IT STILL CLEARS. A derived minimum sorts, it does not exclude —
    // making it a hard filter unticked most of a pasted twenty-link search
    // and timed out twentyLinksIsARealSearch on four projects (matrix55).
    expect(ranked[0].clears).toBe(true);
    expect(ranked[0].why).toMatch(/5 bedrooms for 8 needed/);
    // The value is kept where it belongs: the row sinks.
    const { ranked: pair } = rankCandidates(
      [{ name: 'Small', bedrooms: 5, beds: 20 }, { name: 'Big', bedrooms: 8, beds: 20 }], ev);
    expect(pair[0].name).toBe('Big');
  });

  test('meets the need: matched, and it clears', () => {
    const { ranked } = rankCandidates([{ name: 'Big house', bedrooms: 8, beds: 20 }], ev);
    expect(ranked[0].matched).toContain('Enough bedrooms');
    expect(ranked[0].short).toEqual([]);
    expect(ranked[0].clears).toBe(true);
  });

  test('UNREAD stays unknown — a missing number must never read as short', () => {
    const { ranked } = rankCandidates([{ name: 'Unread', bedrooms: null, beds: 20 }], ev);
    expect(ranked[0].unknown).toContain('Enough bedrooms');
    expect(ranked[0].short).toEqual([]);
  });

  test('a 16-guest reunion is SUGGESTED bedrooms, with the arithmetic shown', () => {
    const sug = suggestedMustHaves({ guestCount: 16, type: 'reunion', date: '2026-11-02', endDate: '2026-11-05' });
    const bed = sug.find((x) => x.id === 'bedrooms');
    expect(bed).toBeTruthy();
    expect(bed.why).toMatch(/8 bedrooms/);
  });
});

// ── THE HOST SAID IT; WE WERE GUESSING IT BACK ─────────────────────────────
// "50th birthday nov 2027 8 couples 5 nights Disneyland" parsed to guests:16
// and threw the PAIRING away, so bedroomsNeeded assumed double occupancy and
// said so on screen — announcing an assumption about a fact the host had
// stated outright. Both halves are gated here: the parser keeps it, and the
// engine reads it.
const { parseSmartEventText } = require('../smartParseEvent');

describe('a stated pairing is a derivation, not a guess', () => {
  test('the parser keeps the pair count AND still reads guests as sixteen', () => {
    const p = parseSmartEventText('50th birthday nov 2027 8 couples 5 nights Disneyland');
    expect(p.guests).toBe(16);
    expect(p.guestPairs).toBe(8);
  });

  // The ordering the 2026-09-25 comment protects: an explicit headcount wins,
  // and the pairing must not double it.
  test('"16 guests, 8 couples" reads sixteen, never thirty-two — and keeps the 8', () => {
    const p = parseSmartEventText('reunion in Anaheim 16 guests, 8 couples');
    expect(p.guests).toBe(16);
    expect(p.guestPairs).toBe(8);
  });

  test('no pairing said -> no field invented', () => {
    expect(parseSmartEventText('reunion in Anaheim for 16').guestPairs).toBe(null);
  });

  test('the engine uses it, and stops calling it an assumption', () => {
    const r = bedroomsNeeded({ guestCount: 16, guestPairs: 8 });
    expect(r.rooms).toBe(8);
    expect(r.basis).toBe('stated');
    expect(r.why).toMatch(/You said 8 couples/);
    expect(r.why).not.toMatch(/assumes/);
  });

  test('pairs plus leftovers: 20 people, 8 couples -> 8 rooms + 4 singles', () => {
    const r = bedroomsNeeded({ guestCount: 20, guestPairs: 8 });
    expect(r.rooms).toBe(12);
    expect(r.singles).toBe(4);
  });

  // A roster with real plus-ones is better evidence than a number typed once
  // at intake, so it must stay on top.
  test('the roster still outranks the stated pairing', () => {
    const guests = [{ name: 'a', plusOne: 'b' }, { name: 'c', plusOne: 'd' }];
    expect(bedroomsNeeded({ guests, guestPairs: 8 }).basis).toBe('roster');
  });
});

// ── THE FILTER REACHES THE URL, OR IT IS DECORATION ────────────────────────
// min_bedrooms / min_bathrooms were VERIFIED LIVE before being wired (ladders
// recorded at the catalog entries). This gates that the verified param
// actually rides the door the host opens — the difference between filtering a
// search and sorting its leftovers.
const { lodgingSearchLinks } = require('../lodgingIntel');

describe('a verified filter rides the Airbnb URL', () => {
  const ev = {
    type: 'Reunion', guestCount: 16, venueCity: 'Anaheim', venueState: 'CA',
    date: '2027-03-12', endDate: '2027-03-15',
    lodgingMustHaves: ['bedrooms', 'baths'],
  };

  test('the derived minimums are in the query, not just on the screen', () => {
    const doors = lodgingSearchLinks(ev);
    const url = JSON.stringify(doors || {});
    expect(url).toMatch(/min_bedrooms=8/);
    expect(url).toMatch(/min_bathrooms=6/);
  });

  test('superhost NEVER rides the URL — measured as not honored', () => {
    const doors = lodgingSearchLinks({ ...ev, lodgingMustHaves: ["superhost"] });
    expect(JSON.stringify(doors || {})).not.toMatch(/superhost/);
  });
});

// ── THE PAIRING THE APP ACTUALLY WRITES ────────────────────────────────────
// The add-names path splits "Denise & Ray" into two ROWS so each gets a reply,
// a plate and a seat — and tags both with one coupleId. A roster built that
// way has couples and no plusOne anywhere, so counting only plusOne reported
// zero pairs beside a list plainly showing eight.
describe('coupleId is a pairing too', () => {
  const pair = (id, a, b) => [{ name: a, coupleId: id }, { name: b, coupleId: id }];

  test('eight split couples -> eight bedrooms, from the roster', () => {
    const guests = Array.from({ length: 8 }, (_, i) => pair(`cp-${i}`, `A${i}`, `B${i}`)).flat();
    const r = bedroomsNeeded({ guests });
    expect(guests).toHaveLength(16);
    expect(r.basis).toBe('roster');
    expect(r.couples).toBe(8);
    expect(r.rooms).toBe(8);
  });

  test('the two forms mix without double-counting', () => {
    const guests = [...pair('cp-1', 'Denise', 'Ray'), { name: 'Jo', plusOne: 'Sam' }, { name: 'Alone' }];
    const r = bedroomsNeeded({ guests });
    expect(r.couples).toBe(2);   // one coupleId group + one plusOne row
    expect(r.singles).toBe(1);
    expect(r.rooms).toBe(3);
  });

  test('a row carrying BOTH is counted once, by its pair', () => {
    const guests = [{ name: 'Denise', coupleId: 'cp-1', plusOne: 'Ray' }, { name: 'Ray', coupleId: 'cp-1' }];
    expect(bedroomsNeeded({ guests }).rooms).toBe(1);
  });
});
