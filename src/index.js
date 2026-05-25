import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { initSentry } from './lib/sentry';

initSentry(); // no-op unless REACT_APP_SENTRY_DSN is set

// Sprint 10 vertical-slice harness: ?slice=vendor renders the operational
// proving-ground in isolation. App.js is never touched; this is additive and
// fully reversible (delete this block to remove). Lazy so the slice + design
// system only load when explicitly requested.
const sliceParam = new URLSearchParams(window.location.search).get('slice');
const SliceHarness = sliceParam === 'vendor'
  ? React.lazy(() => import('./slices/VendorEscalationSlice'))
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
