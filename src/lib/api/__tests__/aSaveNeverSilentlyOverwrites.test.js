// ─── A SAVE NEVER SILENTLY OVERWRITES ─────────────────────────────────────────
//
// LIVE_MODE_CENSUS §5 (2026-08-08) recorded the defect and scored the
// checklist line "concurrent edits resolve without silently discarding one"
// as NOT MET: every cloud write was `upsert(..., { onConflict: 'id' })` —
// last-write-wins on the whole blob — and "it silently discards the losing
// side's concurrent edits and nothing surfaces that." UX_08 says never
// silently overwrite. It sat on no stage-9 list.
//
// The cloud->local half was already honest (hydrate adopts a newer cloud copy
// and says so, never over a dirty local one). This pins the local->cloud half:
// a write against a row that has moved on is REFUSED, reported by name, kept
// locally, and never retried as if it might succeed.
//
// The cloud is a small honest mock of the exact chains the code uses. The
// version comparison is the real one: ISO timestamps in one format compare
// lexically, which is what `updated_at <= loadedAt` does on the server.
const T1 = '2026-11-02T10:00:00.000000+00:00';   // the version this device loaded
const T2 = '2026-11-02T11:00:00.000000+00:00';   // a newer write from elsewhere
const T3 = '2026-11-02T12:00:00.000000+00:00';   // the stamp a landed write gets

const mockCloud = { row: null, updates: [], upserts: [], nextStamp: T3 };

jest.mock('../../supabaseClient', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    from: () => ({
      // The guarded path: update().eq().eq().lte().select()
      update: (payload) => {
        const ctx = { payload, eqs: [], lte: null };
        const ch = {
          eq: (k, v) => { ctx.eqs.push([k, v]); return ch; },
          lte: (k, v) => { ctx.lte = [k, v]; return ch; },
          select: () => {
            mockCloud.updates.push(ctx);
            const row = mockCloud.row;
            const landed = !!(row && ctx.lte && ctx.lte[0] === 'updated_at' && row.updated_at <= ctx.lte[1]);
            if (!landed) return Promise.resolve({ data: [], error: null });
            row.updated_at = mockCloud.nextStamp;      // the trigger bumps it
            row.data = payload.data;
            return Promise.resolve({ data: [{ id: 'e1', updated_at: row.updated_at }], error: null });
          },
        };
        return ch;
      },
      // The plain path: upsert().select()
      upsert: (row) => {
        mockCloud.upserts.push(row);
        mockCloud.row = { updated_at: mockCloud.nextStamp, data: row.data };
        const out = Promise.resolve({ data: [{ updated_at: mockCloud.nextStamp }], error: null });
        out.select = () => out;
        return out;
      },
      // Reads: select('updated_at').eq().eq().maybeSingle()  and
      //        select('id, data, updated_at').eq().order()
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve({
            data: mockCloud.row ? { updated_at: mockCloud.row.updated_at } : null, error: null }) }),
          order: () => Promise.resolve({
            data: mockCloud.row ? [{ id: 'e1', data: mockCloud.row.data, updated_at: mockCloud.row.updated_at }] : [],
            error: null }),
        }),
      }),
      delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
    }),
  },
}));
jest.mock('../studio', () => ({
  currentStudioId: async () => '11111111-2222-3333-4444-555555555555',
  isCloudStudioId: (s) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(s),
}));
jest.mock('../../sentry', () => ({ captureError: () => {} }));

const { loadEvents, saveEvent, flushPendingEvents, getPendingCount } = require('../events');
const {
  SYNC_STATUS, recordSaveResult, getEventSyncStatus, markEventSynced,
  flushPendingEvents: flushWithState,
} = require('../syncState');

const localEvents = () => JSON.parse(localStorage.getItem('ngw-events') || '[]');

beforeEach(() => {
  localStorage.clear();
  mockCloud.row = null;
  mockCloud.updates = [];
  mockCloud.upserts = [];
  mockCloud.nextStamp = T3;
});

describe('the version this device loaded travels with the event', () => {
  test('loadEvents carries the row\'s updated_at as _cloudUpdatedAt — the column, not the blob', async () => {
    mockCloud.row = { updated_at: T1, data: { name: 'Crab Feast', guestCount: 40 } };
    const [ev] = await loadEvents();
    expect(ev._cloudUpdatedAt).toBe(T1);
    expect(ev.name).toBe('Crab Feast');
  });
});

describe('saveEvent is conditional on that version', () => {
  test('a save against the version it loaded LANDS, and comes back with the new stamp', async () => {
    mockCloud.row = { updated_at: T1, data: { name: 'before' } };
    const res = await saveEvent({ id: 'e1', name: 'after', _cloudUpdatedAt: T1 });
    expect(res).toEqual({ ok: true, updatedAt: T3 });
    expect(mockCloud.updates).toHaveLength(1);
    expect(mockCloud.upserts).toHaveLength(0);
    // the stamp is provenance, never persisted into the blob
    expect(mockCloud.updates[0].payload.data).not.toHaveProperty('_cloudUpdatedAt');
    expect(mockCloud.updates[0].payload.data.name).toBe('after');
  });

  test('a save against a row that MOVED ON is refused: not written, not queued, edit kept here', async () => {
    mockCloud.row = { updated_at: T2, data: { name: 'theirs, newer' } };
    const res = await saveEvent({ id: 'e1', name: 'mine', _cloudUpdatedAt: T1 });

    expect(res).toMatchObject({ ok: false, queued: false, reason: 'conflict', loadedAt: T1, serverUpdatedAt: T2 });
    // the cloud still holds THEIR version — nothing was overwritten
    expect(mockCloud.row.data.name).toBe('theirs, newer');
    expect(mockCloud.row.updated_at).toBe(T2);
    expect(mockCloud.upserts).toHaveLength(0);
    // not queued: retrying a refused overwrite would just refuse again
    expect(getPendingCount()).toBe(0);
    // and the host's edit was not lost — it is in the local store
    expect(localEvents().find((e) => e.id === 'e1').name).toBe('mine');
  });

  test('an event that was never loaded from the cloud takes the plain upsert — nothing to compare', async () => {
    const res = await saveEvent({ id: 'e1', name: 'created here' });
    expect(res).toEqual({ ok: true, updatedAt: T3 });
    expect(mockCloud.upserts).toHaveLength(1);
    expect(mockCloud.updates).toHaveLength(0);
    expect(mockCloud.upserts[0].data).not.toHaveProperty('_cloudUpdatedAt');
  });
});

describe('a device never conflicts with ITSELF', () => {
  // Measured on the first cut: hostv2 saves on every patch with no debounce,
  // so the second keystroke started before the first write's stamp was back,
  // carried the loaded stamp, met a row its own first write had moved, and
  // was refused as "changed somewhere else". Writes to one id are chained.
  test('two edits in flight at once from one device BOTH land', async () => {
    mockCloud.row = { updated_at: T1, data: { name: 'before' } };
    const first  = saveEvent({ id: 'e1', name: 'a',  _cloudUpdatedAt: T1 });
    const second = saveEvent({ id: 'e1', name: 'ab', _cloudUpdatedAt: T1 });   // not awaited between
    const [r1, r2] = await Promise.all([first, second]);
    expect(r1).toEqual({ ok: true, updatedAt: T3 });
    expect(r2).toEqual({ ok: true, updatedAt: T3 });
    expect(mockCloud.row.data.name).toBe('ab');                 // the later edit is what landed last
    expect(mockCloud.updates.map((u) => u.lte[1])).toEqual([T1, T3]); // the second compared against its OWN new version
  });

  // The frozen CRA shell ignores save results, so its copy keeps the stamp it
  // loaded forever. The lib keeps the newest version this device produced on
  // record, persisted, so that caller is not refused against its own history.
  test('a caller that never adopts the returned stamp still lands its next save', async () => {
    mockCloud.row = { updated_at: T1, data: { name: 'before' } };
    expect(await saveEvent({ id: 'e1', name: 'one', _cloudUpdatedAt: T1 })).toEqual({ ok: true, updatedAt: T3 });
    mockCloud.nextStamp = '2026-11-02T13:00:00.000000+00:00';
    const again = await saveEvent({ id: 'e1', name: 'two', _cloudUpdatedAt: T1 });   // stale stamp, same device
    expect(again).toMatchObject({ ok: true });
    expect(mockCloud.row.data.name).toBe('two');
  });

  test('…and a genuinely foreign newer write is STILL refused after that', async () => {
    mockCloud.row = { updated_at: T1, data: { name: 'before' } };
    await saveEvent({ id: 'e1', name: 'one', _cloudUpdatedAt: T1 });            // this device: row → T3
    mockCloud.row = { updated_at: '2026-11-02T14:00:00.000000+00:00', data: { name: 'theirs' } }; // elsewhere: later
    const res = await saveEvent({ id: 'e1', name: 'two', _cloudUpdatedAt: T1 });
    expect(res).toMatchObject({ ok: false, reason: 'conflict', loadedAt: T3 });   // judged against T3, not T1
    expect(mockCloud.row.data.name).toBe('theirs');
  });
});

describe('the refusal reaches the status the host reads', () => {
  test('recordSaveResult turns a refusal into CONFLICT, and it outranks an older success stamp', () => {
    const ev = { id: 'e1', name: 'x' };
    markEventSynced('e1');                                   // an earlier snapshot did reach the cloud
    expect(getEventSyncStatus(ev)).toBe(SYNC_STATUS.SYNCED);
    expect(recordSaveResult(ev, { ok: false, queued: false, reason: 'conflict' })).toBe(SYNC_STATUS.CONFLICT);
    expect(getEventSyncStatus(ev)).toBe(SYNC_STATUS.CONFLICT); // the stamp is true and not the point
    markEventSynced('e1');                                   // a later real success ends it
    expect(getEventSyncStatus(ev)).toBe(SYNC_STATUS.SYNCED);
  });

  test('the label says where the edit is, in host language', () => {
    const { SYNC_STATUS_LABEL } = require('../syncState');
    expect(SYNC_STATUS_LABEL[SYNC_STATUS.CONFLICT]).toMatch(/this device only/i);
    expect(SYNC_STATUS_LABEL[SYNC_STATUS.CONFLICT]).not.toMatch(/fail|error/i);
  });
});

describe('a queued edit that meets a newer row', () => {
  test('leaves the queue and is reported by name — not retried forever', async () => {
    mockCloud.row = { updated_at: T2, data: { name: 'theirs' } };
    localStorage.setItem('ngw-cache-pending', JSON.stringify([
      { type: 'upsert', id: 'e1', data: { id: 'e1', name: 'mine, from offline', _cloudUpdatedAt: T1 } },
    ]));
    const res = await flushPendingEvents();
    expect(res.flushed).toBe(0);
    expect(res.failedOps).toEqual([{ id: 'e1', type: 'upsert', error: 'conflict' }]);
    // jest's expect() takes ONE argument — the message form is Vitest/Playwright.
    // HANDOFF's fifty-ninth entry records hitting this twice; this was the third.
    expect(getPendingCount()).toBe(0); // a refused write must not sit in the queue being retried
    expect(mockCloud.row.data.name).toBe('theirs');
  });

  test('the sync-state wrapper marks it CONFLICT, not sync-failed', async () => {
    const res = await flushWithState(async () => ({
      flushed: 0, failed: 1, flushedIds: [], failedOps: [{ id: 'e1', type: 'upsert', error: 'conflict' }],
    }));
    expect(res.failed).toBe(1);
    expect(getEventSyncStatus({ id: 'e1' })).toBe(SYNC_STATUS.CONFLICT);
  });
});
