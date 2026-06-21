// ─── Auth gate — NGW Event Boss ──────────────────────────────────────────────
// Handles session resolution, login screen, and splash.
// Extracted from App.js to a standalone file so App.js can import it without
// circular-dependency issues. ThemeCtx lives in App.js, so this file must NOT
// import it. The login screen is always dark — hardcoded palette below.
import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, authRedirectUrl } from '../lib/supabaseClient';
import { AuthCtx } from '../contexts/AuthContext';
import { carbonBody, carbonPanel, carbonBorder } from '../theme/palette';

// Sprint 61.M — palette aligned to Studio Matte + Event Boss steel-blue.
// Login is the first surface a new user sees; bright SaaS blue + neon teal
// (the prior accent/accent2 values) read as generic SaaS and conflict with
// the locked product voice. Switched to Mid Carbon + steel-blue.
const D = {
  bg:      carbonBody,   // tokenized canvas — follows ACTIVE_MODE
  surface: carbonPanel,  // tokenized card
  border:  carbonBorder, // tokenized hairline
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
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', color: D.text, marginBottom: 6 }}>Sign in</div>
            <div style={{ fontSize: 13, color: D.muted, marginBottom: 18, lineHeight: 1.55 }}>
              Enter your email and we'll send a one-time sign-in link — no password to remember.
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
                placeholder="you@email.com"
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

function ThemeFallbackSplash({ onContinue }) {
  // Sprint 52B — diagnostic + escape hatch. The build marker tells us whether a
  // device loaded the new bundle (if you DON'T see the Continue button, you're
  // on a stale cached bundle). The button is a manual fall-through to login in
  // case session resolution ever stalls.
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: D.bg, color: D.muted, fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif", padding: 20, textAlign: 'center' }}>
      <div>Loading…</div>
      {onContinue && (
        <button onClick={onContinue} style={{ background: 'transparent', color: D.accent, border: `1px solid ${D.border}`, borderRadius: 8, padding: '9px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Taking too long? Continue to sign-in →
        </button>
      )}
      <div style={{ fontSize: 9, color: '#3a424c', letterSpacing: '0.08em' }}>build auth-r2</div>
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

// Dev-only: lets a bypass session carry an admin/support role so the Admin
// console (?admin=1) can be QA'd locally. Honored ONLY when bypass is active, so
// it is dead code in any prod build (prod forces REACT_APP_AUTH_BYPASS=false).
// Set REACT_APP_BYPASS_ROLE=admin|support, or pass ?devrole=admin on the URL.
const _bypassRole = (() => {
  if (!BYPASS_ACTIVE) return undefined;
  let role = process.env.REACT_APP_BYPASS_ROLE;
  try {
    const p = new URLSearchParams(window.location.search).get('devrole');
    if (p) role = p;
  } catch (e) { /* no window/search — ignore */ }
  return role === 'admin' || role === 'support' ? role : undefined;
})();

const BYPASS_USER = {
  id: 'dev-bypass-user',
  email: 'dev-bypass@local',
  user_metadata: { name: 'Dev Bypass' },
  app_metadata: { provider: 'dev-bypass', ...(_bypassRole ? { role: _bypassRole } : {}) },
};
const BYPASS_SESSION = {
  user: BYPASS_USER,
  access_token: 'dev-bypass-token',
  // Far-future expiry so nothing tries to refresh.
  expires_at: 9999999999,
};

// Sprint 60.Y — shown when a dev pauses bypass via Sign out. Honest signed-out
// state with a one-click path back into the dev session (bypass is env-driven,
// so there's no real session to clear — we pause it for the tab instead).
function BypassSignedOut({ onResume }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e1116', color: '#cdd6e0', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <div style={{ maxWidth: 360, textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5b6b7d', marginBottom: 10 }}>Dev bypass</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Signed out</div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: '#8a99a8', marginBottom: 20 }}>
          You signed out of the dev-bypass session. Real auth isn't used while <code style={{ color: '#cdd6e0' }}>REACT_APP_AUTH_BYPASS=true</code>. Resume the dev session, or open a fresh tab.
        </div>
        <button onClick={onResume} style={{ background: '#2f6df0', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Resume dev session
        </button>
      </div>
    </div>
  );
}

function BypassBadge() {
  // Sprint 60.M Phase 2b: collapse to a tiny dev-only dot on mobile so the
  // pill never dominates the product UI. Full pill still shows on tablet/
  // desktop where pixel budget allows. Honesty preserved — it never
  // disappears; the dot still signals "bypass is on" to a watching dev.
  // Sprint 61 (board / Rafanelli veto): the badge is DISMISSIBLE for the one
  // real risk it posed — a planner screen-sharing a dev/demo build with a
  // client. Click hides it for the session (sessionStorage); a fresh tab or
  // re-entry restores it so the dev signal is never permanently lost. (Prod
  // strips REACT_APP_AUTH_BYPASS, so this never renders on a client-facing
  // production view in the first place.)
  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem('ngw-bypass-badge-hidden') === '1'; } catch (e) { return false; }
  });
  const dismiss = () => {
    try { sessionStorage.setItem('ngw-bypass-badge-hidden', '1'); } catch (e) { /* ignore */ }
    setHidden(true);
  };
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

  if (hidden) return null;

  if (isMobile) {
    return (
      <div
        role="status"
        aria-label="Auth bypass active — development only. Tap to hide."
        title="Auth bypass · dev only — tap to hide"
        onClick={dismiss}
        style={{
          position: 'fixed',
          bottom: 6, right: 6,
          zIndex: 100000,
          width: 8, height: 8,
          borderRadius: '50%',
          // Board audit (2026-06-12): dev-bypass is a DEV STATE, not a blocking
          // user error — recolored off red so it never competes with the
          // doctrine's reserved alarm color. Steel = structural/neutral.
          background: '#2e3a44',
          border: '1px solid #849eb8',
          cursor: 'pointer',
          opacity: 0.7,
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}
      />
    );
  }
  return (
    <div
      role="status"
      aria-label="Auth bypass active — development only. Click to hide."
      title="Auth bypass · dev only — click to hide for this session"
      onClick={dismiss}
      style={{
        position: 'fixed',
        bottom: 8, right: 8,
        zIndex: 100000,
        // Board audit (2026-06-12): steel, not red — dev-bypass is a neutral dev
        // state, not a blocking alarm. Red stays reserved for genuine blocks.
        background: '#2a3340',
        color: '#cdd6e0',
        border: '1px solid #5a6b7d',
        borderRadius: 6,
        padding: '3px 9px',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        fontFamily: "'Inter', system-ui, sans-serif",
        cursor: 'pointer',
        opacity: 0.92,
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}
    >
      Auth bypass · dev only <span style={{ opacity: 0.6, fontWeight: 600 }}>✕</span>
    </div>
  );
}

export default function AuthGate({ children }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState(null);
  const [authErr, setAuthErr] = useState(null); // Sprint 52B — surfaced via ?authdebug=1
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
      .catch((e) => { try { setAuthErr(e && (e.message || String(e))); } catch (x) { /* ignore */ } })
      .finally(() => { clearTimeout(timer); finish(); });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      if (mounted) setSession(sess);
    });
    return () => { mounted = false; clearTimeout(timer); sub?.subscription?.unsubscribe?.(); };
  }, [configured]);

  // Sprint 60.Y — dev-bypass sign-out. Bypass is env-driven and has no real
  // session to clear, so the old signOut was a no-op. We now pause bypass for
  // the tab (sessionStorage) so "Sign out" actually drops you to a signed-out
  // screen; "Resume dev session" or a fresh tab restores it.
  const [bypassPaused, setBypassPaused] = useState(() => {
    try { return sessionStorage.getItem('ngw-bypass-paused') === '1'; } catch (e) { return false; }
  });
  const bypassActive = BYPASS_ACTIVE && !bypassPaused;
  const value = {
    configured,
    bypass:  bypassActive,
    ready,
    session: bypassActive ? BYPASS_SESSION : session,
    user:    bypassActive ? BYPASS_USER : (session?.user || null),
    signOut: () => {
      if (BYPASS_ACTIVE) {
        try { sessionStorage.setItem('ngw-bypass-paused', '1'); } catch (e) { /* ignore */ }
        setBypassPaused(true);
        return Promise.resolve({ error: null });
      }
      return supabase?.auth?.signOut();
    },
  };

  // Bypass wins — never show splash or login when active.
  if (BYPASS_ACTIVE) {
    if (bypassPaused) {
      return (
        <AuthCtx.Provider value={value}>
          <BypassSignedOut onResume={() => {
            try { sessionStorage.removeItem('ngw-bypass-paused'); } catch (e) { /* ignore */ }
            setBypassPaused(false);
          }} />
        </AuthCtx.Provider>
      );
    }
    return (
      <AuthCtx.Provider value={value}>
        <BypassBadge />
        {children}
      </AuthCtx.Provider>
    );
  }
  // Sprint 52B — ?authdebug=1 overlay to diagnose a login bounce on a device:
  // shows whether a session exists, whether the URL still has the token, any
  // getSession error, and whether localStorage holds the Supabase auth keys.
  const authDebug = (() => { try { return new URLSearchParams(window.location.search).get('authdebug') === '1'; } catch (e) { return false; } })();
  const debugPanel = authDebug ? (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 2147483647, background: '#000', color: '#5fd35f', font: '11px/1.5 monospace', padding: '8px 12px', borderTop: '1px solid #333', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '45vh', overflow: 'auto' }}>
      {`configured=${configured}\nready=${ready}\nhasSession=${!!session}\nurlHash=${(() => { try { return (window.location.hash || '').slice(0, 50); } catch (e) { return '?'; } })()}\ngetSessionErr=${authErr || 'none'}\nlocalStorage=${(() => { try { const k = Object.keys(window.localStorage); return 'OK -> ' + (k.filter(x => /sb-|supabase|auth/i.test(x)).join(',') || '(no auth keys)'); } catch (e) { return 'BLOCKED: ' + e.message; } })()}`}
    </div>
  ) : null;
  let content;
  if (configured && !ready)        content = <ThemeFallbackSplash onContinue={() => setReady(true)} />;
  else if (configured && !session) content = <LoginScreen />;
  else                             content = <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
  return <>{content}{debugPanel}</>;
}
