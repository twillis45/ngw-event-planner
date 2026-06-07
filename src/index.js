import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import AuthGate from './components/AuthGate';
import { initSentry } from './lib/sentry';

initSentry(); // no-op unless REACT_APP_SENTRY_DSN is set

// Slice harness — App.js is never touched; additive and fully reversible.
//   ?slice=vendor          → Sprint 10 single-escalation lab (VendorEscalationSlice)
//   ?slice=desktop-density → Sprint 11B multi-escalation orchestration proving ground
//   ?slice=debrief         → Sprint 12 operational-memory surface (page-11 doctrine)
//   ?slice=event-day       → Sprint 19 event-day graft surface (EventDayMode, no auth)
//   ?slice=orchestration   → Sprint 34 behavioral orchestration engine proving ground
// Lazy so each slice + design system only loads when explicitly requested.
const params = new URLSearchParams(window.location.search);
const sliceParam = params.get('slice');
const observeParam = params.get('observe');

const SliceHarness =
  sliceParam === 'vendor'           ? React.lazy(() => import('./slices/VendorEscalationSlice'))
  : sliceParam === 'desktop-density' ? React.lazy(() => import('./slices/DesktopDensitySlice'))
  : sliceParam === 'debrief'         ? React.lazy(() => import('./slices/DebriefSlice'))
  : sliceParam === 'event-day'       ? React.lazy(() => import('./slices/EventDaySlice'))
  : sliceParam === 'orchestration'   ? React.lazy(() => import('./slices/OrchestrationSlice'))
  : null;

// Admin / Support console — additive, gated by ?admin=1. Wrapped in AuthGate so it
// has the Supabase session; AdminConsole itself enforces app_metadata.role. App.js
// is untouched, mirroring the slice-harness pattern.
const AdminConsole =
  params.get('admin') === '1'
    ? React.lazy(() => import('./admin/AdminConsole'))
    : null;

// Sprint 11C observation harness — activate ONLY when URL has observe=1.
// Records clicks + hesitation, copies transcript on Ctrl/Cmd+Shift+L.
// Zero behavior change to the slice; operators don't see it. Lazy so it never
// loads in normal usage.
if (observeParam === '1') {
  import('./slices/observer').then((m) => m.installObserver()).catch(() => {});
}

// Sprint 45: Alpha tester gate — wraps orchestration slice when ?slice=orchestration&observe=1.
// Registration → consent → session → feedback → export. Never loads otherwise.
const AlphaTesterGate =
  sliceParam === 'orchestration' && observeParam === '1'
    ? React.lazy(() => import('./AlphaTesterGate'))
    : null;

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {AdminConsole ? (
      <React.Suspense fallback={null}>
        <AuthGate>
          <AdminConsole />
        </AuthGate>
      </React.Suspense>
    ) : SliceHarness ? (
      <React.Suspense fallback={null}>
        {AlphaTesterGate ? (
          <AlphaTesterGate>
            <SliceHarness />
          </AlphaTesterGate>
        ) : (
          <SliceHarness />
        )}
      </React.Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
