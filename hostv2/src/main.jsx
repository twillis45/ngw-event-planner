import { createRoot } from 'react-dom/client';
import ErrorBoundary from './ErrorBoundary.jsx';
import { applyStudioMatte } from './theme.js';
import { applyPaletteAB } from './paletteAB.js';
import { initSentry, captureError } from '@app/lib/sentry';
import './styles.css';

// ?vendor=TOKEN is a PUBLIC vendor brief — VB2 short code or legacy base64
// snapshot — and it renders HERE, in its own chunk (VendorBriefV2.jsx), the
// way ?rsvp= renders InviteV2. Until 11/13/2026 this file redirected it one
// directory up to the frozen CRA shell's page (App.js, A1 freeze, scheduled
// for deletion); that page stays in App.js untouched, reachable again only by
// reverting this routing. A vendor's link must never answer with a host shell.
// ── THE OFFLINE SHELL (host ruling 2026-09-27) ─────────────────────────────
// Registered LAST, after the app has mounted, so a worker can never be on the
// critical path of a first paint. Everything about why this exists — and the
// two boards that banned its predecessor — is in src/offline/ and in
// docs/audits/2026-08-16_OFFLINE_SHELL_BOARD.md.
//
// The escape hatch is a URL a host can be read over the phone:
//   <site>/hostv2/?nosw=1   turns it off on that device and keeps it off.
import { registerOfflineShell } from './offline/register';

// A VENDOR IS NEVER GIVEN A WORKER. That was true by redirect (a synchronous
// replace() pre-empted the `load` listener below); now that the brief renders
// in this bundle it is true by this flag, read before the registration at the
// foot of the file. A vendor opens one emailed link once — installing an
// offline shell for an app they are not using is cost with no return.
// test/offlineShell.test.mjs pins it.
const vendorToken = (() => {
  try { const t = new URLSearchParams(window.location.search).get('vendor'); return t && t.trim() ? t : null; } catch { return null; }
})();

// ERROR REPORTING ON THE SHELL THAT ACTUALLY SHIPS (2026-08-07).
// Sentry was wired in src/index.js — the FROZEN CRA host — and never here, so
// every crash in the live hostv2 shell went to the user's console and nowhere
// else. initSentry no-ops unless REACT_APP_SENTRY_DSN is set AND the build is
// production, so local dev and the public demo stay silent.
initSentry();

// Studio Matte doctrine tokens land on :root before first paint.
applyStudioMatte();
// PALETTE A/B REVIEW INSTRUMENT — no-op unless ?palette=warm. Overrides a few
// surface/accent custom properties AFTER the production tokens so the two
// variants can be photographed on identical composition and content. Production
// doctrine (src/theme/palette.js) is untouched. See paletteAB.js.
// Static import, not a top-level await: the build targets chrome87 and TLA is
// not available there. The module is a few hundred bytes and is inert without
// the flag, so there is nothing to defer.
try {
  applyPaletteAB((() => {
    try {
      const q = new URLSearchParams(window.location.search).get('theme');
      if (q === 'light' || q === 'dark') return q;
      return localStorage.getItem('ngw-theme') === 'light' ? 'light' : 'dark';
    } catch (_) { return 'dark'; }
  })());
} catch (_) { /* review-only: never block boot */ }

// Fit the fixed 393×852 phone frame to the window without distorting its shape.
function fitPhone() {
  const fit = Math.min(1, (window.innerHeight - 52) / 852);
  document.documentElement.style.setProperty('--fit', fit.toFixed(4));
}
window.addEventListener('resize', fitPhone);
fitPhone();

// ?rsvp=CODE is the PUBLIC self-RSVP invite (same mechanic as the original
// app) — guests get the invite page, never the host shell.
const rsvpCode = (() => {
  try { return new URLSearchParams(window.location.search).get('rsvp'); } catch { return null; }
})();

// Code-split: load ONLY the surface this URL needs. A guest on ?rsvp=CODE gets
// the invite chunk; the ~8,500-line host shell is never downloaded for them.
// Each branch dynamic-imports its own component, so they land in separate chunks.
{
  const root = createRoot(document.getElementById('root'));
  const mount = (el) => root.render(<ErrorBoundary>{el}</ErrorBoundary>);
  // ?demo=lodging is the REIMAGINED where-everyone-stays cockpit, running beside
  // the live sheet on the same real event out of localStorage. It is a real
  // behavioural change to the surface every destination host uses, so it gets
  // driven and judged here before it replaces anything. Its own chunk: a host
  // who never asks for it never downloads it.
  const demo = (() => {
    try { return new URLSearchParams(window.location.search).get('demo'); } catch { return null; }
  })();
  const load = vendorToken
    ? import('./VendorBriefV2.jsx').then(m => <m.default token={vendorToken} />)
    : rsvpCode
    ? import('./InviteV2.jsx').then(m => <m.default code={rsvpCode} />)
    : demo === 'lodging'
      ? import('./LodgingCockpit.jsx').then(m => <m.default />)
      : import('./HostShellV2.jsx').then(m => <m.default />);
  load.then(mount).catch((err) => {
    // A chunk that fails to load must say so, not hang on a blank frame — and
    // it must be reported, because a host who sees this sees a dead app.
    captureError(err, { where: 'main.chunkLoad', rsvp: Boolean(rsvpCode), vendor: Boolean(vendorToken), demo });
    mount(<div style={{ padding: 24, fontFamily: 'system-ui', color: '#9aa7b2' }}>Couldn’t load — please refresh.</div>);
  });
}

// After mount, and never awaited: a failed or slow registration must not be
// able to delay or break the app the host already has.
if (typeof window !== 'undefined' && !vendorToken) {
  window.addEventListener('load', () => {
    registerOfflineShell(
      new URL('sw.js', document.baseURI).href,
      window.location,
      // A newer shell is installed and waiting for the next load. The shell
      // says so itself rather than us documenting the two-load rule and
      // hoping a host reads it.
      () => window.dispatchEvent(new Event('ngw-shell-update-waiting')),
    ).catch(() => {});
  });
}
