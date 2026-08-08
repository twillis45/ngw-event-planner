// ─── THE HOST'S ONLY COPY, BEHIND ONE DOOR (2026-08-06) ─────────────────────
//
// WHY THIS EXISTS. On 2026-08-06 three review agents, driving a browser against
// the host's own running dev server, replaced her event store with a test event:
//
//     localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]))
//
// A wholesale array replacement, not an append. One call, and a real
// user-created event was gone. It was recovered only because a second copy
// happened to exist on the deployed origin — luck, not design.
//
// The agents were the trigger. They were not the defect. The defect is that
// this store had ONE read path and FOUR scattered write paths, no guard, no
// backup, and no way to get the data back out. A host who clears a site's data,
// switches browser, or hits a quota error loses everything with no agent
// involved — and the app's own doctrine (UX_08: "never claim cloud save when it
// is localStorage") already admits this store is the only copy.
//
// So: every write goes through saveCustomEvents(). It refuses to drop a
// user-created event unless the caller says so in as many words, and it takes a
// timestamped snapshot before it writes. Nothing here can prevent a determined
// caller from using localStorage directly — the point is that the app's own
// paths cannot do it by accident, and that a mistake is recoverable.
//
// This lives in src/lib/ rather than hostv2/src/ for one specific reason: jest
// does not compile the hostv2 tree. A guard nothing tests is not a guard — and
// this file was written the same day a syntax error in hostv2/src sailed through
// a fully green 5,451-test run.

export const LS_CUSTOMS = 'ngw-hostv2-custom-events';
export const LS_BACKUP_INDEX = 'ngw-hostv2-store-backups';
export const BACKUP_PREFIX = 'ngw-hostv2-backup-';
export const LS_WRITE_LOG = 'ngw-hostv2-write-log';

/** Test-created events announce themselves. Anything else is the host's. */
export const TEST_ID_PREFIX = 'E2E_TEST_';

/** How many snapshots to keep. Old ones are dropped oldest-first. */
export const MAX_BACKUPS = 10;

const store = () => {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) return null;
    return localStorage;
  } catch { return null; }   // private mode / disabled storage
};

const readJSON = (ls, key, fallback) => {
  try {
    const raw = ls.getItem(key);
    if (raw == null) return fallback;
    const v = JSON.parse(raw);
    return v == null ? fallback : v;
  } catch { return fallback; }
};

/**
 * A test event says so in its id. Nothing infers it from shape, name or
 * position — an inference here would be exactly the "absence is a claim"
 * mistake this codebase keeps finding.
 */
export function isTestEvent(ev) {
  if (!ev || typeof ev !== 'object') return false;
  return String(ev.id || '').startsWith(TEST_ID_PREFIX);
}

/** A demo seed is disposable too — it is re-created on demand, never authored. */
export function isDisposableEvent(ev) {
  if (!ev || typeof ev !== 'object') return false;
  return isTestEvent(ev) || ev.demoSeed === true;
}

/** Read the store. Never throws; a corrupt value reads as empty, not as a crash. */
export function readCustomEvents() {
  const ls = store();
  if (!ls) return [];
  const list = readJSON(ls, LS_CUSTOMS, []);
  return Array.isArray(list) ? list.filter((e) => e && e.id) : [];
}

/**
 * Snapshot the store under a timestamped key, and return that key.
 *
 * `now` is injected so tests are deterministic and so two writes in the same
 * millisecond cannot collide on a key.
 */
export function backupCustomEvents(now = Date.now()) {
  const ls = store();
  if (!ls) return null;
  const raw = ls.getItem(LS_CUSTOMS);
  if (raw == null) return null;             // nothing to lose yet
  const key = `${BACKUP_PREFIX}${now}`;
  try {
    ls.setItem(key, raw);
    const index = readJSON(ls, LS_BACKUP_INDEX, []);
    const next = [...(Array.isArray(index) ? index : []), key];
    // Oldest-first eviction, so the newest MAX_BACKUPS always survive.
    while (next.length > MAX_BACKUPS) {
      const drop = next.shift();
      try { ls.removeItem(drop); } catch { /* already gone */ }
    }
    ls.setItem(LS_BACKUP_INDEX, JSON.stringify(next));
    return key;
  } catch {
    // Quota is the likely failure. A backup we could not take must NOT block
    // the host's own write — losing her edit to protect a snapshot of the
    // previous edit is the wrong trade. The write path reports it instead.
    return null;
  }
}

/** Newest first. */
export function listBackups() {
  const ls = store();
  if (!ls) return [];
  const index = readJSON(ls, LS_BACKUP_INDEX, []);
  return (Array.isArray(index) ? index : []).slice().reverse();
}

/** What a backup holds, without restoring it. */
export function readBackup(key) {
  const ls = store();
  if (!ls) return [];
  const list = readJSON(ls, String(key || ''), []);
  return Array.isArray(list) ? list.filter((e) => e && e.id) : [];
}

const logWrite = (entry) => {
  const ls = store();
  if (!ls) return;
  try {
    const log = readJSON(ls, LS_WRITE_LOG, []);
    const next = [...(Array.isArray(log) ? log : []), entry].slice(-50);
    ls.setItem(LS_WRITE_LOG, JSON.stringify(next));
  } catch { /* logging must never break a write */ }
};

/**
 * THE ONE WRITE PATH.
 *
 * Refuses any write that would drop a user-created event, unless the caller
 * passes `allowRemovingUserEvents: true` — which the host's own "delete this
 * event" action does, and nothing else should.
 *
 * @param {Array}   next            the complete next state of the store
 * @param {object} [opts]
 * @param {string} [opts.reason]    what is doing this, for the log
 * @param {boolean}[opts.allowRemovingUserEvents]  explicit host-authored deletion
 * @param {number} [opts.now]       injected clock, for tests
 * @returns {{ok:boolean, wrote:boolean, backupKey:string|null, dropped:string[], reason?:string}}
 */
export function saveCustomEvents(next, opts = {}) {
  const ls = store();
  const list = Array.isArray(next) ? next.filter((e) => e && e.id) : [];
  if (!ls) return { ok: false, wrote: false, backupKey: null, dropped: [], reason: 'no-storage' };

  const before = readCustomEvents();
  const keptIds = new Set(list.map((e) => String(e.id)));
  // A user-created event about to vanish from the store. Demo seeds and
  // E2E_TEST_ events are disposable and never count.
  const dropped = before
    .filter((e) => !keptIds.has(String(e.id)) && !isDisposableEvent(e))
    .map((e) => String(e.id));

  if (dropped.length && !opts.allowRemovingUserEvents) {
    // REFUSE. This is the exact shape of the 2026-08-06 loss: a caller
    // replacing the whole array with its own single event.
    logWrite({ at: opts.now || Date.now(), reason: String(opts.reason || 'unknown'), refused: true, dropped });
    return {
      ok: false,
      wrote: false,
      backupKey: null,
      dropped,
      reason: 'would-drop-user-events',
    };
  }

  const backupKey = backupCustomEvents(opts.now || Date.now());
  try {
    ls.setItem(LS_CUSTOMS, JSON.stringify(list));
  } catch (e) {
    return { ok: false, wrote: false, backupKey, dropped, reason: 'write-failed' };
  }
  logWrite({
    at: opts.now || Date.now(),
    reason: String(opts.reason || 'unknown'),
    refused: false,
    count: list.length,
    dropped,
    backupKey,
  });
  return { ok: true, wrote: true, backupKey, dropped };
}

/** Put a backup back. Guarded the same way — restoring cannot silently drop either. */
export function restoreBackup(key, opts = {}) {
  const list = readBackup(key);
  if (!list.length) return { ok: false, wrote: false, backupKey: null, dropped: [], reason: 'empty-backup' };
  return saveCustomEvents(list, { ...opts, reason: `restore:${key}` });
}

/**
 * EXPORT — the durability half.
 *
 * The loss on 2026-08-06 was survivable only because a copy happened to exist
 * on another origin. This makes that a feature rather than an accident: the
 * host can take her events with her, to another browser, another machine, or a
 * file. Versioned, so an importer can refuse a shape it does not understand.
 */
export function exportCustomEvents(now = Date.now()) {
  const events = readCustomEvents();
  return {
    kind: 'ngw-event-export',
    version: 1,
    exportedAt: new Date(now).toISOString(),
    count: events.length,
    events,
  };
}

/**
 * IMPORT — merges, never replaces.
 *
 * By id: an incoming event with an id already present updates it only when
 * `overwriteExisting` is set; otherwise the copy already here wins. The default
 * is the conservative one, because the common case is a host restoring a backup
 * onto a browser that already has some work in it, and silently overwriting
 * that work would be the same class of defect this module exists to stop.
 */
export function importCustomEvents(payload, opts = {}) {
  const p = payload && typeof payload === 'object' ? payload : {};
  if (p.kind !== 'ngw-event-export') {
    return { ok: false, added: 0, updated: 0, skipped: 0, reason: 'not-an-export' };
  }
  if (Number(p.version) !== 1) {
    return { ok: false, added: 0, updated: 0, skipped: 0, reason: 'unsupported-version' };
  }
  const incoming = Array.isArray(p.events) ? p.events.filter((e) => e && e.id) : [];
  if (!incoming.length) return { ok: false, added: 0, updated: 0, skipped: 0, reason: 'no-events' };

  const current = readCustomEvents();
  const byId = new Map(current.map((e) => [String(e.id), e]));
  let added = 0; let updated = 0; let skipped = 0;
  for (const ev of incoming) {
    const id = String(ev.id);
    if (!byId.has(id)) { byId.set(id, ev); added += 1; continue; }
    if (opts.overwriteExisting) { byId.set(id, ev); updated += 1; } else { skipped += 1; }
  }
  const res = saveCustomEvents([...byId.values()], { ...opts, reason: 'import' });
  if (!res.ok) return { ok: false, added: 0, updated: 0, skipped: 0, reason: res.reason };
  return { ok: true, added, updated, skipped };
}

/** The destructive-action log, newest last. Read-only; for support and audits. */
export function readWriteLog() {
  const ls = store();
  if (!ls) return [];
  const log = readJSON(ls, LS_WRITE_LOG, []);
  return Array.isArray(log) ? log : [];
}
