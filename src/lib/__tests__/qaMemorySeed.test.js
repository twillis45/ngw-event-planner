// INTEL-QA-1 Stage 1D-A + 1D-C — QA Memory Seeder tests.
//
// Covers:
//   A. Seeded observations are correctly flagged (_qa, _qaSource).
//   B. Seeded profile makes attendanceAdjustment() return applied: true.
//   C. Production gate throws in production.
//   D. applyQaSeed preserves real (non-QA) observations.
//   E. removeQaSeed strips QA observations without touching real ones.
//   F. isQaSeeded / hasAnyQaObs detection helpers.
//   G. evaluationAudit correctly counts a QA-seeded R1 eval record.
//   H. No scoring fields appear in the captured eval record.
//   I. Normal (non-QA) attendanceAdjustment behavior is unchanged.
//   J. applyQaSeedMeta shape.
//   K. Stage 1D-C URL gate logic and hook idempotency / cleanup behaviour.

import {
  makeQaObservation, makeQaAttendanceProfile, applyQaSeed,
  removeQaSeed, isQaSeeded, hasAnyQaObs, applyQaSeedMeta,
  QA_SOURCE, QA_ID_PREFIX,
} from '../qaMemorySeed';
import { attendanceAdjustment } from '../hostIntel';
import {
  createEvaluation, appendLifecycle, upsertEvaluation,
  evaluationAudit, EVAL_VERSION, DECISION_COST,
} from '../intelEval';

const ASOF = '2026-07-01';

// ─────────────────────────────────────────────────────────────────────────────
// A. Observation shape and flags
// ─────────────────────────────────────────────────────────────────────────────
describe('A — makeQaObservation: shape and QA flags', () => {
  const obs = makeQaObservation('_qa_seed_0', 40, 0.875, '2026-06-01');

  test('produces correct fields', () => {
    expect(obs.eventId).toBe('_qa_seed_0');
    expect(obs.date).toBe('2026-06-01');
    expect(obs.estimate).toBe(40);
    expect(obs.actual).toBe(Math.round(40 * 0.875)); // 35
  });

  test('is flagged _qa: true and _qaSource: "qa-seed"', () => {
    expect(obs._qa).toBe(true);
    expect(obs._qaSource).toBe(QA_SOURCE);
    expect(obs._qaSource).toBe('qa-seed');
  });

  test('no PII fields', () => {
    const piiKeys = ['name', 'email', 'phone', 'address', 'guest'];
    piiKeys.forEach(k => expect(obs).not.toHaveProperty(k));
  });

  test('actual is rounded integer (no floats in store)', () => {
    expect(Number.isInteger(obs.actual)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. Seeded profile triggers R1
// ─────────────────────────────────────────────────────────────────────────────
describe('B — makeQaAttendanceProfile: R1 eligibility', () => {
  const profile = makeQaAttendanceProfile({ asOf: ASOF });

  test('produces a profile with the expected number of observations (default 5)', () => {
    const obs = profile.hostIntelligence.domains.attendance.observations;
    expect(obs).toHaveLength(5);
  });

  test('all observations carry _qa flag', () => {
    const obs = profile.hostIntelligence.domains.attendance.observations;
    obs.forEach(o => {
      expect(o._qa).toBe(true);
      expect(o._qaSource).toBe(QA_SOURCE);
    });
  });

  test('event IDs use the QA prefix', () => {
    const obs = profile.hostIntelligence.domains.attendance.observations;
    obs.forEach(o => expect(o.eventId).toMatch(new RegExp(`^${QA_ID_PREFIX}`)));
  });

  test('attendanceAdjustment returns applied: true for a real-count event', () => {
    const event = { id: 'test-event-123', type: 'Crab Feast', guestCount: 40 };
    const adj = attendanceAdjustment(profile, event, ASOF);
    expect(adj.applied).toBe(true);
    expect(adj.suggested).not.toBe(adj.planned); // non-trivial adjustment
    expect(typeof adj.because).toBe('string');
    expect(adj.because.length).toBeGreaterThan(0);
  });

  test('attendanceAdjustment confidence is Medium or High', () => {
    const event = { id: 'test-event-123', guestCount: 40 };
    const adj = attendanceAdjustment(profile, event, ASOF);
    expect(['Medium', 'High']).toContain(adj.confidence);
  });

  test('attendanceAdjustment stability is Medium or High', () => {
    const event = { id: 'test-event-123', guestCount: 40 };
    const adj = attendanceAdjustment(profile, event, ASOF);
    expect(['Medium', 'High']).toContain(adj.stability);
  });

  test('R1 does NOT fire when guestCount is absent', () => {
    const event = { id: 'test-event-456', type: 'Crab Feast' };
    const adj = attendanceAdjustment(profile, event, ASOF);
    expect(adj.applied).toBe(false);
  });

  test('R1 does NOT fire when intelAttendanceReverted is set', () => {
    const event = { id: 'test-event-789', guestCount: 40, intelAttendanceReverted: true };
    const adj = attendanceAdjustment(profile, event, ASOF);
    expect(adj.applied).toBe(false);
  });

  test('3-observation seed (minimum) also achieves applied: true with stable ratios', () => {
    const p3 = makeQaAttendanceProfile({
      n: 3,
      ratios: [0.875, 0.875, 0.875],
      monthsBack: [1, 3, 5],
      asOf: ASOF,
    });
    const adj = attendanceAdjustment(p3, { id: 'e', guestCount: 40 }, ASOF);
    expect(adj.applied).toBe(true);
    expect(adj.confidence).toBe('Medium');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C. Production gate
// ─────────────────────────────────────────────────────────────────────────────
describe('C — production gate', () => {
  const ORIG = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = ORIG; });

  test('makeQaObservation throws in production', () => {
    process.env.NODE_ENV = 'production';
    expect(() => makeQaObservation('x', 40, 0.9, '2026-01-01')).toThrow('production');
  });

  test('makeQaAttendanceProfile throws in production', () => {
    process.env.NODE_ENV = 'production';
    expect(() => makeQaAttendanceProfile()).toThrow('production');
  });

  test('applyQaSeed throws in production', () => {
    process.env.NODE_ENV = 'production';
    expect(() => applyQaSeed({})).toThrow('production');
  });

  test('removeQaSeed throws in production', () => {
    process.env.NODE_ENV = 'production';
    expect(() => removeQaSeed({})).toThrow('production');
  });

  test('applyQaSeedMeta throws in production', () => {
    process.env.NODE_ENV = 'production';
    expect(() => applyQaSeedMeta()).toThrow('production');
  });

  test('isQaSeeded and hasAnyQaObs do NOT require dev (pure read, no gate)', () => {
    process.env.NODE_ENV = 'production';
    // These are pure readers — no side effects, safe to call anywhere.
    expect(() => isQaSeeded({})).not.toThrow();
    expect(() => hasAnyQaObs({})).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D. applyQaSeed preserves real observations
// ─────────────────────────────────────────────────────────────────────────────
describe('D — applyQaSeed: real observation preservation', () => {
  const realObs = { eventId: 'real-evt-1', date: '2026-01-15', estimate: 50, actual: 45 };
  const profileWithReal = {
    hostIntelligence: {
      version: 1,
      eventsObserved: 1,
      domains: { attendance: { observations: [realObs] } },
    },
  };

  test('real observations are preserved in merged result', () => {
    const merged = applyQaSeed(profileWithReal, { asOf: ASOF });
    const obs = merged.hostIntelligence.domains.attendance.observations;
    expect(obs.some(o => o.eventId === 'real-evt-1')).toBe(true);
  });

  test('QA observations are appended', () => {
    const merged = applyQaSeed(profileWithReal, { asOf: ASOF });
    const obs = merged.hostIntelligence.domains.attendance.observations;
    const qaObs = obs.filter(o => o._qa);
    expect(qaObs.length).toBeGreaterThanOrEqual(3);
  });

  test('real observation is not flagged _qa', () => {
    const merged = applyQaSeed(profileWithReal, { asOf: ASOF });
    const obs = merged.hostIntelligence.domains.attendance.observations;
    const preserved = obs.find(o => o.eventId === 'real-evt-1');
    expect(preserved._qa).toBeUndefined();
  });

  test('eventsObserved of real profile is preserved (not overwritten by seed)', () => {
    const merged = applyQaSeed(profileWithReal, { asOf: ASOF });
    expect(merged.hostIntelligence.eventsObserved).toBe(1);
  });

  test('other profile fields (name, settings, etc.) survive merge', () => {
    const richProfile = { ...profileWithReal, name: 'Todd', studioName: 'NGW' };
    const merged = applyQaSeed(richProfile, { asOf: ASOF });
    expect(merged.name).toBe('Todd');
    expect(merged.studioName).toBe('NGW');
  });

  test('applyQaSeed on empty profile creates a valid seed', () => {
    const merged = applyQaSeed({}, { asOf: ASOF });
    const adj = attendanceAdjustment(merged, { id: 'e', guestCount: 40 }, ASOF);
    expect(adj.applied).toBe(true);
  });

  test('applyQaSeed is idempotent — second call does not double-seed', () => {
    const once = applyQaSeed({}, { asOf: ASOF });
    const twice = applyQaSeed(once, { asOf: ASOF });
    const obs = twice.hostIntelligence.domains.attendance.observations;
    // Re-seeding strips old QA obs (filter !_qa) then re-appends → same count
    const qaCount = obs.filter(o => o._qa).length;
    expect(qaCount).toBe(5); // not 10
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E. removeQaSeed
// ─────────────────────────────────────────────────────────────────────────────
describe('E — removeQaSeed: cleanup', () => {
  const realObs = { eventId: 'real-1', date: '2026-01-01', estimate: 40, actual: 36 };

  test('removes QA observations, preserves real ones', () => {
    const seeded = applyQaSeed(
      { hostIntelligence: { version: 1, eventsObserved: 1, domains: { attendance: { observations: [realObs] } } } },
      { asOf: ASOF },
    );
    const restored = removeQaSeed(seeded);
    const obs = restored.hostIntelligence.domains.attendance.observations;
    expect(obs).toHaveLength(1);
    expect(obs[0].eventId).toBe('real-1');
  });

  test('removeQaSeed on empty profile does not throw', () => {
    expect(() => removeQaSeed({})).not.toThrow();
    expect(() => removeQaSeed(null)).not.toThrow();
  });

  test('after remove, R1 no longer fires (memory too thin)', () => {
    const seeded = applyQaSeed({}, { asOf: ASOF });
    const cleaned = removeQaSeed(seeded);
    const adj = attendanceAdjustment(cleaned, { id: 'e', guestCount: 40 }, ASOF);
    expect(adj.applied).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// F. Detection helpers
// ─────────────────────────────────────────────────────────────────────────────
describe('F — isQaSeeded / hasAnyQaObs detection', () => {
  const pureQa = makeQaAttendanceProfile({ asOf: ASOF });
  const realObs = { eventId: 'r1', date: '2026-01-01', estimate: 40, actual: 36 };
  const mixed = applyQaSeed(
    { hostIntelligence: { version: 1, eventsObserved: 1, domains: { attendance: { observations: [realObs] } } } },
    { asOf: ASOF },
  );

  test('isQaSeeded is true when ALL observations are QA', () => {
    expect(isQaSeeded(pureQa)).toBe(true);
  });

  test('isQaSeeded is false when real observations are present', () => {
    expect(isQaSeeded(mixed)).toBe(false);
  });

  test('isQaSeeded is false for empty / absent profile', () => {
    expect(isQaSeeded({})).toBe(false);
    expect(isQaSeeded(null)).toBe(false);
  });

  test('hasAnyQaObs is true for pure-QA profile', () => {
    expect(hasAnyQaObs(pureQa)).toBe(true);
  });

  test('hasAnyQaObs is true for mixed profile', () => {
    expect(hasAnyQaObs(mixed)).toBe(true);
  });

  test('hasAnyQaObs is false for real-only profile', () => {
    const realOnly = {
      hostIntelligence: { domains: { attendance: { observations: [realObs] } } },
    };
    expect(hasAnyQaObs(realOnly)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// G. evaluationAudit processes QA-seeded R1 records correctly
// ─────────────────────────────────────────────────────────────────────────────
describe('G — evaluationAudit: QA-seeded R1 record', () => {
  // Simulate what FoodPlan.useEffect does when R1 fires on a seeded profile.
  const profile = makeQaAttendanceProfile({ asOf: ASOF });
  const event = { id: 'cloud-event-abc', type: 'Crab Feast', guestCount: 40, date: '2026-09-15' };
  const adj = attendanceAdjustment(profile, event, ASOF);

  const AT = `${ASOF}T10:00:00.000Z`;
  const evalRecord = appendLifecycle(
    appendLifecycle(
      createEvaluation({
        eventId: event.id,
        readerId: 'R1',
        at: AT,
        recommendation: {
          from: adj.planned, to: adj.suggested, ratio: adj.ratio,
          because: adj.because, confidence: adj.confidence, stability: adj.stability,
          gate: { eligible: true, observations: adj.n, required: 3 },
          observations: adj.n, applied: true,
        },
        baseline: { value: adj.planned, source: 'playbook' },
        counterfactual: { default: adj.planned, reader: adj.suggested, host: adj.suggested },
        metadata: {
          readerVersion: 1, layer: 'host', domain: 'attendance',
          source: 'attendance-memory', decisionCost: DECISION_COST.HIGH,
          ...applyQaSeedMeta(),        // ← QA flag in the eval record metadata
        },
      }),
      'presented', AT,
    ),
    'accepted', AT,
  );

  const eventsData = [{ ...event, intelEvaluations: upsertEvaluation([], evalRecord) }];
  const audit = evaluationAudit(eventsData, ASOF);

  test('audit finds 1 record', () => {
    expect(audit.totals.records).toBe(1);
  });

  test('shown count is 1', () => {
    expect(audit.totals.shown).toBe(1);
  });

  test('accepted count is 1 (R1 auto-accepts)', () => {
    expect(audit.totals.accepted).toBe(1);
  });

  test('malformed count is 0', () => {
    expect(audit.totals.malformed).toBe(0);
  });

  test('record row decision is "Accepted"', () => {
    expect(audit.records[0].decision).toBe('Accepted');
  });

  test('record row reader is "R1"', () => {
    expect(audit.records[0].reader).toBe('R1');
  });

  test('record row recommendationType is "attendance"', () => {
    expect(audit.records[0].recommendationType).toBe('attendance');
  });

  test('baselinePresent is true', () => {
    expect(audit.records[0].baselinePresent).toBe(true);
  });

  test('actualAttached is false (no reconciliation yet)', () => {
    expect(audit.records[0].actualAttached).toBe(false);
  });

  test('evaluationReady is false (no actual yet — Stage 2 pending)', () => {
    expect(audit.records[0].evaluationReady).toBe(false);
  });

  test('QA metadata flag is present on the raw eval record', () => {
    expect(evalRecord.metadata._qa).toBe(true);
    expect(evalRecord.metadata._qaSource).toBe(QA_SOURCE);
  });

  test('eventsWithEvaluations is 1', () => {
    expect(audit.eventsWithEvaluations).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// H. No scoring fields in the captured eval record
// ─────────────────────────────────────────────────────────────────────────────
describe('H — no Stage 2 scoring fields', () => {
  const profile = makeQaAttendanceProfile({ asOf: ASOF });
  const adj = attendanceAdjustment(profile, { id: 'ev-score-check', guestCount: 40 }, ASOF);
  const rec = createEvaluation({
    eventId: 'ev-score-check', readerId: 'R1', at: `${ASOF}T00:00:00.000Z`,
    recommendation: { from: adj.planned, to: adj.suggested, confidence: adj.confidence },
    baseline: { value: adj.planned, source: 'playbook' },
    metadata: { domain: 'attendance', ...applyQaSeedMeta() },
  });

  const scoringFields = ['grade', 'accuracy', 'score', 'scoreEvaluation'];

  scoringFields.forEach(field => {
    test(`record has no "${field}" field at top level`, () => {
      expect(rec).not.toHaveProperty(field);
    });
  });

  test('evaluation block is reserved-empty (pending, no grade)', () => {
    expect(rec.evaluation.status).toBe('pending');
    expect(rec.evaluation.grade).toBeNull();
    expect(rec.evaluation.baselineBetter).toBeNull();
    expect(rec.evaluation.delta).toBeNull();
  });

  test('utility block is reserved-empty', () => {
    const u = rec.utility;
    Object.values(u).forEach(v => expect(v).toBeNull());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// I. Normal attendanceAdjustment behavior is unchanged for non-QA profiles
// ─────────────────────────────────────────────────────────────────────────────
describe('I — production R1 thresholds unchanged', () => {
  const realProfile = {
    hostIntelligence: {
      version: 1, eventsObserved: 3,
      domains: {
        attendance: {
          observations: [
            { eventId: 'r1', date: '2026-01-01', estimate: 40, actual: 34 },
            { eventId: 'r2', date: '2026-02-01', estimate: 40, actual: 35 },
            { eventId: 'r3', date: '2026-03-01', estimate: 40, actual: 34 },
          ],
        },
      },
    },
  };

  test('3 real stable obs still make R1 fire (production threshold unchanged)', () => {
    const adj = attendanceAdjustment(realProfile, { id: 'ev', guestCount: 40 }, ASOF);
    expect(adj.applied).toBe(true);
  });

  test('1 real obs does NOT fire (same threshold as before)', () => {
    const sparse = {
      hostIntelligence: {
        version: 1, eventsObserved: 1,
        domains: { attendance: { observations: [{ eventId: 'r1', date: '2026-01-01', estimate: 40, actual: 34 }] } },
      },
    };
    const adj = attendanceAdjustment(sparse, { id: 'ev', guestCount: 40 }, ASOF);
    expect(adj.applied).toBe(false);
  });

  test('2 real obs does NOT fire (confidence Low — below Medium threshold)', () => {
    const two = {
      hostIntelligence: {
        version: 1, eventsObserved: 2,
        domains: {
          attendance: {
            observations: [
              { eventId: 'r1', date: '2026-01-01', estimate: 40, actual: 34 },
              { eventId: 'r2', date: '2026-02-01', estimate: 40, actual: 35 },
            ],
          },
        },
      },
    };
    const adj = attendanceAdjustment(two, { id: 'ev', guestCount: 40 }, ASOF);
    expect(adj.applied).toBe(false);
  });

  test('unstable real obs do NOT fire (stability Low — below Medium)', () => {
    const unstable = {
      hostIntelligence: {
        version: 1, eventsObserved: 5,
        domains: {
          attendance: {
            observations: [
              { eventId: 'r1', date: '2026-01-01', estimate: 100, actual: 80 },
              { eventId: 'r2', date: '2026-02-01', estimate: 100, actual: 125 },
              { eventId: 'r3', date: '2026-03-01', estimate: 100, actual: 72 },
              { eventId: 'r4', date: '2026-04-01', estimate: 100, actual: 118 },
              { eventId: 'r5', date: '2026-05-01', estimate: 100, actual: 99 },
            ],
          },
        },
      },
    };
    const adj = attendanceAdjustment(unstable, { id: 'ev', guestCount: 100 }, ASOF);
    expect(adj.applied).toBe(false);
  });

  test('QA seeder import does NOT alter attendanceAdjustment module behavior', () => {
    // Re-importing after qaMemorySeed has been imported must not change real behavior.
    const adj = attendanceAdjustment(realProfile, { id: 'ev', guestCount: 40 }, ASOF);
    expect(adj.n).toBeGreaterThanOrEqual(3);
    expect(adj.applied).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// J. applyQaSeedMeta shape
// ─────────────────────────────────────────────────────────────────────────────
describe('J — applyQaSeedMeta', () => {
  test('returns _qa: true and _qaSource: "qa-seed"', () => {
    const meta = applyQaSeedMeta();
    expect(meta._qa).toBe(true);
    expect(meta._qaSource).toBe('qa-seed');
  });

  test('safe to spread into eval metadata', () => {
    const merged = { readerVersion: 1, domain: 'attendance', ...applyQaSeedMeta() };
    expect(merged.readerVersion).toBe(1);
    expect(merged._qa).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// K. Stage 1D-C — URL gate logic and hook behaviour
// ─────────────────────────────────────────────────────────────────────────────
describe('K — URL gate logic (IS_QA_SEED_PARAM pattern)', () => {
  // URLSearchParams is available in jsdom — test the exact string parsing used
  // by the module-level IS_QA_SEED_PARAM constant in App.js.

  test('?qaSeed=attendance activates the gate', () => {
    const params = new URLSearchParams('?qaSeed=attendance');
    expect(params.get('qaSeed') === 'attendance').toBe(true);
  });

  test('missing qaSeed param does NOT activate', () => {
    const params = new URLSearchParams('?other=foo');
    expect(params.get('qaSeed') === 'attendance').toBe(false);
  });

  test('wrong value does NOT activate', () => {
    const params = new URLSearchParams('?qaSeed=something-else');
    expect(params.get('qaSeed') === 'attendance').toBe(false);
  });

  test('empty search string does NOT activate', () => {
    const params = new URLSearchParams('');
    expect(params.get('qaSeed') === 'attendance').toBe(false);
  });

  test('idempotency guard — seed not applied when hasAnyQaObs is true', () => {
    // Simulates the useEffect guard: if (hasAnyQaObs(profile)) return;
    // Applying twice must not grow the observation list.
    const base = {};
    const seeded = applyQaSeed(base);
    const seededAgain = applyQaSeed(seeded);
    const obsAfterFirst  = seeded.hostIntelligence.domains.attendance.observations.length;
    const obsAfterSecond = seededAgain.hostIntelligence.domains.attendance.observations.length;
    expect(hasAnyQaObs(seeded)).toBe(true);
    // applyQaSeed itself is idempotent (strips+replaces), not a double-accumulator
    expect(obsAfterSecond).toBe(obsAfterFirst);
  });

  test('removeQaSeed clears seed so hasAnyQaObs becomes false', () => {
    const seeded = applyQaSeed({});
    expect(hasAnyQaObs(seeded)).toBe(true);
    const cleaned = removeQaSeed(seeded);
    expect(hasAnyQaObs(cleaned)).toBe(false);
  });

  test('after removeQaSeed the hook would re-seed on next URL activation', () => {
    // Verify the idempotency guard lets the seed reapply after a clean remove.
    const seeded  = applyQaSeed({});
    const cleaned = removeQaSeed(seeded);
    expect(hasAnyQaObs(cleaned)).toBe(false); // guard passes → seed would apply
    const reseeded = applyQaSeed(cleaned);
    expect(hasAnyQaObs(reseeded)).toBe(true);
  });

  test('removeQaSeed does not touch real (non-QA) observations', () => {
    const realObs = { eventId: 'real-1', date: '2024-01-01', estimate: 40, actual: 35 };
    const profileWithReal = {
      hostIntelligence: {
        version: 1, eventsObserved: 1,
        domains: { attendance: { observations: [realObs] } },
      },
    };
    const seeded  = applyQaSeed(profileWithReal);
    const cleaned = removeQaSeed(seeded);
    const obs = cleaned.hostIntelligence.domains.attendance.observations;
    expect(obs).toHaveLength(1);
    expect(obs[0].eventId).toBe('real-1');
    expect(obs[0]._qa).toBeUndefined();
  });

  test('QA seed observations carry _qa:true for future Stage 2 exclusion', () => {
    const seeded = applyQaSeed({});
    const obs = seeded.hostIntelligence.domains.attendance.observations;
    expect(obs.length).toBeGreaterThan(0);
    expect(obs.every(o => o._qa === true)).toBe(true);
    expect(obs.every(o => o._qaSource === 'qa-seed')).toBe(true);
  });

  test('production guard fires on applyQaSeed in production', () => {
    const orig = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });
    expect(() => applyQaSeed({})).toThrow('[INTEL-QA-1]');
    Object.defineProperty(process.env, 'NODE_ENV', { value: orig, configurable: true });
  });

  test('production guard fires on removeQaSeed in production', () => {
    const orig = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });
    expect(() => removeQaSeed({})).toThrow('[INTEL-QA-1]');
    Object.defineProperty(process.env, 'NODE_ENV', { value: orig, configurable: true });
  });

  test('no Stage 2 scoring fields in seeded eval metadata', () => {
    const SCORE_FIELDS = ['grade', 'accuracy', 'score', 'scoreEvaluation', 'baselineBetter'];
    const meta = applyQaSeedMeta();
    for (const field of SCORE_FIELDS) {
      expect(meta).not.toHaveProperty(field);
    }
  });
});
