// ─── A CO-HOST SAVES INTO THE HOST'S STUDIO (026, owner ruling 11/16/2026) ──
// The co-host's own studio is not where the event lives. Every save of a
// co-hosted event must target the HOST'S studio (`_cohostOf`, from the load),
// must never upsert (an upsert could re-home or create the row — the database
// refuses both, and this never asks), and must not write `_cohostOf` into the
// plan. The host's own events still save as before.
const MINE = '22222222-0000-0000-0000-000000000002';      // the co-host's own studio
const HOSTS = '11111111-0000-0000-0000-000000000001';     // the host's studio
const calls = { updates: [], upserts: [], reads: [] };

jest.mock('../../supabaseClient', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    from: () => ({
      update: (payload) => {
        const ctx = { payload, eqs: [], lte: null };
        const ch = {
          eq: (k, v) => { ctx.eqs.push([k, v]); return ch; },
          lte: (k, v) => { ctx.lte = [k, v]; return ch; },
          select: () => { calls.updates.push(ctx); return Promise.resolve({ data: [{ id: 'e1', updated_at: 'T9' }], error: null }); },
        };
        return ch;
      },
      upsert: (row) => { calls.upserts.push(row); const p = Promise.resolve({ data: [{ updated_at: 'T9' }], error: null }); p.select = () => p; return p; },
      select: (cols) => ({
        eq: (k, v) => ({
          order: () => Promise.resolve({ data: [{ id: 'own-1', data: { name: 'Mine' }, updated_at: 'T1' }], error: null }),
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
        }),
        neq: (k, v) => { calls.reads.push([cols, k, v]); return Promise.resolve({ data: [{ id: 'co-1', data: { name: 'Friendsgiving' }, updated_at: 'T2', studio_id: HOSTS }], error: null }); },
      }),
    }),
  },
}));
jest.mock('../studio', () => ({
  currentStudioId: async () => MINE,
  isCloudStudioId: (s) => typeof s === 'string' && /^[0-9a-f]{8}-/.test(s),
}));
jest.mock('../../sentry', () => ({ captureError: () => {} }));

const { loadEvents, saveEvent } = require('../events');

beforeEach(() => { localStorage.clear(); calls.updates.length = 0; calls.upserts.length = 0; calls.reads.length = 0; });

test('a load brings the co-hosted event, tagged with the host’s studio', async () => {
  const evs = await loadEvents();
  const co = evs.find((e) => e.id === 'co-1');
  expect(co._cohostOf).toBe(HOSTS);
  expect(evs.find((e) => e.id === 'own-1')._cohostOf).toBeUndefined();
  expect(calls.reads[0]).toEqual(['id, data, updated_at, studio_id', 'studio_id', MINE]);
});

test('saving it updates the row in the HOST’S studio, never upserts, never saves the tag', async () => {
  const r = await saveEvent({ id: 'co-1', name: 'Friendsgiving!', _cohostOf: HOSTS, _cloudUpdatedAt: 'T2' });
  expect(r.ok).toBe(true);
  expect(calls.upserts).toEqual([]);
  expect(calls.updates).toHaveLength(1);
  expect(calls.updates[0].eqs).toEqual([['id', 'co-1'], ['studio_id', HOSTS]]);
  expect(calls.updates[0].payload.data).toEqual({ id: 'co-1', name: 'Friendsgiving!' });
});

test('with no version yet, it still only updates — in the host’s studio', async () => {
  const r = await saveEvent({ id: 'co-2', name: 'New to this device', _cohostOf: HOSTS });
  expect(r.ok).toBe(true);
  expect(calls.upserts).toEqual([]);
  expect(calls.updates[0].eqs).toEqual([['id', 'co-2'], ['studio_id', HOSTS]]);
});

test('the host’s own event still saves into their own studio', async () => {
  await saveEvent({ id: 'own-2', name: 'Mine, new' });
  expect(calls.upserts).toHaveLength(1);
  expect(calls.upserts[0].studio_id).toBe(MINE);
});
