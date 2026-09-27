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
          {/* ── WHAT HAPPENED, WHAT IS SAFE, WHAT TO DO (host, 2026-09-27) ──
              "Can we reword to something more meaningful to user."

              UX_06's error section lists "Something went wrong" under Bad by
              name — this screen was shipping the app's own worst example. The
              rule is that an error says WHAT HAPPENED and WHAT TO DO, and the
              thing a host actually wants to know at a crash is neither of
              those: it is whether the plan they have been building is gone.
              So that is the first line.

              It is phrased as "everything that finished saving", not "your
              plan is saved", because of the Nielsen H9 correction (2026-08-21)
              that removed "picks up where your data was last saved": if the
              crash rode in ON a failed save, a blanket reassurance is false at
              the exact moment it matters most. The narrower sentence is one a
              crash can actually stand behind.

              And the last clause tells the host what to DO about the gap —
              check that it took — rather than the old "may need re-entering",
              which named a risk and left them holding it. */}
          <div style={{ fontSize: 17, fontWeight: 700 }}>This screen stopped working.</div>
          <div style={{ fontSize: 14, color: '#9aa7b2', maxWidth: 320 }}>
            Everything that finished saving is still there. Reopening picks up from that point — if you were typing something in the last few seconds, check that it took.
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 4, padding: '10px 20px', borderRadius: 11, border: 'none',
              background: '#4E6877', color: '#eef0f4', fontWeight: 700, fontSize: 14.5, cursor: 'pointer',
            }}
          >
            {/* UX_07 / ctaNamesTheAct: "Reload" is the browser's word for
                this, not the host's. The act from her side is getting back
                into her plan, and that is what the button does. */}
            Reopen my plan
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
