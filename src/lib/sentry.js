// ─── Sentry error monitoring ──────────────────────────────────────────────────
// No-op unless REACT_APP_SENTRY_DSN is set, so the public demo and local dev stay
// clean. A Sentry DSN is non-secret by design (safe to embed in the bundle).
import * as Sentry from '@sentry/react';

const DSN = process.env.REACT_APP_SENTRY_DSN;

export const isSentryConfigured = () => Boolean(DSN);

export function initSentry() {
  if (!DSN) return;
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

export { Sentry };
