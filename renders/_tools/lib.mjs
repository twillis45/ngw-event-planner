// RENDER TOOL, NOT A TEST (cohesion batches D–G, 11/24/2026).
// Shared helpers: boot the built app (vite preview on PORT), seed state the
// way hostv2/e2e/fixtures.mjs does, walk to a section or stage at any width,
// and measure the floors (44px taps on touch, 11px text, no sideways scroll).
// Nothing here changes the app. Nothing outward is pressed: every non-GET
// request is aborted and share/clipboard/open are stubbed.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
export const { chromium } = require('playwright');

export const PORT = Number(process.env.RENDER_PORT || 7411);
export const BASE = `http://127.0.0.1:${PORT}/ngw-event-planner/hostv2/`;

export const SIZES = {
  390: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  834: { viewport: { width: 834, height: 1194 }, hasTouch: true },
  1024: { viewport: { width: 1024, height: 1366 }, hasTouch: true },
  1194: { viewport: { width: 1194, height: 834 }, hasTouch: true },
  1440: { viewport: { width: 1440, height: 900 } },
};

export const launch = () => chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});

// seed: { eventId } for a built-in sample, or { event } for a made-up own plan.
export async function open(browser, w, seed, { clock, theme } = {}) {
  const s = SIZES[w];
  const ctx = await browser.newContext({ ...s, deviceScaleFactor: 2, baseURL: BASE, colorScheme: theme || 'light' });
  const page = await ctx.newPage();
  if (clock) await page.clock.setFixedTime(new Date(clock));
  await page.addInitScript((sd) => {
    try { navigator.share = async () => {}; } catch {}
    try { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {}, readText: async () => '' } }); } catch {}
    window.open = () => null;
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    if (sd.event) localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([sd.event]));
    localStorage.setItem('ngw-hostv2-last-event', sd.eventId || sd.event.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-theme', sd.theme || 'light');
    for (const [k, v] of Object.entries(sd.extra || {})) localStorage.setItem(k, v);
  }, { ...seed, theme: theme || 'light' });
  await page.route('**/*', (r) => (r.request().method() === 'GET' ? r.fallback() : r.abort()));
  await page.route('https://e2e-mock.invalid/**', (r) => r.fulfill({ status: 404, json: { detail: 'not found' } }));
  await page.goto('?elegant=1');
  await page.waitForFunction(() => {
    const sp = document.querySelector('.splash');
    if (sp) { const cs = getComputedStyle(sp); if (cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01) return false; }
    return (document.querySelector('.app')?.innerText || '').trim().length > 120;
  }, null, { timeout: 30_000 });
  await page.waitForTimeout(1200);
  return { ctx, page };
}

const anyDoor = (page) => page.locator('.srail-row, [data-tt-bar], .ev-eyebrow').first().waitFor({ state: 'attached', timeout: 15_000 });
async function closeSheets(page) {
  if (await page.locator('.sheet').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(350); }
}
async function revealBar(page) {
  if (!(await page.locator('[data-tt-bar].is-hidden').count())) return;
  await page.evaluate(() => { const a = document.querySelector('.app'); if (a) a.scrollTop = Math.max(0, a.scrollTop - 80); });
  await page.waitForTimeout(400);
}

export async function openSection(page, name) {
  await anyDoor(page);
  if (await page.locator('.srail-row').count()) {
    await page.locator('.srail-row', { hasText: name }).first().click();
  } else if (await page.locator('[data-tt-bar]').count()) {
    await closeSheets(page); await revealBar(page);
    await page.locator('[data-tt-bar]').getByRole('button', { name: 'All sections' }).click();
    await page.locator('.sheet').last().locator('[data-door]', { hasText: name }).first().click();
  } else {
    await closeSheets(page);
    await page.locator('.ev-eyebrow').first().click();
    await page.locator('.sheet').last().getByText('Jump to a section', { exact: false }).first().click();
    await page.locator('.sheet').last().getByText(name, { exact: false }).first().click();
  }
  await sheetSettled(page);
  await page.waitForTimeout(600);
}

export async function goToStage(page, label) {
  await anyDoor(page);
  const bar = page.locator('[data-tt-bar]');
  if (await bar.count()) {
    await closeSheets(page); await revealBar(page);
    await bar.getByRole('button', { name: label, exact: true }).click();
  } else if (await page.locator('.srail [data-rail-stage]', { hasText: label }).count()) {
    await closeSheets(page);
    await page.locator('.srail [data-rail-stage]', { hasText: label }).first().click();
  } else {
    if (!(await page.locator('.sheet .navseg-b').count())) { await closeSheets(page); await page.locator('.ev-eyebrow').first().click(); }
    await page.locator('.navseg-b', { hasText: label }).first().click();
  }
  await page.waitForTimeout(1500);
}

export const sheetSettled = (page) => page.waitForFunction(() => {
  const sh = document.querySelector('.sheet'); if (!sh) return false;
  const cs = getComputedStyle(sh);
  return cs.display !== 'none' && parseFloat(cs.opacity) >= 0.99 && (sh.innerText || '').trim().length > 40;
}, null, { timeout: 15_000 });

// The element that scrolls the given content (sheet body or the stage).
export async function scrollerOf(page, sel) {
  return page.evaluate((s) => {
    let el = document.querySelector(s);
    while (el && el !== document.body) {
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2) { el.setAttribute('data-r-scroller', '1'); return true; }
      el = el.parentElement;
    }
    return false;
  }, sel);
}

// Full length capture: grow the window until the scroller clips nothing,
// then screenshot the page. Falls back to a fixed cap so captures stay sane.
export async function fullShot(page, file, { contentSel, cap = 16000, w } = {}) {
  const sel = contentSel || '.sheet';
  await scrollerOf(page, sel);
  const extra = await page.evaluate(() => {
    const sc = document.querySelector('[data-r-scroller]');
    return sc ? sc.scrollHeight - sc.clientHeight : 0;
  });
  const vp = page.viewportSize();
  const h = Math.min(cap, vp.height + extra + 40);
  await page.setViewportSize({ width: vp.width, height: h });
  await page.waitForTimeout(700);
  await page.evaluate(() => { const sc = document.querySelector('[data-r-scroller]'); if (sc) sc.scrollTop = 0; });
  await page.waitForTimeout(300);
  await page.screenshot({ path: file });
  await page.setViewportSize(vp);
  await page.waitForTimeout(300);
}

// Floors, measured in the given root: taps under 44 (touch only), text under
// 11px, sideways scroll. Returns a plain object for the README.
export async function measure(page, rootSel, { touch = true } = {}) {
  return page.evaluate(({ rootSel, touch }) => {
    const root = document.querySelector(rootSel) || document.body;
    const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[inert]'); };
    const smallTaps = [];
    if (touch) {
      for (const el of root.querySelectorAll('button, a[href], input, select, textarea, [role=button], summary, label:has(input[type=checkbox])')) {
        if (!vis(el)) continue;
        // the hit area: the element or its nearest pressable ancestor's box
        let r = el.getBoundingClientRect();
        const p = el.parentElement?.closest('button, a[href], label, [role=button]');
        if (p) { const pr = p.getBoundingClientRect(); r = { width: Math.max(r.width, pr.width), height: Math.max(r.height, pr.height) }; }
        if (el.type === 'hidden') continue;
        if (r.width < 43.5 || r.height < 43.5) smallTaps.push(`${(el.innerText || el.getAttribute('aria-label') || el.placeholder || el.tagName).trim().slice(0, 40)} ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
    }
    const smallText = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const t = walker.currentNode; if (!t.textContent.trim()) continue;
      const el = t.parentElement; if (!vis(el)) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      if (fs < 11) smallText.push(`${t.textContent.trim().slice(0, 30)} ${fs}px`);
    }
    const se = document.scrollingElement;
    const sideways = se.scrollWidth > se.clientWidth + 1 || [...document.querySelectorAll('.app, .sheet, .stagewrap')].some((e) => getComputedStyle(e).overflowX !== 'hidden' && e.scrollWidth > e.clientWidth + 1);
    return { smallTaps: [...new Set(smallTaps)], smallText: [...new Set(smallText)], sideways };
  }, { rootSel, touch });
}

export const outDir = (batch) => {
  const d = path.resolve(new URL('.', import.meta.url).pathname, '..', `cohesion-${batch}`);
  fs.mkdirSync(d, { recursive: true });
  return d;
};
