// ─── THE ACCESSIBILITY FLOOR ────────────────────────────────────────────────
//
// This file pins work that was ALREADY DONE and had nothing protecting it.
//
// I opened the board's #4 expecting to find defects — my own notes carried it as
// "untouched: keyboard path, drawer/modal, contrast". Measured on 2026-08-16, the
// host shell scored: 47 visible interactive elements with ZERO missing accessible
// names, ZERO text below the WCAG AA contrast ratio, sheets carrying
// role="dialog" + aria-modal + aria-labelledby, focus moving into the dialog on
// open, Escape closing it, focus RETURNING to the button that opened it, and
// focus trapped in both directions across 40 Tabs and 6 Shift+Tabs.
//
// That is a better result than most shipped software and it was held up by
// nothing. Every one of those properties is the kind that dies quietly: a new
// icon button with no aria-label, a token nudged a shade lighter, a sheet that
// forgets to restore focus. Nobody notices, because the people who would notice
// are the people already least likely to file a bug.
//
// So this is a FLOOR, not an audit. It asserts the properties that currently
// hold, so the day one of them stops holding is the day a test goes red rather
// than the day a host using VoiceOver gives up.
//
// WHY THESE FIVE. They are the ones that cannot be seen in a screenshot and
// therefore cannot be caught by the visual matrix: a name a screen reader reads,
// a ratio a designer's eye approves at 2.9:1, a focus ring that goes nowhere, a
// dialog a keyboard cannot leave, a dialog a keyboard cannot escape.
import { test, expect } from './fixtures.mjs';

const boot = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-hostv2-last-event', 'test-day-before-vendors');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await page.waitForFunction(() => {
    const s = document.querySelector('.splash');
    if (s && parseFloat(getComputedStyle(s).opacity) > 0.01) return false;
    const a = document.querySelector('.app');
    return !!a && (a.innerText || '').trim().length > 120;
  }, null, { timeout: 20000 });
};

// Runs in the page: WCAG relative luminance and contrast ratio.
const CONTRAST_PROBE = () => {
  const lum = (c) => {
    const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (s) => {
    const m = /rgba?\(([^)]+)\)/.exec(s);
    if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x));
    return { rgb: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 };
  };
  // Walk up for the first OPAQUE background — a translucent layer would give a
  // ratio against a colour nobody actually sees.
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0.9) return c.rgb;
      n = n.parentElement;
    }
    return [20, 21, 24];
  };
  const ratio = (f, b) => {
    const L1 = lum(f); const L2 = lum(b);
    const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
    return (hi + 0.05) / (lo + 0.05);
  };
  const vis = (el) => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05;
  };
  const bad = [];
  for (const el of [...document.querySelectorAll('p,span,div,button,a,h1,h2,h3,strong,em,label')].filter(vis)) {
    // Only elements holding their OWN text — otherwise a container is judged on
    // a descendant's colour and every wrapper reports twice.
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own) continue;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    if (!fg || fg.a < 0.5) continue;
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);   // WCAG "large text"
    const need = large ? 3 : 4.5;
    const cr = ratio(fg.rgb, bgOf(el));
    if (cr < need) bad.push({ text: (el.innerText || '').trim().slice(0, 40), ratio: Math.round(cr * 100) / 100, need, px: Math.round(size) });
  }
  return bad;
};

const NAME_PROBE = () => {
  const vis = (el) => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05;
  };
  const els = [...document.querySelectorAll('button,a[href],input,select,textarea,[role=button]')].filter(vis);
  const unnamed = els.filter((el) => {
    const t = (el.innerText || '').trim();
    return !t && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.getAttribute('title');
  }).map((el) => `${el.tagName}.${(el.className || '').toString().slice(0, 40)}`);
  return { total: els.length, unnamed };
};

test.describe('the accessibility floor', () => {
  test('every visible control has a name a screen reader can read', async ({ page }) => {
    await boot(page);
    const r = await page.evaluate(NAME_PROBE);
    // PREMISE built in: a screen with no controls would pass vacuously.
    expect(r.total).toBeGreaterThan(20);
    expect(r.unnamed).toEqual([]);
  });

  test('no text sits below the WCAG AA contrast ratio', async ({ page }) => {
    await boot(page);
    const bad = await page.evaluate(CONTRAST_PROBE);
    expect(bad).toEqual([]);
  });

  test('the same holds inside an open sheet', async ({ page }) => {
    // Sheets are where new UI actually lands, so a floor that only covered the
    // home screen would rot within a sprint.
    await boot(page);
    await page.locator('.ev-eyebrow').first().click({ timeout: 8000 });
    await expect(page.locator('.sheet').last()).toBeVisible({ timeout: 8000 });
    const names = await page.evaluate(NAME_PROBE);
    expect(names.unnamed).toEqual([]);
    const bad = await page.evaluate(CONTRAST_PROBE);
    expect(bad).toEqual([]);
  });

  test('a sheet announces itself as a dialog, and says what it is', async ({ page }) => {
    await boot(page);
    await page.locator('.ev-eyebrow').first().click({ timeout: 8000 });
    const sheet = page.locator('.sheet').first();
    await expect(sheet).toHaveAttribute('role', 'dialog');
    await expect(sheet).toHaveAttribute('aria-modal', 'true');
    // aria-modal tells assistive tech the background is inert. The focus-trap
    // test below is what makes that claim TRUE rather than a promise.
    await expect(sheet).toHaveAttribute('aria-labelledby', /.+/);
  });

  test('focus enters the dialog, and comes back to where it started', async ({ page }) => {
    // The half everyone forgets is the return. Without it a keyboard user who
    // closes a sheet is dropped at the top of the document and has to walk the
    // whole page again to get back to where they were.
    await boot(page);
    const trigger = page.locator('.ev-eyebrow').first();
    await trigger.click({ timeout: 8000 });
    await expect(page.locator('.sheet').last()).toBeVisible({ timeout: 8000 });
    expect(await page.evaluate(() => {
      const s = document.querySelector('.sheet'); const a = document.activeElement;
      return !!(s && a && s.contains(a));
    })).toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.locator('.sheet')).toHaveCount(0, { timeout: 8000 });
    expect(await page.evaluate(() => document.activeElement && document.activeElement.className || ''))
      .toContain('ev-eyebrow');
  });

  test('a keyboard cannot fall out of an open dialog', async ({ page }) => {
    // What makes aria-modal="true" honest. Without a trap, Tab walks out into
    // background content the dialog has just told assistive tech to ignore —
    // the user is somewhere the screen reader says does not exist.
    await boot(page);
    await page.locator('.ev-eyebrow').first().click({ timeout: 8000 });
    await expect(page.locator('.sheet').last()).toBeVisible({ timeout: 8000 });

    const escaped = [];
    const outside = () => page.evaluate(() => {
      const s = document.querySelector('.sheet'); const a = document.activeElement;
      if (!s || !a) return null;
      if (s.contains(a)) return null;
      return `${a.tagName}|${(a.innerText || '').trim().slice(0, 30)}`;
    });
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      const out = await outside();
      if (out) escaped.push(`fwd ${i}: ${out}`);
    }
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Shift+Tab');
      const out = await outside();
      if (out) escaped.push(`back ${i}: ${out}`);
    }
    expect(escaped).toEqual([]);
  });
});
