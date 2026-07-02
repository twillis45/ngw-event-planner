// ─── Knowledge Override — published change WITHOUT editing source files (KAS-2) ─
// The mechanism that makes "manufactured, not authored" real: a PUBLISHED KCR writes a
// governed override record; readers consult effectiveValue() to get the override or the
// authored value. The authored data file is NEVER mutated — knowledge is manufactured
// through the pipeline, not hand-edited. Admin-scoped, reversible (rollback = drop the
// override). Pure resolver + thin store.

const KEY = 'ngw-kas-overrides';

// Resolve the AUTHORED value of a field on a playbook. Supports two path shapes for the
// slice: '<purchaseId>.<attr>' (e.g. 'p_crabs.unitCostRange') and simple dotted paths.
export function readAuthored(pb, fieldPath) {
  if (!pb || !fieldPath) return undefined;
  const parts = fieldPath.split('.');
  // purchase-item path: p_xxx.attr
  if (/^p_/.test(parts[0]) && Array.isArray(pb.purchases)) {
    const item = pb.purchases.find((p) => p.id === parts[0]);
    return item ? item[parts[1]] : undefined;
  }
  return parts.reduce((o, k) => (o == null ? undefined : o[k]), pb);
}

// A published KCR (status 'published', with a proposal) becomes an override record.
export function overrideFromPublishedKCR(kcr) {
  if (!kcr || kcr.status !== 'published' || !kcr.proposal) return null;
  return {
    id: `ovr-${kcr.assetId}-${kcr.fieldPath}`,
    assetId: kcr.assetId, fieldPath: kcr.fieldPath,
    value: kcr.proposal.newValue,
    provenance: kcr.proposal.newProvenance || null,
    kcrId: kcr.id, versionId: kcr.publishedVersion || null,
    at: kcr.createdAt || null,
  };
}

// The effective value the platform serves: an active override wins over the authored file.
export function effectiveValue(pb, fieldPath, overrides) {
  const list = overrides || loadOverrides();
  const ovr = list.find((o) => o.assetId === (pb && pb.type) && o.fieldPath === fieldPath);
  if (ovr) return { value: ovr.value, source: 'override', overrideId: ovr.id, provenance: ovr.provenance };
  return { value: readAuthored(pb, fieldPath), source: 'authored' };
}

// ── Store ─────────────────────────────────────────────────────────────────────
export function loadOverrides() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
export function saveOverrides(list) { try { localStorage.setItem(KEY, JSON.stringify(list || [])); return true; } catch { return false; } }
export function applyOverride(ovr) {
  if (!ovr) return loadOverrides();
  const list = loadOverrides().filter((o) => o.id !== ovr.id);
  list.push(ovr); saveOverrides(list); return list;
}
// Rollback = remove the override; effectiveValue falls back to the authored value.
export function rollbackOverride(id) { saveOverrides(loadOverrides().filter((o) => o.id !== id)); return loadOverrides(); }
export function clearOverrides() { try { localStorage.removeItem(KEY); } catch { /* noop */ } }
