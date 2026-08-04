// A resort and a rental house produce nearly disjoint food plans. The app already
// asked which it was and already derived the platform from a pasted listing; it
// told neither to the food engine. This is that fact, made readable.
import { lodgingKitchen, kitchenSignal, kitchenConsequence } from '../lodgingIntel';

const ev = (o) => ({ id: 'e', type: 'Birthday', isDestination: true, ...o });

// ── WHEN THE TWO SOURCES DISAGREE (live drive, 2026-08-04) ──────────────────
// The describe below is titled "a pasted listing outranks the multiple choice"
// and not one of its cases ever supplied both — so the precedence it named was
// never actually exercised. Driving the cockpit put them in conflict: the host
// pressed "A hotel or room block" to correct a kitchen inferred from an Airbnb
// URL, the answer was written to foodChoices, and the surface kept saying
// "There is a kitchen." Told beats inferred. These are the cases that were
// missing, in both directions.
describe('the host outranks the URL', () => {
  const airbnbLink = [{ url: 'https://www.airbnb.com/rooms/99' }];

  test('an explicit room block beats a kitchen inferred from an Airbnb link', () => {
    const e = ev({ lodgingOptions: airbnbLink, foodChoices: { dest_lodging: 'A room block, no commitment' } });
    expect(lodgingKitchen(e)).toBe(false);
    expect(kitchenSignal(e).from).toBe('told');
    expect(kitchenConsequence(e).headline).toBe('There is no kitchen.');
  });

  test('and the other way — a host-arranged rental stands with a hotel link present', () => {
    const e = ev({
      lodgingOptions: [{ url: 'https://www.marriott.com/x' }],
      foodChoices: { dest_lodging: 'A host-arranged Airbnb' },
    });
    expect(lodgingKitchen(e)).toBe(true);
    expect(kitchenSignal(e).from).toBe('told');
  });

  test('a listing still speaks when the host has said nothing', () => {
    const e = ev({ lodgingOptions: airbnbLink });
    expect(lodgingKitchen(e)).toBe(true);
    expect(kitchenSignal(e).from).toBe('inferred');
  });

  test('an unanswered pick does not silence the listing', () => {
    // "Guests book on their own" is NOT TOLD — it must not block the inference.
    const e = ev({ lodgingOptions: airbnbLink, foodChoices: { dest_lodging: 'Guests book on their own' } });
    expect(lodgingKitchen(e)).toBe(true);
    expect(kitchenSignal(e).from).toBe('inferred');
  });
});

// ── AN INFERENCE MUST SAY SO, AND STAY CORRECTABLE ──────────────────────────
describe('a claim carries its basis', () => {
  test('an inferred kitchen names the link it came from and keeps the answers', () => {
    const kc = kitchenConsequence(ev({ lodgingOptions: [{ url: 'https://www.airbnb.com/rooms/99' }] }));
    expect(kc.from).toBe('inferred');
    expect(kc.basis).toMatch(/Airbnb link/);
    // the host must be able to overrule it in place
    expect(kc.answers.length).toBeGreaterThan(0);
  });

  test('an answer the host gave needs no escape hatch', () => {
    const kc = kitchenConsequence(ev({ foodChoices: { dest_lodging: 'A room block, no commitment' } }));
    expect(kc.from).toBe('told');
    expect(kc.basis).toMatch(/You said/);
    expect(kc.answers).toEqual([]);
  });

  test('the untold state still offers every answer', () => {
    const kc = kitchenConsequence(ev({}));
    expect(kc.answered).toBe(false);
    expect(kc.answers.length).toBeGreaterThan(0);
  });
});

describe('a pasted listing outranks the multiple choice', () => {
  test('a VRBO link means a kitchen', () => {
    expect(lodgingKitchen(ev({ lodgingOptions: [{ url: 'https://www.vrbo.com/1234' }] }))).toBe(true);
  });
  test('an Airbnb link means a kitchen', () => {
    expect(lodgingKitchen(ev({ lodgingOptions: [{ url: 'https://www.airbnb.com/rooms/99' }] }))).toBe(true);
  });
  test('a hotel link is NOT a rental platform, so it decides nothing on its own', () => {
    expect(lodgingKitchen(ev({ lodgingOptions: [{ url: 'https://www.marriott.com/x' }] }))).toBeNull();
  });
});

describe('the decision the playbook already asks', () => {
  test('a host-arranged Airbnb means a kitchen', () => {
    expect(lodgingKitchen(ev({ foodChoices: { dest_lodging: 'A host-arranged Airbnb' } }))).toBe(true);
  });
  test('a room block IS a hotel — no kitchen', () => {
    expect(lodgingKitchen(ev({ foodChoices: { dest_lodging: 'A room block, no commitment' } }))).toBe(false);
    expect(lodgingKitchen(ev({ foodChoices: { dest_lodging: 'A room block I guarantee fills' } }))).toBe(false);
  });
});

describe('the third state is the point', () => {
  test('"Guests book on their own" is NOT TOLD, never a hotel', () => {
    expect(lodgingKitchen(ev({ foodChoices: { dest_lodging: 'Guests book on their own' } }))).toBeNull();
  });
  test('nothing asked yet is not told', () => {
    expect(lodgingKitchen(ev({}))).toBeNull();
    expect(lodgingKitchen(null)).toBeNull();
  });
  test('a local event with no lodging answer is not told either — never inferred', () => {
    expect(lodgingKitchen({ id: 'e', type: 'Birthday', venueCity: 'Santa Fe' })).toBeNull();
  });
});

describe('it reads host answers only', () => {
  test('an event type never implies a kitchen', () => {
    expect(lodgingKitchen({ id: 'e', type: 'Team Retreat', isDestination: true })).toBeNull();
  });
  test('a listing with no url decides nothing', () => {
    expect(lodgingKitchen(ev({ lodgingOptions: [{ name: 'Some house' }] }))).toBeNull();
  });
});

// ── The search workflow: the app BUILDS the query, the host RUNS it ───────────
// The never-build rule stands (no rental APIs, no price scraping). These cover the
// two gaps found on the 2026-08-03 drive: no hotel option at all, and a host with
// no town yet getting nothing rather than a next step.
describe('lodgingSearchLinks — hotels are covered, not just rentals', () => {
  const { lodgingSearchLinks } = require('../lodgingIntel');
  const dest = {
    id: 'e', type: 'Birthday', isDestination: true,
    venueCity: 'Santa Fe', venueState: 'NM',
    date: '2028-06-17', endDate: '2028-06-21', guestCount: 10,
  };

  test('all three doors are offered', () => {
    expect(lodgingSearchLinks(dest).map((l) => l.id).sort()).toEqual(['airbnb', 'hotels', 'vrbo']);
  });

  test('the hotel search carries the town the host gave', () => {
    const h = lodgingSearchLinks(dest).find((l) => l.id === 'hotels');
    expect(decodeURIComponent(h.href)).toContain('Santa Fe');
  });

  // Host reversed the front-door ruling on 2026-08-03 (see lodgingIntel.js).
  // `criteria` is KEPT: it is no longer the only path, but a host who prefers
  // to type into Vrbo's own picker still has the words.
  test('Vrbo carries the search, and still hands over the criteria', () => {
    const v = lodgingSearchLinks(dest).find((l) => l.id === 'vrbo');
    expect(v.href).toMatch(/^https:\/\/www\.vrbo\.com\/search\?/);
    expect(v.href).toMatch(/destination=Santa\+Fe/);
    expect(v.criteria).toContain('Santa Fe');
  });

  test('no town means no fabricated search', () => {
    expect(lodgingSearchLinks({ ...dest, venueCity: '', venueState: '' })).toEqual([]);
  });
});

describe('lodgingSearchBlocked — no town is a STEP, not a blank', () => {
  const { lodgingSearchBlocked } = require('../lodgingIntel');
  const noTown = {
    id: 'e', type: 'Birthday', isDestination: true,
    date: '2028-06-17', endDate: '2028-06-21', guestCount: 10,
  };

  test('it names the missing input and routes somewhere real', () => {
    const b = lodgingSearchBlocked(noTown);
    expect(b.reason).toBe('no-town');
    expect(b.route).toEqual({ tab: 'Event Details', focusField: 'event-venue' });
  });

  test('it says what is ALREADY in hand, so the host is not starting over', () => {
    const b = lodgingSearchBlocked(noTown);
    // HOST LANGUAGE, not ISO. This assertion originally demanded
    // "2028-06-17 to 2028-06-21" and passed - which is how the ISO string reached
    // a real screen. Pin the readable form so it cannot come back.
    // EN DASH since 2026-08-04. This assertion pinned a HYPHEN while
    // lodgingSearchLinks — one screen later — rendered the same span with an en
    // dash. Walking the workflow end to end is what surfaced it; the two
    // producers now share one character.
    expect(b.detail).toContain('Jun 17–Jun 21');
    expect(b.detail).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(b.detail).toContain('10 guests');
  });

  test('it is silent once a town exists — searches speak instead', () => {
    expect(lodgingSearchBlocked({ ...noTown, venueCity: 'Santa Fe', venueState: 'NM' })).toBeNull();
  });

  test('a LOCAL event is never nagged about lodging', () => {
    expect(lodgingSearchBlocked({ ...noTown, isDestination: false })).toBeNull();
    expect(lodgingSearchBlocked({ id: 'x', type: 'Birthday' })).toBeNull();
  });
});
