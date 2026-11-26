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
  const ed = addMomentEdit(TG, m, '15:45');
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
