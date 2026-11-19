// ─── WHAT THE SIGN-IN FORM DOES WITH THE BOT CHECK (live check, 11/19/2026) ──
//
// The live check found two faults once the Turnstile key went live:
//   1. With no token yet, the form refused to send and said "Try again in a
//      second", but Cloudflare was waiting for a tick on "Verify you are human".
//   2. When Cloudflare FAILED a browser, the form refused forever, although
//      Supabase did not require a token yet: a real person on a privacy
//      browser or a VPN could not sign in at all.
// Now the form asks for the tick when Cloudflare is still deciding, and when
// Cloudflare has failed it sends anyway and lets Supabase decide: before the
// owner switches CAPTCHA on, it goes through; after, Supabase refuses it and
// the form says why, in words a host can act on. PURE.

/** { send, message }: whether to send the sign-in email now. */
export function signInSendDecision({ checkOn, token, failed }) {
  if (!checkOn || token) return { send: true, message: '' };
  if (failed) return { send: true, message: '' };
  return { send: false, message: 'Tick “Verify you are human” above, then tap the button again.' };
}

/** The words for a failed sign-in send. */
export function signInErrorText(e) {
  const m = String((e && e.message) || '');
  if (/captcha/i.test(m)) return 'The bot check couldn’t confirm this browser, so no email was sent. Try once more, or open this page in another browser, or turn off a VPN or blocker for it.';
  return m || 'Couldn’t send the link — try again in a minute.';
}
