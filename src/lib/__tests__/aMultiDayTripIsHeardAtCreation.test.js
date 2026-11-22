// ─── A MULTI-DAY TRIP IS HEARD AT CREATION (owner report, 11/21/2026) ───────
//
// "Multi day trip not being picked up at creation." Measured through the real
// creation flow before this file (390px, clock pinned to Sat 11/21/2026):
//
//   "Girls trip to Nashville Dec 3-6"         Group Trip, Dec 3–6     kept
//   "trip to Nashville Dec 3 – Dec 6 for 8"   NO OCCASION — "Put my plan together" never shows
//   "12/3-12/6 Nashville trip"                NO OCCASION — same
//   "team retreat Jan 14-16"                  NO OCCASION (Team Retreat is not a host type)
//   "next weekend camping trip"               NO OCCASION, no dates, nothing asked
//   "family reunion July 4th weekend"         Jul 4 + statedNights 2 — Space "One day"
//   "Mom's 80th … June 14 2027 … 3 nights"    Jun 14–17 kept; the reveal never names the span
//
// The parse kept every explicit span. What it lost was the TRIP (a bare "trip"
// is refused by the taxonomy, so a trip with two dates had no occasion) and the
// relative weekends, which either invented a length or said nothing.
//
// The honest rule for a relative phrase: resolve it only when today's date
// makes it unambiguous, otherwise keep the start she said (if any) and mark the
// days as owed (`datesToConfirm`), which the reveal and Date & time ask for as a
// range. Never a guessed last day.
import { parseSmartEventText } from '../smartParseEvent';

const NOW = new Date('2026-11-21T12:00:00'); // a Saturday
const p = (s) => parseSmartEventText(s, { now: NOW });

const SANTA_FE = "Mom's 80th birthday in Santa Fe New Mexico on June 14 2027, about 30 people flying in for 3 nights, dinner at an adobe courtyard, she uses a walker and the altitude is hard on her";

// [sentence, type, date, endDate, datesToConfirm]
const MULTI = [
  ['Girls trip to Nashville Dec 3-6', 'Group Trip', '2026-12-03', '2026-12-06', false],
  ['Nashville girls trip December 3 through 6', 'Group Trip', '2026-12-03', '2026-12-06', false],
  ['trip to Nashville Dec 3 – Dec 6 for 8', 'Group Trip', '2026-12-03', '2026-12-06', false],
  ['12/3-12/6 Nashville trip', 'Group Trip', '2026-12-03', '2026-12-06', false],
  ['3 nights in Nashville starting Dec 3', null, '2026-12-03', '2026-12-06', false],
  // Team Retreat is deliberately outside HOST_TYPES (smartParseEvent): an owner call.
  ['team retreat Jan 14-16', null, '2027-01-14', '2027-01-16', false],
  ['bachelorette weekend in Austin March 6-8', 'Bachelorette Party', '2027-03-06', '2027-03-08', false],
  // Owner ruling 11/22/2026, "trip wins": a trip over Dec 31 is a Group Trip,
  // and the 31st is its celebration night (aHolidayInsideATripIsTheTripsNight).
  ['Dec 30 - Jan 2 NYE trip', 'Group Trip', '2026-12-30', '2027-01-02', false],
  [SANTA_FE, 'Birthday', '2027-06-14', '2027-06-17', false],
];

// Relative phrases: the length or the start may be known; the days are owed.
// [sentence, type, date, endDate, nights, datesToConfirm]
const RELATIVE = [
  // Which Thursday is not said; that it is three nights is. Owner ruling
  // 11/22/2026 ("Resolve to the next one with the date shown so she can fix it
  // as well."): the next Thursday through that Sunday, so nothing is owed and
  // the length lives in the two dates, as for any typed range.
  ['Thursday to Sunday in Nashville', null, '2026-11-26', '2026-11-29', null, false],
  // A long weekend is two nights to some and three to others: not guessed.
  ['a long weekend in Nashville', null, null, null, null, true],
  // July 4, 2027 is a Sunday: the weekend around it is not July 4–6.
  ['family reunion July 4th weekend', 'Reunion', '2027-07-04', null, null, true],
  // Said on a Saturday, "next weekend" is Nov 28–29 to some and Dec 5–6 to
  // others. Owner ruling 11/22/2026 ("Resolve to the next one with the date
  // shown so she can fix it as well."): this weekend is today, next weekend
  // the Saturday after, shown so she can change it. The last day is still owed.
  ['next weekend camping trip', 'Group Trip', '2026-11-28', null, 2, true],
];

// One day, and must stay one day. A time range is not a date range.
const SINGLE = [
  ["Friendsgiving this Saturday at 4 pm at Vida's for 15", 'Friendsgiving', '2026-11-28'],
  ['Dinner Dec 3 at 6-9pm', 'Dinner Party', '2026-12-03'],
  ['crab feast July 12, 2-6pm', 'Crab Feast', '2027-07-12'],
];

describe('a stated span keeps its start AND its end, and a trip is a trip', () => {
  test.each(MULTI)('%s', (s, type, date, endDate, owed) => {
    const r = p(s);
    expect([r.type, r.date, r.endDate, !!r.datesToConfirm]).toEqual([type, date, endDate, owed]);
  });
});

describe('a relative multi-day phrase never invents a last day, and says the days are owed', () => {
  test.each(RELATIVE)('%s', (s, type, date, endDate, nights, owed) => {
    const r = p(s);
    expect([r.type, r.date, r.endDate, r.nights, !!r.datesToConfirm]).toEqual([type, date, endDate, nights, owed]);
  });
});

describe('one-day controls stay one day — "6-9pm" is a time, not two dates', () => {
  test.each(SINGLE)('%s', (s, type, date) => {
    const r = p(s);
    expect([r.type, r.date, r.endDate, !!r.datesToConfirm]).toEqual([type, date, null, false]);
  });
});

describe('the Santa Fe 80th, the recorded intake sentence', () => {
  test('every field the creation audit lists', () => {
    const r = p(SANTA_FE);
    expect(r).toMatchObject({
      type: 'Birthday', milestone: '80th', honoree: 'Mom', guests: 30,
      date: '2027-06-14', endDate: '2027-06-17', nights: 3,
      isDestination: true, destinationBasis: 'travel-language', travelMode: 'fly', overnight: true,
      timeOfDay: 'evening', venueCity: 'Santa Fe', venueState: 'NM',
      healthNoted: { yes: true, quote: 'the altitude is hard on her' },
    });
  });
});

describe('trips that are not a friends’ trip stay unclassified', () => {
  test.each([
    'business trip to Chicago Dec 3-5',
    'field trip to the museum Dec 3',
    'day trip to the beach Dec 3',
  ])('%s', (s) => {
    expect(p(s).type).not.toBe('Group Trip');
  });
});
