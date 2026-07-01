// ── INTEL-QA-1 Sync Status Visibility — syncStatus tests ─────────────────────
import { getEventSyncStatus, makeEventSyncRow, SYNC_STATUS, SYNC_STATUS_LABEL } from '../syncStatus';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeEvent(overrides = {}) {
  return { id: 'evt-1', name: 'Summer Gala', intelEvaluations: [], ...overrides };
}

const CLOUD_CTX  = { isSample: false, isCloudSession: true,  hasSynced: true  };
const LOCAL_CTX  = { isSample: false, isCloudSession: false, hasSynced: false };
const SAMPLE_CTX = { isSample: true,  isCloudSession: false, hasSynced: false };
const CLOUD_NO_SYNC = { isSample: false, isCloudSession: true, hasSynced: false };

// ── A · null / missing event ──────────────────────────────────────────────────

describe('A — null/missing event', () => {
  test('returns unknown for null event', () => {
    expect(getEventSyncStatus(null)).toBe(SYNC_STATUS.UNKNOWN);
  });

  test('returns unknown for undefined event', () => {
    expect(getEventSyncStatus(undefined)).toBe(SYNC_STATUS.UNKNOWN);
  });

  test('returns local-only with no sessionCtx (isCloudSession defaults false)', () => {
    expect(getEventSyncStatus(makeEvent())).toBe(SYNC_STATUS.LOCAL_ONLY);
  });
});

// ── B · sample events ─────────────────────────────────────────────────────────

describe('B — sample events', () => {
  test('returns sample when isSample is true', () => {
    expect(getEventSyncStatus(makeEvent(), SAMPLE_CTX)).toBe(SYNC_STATUS.SAMPLE);
  });

  test('sample takes priority even if isCloudSession and hasSynced are true', () => {
    expect(getEventSyncStatus(makeEvent(), { isSample: true, isCloudSession: true, hasSynced: true }))
      .toBe(SYNC_STATUS.SAMPLE);
  });

  test('sample label is correct', () => {
    expect(SYNC_STATUS_LABEL['sample']).toBe('Sample event · local only');
  });
});

// ── C · local-only (non-cloud session) ───────────────────────────────────────

describe('C — local-only', () => {
  test('returns local-only when not a cloud session', () => {
    expect(getEventSyncStatus(makeEvent(), LOCAL_CTX)).toBe(SYNC_STATUS.LOCAL_ONLY);
  });

  test('returns local-only when isCloudSession false and hasSynced true (impossible but safe)', () => {
    expect(getEventSyncStatus(makeEvent(), { isSample: false, isCloudSession: false, hasSynced: true }))
      .toBe(SYNC_STATUS.LOCAL_ONLY);
  });

  test('local-only label is correct', () => {
    expect(SYNC_STATUS_LABEL['local-only']).toBe('Local only');
  });
});

// ── D · server-synced ─────────────────────────────────────────────────────────

describe('D — server-synced', () => {
  test('returns server-synced when cloud session and synced', () => {
    expect(getEventSyncStatus(makeEvent(), CLOUD_CTX)).toBe(SYNC_STATUS.SERVER_SYNCED);
  });

  test('server-synced label is correct', () => {
    expect(SYNC_STATUS_LABEL['server-synced']).toBe('Server synced');
  });
});

// ── E · unknown (cloud session but not yet synced) ───────────────────────────

describe('E — unknown', () => {
  test('returns unknown when cloud session but hasSynced is false', () => {
    expect(getEventSyncStatus(makeEvent(), CLOUD_NO_SYNC)).toBe(SYNC_STATUS.UNKNOWN);
  });

  test('unknown label is correct', () => {
    expect(SYNC_STATUS_LABEL['unknown']).toBe('Server sync unknown');
  });
});

// ── F · honesty invariant — never false 'server-synced' ──────────────────────

describe('F — honesty: never claims server-synced without both cloud + sync', () => {
  const variants = [
    { isSample: false, isCloudSession: false, hasSynced: false },
    { isSample: false, isCloudSession: true,  hasSynced: false },
    { isSample: false, isCloudSession: false, hasSynced: true  },
    { isSample: true,  isCloudSession: true,  hasSynced: true  },
  ];
  variants.forEach((ctx, i) => {
    test(`variant ${i}: ctx=${JSON.stringify(ctx)} is not server-synced`, () => {
      expect(getEventSyncStatus(makeEvent(), ctx)).not.toBe(SYNC_STATUS.SERVER_SYNCED);
    });
  });
});

// ── G · SYNC_STATUS constants ─────────────────────────────────────────────────

describe('G — SYNC_STATUS constants', () => {
  test('SAMPLE constant is correct', ()   => expect(SYNC_STATUS.SAMPLE).toBe('sample'));
  test('LOCAL_ONLY constant is correct',  ()  => expect(SYNC_STATUS.LOCAL_ONLY).toBe('local-only'));
  test('SERVER_SYNCED constant is correct', () => expect(SYNC_STATUS.SERVER_SYNCED).toBe('server-synced'));
  test('UNKNOWN constant is correct',     ()  => expect(SYNC_STATUS.UNKNOWN).toBe('unknown'));
});

// ── H · makeEventSyncRow ──────────────────────────────────────────────────────

describe('H — makeEventSyncRow', () => {
  test('returns correct shape for a server-synced event', () => {
    const ev = makeEvent({ id: 'evt-42', name: 'Gala', intelEvaluations: [{ id: 'R1:evt-42' }] });
    const row = makeEventSyncRow(ev, CLOUD_CTX, '2026-07-01T10:00:00Z');
    expect(row.id).toBe('evt-42');
    expect(row.name).toBe('Gala');
    expect(row.syncStatus).toBe(SYNC_STATUS.SERVER_SYNCED);
    expect(row.hasIntel).toBe(true);
    expect(row.updatedAt).toBe('2026-07-01T10:00:00Z');
  });

  test('hasIntel is false when intelEvaluations is empty', () => {
    const row = makeEventSyncRow(makeEvent(), CLOUD_CTX, null);
    expect(row.hasIntel).toBe(false);
  });

  test('hasIntel is false when intelEvaluations is absent', () => {
    const ev = { id: 'evt-1', name: 'Test' };
    const row = makeEventSyncRow(ev, LOCAL_CTX, null);
    expect(row.hasIntel).toBe(false);
  });

  test('updatedAt is null when lastSyncTime is null', () => {
    const row = makeEventSyncRow(makeEvent(), LOCAL_CTX, null);
    expect(row.updatedAt).toBeNull();
  });

  test('no PII fields in row (no email, phone, guests)', () => {
    const ev = makeEvent({ email: 'x@x.com', phone: '555-1234', guests: [{ name: 'Alice' }] });
    const row = makeEventSyncRow(ev, CLOUD_CTX, null);
    expect(row).not.toHaveProperty('email');
    expect(row).not.toHaveProperty('phone');
    expect(row).not.toHaveProperty('guests');
  });

  test('syncStatus on row matches standalone getEventSyncStatus', () => {
    const ev = makeEvent();
    const row = makeEventSyncRow(ev, LOCAL_CTX, null);
    expect(row.syncStatus).toBe(getEventSyncStatus(ev, LOCAL_CTX));
  });
});

// ── I · no Stage 2 scoring fields ────────────────────────────────────────────

describe('I — no Stage 2 scoring fields', () => {
  const SCORE_FIELDS = ['grade', 'accuracy', 'score', 'scoreEvaluation', 'baselineBetter'];

  test('getEventSyncStatus source contains no scoring terms', () => {
    const src = getEventSyncStatus.toString();
    SCORE_FIELDS.forEach(f => expect(src).not.toContain(f));
  });

  test('makeEventSyncRow result has no scoring fields', () => {
    const row = makeEventSyncRow(makeEvent(), CLOUD_CTX, null);
    SCORE_FIELDS.forEach(f => expect(row).not.toHaveProperty(f));
  });
});
