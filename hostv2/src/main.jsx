import { createRoot } from 'react-dom/client';
import HostShellV2 from './HostShellV2.jsx';
import InviteV2 from './InviteV2.jsx';
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

if (!briefUrl) {
  createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
      {rsvpCode ? <InviteV2 code={rsvpCode} /> : <HostShellV2 />}
    </ErrorBoundary>
  );
}
