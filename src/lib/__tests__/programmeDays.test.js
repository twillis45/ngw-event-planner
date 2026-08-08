import { programmeDays, dayOfRow, minuteWithinDay, isMultiDay, dayPhases } from '../dayPhases';

// THE KEYSTONE, pinned.
//
// playbooks/index.js has emitted day-aware rows for a while — `day`, a
// "Day 2 · afternoon" rel, and `_min: (day-1)*1440 + hour*60` absolute across
// the span. dayPhases read `.day` ZERO times, so every day-2 row sat 1440+
// minutes past the anchor and could only classify as 'program' or 'wrap'. The
// four phases did not repeat across the span, they smeared along it.
//
// These tests exist to stop that regressing, and to prove the single-day path
// did not change while the multi-day path was added.

const D = 1440;
const row = (id, day, hour, type = 'event', done = false) => ({
  id, day, type, done,
  _min: (day - 1) * D + hour * 60,
});

describe('dayOfRow / minuteWithinDay — the day dimension', () => {
  it('prefers the row\'s explicit day', () => {
    expect(dayOfRow({ day: 3, _min: 0 })).toBe(3);
  });

  it('derives the day from an absolute _min when none is authored', () => {
    expect(dayOfRow({ _min: 0 })).toBe(1);
    expect(dayOfRow({ _min: 10 * 60 })).toBe(1);
    expect(dayOfRow({ _min: D })).toBe(2);
    expect(dayOfRow({ _min: 2 * D + 9 * 60 })).toBe(3);
  });

  it('falls back to day 1 rather than throwing on junk', () => {
    expect(dayOfRow(null)).toBe(1);
    expect(dayOfRow({})).toBe(1);
    expect(dayOfRow({ _min: -5 })).toBe(1);
    expect(dayOfRow({ day: 0 })).toBe(1);
  });

  it('re-expresses an absolute minute on its own day\'s clock', () => {
    expect(minuteWithinDay({ _min: 10 * 60 })).toBe(600);
    expect(minuteWithinDay({ _min: D + 10 * 60 })).toBe(600);      // day 2, 10am
    expect(minuteWithinDay({ _min: 4 * D + 18 * 60 })).toBe(1080); // day 5, 6pm
    expect(minuteWithinDay({})).toBeNull();
  });
});

describe('a single-day event is unchanged — no regression', () => {
  const rows = [
    row('a', 1, 14, 'prep'),   // setup
    row('b', 1, 17, 'event'),  // doors (anchor 17:00)
    row('c', 1, 19, 'event'),  // program
    row('d', 1, 22, 'prep'),   // wrap
  ];
  const anchor = 17 * 60;

  it('returns exactly one day', () => {
    const p = programmeDays(rows, anchor, {});
    expect(p).toHaveLength(1);
    expect(p[0].day).toBe(1);
  });

  it('produces the SAME phases the old flat call produced', () => {
    const flat = dayPhases(rows, anchor, {});
    const [d1] = programmeDays(rows, anchor, {});
    expect(d1.phases.map((x) => x.id)).toEqual(flat.map((x) => x.id));
    expect(d1.phases.map((x) => x.total)).toEqual(flat.map((x) => x.total));
  });

  it('is not multi-day', () => {
    expect(isMultiDay(rows)).toBe(false);
  });
});

describe('a multi-day span phases EACH day, not the span', () => {
  // Two days that open at genuinely different hours — a brunch day and a
  // dinner day. This is the case a single anchor cannot serve.
  const rows = [
    row('d1-setup', 1, 14, 'prep'),
    row('d1-open', 1, 17, 'event'),
    row('d1-main', 1, 19, 'event'),
    row('d2-setup', 2, 8, 'prep'),
    row('d2-open', 2, 10, 'event'),
    row('d2-main', 2, 12, 'event'),
    row('d2-wrap', 2, 15, 'prep'),
  ];
  const anchor = 17 * 60;

  it('returns one entry per day that actually has beats', () => {
    const p = programmeDays(rows, anchor, {});
    expect(p.map((d) => d.day)).toEqual([1, 2]);
    expect(isMultiDay(rows)).toBe(true);
  });

  it('gives day 2 its own Setup and Doors — the whole point', () => {
    const [, d2] = programmeDays(rows, anchor, {});
    const ids = d2.phases.map((p) => p.id);
    // Before the wire, every day-2 row was 1440+ minutes past the anchor, so
    // NOTHING could land in setup or doors on any day after the first.
    expect(ids).toContain('setup');
    expect(ids).toContain('doors');
  });

  it('anchors day 2 on its OWN opening beat, not day 1\'s clock', () => {
    const [, d2] = programmeDays(rows, anchor, {});
    // Day 2 opens at 10:00. Its 08:00 prep must read as setup, and its 10:00
    // beat as doors. Under day 1's 17:00 anchor, BOTH would have been setup.
    const setup = d2.phases.find((p) => p.id === 'setup');
    const doors = d2.phases.find((p) => p.id === 'doors');
    expect(setup.total).toBe(1);
    expect(doors.total).toBe(1);
  });

  it('counts progress per day from the same rosDone ledger', () => {
    const p = programmeDays(rows, anchor, { 'd1-setup': true, 'd1-open': true });
    expect(p[0].done).toBe(2);
    expect(p[0].total).toBe(3);
    expect(p[1].done).toBe(0);
  });

  it('marks the first unfinished day as where the host is standing', () => {
    const allDay1 = { 'd1-setup': true, 'd1-open': true, 'd1-main': true };
    const p = programmeDays(rows, anchor, allDay1);
    expect(p[0].state).toBe('done');
    expect(p[1].state).toBe('now');
  });

  it('never invents a day that has no beats', () => {
    // Day 2 is skipped entirely — a 3-day stay with nothing programmed on the
    // middle day must not render an empty middle day.
    const sparse = [row('a', 1, 17), row('c', 3, 11)];
    expect(programmeDays(sparse, anchor, {}).map((d) => d.day)).toEqual([1, 3]);
  });

  it('orders days numerically even when the rows arrive shuffled', () => {
    const shuffled = [row('c', 3, 11), row('a', 1, 17), row('b', 2, 10)];
    expect(programmeDays(shuffled, anchor, {}).map((d) => d.day)).toEqual([1, 2, 3]);
  });
});

describe('degenerate input never throws', () => {
  it('handles empty, null and clockless rows', () => {
    expect(programmeDays([], 600, {})).toEqual([]);
    expect(programmeDays(null, 600, {})).toEqual([]);
    expect(programmeDays([null, undefined], 600, {})).toEqual([]);
    const clockless = [{ id: 'x', type: 'prep' }, { id: 'y', type: 'event' }];
    const p = programmeDays(clockless, null, {});
    expect(p).toHaveLength(1);
    expect(p[0].phases.length).toBeGreaterThan(0);
  });
});
