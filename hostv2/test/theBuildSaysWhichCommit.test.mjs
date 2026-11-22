// ─── THE BUILD SAYS WHICH COMMIT IT IS (owner, 11/21/2026) ──────────────────
//
// "Why do we not track which code version is loaded, only health?" Pages
// rebuilds on every merge, and nothing in the page said which commit it was.
// The build now stamps itself three ways from ONE value: the workflow's
// RELEASE_SHA (the commit Checks passed), baked by vite.config.js `define`:
//   · <meta name="ngw-build" content="<sha> <iso>"> in index.html
//   · window.__BUILD__ = { commit, builtAt }
//   · a quiet "Version abc1234 · Nov 21, 5:02 PM" line in You & settings
// A build without the env says "dev", never a made-up SHA.
import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import viteConfig from '../vite.config.js';
import BuildLine, { buildLabel } from '../src/BuildLine.jsx';

const SHA = '0bc6e20f9a1b2c3d4e5f60718293a4b5c6d7e8f9';
const saved = process.env.RELEASE_SHA;
afterEach(() => {
  if (saved === undefined) delete process.env.RELEASE_SHA; else process.env.RELEASE_SHA = saved;
});

const configFor = (sha, command = 'build') => {
  if (sha === undefined) delete process.env.RELEASE_SHA; else process.env.RELEASE_SHA = sha;
  return viteConfig({ command, mode: 'production' });
};
const defined = (cfg) => JSON.parse(cfg.define.__NGW_BUILD__);
const transformHtml = (cfg, html) => {
  const p = cfg.plugins.flat().find((x) => x && x.name === 'ngw-build-stamp');
  return p.transformIndexHtml.handler(html);
};

describe('vite config defines the build vars', () => {
  it('bakes the workflow commit and a UTC build time', () => {
    const b = defined(configFor(SHA));
    expect(b.commit).toBe(SHA);
    expect(b.builtAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/);
  });

  it('says dev, with no time, when the env is missing', () => {
    expect(defined(configFor(undefined))).toEqual({ commit: 'dev', builtAt: null });
    expect(defined(configFor(''))).toEqual({ commit: 'dev', builtAt: null });
  });

  it('the release telemetry reads the same commit', () => {
    const env = JSON.parse(configFor(SHA).define['process.env']);
    expect(env.REACT_APP_RELEASE_SHA).toBe(SHA);
  });

  it('writes the ngw-build meta tag into index.html', () => {
    const cfg = configFor(SHA);
    const b = defined(cfg);
    const out = transformHtml(cfg, '<html><head><title>x</title></head><body></body></html>');
    expect(out).toContain(`<meta name="ngw-build" content="${SHA} ${b.builtAt}" />`);
    expect(transformHtml(configFor(undefined), '<head></head>')).toContain('<meta name="ngw-build" content="dev" />');
  });
});

describe('the settings line renders the commit', () => {
  it('shows the short commit and when it was built', () => {
    const html = renderToStaticMarkup(createElement(BuildLine, { build: { commit: SHA, builtAt: '2026-11-21T22:02:00Z' } }));
    expect(html).toContain('data-build-line');
    expect(html).toContain('Version 0bc6e20');
    expect(html).not.toContain(SHA);
    expect(buildLabel({ commit: SHA, builtAt: '2026-11-21T22:02:00Z' })).toMatch(/^Version 0bc6e20 · Nov 2[12], \d{1,2}:02 [AP]M$/);
  });

  it('shows dev for a local or e2e build', () => {
    expect(buildLabel({ commit: 'dev', builtAt: null })).toBe('Version dev');
    expect(renderToStaticMarkup(createElement(BuildLine, { build: { commit: 'dev', builtAt: null } }))).toContain('Version dev');
  });
});
