// A resort and a rental house produce nearly disjoint food plans. The app already
// asked which it was and already derived the platform from a pasted listing; it
// told neither to the food engine. This is that fact, made readable.
import { lodgingKitchen } from '../lodgingIntel';

const ev = (o) => ({ id: 'e', type: 'Birthday', isDestination: true, ...o });

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

  test('Vrbo still goes to the front door — its terms forbid deep links', () => {
    const v = lodgingSearchLinks(dest).find((l) => l.id === 'vrbo');
    expect(v.href).toBe('https://www.vrbo.com/');
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
    expect(b.detail).toContain('2028-06-17 to 2028-06-21');
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
