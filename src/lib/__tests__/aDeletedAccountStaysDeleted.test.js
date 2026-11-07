// A deleted account stays deleted, and one account's events never move into
// another's (live smoke test, 11/7/2026).
//
// After "Delete my account", the device kept EVERY local event, including the
// ones that had been in the account, while the app said only plans "saved only
// on this device" remained. Signing in again then uploaded the old event into
// the brand-new account: the deleted plan came back. The same upload ran when a
// second person signed in on the device, putting the first person's synced
// events into the second person's account.
//
// The rule: a sync stamp means this device once confirmed the event in an
// account. An event with a stamp that the signed-in account does not have is
// someone else's (or a deleted account's) and is never uploaded. Only events
// that never reached any account (built signed out) move into the account.
import {
  eventsToUploadOnSignIn,
  splitAccountCopies,
  forgetSyncState,
  markEventSynced,
  getEventSyncStatus,
  SYNC_STATUS,
} from '../api/syncState';

const real = (e) => !!(e && e.name && !String(e.id).startsWith('demo-'));

beforeEach(() => { localStorage.clear(); });

describe('what signing in uploads', () => {
  test('an event built signed out is uploaded', () => {
    const local = [{ id: 'cust-new', name: 'Game Night' }];
    expect(eventsToUploadOnSignIn(local, new Set(), real).map(e => e.id)).toEqual(['cust-new']);
  });

  test('an event this device synced to an account is not uploaded when that account lacks it', () => {
    markEventSynced('cust-old');
    const local = [{ id: 'cust-old', name: 'Game Night' }, { id: 'cust-new', name: 'Brunch' }];
    expect(eventsToUploadOnSignIn(local, new Set(), real).map(e => e.id)).toEqual(['cust-new']);
  });

  test('an event already in the account is not uploaded again', () => {
    const local = [{ id: 'cust-a', name: 'Game Night' }];
    expect(eventsToUploadOnSignIn(local, new Set(['cust-a']), real)).toEqual([]);
  });

  test('samples and unnamed stubs are never uploaded', () => {
    const local = [{ id: 'demo-1', name: 'Sample' }, { id: 'cust-x', name: '' }];
    expect(eventsToUploadOnSignIn(local, new Set(), real)).toEqual([]);
  });

  test('bad input uploads nothing', () => {
    expect(eventsToUploadOnSignIn(null, new Set(), real)).toEqual([]);
    expect(eventsToUploadOnSignIn([null, {}], null, real)).toEqual([]);
  });
});

describe('deleting the account', () => {
  test('separates the account copies from plans saved only on this device', () => {
    markEventSynced(['cust-synced']);
    const local = [{ id: 'cust-synced', name: 'Game Night' }, { id: 'cust-device', name: 'Brunch' }];
    const { accountCopies, deviceOnly } = splitAccountCopies(local);
    expect(accountCopies.map(e => e.id)).toEqual(['cust-synced']);
    expect(deviceOnly.map(e => e.id)).toEqual(['cust-device']);
  });

  test('forgetting the sync state leaves no claim that the event is synced', () => {
    markEventSynced('cust-synced');
    expect(getEventSyncStatus({ id: 'cust-synced' })).toBe(SYNC_STATUS.SYNCED);
    forgetSyncState(['cust-synced']);
    expect(getEventSyncStatus({ id: 'cust-synced' })).toBe(SYNC_STATUS.LOCAL_ONLY);
  });

  test('the whole path: delete, sign in again, nothing old is uploaded', () => {
    markEventSynced('cust-synced');
    const local = [{ id: 'cust-synced', name: 'Game Night' }, { id: 'cust-device', name: 'Brunch' }];
    const { deviceOnly } = splitAccountCopies(local);
    // The account copies leave the device with the account.
    expect(deviceOnly.map(e => e.id)).toEqual(['cust-device']);
    // A fresh account is empty in the cloud; only the device-only plan moves in.
    expect(eventsToUploadOnSignIn(deviceOnly, new Set(), real).map(e => e.id)).toEqual(['cust-device']);
  });
});
