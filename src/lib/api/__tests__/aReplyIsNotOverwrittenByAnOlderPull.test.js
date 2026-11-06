// ─── A REPLY IS NOT OVERWRITTEN BY AN OLDER PULL (issue #100, D-7) ───────────
//
// Measured on a real local stack 11/5/2026: a guest replied, the host reloaded,
// the reply merged ("1 reply came in…") and 30ms later the sign-in pull adopted
// the account's OLDER copy over it ("Updated with a newer version from your
// account."), and the reply was gone. It happened on some runs and not others.
//
// Two windows, both in the sync library:
//   1. While a save is in flight the event is neither queued nor re-stamped, so
//      it read as "synced" with the old stamp, and the pull's rule
//      "clean + stamped → cloud wins" adopted the old row over the new edit.
//   2. A pull that STARTED before the save and lands after it carries a row
//      older than the version this device just wrote. That row is a stale read,
//      not "someone else's later write".
const T1 = '2026-11-05T10:00:00.000000+00:00';   // loaded
const T2 = '2026-11-05T11:00:00.000000+00:00';   // this device's write lands here
const T3 = '2026-11-05T12:00:00.000000+00:00';   // another device writes later

const mockCloud = { row: null, release: null };

jest.mock('../../supabaseClient', () => ({
  isSupabaseConfigured: () => true,
  supabase: {
    from: () => ({
      update: (payload) => {
        const ch = {
          eq: () => ch, lte: () => ch,
          // The write is HELD until the test releases it — the in-flight window.
          select: () => new Promise((resolve) => {
            mockCloud.release = () => {
              mockCloud.row = { updated_at: T2, data: payload.data };
              resolve({ data: [{ id: 'e1', updated_at: T2 }], error: null });
            };
          }),
        };
        return ch;
      },
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: mockCloud.row ? [{ id: 'e1', data: mockCloud.row.data, updated_at: mockCloud.row.updated_at }] : [], error: null }),
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: mockCloud.row, error: null }) }),
        }),
      }),
    }),
  },
}));
jest.mock('../studio', () => ({
  currentStudioId: async () => '11111111-2222-3333-4444-555555555555',
  isCloudStudioId: () => true,
}));
jest.mock('../../sentry', () => ({ captureError: () => {} }));

const { loadEvents, saveEvent, cloudCopyIsStale } = require('../events');
const { getEventSyncStatus, SYNC_STATUS, markEventSynced } = require('../syncState');

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(async () => {
  localStorage.clear();
  mockCloud.row = { updated_at: T1, data: { name: 'Game night', guests: [{ name: 'Omar', rsvp: '' }] } };
  await loadEvents();   // the device has seen T1…
  markEventSynced('e1'); // …and the shell stamps it synced, as HostShellV2's pull does
});

test('setup: a loaded, untouched event reads as synced', () => {
  expect(getEventSyncStatus({ id: 'e1' })).toBe(SYNC_STATUS.SYNCED);
});

test('a save in flight is not "synced" — the pull must leave it alone', async () => {
  const saving = saveEvent({ id: 'e1', name: 'Game night', guests: [{ name: 'Omar', rsvp: 'Yes' }], _cloudUpdatedAt: T1 });
  await flush();
  expect(getEventSyncStatus({ id: 'e1' })).not.toBe(SYNC_STATUS.SYNCED);
  mockCloud.release();
  await saving;
  expect(getEventSyncStatus({ id: 'e1' })).toBe(SYNC_STATUS.SYNCED);
});

test('a pulled copy older than this device’s own write is stale, not a newer edit', async () => {
  const saving = saveEvent({ id: 'e1', name: 'Game night', guests: [{ name: 'Omar', rsvp: 'Yes' }], _cloudUpdatedAt: T1 });
  await flush(); mockCloud.release(); await saving;
  expect(cloudCopyIsStale({ id: 'e1', _cloudUpdatedAt: T1 })).toBe(true);
});

test('another device’s later write is still adopted', async () => {
  const saving = saveEvent({ id: 'e1', name: 'Game night', guests: [], _cloudUpdatedAt: T1 });
  await flush(); mockCloud.release(); await saving;
  mockCloud.row = { updated_at: T3, data: { name: 'Renamed elsewhere', guests: [] } };
  const [pulled] = await loadEvents();        // records T3 as seen
  expect(cloudCopyIsStale(pulled)).toBe(false);
  expect(cloudCopyIsStale({ id: 'e1' })).toBe(false);   // no stamp carried → never "stale"
});

// The same run showed the toast "Updated with a newer version from your account."
// after every reply, with nothing changed: the "newer version" was this device's
// own write coming back. Postgres jsonb stores object keys in its own order, and
// the shell compared the copies with plain JSON.stringify.
describe('the account’s copy of this device’s own write is the same event', () => {
  const { sameEventContent } = require('../events');
  const local = { id: 'e1', name: 'Game night', guests: [{ id: 'g1', name: 'Omar', rsvp: 'Yes', meal: 'Standard' }], _cloudUpdatedAt: T1 };
  const fromJsonb = { _cloudUpdatedAt: T2, guests: [{ id: 'g1', meal: 'Standard', name: 'Omar', rsvp: 'Yes' }], id: 'e1', name: 'Game night' };
  test('key order and the version stamp are not content', () => {
    expect(sameEventContent(local, fromJsonb)).toBe(true);
  });
  test('a real change still differs', () => {
    expect(sameEventContent(local, { ...fromJsonb, guests: [{ id: 'g1', name: 'Omar', rsvp: 'No', meal: 'Standard' }] })).toBe(false);
  });
  test('array order is content', () => {
    const two = { id: 'e1', guests: [{ name: 'A' }, { name: 'B' }] };
    expect(sameEventContent(two, { id: 'e1', guests: [{ name: 'B' }, { name: 'A' }] })).toBe(false);
  });
});
