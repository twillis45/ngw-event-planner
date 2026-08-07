import { Component } from 'react';
import { captureError } from '@app/lib/sentry';

// The whole app had zero error boundaries: any uncaught render error anywhere
// in the tree unmounts everything and shows nothing — "the app disappears"
// with no recovery path and (depending on how/when the console was inspected)
// no visible explanation. This is the single top-level catch, so a crash
// becomes a recoverable screen instead of a blank one.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] caught:', error, info.componentStack);
    // A caught render crash is the single most useful thing to report: the host
    // is looking at the fallback right now. Until 2026-08-07 this was console
    // only, so nobody ever learned it happened. captureError never throws.
    captureError(error, { where: 'ErrorBoundary', componentStack: info && info.componentStack });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24,
          textAlign: 'center', background: '#0d1014', color: '#eef0f4',
          fontFamily: '-apple-system, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
        >
          <div style={{ fontSize: 17, fontWeight: 700 }}>Something went wrong.</div>
          <div style={{ fontSize: 14, color: '#9aa7b2', maxWidth: 320 }}>
            The screen hit an error and couldn’t keep going. Reloading picks up where your data was last saved.
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 4, padding: '10px 20px', borderRadius: 11, border: 'none',
              background: '#4E6877', color: '#eef0f4', fontWeight: 700, fontSize: 14.5, cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
