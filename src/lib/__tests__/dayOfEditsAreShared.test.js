// THE DAY'S EDITS, ONE SOURCE (owner, 11/26/2026: "Start building the day-of
// screens"). hostv4's The Day writes the same fields hostv2's day view writes:
// a finished step is event.rosDone, a confirmed check is event.safetyChecked, a
// check that IS a checklist step is that step. Both shells read and write here.
import { todaysRos, dayOfList, dayOfTickEdit, cuesDoneEdit, ridesDue, nextDayOfCheck } from '../dayOfEdits';
import { dayState } from '../dayState';

const TG = { id: 'tg', type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00', startTimeSource: 'host', guestEstimate: 14, venueKind: 'home', foodChoices: { drinks: 'Full bar' }, guests: [], vendors: [], timeline: [] };
const at = (hm) => new Date('2026-11-26T' + hm + ':00');

describe('todaysRos', () => {
  test('the day’s schedule, in order, with done read from rosDone', () => {
    const ros = todaysRos({ ...TG, rosDone: {} }, at('07:00'));
    expect(ros.length).toBeGreaterThan(8);
    expect(ros[0].time).toBe('09:00');
    const first = ros[0].id;
    expect(todaysRos({ ...TG, rosDone: { [first]: true } }, at('07:00'))[0].done).toBe(true);
  });
});

describe('dayOfList', () => {
  test('Thanksgiving: its own 10 checks, with the sober-ride check, none checked', () => {
    const l = dayOfList(TG);
    expect(l.items.length).toBe(10);
    expect(l.items.some((i) => i.key === 'rides')).toBe(true);
    expect(l.done).toBe(0);
    expect(l.items.every((i) => i.checked === false && i.via === 'tick')).toBe(true);
  });
  test('a tick is read back from safetyChecked', () => {
    const l = dayOfList({ ...TG, safetyChecked: { thaw: true } });
    expect(l.items.find((i) => i.key === 'thaw').checked).toBe(true);
    expect(l.done).toBe(1);
  });
});

describe('dayOfTickEdit', () => {
  test('checks, then reopens, with a line each way', () => {
    const on = dayOfTickEdit(TG, 'thaw');
    expect(on.patch).toEqual({ safetyChecked: { thaw: true } });
    expect(on.msg).toMatch(/^Confirmed: The turkey is fully thawed/);
    const off = dayOfTickEdit({ ...TG, ...on.patch }, 'thaw');
    expect(off.patch).toEqual({ safetyChecked: {} });
    expect(off.msg).toMatch(/^Reopened:/);
  });
});

describe('cuesDoneEdit', () => {
  test('one or many steps done, on the same rosDone ledger', () => {
    const ed = cuesDoneEdit({ ...TG, rosDone: { a: true } }, ['b', 'c']);
    expect(ed.patch).toEqual({ rosDone: { a: true, b: true, c: true } });
    expect(ed.msg).toBe('2 steps marked done.');
    expect(cuesDoneEdit(TG, ['b'], 'Done: baste').msg).toBe('Done: baste');
    expect(cuesDoneEdit(TG, [])).toBe(null);
  });
});

describe('earlier steps fold away', () => {
  test('at 8:10 PM with nothing ticked, the 12 steps before the current one are “earlier”', () => {
    const ros = todaysRos(TG, at('20:10'));
    const st = dayState(TG, ros, at('20:10'));
    expect(st.nowCue.time).toBe('19:30');
    expect(st.earlierCues.length).toBe(12);
    expect(st.earlierCues.includes(st.nowCue)).toBe(false);
  });
  test('in the morning, before the first step, nothing is earlier', () => {
    const ros = todaysRos(TG, at('07:30'));
    expect(dayState(TG, ros, at('07:30')).earlierCues).toEqual([]);
  });
});

describe('ridesDue: the sober-ride check comes back for the end of the night', () => {
  test('due from two hours before the last step, while unchecked', () => {
    const ros = todaysRos(TG, at('18:00'));
    expect(ridesDue(TG, ros, at('18:00'))).toBe(false);
    expect(ridesDue(TG, ros, at('18:45')).label).toBe('Everyone has a sober way home');
    expect(ridesDue({ ...TG, safetyChecked: { rides: true } }, ros, at('18:45'))).toBe(false);
  });
  test('no alcohol picked, no ride check', () => {
    const dry = { ...TG, type: 'Kids Birthday Party', foodChoices: { alcohol: 'No alcohol' }, choiceSource: { alcohol: 'host' } };
    expect(ridesDue(dry, todaysRos(dry, at('18:45')), at('18:45'))).toBe(false);
  });
});

describe('nextDayOfCheck', () => {
  test('the first unchecked check, most important first', () => {
    expect(nextDayOfCheck(TG).key).toBe('thaw');
    expect(nextDayOfCheck({ ...TG, safetyChecked: { thaw: true } }).key).toBe('ovenmap');
  });
});
