// A GUEST LIST IMPORT, IN ONE PLACE (G2c-2b-3; owner, 11/28/2026, UX_12 §8a,
// render screen 3). Reading CSV rows into guests, the preview (new, updated,
// skipped), bringing them in with a batch kept for Undo, and undoing the last
// import. Written inside hostv2's old Guests sheet until now; the Guests kit
// (hostv2 and hostv4) and the old sheet read it from here. Pure: the caller
// parses the file (papaparse) and keeps the batches (lib/importHistory).
import { PLATFORMS, transformRows, validateRows, computeMergeSummary, applyMerge } from './csvParsers';
import { newImportBatchId, computeImportAuditMeta, makeImportBatch, undoLastImportBatch, PLATFORM_LABELS, MAX_PERSISTED_BATCHES } from './importHistory';
import { kidsCountAfterRoster } from './kidsCountAfterRoster';

/** A platform's own name ("The Knot", "Zola"). PLATFORM_LABELS covers 4 of the 7
 *  csvParsers platforms, so it falls back to the parser's own label, then the
 *  capitalized key, never a blank. */
export function importPlatformLabel(p) {
  return PLATFORM_LABELS[p] || (PLATFORMS[p] && PLATFORMS[p].label) || (p ? p.charAt(0).toUpperCase() + p.slice(1) : 'CSV');
}

/** CSV rows (as papaparse reads them, with headers) to guests, as the old sheet mapped them. */
export function importRows(rows, platform, ts = Date.now()) {
  const canonical = validateRows(transformRows(rows || [], platform));
  return canonical.map((r, i) => ({
    id: 'g-csv-' + ts + '-' + i,
    name: r.name || '', group: r.group || '',
    rsvp: r.rsvp_status === 'Pending' ? '' : (r.rsvp_status || ''),
    meal: r.meal_preference || '—', table: r.table_number ?? null,
    plusOne: r.plus_one_name || '', plusOneMeal: '—', kids: 0,
    needs: r.dietary_restrictions || '', email: r.email || '', phone: r.phone || '',
    partyNotes: r.notes || '', giftReceived: false, thankYouSent: false,
    _valid: r._valid, _errors: r._errors, _warnings: r._warnings,
  }));
}

/** What an import would do, before anything changes, with its one line. */
export function importPreview(event, rows, platform, fileName, ts = Date.now()) {
  const mapped = importRows(rows, platform, ts);
  const summary = computeMergeSummary((event && event.guests) || [], mapped, 'merge');
  const clean = mapped.filter((r) => r._valid).length;
  const line = clean + ' of ' + mapped.length + ' rows read cleanly from ' + fileName + ': '
    + (summary.willAdd || 0) + ' new, ' + (summary.willUpdate || 0) + ' already on your list (their replies update).'
    + (mapped.some((r) => !r._valid) ? ' Rows without a name are skipped.' : '');
  return { mapped, summary, fileName, platform, total: mapped.length, clean, line };
}

/** Bring them in: { patch, msg, batches }, the batch holding the list before, for Undo. */
export function importApplyEdit(event, preview, batches, ts = Date.now()) {
  const before = (event && event.guests) || [];
  const batchId = newImportBatchId();
  const merged = applyMerge(before, preview.mapped, 'merge', batchId);
  const audit = computeImportAuditMeta(preview.mapped, preview.summary);
  const next = [...(batches || []), makeImportBatch(batchId, before, { ...audit, platform: preview.platform, mergeMode: 'merge' }, ts)].slice(-MAX_PERSISTED_BATCHES);
  return {
    patch: { guests: merged, kidsCount: kidsCountAfterRoster(event, merged) },
    msg: (preview.summary.willAdd || 0) + ' added · ' + (preview.summary.willUpdate || 0) + ' updated from ' + preview.fileName + '. Replies and needs came along.',
    batches: next,
  };
}

/** Undo the last import: { patch, msg, batches }, or null with nothing to undo. */
export function importUndoEdit(event, batches) {
  const res = undoLastImportBatch(batches || []);
  if (!res) return null;
  return {
    patch: { guests: res.snapshot, kidsCount: kidsCountAfterRoster(event, res.snapshot) },
    msg: 'Import undone. The list is back the way it was before that import.',
    batches: res.batches,
  };
}
