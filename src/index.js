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

// Sprint 52B — root error boundary. Without this, any crash during the very
// first render (e.g. Supabase/localStorage init throwing in iOS Safari Private
// Mode) showed a pure blank screen with no way to diagnose. Now it shows the
// error + a Reload button, so the app never dead-ends on a white screen and we
// can see exactly what failed on a given device.
class RootErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { try { console.error('Root crash:', err, info); } catch (e) { /* ignore */ } }
  render() {
    if (!this.state.err) return this.props.children;
    const msg = (this.state.err && (this.state.err.message || String(this.state.err))) || 'Unknown error';
    return (
      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0d0e12', color: '#e8edf2', minHeight: '100vh', padding: '32px 20px', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6F8794', marginBottom: 8 }}>NGW Event Boss</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Something went wrong loading the app</div>
          <div style={{ fontSize: 14, color: '#849eb8', lineHeight: 1.6, marginBottom: 16 }}>Please reload. If it keeps happening, this detail helps us fix it:</div>
          <pre style={{ fontSize: 12, color: '#e0a93f', background: '#181b20', border: '1px solid #2e353d', borderRadius: 8, padding: '12px 14px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflow: 'auto' }}>{msg}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '12px 20px', borderRadius: 10, border: 'none', background: '#4E6877', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Reload</button>
        </div>
      </div>
    );
  }
}

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RootErrorBoundary>
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
    </RootErrorBoundary>
  </React.StrictMode>
);
