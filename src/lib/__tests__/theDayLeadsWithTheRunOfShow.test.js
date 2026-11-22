// ─── ON THE DAY, THE HERO IS THE RUN OF SHOW (audit 2 lane C P0-1, P1-5, P1-7) ─
//
// Seen at 8 AM and 9 PM on all six time-travel events: the day's one loud line
// was a planning chore (insurance, a $12,000 payment, "cook, cater, or
// potluck?", the trip's venue inquiry, ice), the run of show sat fourth or
// fifth showing its FIRST step even at 9 PM, and the 8 AM and 9 PM screens
// were identical. A Group Trip's day 1 showed the planning board while its
// day 3 showed the trip-day view.
//
// `dayOfHero` is the one reader the board's hero and The Day's now-card share:
// on any day of the event it names the day and the cue the clock is on.
// The clock is fixed in every case.
import { dayOfHero, cueByTheClock } from '../dayOfHero';

// The audit's own seeded events (audit2/C/scripts/events.js), trimmed.
const WEDDING = {
  id: 'aud-wedding', name: 'Maya & Jordan’s Wedding', type: 'Wedding', date: '2027-10-16',
  startTime: '16:00', startTimeSource: 'host', venue: 'Bluemont Vineyard', venueCity: 'Bluemont, VA',
  guestMode: 'count', guestCount: 150, totalBudget: 45000, budget: [], guests: [], timeline: [],
  vendors: [
    { id: 'v1', name: 'Bluemont Vineyard', category: 'Venue', status: 'Confirmed', cost: 12000, depositAmt: 4000, depositPaid: true, balancePaid: false, payDueDate: '2027-09-16', contractSigned: true },
  ],
};
const TRIP = {
  id: 'aud-trip', name: 'Girls Trip to Nashville', type: 'Group Trip', date: '2027-05-13', endDate: '2027-05-16',
  isDestination: true, venueCity: 'Nashville', guestMode: 'count', guestCount: 8, totalBudget: 8000,
  budget: [], vendors: [], guests: [], timeline: [],
};
const at = (y, mo, d, h, mi = 0) => new Date(y, mo - 1, d, h, mi);

describe('the hero on the day', () => {
  test('the day before and the day after have no day-of hero', () => {
    expect(dayOfHero(WEDDING, at(2027, 10, 15, 20))).toBeNull();
    expect(dayOfHero(WEDDING, at(2027, 10, 17, 9))).toBeNull();
  });

  test('8 AM on the wedding day: the hero names the day and the first cue, not a chore', () => {
    const h = dayOfHero(WEDDING, at(2027, 10, 16, 8));
    expect(h.headline).toBe('It’s today.');
    expect(h.state).toBe('first');
    expect(h.label).toBe('Up first');
    expect(h.cue.time).toBe('10:00');
    expect(h.cue.segment).toMatch(/Hair \+ makeup/);
  });

  test('9 PM on the wedding day: the cue the clock is on, and it differs from 8 AM', () => {
    const am = dayOfHero(WEDDING, at(2027, 10, 16, 8));
    const pm = dayOfHero(WEDDING, at(2027, 10, 16, 21, 10));
    expect(pm.state).toBe('now');
    expect(pm.label).toBe('Happening now');
    expect(pm.cue.time).toBe('21:00');
    expect(pm.cue.segment).toMatch(/send-off/i);
    expect(pm.cue.id).not.toBe(am.cue.id);
  });

  test('a ticked cue hands the hero to the next one by the clock', () => {
    const rows = [
      { id: 'a', time: '16:00', segment: 'Ceremony' },
      { id: 'b', time: '17:00', segment: 'Cocktails' },
      { id: 'c', time: '18:00', segment: 'Dinner' },
    ];
    expect(cueByTheClock(rows, 17 * 60 + 15)).toMatchObject({ state: 'now', cue: { id: 'b' } });
    expect(cueByTheClock(rows.map((r) => (r.id === 'b' ? { ...r, done: true } : r)), 17 * 60 + 15))
      .toMatchObject({ state: 'next', cue: { id: 'c' } });
    expect(cueByTheClock(rows.map((r) => ({ ...r, done: true })), 17 * 60)).toMatchObject({ state: 'done', cue: null });
  });

  test('a run of show with no times still leads, with its first open cue', () => {
    const ev = { ...WEDDING, ros: [{ id: 'x', segment: 'Set the chairs' }, { id: 'y', segment: 'Doors' }], rosEdited: true };
    const h = dayOfHero(ev, at(2027, 10, 16, 9));
    expect(h.state).toBe('untimed');
    expect(h.cue.id).toBe('x');
  });
});

describe('a multi-day trip is one kind of day, every day (P1-5)', () => {
  test('day 1 and day 3 both get the trip-day hero', () => {
    const d1 = dayOfHero(TRIP, at(2027, 5, 13, 9));
    const d3 = dayOfHero(TRIP, at(2027, 5, 15, 9));
    expect(d1 && d1.headline).toBe('Day 1 of 4.');
    expect(d3 && d3.headline).toBe('Day 3 of 4.');
    expect(d1.dayCount).toBe(4);
  });

  test('the last evening is still a trip day; the morning after is not', () => {
    expect(dayOfHero(TRIP, at(2027, 5, 16, 21)).headline).toBe('Day 4 of 4.');
    expect(dayOfHero(TRIP, at(2027, 5, 17, 9))).toBeNull();
  });
});
