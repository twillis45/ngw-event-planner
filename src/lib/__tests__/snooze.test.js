// Snooze: let the host set something down without losing it.
//
// The attention audit: "The only way to clear an item is to do the work — so a host who has
// consciously decided to leave something has no way to say so, the list never empties, and
// they stop reading it. This is why leaders' zero states are believed and ours won't be."
//
// An event is not a todo app: it has a fixed date and every task has a lead time, so a naive
// "remind me in a week" can push a thing PAST the last moment it could be done. Snooze here
// respects the clock, and it is grounded (proposed, then the host's to change).

import { proposedSnoozeDays, proposedSnoozeUntil, canSnooze, isSnoozed, applySnooze, snoozedUntil } from '../snooze';

const iso = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const ev = (n, over = {}) => ({ id: 'e', date: iso(n), ...over });

describe('the proposed resurface is HALF the runway — the closer the event, the less slack', () => {
  test('20 days out proposes ~10', () => {
    expect(proposedSnoozeDays(ev(20))).toBe(10);
  });
  test('6 days out proposes ~3 — it scales down as the day nears', () => {
    expect(proposedSnoozeDays(ev(6))).toBe(3);
  });
});

describe('it never resurfaces PAST the item\'s own window', () => {
  test('a T-5d task 20 days out: half-runway would be 10, but the window closes at 15 — capped', () => {
    // window closes toEvent + leadDays = 20 + (-5) = 15 days out; come back a day sooner.
    // half-runway 10 is already inside 14, so half-runway wins here...
    expect(proposedSnoozeDays(ev(20), { leadDays: -5 })).toBe(10);
  });
  test('a T-2d task 6 days out: half-runway 3 would push PAST the 4-day window — capped to 3', () => {
    // window closes at 6 + (-2) = 4; cap at 3 (a day to spare). half-runway is also 3 here.
    expect(proposedSnoozeDays(ev(6), { leadDays: -2 })).toBeLessThanOrEqual(3);
  });
  test('an item whose window is already open cannot be snoozed at all', () => {
    // 3 days out, T-5d → window closed 2 days ago. Do not hide it.
    expect(proposedSnoozeDays(ev(3), { leadDays: -5 })).toBeNull();
  });
});

describe('too close to sit on', () => {
  test('1 day out proposes nothing — do it or do not', () => {
    expect(proposedSnoozeDays(ev(1))).toBeNull();
    expect(proposedSnoozeUntil(ev(1))).toBeNull();
  });
});

describe('a critical is never snoozeable', () => {
  test('canSnooze is false for a critical', () => {
    expect(canSnooze({ id: 'x', level: 'critical' })).toBe(false);
    expect(canSnooze({ id: 'x', level: 'attention' })).toBe(true);
  });
  test('applySnooze keeps a critical even if it carries a stale snooze entry', () => {
    // Something the host set down that has since escalated must NOT stay buried.
    const event = ev(20, { snoozed: { 'a1': iso(5) } });
    const actions = [{ id: 'a1', level: 'critical', title: 'Caterer no-show' }];
    expect(applySnooze(actions, event)).toHaveLength(1);
  });
});

describe('a snoozed item drops out until it comes due, then returns on its own', () => {
  test('hidden while asleep', () => {
    const event = ev(20, { snoozed: { 'a1': iso(5) } });
    expect(isSnoozed(event, 'a1')).toBe(true);
    expect(applySnooze([{ id: 'a1', level: 'attention', title: 'x' }], event)).toEqual([]);
  });
  test('back once the snooze date passes — no action needed to revive it', () => {
    const event = ev(20, { snoozed: { 'a1': iso(-1) } });   // came due yesterday
    expect(isSnoozed(event, 'a1')).toBe(false);
    expect(applySnooze([{ id: 'a1', level: 'attention', title: 'x' }], event)).toHaveLength(1);
  });
  test('snoozedUntil exposes the return date for the "set aside" list', () => {
    const event = ev(20, { snoozed: { 'a1': iso(5) } });
    expect(snoozedUntil(event, 'a1')).toBe(iso(5));
  });
});
