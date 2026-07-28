// ─── The phase spine derives, and degrades honestly ──────────────────────────
const { dayPhases, phaseOfRow } = require('../dayPhases');

const A = 15 * 60;  // 3:00 PM anchor
const row = (min, type, id) => ({ id: id || ('r' + min), _min: min, type: type || 'event', segment: 's' + min });

describe('phaseOfRow', () => {
  test('before the anchor is setup; the anchor window is doors', () => {
    expect(phaseOfRow(row(A - 120, 'prep'), A)).toBe('setup');
    expect(phaseOfRow(row(A - 16, 'prep'), A)).toBe('setup');
    expect(phaseOfRow(row(A - 15, 'prep'), A)).toBe('doors');
    expect(phaseOfRow(row(A, 'event'), A)).toBe('doors');
    expect(phaseOfRow(row(A + 15, 'event'), A)).toBe('doors');
  });
  test('after the doors, cleanup is the wrap and everything else is the event', () => {
    expect(phaseOfRow(row(A + 60, 'event'), A)).toBe('program');
    expect(phaseOfRow(row(A + 240, 'prep'), A)).toBe('wrap');
  });
  test('a clockless day still phases by kind rather than guessing a time', () => {
    expect(phaseOfRow({ id: 'x', type: 'prep' }, null)).toBe('setup');
    expect(phaseOfRow({ id: 'x', type: 'event' }, null)).toBe('program');
  });
});

describe('dayPhases', () => {
  const full = [row(A - 120, 'prep'), row(A - 60, 'prep'), row(A, 'event'),
                row(A + 60, 'event'), row(A + 120, 'event'), row(A + 300, 'prep')];

  test('renders only the phases that have rows', () => {
    const only = dayPhases([row(A - 60, 'prep'), row(A + 60, 'event')], A, {});
    expect(only.map((p) => p.id)).toEqual(['setup', 'program']);   // no doors, no wrap — honestly absent
  });

  test('a full day gives the whole spine, in order', () => {
    expect(dayPhases(full, A, {}).map((p) => p.id)).toEqual(['setup', 'doors', 'program', 'wrap']);
  });

  test('counts come from the done ledger', () => {
    const p = dayPhases(full, A, { [full[0].id]: true });
    expect(p[0]).toMatchObject({ id: 'setup', total: 2, done: 1 });
  });

  test('the host is standing in the first unfinished phase', () => {
    const done = {}; full.slice(0, 2).forEach((r) => { done[r.id] = true; });
    const p = dayPhases(full, A, done);
    expect(p.find((x) => x.id === 'setup').state).toBe('done');
    expect(p.find((x) => x.id === 'doors').state).toBe('now');
    expect(p.find((x) => x.id === 'wrap').state).toBe('ahead');
  });

  test('a finished day is all done — no phantom "now"', () => {
    const done = {}; full.forEach((r) => { done[r.id] = true; });
    expect(dayPhases(full, A, done).every((p) => p.state === 'done')).toBe(true);
  });

  test('no rows, no spine', () => {
    expect(dayPhases([], A, {})).toEqual([]);
    expect(dayPhases(null, A, {})).toEqual([]);
  });
});
