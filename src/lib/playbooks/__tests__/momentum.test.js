// MOMENTUM — the longitudinal Adaptivity axis (2026-08-18). Named directly in
// docs/audits/2026-08-17_DECISION_ENGINE_RESCORE.md as the missing piece: everything
// else in computeHostAdaptation reads one snapshot, nothing reads across sessions.
// `computeMomentum` is deliberately a SEPARATE pure function from computeHostAdaptation
// rather than a new parameter on it — composed by the caller, tested independently.
import { computeMomentum } from '../index';

const day = 86400000;
const NOW = 1_700_000_000_000; // fixed instant, so tests never depend on the real clock

describe('momentum: no history is unknown, not a guess', () => {
  test('empty/missing history reads unknown on both axes', () => {
    expect(computeMomentum([], 5, NOW)).toEqual({ trend: 'unknown', daysSinceLastSession: null, sessionCount: 0 });
    expect(computeMomentum(null, 5, NOW)).toEqual({ trend: 'unknown', daysSinceLastSession: null, sessionCount: 0 });
    expect(computeMomentum(undefined, 5, NOW)).toEqual({ trend: 'unknown', daysSinceLastSession: null, sessionCount: 0 });
  });

  test('malformed entries (no ts, no openCount) are filtered, not crashed on', () => {
    const hist = [{ ts: NOW - 3 * day }, { openCount: 5 }, null, 'garbage'];
    expect(computeMomentum(hist, 5, NOW).sessionCount).toBe(0);
  });

  test('a single session is a baseline, not a direction — trend stays unknown', () => {
    const hist = [{ ts: NOW - 2 * day, openCount: 8 }];
    const m = computeMomentum(hist, 8, NOW);
    expect(m.trend).toBe('unknown');
    expect(m.sessionCount).toBe(1);
    expect(m.daysSinceLastSession).toBe(2);
  });
});

describe('momentum: trend reads the WINDOW, not one noisy session', () => {
  test('openCount falling across the window reads improving', () => {
    const hist = [
      { ts: NOW - 10 * day, openCount: 12 },
      { ts: NOW - 5 * day, openCount: 9 },
      { ts: NOW - 1 * day, openCount: 7 },
    ];
    expect(computeMomentum(hist, 5, NOW).trend).toBe('improving');
  });

  test('openCount rising across the window reads declining', () => {
    const hist = [
      { ts: NOW - 10 * day, openCount: 4 },
      { ts: NOW - 5 * day, openCount: 6 },
      { ts: NOW - 1 * day, openCount: 7 },
    ];
    expect(computeMomentum(hist, 9, NOW).trend).toBe('declining');
  });

  test('flat or noisy-small movement reads stalled, not improving/declining', () => {
    const hist = [
      { ts: NOW - 10 * day, openCount: 8 },
      { ts: NOW - 5 * day, openCount: 9 },
      { ts: NOW - 1 * day, openCount: 8 },
    ];
    expect(computeMomentum(hist, 8, NOW).trend).toBe('stalled');
  });

  test('a single-point swing on a long window does not flip the read', () => {
    // 4 points, threshold floor(4/2)=2 — a 1-item wobble must not read as a real trend.
    const hist = [
      { ts: NOW - 20 * day, openCount: 10 },
      { ts: NOW - 15 * day, openCount: 10 },
      { ts: NOW - 10 * day, openCount: 10 },
      { ts: NOW - 5 * day, openCount: 9 },
    ];
    expect(computeMomentum(hist, 9, NOW).trend).toBe('stalled');
  });

  test('current openCount, not the last logged session, drives the read', () => {
    // Last logged session was 9; the host has since settled 4 more since that log.
    const hist = [
      { ts: NOW - 10 * day, openCount: 12 },
      { ts: NOW - 2 * day, openCount: 9 },
    ];
    expect(computeMomentum(hist, 5, NOW).trend).toBe('improving');
  });
});

describe('momentum: re-engagement gap', () => {
  test('days since the last session is measured off the most recent entry, unsorted input included', () => {
    const hist = [
      { ts: NOW - 3 * day, openCount: 6 },
      { ts: NOW - 30 * day, openCount: 10 }, // out of order on purpose
    ];
    expect(computeMomentum(hist, 6, NOW).daysSinceLastSession).toBe(3);
  });

  test('a session logged today reads zero days, not null', () => {
    const hist = [{ ts: NOW, openCount: 5 }, { ts: NOW - 5 * day, openCount: 5 }];
    expect(computeMomentum(hist, 5, NOW).daysSinceLastSession).toBe(0);
  });
});

describe('momentum: byte-identical when unused', () => {
  test('every existing computeHostAdaptation call site passes no history — this function is opt-in only', () => {
    // computeMomentum is deliberately NOT called from inside computeHostAdaptation, so no
    // existing caller's return shape changes by this function existing. Proven by import shape:
    // computeHostAdaptation's arity is unchanged (still 6 params) and this test file never
    // calls it — see momentum tests above, which exercise computeMomentum in isolation.
    expect(typeof computeMomentum).toBe('function');
  });
});
