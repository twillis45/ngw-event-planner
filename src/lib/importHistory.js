// ─── importHistory — single source of truth for the CSV import audit trail ───
// Extracted from App.js (batch record shape, localStorage persistence, undo)
// and ImportWizard / VendorImportWizard / ImportHistoryDrawer (batch ids,
// audit-meta math, report text) so V2 can wire the same import history +
// undo without a silently-drifting reimplementation — same precedent as
// lib/eventGeoQuery.js. Pure logic plus the exact localStorage mechanics the
// legacy shell already used. No React, no DOM beyond localStorage.
//
// A "batch" is one committed CSV import:
//   { id, ts, snapshot, platform, mergeMode,
//     inserted, updated, removed, skipped, warnCount }
// `snapshot` is the FULL pre-import list (guests or vendors) — undo restores
// it wholesale. Only the LAST batch is undoable (later imports build on it).

// localStorage keys. VENDOR_… is written by no one today (the vendor wizard
// is not mounted in the legacy shell) but the quota-pruning path in App.js
// already clears it defensively, so it is named here as the single source.
export const GUEST_IMPORT_BATCHES_KEY  = 'ngw_guest_import_batches';
export const VENDOR_IMPORT_BATCHES_KEY = 'ngw_vendor_import_batches';

// Persist at most this many batches (App.js's slice(-10) on every write).
export const MAX_PERSISTED_BATCHES = 10;

/** Compact unique id for one import batch (from both wizards' handleCommit). */
export function newImportBatchId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * Audit counts for one commit, exactly as both wizards computed them.
 * @param {Array}  rows    validated rows (carry _valid / _warnings)
 * @param {Object} summary computeMergeSummary/computeVendorMergeSummary output,
 *                         or null when the merge step was skipped
 * @returns {{inserted:number,updated:number,removed:number,skipped:number,warnCount:number}}
 */
export function computeImportAuditMeta(rows, summary) {
  const valid = rows.filter(r => r._valid);
  return {
    inserted:  summary ? summary.willAdd    : valid.length,
    updated:   summary ? summary.willUpdate : 0,
    removed:   summary ? summary.willRemove : 0,
    skipped:   rows.length - valid.length,
    warnCount: rows.filter(r => (r._warnings || []).length > 0).length,
  };
}

/**
 * Build the batch record App.js appended to importBatches.
 * @param {string} batchId   from newImportBatchId()
 * @param {Array}  snapshot  the PRE-import list (what undo restores)
 * @param {Object} auditMeta from computeImportAuditMeta (+ platform/mergeMode)
 * @param {number} [ts]      commit time (defaults to now)
 */
export function makeImportBatch(batchId, snapshot, auditMeta = {}, ts = Date.now()) {
  return {
    id: batchId, ts, snapshot,
    platform:  auditMeta.platform  || 'ngw',
    mergeMode: auditMeta.mergeMode || '',
    inserted:  auditMeta.inserted  || 0,
    updated:   auditMeta.updated   || 0,
    removed:   auditMeta.removed   || 0,
    skipped:   auditMeta.skipped   || 0,
    warnCount: auditMeta.warnCount || 0,
  };
}

/**
 * Undo the most recent batch (App.js handleUndo core).
 * @returns {{batches:Array, snapshot:Array}|null} the remaining batches and
 *          the list to restore, or null when there is nothing to undo.
 */
export function undoLastImportBatch(batches) {
  const last = batches[batches.length - 1];
  if (!last) return null;
  return { batches: batches.slice(0, -1), snapshot: last.snapshot };
}

/** Read persisted batches; [] on missing/corrupt (App.js useState initializer). */
export function loadImportBatches(key = GUEST_IMPORT_BATCHES_KEY) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : []; } catch { return []; }
}

/** Persist batches, capped to the newest MAX_PERSISTED_BATCHES (App.js effect). */
export function persistImportBatches(batches, key = GUEST_IMPORT_BATCHES_KEY) {
  try { localStorage.setItem(key, JSON.stringify(batches.slice(-MAX_PERSISTED_BATCHES))); } catch {}
}

// ─── report text (from ImportHistoryDrawer) ──────────────────────────────────
// One label per csvParsers PLATFORMS key (all 7) — each platform's real
// product name, so no batch ever falls back to its raw key in the report.
// (The historical drift — evite/partiful/greenvelope missing — closed in the
// guests parity sweep; the parity test locks the two lists together.)
export const PLATFORM_LABELS = {
  ngw:         'NGW Native',
  theknot:     'The Knot',
  zola:        'Zola',
  paperless:   'Paperless Post',
  evite:       'Evite',
  partiful:    'Partiful',
  greenvelope: 'Greenvelope',
};

export const MODE_LABELS = {
  add_new: 'Add New Only',
  merge:   'Merge',
  replace: 'Replace All',
};

/** "Today 3:12 PM" / "Yesterday …" / "Jul 4 …" for a batch timestamp. */
export function fmtBatchTs(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (d.toDateString() === today.toDateString())     return `Today ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` ${time}`;
}

/** Plain-text audit report for one batch (the drawer's "Copy report"). */
export function buildImportReportText(batch) {
  const platform = PLATFORM_LABELS[batch.platform] || batch.platform || 'CSV Import';
  const mode     = MODE_LABELS[batch.mergeMode]   || batch.mergeMode || '—';
  const date     = new Date(batch.ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  const lines = [
    'NGW Import Report',
    '──────────────────',
    `Batch:    ${batch.id}`,
    `Date:     ${date}`,
    `Platform: ${platform}`,
    `Mode:     ${mode}`,
    '',
    'Results:',
    `  + ${batch.inserted ?? 0} added`,
    `  ↻ ${batch.updated  ?? 0} updated`,
    `  ✕ ${batch.removed  ?? 0} removed`,
    `  — ${batch.skipped  ?? 0} skipped`,
    `  ⚠ ${batch.warnCount ?? 0} warnings`,
  ];
  return lines.join('\n');
}
