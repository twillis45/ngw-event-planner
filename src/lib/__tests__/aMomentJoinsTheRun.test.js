// A MOMENT JOINS THE RUN (B7, 11/26/2026). hostv2's "Worth a spot on the
// schedule: Group photo · Add it" wrote the moment inside its shell; hostv4's
// The Day offers the same moments, so the write is lib/dayOfEdits addMomentEdit:
// the whole effective run plus the moment (lib/momentLibrary buildMomentSegment),
// owned (rosEdited), with the time the host picked or none.
import { addMomentEdit } from '../dayOfEdits';
import { suggestableMoments, momentsForType } from '../momentLibrary';
import { effectiveRos } from '../playbooks';

const TG = { id: 'tg', name: 'Thanksgiving', type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00', startTimeSource: 'host', guestEstimate: 14, venueKind: 'home', guests: [], vendors: [], timeline: [] };

test('the moment lands on the run with the time she picked, and is no longer suggested', () => {
  const m = suggestableMoments(TG.type, effectiveRos(TG))[0];
  expect(m).toBeTruthy();
  const ed = addMomentEdit(TG, m, '15:45', new Date('2026-11-26T09:00:00'));
  expect(ed.patch.rosEdited).toBe(true);
  expect(ed.patch.ros.length).toBe(effectiveRos(TG).length + 1);
  const row = ed.patch.ros.find((r) => r.fromMoment === m.id);
  expect(row).toMatchObject({ segment: m.label, time: '15:45', id: 'm-' + m.id });
  expect(ed.msg).toBe(m.label + ' is on today’s run at 3:45 PM.');
  const after = { ...TG, ...ed.patch };
  expect(suggestableMoments(TG.type, effectiveRos(after)).map((x) => x.id)).not.toContain(m.id);
});

test('no time: on the run, to time later (hostv2’s Add it)', () => {
  const m = momentsForType(TG.type)[0];
  const ed = addMomentEdit(TG, m);
  expect(ed.patch.ros.find((r) => r.fromMoment === m.id).time).toBe('');
  expect(ed.msg).toBe(m.label + ' is on the schedule — give it a time when you know it.');
});

test('no moment: no edit', () => {
  expect(addMomentEdit(TG, null)).toBe(null);
});

// A TRIP'S MOMENT LANDS ON THE DAY IT WAS ADDED (live check of 036302b5,
// 11/26/2026). On day 2 of a three-day trip the row was saved with no `day`, and
// todaysRos reads a missing day as day 1: the moment showed on day 1's run, was
// offered again on day 2, and the message said "today's run". It now carries
// the day it was added on; before the trip starts it says "the run", not "today's".
import { todaysRos } from '../dayOfEdits';

const TRIP = { id: 'trip', name: 'Shore trip', type: 'Group Trip', date: '2027-05-13', endDate: '2027-05-15', guestEstimate: 8, guests: [], vendors: [], timeline: [] };
const at = (iso) => new Date(iso + 'T09:00:00');

test('on day 2 of a trip, the moment is on day 2’s run, not day 1’s', () => {
  const m = momentsForType(TRIP.type)[0];
  expect(m).toBeTruthy();
  const ed = addMomentEdit(TRIP, m, '10:30', at('2027-05-14'));
  const row = ed.patch.ros.find((r) => r.fromMoment === m.id);
  expect(row.day).toBe(2);
  const after = { ...TRIP, ...ed.patch };
  expect(todaysRos(after, at('2027-05-14')).some((r) => r.fromMoment === m.id)).toBe(true);
  expect(todaysRos(after, at('2027-05-13')).some((r) => r.fromMoment === m.id)).toBe(false);
  expect(ed.msg).toBe(m.label + ' is on today’s run at 10:30 AM.');
});

test('before a trip starts, the moment goes on the first day and the message does not say today', () => {
  const m = momentsForType(TRIP.type)[0];
  const ed = addMomentEdit(TRIP, m, '10:30', at('2027-05-01'));
  expect(ed.patch.ros.find((r) => r.fromMoment === m.id).day).toBe(1);
  expect(ed.msg).toBe(m.label + ' is on the run at 10:30 AM.');
});
