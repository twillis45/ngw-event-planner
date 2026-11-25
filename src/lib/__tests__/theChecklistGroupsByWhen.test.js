// The checklist's phases read only the one due-date reader (cohesion batch D,
// owner D1 11/24/2026). See lib/checklistPhases.
const { checklistPhases, upNextStep, stepWhen } = require('../checklistPhases');

const NOW = new Date('2026-11-24T10:00:00');
const EVENT = { id: 'ev', type: 'Retirement Party', date: '2027-03-20' };
const row = (id, leadDays, extra = {}) => ({ t: { id, task: id, leadDays, ...extra }, i: Number(id.slice(1)) });

describe('the checklist groups by when', () => {
  const rows = [
    row('s1', -28), row('s2', -18), row('s3', -12), row('s4', -6), row('s5', -1),
    row('s6', 0), row('s7', 2), row('s8', null, { week: 'Week of Feb 22' }), row('s9', -40),
  ];
  const phases = checklistPhases(EVENT, rows, NOW);

  test('the phases, in date order, each date said once', () => {
    expect(phases.map((p) => p.label)).toEqual([
      'By the end of February', 'Early March · Mar 1–13', 'The last week · Mar 14–19',
      'On the day · Sat, Mar 20', 'After the party', 'No date set',
    ]);
    const starts = phases.map((p) => p.start).filter(Boolean);
    expect(starts).toEqual([...starts].sort());
  });

  test('each step lands by its lead, in due order', () => {
    const by = Object.fromEntries(phases.map((p) => [p.key, p.rows.map((r) => r.t.id)]));
    expect(by['m-2027-02']).toEqual(['s9', 's1']);
    expect(by['m-2027-03']).toEqual(['s2', 's3']);
    expect(by.week).toEqual(['s4', 's5']);
    expect(by.day).toEqual(['s6']);
    expect(by.after).toEqual(['s7']);
    expect(by.nodate).toEqual(['s8']);
  });

  test('a step\'s words never move it', () => {
    const worded = rows.map((r) => ({ ...r, t: { ...r.t, task: 'Invite everyone on the day after the party, last week of March' } }));
    expect(checklistPhases(EVENT, worded, NOW).map((p) => [p.key, p.rows.length])).toEqual(phases.map((p) => [p.key, p.rows.length]));
  });

  test('up next is the first step the plan has not handled', () => {
    expect(upNextStep(phases).t.id).toBe('s9');
    expect(upNextStep(phases, (t) => t.id === 's9').t.id).toBe('s1');
    expect(upNextStep([])).toBeNull();
  });

  test('no date on the event: every step is "No date set"', () => {
    expect(stepWhen({ leadDays: -10 }, { date: '' }, NOW).key).toBe('nodate');
  });
});
