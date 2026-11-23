// ─── Sentry error monitoring ──────────────────────────────────────────────────
// No-op unless REACT_APP_SENTRY_DSN is set, so the public demo and local dev stay
// clean. A Sentry DSN is non-secret by design (safe to embed in the bundle).
import * as Sentry from '@sentry/react';

const DSN = process.env.REACT_APP_SENTRY_DSN;

// Dev sessions must never report to Sentry: localhost work (including test
// harnesses driving the preview) otherwise pollutes the project with
// eval/probe noise that reads like product errors. Dev keeps console
// warnings via captureError; only production builds send.
const SEND = Boolean(DSN) && process.env.NODE_ENV === 'production';

export const isSentryConfigured = () => SEND;

// Which build an error came from (owner, 11/22/2026). The SAME stamp the page
// already carries: window.__BUILD__ (hostv2 main.jsx, from vite.config.js's
// RELEASE_SHA), else the REACT_APP_RELEASE_SHA baked from that same value. A
// local "dev" or "unreported" build sends no release, never a guess.
// Pinned by lib/__tests__/sentryNamesTheRelease.test.js.
export function releaseFromBuild() {
  const real = (v) => (typeof v === 'string' && v && v !== 'dev' && v !== 'unreported' ? v : undefined);
  const w = typeof window !== 'undefined' ? window.__BUILD__ : undefined;
  return real(w && w.commit) || real(process.env.REACT_APP_RELEASE_SHA);
}

export function initSentry() {
  if (!SEND) return;
  Sentry.init({
    dsn: DSN,
    release: releaseFromBuild(),
    environment: process.env.NODE_ENV || 'production',
    integrations: [Sentry.browserTracingIntegration()],
    // Keep volume/cost modest; tune in the Sentry dashboard as needed.
    tracesSampleRate: 0.1,
    // Don't send PII (the app handles client names/emails).
    sendDefaultPii: false,
  });
}

// Sprint 60.Y (board: Majors) — explicit capture for otherwise-swallowed catches,
// so support can answer "why didn't it save?". Tags context (where, online state,
// queue depth). No-op (console only) when no DSN. Telemetry must never throw.
export function captureError(err, context = {}) {
  try {
    if (SEND) {
      const { tags, ...extra } = context;
      Sentry.captureException(err instanceof Error ? err : new Error(String(err)), { extra, ...(tags ? { tags } : {}) });
    }
    if (process.env.NODE_ENV !== 'production') console.warn('[captureError]', context.where || '', err, context);
  } catch (e) { /* never throw from telemetry */ }
}

export { Sentry };
