// RUNNING LATE MOVES THE REST OF THE DAY (B8, 11/26/2026; the Thanksgiving
// mockup, 1:05 PM: "the bird isn't there yet: move the rest of the day once").
// One edit, the schedule's own writer shape (the full effective run, rosEdited):
//   · the steps that haven't started and aren't done move later by N minutes;
//   · the arrival time stays: guests already have it;
//   · a step already under way, and anything done, stays where it is;
//   · a trip moves only today's rows.
import { runningLate, todaysRos } from '../dayOfEdits';
import { effectiveRos } from '../playbooks';

const TG = { id: 'tg', name: 'Thanksgiving', type: 'Thanksgiving', date: '2026-11-26', startTime: '15:00', startTimeSource: 'host', guestEstimate: 14, venueKind: 'home', guests: [], vendors: [], timeline: [] };
const at = (hm) => new Date('2026-11-26T' + hm + ':00');
const min = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };

describe('running late, Thanksgiving at 1:05 PM', () => {
  const before = todaysRos(TG, at('13:05'));
  const r = runningLate(TG, 30, at('13:05'));

  test('every step after now moves 30 minutes later, except the arrivals', () => {
    const later = before.filter((c) => min(c.time) > min('13:05'));
    expect(r.moved.length).toBeGreaterThan(3);
    expect(r.moved.map((m) => m.id)).toEqual(later.filter((c) => c.time !== '15:00').map((c) => c.id));
    for (const m of r.moved) expect(min(m.to)).toBe(min(m.from) + 30);
  });

  test('the arrivals stay at 3:00 PM, and say why', () => {
    expect(r.kept.map((k) => k.time)).toEqual(['15:00']);
    expect(r.edit.msg).toMatch(/^Moved \d+ steps 30 minutes later\. Arrivals stay at 3:00 PM\.$/);
  });

  test('the step under way and the ones before it stay', () => {
    const saved = r.edit.patch.ros;
    for (const c of before.filter((x) => min(x.time) <= min('13:05'))) {
      expect(saved.find((s) => s.id === c.id).time).toBe(c.time);
    }
  });

  test('it writes the schedule the way the schedule writer does: the whole run, owned', () => {
    expect(r.edit.patch.rosEdited).toBe(true);
    expect(r.edit.patch.ros.length).toBe(effectiveRos(TG).length);
    const after = { ...TG, ...r.edit.patch };
    const dinner = todaysRos(after, at('13:10')).find((c) => /^Dinner/.test(c.segment));
    expect(dinner.time).toBe(r.moved.find((m) => m.id === dinner.id).to);
  });

  test('a finished step does not move', () => {
    const next = before.find((c) => min(c.time) > min('13:05') && c.time !== '15:00');
    const done = runningLate({ ...TG, rosDone: { [next.id]: true } }, 30, at('13:05'));
    expect(done.moved.map((m) => m.id)).not.toContain(next.id);
  });

  test('nothing after now: nothing to move, no edit', () => {
    const late = runningLate(TG, 30, at('23:30'));
    expect(late.moved).toEqual([]);
    expect(late.edit).toBe(null);
  });
});
