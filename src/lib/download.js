// ─── download — the ONLY place a file download is triggered ─────────────────
// Moved verbatim out of lib/csvParsers.js so the parse/serialize module stays
// pure (V2 and tests import it without touching the DOM). Serializers return
// strings (csvParsers.toCSV); this module turns a string into a Blob + anchor
// click. Keep every future download trigger here, not in the pure libs.

/** Trigger a browser download of `content` as a CSV file named `filename`. */
export function downloadCSV(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
