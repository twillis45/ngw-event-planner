// ─── "THEN, IN ORDER" SHOWS TIMING AND BLOCKING TOGETHER (owner, 11/24/2026) ──
//
// Render 3: a row that other steps wait on AND that has a deadline said only
// "other steps wait on this", and a dated row past a week out said nothing.
// The owner ruled:
//   - a row with both a deadline and gateHolder shows both, compactly:
//     "by Tue · others wait on it";
//   - the day is the weekday from dueInDays, relative to today, in the repo's
//     date vocabulary, owned by the time-status module;
//   - a row with a date always shows its date.
// getActionReason still returns ONE reason; its text carries both halves.
import { getActionReason } from '../actionReason';
import { dueByLabel, timeStatusLabel } from '../timeStatusLabel';

// Monday, November 23, 2026, at noon: Thursday 11/26 is three days out.
const MON = new Date('2026-11-23T12:00:00');

describe('the time-status module owns the "by <day>" vocabulary', () => {
  test('a day this week reads as its weekday', () => {
    expect(dueByLabel(1, MON)).toBe('by Tue');
    expect(dueByLabel(2, MON)).toBe('by Wed');
    expect(dueByLabel(6, MON)).toBe('by Sun');
  });
  test('a week or more out reads as its date, never an ambiguous weekday', () => {
    expect(dueByLabel(7, MON)).toBe('by Nov 30');
    expect(dueByLabel(40, MON)).toBe('by Jan 2');
  });
  test('today and past keep the existing words', () => {
    expect(dueByLabel(0, MON)).toBe(timeStatusLabel(0));
    expect(dueByLabel(-3, MON)).toBe(timeStatusLabel(-3));
  });
  test('no date, no label', () => {
    expect(dueByLabel(undefined, MON)).toBeNull();
    expect(dueByLabel(NaN, MON)).toBeNull();
  });
});

describe('a row shows its timing and its blocking together', () => {
  test('deadline + gateHolder: "by Tue · others wait on it"', () => {
    const r = getActionReason({ title: 'Plan the food', gateHolder: true, dueInDays: 1 }, { now: MON });
    expect(r.text).toBe('by Tue · others wait on it');
    expect(r.type).toBe('blocking');
  });
  test('deadline + a counted unlock carries both too', () => {
    expect(getActionReason({ title: 'Lock the headcount', gateHolder: true, unlocks: 3, dueInDays: 2 }, { now: MON }).text)
      .toBe('by Wed · unblocks 3 more steps');
  });
  test('gateHolder with no date is unchanged', () => {
    expect(getActionReason({ title: 'Plan the food', gateHolder: true }, { now: MON }).text).toBe('other steps wait on this');
  });
  test('a dated row shows its date: "by Wed"', () => {
    expect(getActionReason({ title: 'Buy the remaining items · 27 left', dueInDays: 2 }, { now: MON }).text).toBe('by Wed');
  });
  test('a row with a date always shows its date, however far out', () => {
    expect(getActionReason({ title: 'Book the venue', dueInDays: 40 }, { now: MON }).text).toBe('by Jan 2');
  });
  test('a date outranks an authored consequence', () => {
    expect(getActionReason({ title: 'Send the invites', dueInDays: 2, consequence: 'Guests need runway to answer.' }, { now: MON }).text).toBe('by Wed');
  });
  test('both halves fit the row cap', () => {
    for (let d = -2; d <= 400; d += 1) {
      const r = getActionReason({ title: 'X', gateHolder: true, unlocks: 12, dueInDays: d }, { now: MON });
      expect(r && r.text.length).toBeLessThanOrEqual(40);
    }
  });
});
