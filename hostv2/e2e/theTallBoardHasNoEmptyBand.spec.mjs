// ─── THE TALL BOARD HAS NO EMPTY BAND (owner, via the coordinator, 11/23/2026) ─
// The owner flagged the live 1024x1366 (build 944579f0): a large empty band
// between the town card's input and "Where you stand", and another above the
// question, so the rest of the plan sat off the first screen. Ruling 9 (the
// question under the ribbon, no vertical centering, no empty bands; one
// column: question, Where you stand, "The rest of your plan", the rest) now
// holds on EVERY tall portrait tablet, 768-1023 included; only the rail
// (ruling 8) is limited to 1024 and up.
//
// The section gap is --sp-7, 32px: the top of the ratified spacing ladder
// (styles.css :root, 4-32px) and the gap the tall board already puts between
// its own below-fold sections (.ef-watch, margin-top 32px). One pixel of
// rounding is allowed.
//
// Runs on every project. On a tall portrait tablet (tablet 768x1024,
// tablet-tall 1024x1366) it measures the board; everywhere else it checks the
// tall layout is not in force, so no project passes by not looking.
import { test, expect } from '@playwright/test';
import { settled } from './fixtures.mjs';

const SECTION_GAP = 32;   // --sp-7
const TEXT = 'Thanksgiving dinner for 14 at my house on Thursday 11/26 at 3pm, budget $400';

const created = async (page) => {
  await page.clock.setFixedTime(new Date('2026-11-23T12:00:00'));
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await expect(page.getByText(/what are we planning/i)).toBeVisible({ timeout: 20_000 });
  await page.getByPlaceholder(/crab feast/i).first().fill(TEXT);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  const open = page.getByRole('button', { name: /^Open (your|my) plan/ });
  await expect(open).toBeVisible({ timeout: 25_000 });
  await open.click();
  await settled(page);
  await expect(page.locator('h2.ask').first()).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(700);
};

const tallViewport = (vp) => !!vp && vp.height > vp.width && vp.width >= 640 && vp.width < 1280;

test('a tall portrait tablet: one section gap from the hero to Where you stand, and Where you stand and the handle on the first screen', async ({ page }, info) => {
  await created(page);
  const vp = page.viewportSize();
  const tall = await page.locator('.stagewrap[data-tall="1"]').count();
  if (!tallViewport(vp)) {
    // The control: this geometry is not a tall portrait tablet, so the tall
    // board (and its first-screen rule) must not be in force here.
    expect(tall, `${info.project.name}: not a tall portrait tablet`).toBe(0);
    return;
  }
  expect(tall, `${info.project.name}: the tall board`).toBe(1);
  const m = await page.evaluate(() => {
    const esc = document.querySelector('.escreen.on');
    const ec = esc.querySelector(':scope > .ecenter');
    const heroLast = Math.max(...[...ec.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.getBoundingClientRect().bottom));
    const stand = esc.querySelector('.bento').getBoundingClientRect();
    const fold = esc.querySelector('.efold').getBoundingClientRect();
    const rib = document.querySelector('[data-tt-ribbon]').getBoundingClientRect();
    const ask = document.querySelector('h2.ask').getBoundingClientRect();
    const app = document.querySelector('.app').getBoundingClientRect();
    const bar = document.querySelector('[data-tt-bar]');
    return { heroLast, standTop: stand.top, standBottom: stand.bottom, foldBottom: fold.bottom, ribBottom: rib.bottom, askTop: ask.top,
      screenBottom: Math.min(app.bottom, bar ? bar.getBoundingClientRect().top : innerHeight) };
  });
  const gap = Math.round(m.standTop - m.heroLast);
  expect(gap, `hero card -> Where you stand: ${gap}px`).toBeGreaterThanOrEqual(0);
  expect(gap, `hero card -> Where you stand: ${gap}px, a section gap is ${SECTION_GAP}px`).toBeLessThanOrEqual(SECTION_GAP + 1);
  const above = Math.round(m.askTop - m.ribBottom);
  expect(above, `ribbon -> question: ${above}px (no empty band above the question)`).toBeLessThanOrEqual(64);
  expect(m.standBottom, 'Where you stand is on the first screen').toBeLessThanOrEqual(m.screenBottom);
  expect(m.foldBottom, '"The rest of your plan" is on the first screen').toBeLessThanOrEqual(m.screenBottom);
});

// ── NO NOW, NO "NEEDS YOU NOW", NO FILL ON THE BAR (owner rulings 4 and 10,
// every surface, 11/23/2026) ─────────────────────────────────────────────────
// The 768-1023 tall mode kept the NOW tag, "dated work needs you now" and a
// filled bar after the 13" lost them; the rulings hold on every tall iPad.
// The current part's name is bold instead. The bar and every control in it are
// transparent or the page color; the scroller ends at the bar's top edge.
test('a tall portrait tablet: no NOW tag, no "needs you now", the current part bold, and no fill on the bar', async ({ page }, info) => {
  await created(page);
  const vp = page.viewportSize();
  if (!tallViewport(vp)) {
    expect(await page.locator('.stagewrap[data-tall="1"]').count(), `${info.project.name}: not a tall portrait tablet`).toBe(0);
    return;
  }
  const m = await page.evaluate(() => {
    const visibleText = [...document.querySelectorAll('.app *')].filter((e) => e.children.length === 0 && e.getBoundingClientRect().height > 0 && !e.closest('[inert]')).map((e) => e.textContent).join(' ');
    const parts = [...document.querySelectorAll('[data-tt-ribbon] [data-part]')].map((p) => ({ state: p.dataset.state, w: Number(getComputedStyle(p.querySelector('.tt-pl')).fontWeight) }));
    const page = getComputedStyle(document.querySelector('.stagewrap')).backgroundColor;
    const bar = document.querySelector('[data-tt-bar]');
    const fills = [];
    if (bar) for (const e of [bar, ...bar.querySelectorAll('*')]) {
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const cs = getComputedStyle(e);
      if ((cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== page) || cs.backgroundImage !== 'none') fills.push(`${e.tagName}.${String(e.className)} ${cs.backgroundColor}`);
    }
    const app = document.querySelector('.app').getBoundingClientRect();
    return { now: /\bNOW\b/.test(visibleText) || !!document.querySelector('.tt-now'), needsNow: /needs you now/i.test(visibleText), parts, fills,
      bar: !!bar, appBottom: app.bottom, barTop: bar ? bar.getBoundingClientRect().top : null };
  });
  expect(m.now, 'no NOW tag').toBe(false);
  expect(m.needsNow, 'no "dated work needs you now"').toBe(false);
  const cur = m.parts.filter((p) => p.state === 'now');
  expect(cur, 'premise: the ribbon marks the current part').toHaveLength(1);
  expect(cur[0].w, 'the current part is bold').toBeGreaterThanOrEqual(700);
  for (const p of m.parts.filter((x) => x.state !== 'now')) expect(p.w).toBeLessThan(700);
  if (m.bar) {
    expect(m.fills, 'no fill on the bar or its controls').toEqual([]);
    expect(m.appBottom, 'the content stops above the bar').toBeLessThanOrEqual(m.barTop + 0.5);
  }
});
