import { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import {
  PLATFORMS, transformRows, validateRows,
  computeMergeSummary, applyMerge,
} from '../lib/csvParsers';
import { type } from '../design/tokens';

const C = {
  bg: '#0f0f11', surface: '#18181c', border: '#2a2a32',
  accent: '#7c6ef8', text: '#e8e8f0', muted: '#6b6b80',
  danger: '#f87171', success: '#4ade80', warn: '#fbbf24',
};

const PLATFORM_KEYS = Object.keys(PLATFORMS);
const MERGE_OPTIONS = [
  { value: 'add_new', label: 'Add new guests only',  desc: 'Skip rows whose email (or name) already exists.' },
  { value: 'merge',   label: 'Merge',                desc: 'Update existing guests (matched by email, then name) and add new ones.' },
  { value: 'replace', label: 'Replace all',          desc: 'Remove all current guests and replace with this list.', warn: true },
];

const Pill = ({ children, color }) => (
  <span style={{ fontSize: type.size.sm, padding: '3px 10px', borderRadius: 99, background: `${color}22`, color, whiteSpace: 'nowrap' }}>{children}</span>
);

// ─── ImportWizard ─────────────────────────────────────────────────────────────
// onImport(newGuestList, batchId, auditMeta)
// auditMeta: { platform, mergeMode, inserted, updated, removed, skipped, warnCount }
export default function ImportWizard({ existingGuests, onImport, onClose }) {
  const [step,           setStep]           = useState(0);
  const [platform,       setPlatform]       = useState('ngw');
  const [rows,           setRows]           = useState([]);
  const [mergeMode,      setMergeMode]      = useState('add_new');
  const [result,         setResult]         = useState(null);
  const [parseError,     setParseError]     = useState(null);
  const [dragging,       setDragging]       = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const fileRef = useRef(null);

  const parseFile = useCallback((file) => {
    setParseError(null);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete({ data }) {
        if (!data.length) { setParseError('File appears empty or could not be parsed.'); return; }
        try {
          const transformed = transformRows(data, platform);
          const validated   = validateRows(transformed);
          setRows(validated);
          setStep(1);
        } catch (e) { setParseError(e.message); }
      },
      error(e) { setParseError(e.message); },
    });
  }, [platform]);

  const handleFileInput = (e) => { const f = e.target.files[0]; if (f) parseFile(f); e.target.value = ''; };
  const handleDrop = (e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) parseFile(f); };

  const handleCommit = () => {
    if (mergeMode === 'replace' && !confirmReplace) { setConfirmReplace(true); return; }
    setConfirmReplace(false);
    const batchId   = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const newGuests = applyMerge(existingGuests, rows, mergeMode, batchId);
    const valid     = rows.filter(r => r._valid);
    const inserted  = summary ? summary.willAdd    : valid.length;
    const updated   = summary ? summary.willUpdate : 0;
    const removed   = summary ? summary.willRemove : 0;
    const skipped   = rows.length - valid.length;
    const warnCount = rows.filter(r => (r._warnings || []).length > 0).length;
    onImport(newGuests, batchId, { platform, mergeMode, inserted, updated, removed, skipped, warnCount });
    setResult({ inserted, updated, removed, skipped, batchId });
    setStep(3);
  };

  const summary       = step >= 2 ? computeMergeSummary(existingGuests, rows, mergeMode) : null;
  const validCount    = rows.filter(r => r._valid).length;
  const invalidCount  = rows.length - validCount;
  const rsvpMapped    = rows.filter(r => (r._warnings || []).some(w => w.startsWith('RSVP'))).length;
  const mealMapped    = rows.filter(r => (r._warnings || []).some(w => w.startsWith('Meal'))).length;
  const noEmail       = rows.filter(r => r._valid && !r.email).length;

  // ── overlay ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 640, margin: '0 auto', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: type.size.lg, fontWeight: 700, color: C.text }}>Import Guests</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: type.size['2xl'], lineHeight: 1, padding: 4 }}>×</button>
          </div>
          <div style={{ display: 'flex', gap: 0, marginBottom: 0 }}>
            {['Source', 'Preview', 'Merge', 'Done'].map((label, i) => (
              <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 3, background: i <= step ? C.accent : C.border, borderRadius: i === 0 ? '99px 0 0 99px' : i === 3 ? '0 99px 99px 0' : 0, transition: 'background 0.2s' }} />
                <div style={{ fontSize: type.size.xs, color: i === step ? C.accent : C.muted, marginTop: 4, fontWeight: i === step ? 600 : 400 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>

          {/* ── Step 0: Source ── */}
          {step === 0 && (
            <div>
              <div style={{ fontSize: type.size.base, color: C.muted, marginBottom: 16 }}>Select your platform, then upload a CSV export.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                {PLATFORM_KEYS.map(key => (
                  <button key={key} onClick={() => setPlatform(key)} style={{ padding: '12px 8px', borderRadius: 10, cursor: 'pointer', border: `2px solid ${platform === key ? C.accent : C.border}`, background: platform === key ? `${C.accent}18` : C.bg, color: platform === key ? C.accent : C.text, fontSize: type.size.base, fontWeight: platform === key ? 600 : 400, transition: 'all 0.15s' }}>
                    {PLATFORMS[key].label}
                  </button>
                ))}
              </div>
              <a href={PLATFORMS[platform].templatePath} download style={{ display: 'block', fontSize: type.size.caption, color: C.accent, marginBottom: 20, textDecoration: 'none' }}>
                ↓ Download {PLATFORMS[platform].label} template
              </a>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current.click()}
                style={{ border: `2px dashed ${dragging ? C.accent : C.border}`, borderRadius: 12, padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: dragging ? `${C.accent}0a` : C.bg, transition: 'all 0.15s' }}
              >
                <div style={{ fontSize: type.size['5xl'], marginBottom: 8 }}>📂</div>
                <div style={{ fontSize: type.size.base, color: C.text, marginBottom: 4 }}>Drop your CSV here, or tap to browse</div>
                <div style={{ fontSize: type.size.sm, color: C.muted }}>CSV only · max 2,000 rows</div>
              </div>
              <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleFileInput} />
              {parseError && (
                <div style={{ marginTop: 16, padding: '10px 14px', background: `${C.danger}18`, border: `1px solid ${C.danger}44`, borderRadius: 8, fontSize: type.size.caption, color: C.danger }}>{parseError}</div>
              )}
            </div>
          )}

          {/* ── Step 1: Preview ── */}
          {step === 1 && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <Pill color={C.success}>{validCount} valid</Pill>
                {invalidCount > 0 && <Pill color={C.danger}>{invalidCount} errors (skipped)</Pill>}
                {rsvpMapped  > 0 && <Pill color={C.warn}>{rsvpMapped} RSVP mapped to Pending</Pill>}
                {mealMapped  > 0 && <Pill color={C.warn}>{mealMapped} meal mapped to —</Pill>}
                {noEmail     > 0 && <Pill color={C.warn}>{noEmail} no email (name-only dedup)</Pill>}
                <span style={{ fontSize: type.size.sm, color: C.muted, marginLeft: 'auto' }}>{rows.length} total · showing {Math.min(rows.length, 8)}</span>
              </div>
              <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${C.border}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: type.size.caption }}>
                  <thead>
                    <tr>
                      {['', 'Name', 'Email', 'RSVP', 'Meal', 'Warnings / Errors'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: C.muted, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap', fontWeight: 600, fontSize: type.size.sm, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 8).map(r => {
                      const issues = [...(r._errors || []), ...(r._warnings || [])];
                      return (
                        <tr key={r.id}>
                          <td style={{ padding: '8px 10px', color: r._valid ? C.success : C.danger, fontSize: type.size.md }}>{r._valid ? '✓' : '✗'}</td>
                          <td style={{ padding: '8px 10px', color: C.text }}>{r.name || <span style={{ color: C.danger }}>missing</span>}</td>
                          <td style={{ padding: '8px 10px', color: C.muted }}>{r.email || '—'}</td>
                          <td style={{ padding: '8px 10px', color: C.text }}>{r.rsvp_status}</td>
                          <td style={{ padding: '8px 10px', color: C.muted }}>{r.meal_preference || '—'}</td>
                          <td style={{ padding: '8px 10px', color: r._errors?.length ? C.danger : C.warn, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {issues.length ? issues[0] + (issues.length > 1 ? ` +${issues.length - 1}` : '') : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {rows.length > 8 && <div style={{ fontSize: type.size.sm, color: C.muted, marginTop: 8 }}>… and {rows.length - 8} more rows</div>}
            </div>
          )}

          {/* ── Step 2: Merge mode ── */}
          {step === 2 && (
            <div>
              {confirmReplace ? (
                <div style={{ padding: '20px', background: `${C.danger}12`, border: `1px solid ${C.danger}44`, borderRadius: 12 }}>
                  <div style={{ fontSize: type.size.lg, fontWeight: 700, color: C.danger, marginBottom: 8 }}>⚠ Confirm Replace All</div>
                  <div style={{ fontSize: type.size.base, color: C.text, marginBottom: 6 }}>
                    This will permanently remove all <strong>{existingGuests.length}</strong> existing guests and replace them with the <strong>{validCount}</strong> rows in this file.
                  </div>
                  <div style={{ fontSize: type.size.caption, color: C.muted, marginBottom: 20 }}>This action can be undone with the Undo Import button after closing the wizard.</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setConfirmReplace(false)} style={{ flex: 1, padding: '11px', borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, color: C.text, cursor: 'pointer', fontSize: type.size.base }}>Cancel</button>
                    <button onClick={handleCommit} style={{ flex: 1, padding: '11px', borderRadius: 10, background: C.danger, border: 'none', color: '#fff', cursor: 'pointer', fontSize: type.size.base, fontWeight: 700 }}>
                      Yes, Replace All
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: type.size.base, color: C.muted, marginBottom: 16 }}>
                    How should imported guests be handled against your existing {existingGuests.length} guest{existingGuests.length !== 1 ? 's' : ''}?
                  </div>
                  {MERGE_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setMergeMode(opt.value)} style={{ width: '100%', textAlign: 'left', padding: '14px 16px', marginBottom: 8, borderRadius: 10, cursor: 'pointer', border: `2px solid ${mergeMode === opt.value ? (opt.warn ? C.danger : C.accent) : C.border}`, background: mergeMode === opt.value ? (opt.warn ? `${C.danger}12` : `${C.accent}18`) : C.bg, color: C.text }}>
                      <div style={{ fontSize: type.size.base, fontWeight: 600, marginBottom: 2, color: mergeMode === opt.value && opt.warn ? C.danger : 'inherit' }}>{opt.label}</div>
                      <div style={{ fontSize: type.size.sm, color: C.muted }}>{opt.desc}</div>
                    </button>
                  ))}
                  {summary && (
                    <div style={{ marginTop: 20, padding: '14px 16px', background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, fontSize: type.size.caption }}>
                      <div style={{ fontWeight: 600, marginBottom: 8, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: type.size.sm }}>Summary</div>
                      {summary.willAdd    > 0 && <div style={{ marginBottom: 4, color: C.success }}>+ {summary.willAdd} guests will be added</div>}
                      {summary.willUpdate > 0 && <div style={{ marginBottom: 4, color: C.warn   }}>↻ {summary.willUpdate} existing guests will be updated</div>}
                      {summary.willRemove > 0 && <div style={{ marginBottom: 4, color: C.danger  }}>✕ {summary.willRemove} existing guests will be removed</div>}
                      {summary.willSkip   > 0 && <div style={{ marginBottom: 4, color: C.muted  }}>— {summary.willSkip} rows skipped (validation errors)</div>}
                      {summary.duplicateCandidates > 0 && (
                        <div style={{ marginTop: 8, padding: '8px 10px', background: `${C.warn}18`, borderRadius: 8, color: C.warn, fontSize: type.size.sm }}>
                          ⚠ {summary.duplicateCandidates} row{summary.duplicateCandidates !== 1 ? 's' : ''} matched by name only — no email to confirm. Verify before importing.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Step 3: Done ── */}
          {step === 3 && result && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: type.size['5xl'], marginBottom: 12 }}>✓</div>
              <div style={{ fontSize: type.size.xl, fontWeight: 700, color: C.success, marginBottom: 8 }}>Import complete</div>
              <div style={{ fontSize: type.size.base, color: C.muted, marginBottom: 4 }}>
                {result.inserted > 0 && `${result.inserted} added`}
                {result.inserted > 0 && result.updated > 0 && ', '}
                {result.updated  > 0 && `${result.updated} updated`}
                {result.removed  > 0 && `, ${result.removed} removed`}
                .
              </div>
              {result.skipped > 0 && <div style={{ fontSize: type.size.caption, color: C.warn }}>{result.skipped} row{result.skipped !== 1 ? 's' : ''} skipped.</div>}
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={onClose} style={{ padding: '12px', borderRadius: 10, background: C.accent, border: 'none', color: '#fff', cursor: 'pointer', fontSize: type.size.md, fontWeight: 600 }}>View guests</button>
                <button onClick={() => { setStep(0); setRows([]); setResult(null); setParseError(null); setConfirmReplace(false); }} style={{ padding: '12px', borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, color: C.text, cursor: 'pointer', fontSize: type.size.base }}>Import another file</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer nav */}
        {step < 3 && !confirmReplace && (
          <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <button onClick={() => step === 0 ? onClose() : setStep(s => s - 1)} style={{ padding: '11px 20px', borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, color: C.text, cursor: 'pointer', fontSize: type.size.base, fontWeight: 500 }}>
              {step === 0 ? 'Cancel' : '← Back'}
            </button>
            {step === 0 && <div />}
            {step === 1 && (
              <button onClick={() => setStep(2)} disabled={validCount === 0} style={{ padding: '11px 20px', borderRadius: 10, background: validCount > 0 ? C.accent : C.border, border: 'none', color: validCount > 0 ? '#fff' : C.muted, cursor: validCount > 0 ? 'pointer' : 'default', fontSize: type.size.base, fontWeight: 600 }}>
                Next →
              </button>
            )}
            {step === 2 && (
              <button onClick={handleCommit} style={{ padding: '11px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: type.size.base, fontWeight: 600, background: mergeMode === 'replace' ? C.danger : C.accent, color: '#fff' }}>
                {mergeMode === 'replace'
                  ? `Replace with ${validCount} guests`
                  : `Import ${summary ? summary.willAdd + summary.willUpdate : validCount} guests`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
