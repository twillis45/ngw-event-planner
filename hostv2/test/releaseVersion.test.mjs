// ─── EVERY MAIN MERGE IS A NAMED RELEASE (owner, 11/22/2026) ─────────────────
//
// The deploy tags each merge to main vYYYY.MM.DD.N (N = that day's count + 1),
// bakes the version next to the commit, and the You & settings line reads
// "Version 2026.11.22.3 (abc1234)". The naming is a pure function so it can be
// pinned here; scripts/calver.mjs is what the workflow runs.
//
// Also pinned: production builds keep source maps OFF the page unless the
// deploy asked for them (SENTRY_SOURCEMAPS=1), and then they are 'hidden' —
// written for the Sentry upload, never linked from the bundle. The workflow
// deletes them before publishing (src/__tests__/sourceMapsStayOffThePage.test.js).
import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import viteConfig from '../vite.config.js';
import BuildLine, { buildLabel } from '../src/BuildLine.jsx';
import { calverDay, nextCalverTag, releaseVersionFor, latestCalverDate } from '../../scripts/calver.mjs';

const SHA = '0bc6e20f9a1b2c3d4e5f60718293a4b5c6d7e8f9';
// 8:30 PM Eastern on Nov 22 is already Nov 23 in UTC. Releases are named by the
// owner's calendar day (America/New_York), not the runner's.
const EVENING = new Date('2026-11-23T01:30:00Z');

describe('the tag name', () => {
  it('names the day in Eastern time', () => {
    expect(calverDay(EVENING)).toBe('2026.11.22');
    expect(calverDay(new Date('2026-01-05T15:00:00Z'))).toBe('2026.01.05');
  });

  it('the first tag of a day is .1', () => {
    expect(nextCalverTag([], EVENING)).toBe('v2026.11.22.1');
    expect(nextCalverTag(['v2026.11.21.4', 'v0.1.0', 'release-x'], EVENING)).toBe('v2026.11.22.1');
  });

  it('after .1 and .2 the next is .3', () => {
    expect(nextCalverTag(['v2026.11.22.1', 'v2026.11.22.2', 'v2026.11.21.9'], EVENING)).toBe('v2026.11.22.3');
  });

  it('counts numerically, and never reuses a number a deleted tag left behind', () => {
    expect(nextCalverTag(['v2026.11.22.9', 'v2026.11.22.10'], EVENING)).toBe('v2026.11.22.11');
    expect(nextCalverTag(['v2026.11.22.1', 'v2026.11.22.3'], EVENING)).toBe('v2026.11.22.4');
  });

  it('a commit that is already tagged keeps its tag (a re-run or a rollback dispatch)', () => {
    expect(releaseVersionFor({ tagsAtHead: ['v2026.11.20.2'], allTags: ['v2026.11.20.2', 'v2026.11.22.1'], now: EVENING }))
      .toEqual({ tag: 'v2026.11.20.2', version: '2026.11.20.2', isNew: false });
    expect(releaseVersionFor({ tagsAtHead: [], allTags: ['v2026.11.22.1'], now: EVENING }))
      .toEqual({ tag: 'v2026.11.22.2', version: '2026.11.22.2', isNew: true });
  });

  it('reads the latest release day off the tags', () => {
    expect(latestCalverDate(['v2026.11.20.2', 'v2026.11.22.1', 'v2026.11.9.1', 'nope'])).toBe('2026-11-22');
    expect(latestCalverDate([])).toBe(null);
  });
});

describe('the settings line', () => {
  it('reads "Version 2026.11.22.3 (abc1234)" when the build has a version', () => {
    expect(buildLabel({ commit: SHA, builtAt: '2026-11-22T22:02:00Z', version: '2026.11.22.3' })).toBe('Version 2026.11.22.3 (0bc6e20)');
    const html = renderToStaticMarkup(createElement(BuildLine, { build: { commit: SHA, builtAt: null, version: '2026.11.22.3' } }));
    expect(html).toContain('Version 2026.11.22.3 (0bc6e20)');
  });

  it('keeps the commit-and-time line when there is no version', () => {
    expect(buildLabel({ commit: SHA, builtAt: '2026-11-21T22:02:00Z', version: null })).toMatch(/^Version 0bc6e20 · Nov 2[12], /);
    expect(buildLabel({ commit: 'dev', builtAt: null, version: null })).toBe('Version dev');
  });
});

const saved = { sha: process.env.RELEASE_SHA, ver: process.env.RELEASE_VERSION, maps: process.env.SENTRY_SOURCEMAPS };
afterEach(() => {
  for (const [k, v] of [['RELEASE_SHA', saved.sha], ['RELEASE_VERSION', saved.ver], ['SENTRY_SOURCEMAPS', saved.maps]]) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
});
const cfg = (env) => {
  for (const k of ['RELEASE_SHA', 'RELEASE_VERSION', 'SENTRY_SOURCEMAPS']) {
    if (env[k] === undefined) delete process.env[k]; else process.env[k] = env[k];
  }
  return viteConfig({ command: 'build', mode: 'production' });
};

describe('the build bakes the version beside the commit', () => {
  it('bakes RELEASE_VERSION into the build stamp and the meta tag', () => {
    const c = cfg({ RELEASE_SHA: SHA, RELEASE_VERSION: '2026.11.22.3' });
    expect(JSON.parse(c.define.__NGW_BUILD__).version).toBe('2026.11.22.3');
    const stamp = c.plugins.flat().find((p) => p && p.name === 'ngw-build-stamp');
    expect(stamp.transformIndexHtml.handler('<head></head>')).toContain('<meta name="ngw-build-version" content="2026.11.22.3" />');
  });

  it('a build without a version says so with null, never a made-up one', () => {
    expect(JSON.parse(cfg({ RELEASE_SHA: SHA }).define.__NGW_BUILD__).version).toBe(null);
    expect(JSON.parse(cfg({}).define.__NGW_BUILD__)).toEqual({ commit: 'dev', builtAt: null, version: null });
  });
});

describe('source maps stay off the page by default', () => {
  it('no maps unless the deploy asks for them', () => {
    expect(cfg({}).build?.sourcemap ?? false).toBe(false);
  });
  it('hidden maps (no sourceMappingURL) when SENTRY_SOURCEMAPS=1', () => {
    expect(cfg({ SENTRY_SOURCEMAPS: '1' }).build.sourcemap).toBe('hidden');
  });
});
