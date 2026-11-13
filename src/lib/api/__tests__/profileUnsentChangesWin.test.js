// ─── G19: A PROFILE EDIT IS NOT WIPED BY THE ACCOUNT COPY ────────────────────
//
// The sign-in pull replaced this device's profile wholesale with the account
// row, and saveProfile swallowed failures without retrying. Owner ruling
// 11/12/2026: this device's unsent changes win. The browser half lives in
// hostv2/e2e/theProfileFollowsTheAccount.spec.mjs; this drives the module.
const SID = '11111111-2222-3333-4444-555555555555';
const OTHER = '99999999-2222-3333-4444-555555555555';

const mockCloud = { row: null, upserts: [], failWrites: false, failReads: false, sid: SID, hold: null, failName: null };

jest.mock('../../supabaseClient', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => (mockCloud.failReads
            ? Promise.resolve({ data: null, error: new Error('offline') })
            : Promise.resolve({ data: mockCloud.row ? { data: mockCloud.row } : null, error: null })),
        }),
      }),
      upsert: (row) => {
        mockCloud.upserts.push(row);
        const land = () => {
          if (mockCloud.failWrites || (mockCloud.failName && row.data && row.data.name === mockCloud.failName)) return { error: new Error('boom') };
          mockCloud.row = row.data;
          return { error: null };
        };
        return mockCloud.hold ? mockCloud.hold.then(land) : Promise.resolve(land());
      },
    }),
  },
}));
jest.mock('../studio', () => ({ currentStudioId: async () => mockCloud.sid }));
jest.mock('../../sentry', () => ({ captureError: () => {} }));

const { saveProfile, syncProfile, mergeUnsentProfile, profileUnsentKeys, __resetProfileSyncForTests } = require('../profile');

const local = () => JSON.parse(localStorage.getItem('ngw-profile'));

beforeEach(() => {
  localStorage.clear();
  __resetProfileSyncForTests();
  Object.assign(mockCloud, { row: null, upserts: [], failWrites: false, failReads: false, sid: SID, hold: null, failName: null });
});

describe('mergeUnsentProfile', () => {
  test('lays only the unsent fields over the account row', () => {
    expect(mergeUnsentProfile({ name: 'Cloud', city: 'Baltimore' }, { name: 'Mine', city: 'Stale' }, ['name']))
      .toEqual({ name: 'Mine', city: 'Baltimore' });
  });
  test('a field removed on this device is removed', () => {
    expect(mergeUnsentProfile({ name: 'Cloud', hostIntelligence: { a: 1 } }, { name: 'Cloud' }, ['hostIntelligence']))
      .toEqual({ name: 'Cloud' });
  });
  test('no unsent fields: the account row as it is', () => {
    expect(mergeUnsentProfile({ name: 'Cloud' }, { name: 'Mine' }, [])).toEqual({ name: 'Cloud' });
  });
});

describe('the unsent marker', () => {
  test('a save while signed out stays unsent, and the next sign-in sends it over the account row', async () => {
    mockCloud.row = { name: 'Account Name', city: 'Baltimore, MD' };
    mockCloud.sid = null;                                   // signed out
    const r = await saveProfile({ name: 'Signed Out Edit', city: 'Baltimore, MD' }, { changed: ['name'] });
    expect(r.ok).toBe(false);
    expect(profileUnsentKeys()).toEqual(['name']);
    expect(mockCloud.upserts).toHaveLength(0);

    mockCloud.sid = SID;                                    // signed in again
    const s = await syncProfile();
    expect(s).toMatchObject({ ok: true, pushed: true });
    expect(mockCloud.row).toEqual({ name: 'Signed Out Edit', city: 'Baltimore, MD' });
    expect(local().name).toBe('Signed Out Edit');
    expect(profileUnsentKeys()).toEqual([]);
  });

  test('a refused write keeps the marker; the account copy does not replace it; a later sync sends it', async () => {
    mockCloud.row = { name: 'Account Name' };
    await syncProfile();                                    // this session reconciled
    mockCloud.failWrites = true;
    const r = await saveProfile({ name: 'Failed Edit' }, { changed: ['name'] });
    expect(r).toMatchObject({ ok: false, reason: 'write-failed' });
    expect(profileUnsentKeys()).toEqual(['name']);

    // A sync while writes still fail keeps the local edit (the old code took the account's here).
    const s1 = await syncProfile();
    expect(s1.ok).toBe(false);
    expect(local().name).toBe('Failed Edit');

    mockCloud.failWrites = false;
    const s2 = await syncProfile();
    expect(s2).toMatchObject({ ok: true, pushed: true });
    expect(mockCloud.row.name).toBe('Failed Edit');
    expect(profileUnsentKeys()).toEqual([]);
  });

  test('a failed read changes nothing: no push, no overwrite, the marker stays', async () => {
    mockCloud.row = { name: 'Account Name' };
    mockCloud.sid = null;
    await saveProfile({ name: 'Mine' }, { changed: ['name'] });
    mockCloud.sid = SID;
    mockCloud.failReads = true;
    const s = await syncProfile();
    expect(s).toMatchObject({ ok: false, reason: 'read-failed' });
    expect(mockCloud.upserts).toHaveLength(0);
    expect(local().name).toBe('Mine');
    expect(profileUnsentKeys()).toEqual(['name']);
  });

  test('with nothing unsent, the account row wins (a second device inherits the host)', async () => {
    localStorage.setItem('ngw-profile', JSON.stringify({ name: 'Old Device Copy' }));
    localStorage.setItem('ngw-profile-owner', SID);
    mockCloud.row = { name: 'Newer From Elsewhere' };
    const s = await syncProfile();
    expect(s).toMatchObject({ ok: true, pushed: false });
    expect(local().name).toBe('Newer From Elsewhere');
    expect(mockCloud.upserts).toHaveLength(0);
  });

  test('a save before this session reconciled does not upsert the stale whole copy', async () => {
    // This device last saw an old area; another device has since changed the name.
    localStorage.setItem('ngw-profile', JSON.stringify({ name: 'Stale Name', city: 'Old Town' }));
    localStorage.setItem('ngw-profile-owner', SID);
    mockCloud.row = { name: 'Newer Name', city: 'Old Town' };
    await saveProfile({ name: 'Stale Name', city: 'Old Town', lastEventId: 'e1' }, { changed: ['lastEventId'] });
    expect(mockCloud.row).toEqual({ name: 'Newer Name', city: 'Old Town', lastEventId: 'e1' });
  });

  test("another account's unsent edits are never pushed into this one", async () => {
    localStorage.setItem('ngw-profile', JSON.stringify({ name: 'Person A' }));
    localStorage.setItem('ngw-profile-owner', OTHER);
    localStorage.setItem('ngw-profile-unsent', JSON.stringify({ name: 't1' }));
    mockCloud.row = { name: 'Person B' };
    const s = await syncProfile();
    expect(s).toMatchObject({ ok: true, pushed: false });
    expect(mockCloud.upserts).toHaveLength(0);
    expect(local().name).toBe('Person B');
    expect(profileUnsentKeys()).toEqual([]);
  });

  test('try first, sign in to keep: a profile made before any account becomes the account row', async () => {
    localStorage.setItem('ngw-profile', JSON.stringify({ name: 'Tryer' }));
    const s = await syncProfile();
    expect(s).toMatchObject({ ok: true, pushed: true });
    expect(mockCloud.row).toEqual({ name: 'Tryer' });
  });

  test('an edit made while an earlier write was in flight stays unsent when that write lands', async () => {
    mockCloud.row = { name: 'A' };
    await syncProfile();
    let release;
    mockCloud.hold = new Promise((r) => { release = r; });
    const first = saveProfile({ name: 'B' }, { changed: ['name'] });
    while (mockCloud.upserts.length < 1) await new Promise((r) => setTimeout(r, 0));
    // B is on the wire. The host changes the name again, and that write will fail.
    mockCloud.failName = 'C';
    const second = saveProfile({ name: 'C' }, { changed: ['name'] });
    release();
    await first;
    // The landing of B must not mark C as sent.
    expect(profileUnsentKeys()).toEqual(['name']);
    expect((await second).ok).toBe(false);
    expect(local().name).toBe('C');
    expect(profileUnsentKeys()).toEqual(['name']);
  });
});
