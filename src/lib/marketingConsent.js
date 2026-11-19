// ─── OFFERS AND NEWS: ONLY WITH A TICK AT SIGN-UP (owner, 11/19/2026) ────────
//
// Ruling (plan G87): "Plan reminders go to all with one-click unsubscribe;
// promotions only to people who tick an unchecked opt-in at sign-up." The
// sign-in form carries one UNTICKED box with these words. When it is ticked,
// the sign-in request asks Supabase to store the choice, the time and the
// exact words on the new account (`options.data`, which Supabase keeps only
// when it creates the account). The server's gate (backend app/host_email.py)
// sends a promotion only to an account carrying it. The attorney confirms the
// line; change the words and the version together. PURE.
export const MARKETING_OPT_IN_LABEL = 'Email me offers and news from No Guesswork. Optional; stop anytime.';
export const MARKETING_OPT_IN_VERSION = 'v1-2026-11-19';

/** The `options.data` for a sign-in email: the opt-in only when ticked. */
export function signUpData(ticked, now = new Date()) {
  if (ticked !== true) return {};
  return { marketing_opt_in: { at: now.toISOString(), text: MARKETING_OPT_IN_LABEL, version: MARKETING_OPT_IN_VERSION } };
}
