// ─── THE DAYS A TRIP STILL OWES ARE THE BOARD'S MAIN ASK ────────────────────
//
// Owner ruling, 11/22/2026: "dates first as the main ask". "July 4th weekend
// trip to the lake" is a Group Trip with its start known and its end owed
// (`datesToConfirm`). The board led with "Set your budget." and the dates were
// not on it at all: the foundation ladder's date rung counted the start as the
// whole date, so it only asked to confirm the start time, and ranked that last.
//
// The stay, the meals per day and the budget's multi-day range all count from
// both ends of the trip, so an owed range is the first foundation, the same as
// a missing date. It asks for the range, From – To (owner 11/21/2026: "Host
// should be asked for ranges not last day").
import { eventPlan } from '../../CommandCenter';
import { heroAskFor } from '../heroAsk';

const NOW = new Date('2026-11-22T12:00:00');
const TRIP = {
  id: 'lake', type: 'Group Trip', name: 'My Group Trip', date: '2027-07-04', datesToConfirm: true,
  isDestination: true, guestEstimate: 8, startTime: '15:00', startTimeSource: 'derived',
};

beforeAll(() => { jest.useFakeTimers(); jest.setSystemTime(NOW); });
afterAll(() => { jest.useRealTimers(); });

describe('owed dates lead the board, asked as a range', () => {
  test.each([
    ['a known start, the end owed', TRIP],
    ['no day at all, the days owed', { ...TRIP, date: '' }],
  ])('%s', (_label, ev) => {
    const top = eventPlan(ev).nextActions[0];
    expect([top.domain, top.route && top.route.focusField]).toEqual(['date', 'event-date']);
    expect(heroAskFor(top, ev)).toBe('Which dates? From – to.');
    expect(JSON.stringify(eventPlan(ev).nextActions)).not.toMatch(/last day|which day does it end/i);
  });

  test('once the range is given, the dates stop leading', () => {
    const ev = { ...TRIP, endDate: '2027-07-06', datesToConfirm: null };
    const top = eventPlan(ev).nextActions[0];
    expect(top.domain).not.toBe('date');
  });
});
