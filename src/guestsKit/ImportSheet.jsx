// IMPORT A LIST, IN THE KIT (G2c-2b-3; owner, 11/28/2026: "Approved, go with
// your recommendations"; UX_12 §8a, render screen 3). Where the list is from,
// the file, a preview before anything changes, Bring them in; then Past
// imports with Undo (the last one) and Clear. The rules are lib/guestImport's,
// the ones the old Guests sheet uses; the history is lib/importHistory's, the
// same per-plan record, so an import made in either one can be undone in both.
import { useState } from 'react';
import Papa from 'papaparse';
import { PLATFORMS } from '@app/lib/csvParsers';
import { importPreview, importApplyEdit, importUndoEdit, importPlatformLabel } from '@app/lib/guestImport';
import { GUEST_IMPORT_BATCHES_KEY, loadImportBatches, persistImportBatches, fmtBatchTs } from '@app/lib/importHistory';

export default function ImportSheet({ ev, save, onDone }) {
  const key = GUEST_IMPORT_BATCHES_KEY + ':' + ev.id;
  const [platform, setPlatform] = useState('ngw');
  const [preview, setPreview] = useState(null);
  const [problem, setProblem] = useState('');
  const [batches, setBatches] = useState(() => loadImportBatches(key));
  const keep = (b) => { setBatches(b); persistImportBatches(b, key); };
  const read = (file) => {
    setProblem(''); setPreview(null);
    if (!file) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => { try { setPreview(importPreview(ev, res.data || [], platform, file.name)); } catch { setProblem('That file didn’t read as a guest list. Check where it’s from.'); } },
      error: () => setProblem('Couldn’t read that file.'),
    });
  };
  const bring = () => { const ed = importApplyEdit(ev, preview, batches); keep(ed.batches); save(ed); onDone(); };
  const undo = () => { const ed = importUndoEdit(ev, batches); if (!ed) return; keep(ed.batches); save(ed); };
  const clear = () => { keep([]); };
  return (
    <div className="scrim" onClick={onDone}>
      <div className="gk-sheet" role="dialog" aria-label="Import a list" data-import-sheet onClick={(e) => e.stopPropagation()}>
        <div className="grabber" aria-hidden="true" />
        <div className="sheethead"><h2>Import a list</h2><button className="link" onClick={onDone}>Done</button></div>
        <h3 className="lbl">Where is it from?</h3>
        <select className="gk-field" aria-label="Where the list is from" value={platform} onChange={(e) => { setPlatform(e.target.value); setPreview(null); }}>
          {Object.keys(PLATFORMS).map((k) => <option key={k} value={k}>{importPlatformLabel(k)}</option>)}
        </select>
        <h3 className="lbl">The file</h3>
        <input className="gk-field" type="file" accept=".csv,text/csv" aria-label="Guest CSV file" onChange={(e) => read(e.target.files && e.target.files[0])} />
        {problem && <p className="fine warn" role="alert">{problem}</p>}
        {preview && (<>
          <p className="fine" data-import-preview>{preview.line}</p>
          <button className="primary" disabled={!(preview.summary.willAdd || preview.summary.willUpdate)} onClick={bring}>Bring them in</button>
          <button className="link" onClick={() => setPreview(null)}>Not this file</button>
        </>)}
        {batches.length > 0 && (<>
          <h3 className="sh">Past imports</h3>
          <div className="grp">
            {[...batches].reverse().map((b, i) => (
              <div className="row" key={b.id || i} data-past-import>
                <span className="nm">{importPlatformLabel(b.platform)}, {fmtBatchTs(b.ts)}<small>{b.inserted || 0} added · {b.updated || 0} updated{b.skipped ? ' · ' + b.skipped + ' skipped' : ''}</small></span>
              </div>
            ))}
            <button className="row gk-go" onClick={undo}><span className="nm">Undo last import</span></button>
          </div>
          <p className="fine"><button className="link" onClick={clear}>Clear this device’s import history</button> Your guest list stays as it is; past imports can’t be undone after.</p>
        </>)}
      </div>
    </div>
  );
}
