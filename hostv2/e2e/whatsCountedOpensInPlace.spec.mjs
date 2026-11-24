// ─── WHAT'S COUNTED OPENS IN PLACE (cohesion F3, #13, #38; owner 11/24/2026) ──
//
// UX_11 rule 2 (open in place). Measured on the Wanda sample before the change:
// the door sat at y=140 on the phone and the panel opened at y=1,801 and
// scrolled there, so the door ended at y=−1,473 (834: 194 → 628; 1024: 195 →
// 868; 1194: 154 → 1,286; 1440: 61 → 1,186). At the rail widths nothing on
// screen changed but the caret's ▾. Its pills were 28 px tall (rule 9).
//
// Now the panel opens directly under the line that holds its door: the phone's
// progress line, the tall iPad's ribbon, and at the rail widths the hero's own
// "N of 7 plan parts handled" line (the caret sits in the narrow Where you stand
// card there, owner F3). A slim "What's counted · Close" bar heads it and a
// close row ends it. Nothing scrolls. Every tappable thing in it is 44 px tall.
import { test, expect } from '@playwright/test';
import { settled } from './fixtures.mjs';

const SIZES = [[390, 844, true], [834, 1194, true], [1024, 1366, true], [1194, 834, true], [1440, 900, false]];

const boot = async (browser, [w, h, touch]) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch });
  const page = await ctx.newPage();
  await page.route('https://e2e-mock.invalid/**', (r) => r.fulfill({ status: 200, json: { ok: true } }));
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-theme', 'light');
  });
  await page.goto('./?elegant=1&noanalytics=1&theme=light');
  await settled(page);
  await page.waitForTimeout(900);
  return { ctx, page };
};

const scrollState = (page) => page.evaluate(() => [document.scrollingElement, ...document.querySelectorAll('*')]
  .filter((e) => e && e.scrollTop > 0).map((e) => `${e.className || e.tagName}:${Math.round(e.scrollTop)}`).join(' | '));

const geometry = (page) => page.evaluate(() => {
  const vis = (e) => e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  const door = [...document.querySelectorAll('[aria-controls="whats-counted"]')].find(vis);
  const panel = document.getElementById('whats-counted');
  // The line that holds the door: its own row on the phone and the tall iPad;
  // at the rail widths the hero's progress line, because the door is in the card.
  const anchor = door && (door.closest('.pp-prog, .tt-rib') || document.querySelector('.eprog-labels'));
  const r = (e) => { const b = e.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), height: Math.round(b.height) }; };
  return {
    door: door ? r(door) : null,
    anchor: anchor ? { ...r(anchor), cls: anchor.className } : null,
    panel: panel ? r(panel) : null,
    inert: panel ? panel.hasAttribute('inert') : null,
    nextOfAnchor: anchor && anchor.nextElementSibling ? (anchor.nextElementSibling.id || anchor.nextElementSibling.className) : null,
    vh: innerHeight,
  };
});

for (const vp of SIZES) {
  test(`${vp[0]}x${vp[1]}: What's counted opens directly under its line, nothing scrolls, and it closes from its own bar and its foot`, async ({ browser }) => {
    test.setTimeout(60_000);
    const { ctx, page } = await boot(browser, vp);
    const door = page.locator('[aria-controls="whats-counted"]:visible').first();
    await expect(door).toBeVisible();
    const before = await scrollState(page);
    const g0 = await geometry(page);
    await door.click();
    await page.waitForTimeout(900);
    const g = await geometry(page);
    test.info().annotations.push({ type: 'geometry', description: JSON.stringify({ g0, g }) });
    expect(g.inert, 'the panel opened').toBe(false);
    expect(await scrollState(page), 'nothing scrolled').toBe(before);
    // Where the door is on the line itself (phone, tall iPad) it does not move.
    // At the rail widths the door is in the card beside or below the hero, and
    // the render (proposed__whats-counted-open__1194) lets that card move down:
    // the panel's own bar carries Close there.
    if (/pp-prog|tt-rib/.test(g.anchor.cls)) expect(g.door.top, 'the door stayed where it was').toBe(g0.door.top);
    else expect(g.anchor.top, 'the hero line stayed where it was').toBe(g0.anchor.top);
    // Directly under the anchor line: its next sibling in the page is the panel's home.
    expect(g.panel.top, `the panel starts under ${g.anchor.cls}`).toBeGreaterThanOrEqual(g.anchor.bottom - 1);
    expect(g.panel.top - g.anchor.bottom, 'and directly under it').toBeLessThanOrEqual(24);
    expect(g.panel.top, 'on the first screen').toBeLessThan(g.vh);

    const panel = page.locator('#whats-counted');
    // Every tappable thing in it clears the floor (#38 pills, the bar, the foot).
    const short = await panel.evaluate((p) => [...p.querySelectorAll('button, a, [role="button"]')]
      .filter((e) => e.getClientRects().length)
      .map((e) => ({ t: (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 30), h: e.getBoundingClientRect().height }))
      .filter((x) => x.h < 44 - 0.5));
    expect(short, 'taps under 44 px in What’s counted').toEqual([]);

    // The bar: "What's counted" and Close, on one 44 px row at the top.
    const bar = panel.locator('[data-wc-bar]');
    await expect(bar).toBeVisible();
    await expect(bar).toContainText('What’s counted');
    await expect(bar).toContainText('Close');
    expect(await bar.evaluate((b) => b === b.closest('.slidepanel-inner').firstElementChild)).toBe(true);
    await bar.click();
    await page.waitForTimeout(500);
    expect(await panel.getAttribute('inert'), 'the bar closes it').not.toBeNull();
    await expect(door).toHaveAttribute('aria-expanded', 'false');

    // The foot closes it too.
    await door.click();
    await page.waitForTimeout(700);
    const foot = panel.locator('[data-wc-close]');
    await expect(foot).toHaveText('Close what’s counted ▴');
    expect(await foot.evaluate((b) => b === b.closest('.slidepanel-inner').lastElementChild)).toBe(true);
    await foot.click();
    await page.waitForTimeout(500);
    expect(await panel.getAttribute('inert'), 'the foot closes it').not.toBeNull();
    await ctx.close();
  });
}
