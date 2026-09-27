import { createRoot } from 'react-dom/client';
import ErrorBoundary from './ErrorBoundary.jsx';
import { applyStudioMatte } from './theme.js';
import { legacyVendorBriefUrl } from '@app/lib/vendorBriefPublicUrl';
import { initSentry, captureError } from '@app/lib/sentry';
import './styles.css';

// ?vendor=TOKEN is a PUBLIC vendor brief — VB2 short code or legacy base64
// snapshot, both served by the ONE existing brief page in the original app,
// one directory up from this bundle on the Pages site. V2 renders no brief
// surface of its own: a vendor's link must never answer with a host shell.
// (lib/vendorBriefPublicUrl returns null on dev roots, where the parent path
// isn't the legacy app — there the shell renders exactly as before.)
// ── THE OFFLINE SHELL (host ruling 2026-09-27) ─────────────────────────────
// Registered LAST, after the app has mounted, so a worker can never be on the
// critical path of a first paint. Everything about why this exists — and the
// two boards that banned its predecessor — is in src/offline/ and in
// docs/audits/2026-08-16_OFFLINE_SHELL_BOARD.md.
//
// The escape hatch is a URL a host can be read over the phone:
//   <site>/hostv2/?nosw=1   turns it off on that device and keeps it off.
import { registerOfflineShell } from './offline/register';

// ORDER IS LOAD-BEARING: this redirect must stay ABOVE the service-worker
// registration at the foot of this file. A vendor opening an emailed brief
// link is sent one directory UP, out of this bundle, and must never be given
// a worker on the way past. Measured in the built bundle 2026-09-27: the
// redirect sits at offset 316321 and the registration at 317747, and the
// registration is inside a `load` listener that a synchronous replace()
// pre-empts. Nothing enforces that but this comment and
// offlineRedirectOrder.test.mjs — moving the registration earlier for a
// faster install would break it silently.
const briefUrl = legacyVendorBriefUrl(window.location.href);
if (briefUrl) window.location.replace(briefUrl);

// ERROR REPORTING ON THE SHELL THAT ACTUALLY SHIPS (2026-08-07).
// Sentry was wired in src/index.js — the FROZEN CRA host — and never here, so
// every crash in the live hostv2 shell went to the user's console and nowhere
// else. initSentry no-ops unless REACT_APP_SENTRY_DSN is set AND the build is
// production, so local dev and the public demo stay silent.
initSentry();

// Studio Matte doctrine tokens land on :root before first paint.
applyStudioMatte();

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
if (!briefUrl) {
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
  const load = rsvpCode
    ? import('./InviteV2.jsx').then(m => <m.default code={rsvpCode} />)
    : demo === 'lodging'
      ? import('./LodgingCockpit.jsx').then(m => <m.default />)
      : import('./HostShellV2.jsx').then(m => <m.default />);
  load.then(mount).catch((err) => {
    // A chunk that fails to load must say so, not hang on a blank frame — and
    // it must be reported, because a host who sees this sees a dead app.
    captureError(err, { where: 'main.chunkLoad', rsvp: Boolean(rsvpCode), demo });
    mount(<div style={{ padding: 24, fontFamily: 'system-ui', color: '#9aa7b2' }}>Couldn’t load — please refresh.</div>);
  });
}

// After mount, and never awaited: a failed or slow registration must not be
// able to delay or break the app the host already has.
if (typeof window !== 'undefined') {
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
