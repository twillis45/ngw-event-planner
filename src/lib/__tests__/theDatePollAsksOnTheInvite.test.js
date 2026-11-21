// ─── THE DATE POLL ASKS ON THE INVITE (owner pick B, 11/21/2026) ─────────────
//
// Group Trip's "Offer two or three date ranges…" and Team Retreat's "Poll the
// team…" open Date & time on "Dates to offer". Guests tick ranges on the
// invite; the ticks come back on the reply as `datePicks`; the host's
// "Use these dates" sets the dates and settles the step.
// e2e twin: hostv2/e2e/theDatePollAsksOnTheInvite.spec.mjs.
import { checklistRouteFor } from '../taskRoute';
import { resolveRoute } from '../routeResolver';
import { taskSatisfied } from '../taskEngine';
import { playbookChecklist } from '../playbooks';
import { dateOptionsOf, datePollTally, dateOptionPatch, datePollSettled, rangeLabel, nextDateOptionId } from '../datePoll';
import { mergeGuestReplies } from '../guestMerge';
import { duplicateEvent } from '../duplicateEvent';

const ev = (type, extra = {}) => ({ id: 'dp', type, date: '', guestMode: 'list', venueCity: 'Gulf Shores, AL', ...extra });
const row = (type, re) => (playbookChecklist(ev(type, { date: '2027-02-13' }), '2026-10-01') || []).find((r) => re.test(r.task));
const OPTS = [
  { id: 'd1', start: '2027-01-30', end: '2027-02-02' },
  { id: 'd2', start: '2027-02-13', end: '2027-02-16' },
  { id: 'd3', start: '2027-02-27', end: '2027-03-02' },
];

describe.each([
  ['Group Trip', /^Offer two or three date ranges/],
  ['Team Retreat', /^Poll the team/],
])('%s: the date row', (type, re) => {
  const r = row(type, re);
  test('premise: the row is in the playbook', () => { expect(r).toBeTruthy(); });

  test('its button is "Ask on the invite" and it opens Date & time on the dates to offer', () => {
    const hit = checklistRouteFor(r.task, { week: r.week, category: r.category }, ev(type));
    expect(hit && hit.label).toBe('Ask on the invite');
    expect(resolveRoute(hit.route)).toEqual({ kind: 'date', focus: 'options' });
  });

  test('offering ranges is not the step done; using one of them is', () => {
    const t = { task: r.task };
    expect(taskSatisfied(ev(type), t)).toBe(false);
    expect(taskSatisfied(ev(type, { dateOptions: OPTS }), t)).toBe(false);
    expect(taskSatisfied(ev(type, { dateOptions: OPTS, dateOptionUsed: 'd2', date: '2027-02-13' }), t)).toBe(true);
    // A used id the host has since removed is not a settled poll.
    expect(taskSatisfied(ev(type, { dateOptions: OPTS.slice(0, 1), dateOptionUsed: 'd2' }), t)).toBe(false);
  });
});

test('ranges: complete ones only, at most three, read as a person reads them', () => {
  const e = ev('Group Trip', { dateOptions: [...OPTS, { id: 'd4', start: '2027-03-13', end: '2027-03-16' }, { id: 'd5', start: '' }] });
  expect(dateOptionsOf(e).map((o) => o.id)).toEqual(['d1', 'd2', 'd3']);
  expect(rangeLabel(OPTS[0])).toBe('Sat Jan 30 – Tue Feb 2');
  expect(nextDateOptionId([{ id: 'd1' }, { id: 'd3' }])).toBe('d2');
});

test('the tally is the guests’ own ticks, names included, and nothing else', () => {
  const e = ev('Group Trip', {
    dateOptions: OPTS,
    guests: [
      { id: 'a', name: 'Ana Ruiz', datePicks: ['d1', 'd2'] },
      { id: 'b', name: 'Bree Cole', datePicks: ['d2'] },
      { id: 'c', name: 'Cam Ito', datePicks: ['d2', 'd3', 'gone'] },
      { id: 'd', name: 'Dee Park' },
    ],
  });
  const t = datePollTally(e);
  expect(t.answered).toBe(3);
  expect(t.asked).toBe(4);
  expect(t.rows.map((x) => [x.id, x.count, x.names])).toEqual([
    ['d1', 1, ['Ana']], ['d2', 3, ['Ana', 'Bree', 'Cam']], ['d3', 1, ['Cam']]]);
  expect(datePollTally(ev('Group Trip', { dateOptions: OPTS })).rows.every((x) => x.count === 0)).toBe(true);
});

test('"Use these dates" writes the range as the event dates and settles the poll', () => {
  const e = ev('Group Trip', { dateOptions: OPTS });
  expect(dateOptionPatch(e, 'd2')).toEqual({ date: '2027-02-13', endDate: '2027-02-16', dateOptionUsed: 'd2' });
  expect(dateOptionPatch(e, 'nope')).toBeNull();
  expect(datePollSettled({ ...e, ...dateOptionPatch(e, 'd2') })).toBe(true);
});

test('a reply’s ticks land on the guest row; an absent answer never blanks them; deleting the reply clears them', () => {
  const base = [{ id: 'a', name: 'Ana Ruiz', rsvp: '', datePicks: ['d1'] }];
  const withTicks = mergeGuestReplies(base, [{ name: 'Ana Ruiz', rsvp: 'Yes', datePicks: ['d2', 'd3'] }]).guests;
  expect(withTicks[0].datePicks).toEqual(['d2', 'd3']);
  const noTicks = mergeGuestReplies(withTicks, [{ name: 'Ana Ruiz', rsvp: 'Maybe' }]).guests;
  expect(noTicks[0].datePicks).toEqual(['d2', 'd3']);
  const added = mergeGuestReplies([], [{ name: 'Bree Cole', rsvp: 'No', datePicks: ['d1'], idempotencyKey: 'k' }]).guests;
  expect(added[0].datePicks).toEqual(['d1']);
  const gone = mergeGuestReplies(withTicks, [{ name: 'Ana Ruiz', withdrawn: true }]).guests;
  expect(gone[0].datePicks).toBeUndefined();
});

test('a duplicated trip does not carry last time’s ranges or anyone’s ticks', () => {
  const copy = duplicateEvent(ev('Group Trip', { dateOptions: OPTS, dateOptionUsed: 'd2', guests: [{ id: 'a', name: 'Ana', datePicks: ['d2'] }] }), { id: 'new', now: '2026-11-21T00:00:00Z' });
  expect(copy.dateOptions).toBeUndefined();
  expect(copy.dateOptionUsed).toBeUndefined();
  expect(copy.guests[0].datePicks).toBeUndefined();
});
