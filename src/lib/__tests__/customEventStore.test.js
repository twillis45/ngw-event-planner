// ─── THE REGRESSION THAT WOULD HAVE SAVED THE EVENT (2026-08-06) ────────────
//
// On 2026-08-06 three review agents drove a browser against the host's own
// running dev server and replaced her event store with a test event:
//
//     localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]))
//
// The first test below is that exact call, and it must now fail to take effect.
// Everything else here is the durability the incident showed was missing:
// backups before every write, an export the host can carry off the origin, and
// an import that merges instead of replacing.
import {
  LS_CUSTOMS, TEST_ID_PREFIX, MAX_BACKUPS,
  isTestEvent, isDisposableEvent,
  readCustomEvents, saveCustomEvents,
  backupCustomEvents, listBackups, readBackup, restoreBackup,
  exportCustomEvents, importCustomEvents, readWriteLog,
} from '../customEventStore';

const USER_EVENT = {
  id: 'cust-mscjy9n5-35c0nx', name: 'My 80th Birthday', type: 'Birthday',
  isDestination: true, venueCity: 'Santa Fe', date: '2027-06-20', endDate: '2027-06-24',
};
const TEST_EVENT = { id: `${TEST_ID_PREFIX}rams-booked`, name: 'Rams Drive', type: 'Birthday' };
const SEED_EVENT = { id: 'cust-demo-santafe', demoSeed: true, name: 'Mom’s 80th Birthday' };

const seed = (list) => localStorage.setItem(LS_CUSTOMS, JSON.stringify(list));

beforeEach(() => localStorage.clear());

describe('a test event cannot overwrite a user-created event', () => {
  test('THE INCIDENT: replacing the whole array with one test event is REFUSED', () => {
    seed([USER_EVENT]);
    const res = saveCustomEvents([TEST_EVENT], { reason: 'e2e-drive' });

    expect(res.ok).toBe(false);
    expect(res.wrote).toBe(false);
    expect(res.reason).toBe('would-drop-user-events');
    expect(res.dropped).toEqual(['cust-mscjy9n5-35c0nx']);
    // The store is untouched — not merged, not partially written.
    expect(readCustomEvents()).toEqual([USER_EVENT]);
  });

  test('a test event may be ADDED alongside the host’s work', () => {
    seed([USER_EVENT]);
    const res = saveCustomEvents([USER_EVENT, TEST_EVENT], { reason: 'e2e-drive' });
    expect(res.ok).toBe(true);
    expect(readCustomEvents().map((e) => e.id)).toEqual([USER_EVENT.id, TEST_EVENT.id]);
  });

  test('a test event may be cleaned up again, because it is disposable', () => {
    seed([USER_EVENT, TEST_EVENT]);
    const res = saveCustomEvents([USER_EVENT], { reason: 'e2e-teardown' });
    expect(res.ok).toBe(true);
    expect(res.dropped).toEqual([]);          // dropping a test event is not a loss
    expect(readCustomEvents().map((e) => e.id)).toEqual([USER_EVENT.id]);
  });

  test('a demo seed is disposable too — the app re-creates it on demand', () => {
    seed([SEED_EVENT]);
    expect(saveCustomEvents([], { reason: 'reset-demo' }).ok).toBe(true);
    expect(readCustomEvents()).toEqual([]);
  });

  test('the host’s own delete still works, but must say so explicitly', () => {
    seed([USER_EVENT]);
    expect(saveCustomEvents([], { reason: 'host-delete' }).ok).toBe(false);
    const res = saveCustomEvents([], { reason: 'host-delete', allowRemovingUserEvents: true });
    expect(res.ok).toBe(true);
    expect(readCustomEvents()).toEqual([]);
  });

  test('a test event is identified by its id, never inferred from its shape', () => {
    expect(isTestEvent(TEST_EVENT)).toBe(true);
    // Same name, same shape, no prefix — this is a real event and must not be
    // treated as disposable because it happens to look like a fixture.
    expect(isTestEvent({ id: 'cust-abc', name: 'Rams Drive' })).toBe(false);
    expect(isDisposableEvent(SEED_EVENT)).toBe(true);
    expect(isDisposableEvent(USER_EVENT)).toBe(false);
    expect(isTestEvent(null)).toBe(false);
  });
});

describe('every write is recoverable', () => {
  test('a backup is taken before the store changes, holding the PREVIOUS state', () => {
    seed([USER_EVENT]);
    const res = saveCustomEvents([USER_EVENT, TEST_EVENT], { reason: 'add', now: 1000 });
    expect(res.backupKey).toBeTruthy();
    expect(readBackup(res.backupKey)).toEqual([USER_EVENT]);
  });

  test('a refused write takes no backup and leaves no trace but the log', () => {
    seed([USER_EVENT]);
    saveCustomEvents([TEST_EVENT], { reason: 'e2e-drive', now: 1000 });
    expect(listBackups()).toEqual([]);
    expect(readWriteLog().some((l) => l.refused && l.reason === 'e2e-drive')).toBe(true);
  });

  test('backups are capped, oldest evicted first', () => {
    seed([USER_EVENT]);
    for (let i = 0; i < MAX_BACKUPS + 4; i += 1) {
      saveCustomEvents([USER_EVENT, { ...TEST_EVENT, id: `${TEST_ID_PREFIX}${i}` }], { reason: 'churn', now: 2000 + i });
    }
    const keys = listBackups();
    expect(keys.length).toBe(MAX_BACKUPS);
    // Newest first, and the oldest is gone rather than the newest.
    expect(keys[0]).toContain(String(2000 + MAX_BACKUPS + 3));
  });

  test('restore puts a previous state back', () => {
    seed([USER_EVENT]);
    const { backupKey } = saveCustomEvents([USER_EVENT, TEST_EVENT], { reason: 'add', now: 1000 });
    // now lose the user event the honest way
    saveCustomEvents([], { reason: 'host-delete', allowRemovingUserEvents: true, now: 1001 });
    expect(readCustomEvents()).toEqual([]);

    const res = restoreBackup(backupKey, { allowRemovingUserEvents: true, now: 1002 });
    expect(res.ok).toBe(true);
    expect(readCustomEvents()).toEqual([USER_EVENT]);
  });
});

describe('the host can take her events off this origin', () => {
  test('export carries every event, versioned', () => {
    seed([USER_EVENT, SEED_EVENT]);
    const out = exportCustomEvents(1754000000000);
    expect(out.kind).toBe('ngw-event-export');
    expect(out.version).toBe(1);
    expect(out.count).toBe(2);
    expect(out.events.map((e) => e.id)).toEqual([USER_EVENT.id, SEED_EVENT.id]);
    expect(out.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('import MERGES onto an origin that already has work', () => {
    seed([{ id: 'cust-local', name: 'Work already here' }]);
    const res = importCustomEvents(exportOf([USER_EVENT]));
    expect(res).toMatchObject({ ok: true, added: 1, updated: 0, skipped: 0 });
    expect(readCustomEvents().map((e) => e.id)).toEqual(['cust-local', USER_EVENT.id]);
  });

  test('an id already present is SKIPPED by default — never silently overwritten', () => {
    const edited = { ...USER_EVENT, name: 'My 80th Birthday (edited here)' };
    seed([edited]);
    const res = importCustomEvents(exportOf([USER_EVENT]));
    expect(res).toMatchObject({ ok: true, added: 0, updated: 0, skipped: 1 });
    expect(readCustomEvents()[0].name).toBe('My 80th Birthday (edited here)');
  });

  test('…and overwritten only when the host asks', () => {
    seed([{ ...USER_EVENT, name: 'stale' }]);
    const res = importCustomEvents(exportOf([USER_EVENT]), { overwriteExisting: true });
    expect(res).toMatchObject({ ok: true, updated: 1 });
    expect(readCustomEvents()[0].name).toBe('My 80th Birthday');
  });

  test('a foreign or future payload is refused rather than half-read', () => {
    seed([USER_EVENT]);
    expect(importCustomEvents({ some: 'json' }).reason).toBe('not-an-export');
    expect(importCustomEvents({ kind: 'ngw-event-export', version: 99, events: [TEST_EVENT] }).reason)
      .toBe('unsupported-version');
    expect(importCustomEvents(exportOf([])).reason).toBe('no-events');
    expect(readCustomEvents()).toEqual([USER_EVENT]);   // untouched by any of them
  });

  test('an export survives a round trip through JSON, which is how it travels', () => {
    seed([USER_EVENT]);
    const wire = JSON.parse(JSON.stringify(exportCustomEvents(1754000000000)));
    localStorage.clear();
    expect(importCustomEvents(wire).added).toBe(1);
    expect(readCustomEvents()).toEqual([USER_EVENT]);
  });
});

function exportOf(events) {
  return { kind: 'ngw-event-export', version: 1, exportedAt: '2026-08-06T00:00:00.000Z', count: events.length, events };
}
