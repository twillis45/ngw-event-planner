// ─── KnowledgeObservation — the raw intake object (KAS-2) ─────────────────────
// Something NOTICED, not a conclusion. Immutable, timestamped, attributed, source-linked.
// An observation never edits knowledge — it only says "look here." It gathers Evidence
// (evidence.js), which yields a Finding (finding.js), which produces a KCR. Pure model +
// a thin store (mirrors kcrStore). asOf/at injected — no Date.now.

export const OBSERVATION_KINDS = [
  'pricing', 'contradiction', 'regulation', 'vendor-closed', 'event-failed',
  'user-feedback', 'missing-citation', 'missing-section', 'stale', 'coverage',
];

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Deterministic id per (asset, field, kind) so re-noticing the same thing is idempotent.
export function observationId(assetId, fieldPath, kind) {
  return `obs-${slug(assetId)}-${slug(fieldPath || kind)}-${slug(kind)}`;
}

export function createObservation({ kind, statement, source, gapType = null, assetId = null, assetKind = 'playbook', fieldPath = null, region = null, at = null }) {
  if (!OBSERVATION_KINDS.includes(kind)) throw new Error(`Observation: unknown kind '${kind}'`);
  return Object.freeze({
    id: observationId(assetId, fieldPath, kind),
    kind, statement, source, gapType, assetId, assetKind, fieldPath, region,
    noticedAt: at,
    status: 'open',                 // open | evidencing | concluded | dismissed
    linkedEvidence: [], linkedFindings: [],
    audit: [{ at, action: 'observed', by: source || 'unknown' }],   // immutable trail
  });
}

// ── Thin store (append-by-id; observations are immutable, re-notice = idempotent) ──
const KEY = 'ngw-kas-observations';
export function loadObservations() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
export function saveObservations(list) { try { localStorage.setItem(KEY, JSON.stringify(list || [])); return true; } catch { return false; } }
export function recordObservation(obs) {
  const list = loadObservations().filter((o) => o.id !== obs.id); // idempotent by deterministic id
  list.push(obs); saveObservations(list); return list;
}
export function clearObservations() { try { localStorage.removeItem(KEY); } catch { /* noop */ } }
