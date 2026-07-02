// ─── KCR persistence store + intake reconciliation (KCR-2 gaps 1 & 2) ─────────
// KCRs are GOVERNANCE metadata (not canonical knowledge, not host data) — an admin
// backlog. Persisted locally (localStorage) until a server table lands; the
// deterministic KCR id is the primary key, so re-generating intake UPSERTS by id
// instead of forking a fresh draft each session.
//
// The merge/reconcile logic is PURE + testable (mergeKCR / reconcileKCRs); the
// load/save wrappers are the only impure edges (try/catch, like events.js). No
// runtime/host-output change — this store is read only by admin surfaces.

const KEY = 'ngw-kcr-store';

// LIFECYCLE PROGRESS (status · evidence · contradictions · proposal · review ·
// publishedVersion · rollbackTo · audit · createdAt/By · trigger · type) is preserved
// across re-intake by keeping the `existing` object and only overwriting the DERIVED
// fields below — so a freshly-generated draft never clobbers in-progress work.
const REFRESH_FIELDS  = ['reason', 'priority', 'impact', 'currentValue', 'currentProvenance', 'fieldPath', 'assetId', 'assetKind'];

// Merge an incoming (freshly-generated) KCR into an existing stored one BY ID.
// Existing progress wins; derived metadata refreshes. If existing is null → the
// incoming is new (returned as-is). Pure.
export function mergeKCR(existing, incoming) {
  if (!existing) return incoming;
  const merged = { ...existing };
  for (const f of REFRESH_FIELDS) if (f in incoming) merged[f] = incoming[f];
  // PROGRESS_FIELDS are intentionally kept from `existing` (no-op — already spread).
  return merged;
}

// Reconcile a freshly-generated intake set against the stored backlog. Upserts by id:
// new gaps → added; recurring gaps → progress preserved, metadata refreshed. Stored
// KCRs whose gap no longer appears are LEFT in place (their work isn't lost; a resolved
// gap simply stops being regenerated). Pure — returns {kcrs, added, refreshed}.
export function reconcileKCRs(storedList, generatedList) {
  const byId = new Map((storedList || []).map((k) => [k.id, k]));
  let added = 0, refreshed = 0;
  for (const gen of generatedList || []) {
    if (byId.has(gen.id)) { byId.set(gen.id, mergeKCR(byId.get(gen.id), gen)); refreshed++; }
    else { byId.set(gen.id, gen); added++; }
  }
  return { kcrs: [...byId.values()], added, refreshed };
}

// ── Persistence edges (impure — the only localStorage touch) ──────────────────
export function loadKCRs() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function saveKCRs(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list || [])); return true; } catch { return false; }
}

// Authoritative write of a single KCR (a human/agent ADVANCED it — added evidence,
// recorded a review, published). The incoming IS the new truth ⇒ replace by id.
// (Distinct from syncIntake, where a freshly-generated DRAFT must NOT clobber progress.)
export function upsertKCR(kcr) {
  const list = loadKCRs().filter((k) => k.id !== kcr.id);
  list.push(kcr);
  saveKCRs(list);
  return list;
}

// Reconcile a whole generated intake set into the persisted backlog (stored progress
// wins over freshly-generated drafts). Returns the summary.
export function syncIntake(generatedList) {
  const res = reconcileKCRs(loadKCRs(), generatedList);
  saveKCRs(res.kcrs);
  return res;
}

export function getKCR(id) { return loadKCRs().find((k) => k.id === id) || null; }
export function clearKCRs() { try { localStorage.removeItem(KEY); } catch { /* noop */ } }
