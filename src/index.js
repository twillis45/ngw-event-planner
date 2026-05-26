import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { initSentry } from './lib/sentry';

initSentry(); // no-op unless REACT_APP_SENTRY_DSN is set

// Slice harness — App.js is never touched; additive and fully reversible.
//   ?slice=vendor          → Sprint 10 single-escalation lab (VendorEscalationSlice)
//   ?slice=desktop-density → Sprint 11B multi-escalation orchestration proving ground
// Lazy so each slice + design system only loads when explicitly requested.
const sliceParam = new URLSearchParams(window.location.search).get('slice');
const SliceHarness =
  sliceParam === 'vendor'           ? React.lazy(() => import('./slices/VendorEscalationSlice'))
  : sliceParam === 'desktop-density' ? React.lazy(() => import('./slices/DesktopDensitySlice'))
  : null;

// Sprint 11C observation harness — activate ONLY when URL has observe=1.
// Records clicks + hesitation, copies transcript on Ctrl/Cmd+Shift+L.
// Zero behavior change to the slice; operators don't see it. Lazy so it never
// loads in normal usage.
if (new URLSearchParams(window.location.search).get('observe') === '1') {
  import('./slices/observer').then((m) => m.installObserver()).catch(() => {});
}

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {SliceHarness ? (
      <React.Suspense fallback={null}>
        <SliceHarness />
      </React.Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
