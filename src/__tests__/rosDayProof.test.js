// ─── ROS DAY PROOF — the run-of-show learns the span (P1 final slice) ────────
// Locks four seams:
//   1. schedules.agenda (the playbook's AUTHORED multi-day program) is finally
//      read — Day-token rows ride with day index + bucket label, never a clock
//   2. "T0 last day" cues land on the LAST day of a span (they used to land at
//      the day-1 anchor); single-day output stays byte-identical (the flag)
//   3. "T0 +5d" post-event follow-ups are NOT day-of cues (the hour parser
//      used to read "+5d" as "+5h" and land the recap five hours into day 1)
//   4. single-day playbooks carry NO day fields — nothing changes for them
const { playbookRunOfShow, effectiveRos } = require('../lib/playbooks');

const iso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(12); return d.toISOString().slice(0, 10); };

const RETREAT3 = { id: 'ros-span', type: 'Team Retreat', date: iso(30), endDate: iso(32), guests: 12, startTime: '13:00' };

describe('ROS day dimension', () => {
  test('the authored Day 1/2/3 agenda is finally read, verbatim, clockless', () => {
    const rows = playbookRunOfShow(RETREAT3) || [];
    const agenda = rows.filter(r => r.day != null && /Day \d/.test(String(r.rel || '')));
    expect(agenda.length).toBeGreaterThanOrEqual(8);
    const day2 = agenda.filter(r => r.day === 2);
    expect(day2.some(r => /team-building activity/i.test(r.segment))).toBe(true);
    // No invented clocks: day rows speak the authored bucket, never a time.
    for (const r of agenda) {
      expect(r.time).toBe(null);
      expect(r.rel).toMatch(/^Day \d+( · (morning|midday|afternoon|evening|night))?$/);
      expect(r.source).toBe('playbook');
    }
  });

  test('days order correctly: every day-2 row after every day-1 row', () => {
    const rows = playbookRunOfShow(RETREAT3) || [];
    const idx = (pred) => rows.findIndex(pred);
    const lastDay1 = rows.map((r, i) => ((r.day || 1) === 1 ? i : -1)).filter(i => i >= 0).pop();
    const firstDay2 = idx(r => r.day === 2);
    expect(firstDay2).toBeGreaterThan(lastDay1 === undefined ? -1 : -1);
    expect(rows.filter(r => r.day === 2).every((r) => rows.indexOf(r) > lastDay1)).toBe(true);
  });

  test('"T0 last day" cues land on the last day of a span', () => {
    const rows = playbookRunOfShow(RETREAT3) || [];
    const settle = rows.find(r => /settle the venue/i.test(r.segment));
    expect(settle).toBeTruthy();
    expect(settle.day).toBe(3);
  });

  test('"T0 +5d" follow-ups are not day-of cues (the +5h mis-parse is dead)', () => {
    const rows = playbookRunOfShow(RETREAT3) || [];
    expect(rows.some(r => /recap with decisions/i.test(r.segment))).toBe(false);
  });

  test('single-day retreat: "last day" cue stays on day 1 — degradation is the flag', () => {
    const one = playbookRunOfShow({ ...RETREAT3, endDate: undefined }) || [];
    const settle = one.find(r => /settle the venue/i.test(r.segment));
    expect(settle).toBeTruthy();
    expect(settle.day || 1).toBe(1);
  });

  test('single-day playbooks carry no day fields at all', () => {
    const rows = playbookRunOfShow({ id: 'ros-one', type: 'Dinner Party', date: iso(10), guests: 8, startTime: '18:00' }) || [];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every(r => r.day === undefined)).toBe(true);
  });
});
