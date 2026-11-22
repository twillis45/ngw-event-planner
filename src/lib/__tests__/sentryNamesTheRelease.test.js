// ─── SENTRY NAMES THE RELEASE (owner, 11/22/2026) ────────────────────────────
//
// An error report has to say which build threw it, or a fix can't be checked
// against the reports that came after it. The build already knows its commit:
// hostv2's vite.config.js bakes RELEASE_SHA into window.__BUILD__ (and the
// ngw-build meta tag, and process.env.REACT_APP_RELEASE_SHA). initSentry reads
// that SAME stamp for Sentry's `release`; it never invents a second source.
//
// Pinned: release is the build's full commit; a local "dev" build or an
// "unreported" one sends no release rather than a made-up one; and with no DSN
// nothing is initialized at all.

jest.mock('@sentry/react', () => ({
  init: jest.fn(),
  browserTracingIntegration: jest.fn(() => 'tracing'),
  captureException: jest.fn(),
}));

const SHA = '0bc6e20f9a1b2c3d4e5f60718293a4b5c6d7e8f9';
const savedEnv = { ...process.env };

function load({ dsn, nodeEnv = 'production', releaseSha, build } = {}) {
  process.env = { ...savedEnv };
  if (dsn) process.env.REACT_APP_SENTRY_DSN = dsn; else delete process.env.REACT_APP_SENTRY_DSN;
  process.env.NODE_ENV = nodeEnv;
  if (releaseSha === undefined) delete process.env.REACT_APP_RELEASE_SHA; else process.env.REACT_APP_RELEASE_SHA = releaseSha;
  if (build === undefined) delete window.__BUILD__; else window.__BUILD__ = build;
  let mod; let Sentry;
  jest.isolateModules(() => {
    Sentry = require('@sentry/react');
    mod = require('../sentry');
  });
  Sentry.init.mockClear();
  return { mod, Sentry };
}

afterEach(() => { process.env = { ...savedEnv }; delete window.__BUILD__; });

describe('initSentry reads the release from the build stamp', () => {
  it('passes the commit from window.__BUILD__ as release', () => {
    const { mod, Sentry } = load({ dsn: 'https://k@o0.ingest.sentry.io/1', build: { commit: SHA, builtAt: '2026-11-22T20:00:00Z' } });
    mod.initSentry();
    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.init.mock.calls[0][0].release).toBe(SHA);
  });

  it('falls back to the baked REACT_APP_RELEASE_SHA when no window stamp exists', () => {
    const { mod, Sentry } = load({ dsn: 'https://k@o0.ingest.sentry.io/1', releaseSha: SHA });
    mod.initSentry();
    expect(Sentry.init.mock.calls[0][0].release).toBe(SHA);
  });

  it('sends no release for a dev or unreported build, never a made-up one', () => {
    const a = load({ dsn: 'https://k@o0.ingest.sentry.io/1', build: { commit: 'dev', builtAt: null }, releaseSha: 'unreported' });
    a.mod.initSentry();
    expect(a.Sentry.init.mock.calls[0][0].release).toBeUndefined();
    expect(a.mod.releaseFromBuild()).toBeUndefined();
  });

  it('is a no-op without a DSN', () => {
    const { mod, Sentry } = load({ build: { commit: SHA, builtAt: null } });
    mod.initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('is a no-op outside a production build even with a DSN', () => {
    const { mod, Sentry } = load({ dsn: 'https://k@o0.ingest.sentry.io/1', nodeEnv: 'development', build: { commit: SHA, builtAt: null } });
    mod.initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();
  });
});
