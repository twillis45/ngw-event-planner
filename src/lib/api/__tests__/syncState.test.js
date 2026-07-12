// SYNC-HONESTY-1 — V2 sync-state engine (lib/api/syncState).
// Runs with Supabase UNCONFIGURED (test env), so the underlying events.js queue
// key (ngw-cache-pending) is seeded directly where a test needs queue membership
// — exactly the record events.saveEvent writes when a cloud save fails.
import {
  SYNC_STATUS,
  SYNC_STATUS_LABEL,
  getEventSyncStatus,
  getLastSyncTime,
  markEventSynced,
  markEventSyncAttemptFailed,
  recordSaveResult,
  flushPendingEvents,
  getPendingCount,
  installOnlineFlush,
} from '../syncState';

const PENDING_KEY = 'ngw-cache-pending';       // legacy-owned queue (read, never redefined)
const LEGACY_LAST_SYNC = 'ngw-cache-last-sync';
const STAMPS_KEY = 'ngw-hostv2-sync-stamps';
const ATTEMPTS_KEY = 'ngw-hostv2-sync-attempts';

const queueUpsert = (id, data = { id }) => {
  const q = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
  q.push({ type: 'upsert', id, data });
  localStorage.setItem(PENDING_KEY, JSON.stringify(q));
};

beforeEach(() => localStorage.clear());

describe('status vocabulary and labels', () => {
  test('every status has a plain-language label and nothing extra', () => {
    const statuses = Object.values(SYNC_STATUS);
    expect(statuses.sort()).toEqual(['local-only', 'pending', 'sync-failed', 'synced']);
    for (const s of statuses) {
      expect(typeof SYNC_STATUS_LABEL[s]).toBe('string');
      expect(SYNC_STATUS_LABEL[s].trim().length).toBeGreaterThan(0);
    }
    expect(Object.keys(SYNC_STATUS_LABEL).sort()).toEqual(statuses.sort());
  });

  test('labels are honest host language — local-only is "not synced yet", never "failed"', () => {
    expect(SYNC_STATUS_LABEL[SYNC_STATUS.LOCAL_ONLY]).toBe('On this phone — not synced yet');
    expect(SYNC_STATUS_LABEL[SYNC_STATUS.PENDING]).toBe('Waiting to sync');
    expect(SYNC_STATUS_LABEL[SYNC_STATUS.SYNCED]).toBe('Synced');
    expect(SYNC_STATUS_LABEL[SYNC_STATUS.SYNC_FAILED]).toBe('Couldn’t sync — will retry');
    expect(SYNC_STATUS_LABEL[SYNC_STATUS.LOCAL_ONLY].toLowerCase()).not.toContain('fail');
  });
});

describe('success stamps (getLastSyncTime / markEventSynced)', () => {
  test('unknown event has NO last-sync time — null, not a fake timestamp', () => {
    expect(getLastSyncTime('never-seen')).toBeNull();
    expect(getLastSyncTime()).toBeNull(); // nothing has ever synced
  });

  test('stamp round-trip: mark → read back the exact ISO time', () => {
    const at = '2026-07-10T15:30:00.000Z';
    markEventSynced('ev-1', at);
    expect(getLastSyncTime('ev-1')).toBe(at);
    expect(getEventSyncStatus({ id: 'ev-1' })).toBe(SYNC_STATUS.SYNCED);
  });

  test('default stamp is "now" (a real, current timestamp)', () => {
    const before = Date.now();
    markEventSynced('ev-2');
    const t = new Date(getLastSyncTime('ev-2')).getTime();
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(Date.now());
  });

  test('array form stamps every id', () => {
    markEventSynced(['a', 'b'], '2026-07-09T00:00:00.000Z');
    expect(getLastSyncTime('a')).toBe('2026-07-09T00:00:00.000Z');
    expect(getLastSyncTime('b')).toBe('2026-07-09T00:00:00.000Z');
  });

  test('an unparseable timestamp records NOTHING (no fabricated evidence)', () => {
    markEventSynced('ev-3', 'not-a-date');
    expect(getLastSyncTime('ev-3')).toBeNull();
    expect(getEventSyncStatus({ id: 'ev-3' })).toBe(SYNC_STATUS.LOCAL_ONLY);
  });

  test('success clears the failed-attempt record AND the stale queued upsert', () => {
    queueUpsert('ev-4', { id: 'ev-4', v: 'stale' });
    markEventSyncAttemptFailed('ev-4', 'was down');
    expect(getEventSyncStatus({ id: 'ev-4' })).toBe(SYNC_STATUS.SYNC_FAILED);
    markEventSynced('ev-4');
    expect(getEventSyncStatus({ id: 'ev-4' })).toBe(SYNC_STATUS.SYNCED);
    expect(JSON.parse(localStorage.getItem(PENDING_KEY))).toEqual([]); // stale snapshot can never flush over the newer cloud row
  });

  test('no-arg getLastSyncTime returns the newest stamp, honoring the global pull stamp', () => {
    markEventSynced('a', '2026-07-08T00:00:00.000Z');
    markEventSynced('b', '2026-07-09T00:00:00.000Z');
    expect(getLastSyncTime()).toBe('2026-07-09T00:00:00.000Z');
    localStorage.setItem(LEGACY_LAST_SYNC, '2026-07-10T00:00:00.000Z'); // written by a real loadEvents pull
    expect(getLastSyncTime()).toBe('2026-07-10T00:00:00.000Z');
  });

  test('stamp map is pruned by recency, never unbounded', () => {
    markEventSynced('oldest', '2020-01-01T00:00:00.000Z');
    markEventSynced(Array.from({ length: 301 }, (_, i) => 'id-' + i), '2026-07-10T00:00:00.000Z');
    const map = JSON.parse(localStorage.getItem(STAMPS_KEY));
    expect(Object.keys(map).length).toBe(300);
    expect(getLastSyncTime('oldest')).toBeNull(); // the oldest entry is the one dropped
  });
});

describe('getEventSyncStatus honesty', () => {
  test('missing or id-less event → null (no status about nothing)', () => {
    expect(getEventSyncStatus(null)).toBeNull();
    expect(getEventSyncStatus({})).toBeNull();
    expect(getEventSyncStatus({ id: '' })).toBeNull();
  });

  test('no stamp, no queue → local-only (unknown is unknown, not failed)', () => {
    expect(getEventSyncStatus({ id: 'fresh' })).toBe(SYNC_STATUS.LOCAL_ONLY);
  });

  test('queued write with no failed attempt → pending (waiting, not failed)', () => {
    queueUpsert('ev-q');
    expect(getEventSyncStatus({ id: 'ev-q' })).toBe(SYNC_STATUS.PENDING);
  });

  test('queued write whose attempt failed → sync-failed', () => {
    queueUpsert('ev-f');
    markEventSyncAttemptFailed('ev-f', 'network down');
    expect(getEventSyncStatus({ id: 'ev-f' })).toBe(SYNC_STATUS.SYNC_FAILED);
  });

  test('a queued write BEATS an old success stamp — never claims synced with an unflushed edit', () => {
    markEventSynced('ev-s', '2026-07-01T00:00:00.000Z');
    queueUpsert('ev-s');
    expect(getEventSyncStatus({ id: 'ev-s' })).toBe(SYNC_STATUS.PENDING);
  });

  test('queued DELETE ops do not make an event read as pending', () => {
    const q = [{ type: 'delete', id: 'ev-d' }];
    localStorage.setItem(PENDING_KEY, JSON.stringify(q));
    expect(getEventSyncStatus({ id: 'ev-d' })).toBe(SYNC_STATUS.LOCAL_ONLY);
  });
});

describe('recordSaveResult (the shell glue replacing the swallow-everything catch)', () => {
  test('{ ok: true } → stamps a real success', () => {
    expect(recordSaveResult({ id: 'e1' }, { ok: true })).toBe(SYNC_STATUS.SYNCED);
    expect(getLastSyncTime('e1')).not.toBeNull();
    expect(getEventSyncStatus({ id: 'e1' })).toBe(SYNC_STATUS.SYNCED);
  });

  test('queued error → sync-failed, and NO success stamp appears', () => {
    queueUpsert('e2'); // what saveEvent itself did before resolving
    expect(recordSaveResult({ id: 'e2' }, { ok: false, queued: true, reason: 'error', error: 'boom' })).toBe(SYNC_STATUS.SYNC_FAILED);
    expect(getEventSyncStatus({ id: 'e2' })).toBe(SYNC_STATUS.SYNC_FAILED);
    expect(getLastSyncTime('e2')).toBeNull();
  });

  test('queued no-studio → pending (waiting), not failed', () => {
    queueUpsert('e3');
    expect(recordSaveResult({ id: 'e3' }, { ok: false, queued: true, reason: 'no-studio' })).toBe(SYNC_STATUS.PENDING);
    expect(getEventSyncStatus({ id: 'e3' })).toBe(SYNC_STATUS.PENDING);
  });

  test('local-only worlds (not-configured / dev studio) claim nothing', () => {
    expect(recordSaveResult({ id: 'e4' }, { ok: false, queued: false, reason: 'not-configured' })).toBe(SYNC_STATUS.LOCAL_ONLY);
    expect(recordSaveResult({ id: 'e4' }, { ok: false, queued: false, reason: 'local-studio' })).toBe(SYNC_STATUS.LOCAL_ONLY);
    expect(getLastSyncTime('e4')).toBeNull();
  });

  test('id-less event → null, records nothing', () => {
    expect(recordSaveResult(null, { ok: true })).toBeNull();
    expect(localStorage.getItem(STAMPS_KEY)).toBeNull();
  });
});

describe('flushPendingEvents (retry rail)', () => {
  test('stamps every flushed id, records errors for ops that stayed queued', async () => {
    queueUpsert('c'); // c stays queued after this flush
    const res = await flushPendingEvents(async () => ({
      flushed: 2, failed: 1, flushedIds: ['a', 'b'], failedOps: [{ id: 'c', type: 'upsert', error: 'still down' }],
    }));
    expect(res.flushed).toBe(2);
    expect(res.failed).toBe(1);
    expect(getEventSyncStatus({ id: 'a' })).toBe(SYNC_STATUS.SYNCED);
    expect(getEventSyncStatus({ id: 'b' })).toBe(SYNC_STATUS.SYNCED);
    expect(getEventSyncStatus({ id: 'c' })).toBe(SYNC_STATUS.SYNC_FAILED);
  });

  test('a flush that throws degrades to zero-flushed and stamps NOTHING', async () => {
    queueUpsert('x');
    const res = await flushPendingEvents(async () => { throw new Error('offline'); });
    expect(res.flushed).toBe(0);
    expect(res.failed).toBe(1); // the queue still holds the write
    expect(res.flushedIds).toEqual([]);
    expect(getLastSyncTime('x')).toBeNull();
  });

  test('legacy result shape (no id fields) is tolerated without stamping', async () => {
    const res = await flushPendingEvents(async () => ({ flushed: 0, failed: 0 }));
    expect(res).toEqual({ flushed: 0, failed: 0, flushedIds: [], failedOps: [] });
    expect(localStorage.getItem(STAMPS_KEY)).toBeNull();
  });

  test('failed DELETE ops do not create per-event failure records', async () => {
    await flushPendingEvents(async () => ({
      flushed: 0, failed: 1, flushedIds: [], failedOps: [{ id: 'gone', type: 'delete', error: 'nope' }],
    }));
    expect(localStorage.getItem(ATTEMPTS_KEY)).toBeNull();
  });
});

describe('corrupt-storage degradation (never throws, never fabricates)', () => {
  test('corrupt stamps map → reads degrade to null/local-only, writes recover', () => {
    localStorage.setItem(STAMPS_KEY, 'garbage{{{');
    expect(getLastSyncTime('e')).toBeNull();
    expect(getEventSyncStatus({ id: 'e' })).toBe(SYNC_STATUS.LOCAL_ONLY);
    markEventSynced('e', '2026-07-10T00:00:00.000Z'); // recovers with a fresh map
    expect(getLastSyncTime('e')).toBe('2026-07-10T00:00:00.000Z');
  });

  test('stamps map that is an array (wrong shape) is treated as empty', () => {
    localStorage.setItem(STAMPS_KEY, '[1,2,3]');
    expect(getLastSyncTime('e')).toBeNull();
  });

  test('corrupt attempts map + queued write → pending (degrades to the milder claim)', () => {
    queueUpsert('e');
    localStorage.setItem(ATTEMPTS_KEY, '!!!');
    expect(getEventSyncStatus({ id: 'e' })).toBe(SYNC_STATUS.PENDING);
  });

  test('corrupt pending queue → count 0, status local-only', () => {
    localStorage.setItem(PENDING_KEY, '{broken');
    expect(getPendingCount()).toBe(0);
    expect(getEventSyncStatus({ id: 'e' })).toBe(SYNC_STATUS.LOCAL_ONLY);
  });
});

describe('installOnlineFlush', () => {
  const settle = () => new Promise((r) => setTimeout(r, 0));

  test('fires a flush when the connection returns and the queue is non-empty', async () => {
    queueUpsert('q1');
    const results = [];
    const off = installOnlineFlush((res) => results.push(res));
    window.dispatchEvent(new Event('online'));
    await settle(); await settle();
    expect(results.length).toBe(1);
    // Supabase is unconfigured in tests, so the real flush honestly reports zero.
    expect(results[0].flushed).toBe(0);
    off();
  });

  test('does nothing when the queue is empty, and the uninstaller detaches', async () => {
    const results = [];
    const off = installOnlineFlush((res) => results.push(res));
    window.dispatchEvent(new Event('online')); // empty queue → no flush
    await settle();
    expect(results.length).toBe(0);
    off();
    queueUpsert('q2');
    window.dispatchEvent(new Event('online')); // detached → still no flush
    await settle(); await settle();
    expect(results.length).toBe(0);
  });
});
