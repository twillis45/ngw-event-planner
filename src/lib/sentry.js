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

export function initSentry() {
  if (!SEND) return;
  Sentry.init({
    dsn: DSN,
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
    if (SEND) Sentry.captureException(err instanceof Error ? err : new Error(String(err)), { extra: context });
    if (process.env.NODE_ENV !== 'production') console.warn('[captureError]', context.where || '', err, context);
  } catch (e) { /* never throw from telemetry */ }
}

export { Sentry };
