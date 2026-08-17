// ─── WHEN THE STORE IS CORRUPT, THE GUARD IS BLIND ──────────────────────────
//
// Class-B SPOF pass, 2026-08-17 (docs/audits/2026-08-17_SPOF_BOARD.md deferred
// runtime/data-loss; this is that follow-up).
//
// `saveCustomEvents` protects the host well: it reads the store, computes which
// user events would vanish, and REFUSES the write. That guard was built after a
// real loss on 2026-08-06 and it works.
//
// **But it can only refuse what it can SEE.** Its `before` comes from
// `readCustomEvents`, which returns `[]` for unparseable JSON. So with a corrupt
// store the guard computes "nothing dropped" and every destructive write sails
// through. Corruption is not exotic here — a quota-truncated write, a half-synced
// value, or any partial `setItem` produces exactly this.
//
// That makes ONE property load-bearing: `backupCustomEvents` snapshots the RAW
// STRING (`ls.getItem`), not the parsed list. On corruption the raw bytes are the
// only remaining copy of the host's events, and a plausible-looking refactor —
// "back up the parsed list, it's cleaner" — would destroy the last copy while
// every existing test stayed green. Nothing asserted it until this file.
//
// Not a hypothetical repair: the guard's blindness is real and is asserted below
// rather than papered over, because the honest mitigation is the raw backup, not
// a claim that the guard covers this.
import {
  LS_CUSTOMS,
  readCustomEvents, saveCustomEvents,
  backupCustomEvents, listBackups, readBackup, restoreBackup,
} from '../customEventStore';

const USER_EVENT = {
  id: 'cust-real-1', name: 'My 80th Birthday', type: 'Birthday', date: '2027-06-20',
};
const OTHER_EVENT = { id: 'cust-real-2', name: 'Anniversary', type: 'Anniversary' };

// A truncated write — the shape a quota failure or a partial sync leaves behind,
// not a random string. It is valid JSON right up to the point it stops.
const TRUNCATED = '[{"id":"cust-real-1","name":"My 80th Birth';

beforeEach(() => localStorage.clear());

describe('a corrupt store is survivable', () => {
  test('PREMISE — corruption really does blind the reader', () => {
    // If this ever stops being true, every assertion below is about a situation
    // that cannot occur, and the file should be revisited rather than trusted.
    localStorage.setItem(LS_CUSTOMS, TRUNCATED);
    expect(readCustomEvents()).toEqual([]);
  });

  test('THE GUARD CANNOT REFUSE WHAT IT CANNOT SEE — stated, not assumed', () => {
    // Documenting the real limit. With the store corrupt the drop-guard sees an
    // empty `before`, so a write that replaces everything is NOT refused. Anyone
    // reasoning about this path should start from the true behaviour.
    localStorage.setItem(LS_CUSTOMS, TRUNCATED);
    const res = saveCustomEvents([OTHER_EVENT], { reason: 'test:corrupt-overwrite' });
    expect(res.ok).toBe(true);
    expect(res.dropped).toEqual([]);      // it believes nothing was lost
  });

  test('THE RECOVERY PATH HOLDS — the raw bytes are snapshotted before the overwrite', () => {
    // The property everything above depends on. `backupCustomEvents` copies the
    // RAW string, so the corrupt-but-original value survives the write that
    // replaces it, and a human can still read the host's event name out of it.
    localStorage.setItem(LS_CUSTOMS, TRUNCATED);
    const res = saveCustomEvents([OTHER_EVENT], { reason: 'test:corrupt-overwrite' });

    expect(res.backupKey).toBeTruthy();
    const raw = localStorage.getItem(res.backupKey);
    expect(raw).toBe(TRUNCATED);                 // byte-identical, not re-serialised
    expect(raw).toContain('My 80th Birth');      // the host's data is still there
  });

  test('THE LIMIT — a corrupt backup cannot be auto-restored, and says so', () => {
    // Written asserting readBackup(key) was non-empty; it is [], because
    // readBackup parses. That is the honest answer for unparseable bytes, and it
    // exposes the real boundary of this recovery path:
    //
    //   raw bytes            survive the overwrite            (recoverable BY HAND)
    //   readBackup           parses -> [] for corrupt         (cannot see them)
    //   restoreBackup        REFUSES with 'empty-backup'      (does not wipe on top)
    //
    // The refusal is the right behaviour — restoring [] over a store would be a
    // second loss. What does NOT exist is any product path back to those bytes;
    // today it takes a person in devtools. Salvaging complete objects from a
    // truncated array is possible and deliberately NOT attempted here: it is new
    // parsing complexity for a scenario with no observed instance, and the board
    // filed class B as insurance rather than a fire.
    localStorage.setItem(LS_CUSTOMS, TRUNCATED);
    const key = backupCustomEvents(1755400000000);
    expect(localStorage.getItem(key)).toBe(TRUNCATED);   // the bytes are kept
    expect(readBackup(key)).toEqual([]);                 // and unreadable by the parser
    const res = restoreBackup(key);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('empty-backup');             // refuses, never wipes
  });

  test('a healthy store still round-trips exactly', () => {
    // The control: the raw-copy property must not be an artifact of corruption.
    const healthy = JSON.stringify([USER_EVENT]);
    localStorage.setItem(LS_CUSTOMS, healthy);
    const key = backupCustomEvents(1755400000001);
    expect(localStorage.getItem(key)).toBe(healthy);
    expect(listBackups()).toContain(key);
  });

  test('nothing to lose yet — no backup key is minted for an absent store', () => {
    expect(backupCustomEvents(1755400000002)).toBeNull();
  });
});
