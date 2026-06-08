// ─── Auth gate — NGW Event Boss ──────────────────────────────────────────────
// Handles session resolution, login screen, and splash.
// Extracted from App.js to a standalone file so App.js can import it without
// circular-dependency issues. ThemeCtx lives in App.js, so this file must NOT
// import it. The login screen is always dark — hardcoded palette below.
import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, authRedirectUrl } from '../lib/supabaseClient';
import { AuthCtx } from '../contexts/AuthContext';

// Sprint 61.M — palette aligned to Studio Matte + Event Boss steel-blue.
// Login is the first surface a new user sees; bright SaaS blue + neon teal
// (the prior accent/accent2 values) read as generic SaaS and conflict with
// the locked product voice. Switched to Mid Carbon + steel-blue.
const D = {
  bg:      '#111519', // Mid Carbon page
  surface: '#1C2227', // Lifted Carbon card
  border:  '#2E353D',
  accent:  '#4E6877', // Steel blue (was #4a90d9 SaaS blue)
  accent2: '#4FAE7A', // Sage green (was banned #14b8a6 neon teal)
  text:    '#eef0f4',
  muted:   '#9098b0',
  danger:  '#E84036', // Fire red (was #e63946 stop-sign red)
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
    // Sprint 61.M — steel-blue gradient on primary matches every other
    // primary CTA across the app. Inset highlight + shadow for the same
    // brushed-metal feel as App.js s.btn('primary').
    background: v === 'primary'
        ? 'linear-gradient(180deg, #4E6877 0%, #3F5B6A 100%)'
      : v === 'ghost'   ? 'transparent'
      : D.border,
    color: v === 'primary' ? '#fff'
      : v === 'ghost'   ? D.muted
      : D.text,
    boxShadow: v === 'primary'
      ? 'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.30), 0 1px 2px rgba(0,0,0,0.30)'
      : 'none',
    textShadow: v === 'primary' ? '0 1px 0 rgba(0,0,0,0.25)' : 'none',
  }),
};

function LoginScreen() {
  const [email,  setEmail]  = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [err,    setErr]    = useState('');

  // Sprint 51: redirect URL now comes from the shared lib/supabaseClient
  // helper so every auth endpoint (LoginScreen here + inviteStudioMember
  // in lib/api/studio.js) resolves identically. Env override:
  // REACT_APP_AUTH_REDIRECT (see .env.local for LAN/tunnel guidance).
  const redirect = authRedirectUrl;
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
        ? "That email isn't on the access list. Ask your admin to add you."
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

// ── Sprint 56b: Dev auth bypass ──────────────────────────────────────────────
// Set `REACT_APP_AUTH_BYPASS=true` in `.env.local` (gitignored) to skip the
// login wall during dev/QA. The bypass:
//   • short-circuits Supabase session resolution
//   • injects a synthetic AuthCtx so downstream code keeps working
//   • renders a visible "AUTH BYPASS · dev only" pill in the top-right so
//     we never accidentally ship a build with it on
//
// Safety notes:
//   • `REACT_APP_*` env vars are baked into the build at compile time.
//     A production build will NOT include this unless someone explicitly
//     sets the flag at production-build time — don't.
//   • localStorage persistence still works in bypass mode (it doesn't
//     depend on auth). Supabase cloud sync will NOT — calls would fail
//     with the synthetic session. That's the intended tradeoff for a
//     local-only dev demo.
//   • Bypass takes precedence over `isSupabaseConfigured()`. Even when
//     Supabase env is set, the bypass flag wins.
const BYPASS_ACTIVE = process.env.REACT_APP_AUTH_BYPASS === 'true';

const BYPASS_USER = {
  id: 'dev-bypass-user',
  email: 'dev-bypass@local',
  user_metadata: { name: 'Dev Bypass' },
  app_metadata: { provider: 'dev-bypass' },
};
const BYPASS_SESSION = {
  user: BYPASS_USER,
  access_token: 'dev-bypass-token',
  // Far-future expiry so nothing tries to refresh.
  expires_at: 9999999999,
};

function BypassBadge() {
  // Sprint 60.M Phase 2b: collapse to a tiny dev-only dot on mobile so the
  // pill never dominates the product UI. Full pill still shows on tablet/
  // desktop where pixel budget allows. Honesty preserved — it never
  // disappears; the dot still signals "bypass is on" to a watching dev.
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = e => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (isMobile) {
    return (
      <div
        role="status"
        aria-label="Auth bypass active — development only"
        title="Auth bypass · dev only"
        style={{
          position: 'fixed',
          top: 6, right: 6,
          zIndex: 100000,
          width: 8, height: 8,
          borderRadius: '50%',
          background: '#7a2a2a',
          border: '1px solid #b06060',
          pointerEvents: 'none',
          opacity: 0.7,
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}
      />
    );
  }
  return (
    <div
      role="status"
      aria-label="Auth bypass active — development only"
      style={{
        position: 'fixed',
        top: 8, right: 8,
        zIndex: 100000,
        background: '#7a2a2a',
        color: '#ffe9d4',
        border: '1px solid #b06060',
        borderRadius: 6,
        padding: '3px 9px',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        fontFamily: "'Inter', system-ui, sans-serif",
        pointerEvents: 'none',
        opacity: 0.92,
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}
    >
      Auth bypass · dev only
    </div>
  );
}

export default function AuthGate({ children }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState(null);
  // Bypass mode is "ready" immediately; same behavior as !configured.
  const [ready,   setReady]   = useState(BYPASS_ACTIVE || !configured);

  useEffect(() => {
    // Skip Supabase entirely in bypass mode — synthetic session is already set
    // via the AuthCtx value below.
    if (BYPASS_ACTIVE) { setReady(true); return; }
    if (!configured || !supabase) { setReady(true); return; }
    let mounted = true;
    // Sprint 52B — never hang on "Loading…". supabase.auth.getSession() can
    // stall indefinitely in some environments (iOS Safari Private Mode blocks
    // the storage / navigator-lock Supabase relies on), and previously nothing
    // ever set `ready`, leaving a permanent Loading screen. A catch + a hard
    // timeout guarantee we always fall through (to the login screen if needed).
    const finish = () => { if (mounted) setReady(true); };
    const timer = setTimeout(finish, 5000);
    supabase.auth.getSession()
      .then(({ data }) => { if (mounted) setSession(data?.session || null); })
      .catch(() => { /* storage/network blocked — proceed to login */ })
      .finally(() => { clearTimeout(timer); finish(); });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      if (mounted) setSession(sess);
    });
    return () => { mounted = false; clearTimeout(timer); sub?.subscription?.unsubscribe?.(); };
  }, [configured]);

  const value = {
    configured,
    bypass:  BYPASS_ACTIVE,
    ready,
    session: BYPASS_ACTIVE ? BYPASS_SESSION : session,
    user:    BYPASS_ACTIVE ? BYPASS_USER : (session?.user || null),
    signOut: () => BYPASS_ACTIVE
      ? Promise.resolve({ error: null })
      : supabase?.auth?.signOut(),
  };

  // Bypass wins — never show splash or login when active.
  if (BYPASS_ACTIVE) {
    return (
      <AuthCtx.Provider value={value}>
        <BypassBadge />
        {children}
      </AuthCtx.Provider>
    );
  }
  if (configured && !ready)    return <ThemeFallbackSplash />;
  if (configured && !session)  return <LoginScreen />;
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
