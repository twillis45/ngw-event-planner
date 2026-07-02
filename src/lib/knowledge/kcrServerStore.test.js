// KCR-4 — server-backed store: server load, offline fallback, authoritative upsert,
// second-device/session simulation. The API is mocked with an in-memory "server".
jest.mock('../api/kcr');
import { isKcrApiConfigured, fetchKCRs, upsertKCRsRemote } from '../api/kcr';
import { loadKCRs, upsertKCR, syncIntake, getKCR, clearKCRs, loadLocalKCRs, saveLocalKCRs } from './kcrStore';

let server; let clk;
beforeEach(() => {
  clearKCRs();
  server = [];
  clk = 0;
  isKcrApiConfigured.mockReturnValue(true);
  // fetch returns each row WITH its version stamp (_serverUpdatedAt), like the real GET.
  fetchKCRs.mockImplementation(async () => server.map((s) => ({ ...s })));
  // upsert mirrors the server: optimistic concurrency — reject a write whose base
  // (_serverUpdatedAt) is older than the stored row's version. Otherwise write + bump.
  upsertKCRsRemote.mockImplementation(async (kcrs) => {
    const conflicts = []; let upserted = 0;
    for (const k of kcrs) {
      const existing = server.find((s) => s.id === k.id);
      const base = k._serverUpdatedAt;
      if (existing && base != null && existing._serverUpdatedAt > base) {
        conflicts.push({ id: k.id, serverUpdatedAt: existing._serverUpdatedAt });
        continue;
      }
      const clean = { ...k, _serverUpdatedAt: (clk += 1) };
      server = server.filter((s) => s.id !== k.id); server.push(clean); upserted += 1;
    }
    return { upserted, conflicts };
  });
});

describe('server load + cache', () => {
  test('loadKCRs returns server data and refreshes the local cache', async () => {
    server = [{ id: 'a', status: 'draft', assetId: 'Crab Feast' }];
    const list = await loadKCRs();
    expect(list.map((k) => k.id)).toContain('a');
    expect(loadLocalKCRs().map((k) => k.id)).toContain('a'); // cached for getKCR / offline
  });
});

describe('offline fallback', () => {
  test('when the API is down, loadKCRs returns the local cache', async () => {
    saveLocalKCRs([{ id: 'cached', status: 'researching' }]);
    fetchKCRs.mockResolvedValueOnce(null); // API unreachable
    const list = await loadKCRs();
    expect(list.map((k) => k.id)).toContain('cached');
  });
  test('when unconfigured, the store is purely local (no server call)', async () => {
    isKcrApiConfigured.mockReturnValue(false);
    saveLocalKCRs([{ id: 'local', status: 'draft' }]);
    const list = await loadKCRs();
    expect(list.map((k) => k.id)).toEqual(['local']);
    expect(fetchKCRs).not.toHaveBeenCalled();
  });
});

describe('authoritative upsert reaches the server (incoming wins)', () => {
  test('upsertKCR writes local + pushes to the server', async () => {
    await upsertKCR({ id: 'x', status: 'published', assetId: 'Crab Feast' });
    expect(upsertKCRsRemote).toHaveBeenCalled();
    expect(server.find((k) => k.id === 'x').status).toBe('published');
    expect(getKCR('x').status).toBe('published'); // local cache mirror
  });
});

describe('second device / session simulation', () => {
  test('a KCR advanced on device A is visible on device B (empty cache) via the server', async () => {
    // Device A advances a KCR → server.
    await upsertKCR({ id: 'shared', status: 'researching', assetId: 'Crab Feast', evidence: [{ id: 'ev-1' }] });
    expect(server.find((k) => k.id === 'shared')).toBeTruthy();
    // Device B: fresh session, empty local cache.
    clearKCRs();
    expect(loadLocalKCRs()).toEqual([]);
    const list = await loadKCRs();              // pulls from the server
    const shared = list.find((k) => k.id === 'shared');
    expect(shared.status).toBe('researching');  // device B sees A's advance
    expect(shared.evidence).toHaveLength(1);
  });
});

describe('optimistic concurrency — stale admin session cannot overwrite newer progress (KCR-5)', () => {
  test('a stale write is rejected as a conflict and the local cache refreshes to server truth', async () => {
    // Another admin already advanced x to `review` (version 5) on the server.
    server = [{ id: 'x', status: 'review', assetId: 'Crab Feast', _serverUpdatedAt: 5 }];
    clk = 5;
    // Our session is STALE — it advances x from an OLD base (version 2).
    const staleAdvance = { id: 'x', status: 'researching', assetId: 'Crab Feast', _serverUpdatedAt: 2 };
    const res = await upsertKCR(staleAdvance);
    expect(res.conflict).toBe(true);                 // server rejected the stale write
    expect(getKCR('x').status).toBe('review');        // cache refreshed to server truth
    expect(server.find((k) => k.id === 'x').status).toBe('review'); // server never clobbered
  });
  test('an up-to-date write (base matches) succeeds', async () => {
    server = [{ id: 'y', status: 'draft', assetId: 'Wedding', _serverUpdatedAt: 3 }];
    clk = 3;
    const res = await upsertKCR({ id: 'y', status: 'researching', assetId: 'Wedding', _serverUpdatedAt: 3 });
    expect(res.conflict).toBe(false);
    expect(server.find((k) => k.id === 'y').status).toBe('researching');
  });
});

describe('syncIntake pushes the reconciled backlog to the server', () => {
  test('generated intake is persisted server-side, progress preserved', async () => {
    // A previously-advanced KCR lives on the server.
    server = [{ id: 'g1', status: 'review', assetId: 'Crab Feast', evidence: [{ id: 'ev-1' }] }];
    // Fresh intake regenerates g1 as a draft + adds g2.
    const res = await syncIntake([
      { id: 'g1', status: 'draft', reason: 'refreshed', priority: 'high' },
      { id: 'g2', status: 'draft', assetId: 'Wedding' },
    ]);
    expect(res.added).toBe(1);
    expect(res.refreshed).toBe(1);
    const g1 = server.find((k) => k.id === 'g1');
    expect(g1.status).toBe('review');     // progress preserved (not clobbered to draft)
    expect(g1.reason).toBe('refreshed');  // derived metadata refreshed
    expect(server.find((k) => k.id === 'g2')).toBeTruthy();
  });
});
