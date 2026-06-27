// ─── Preferred Vendors (Vendor Bank) data access layer ────────────────────────
// Studio-scoped mirror of clients.js — the studio's saved/trusted vendors.
// localStorage-first, Supabase-when-available. localStorage key is the SAME one
// the old localStorage-only Vendor Bank used (ngw-preferred-vendors), so a
// planner's existing bank is preserved and migrates to the cloud on first save.
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { currentStudioId } from './studio';
import { captureError } from '../sentry';

const LOCAL_KEY = 'ngw-preferred-vendors';
const onLine = () => (typeof navigator !== 'undefined' ? navigator.onLine : null);

function readLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
}
function writeLocal(vendors) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(vendors)); } catch (e) { captureError(e, { where: 'vendors.writeLocal', count: vendors?.length }); }
}

// ─── Vendor Bank identity (Sprint 61B) ───────────────────────────────────────
// A stable bankId stamped onto event vendors so cross-event vendor history stops
// fragmenting on normalized names. bankKey is the dedupe key (lowercased
// name|category); resolveBankId finds the existing bank entry's id for a
// name+category, or null when there's no match (or no usable key).
export function bankKey(name, category) {
  return `${String(name || '').toLowerCase().trim()}|${String(category || '').toLowerCase().trim()}`;
}
export function resolveBankId(bank, name, category) {
  const k = bankKey(name, category);
  if (k === '|') return null;
  const hit = (bank || []).find((v) => bankKey(v.name, v.category) === k);
  return hit ? hit.id : null;
}

/** Load all preferred vendors for the current studio. Falls back to localStorage. */
export async function loadVendors() {
  if (!isSupabaseConfigured() || !supabase) return readLocal();
  const sid = await currentStudioId();
  if (!sid) return readLocal();
  try {
    const { data, error } = await supabase
      .from('preferred_vendors')
      .select('id, data, updated_at')
      .eq('studio_id', sid)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    const vendors = (data || []).map((row) => ({ ...row.data, id: row.id }));
    // First-run merge: if the cloud is empty but localStorage has a bank, keep
    // the local copy so we don't blank an existing roster before migration.
    if (!vendors.length) {
      const local = readLocal();
      if (local.length) return local;
    }
    writeLocal(vendors);
    return vendors;
  } catch (e) {
    captureError(e, { where: 'vendors.loadVendors', onLine: onLine() });
    return readLocal();
  }
}

/** Upsert a single vendor (within the current studio). */
export async function saveVendor(vendor) {
  const local = readLocal();
  writeLocal(local.some((v) => v.id === vendor.id)
    ? local.map((v) => (v.id === vendor.id ? vendor : v))
    : [...local, vendor]);

  if (!isSupabaseConfigured() || !supabase) return;
  const sid = await currentStudioId();
  if (!sid) return;
  try {
    const { error } = await supabase
      .from('preferred_vendors')
      .upsert({ id: vendor.id, studio_id: sid, data: vendor }, { onConflict: 'id' });
    if (error) throw error;
  } catch (e) { captureError(e, { where: 'vendors.saveVendor', id: vendor.id, onLine: onLine() }); }
}

/** Delete a vendor by id (within the current studio). */
export async function deleteVendor(vendorId) {
  writeLocal(readLocal().filter((v) => v.id !== vendorId));
  if (!isSupabaseConfigured() || !supabase) return;
  const sid = await currentStudioId();
  if (!sid) return;
  try {
    const { error } = await supabase
      .from('preferred_vendors').delete().eq('id', vendorId).eq('studio_id', sid);
    if (error) throw error;
  } catch (e) { captureError(e, { where: 'vendors.deleteVendor', id: vendorId, onLine: onLine() }); }
}

/** Import localStorage vendors into the current studio (first-time migration). */
export async function migrateLocalToCloud(localVendors) {
  if (!isSupabaseConfigured() || !supabase) return { migrated: 0, failed: 0 };
  const sid = await currentStudioId();
  if (!sid) return { migrated: 0, failed: 0 };
  let migrated = 0, failed = 0;
  for (const vendor of localVendors) {
    try {
      const { error } = await supabase
        .from('preferred_vendors')
        .upsert({ id: vendor.id, studio_id: sid, data: vendor }, { onConflict: 'id' });
      if (error) throw error;
      migrated++;
    } catch {
      failed++;
    }
  }
  return { migrated, failed };
}
