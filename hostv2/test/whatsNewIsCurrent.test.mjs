// ─── WHAT'S NEW, IN PLAIN WORDS, AND NEVER BEHIND (owner, 11/22/2026) ────────
//
// The version line in You & settings opens a short "What's new" list read from
// src/whatsNew.json: a date, a headline with no version number, and one to
// three plain bullets. It is written by hand on purpose. Generating it from PR
// titles or handoff notes was ruled too fragile; those are written for us,
// not for a host.
//
// THE GUARD: the newest entry's date must not be older than the day of the
// last release tag (vYYYY.MM.DD.N, scripts/calver.mjs). If a release went out
// on a day with nothing added here, this fails wherever the v* tags are
// present (a local clone, or the deploy, which fetches them and warns via
// `calver.mjs check-whats-new`). Where no tags were fetched there is nothing
// to compare against, and the rule is checked on the fixtures below instead.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import entries from '../src/whatsNew.json';
import { VersionAndWhatsNew, WhatsNewList } from '../src/WhatsNew.jsx';
import { latestCalverDate, whatsNewIsBehind } from '../../scripts/calver.mjs';

const ISO = /^\d{4}-\d\d-\d\d$/;
// Words written for us, not for a host. None may reach this list.
const JARGON = /#\d|\bP[0-3]\b|\be2e\b|hostv2|\bCRA\b|\bjest\b|vitest|pytest|\bPR\b|audit|lane [A-G]\b|\bspec\b|refactor|token|census|harness|payload|backend|\bAPI\b|commit|v\d{4}\.\d/i;

describe('the list itself', () => {
  it('every entry has a date, a version-free headline and 1 to 3 plain bullets', () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.date).toMatch(ISO);
      expect(typeof e.headline).toBe('string');
      expect(e.headline.length).toBeGreaterThan(3);
      expect(Array.isArray(e.bullets)).toBe(true);
      expect(e.bullets.length).toBeGreaterThanOrEqual(1);
      expect(e.bullets.length).toBeLessThanOrEqual(3);
      for (const t of [e.headline, ...e.bullets]) {
        expect(t, t).not.toMatch(JARGON);
        expect(t, t).not.toMatch(/\bpending\b/i); // UX_06
      }
    }
  });

  it('is newest first', () => {
    const dates = entries.map((e) => e.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});

describe('the guard: never older than the last release', () => {
  it('the rule, on fixtures', () => {
    const list = [{ date: '2026-11-22', through: 'v2026.11.22.2' }, { date: '2026-11-20', through: 'v2026.11.20.1' }];
    expect(whatsNewIsBehind(list, ['v2026.11.21.1', 'v2026.11.22.2'])).toBe(false);
    expect(whatsNewIsBehind(list, ['v2026.11.23.1'])).toBe(true);
    expect(whatsNewIsBehind([], ['v2026.11.23.1'])).toBe(true);
    expect(whatsNewIsBehind(list, [])).toBe(false);
  });

  // PER RELEASE, NOT PER DAY (owner, 11/24/2026: "Is the what's new section
  // being updated on each release"). It wasn't: one 11/24 entry covered .1 and
  // eight more releases went out under it, because a same-day date passed. The
  // newest entry now names the last release it covers (`through`), and a later
  // release tag with no entry is behind.
  it('the rule, per release', () => {
    const tags = ['v2026.11.24.1', 'v2026.11.24.9'];
    expect(whatsNewIsBehind([{ date: '2026-11-24', through: 'v2026.11.24.1' }], tags)).toBe(true);
    expect(whatsNewIsBehind([{ date: '2026-11-24', through: 'v2026.11.24.9' }], tags)).toBe(false);
    expect(whatsNewIsBehind([{ date: '2026-11-24', through: 'v2026.11.24.10' }], tags)).toBe(false);
    expect(whatsNewIsBehind([{ date: '2026-11-25', through: 'v2026.11.25.1' }], tags)).toBe(false);
    // The newest entry must say what it covers; a date alone no longer will do.
    expect(whatsNewIsBehind([{ date: '2026-11-24' }], tags)).toBe(true);
  });

  it('the real list against the real tags', () => {
    let tags = [];
    try { tags = execFileSync('git', ['tag', '-l', 'v*'], { encoding: 'utf8' }).split('\n').filter(Boolean); } catch { tags = []; }
    const last = latestCalverDate(tags);
    expect(whatsNewIsBehind(entries, tags), `newest What's new entry covers ${entries[0].through || 'no release (no `through`)'}; the last release is ${[...tags].sort().pop()} (${last}). Write the entry for what shipped.`).toBe(false);
  });
});

describe('on screen', () => {
  // THE TIME OF THE RELEASE (owner, 11/25/2026: "What's new should carry time
  // of the release"). An entry names the last release it covers (`through`);
  // the build knows each release's time (its tag, or for the release being
  // built, the build itself). Shown in the host's own zone. An entry whose
  // release time isn't known keeps its date alone: never a made-up time.
  it('each entry carries the time of its release, in the host\'s zone', () => {
    const list = [
      { date: '2026-11-24', through: 'v2026.11.24.11', headline: 'See the full invite', bullets: ['One.'] },
      { date: '2026-11-23', headline: 'Older', bullets: ['Two.'] },
    ];
    const html = renderToStaticMarkup(createElement(WhatsNewList, {
      entries: list, releaseTimes: { 'v2026.11.24.11': '2026-11-25T04:44:25Z' }, timeZone: 'America/New_York',
    }));
    expect(html).toContain('Nov 24, 2026 · 11:44 PM EST');
    expect(html).toContain('Nov 23, 2026<');
    expect(html).not.toMatch(/Nov 23, 2026 ·/);
  });

  it('the version line is a closed button until tapped, then the list', () => {
    const closed = renderToStaticMarkup(createElement(VersionAndWhatsNew, { build: { commit: 'abc1234def', builtAt: null, version: '2026.11.22.3' } }));
    expect(closed).toContain('data-build-line');
    expect(closed).toContain('Version 2026.11.22.3 (abc1234)');
    expect(closed).toContain('aria-expanded="false"');
    expect(closed).toContain('What’s new');
    expect(closed).not.toContain('data-whats-new-list');
    const list = renderToStaticMarkup(createElement(WhatsNewList, { entries }));
    expect(list).toContain('data-whats-new-list');
    expect(list).toContain(entries[0].headline.replace(/&/g, '&amp;').replace(/'/g, '&#x27;').replace(/"/g, '&quot;'));
    expect(list).toMatch(/Nov 22, 2026/);
  });
});
