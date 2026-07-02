// ─── KCR store — server-backed with localStorage fallback (KCR-4) ─────────────
// KCRs are GOVERNANCE metadata (no host data, no PII) — an admin backlog. Persisted to
// an admin-scoped server table (src/lib/api/kcr.js → FastAPI /api/admin/kcrs), with
// localStorage as the cache + offline/dev fallback. The deterministic KCR id is the
// primary key, so re-generating intake UPSERTS by id (no forked drafts).
//
// The merge/reconcile logic is PURE + testable (mergeKCR / reconcileKCRs) and lives ONLY
// here (never duplicated on the server — the server is a dumb authoritative store, EP-1).
// Two directions, preserved from KCR-2:
//   upsertKCR  = AUTHORITATIVE write (a human/agent advanced it → incoming wins).
//   syncIntake = PROGRESS-PRESERVING (a freshly-generated draft never clobbers work).
//
// The seam (loadKCRs/saveKCRs/upsertKCR/syncIntake) is preserved by NAME; the network
// ops are now async. getKCR reads the local cache synchronously.

import { isKcrApiConfigured, fetchKCRs, upsertKCRsRemote } from '../api/kcr';

const KEY = 'ngw-kcr-store';

// LIFECYCLE PROGRESS (status · evidence · contradictions · proposal · review ·
// publishedVersion · rollbackTo · audit · createdAt/By · trigger · type) is preserved
// across re-intake by keeping the `existing` object and only overwriting the DERIVED
// fields below — so a freshly-generated draft never clobbers in-progress work.
const REFRESH_FIELDS = ['reason', 'priority', 'impact', 'currentValue', 'currentProvenance', 'fieldPath', 'assetId', 'assetKind'];

// ── Pure merge/reconcile (unchanged; the single merge implementation) ─────────
export function mergeKCR(existing, incoming) {
  if (!existing) return incoming;
  const merged = { ...existing };
  for (const f of REFRESH_FIELDS) if (f in incoming) merged[f] = incoming[f];
  return merged;
}

export function reconcileKCRs(storedList, generatedList) {
  const byId = new Map((storedList || []).map((k) => [k.id, k]));
  let added = 0, refreshed = 0;
  for (const gen of generatedList || []) {
    if (byId.has(gen.id)) { byId.set(gen.id, mergeKCR(byId.get(gen.id), gen)); refreshed++; }
    else { byId.set(gen.id, gen); added++; }
  }
  return { kcrs: [...byId.values()], added, refreshed };
}

// ── Local cache / fallback (sync) ─────────────────────────────────────────────
export function loadLocalKCRs() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function saveLocalKCRs(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list || [])); return true; } catch { return false; }
}
export const saveKCRs = saveLocalKCRs; // seam-compat alias
export function getKCR(id) { return loadLocalKCRs().find((k) => k.id === id) || null; } // cache read
export function clearKCRs() { try { localStorage.removeItem(KEY); } catch { /* noop */ } }

// ── The seam — server-first, local fallback (async) ───────────────────────────

// Load the backlog. Server (admin) when configured; on any failure OR when unconfigured,
// the local cache. A successful server load refreshes the cache (so getKCR/second-device
// reads stay current).
export async function loadKCRs() {
  if (isKcrApiConfigured()) {
    const remote = await fetchKCRs();
    if (Array.isArray(remote)) { saveLocalKCRs(remote); return remote; }
    return loadLocalKCRs();               // API down ⇒ offline fallback
  }
  return loadLocalKCRs();
}

// Authoritative write of a single advanced KCR. Optimistic concurrency (KCR-5): the KCR
// carries the `_serverUpdatedAt` it was loaded with; the server rejects the write if the
// stored row is newer. On CONFLICT the local cache is refreshed from server truth so a
// stale session's write is discarded, not kept. Returns { list, conflict }.
export async function upsertKCR(kcr) {
  const list = loadLocalKCRs().filter((k) => k.id !== kcr.id);
  list.push(kcr);
  saveLocalKCRs(list);
  if (isKcrApiConfigured()) {
    const res = await upsertKCRsRemote([kcr]);
    if (res && Array.isArray(res.conflicts) && res.conflicts.some((c) => c.id === kcr.id)) {
      const fresh = await fetchKCRs();          // stale write rejected — pull the newer truth
      if (Array.isArray(fresh)) saveLocalKCRs(fresh);
      return { list: loadLocalKCRs(), conflict: true };
    }
  }
  return { list: loadLocalKCRs(), conflict: false };
}

// Reconcile a freshly-generated intake set into the backlog (progress-preserving), then
// persist. Loads current (server-first, carrying each row's `_serverUpdatedAt`) →
// reconcile (pure) → cache + push. Any per-row conflict (a row advanced by another admin
// between our load and write) is skipped server-side; we then re-pull to stay consistent.
export async function syncIntake(generatedList) {
  const current = await loadKCRs();
  const res = reconcileKCRs(current, generatedList);
  saveLocalKCRs(res.kcrs);
  if (isKcrApiConfigured() && res.kcrs.length) {
    const r = await upsertKCRsRemote(res.kcrs);
    if (r && Array.isArray(r.conflicts) && r.conflicts.length) {
      const fresh = await fetchKCRs();
      if (Array.isArray(fresh)) saveLocalKCRs(fresh);
      return { ...res, conflicts: r.conflicts };
    }
  }
  return res;
}
