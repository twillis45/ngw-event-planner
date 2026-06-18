// ─── Clients data access layer ────────────────────────────────────────────────
// Studio-scoped mirror of events.js — rows owned by a STUDIO, not a user.
// localStorage-first, Supabase-when-available. localStorage key: ngw-clients.
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { currentStudioId, isCloudStudioId } from './studio'; // Sprint 58E-B: uuid-studio guard
import { captureError } from '../sentry';

const LOCAL_KEY = 'ngw-clients';
const onLine = () => (typeof navigator !== 'undefined' ? navigator.onLine : null);

function readLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
}
function writeLocal(clients) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(clients)); } catch (e) { captureError(e, { where: 'clients.writeLocal', count: clients?.length }); }
}

/** Load all clients for the current studio. Falls back to localStorage. */
export async function loadClients() {
  if (!isSupabaseConfigured() || !supabase) return readLocal();
  const sid = await currentStudioId();
  if (!sid || !isCloudStudioId(sid)) return readLocal(); // 58E-B: non-uuid (dev) ⇒ local-only
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('id, data, updated_at')
      .eq('studio_id', sid)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    const clients = (data || []).map((row) => ({ ...row.data, id: row.id }));
    writeLocal(clients);
    return clients;
  } catch (e) {
    captureError(e, { where: 'clients.loadClients', onLine: onLine() });
    return readLocal();
  }
}

/** Upsert a single client (within the current studio). */
export async function saveClient(client) {
  const local = readLocal();
  writeLocal(local.some((c) => c.id === client.id)
    ? local.map((c) => (c.id === client.id ? client : c))
    : [...local, client]);

  if (!isSupabaseConfigured() || !supabase) return;
  const sid = await currentStudioId();
  if (!sid || !isCloudStudioId(sid)) return; // 58E-B: non-uuid (dev) ⇒ local-only
  try {
    const { error } = await supabase
      .from('clients')
      .upsert({ id: client.id, studio_id: sid, data: client }, { onConflict: 'id' });
    if (error) throw error;
  } catch (e) { captureError(e, { where: 'clients.saveClient', id: client.id, onLine: onLine() }); }
}

/** Delete a client by id (within the current studio). */
export async function deleteClient(clientId) {
  writeLocal(readLocal().filter((c) => c.id !== clientId));
  if (!isSupabaseConfigured() || !supabase) return;
  const sid = await currentStudioId();
  if (!sid || !isCloudStudioId(sid)) return; // 58E-B: non-uuid (dev) ⇒ local-only
  try {
    const { error } = await supabase
      .from('clients').delete().eq('id', clientId).eq('studio_id', sid);
    if (error) throw error;
  } catch (e) { captureError(e, { where: 'clients.deleteClient', id: clientId, onLine: onLine() }); }
}

/** Import localStorage clients into the current studio (first-time migration). */
export async function migrateLocalToCloud(localClients) {
  if (!isSupabaseConfigured() || !supabase) return { migrated: 0, failed: 0 };
  const sid = await currentStudioId();
  if (!sid || !isCloudStudioId(sid)) return { migrated: 0, failed: 0 }; // 58E-B
  let migrated = 0, failed = 0;
  for (const client of localClients) {
    try {
      const { error } = await supabase
        .from('clients')
        .upsert({ id: client.id, studio_id: sid, data: client }, { onConflict: 'id' });
      if (error) throw error;
      migrated++;
    } catch {
      failed++;
    }
  }
  return { migrated, failed };
}
