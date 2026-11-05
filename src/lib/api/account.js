// ─── Account self-deletion client (backend DELETE /api/account) ──────────────
// Apple 5.1.1(v) and Google Play both require that an app which creates
// accounts lets the person delete theirs from inside the app. The backend route
// (backend/app/routers/account.py) does the deletion atomically and was proven
// on a real local stack 11/5/2026; nothing in the app called it (issue #100,
// D-12 — everyBackendRouteHasACaller was red on it). This is that caller.
//
// The server needs the literal word DELETE, so a mistap can never delete an
// account; the UI asks the host to type it. Only a signed-in Supabase session
// can delete, never the shared dev token: this sends the session alone.
import { supabase, isSupabaseConfigured } from '../supabaseClient';

const BASE = process.env.REACT_APP_API_BASE_URL;

export const isAccountDeletionAvailable = () => Boolean(BASE && isSupabaseConfigured());

export async function deleteAccount(confirmation) {
  if (!isAccountDeletionAvailable() || !supabase) {
    return { ok: false, message: 'Account deletion isn’t available in this version of the app.' };
  }
  let token = null;
  try {
    const { data } = await supabase.auth.getSession();
    token = data && data.session && data.session.access_token;
  } catch { token = null; }
  if (!token) return { ok: false, message: 'Sign in to the account you want to delete.' };

  let res;
  try {
    res = await fetch(`${BASE}/api/account`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ confirmation: String(confirmation || '') }),
    });
  } catch {
    return { ok: false, message: 'No connection — your account was not deleted. Try again when you’re online.' };
  }
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  if (res.ok && body && body.deleted === true) {
    return { ok: true, retained: Array.isArray(body.retained_categories) ? body.retained_categories : [] };
  }
  const detail = body && body.detail;
  const message = (detail && typeof detail === 'object' && detail.message)
    || (typeof detail === 'string' ? detail : null)
    || 'Your account was not deleted. Try again in a minute.';
  return { ok: false, message, code: detail && detail.code };
}
