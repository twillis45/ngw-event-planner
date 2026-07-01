// ── INTEL-QA-1 Stage 1D-B — closeoutIntel tests ──────────────────────────────
import {
  hasAcceptedR1,
  hasActualAttached,
  needsActual,
  isPastEvent,
  needsCloseout,
  pendingCloseouts,
  closeoutStats,
} from '../closeoutIntel';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeEval(overrides = {}) {
  return {
    id: 'R1:evt-1',
    version: 1,
    readerId: 'R1',
    lifecycle: [{ state: 'created' }, { state: 'presented' }, { state: 'accepted' }],
    recommendation: { from: 40, to: 35, because: 'History shows ~87% attendance' },
    baseline: { value: 40, source: 'playbook' },
    metadata: { domain: 'attendance', layer: 'host', readerVersion: 1 },
    actual: null,
    ...overrides,
  };
}

function makeEvent(overrides = {}) {
  return {
    id: 'evt-1',
    type: 'birthday',
    date: '2025-01-01',
    guestCount: 40,
    intelEvaluations: [makeEval()],
    ...overrides,
  };
}

const PAST = '2025-01-01';   // event date
const FUTURE = '2030-01-01'; // event date
const NOW = '2025-06-01';    // asOf — after PAST, before FUTURE

// ── A · hasAcceptedR1 ─────────────────────────────────────────────────────────

describe('A — hasAcceptedR1', () => {
  test('returns true when R1 eval has accepted state', () => {
    expect(hasAcceptedR1(makeEvent())).toBe(true);
  });

  test('returns false when intelEvaluations is empty', () => {
    expect(hasAcceptedR1(makeEvent({ intelEvaluations: [] }))).toBe(false);
  });

  test('returns false when intelEvaluations is missing', () => {
    expect(hasAcceptedR1(makeEvent({ intelEvaluations: undefined }))).toBe(false);
  });

  test('returns false when lifecycle has no accepted state', () => {
    const ev = makeEvent({ intelEvaluations: [makeEval({ lifecycle: [{ state: 'created' }, { state: 'presented' }] })] });
    expect(hasAcceptedR1(ev)).toBe(false);
  });

  test('returns false for a non-R1 reader id', () => {
    const ev = makeEvent({ intelEvaluations: [makeEval({ id: 'R2:evt-1' })] });
    expect(hasAcceptedR1(ev)).toBe(false);
  });

  test('returns false when record id is missing', () => {
    const ev = makeEvent({ intelEvaluations: [makeEval({ id: null })] });
    expect(hasAcceptedR1(ev)).toBe(false);
  });

  test('returns false for null event', () => {
    expect(hasAcceptedR1(null)).toBe(false);
  });

  test('returns false for reverted evaluation (reverted, not accepted)', () => {
    const ev = makeEvent({ intelEvaluations: [makeEval({ lifecycle: [{ state: 'created' }, { state: 'reverted' }] })] });
    expect(hasAcceptedR1(ev)).toBe(false);
  });
});

// ── B · hasActualAttached ──────────────────────────────────────────────────────

describe('B — hasActualAttached', () => {
  test('returns false when actual is null', () => {
    expect(hasActualAttached(makeEvent())).toBe(false);
  });

  test('returns true when actual has a valid numeric value', () => {
    const ev = makeEvent({ intelEvaluations: [makeEval({ actual: { value: 35, at: '2025-01-02T10:00:00Z' } })] });
    expect(hasActualAttached(ev)).toBe(true);
  });

  test('returns false when actual.value is not a number', () => {
    const ev = makeEvent({ intelEvaluations: [makeEval({ actual: { value: '35' } })] });
    expect(hasActualAttached(ev)).toBe(false);
  });

  test('returns false when actual.value is NaN', () => {
    const ev = makeEvent({ intelEvaluations: [makeEval({ actual: { value: NaN } })] });
    expect(hasActualAttached(ev)).toBe(false);
  });

  test('returns false when actual is missing on non-R1 record', () => {
    const ev = makeEvent({ intelEvaluations: [makeEval({ id: 'R2:evt-1', actual: { value: 35 } })] });
    expect(hasActualAttached(ev)).toBe(false);
  });

  test('returns false for empty evaluations', () => {
    expect(hasActualAttached(makeEvent({ intelEvaluations: [] }))).toBe(false);
  });

  test('returns false for null event', () => {
    expect(hasActualAttached(null)).toBe(false);
  });

  test('returns true when actual value is 0 (a valid real outcome)', () => {
    const ev = makeEvent({ intelEvaluations: [makeEval({ actual: { value: 0, at: '2025-01-02T10:00:00Z' } })] });
    expect(hasActualAttached(ev)).toBe(true);
  });
});

// ── C · needsActual ───────────────────────────────────────────────────────────

describe('C — needsActual', () => {
  test('true when accepted R1 and no actual', () => {
    expect(needsActual(makeEvent())).toBe(true);
  });

  test('false when actual is attached', () => {
    const ev = makeEvent({ intelEvaluations: [makeEval({ actual: { value: 35 } })] });
    expect(needsActual(ev)).toBe(false);
  });

  test('false when no accepted R1 lifecycle', () => {
    const ev = makeEvent({ intelEvaluations: [makeEval({ lifecycle: [{ state: 'created' }] })] });
    expect(needsActual(ev)).toBe(false);
  });

  test('false when intelEvaluations is empty', () => {
    expect(needsActual(makeEvent({ intelEvaluations: [] }))).toBe(false);
  });

  test('false for null event', () => {
    expect(needsActual(null)).toBe(false);
  });
});

// ── D · isPastEvent ───────────────────────────────────────────────────────────

describe('D — isPastEvent', () => {
  test('true for an event in the past', () => {
    expect(isPastEvent(makeEvent({ date: PAST }), NOW)).toBe(true);
  });

  test('false for an event in the future', () => {
    expect(isPastEvent(makeEvent({ date: FUTURE }), NOW)).toBe(false);
  });

  test('false when date is missing', () => {
    expect(isPastEvent(makeEvent({ date: null }), NOW)).toBe(false);
  });

  test('false for null event', () => {
    expect(isPastEvent(null, NOW)).toBe(false);
  });

  test('false for same-day event (not strictly past)', () => {
    expect(isPastEvent(makeEvent({ date: NOW }), NOW)).toBe(false);
  });

  test('handles ISO datetime strings truncated to date part', () => {
    expect(isPastEvent(makeEvent({ date: '2025-01-01T12:00:00Z' }), NOW)).toBe(true);
  });
});

// ── E · needsCloseout ─────────────────────────────────────────────────────────

describe('E — needsCloseout', () => {
  test('true for past event with planned count and accepted R1 and no actual', () => {
    expect(needsCloseout(makeEvent({ date: PAST, guestCount: 40 }), NOW)).toBe(true);
  });

  test('false for future event', () => {
    expect(needsCloseout(makeEvent({ date: FUTURE }), NOW)).toBe(false);
  });

  test('false when no guest count', () => {
    expect(needsCloseout(makeEvent({ date: PAST, guestCount: 0, guestEstimate: 0 }), NOW)).toBe(false);
  });

  test('falls back to guestEstimate when guestCount is 0', () => {
    const ev = makeEvent({ date: PAST, guestCount: 0, guestEstimate: 30 });
    expect(needsCloseout(ev, NOW)).toBe(true);
  });

  test('false when actual is already attached', () => {
    const ev = makeEvent({ date: PAST, intelEvaluations: [makeEval({ actual: { value: 35 } })] });
    expect(needsCloseout(ev, NOW)).toBe(false);
  });

  test('false when no accepted R1', () => {
    const ev = makeEvent({ date: PAST, intelEvaluations: [makeEval({ lifecycle: [{ state: 'created' }] })] });
    expect(needsCloseout(ev, NOW)).toBe(false);
  });

  test('false for null event', () => {
    expect(needsCloseout(null, NOW)).toBe(false);
  });

  test('false when intelEvaluations is empty (R1 never fired)', () => {
    expect(needsCloseout(makeEvent({ date: PAST, intelEvaluations: [] }), NOW)).toBe(false);
  });
});

// ── F · pendingCloseouts ──────────────────────────────────────────────────────

describe('F — pendingCloseouts', () => {
  test('returns events needing closeout', () => {
    const events = [makeEvent({ id: 'evt-1', date: PAST })];
    expect(pendingCloseouts(events, NOW)).toHaveLength(1);
  });

  test('excludes future events', () => {
    const events = [makeEvent({ date: FUTURE })];
    expect(pendingCloseouts(events, NOW)).toHaveLength(0);
  });

  test('excludes events with actual already attached', () => {
    const events = [makeEvent({ date: PAST, intelEvaluations: [makeEval({ actual: { value: 35 } })] })];
    expect(pendingCloseouts(events, NOW)).toHaveLength(0);
  });

  test('sorts most-recently-past first', () => {
    const events = [
      makeEvent({ id: 'older', date: '2024-06-01', guestCount: 40 }),
      makeEvent({ id: 'newer', date: '2025-01-01', guestCount: 40 }),
    ];
    const result = pendingCloseouts(events, NOW);
    expect(result[0].id).toBe('newer');
    expect(result[1].id).toBe('older');
  });

  test('returns empty array for null input', () => {
    expect(pendingCloseouts(null, NOW)).toEqual([]);
  });

  test('returns empty array for empty input', () => {
    expect(pendingCloseouts([], NOW)).toEqual([]);
  });

  test('handles mixed past/future/complete events', () => {
    const events = [
      makeEvent({ id: 'future', date: FUTURE }),
      makeEvent({ id: 'complete', date: PAST, intelEvaluations: [makeEval({ actual: { value: 30 } })] }),
      makeEvent({ id: 'pending', date: PAST }),
    ];
    const result = pendingCloseouts(events, NOW);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('pending');
  });
});

// ── G · closeoutStats ─────────────────────────────────────────────────────────

describe('G — closeoutStats', () => {
  test('all pending when no actuals attached', () => {
    const events = [makeEvent({ date: PAST }), makeEvent({ id: 'evt-2', date: '2024-06-01', guestCount: 25 })];
    const stats = closeoutStats(events, NOW);
    expect(stats.pendingActuals).toBe(2);
    expect(stats.totalPastWithR1).toBe(2);
    expect(stats.actualsAttached).toBe(0);
  });

  test('correctly counts mixed pending and attached', () => {
    const events = [
      makeEvent({ id: 'evt-1', date: PAST }),
      makeEvent({ id: 'evt-2', date: '2024-06-01', guestCount: 25, intelEvaluations: [makeEval({ id: 'R1:evt-2', actual: { value: 22 } })] }),
    ];
    const stats = closeoutStats(events, NOW);
    expect(stats.pendingActuals).toBe(1);
    expect(stats.totalPastWithR1).toBe(2);
    expect(stats.actualsAttached).toBe(1);
  });

  test('excludes future events from counts', () => {
    const events = [makeEvent({ date: FUTURE })];
    const stats = closeoutStats(events, NOW);
    expect(stats.pendingActuals).toBe(0);
    expect(stats.totalPastWithR1).toBe(0);
  });

  test('returns zero counts for empty input', () => {
    const stats = closeoutStats([], NOW);
    expect(stats.pendingActuals).toBe(0);
    expect(stats.totalPastWithR1).toBe(0);
    expect(stats.actualsAttached).toBe(0);
  });

  test('returns zero counts for null input', () => {
    const stats = closeoutStats(null, NOW);
    expect(stats.pendingActuals).toBe(0);
  });
});

// ── H · write-once invariant (structural) ────────────────────────────────────

describe('H — write-once: once attached, hasActualAttached stays true', () => {
  test('event with actual attached is never pending again', () => {
    const ev = makeEvent({ date: PAST, intelEvaluations: [makeEval({ actual: { value: 35, at: '2025-01-02T10:00:00Z' } })] });
    expect(needsActual(ev)).toBe(false);
    expect(needsCloseout(ev, NOW)).toBe(false);
    expect(pendingCloseouts([ev], NOW)).toHaveLength(0);
  });

  test('actual value of 0 is treated as attached (0 guests is a real outcome)', () => {
    const ev = makeEvent({ date: PAST, intelEvaluations: [makeEval({ actual: { value: 0 } })] });
    expect(hasActualAttached(ev)).toBe(true);
    expect(needsActual(ev)).toBe(false);
  });
});

// ── I · no Stage 2 scoring fields ────────────────────────────────────────────

describe('I — no Stage 2 scoring fields used or produced', () => {
  const SCORE_FIELDS = ['grade', 'accuracy', 'score', 'scoreEvaluation', 'baselineBetter'];

  test('closeoutIntel module exports do not reference scoring fields', () => {
    const moduleExports = {
      hasAcceptedR1, hasActualAttached, needsActual,
      isPastEvent, needsCloseout, pendingCloseouts, closeoutStats,
    };
    // Serialise each function and check for scoring terms
    for (const [name, fn] of Object.entries(moduleExports)) {
      const src = fn.toString();
      for (const field of SCORE_FIELDS) {
        expect(src).not.toContain(field);
      }
    }
  });

  test('closeoutStats return shape has no scoring fields', () => {
    const stats = closeoutStats([makeEvent({ date: PAST })], NOW);
    for (const field of SCORE_FIELDS) {
      expect(stats).not.toHaveProperty(field);
    }
  });
});
