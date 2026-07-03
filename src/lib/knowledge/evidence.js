// ─── KnowledgeEvidence — supports or refutes observations (KAS-2) ─────────────
// First-class, REUSABLE (many Findings may reference the same evidence), REFERENCED
// (realizes provenance.sources=[evidenceId]). Pure model + thin store. Evidence is never
// knowledge — it supports it; it becomes canonical only via Finding → KCR → publish.

export const AUTHORITY_LEVELS = ['primary', 'official', 'standards', 'trade', 'expert', 'derived', 'community'];
export const EVIDENCE_SOURCE_TYPES = ['official', 'industry', 'regional', 'commercial', 'event', 'expert', 'community', 'vendor', 'failure', 'ai-agent'];

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// Reusable evidence keyed by (source, asset, field) — same source re-captured is idempotent.
export function evidenceId(source, assetId, fieldPath) { return `ev-${slug(source)}-${slug(assetId)}-${slug(fieldPath)}`; }

export function createEvidence({ source, sourceType, authorityLevel, url = null, excerpt = null, confidence = 'medium', effectiveDate = null, expirationDate = null, region = null, assetId = null, fieldPath = null, supports = [], contradicts = [], extractedFacts = [], at = null }) {
  if (authorityLevel && !AUTHORITY_LEVELS.includes(authorityLevel)) throw new Error(`Evidence: unknown authorityLevel '${authorityLevel}'`);
  return {
    id: evidenceId(source, assetId, fieldPath),
    source, sourceType, authorityLevel: authorityLevel || 'community',
    url, excerpt, confidence,                 // confidence is qualitative — never a fabricated %
    capturedAt: at, effectiveDate, expirationDate,
    region, assetId, fieldPath,
    supports, contradicts, extractedFacts,    // [{field, value}]
    linkedObservations: [], linkedFindings: [], linkedKCRs: [], linkedAssets: assetId ? [assetId] : [],
    humanReviewed: false, aiReviewed: false,
    status: 'candidate',                       // candidate | corroborated | accepted | expired | rejected
  };
}

const KEY = 'ngw-kas-evidence';
export function loadEvidence() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
export function saveEvidence(list) { try { localStorage.setItem(KEY, JSON.stringify(list || [])); return true; } catch { return false; } }
export function recordEvidence(ev) {
  const list = loadEvidence().filter((e) => e.id !== ev.id);
  list.push(ev); saveEvidence(list); return list;
}
export function clearEvidence() { try { localStorage.removeItem(KEY); } catch { /* noop */ } }

// Server-first async load — mirrors kcrStore.loadKCRs().
export async function loadEvidenceAsync() {
  try {
    const { fetchKasRecords, isKasApiConfigured } = await import('../api/kas');
    if (!isKasApiConfigured()) return loadEvidence();
    const remote = await fetchKasRecords('evidence');
    if (Array.isArray(remote)) { saveEvidence(remote); return remote; }
  } catch { /* fall through */ }
  return loadEvidence();
}

export async function upsertEvidenceAsync(ev) {
  recordEvidence(ev);
  try {
    const { upsertKasRecords, isKasApiConfigured } = await import('../api/kas');
    if (isKasApiConfigured()) await upsertKasRecords('evidence', [ev]);
  } catch { /* local is authoritative */ }
}
