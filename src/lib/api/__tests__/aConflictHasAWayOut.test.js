// ─── A CONFLICT HAS A WAY OUT ────────────────────────────────────────────────
//
// Nielsen re-run N3 (2026-11-02) and board condition C3-3: once a save was
// refused as a conflict there was no way to resolve it. Ruled by the owner
// 2026-11-02 ("go N3"): two choices — "Keep mine" / "Use the newer version" —
// each with an Undo.
//
// And one hole found while building it: a reload let the NEXT edit overwrite
// the newer version without any choice, because loadEvents records the
// server's newest stamp as "seen" and the next conditional write then matched.
// A conflict now HOLDS the version the host loaded until she chooses.
//
// Harness: the same honest mock as aSaveNeverSilentlyOverwrites, with the
// single-row read returning the whole row (resolveConflict needs the content).
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
            data: mockCloud.row ? { id: 'e1', data: mockCloud.row.data, updated_at: mockCloud.row.updated_at } : null, error: null }) }),
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

const { loadEvents, saveEvent, resolveConflict, undoKeepMine, undoUseTheirs } = require('../events');

const mine = () => ({ id: 'e1', name: 'Mine', guests: 12, _cloudUpdatedAt: T1 });
const theirs = { id: 'e1', name: 'Theirs', guests: 30 };

beforeEach(() => {
  localStorage.clear();
  mockCloud.row = { updated_at: T2, data: { name: 'Theirs', guests: 30 } };  // moved on elsewhere
  mockCloud.updates = []; mockCloud.upserts = []; mockCloud.nextStamp = T3;
});

const refuse = async () => {
  const r = await saveEvent(mine());
  expect(r.reason).toBe('conflict');   // premise: the guard refused
};

test('after a conflict, a reload does not let the next edit overwrite the newer version', async () => {
  await refuse();
  await loadEvents();                                // the reload: records T2 as seen
  const r = await saveEvent({ ...mine(), guests: 14 });
  expect(r.reason).toBe('conflict');
  expect(mockCloud.row.data.name).toBe('Theirs');    // untouched
});

test('"Use the newer version" adopts the account copy and lets later edits through', async () => {
  await refuse();
  const r = await resolveConflict(mine(), 'theirs');
  expect(r.ok).toBe(true);
  expect(r.event).toMatchObject({ ...theirs, _cloudUpdatedAt: T2 });
  expect(r.previous).toMatchObject({ name: 'Mine' });
  expect(mockCloud.row.data.name).toBe('Theirs');    // no cloud write
  const next = await saveEvent({ ...r.event, guests: 31 });
  expect(next.ok).toBe(true);
});

test('"Keep mine" writes her copy over the newer version, on purpose, once', async () => {
  await refuse();
  const r = await resolveConflict(mine(), 'mine');
  expect(r.ok).toBe(true);
  expect(mockCloud.row.data).toMatchObject({ name: 'Mine', guests: 12 });
  expect(r.replaced).toMatchObject({ name: 'Theirs' });
  expect(r.event._cloudUpdatedAt).toBe(T3);
  // The write was still conditional — against the version she has now seen.
  const last = mockCloud.updates[mockCloud.updates.length - 1];
  expect(last.lte).toEqual(['updated_at', T2]);
});

test('Undo after "Keep mine" puts the newer version back and the conflict with it', async () => {
  await refuse();
  const r = await resolveConflict(mine(), 'mine');
  mockCloud.nextStamp = '2026-11-02T13:00:00.000000+00:00';
  const u = await undoKeepMine(r.replaced, r.event._cloudUpdatedAt, mine());
  expect(u.ok).toBe(true);
  expect(mockCloud.row.data).toMatchObject({ name: 'Theirs', guests: 30 });
  expect(u.event).toMatchObject({ name: 'Mine' });
  // Back to before the choice: her next edit is refused again.
  const again = await saveEvent({ ...mine(), guests: 15 });
  expect(again.reason).toBe('conflict');
});

test('Undo after "Use the newer version" brings her copy back and the conflict with it', async () => {
  await refuse();
  const r = await resolveConflict(mine(), 'theirs');
  const u = undoUseTheirs(r.previous);
  expect(u.ok).toBe(true);
  expect(u.event).toMatchObject({ name: 'Mine' });
  expect(mockCloud.row.data.name).toBe('Theirs');           // the account was never touched
  const again = await saveEvent({ ...mine(), guests: 16 });
  expect(again.reason).toBe('conflict');                   // held again, as before the choice
});

test('"Keep mine" writes against exactly the version she was shown, whatever else is on record', async () => {
  await refuse();
  localStorage.setItem('ngw-cache-stamps', JSON.stringify({ e1: T3 }));   // a later stamp on record here
  const r = await resolveConflict(mine(), 'mine');
  const last = mockCloud.updates[mockCloud.updates.length - 1];
  expect(last.lte).toEqual(['updated_at', T2]);
  expect(r.ok).toBe(true);
});

// The library is shared with the frozen CRA shell, which takes the account's
// copy on reload and has no conflict buttons. The hold must not strand it.
test('a device that took the newer version (reload in the CRA shell) is not refused forever', async () => {
  await refuse();
  const loaded = await loadEvents();                       // the account copy, stamped T2
  const r = await saveEvent({ ...loaded.find((e) => e.id === 'e1'), guests: 33 });
  expect(r.ok).toBe(true);
  expect(mockCloud.row.data).toMatchObject({ name: 'Theirs', guests: 33 });
});
