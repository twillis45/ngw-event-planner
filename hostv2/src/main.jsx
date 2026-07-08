import { createRoot } from 'react-dom/client';
import HostShellV2 from './HostShellV2.jsx';
import InviteV2 from './InviteV2.jsx';
import { applyStudioMatte } from './theme.js';
import './styles.css';

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

createRoot(document.getElementById('root')).render(
  rsvpCode ? <InviteV2 code={rsvpCode} /> : <HostShellV2 />
);
