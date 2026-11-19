// SignInCheck — Cloudflare Turnstile on the sign-in form (owner, 11/19/2026:
// "Add widget and tell me when live"). Supabase's CAPTCHA protection, once the
// owner switches it on, refuses a sign-in email without a fresh token; this is
// where the token comes from.
//
// OFF UNTIL THE SITE KEY IS SET: with no REACT_APP_TURNSTILE_SITE_KEY baked
// into the build (a GitHub repository variable, read by the Pages deploy),
// nothing renders, no script loads, and sign-in works exactly as before. The
// site key is public by design; the secret key lives only in Supabase.
//
// A token is single-use: the form asks for a new one after every send
// (`resetKey` changes), including "Send a new code".
import { useEffect, useRef } from 'react';

export const TURNSTILE_SITE_KEY = String(process.env.REACT_APP_TURNSTILE_SITE_KEY || '').trim();
export const signInCheckOn = () => !!TURNSTILE_SITE_KEY;

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading = null;
function loadTurnstile() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT; s.async = true; s.defer = true;
      s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile missing')));
      s.onerror = () => { loading = null; reject(new Error('turnstile failed to load')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

export default function SignInCheck({ onToken, resetKey, onError }) {
  const box = useRef(null);
  const widget = useRef(null);
  useEffect(() => {
    if (!signInCheckOn()) return undefined;
    let gone = false;
    onToken('');
    loadTurnstile().then((ts) => {
      if (gone || !box.current) return;
      widget.current = ts.render(box.current, {
        sitekey: TURNSTILE_SITE_KEY,
        appearance: 'interaction-only',      // most people see nothing at all
        callback: (t) => onToken(t || ''),
        'expired-callback': () => onToken(''),
        'error-callback': () => { onToken(''); if (onError) onError(); },
      });
    }).catch(() => { if (!gone && onError) onError(); });
    return () => {
      gone = true;
      try { if (widget.current != null && window.turnstile) window.turnstile.remove(widget.current); } catch { /* gone */ }
      widget.current = null;
    };
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!signInCheckOn()) return null;
  return <div ref={box} data-signin-check style={{ marginTop: 'var(--sp-2)' }} />;
}
