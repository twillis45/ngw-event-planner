// Behavioral coverage for lib/importHistory — the CSV import audit trail
// extracted from App.js + the import wizards + ImportHistoryDrawer. Locks the
// batch record shape, audit-meta math, snapshot undo, the localStorage
// persistence (key + 10-batch cap + corrupt-value tolerance), and the
// copy-report serialization.
import {
  GUEST_IMPORT_BATCHES_KEY, VENDOR_IMPORT_BATCHES_KEY, MAX_PERSISTED_BATCHES,
  newImportBatchId, computeImportAuditMeta, makeImportBatch, undoLastImportBatch,
  loadImportBatches, persistImportBatches,
  PLATFORM_LABELS, MODE_LABELS, fmtBatchTs, buildImportReportText,
} from '../importHistory';
import { PLATFORMS } from '../csvParsers';

afterEach(() => localStorage.clear());

// ─── ids & audit meta ────────────────────────────────────────────────────────

test('newImportBatchId is compact, lowercase, and unique-ish', () => {
  const a = newImportBatchId();
  const b = newImportBatchId();
  expect(a).toMatch(/^[a-z0-9]+$/);
  expect(a.length).toBeGreaterThanOrEqual(9);
  expect(a).not.toBe(b);
});

test('computeImportAuditMeta uses the merge summary when present', () => {
  const rows = [
    { _valid: true,  _warnings: [] },
    { _valid: true,  _warnings: ['RSVP "x" mapped to Pending'] },
    { _valid: false, _warnings: [] },
  ];
  const summary = { willAdd: 1, willUpdate: 1, willRemove: 0 };
  expect(computeImportAuditMeta(rows, summary)).toEqual({
    inserted: 1, updated: 1, removed: 0, skipped: 1, warnCount: 1,
  });
});

test('computeImportAuditMeta falls back to valid-count without a summary', () => {
  const rows = [{ _valid: true }, { _valid: true }, { _valid: false }];
  expect(computeImportAuditMeta(rows, null)).toEqual({
    inserted: 2, updated: 0, removed: 0, skipped: 1, warnCount: 0,
  });
});

// ─── batch records & undo ────────────────────────────────────────────────────

test('makeImportBatch carries the snapshot and defaults every count', () => {
  const snapshot = [{ id: 'g1', name: 'Ada' }];
  const batch = makeImportBatch('b1', snapshot, {}, 1234);
  expect(batch).toEqual({
    id: 'b1', ts: 1234, snapshot,
    platform: 'ngw', mergeMode: '',
    inserted: 0, updated: 0, removed: 0, skipped: 0, warnCount: 0,
  });
  const full = makeImportBatch('b2', [], {
    platform: 'zola', mergeMode: 'merge', inserted: 3, updated: 2, removed: 0, skipped: 1, warnCount: 4,
  }, 99);
  expect(full.platform).toBe('zola');
  expect(full.inserted).toBe(3);
  expect(full.warnCount).toBe(4);
});

test('undoLastImportBatch pops the last batch and returns its snapshot', () => {
  const b1 = makeImportBatch('b1', [{ id: 'g1' }], {}, 1);
  const b2 = makeImportBatch('b2', [{ id: 'g1' }, { id: 'g2' }], {}, 2);
  const undone = undoLastImportBatch([b1, b2]);
  expect(undone.snapshot).toEqual([{ id: 'g1' }, { id: 'g2' }]);
  expect(undone.batches).toEqual([b1]);
  expect(undoLastImportBatch([])).toBeNull();
});

// ─── persistence ─────────────────────────────────────────────────────────────

test('persist/load round-trips batches under the guest key', () => {
  const batches = [makeImportBatch('b1', [{ id: 'g1' }], { inserted: 1 }, 5)];
  persistImportBatches(batches, GUEST_IMPORT_BATCHES_KEY);
  expect(JSON.parse(localStorage.getItem('ngw_guest_import_batches'))).toEqual(batches);
  expect(loadImportBatches(GUEST_IMPORT_BATCHES_KEY)).toEqual(batches);
  expect(VENDOR_IMPORT_BATCHES_KEY).toBe('ngw_vendor_import_batches');
});

test('persist caps to the newest MAX_PERSISTED_BATCHES', () => {
  const many = Array.from({ length: 14 }, (_, i) => makeImportBatch(`b${i}`, [], {}, i));
  persistImportBatches(many);
  const stored = loadImportBatches();
  expect(MAX_PERSISTED_BATCHES).toBe(10);
  expect(stored).toHaveLength(10);
  expect(stored[0].id).toBe('b4');           // oldest four dropped
  expect(stored[9].id).toBe('b13');
});

test('load returns [] for missing or corrupt values', () => {
  expect(loadImportBatches()).toEqual([]);
  localStorage.setItem(GUEST_IMPORT_BATCHES_KEY, '{not json');
  expect(loadImportBatches()).toEqual([]);
});

// ─── report text ─────────────────────────────────────────────────────────────

test('fmtBatchTs: em-dash when empty, Today/Yesterday, short date otherwise', () => {
  expect(fmtBatchTs(null)).toBe('—');
  expect(fmtBatchTs(Date.now())).toMatch(/^Today \d{1,2}:\d{2} [AP]M$/);
  expect(fmtBatchTs(Date.now() - 24 * 3600 * 1000)).toMatch(/^Yesterday /);
  expect(fmtBatchTs(new Date('2025-03-05T14:30:00').getTime())).toMatch(/^Mar 5 /);
});

test('buildImportReportText names the platform and mode and lists all counts', () => {
  const text = buildImportReportText(makeImportBatch('b9', [], {
    platform: 'theknot', mergeMode: 'merge', inserted: 5, updated: 2, removed: 0, skipped: 1, warnCount: 3,
  }, new Date('2026-07-04T12:00:00').getTime()));
  expect(text).toContain('NGW Import Report');
  expect(text).toContain('Batch:    b9');
  expect(text).toContain(`Platform: ${PLATFORM_LABELS.theknot}`);
  expect(text).toContain(`Mode:     ${MODE_LABELS.merge}`);
  expect(text).toContain('+ 5 added');
  expect(text).toContain('↻ 2 updated');
  expect(text).toContain('— 1 skipped');
  expect(text).toContain('⚠ 3 warnings');
});

test('every csvParsers platform has a human label (guests parity row 11)', () => {
  // The historical drift: evite/partiful/greenvelope batches printed their raw
  // key in the audit report. This locks PLATFORM_LABELS to the PLATFORMS keys.
  for (const key of Object.keys(PLATFORMS)) {
    expect(PLATFORM_LABELS[key]).toEqual(expect.any(String));
    expect(PLATFORM_LABELS[key].trim()).not.toBe('');
    expect(PLATFORM_LABELS[key]).not.toBe(key); // a label, not the raw key
  }
  const text = buildImportReportText(makeImportBatch('b1', [], { platform: 'evite' }, 1));
  expect(text).toContain('Platform: Evite');
});

test('buildImportReportText still falls back to the raw key for unknown platforms', () => {
  const text = buildImportReportText(makeImportBatch('b1', [], { platform: 'mystery-csv' }, 1));
  expect(text).toContain('Platform: mystery-csv');
});
