// ─── ONE READER FOR "WHERE IS THE DAY" ──────────────────────────────────────
//
// hostv2's The Day derived the day's position inline (nowMin, the cue the
// clock is on, the open cues, "doors open", "all done"), and hostv4 is about
// to build its own The Day. Two shells deriving the same facts twice is how
// day-of screens come to disagree. `dayState` is the one pure reader both
// use. Every case fixes the clock.
import { dayState } from '../dayState';

const at = (y, mo, d, h, mi = 0) => new Date(y, mo - 1, d, h, mi);

// Thanksgiving, one day: prep before the doors, guests at 3 PM.
const THANKSGIVING = { id: 'tg', type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00' };
const TG_ROS = [
  { id: 'a', time: '09:00', segment: 'Turkey in' },
  { id: 'b', time: '3:00 PM', segment: 'Guests arrive' }, // 12h form
  { id: 'c', time: '17:00', segment: 'Dinner' },
];

// A three-day trip with no start time: the first cue stands in for the doors.
const TRIP = { id: 'trip', type: 'Group Trip', date: '2027-05-13', endDate: '2027-05-15' };
const DAY2_ROS = [
  { id: 'd2a', day: 2, time: '10:00', segment: 'Brunch' },
  { id: 'd2b', day: 2, time: '2:00 PM', segment: 'Boat tour' },
];

describe('the phase of the day', () => {
  test('the day before a one-day event: before', () => {
    const s = dayState(THANKSGIVING, TG_ROS, at(2026, 11, 25, 20));
    expect(s.phase).toBe('before');
    expect(s.dayIndex).toBeNull();
    expect(s.dayCount).toBe(1);
  });

  test('7 AM on the day, nothing started: morning, doors shut, the first cue is up first', () => {
    const s = dayState(THANKSGIVING, TG_ROS, at(2026, 11, 26, 7));
    expect(s.phase).toBe('morning');
    expect(s.dayIndex).toBe(1);
    expect(s.nowMin).toBe(420);
    expect(s.doorsOpen).toBe(false);
    expect(s.started).toBe(false);
    expect(s.nowCue.id).toBe('a');
    expect(s.nowActive).toBe(false);
    expect(s.openCues).toHaveLength(3);
    expect(s.allDone).toBe(false);
  });

  test('10 AM, the turkey is in but no guests yet: still morning', () => {
    const s = dayState(THANKSGIVING, TG_ROS, at(2026, 11, 26, 10));
    expect(s.phase).toBe('morning');
    expect(s.doorsOpen).toBe(false);
    expect(s.started).toBe(true);
    expect(s.nowCue.id).toBe('a');
    expect(s.nowActive).toBe(true);
    expect(s.nextCue.id).toBe('b');
  });

  test('3:30 PM, guests due: under way, and the 12h cue reads as 3 PM, not 3 AM', () => {
    const s = dayState(THANKSGIVING, TG_ROS, at(2026, 11, 26, 15, 30));
    expect(s.phase).toBe('under-way');
    expect(s.doorsOpen).toBe(true);
    expect(s.nowCue.id).toBe('b');
    expect(s.nowActive).toBe(true);
    expect(s.nextCue.id).toBe('c');
  });

  test('every cue ticked: done for today', () => {
    const done = TG_ROS.map((r) => ({ ...r, done: true }));
    const s = dayState(THANKSGIVING, done, at(2026, 11, 26, 21));
    expect(s.phase).toBe('done-for-today');
    expect(s.allDone).toBe(true);
    expect(s.openCues).toHaveLength(0);
    expect(s.nowCue).toBeNull();
    expect(s.nextCue).toBeNull();
  });

  test('the day after a one-day event: after', () => {
    expect(dayState(THANKSGIVING, TG_ROS, at(2026, 11, 27, 9)).phase).toBe('after');
  });
});

describe('a three-day trip', () => {
  test('the day before: before, three days', () => {
    const s = dayState(TRIP, [], at(2027, 5, 12, 9));
    expect(s.phase).toBe('before');
    expect(s.dayCount).toBe(3);
  });

  test('day 1 at 8 AM, nothing started and no start time: morning, day 1 of 3', () => {
    const ros = [{ id: 'd1a', time: '11:00', segment: 'Check in' }];
    const s = dayState(TRIP, ros, at(2027, 5, 13, 8));
    expect(s.phase).toBe('morning');
    expect(s.dayIndex).toBe(1);
    expect(s.dayCount).toBe(3);
    expect(s.doorsOpen).toBe(false);
  });

  test('day 2 at 2:30 PM: under way, day 2 of 3, on the 2 PM cue', () => {
    const s = dayState(TRIP, DAY2_ROS, at(2027, 5, 14, 14, 30));
    expect(s.phase).toBe('under-way');
    expect(s.dayIndex).toBe(2);
    expect(s.dayCount).toBe(3);
    expect(s.doorsOpen).toBe(true);
    expect(s.nowCue.id).toBe('d2b');
    expect(s.nowActive).toBe(true);
  });

  test('day 2 at 7 AM with a cue already ticked: the doors count as open', () => {
    const ros = [{ ...DAY2_ROS[0], done: true }, DAY2_ROS[1]];
    const s = dayState(TRIP, ros, at(2027, 5, 14, 7));
    expect(s.doorsOpen).toBe(true);
    expect(s.phase).toBe('under-way');
    expect(s.openCues.map((r) => r.id)).toEqual(['d2b']);
    expect(s.nowCue.id).toBe('d2b');
    expect(s.nowActive).toBe(false);
  });

  test('the day after the last day: after', () => {
    expect(dayState(TRIP, DAY2_ROS, at(2027, 5, 16, 9)).phase).toBe('after');
  });
});

describe('doors open', () => {
  test('with a start time, the clock decides, cues or not', () => {
    const ev = { ...THANKSGIVING, startTime: '2:00 PM' };
    expect(dayState(ev, [], at(2026, 11, 26, 13, 59)).doorsOpen).toBe(false);
    expect(dayState(ev, [], at(2026, 11, 26, 14)).doorsOpen).toBe(true);
    // A ticked cue does not open the doors when her start time says not yet.
    const ticked = [{ ...TG_ROS[0], done: true }];
    expect(dayState(ev, ticked, at(2026, 11, 26, 10)).doorsOpen).toBe(false);
  });

  test('without a start time, the first cue that has started stands in', () => {
    const ev = { ...THANKSGIVING, startTime: '' };
    expect(dayState(ev, TG_ROS, at(2026, 11, 26, 8, 59)).doorsOpen).toBe(false);
    expect(dayState(ev, TG_ROS, at(2026, 11, 26, 9)).doorsOpen).toBe(true);
    expect(dayState(ev, [], at(2026, 11, 26, 12)).doorsOpen).toBe(false);
  });
});

describe('one time parser, both stored forms', () => {
  test('"14:00" and "2:00 PM" put the clock on the same cue', () => {
    const now = at(2026, 11, 26, 14, 15);
    const h24 = dayState(THANKSGIVING, [{ id: 'x', time: '14:00' }, { id: 'y', time: '16:00' }], now);
    const h12 = dayState(THANKSGIVING, [{ id: 'x', time: '2:00 PM' }, { id: 'y', time: '4:00 PM' }], now);
    expect(h24.nowCue.id).toBe('x');
    expect(h12.nowCue.id).toBe('x');
    expect(h24.nowActive).toBe(true);
    expect(h12.nowActive).toBe(true);
    expect(h12.nextCue.id).toBe('y');
  });
});
