// SYNC-HONESTY-1 — the honest-result contract added to lib/api/events.js:
// saveEvent reports what really happened, flushPendingEvents reports WHICH ids
// reached the cloud, and the queue is observable per event. The cloud is mocked;
// the queue itself is the real implementation over jsdom localStorage.
const mockCloud = {
  configured: true,
  sid: '11111111-2222-3333-4444-555555555555',
  failUpsertIds: new Set(),
  failDeletes: false,
  upserts: [],
};

jest.mock('../../supabaseClient', () => ({
  isSupabaseConfigured: () => mockCloud.configured,
  supabase: {
    from: () => ({
      upsert: (row) => {
        mockCloud.upserts.push(row);
        return Promise.resolve(mockCloud.failUpsertIds.has(row.id) ? { error: { message: 'cloud down' } } : { error: null });
      },
      delete: () => ({ eq: () => ({ eq: () => Promise.resolve(mockCloud.failDeletes ? { error: { message: 'cloud down' } } : { error: null }) }) }),
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
    }),
  },
}));
jest.mock('../studio', () => ({
  currentStudioId: async () => mockCloud.sid,
  isCloudStudioId: (s) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(s),
}));
jest.mock('../../sentry', () => ({ captureError: () => {} }));

const {
  saveEvent,
  flushPendingEvents,
  getPendingCount,
  getPendingEventIds,
  hasPendingEventWrite,
  clearPendingEventWrite,
} = require('../events');

const PENDING_KEY = 'ngw-cache-pending';
const readQueue = () => JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');

beforeEach(() => {
  localStorage.clear();
  mockCloud.configured = true;
  mockCloud.sid = '11111111-2222-3333-4444-555555555555';
  mockCloud.failUpsertIds = new Set();
  mockCloud.failDeletes = false;
  mockCloud.upserts = [];
});

describe('saveEvent honest result', () => {
  test('cloud success → { ok: true }, nothing queued', async () => {
    const res = await saveEvent({ id: 'e1', name: 'Crab Feast' });
    expect(res).toEqual({ ok: true });
    expect(getPendingCount()).toBe(0);
    expect(hasPendingEventWrite('e1')).toBe(false);
  });

  test('cloud failure → queued for retry, with the real reason', async () => {
    mockCloud.failUpsertIds.add('e2');
    const res = await saveEvent({ id: 'e2', name: 'Game Night' });
    expect(res.ok).toBe(false);
    expect(res.queued).toBe(true);
    expect(res.reason).toBe('error');
    expect(res.error).toBe('cloud down');
    expect(getPendingEventIds()).toEqual(['e2']);
  });

  test('repeat failed saves of one event DEDUP to a single queued write (latest snapshot wins)', async () => {
    mockCloud.failUpsertIds.add('e3');
    await saveEvent({ id: 'e3', name: 'v1' });
    await saveEvent({ id: 'e3', name: 'v2' });
    const q = readQueue();
    expect(q.length).toBe(1);
    expect(q[0].data.name).toBe('v2');
  });

  test('supabase not configured → local-only result, no queue (a flush could never run)', async () => {
    mockCloud.configured = false;
    const res = await saveEvent({ id: 'e4' });
    expect(res).toEqual({ ok: false, queued: false, reason: 'not-configured' });
    expect(getPendingCount()).toBe(0);
  });

  test('no studio yet → queued as waiting, reason no-studio', async () => {
    mockCloud.sid = null;
    const res = await saveEvent({ id: 'e5' });
    expect(res).toEqual({ ok: false, queued: true, reason: 'no-studio' });
    expect(getPendingEventIds()).toEqual(['e5']);
  });

  test('dev-bypass (non-uuid) studio → local-studio, never queued (would 400 forever)', async () => {
    mockCloud.sid = 'dev-studio';
    const res = await saveEvent({ id: 'e6' });
    expect(res).toEqual({ ok: false, queued: false, reason: 'local-studio' });
    expect(getPendingCount()).toBe(0);
  });

  test('localStorage copy is written regardless of cloud outcome', async () => {
    mockCloud.failUpsertIds.add('e7');
    await saveEvent({ id: 'e7', name: 'Kept locally' });
    const local = JSON.parse(localStorage.getItem('ngw-events'));
    expect(local.find((e) => e.id === 'e7').name).toBe('Kept locally');
  });
});

describe('queue observability', () => {
  test('getPendingEventIds reports only upserts; clearPendingEventWrite removes only that id', async () => {
    mockCloud.failUpsertIds.add('a').add('b');
    await saveEvent({ id: 'a' });
    await saveEvent({ id: 'b' });
    localStorage.setItem(PENDING_KEY, JSON.stringify([...readQueue(), { type: 'delete', id: 'gone' }]));
    expect(getPendingEventIds().sort()).toEqual(['a', 'b']);
    clearPendingEventWrite('a');
    expect(getPendingEventIds()).toEqual(['b']);
    expect(readQueue().some((op) => op.type === 'delete' && op.id === 'gone')).toBe(true); // deletes untouched
  });

  test('corrupt queue degrades to empty, never throws', () => {
    localStorage.setItem(PENDING_KEY, '{nope');
    expect(getPendingCount()).toBe(0);
    expect(getPendingEventIds()).toEqual([]);
    expect(() => clearPendingEventWrite('x')).not.toThrow();
  });
});

describe('flushPendingEvents per-op detail', () => {
  test('reports flushedIds for recovered upserts and failedOps for ops still queued', async () => {
    mockCloud.failUpsertIds.add('ok-later').add('still-down');
    await saveEvent({ id: 'ok-later' });
    await saveEvent({ id: 'still-down' });
    mockCloud.failUpsertIds.delete('ok-later'); // the cloud came back for one of them
    const res = await flushPendingEvents();
    expect(res.flushed).toBe(1);
    expect(res.failed).toBe(1);
    expect(res.flushedIds).toEqual(['ok-later']);
    expect(res.failedOps).toEqual([{ id: 'still-down', type: 'upsert', error: 'cloud down' }]);
    expect(getPendingEventIds()).toEqual(['still-down']); // only the failure stays queued
  });

  test('flushed DELETE ops count in flushed but never in flushedIds (no false synced stamp source)', async () => {
    localStorage.setItem(PENDING_KEY, JSON.stringify([{ type: 'delete', id: 'gone' }]));
    const res = await flushPendingEvents();
    expect(res.flushed).toBe(1);
    expect(res.flushedIds).toEqual([]);
    expect(getPendingCount()).toBe(0);
  });

  test('unconfigured / dev studio → empty result with the full shape', async () => {
    mockCloud.configured = false;
    expect(await flushPendingEvents()).toEqual({ flushed: 0, failed: 0, flushedIds: [], failedOps: [] });
    mockCloud.configured = true;
    mockCloud.sid = 'dev-studio';
    expect(await flushPendingEvents()).toEqual({ flushed: 0, failed: 0, flushedIds: [], failedOps: [] });
  });

  test('legacy consumers still get { flushed, failed } exactly as before', async () => {
    mockCloud.failUpsertIds.add('z');
    await saveEvent({ id: 'z' });
    const res = await flushPendingEvents();
    expect(typeof res.flushed).toBe('number');
    expect(typeof res.failed).toBe('number');
    expect(res.failed).toBe(1);
  });
});
