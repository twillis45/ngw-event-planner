// Reality-Fix 2 P4 — pairwise (not adjacent-only) run-of-show overlap detection.
import { rosOverlapCount, parseRosMin } from '../rosOverlap';

describe('parseRosMin', () => {
  test('parses HH:MM to minutes', () => {
    expect(parseRosMin('00:00')).toBe(0);
    expect(parseRosMin('11:00')).toBe(660);
    expect(parseRosMin('13:30')).toBe(810);
  });
  test('bad/empty input -> null', () => {
    expect(parseRosMin('')).toBeNull();
    expect(parseRosMin(undefined)).toBeNull();
    expect(parseRosMin('soon')).toBeNull();
  });
});

describe('rosOverlapCount', () => {
  test('clean schedule (no overlaps) -> 0', () => {
    expect(rosOverlapCount([
      { id: 'a', time: '10:00', endTime: '11:00' },
      { id: 'b', time: '11:00', endTime: '12:00' },
      { id: 'c', time: '12:00' },
    ])).toBe(0);
  });

  test('THE BUG: non-adjacent overlap (long runner over a later segment) is caught', () => {
    // a runs 11:00–13:00; b is a point at 11:30 (adjacent); c is a point at 12:30 (NON-adjacent).
    // Old adjacent-only logic missed c. Pairwise catches both b and c -> 3 segments involved.
    const n = rosOverlapCount([
      { id: 'a', time: '11:00', endTime: '13:00' },
      { id: 'b', time: '11:30' },
      { id: 'c', time: '12:30' },
    ]);
    expect(n).toBe(3);
  });

  test('adjacent interval overlap still detected', () => {
    expect(rosOverlapCount([
      { id: 'a', time: '11:00', endTime: '12:30' },
      { id: 'b', time: '12:00', endTime: '13:00' },
    ])).toBe(2);
  });

  test('equal-start point segments overlap (can\'t be two places at once)', () => {
    expect(rosOverlapCount([
      { id: 'a', time: '14:00' },
      { id: 'b', time: '14:00' },
    ])).toBe(2);
  });

  test('touching but not overlapping (end == next start) is clean', () => {
    expect(rosOverlapCount([
      { id: 'a', time: '10:00', endTime: '11:00' },
      { id: 'b', time: '11:00', endTime: '12:00' },
    ])).toBe(0);
  });

  test('rows without a parseable time are ignored', () => {
    expect(rosOverlapCount([
      { id: 'a', time: '' },
      { id: 'b', time: '11:00', endTime: '13:00' },
      { id: 'c', time: '12:00' },
    ])).toBe(2);
  });
});
