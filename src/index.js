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
