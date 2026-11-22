// ─── A HOLIDAY INSIDE A TRIP: THE TRIP WINS, THE HOLIDAY IS ITS NIGHT ────────
//
// Owner ruling, 11/22/2026: "trip wins". "New Year's Eve trip to Nashville
// Dec 30 – Jan 2 for 12 friends" was heard as a New Year's Eve Party — a
// one-night party playbook over a four-day trip, with a dinner card titled
// "My dinner" and its night unpicked although she had said which night. A
// multi-night trip that spans Dec 31 is a Group Trip, and Dec 31 is the night
// of its celebration dinner (#222's "dinner inside the trip"), as she said it.
//
// Second ruling, same day: "dates first as the main ask". A trip whose start
// is known and whose end is not ("July 4th weekend trip to the lake") is a
// Group Trip too — a weekend spans days — and the days it still owes are
// asked as a range.
import { parseSmartEventText } from '../smartParseEvent';
import { celebrationFieldsToPersist, celebrationAppliesWith, celebrationNight, celebrationTitle } from '../tripMeals';
import { getPlaybook } from '../playbooks';

const NOW = new Date('2026-11-22T12:00:00');
const p = (text) => parseSmartEventText(text, { now: NOW });
const NYE_TRIP = "New Year's Eve trip to Nashville Dec 30 – Jan 2 for 12 friends";

describe('a New Year’s Eve trip is a Group Trip, with Dec 31 as its night', () => {
  test.each([
    [NYE_TRIP, '2026-12-30', '2027-01-02', '2026-12-31'],
    ['NYE trip to Nashville 12/30-1/2 for 12', '2026-12-30', '2027-01-02', '2026-12-31'],
    ['New Years Eve getaway to Miami Dec 29 – Jan 1 for 6', '2026-12-29', '2027-01-01', '2026-12-31'],
  ])('%s', (text, date, endDate, night) => {
    const r = p(text);
    expect([r.type, r.date, r.endDate]).toEqual(['Group Trip', date, endDate]);
    expect([r.celebrationNight, r.celebrationOccasion]).toEqual([night, 'New Year’s Eve']);
  });

  test('a party on the night stays a New Year’s Eve Party', () => {
    const r = p("New Year's Eve party December 31 for 20");
    expect(r.type).toBe("New Year's Eve Party");
    expect(r.celebrationNight).toBe(null);
  });

  test('a trip whose days miss Dec 31 does not borrow the night', () => {
    const r = p("New Year's trip to Nashville Jan 1 – Jan 4 for 12");
    expect(r.celebrationNight).toBe(null);
  });

  test('creation writes the night and the occasion she said, beside any place she named', () => {
    expect(celebrationFieldsToPersist(NYE_TRIP, p(NYE_TRIP)))
      .toEqual({ celebration: { night: '2026-12-31', occasion: 'New Year’s Eve' } });
    const withPlace = `${NYE_TRIP}, dinner at a rooftop bar`;
    expect(celebrationFieldsToPersist(withPlace, p(withPlace)))
      .toEqual({ celebration: { place: 'rooftop bar', night: '2026-12-31', occasion: 'New Year’s Eve' } });
    // Nothing heard about a night: only the place, as before.
    expect(celebrationFieldsToPersist('dinner at an adobe courtyard', {})).toEqual({ celebration: { place: 'adobe courtyard' } });
  });

  test('the Group Trip carries that dinner, picked on Dec 31 and named for the night', () => {
    const r = p(NYE_TRIP);
    const ev = {
      type: r.type, name: 'My Group Trip', date: r.date, endDate: r.endDate, isDestination: r.isDestination,
      ...celebrationFieldsToPersist(NYE_TRIP, r),
    };
    expect(celebrationAppliesWith(ev, getPlaybook(ev.type))).toBe(true);
    const n = celebrationNight(ev);
    expect([n.picked, n.iso, n.index]).toEqual([true, '2026-12-31', 2]);
    expect(celebrationTitle(ev)).toBe('New Year’s Eve dinner');
  });

  test('a Group Trip with no occasion said still has no dinner of its own', () => {
    const ev = { type: 'Group Trip', date: '2027-06-04', endDate: '2027-06-07', isDestination: true, celebration: {} };
    expect(celebrationAppliesWith(ev, getPlaybook('Group Trip'))).toBe(false);
  });
});

describe('a weekend trip with only its start is a Group Trip whose days are owed', () => {
  test('July 4th weekend trip to the lake', () => {
    const r = p('July 4th weekend trip to the lake');
    expect([r.type, r.date, r.endDate, r.datesToConfirm]).toEqual(['Group Trip', '2027-07-04', null, true]);
  });
  test('a bare trip with nothing said about its days is still refused', () => {
    expect(p('trip to the lake').type).toBe(null);
  });
});
