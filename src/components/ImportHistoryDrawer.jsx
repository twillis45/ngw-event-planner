import { useState } from 'react';

// ─── palette (matches app dark theme; accepts override via props) ─────────────
const D = {
  bg: '#0f0f11', surface: '#18181c', surface2: '#1e1e24', border: '#2a2a32',
  accent: '#7c6ef8', text: '#e8e8f0', muted: '#6b6b80',
  danger: '#f87171', success: '#4ade80', warn: '#fbbf24',
};

// ─── helpers ─────────────────────────────────────────────────────────────────

const PLATFORM_LABELS = {
  ngw:       'NGW Native',
  theknot:   'The Knot',
  zola:      'Zola',
  paperless: 'Paperless Post',
};

const MODE_LABELS = {
  add_new: 'Add New Only',
  merge:   'Merge',
  replace: 'Replace All',
};

function fmtTs(ts) {
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

function buildCopyText(batch) {
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

// ─── BatchCard ────────────────────────────────────────────────────────────────
function BatchCard({ batch, isLast, onUndo, C }) {
  const [copied, setCopied] = useState(false);
  const platform = PLATFORM_LABELS[batch.platform] || batch.platform || 'CSV Import';
  const mode     = MODE_LABELS[batch.mergeMode]   || batch.mergeMode || '—';

  const copy = () => {
    navigator.clipboard?.writeText(buildCopyText(batch)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const countRow = [
    batch.inserted > 0 && { val: batch.inserted, label: 'added',   color: C.success, prefix: '+' },
    batch.updated  > 0 && { val: batch.updated,  label: 'updated', color: C.warn,    prefix: '↻' },
    batch.removed  > 0 && { val: batch.removed,  label: 'removed', color: C.danger,  prefix: '−' },
    batch.skipped  > 0 && { val: batch.skipped,  label: 'skipped', color: C.muted,   prefix: '—' },
  ].filter(Boolean);

  return (
    <div style={{
      borderRadius: 12, border: `1px solid ${C.border}`,
      padding: '14px 16px', marginBottom: 10,
      background: C.bg,
    }}>
      {/* Top row: platform + mode */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>{platform}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{fmtTs(batch.ts)}</div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99, flexShrink: 0,
          background: batch.mergeMode === 'replace' ? `${C.danger}22` : `${C.accent}22`,
          color: batch.mergeMode === 'replace' ? C.danger : C.accent,
          border: `1px solid ${batch.mergeMode === 'replace' ? C.danger : C.accent}44`,
        }}>{mode}</span>
      </div>

      {/* Counts */}
      {countRow.length > 0 && (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
          {countRow.map(({ val, label, color, prefix }) => (
            <span key={label} style={{ fontSize: 12, color, fontWeight: 600 }}>
              {prefix} {val} <span style={{ fontWeight: 400, color: C.muted }}>{label}</span>
            </span>
          ))}
          {batch.skipped === 0 && batch.inserted === 0 && batch.updated === 0 && batch.removed === 0 && (
            <span style={{ fontSize: 12, color: C.muted }}>No changes</span>
          )}
        </div>
      )}

      {/* Warning callout */}
      {batch.warnCount > 0 && (
        <div style={{ fontSize: 11, color: C.warn, marginBottom: 10 }}>
          ⚠ {batch.warnCount} row{batch.warnCount !== 1 ? 's' : ''} had warnings during import
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          onClick={copy}
          style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: copied ? C.success : C.muted, cursor: 'pointer', fontFamily: 'inherit', transition: 'color 0.15s' }}
        >
          {copied ? '✓ Copied' : 'Copy report'}
        </button>
        {isLast && batch.snapshot && (
          <button
            onClick={() => onUndo(batch.id)}
            style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.warn}44`, background: `${C.warn}12`, color: C.warn, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ↩ Undo this import
          </button>
        )}
        {!isLast && (
          <span style={{ fontSize: 11, color: C.border, alignSelf: 'center' }}>Cannot undo — later imports exist</span>
        )}
      </div>
    </div>
  );
}

// ─── ImportHistoryDrawer ──────────────────────────────────────────────────────
// Props:
//   batches  — array of batch objects from importBatches state
//   onUndo   — (batchId) => void  (only called for last batch)
//   onClose  — () => void
//   title    — string (default "Import History")
//   C        — optional color tokens (falls back to dark defaults)
export default function ImportHistoryDrawer({ batches = [], onUndo, onClose, title = 'Import History', C: COverride }) {
  const C = COverride || D;

  // Right-panel on desktop, full-width slide from bottom on mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const panelStyle = isMobile
    ? { position: 'fixed', left: 0, right: 0, bottom: 0, top: 'auto', maxHeight: '85vh', borderRadius: '20px 20px 0 0', zIndex: 9998 }
    : { position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(400px, 100vw)', zIndex: 9998 };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9997 }}
      />

      {/* Panel */}
      <div
        onKeyDown={e => { if (e.key === 'Escape') onClose(); e.stopPropagation(); }}
        style={{
          ...panelStyle,
          background: C.surface,
          borderLeft: isMobile ? 'none' : `1px solid ${C.border}`,
          borderTop: isMobile ? `1px solid ${C.border}` : 'none',
          display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.35)',
        }}
      >
        {/* Grip (mobile) */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px', flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: C.border }} />
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 14px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{title}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              {batches.length === 0 ? 'No imports yet' : `${batches.length} import${batches.length !== 1 ? 's' : ''} · most recent first`}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, lineHeight: 1 }}
            aria-label="Close"
          >×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {batches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>No import history yet</div>
              <div style={{ fontSize: 12, color: C.muted }}>
                When you import a CSV, each batch will be recorded here with full audit details.
              </div>
            </div>
          ) : (
            // Show newest first
            [...batches].reverse().map((batch, i) => (
              <BatchCard
                key={batch.id}
                batch={batch}
                isLast={i === 0} // reversed, so i=0 is the actual last batch
                onUndo={onUndo}
                C={C}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {batches.length > 0 && (
          <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
              Snapshots are kept in session memory. Undo is available until the page reloads or the batch is undone.
            </div>
          </div>
        )}
      </div>
    </>
  );
}
