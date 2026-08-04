import { createRoot } from 'react-dom/client';
import ErrorBoundary from './ErrorBoundary.jsx';
import { applyStudioMatte } from './theme.js';
import { legacyVendorBriefUrl } from '@app/lib/vendorBriefPublicUrl';
import './styles.css';

// ?vendor=TOKEN is a PUBLIC vendor brief — VB2 short code or legacy base64
// snapshot, both served by the ONE existing brief page in the original app,
// one directory up from this bundle on the Pages site. V2 renders no brief
// surface of its own: a vendor's link must never answer with a host shell.
// (lib/vendorBriefPublicUrl returns null on dev roots, where the parent path
// isn't the legacy app — there the shell renders exactly as before.)
const briefUrl = legacyVendorBriefUrl(window.location.href);
if (briefUrl) window.location.replace(briefUrl);

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
  load.then(mount).catch(() => {
    // A chunk that fails to load must say so, not hang on a blank frame.
    mount(<div style={{ padding: 24, fontFamily: 'system-ui', color: '#9aa7b2' }}>Couldn’t load — please refresh.</div>);
  });
}
