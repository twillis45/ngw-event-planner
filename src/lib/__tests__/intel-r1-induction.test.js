// INTEL-1 R1 induction — proves a QA-seeded attendance memory makes the read-forward
// (attendanceAdjustment) fire, and that a cold-start profile correctly stays silent.
// This is the sanctioned "induce and test" harness: the seed functions run under
// NODE_ENV=test (the production guard only throws when NODE_ENV==='production'), and
// the reader itself is unguarded — so this mirrors exactly what fires in the app when a
// profile carries ≥3 fresh, stable observations. See src/lib/qaMemorySeed.js.
import { applyQaSeed } from '../qaMemorySeed';
import { attendanceAdjustment, CONFIDENCE, STABILITY } from '../hostIntel';

const ASOF = '2026-07-02';
// A cloud-syncable event with a real planned count (guestCount) — the same shape the
// Plan tab passes into attendanceAdjustment at App.js:9732.
const event = { id: 'ev-r1-test', type: 'Dinner Party', date: '2026-08-01', guestMode: 'count', guestCount: 40 };

describe('INTEL-1 R1 — QA seed induces the attendance read-forward', () => {
  test('cold-start: an unseeded profile does NOT fire (correct silence)', () => {
    const adj = attendanceAdjustment({ name: 'Fresh Host' }, event, ASOF);
    expect(adj.applied).toBe(false);
    expect(adj.suggested).toBe(adj.planned);   // 40 → 40, no adjustment
    expect(adj.because).toBeNull();
  });

  test('seeded: attendanceAdjustment fires applied:true at High confidence + stability', () => {
    const seeded = applyQaSeed({ name: 'Fresh Host' }, { asOf: ASOF });
    const adj = attendanceAdjustment(seeded, event, ASOF);
    expect(adj.applied).toBe(true);
    expect(adj.confidence).toBe(CONFIDENCE.HIGH);
    expect(adj.stability).toBe(STABILITY.HIGH);
    expect(adj.n).toBe(5);                       // 5 seeded observations
    // ratio ~0.878 → a real (non-trivial) downsize from a planned 40.
    expect(adj.suggested).toBeGreaterThan(0);
    expect(adj.suggested).toBeLessThan(adj.planned);
    expect(adj.suggested).toBe(Math.round(adj.planned * adj.ratio));
    expect(adj.because).toMatch(/fewer people usually came/i);
  });

  test('the frozen R1 record gate is satisfied (observations ≥ required 3)', () => {
    const seeded = applyQaSeed({ name: 'Fresh Host' }, { asOf: ASOF });
    const adj = attendanceAdjustment(seeded, event, ASOF);
    // Mirrors the gate written into the frozen eval at App.js:9747
    // (gate: { eligible:true, observations: n, required: 3 }).
    expect(adj.n).toBeGreaterThanOrEqual(3);
  });

  test('reverted events stay silent even when memory is applicable', () => {
    const seeded = applyQaSeed({ name: 'Fresh Host' }, { asOf: ASOF });
    const adj = attendanceAdjustment(seeded, { ...event, intelAttendanceReverted: true }, ASOF);
    expect(adj.applied).toBe(false);             // host kept their own number
    expect(adj.suggested).toBe(adj.planned);
  });
});
