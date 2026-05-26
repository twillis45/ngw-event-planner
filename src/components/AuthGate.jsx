// ─── Auth gate — NGW Event Boss ──────────────────────────────────────────────
// Handles session resolution, login screen, and splash.
// Extracted from App.js to a standalone file so App.js can import it without
// circular-dependency issues. ThemeCtx lives in App.js, so this file must NOT
// import it. The login screen is always dark — hardcoded palette below.
import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { AuthCtx } from '../contexts/AuthContext';

// Hardcoded DARK palette — login/splash appear before the user can change theme.
const D = {
  bg:      '#0f0f11',
  surface: '#18181c',
  border:  '#2a2a32',
  accent:  '#4a90d9',
  accent2: '#14b8a6',
  text:    '#e8e8f0',
  muted:   '#9090a8',
  danger:  '#e63946',
};

// Minimal style helpers scoped to login screen needs.
const ls = {
  card: {
    background: D.surface,
    border: `1px solid ${D.border}`,
    borderRadius: 12,
    padding: '20px 24px',
  },
  input: {
    background: D.bg,
    border: `1px solid ${D.border}`,
    borderRadius: 8,
    color: D.text,
    fontSize: 13,
    padding: '7px 12px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  btn: (v = 'default') => ({
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    fontFamily: "'Inter', system-ui, sans-serif",
    background: v === 'primary' ? D.accent
      : v === 'ghost'   ? 'transparent'
      : D.border,
    color: v === 'primary' ? '#fff'
      : v === 'ghost'   ? D.muted
      : D.text,
  }),
};

function LoginScreen() {
  const [email,  setEmail]  = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [err,    setErr]    = useState('');

  const redirect     = () => window.location.origin + window.location.pathname;
  const googleEnabled = process.env.REACT_APP_ENABLE_GOOGLE_AUTH === 'true';
  // Invite-only is OPT-IN: set REACT_APP_INVITE_ONLY=true to require pre-added
  // users (lock this on before real launch). Default (unset) = open signups, so
  // the magic link auto-creates the user — handy for bootstrapping/testing.
  const inviteOnly = process.env.REACT_APP_INVITE_ONLY === 'true';

  const submit = async (e) => {
    e?.preventDefault?.();
    const addr = email.trim();
    if (!addr || status === 'sending') return;
    setStatus('sending'); setErr('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: addr,
        options: { emailRedirectTo: redirect(), shouldCreateUser: !inviteOnly },
      });
      if (error) throw error;
      setStatus('sent');
    } catch (e2) {
      const msg = (e2?.message || '').toLowerCase();
      const notAllowed =
        msg.includes('signups not allowed') ||
        msg.includes('not found') ||
        msg.includes('not allowed') ||
        e2?.status === 422;
      setStatus('error');
      setErr(notAllowed
        ? "That email isn't on the access list. Ask your admin to add you in Supabase."
        : (e2?.message || 'Could not send the sign-in link.'));
    }
  };

  const google = async () => {
    setErr('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirect() },
      });
      if (error) throw error;
    } catch (e2) {
      setStatus('error'); setErr(e2?.message || 'Could not start Google sign-in.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: D.bg }}>
      <div style={{ ...ls.card, maxWidth: 380, width: '100%', padding: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', color: D.accent, textTransform: 'uppercase', marginBottom: 8 }}>NGW Event Boss</div>

        {status === 'sent' ? (
          <>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', color: D.text, marginBottom: 8 }}>Check your email</div>
            <div style={{ fontSize: 13, color: D.muted, lineHeight: 1.6 }}>
              We sent a sign-in link to <strong style={{ color: D.text }}>{email.trim()}</strong>. Open it on this device to continue.
            </div>
            <button style={{ ...ls.btn('ghost'), marginTop: 18, fontSize: 12 }} onClick={() => setStatus('idle')}>
              Use a different email
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', color: D.text, marginBottom: 6 }}>Planner sign-in</div>
            <div style={{ fontSize: 13, color: D.muted, marginBottom: 18, lineHeight: 1.55 }}>
              Enter the email your admin added — we'll send a one-time sign-in link. No password needed.
            </div>

            {googleEnabled && (
              <>
                <button type="button" onClick={google}
                  style={{ ...ls.btn(), width: '100%', padding: '11px', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
                  <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
                    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
                    <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.02-2.33z"/>
                    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
                  </svg>
                  Continue with Google
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 14px', color: D.muted, fontSize: 11 }}>
                  <span style={{ flex: 1, height: 1, background: D.border }} /> or <span style={{ flex: 1, height: 1, background: D.border }} />
                </div>
              </>
            )}

            <form onSubmit={submit}>
              <input
                type="email" autoFocus required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@studio.com"
                style={{ ...ls.input, width: '100%', fontSize: 14, marginBottom: 12 }}
              />
              <button type="submit" disabled={status === 'sending' || !email.trim()}
                style={{ ...ls.btn('primary'), width: '100%', padding: '11px', fontSize: 14, opacity: status === 'sending' ? 0.6 : 1 }}>
                {status === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
              </button>
            </form>

            {status === 'error' && (
              <div style={{ fontSize: 12, color: D.danger, marginTop: 12 }}>{err}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ThemeFallbackSplash() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: D.bg, color: D.muted, fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif" }}>
      Loading…
    </div>
  );
}

export default function AuthGate({ children }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState(null);
  const [ready,   setReady]   = useState(!configured);

  useEffect(() => {
    if (!configured || !supabase) { setReady(true); return; }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) { setSession(data?.session || null); setReady(true); }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      if (mounted) setSession(sess);
    });
    return () => { mounted = false; sub?.subscription?.unsubscribe?.(); };
  }, [configured]);

  const value = {
    configured,
    ready,
    session,
    user:    session?.user || null,
    signOut: () => supabase?.auth?.signOut(),
  };

  if (configured && !ready)    return <ThemeFallbackSplash />;
  if (configured && !session)  return <LoginScreen />;
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
