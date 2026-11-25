// ─── THE NAVIGATION PACKAGE (owner rulings, 11/23/2026) ──────────────────────
// The owner approved rendered mock-ups of the phone and the 12.9"/13" iPad and
// ruled each piece. Every ruling is measured here, never eyeballed:
//
//  PHONE (elegant mode)
//   1  The header is the tall iPad's: the date line, then the title with ▾
//      (it opens the events sheet). No ☰.
//   2  The type line only when it adds (also on the tall iPad).
//   3  Progress on top, under the title: six thin segments and one line,
//      "3 of 6 handled · What’s counted ›". The line or the bars open the
//      existing What's counted panel. The current part's segment is lit.
//      No "NOW", no "this one first".
//   4  A bottom pill: Create · Plan · The Day · After, a divider, then All
//      sections and Search. Every target 44x44 or more. No fill on the pill,
//      the header or the progress. Nothing scrolls under the pill.
//   5  The pill hides on scroll down and returns on scroll up.
//   6  No floating NEXT bar; Plan returns to the question.
//   7  The first screen ends at "The rest of your plan", just above the pill.
//
//  13" iPAD PORTRAIT (layout width >= 1024)
//   8  The landscape rail, always up, on the page color with a hairline right
//      edge, with a "Your event" group (the phases, the current one
//      underlined, not filled or outlined: owner, 11/24/2026). No bottom bar.
//   9  The question sits under the ribbon; one column: question, Where you
//      stand, the rest.
//  10  No NOW tag, no "dated work needs you now"; the current part is bold.
//
//  BOTH: every item in one place; the ☰ menu's items all stay reachable.
//  The city ask, folded: at home with no city the plan asks for the city once.
//
// The plan is the owner's own sentence, typed into creation, with the page
// clock pinned to Monday 11/23/2026 (Thursday 11/26 is three days out).
import { test, expect } from '@playwright/test';
import { settled, sheetSettled } from './fixtures.mjs';
import { previewUrl } from '../deployBase.mjs';

// The sign-in row only exists where sign-in does: the synctest bundle (a fake
// Supabase project, signed out), as theSignInIsOneRow drives it.
const SIGNIN_BASE = previewUrl(Number(process.env.PW_SYNCTEST_PORT || 5244));
const PROJECT = 'https://synctest.supabase.co';

const PHONE = { width: 390, height: 844 };
const TALL13 = { width: 1024, height: 1366 };
const TABLET = { width: 768, height: 1024 };
const TEXT = 'Thanksgiving dinner for 14 at my house on Thursday 11/26 at 3pm, budget $400';

// signIn: undefined = the default bundle (no sign-in, so no row); true = the
// sign-in bundle with the row up; false = the sign-in bundle, row dismissed (✕).
const created = async (browser, vp, { signIn } = {}) => {
  const touch = vp.width < 1100;
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-11-23T12:00:00'));
  if (signIn !== undefined) {
    await page.route(`${PROJECT}/**`, (route) => route.fulfill({ status: 200, contentType: 'application/json',
      body: route.request().url().includes('/auth/v1/') ? '{}' : '[]' }));
  }
  await page.goto((signIn !== undefined ? SIGNIN_BASE : './') + '?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await expect(page.getByText(/what are we planning/i)).toBeVisible({ timeout: 20_000 });
  await page.getByPlaceholder(/crab feast/i).first().fill(TEXT);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  const open = page.getByRole('button', { name: /^Open (your|my) plan/ });
  await expect(open).toBeVisible({ timeout: 25_000 });
  await open.click();
  await settled(page);
  await expect(page.locator('h2.ask').first()).toBeVisible({ timeout: 15_000 });
  if (signIn !== undefined) await expect(page.locator('[data-keep-ask]'), 'premise: the sign-in row is up').toBeVisible({ timeout: 15_000 });
  if (signIn === false) {
    await page.locator('[data-keep-ask] button[aria-label="Dismiss"]').click();
    await expect(page.locator('[data-keep-ask]')).toHaveCount(0);
  }
  await page.waitForTimeout(700);
  return { ctx, page };
};

// A seeded event whose name does not say its type (ruling 2's other half).
const seeded = async (browser, vp, ev) => {
  const touch = vp.width < 1100;
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage();
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('./?elegant=1');
  await settled(page);
  await expect(page.locator('[data-tt-head]')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(500);
  return { ctx, page };
};
// A long plan for the scroll tests at 13" (the Thanksgiving board fits one
// 1366px screen): the Wanda sample, as aTallIPadGetsItsOwnBoard boots it.
const wanda = async (browser, vp) => {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
  });
  await page.goto('./?elegant=1');
  await expect(page.locator('[data-tt-head]')).toBeVisible({ timeout: 20_000 });
  await settled(page); await page.waitForTimeout(700);
  return { ctx, page };
};
const GRANDMA = { id: 'cust-grandma-80', name: 'Grandma’s 80th', type: 'Birthday Party', date: '2027-03-20', startTime: '15:00', startTimeSource: 'host',
  venue: 'Home', venueKind: 'home', venueCity: 'Annapolis', venueState: 'MD', venueAddress: '1 Main St',
  guestMode: 'count', guestCount: 30, guestEstimate: 30, guestCountSource: 'host', budget: [], vendors: [], guests: [], timeline: [] };

// Every element under `sel` (itself included) that paints a fill.
const fills = (page, sel) => page.evaluate((s) => {
  const out = [];
  for (const root of document.querySelectorAll(s)) {
    for (const e of [root, ...root.querySelectorAll('*')]) {
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const cs = getComputedStyle(e);
      const m = /rgba?\(([^)]+)\)/.exec(cs.backgroundColor);
      const alpha = m ? (m[1].split(',').length === 4 ? parseFloat(m[1].split(',')[3]) : 1) : 0;
      if (alpha > 0.01 || cs.backgroundImage !== 'none') out.push(`${e.tagName.toLowerCase()}.${String(e.className).trim().replace(/\s+/g, '.')} ${cs.backgroundColor} ${cs.backgroundImage.slice(0, 40)}`);
    }
  }
  return out;
}, sel);
const rect = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }; }, sel);
const shown = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)]
  .filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('[inert]'); }).length, sel);
// Visible text on the board (closed, inert panels excluded: a host cannot see them).
const boardText = (page) => page.evaluate(() => {
  const out = [];
  const walk = (n) => {
    if (n.nodeType === 3) { const p = n.parentElement; const r = p.getBoundingClientRect(); if (r.width && r.height && getComputedStyle(p).visibility !== 'hidden') out.push(n.textContent); return; }
    if (n.nodeType !== 1 || n.hasAttribute('inert')) return;
    if (getComputedStyle(n).display === 'none') return;
    for (const c of n.childNodes) walk(c);
  };
  walk(document.querySelector('.app'));
  return out.join(' ').replace(/\s+/g, ' ');
});
const scrollApp = (page, y) => page.evaluate((v) => { const a = document.querySelector('.app'); a.scrollTop = v === 'end' ? a.scrollHeight : v; }, y);
const heroInView = (page) => page.evaluate(() => { const hz = document.querySelector('.hzone').getBoundingClientRect(); const ar = document.querySelector('.app').getBoundingClientRect(); return hz.top >= ar.top - 1 && hz.top < ar.bottom; });

// ═══════════════════════════════ PHONE ═══════════════════════════════════
test.describe('phone 390x844', () => {
  test('1: the header is the tall header (date line, title ▾ opens the events sheet); no ☰', async ({ browser }) => {
    const { ctx, page } = await created(browser, PHONE);
    await expect(page.locator('[data-tt-head]')).toBeVisible();
    expect(await shown(page, '.ev-eyebrow'), 'no ☰ eyebrow').toBe(0);
    expect(await shown(page, '[aria-label="Menu"]'), 'no Menu button').toBe(0);
    await expect(page.locator('[data-tt-head] .tt-r1')).toHaveText('THU, NOV 26 · 3 DAYS', { useInnerText: true });
    await expect(page.locator('[data-tt-title] .tt-name')).toHaveText('Thanksgiving Dinner');
    await expect(page.locator('[data-tt-title] .tt-caret')).toHaveText('▾');
    // The title sits under the date line, and the ask under both.
    const r1 = await rect(page, '[data-tt-head] .tt-r1'); const t = await rect(page, '[data-tt-title]'); const ask = await rect(page, 'h2.ask');
    expect(t.top).toBeGreaterThanOrEqual(r1.bottom - 1);
    expect(ask.top).toBeGreaterThan(t.bottom);
    await page.locator('[data-tt-title]').click();
    await sheetSettled(page);
    await expect(page.locator('#sheet-title')).toHaveText('Your events');
    await ctx.close();
  });

  test('2: the type line is hidden when the title says it (Thanksgiving Dinner / Thanksgiving Hosting)', async ({ browser }) => {
    const { ctx, page } = await created(browser, PHONE);
    expect(await shown(page, '[data-tt-head] .tt-sub')).toBe(0);
    expect(await boardText(page)).not.toMatch(/Thanksgiving Hosting/i);
    await ctx.close();
  });

  test('2: the type line shows when it adds (Grandma’s 80th / Birthday Party)', async ({ browser }) => {
    const { ctx, page } = await seeded(browser, PHONE, GRANDMA);
    await expect(page.locator('[data-tt-title] .tt-name')).toHaveText('Grandma’s 80th');
    await expect(page.locator('[data-tt-head] .tt-sub')).toHaveText('Birthday Party');
    await ctx.close();
  });

  test('3: progress on top, under the title: six segments, the current one lit, one line that opens What’s counted', async ({ browser }) => {
    const { ctx, page } = await created(browser, PHONE);
    const prog = page.locator('[data-pp-prog]');
    await expect(prog).toBeVisible();
    const t = await rect(page, '[data-tt-title]'); const p = await rect(page, '[data-pp-prog]'); const ask = await rect(page, 'h2.ask');
    expect(p.top, 'under the title').toBeGreaterThanOrEqual(t.bottom - 1);
    expect(p.bottom, 'above the question').toBeLessThanOrEqual(ask.top);
    const segs = await page.evaluate(() => [...document.querySelectorAll('[data-pp-prog] [data-seg]')].map((s) => ({ state: s.dataset.state, h: s.getBoundingClientRect().height, bg: getComputedStyle(s).backgroundColor })));
    expect(segs).toHaveLength(6);
    expect(segs.filter((s) => s.state === 'done')).toHaveLength(3);
    const lit = segs.filter((s) => s.state === 'now');
    expect(lit, 'one lit segment, the current part').toHaveLength(1);
    for (const s of segs.filter((x) => x.state !== 'now')) expect(lit[0].h, 'the lit segment is thicker').toBeGreaterThan(s.h);
    // It opens What's counted in place (cohesion F3, 11/24/2026), so its glyph
    // is the disclosure ▾, not the navigation ›.
    await expect(page.locator('[data-pp-line]')).toHaveText('3 of 6 handled · What’s counted ▾');
    const txt = await boardText(page);
    expect(txt).not.toMatch(/\bNOW\b/);
    expect(txt).not.toMatch(/this one first/i);
    expect(txt).not.toMatch(/needs you now/i);
    expect(await shown(page, '.eprog'), 'the old foot hairline is gone').toBe(0);
    expect(await shown(page, '.counted-caret'), 'one door to What’s counted').toBe(0);
    expect(await shown(page, '[aria-controls="whats-counted"]'), 'one door to What’s counted').toBe(1);
    // The line opens the existing panel (the one #whats-counted).
    await expect(page.locator('#whats-counted')).toHaveAttribute('inert', '');
    await page.locator('[data-pp-line]').click();
    await expect(page.locator('#whats-counted')).not.toHaveAttribute('inert', '');
    await expect(page.locator('#whats-counted')).toContainText('Your plan, part by part', { ignoreCase: true });
    expect(await page.locator('#whats-counted').count()).toBe(1);
    // ...and so do the bars. (Opening scrolls smoothly to the panel; let it land.)
    await page.waitForTimeout(800);
    await page.locator('[data-pp-line]').click();
    await expect(page.locator('#whats-counted')).toHaveAttribute('inert', '');
    await page.waitForTimeout(300);
    await page.locator('[data-pp-prog] .pp-segs').click();
    await expect(page.locator('#whats-counted')).not.toHaveAttribute('inert', '');
    await ctx.close();
  });

  for (const signIn of [true, false]) {
    test(`4/7: the pill, every target 44x44, and the first screen ends at the fold just above it (${signIn ? 'with' : 'without'} the sign-in row)`, async ({ browser }) => {
      const { ctx, page } = await created(browser, PHONE, { signIn });
      const bar = page.locator('[data-tt-bar]');
      await expect(bar).toBeVisible();
      for (const n of ['Create', 'Plan', 'The Day', 'After', 'All sections', 'Search']) await expect(bar.getByRole('button', { name: n, exact: true })).toBeVisible();
      await expect(bar.getByRole('button', { name: 'Plan', exact: true })).toHaveAttribute('aria-pressed', 'true');
      const m = await page.evaluate(() => {
        const pill = document.querySelector('[data-tt-bar]');
        const pr = pill.getBoundingClientRect();
        const btns = [...pill.querySelectorAll('button')].map((b) => { const r = b.getBoundingClientRect(); return { n: b.getAttribute('aria-label') || b.textContent.trim(), w: r.width, h: r.height, l: r.left, r: r.right }; });
        const div = pill.querySelector('[data-pill-divider]'); const dr = div && div.getBoundingClientRect();
        const app = document.querySelector('.app').getBoundingClientRect();
        const esc = document.querySelector('.escreen.on');
        const kids = [...esc.children].filter((c) => c.getBoundingClientRect().height > 0);
        const last = kids[kids.length - 1]; const fold = esc.querySelector('.efold');
        let n = esc.nextElementSibling; while (n && !n.getBoundingClientRect().height) n = n.nextElementSibling;
        return { pr: { top: pr.top, bottom: pr.bottom, left: pr.left, right: pr.right }, btns, div: dr && { l: dr.left, w: dr.width, h: dr.height }, appBottom: app.bottom, ih: innerHeight, iw: innerWidth,
          lastIsFold: !!fold && (last === fold || last.contains(fold)), fold: fold && fold.getBoundingClientRect().bottom, nextTop: n ? n.getBoundingClientRect().top : null, sw: document.documentElement.scrollWidth };
      });
      expect(m.sw, 'no sideways scroll').toBeLessThanOrEqual(m.iw);
      for (const b of m.btns) { expect(b.w, `${b.n} width`).toBeGreaterThanOrEqual(44); expect(b.h, `${b.n} height`).toBeGreaterThanOrEqual(44); }
      expect(m.btns.map((b) => b.n)).toEqual(['Create', 'Plan', 'The Day', 'After', 'All sections', 'Search']);
      // The divider sits between After and the two icons, inside the one pill.
      expect(m.div, 'a divider').not.toBeNull();
      expect(m.div.l).toBeGreaterThanOrEqual(m.btns[3].r - 1);
      expect(m.div.l + m.div.w).toBeLessThanOrEqual(m.btns[4].l + 1);
      for (const b of m.btns) { expect(b.l).toBeGreaterThanOrEqual(m.pr.left); expect(b.r).toBeLessThanOrEqual(m.pr.right); }
      expect(m.pr.bottom).toBeLessThanOrEqual(m.ih);
      // Nothing scrolls under the pill: the scroller ends above it.
      expect(m.appBottom, 'the scroller ends above the pill').toBeLessThanOrEqual(m.pr.top + 0.5);
      // The first screen ends at "The rest of your plan", just above the pill.
      expect(m.lastIsFold, 'the fold control ends the first screen').toBe(true);
      expect(m.fold).toBeLessThanOrEqual(m.pr.top);
      expect(m.fold, 'just above the pill').toBeGreaterThanOrEqual(m.pr.top - 40);
      expect(m.nextTop, 'below-fold content stays below the fold').toBeGreaterThanOrEqual(m.appBottom - 1);
      // No fill on the pill, the header or the progress.
      expect(await fills(page, '[data-tt-bar]'), 'pill fills').toEqual([]);
      expect(await fills(page, '[data-tt-head]'), 'header fills').toEqual([]);
      expect(await fills(page, '[data-pp-prog]').then((f) => f.filter((x) => !/data-seg|^i\./.test(x))), 'progress fills (segments aside)').toEqual([]);
      await ctx.close();
    });
  }

  test('4/6: no NEXT bar and no visible text under the pill at any depth; Plan returns to the question', async ({ browser }) => {
    const { ctx, page } = await created(browser, PHONE);
    let scrolledPast = false;
    for (const frac of [0.25, 0.5, 0.75, 1]) {
      await page.evaluate((f) => { const a = document.querySelector('.app'); a.scrollTop = Math.round((a.scrollHeight - a.clientHeight) * f); }, frac);
      await page.waitForTimeout(450);
      const m = await page.evaluate(() => {
        const a = document.querySelector('.app'); const ar = a.getBoundingClientRect();
        const band = { top: ar.bottom, bottom: innerHeight };
        const hits = [];
        for (const el of a.querySelectorAll('*')) {
          if (el.children.length || !(el.textContent || '').trim()) continue;
          const r = el.getBoundingClientRect(); if (!r.height || !r.width) continue;
          const top = Math.max(r.top, ar.top), bottom = Math.min(r.bottom, ar.bottom);
          if (bottom - top <= 0.5) continue;
          if (bottom > band.top + 0.5) hits.push(el.textContent.trim().slice(0, 30));
        }
        const hz = document.querySelector('.hzone');
        return { hits, next: document.querySelectorAll('.next-bar').length, past: hz.getBoundingClientRect().bottom < ar.top };
      });
      scrolledPast = scrolledPast || m.past;
      expect(m.next, `no NEXT bar at ${frac}`).toBe(0);
      expect(m.hits, `text in the pill's band at ${frac}`).toEqual([]);
    }
    expect(scrolledPast, 'premise: the question scrolled away').toBe(true);
    // Scrolling up brings the pill back; Plan takes her to the question.
    await page.evaluate(() => { const a = document.querySelector('.app'); a.scrollTop -= 200; });
    await page.waitForTimeout(450);
    expect(await heroInView(page)).toBe(false);
    await page.locator('[data-tt-bar]').getByRole('button', { name: 'Plan', exact: true }).click();
    await expect.poll(() => heroInView(page), { timeout: 5000 }).toBe(true);
    await ctx.close();
  });

  test('5: the pill hides while she scrolls down and comes back when she scrolls up', async ({ browser }) => {
    const { ctx, page } = await created(browser, PHONE);
    const pillState = () => page.evaluate(() => {
      const p = document.querySelector('[data-tt-bar]'); const r = p.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, Math.min(innerHeight - 2, r.top + r.height / 2));
      return { onScreen: r.top < innerHeight - 1 && parseFloat(getComputedStyle(p).opacity) > 0.5, hit: !!hit && p.contains(hit) };
    });
    expect(await pillState()).toEqual({ onScreen: true, hit: true });
    // She scrolls (the wheel here; a finger on a phone): the pill tucks away.
    await page.mouse.move(195, 420);
    for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 160); await page.waitForTimeout(150); }
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => document.querySelector('.app').scrollTop), 'premise: the board scrolled').toBeGreaterThan(200);
    expect(await pillState(), 'hidden while scrolling down').toEqual({ onScreen: false, hit: false });
    await page.mouse.wheel(0, -120); await page.waitForTimeout(500);
    expect(await pillState(), 'back on scroll up').toEqual({ onScreen: true, hit: true });
    await ctx.close();
  });

  test('5: a scroll the board makes by itself (not hers) does not hide the pill', async ({ browser }) => {
    // Closing a sheet returns focus to its opener and can move the board; that
    // tucked the pill away with nothing she did (found by qaFixturesAreDemoOnly).
    const { ctx, page } = await created(browser, PHONE);
    for (const y of [120, 260, 420]) { await scrollApp(page, y); await page.waitForTimeout(120); }
    await page.waitForTimeout(400);
    expect(await page.locator('[data-tt-bar].is-hidden').count(), 'a programmatic scroll leaves the pill up').toBe(0);
    await page.locator('[data-tt-title]').click();
    await sheetSettled(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
    expect(await page.locator('[data-tt-bar].is-hidden').count(), 'closing a sheet leaves the pill up').toBe(0);
    await page.locator('[data-tt-bar]').getByRole('button', { name: 'Search', exact: true }).click({ timeout: 5000 });
    await ctx.close();
  });

  test('every ☰ item is still one tap or two away, each in one place: events, sections, search, Ask, Feeling stuck?, settings', async ({ browser }) => {
    const { ctx, page } = await created(browser, PHONE);
    const bar = page.locator('[data-tt-bar]');
    await bar.getByRole('button', { name: 'All sections', exact: true }).click();
    await sheetSettled(page);
    await expect(page.locator('#sheet-title')).toHaveText('Everything in your plan');
    const doors = await page.evaluate(() => [...document.querySelectorAll('.sheet [data-door]')].map((e) => e.getAttribute('data-door')));
    for (const k of ['venue', 'guests', 'food', 'budget', 'tasks', 'decisions', 'ask', 'help', 'settings']) expect(doors.filter((d) => d === k), `door ${k} once`).toHaveLength(1);
    expect(new Set(doors).size).toBe(doors.length);
    // The index's own tiles fit the phone.
    const tiles = await page.evaluate(() => [...document.querySelectorAll('.sheet [data-door]')].map((e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, right: r.right }; }));
    for (const t of tiles) { expect(t.h).toBeGreaterThanOrEqual(44); expect(t.right).toBeLessThanOrEqual(PHONE.width); }
    await page.locator('.sheet [data-door="help"]').click();
    await sheetSettled(page);
    await expect(page.locator('#sheet-title')).toHaveText('Feeling stuck?');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    await bar.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.locator('.palette input, [role="combobox"]').first()).toBeVisible();
    await ctx.close();
  });
});

// ═══════════════════════ THE CITY ASK, ONCE ══════════════════════════════
for (const [name, vp] of [['phone', PHONE], ['13" portrait', TALL13]]) {
  test(`${name}: at home with no city, the plan asks for the city once, in the hero card; the street waits its turn`, async ({ browser }) => {
    const { ctx, page } = await created(browser, vp);
    const txt = await boardText(page);
    // One address ask (owner, 11/24/2026). Was 'Add your city.'.
    await expect(page.locator('h2.ask').first()).toHaveText('Add your address.');
    expect(txt).not.toMatch(/What city, state/i);
    expect(txt).not.toMatch(/Guests will ask where/i);
    // One city field on the board, in the hero.
    const cityFields = await page.evaluate(() => [...document.querySelectorAll('.app input')].filter((i) => !i.closest('[inert]') && i.getBoundingClientRect().height > 0 && /city/i.test(i.placeholder + ' ' + (i.getAttribute('aria-label') || ''))).map((i) => !!i.closest('.escreen.on .ecenter')));
    expect(cityFields).toEqual([true]);
    // Once the city is in, nothing asks for it, and the street ask takes its place.
    const card = page.locator('.escreen.on .ecenter');
    await card.locator('input').first().fill('Annapolis, MD');
    await card.getByRole('button', { name: 'Save', exact: true }).first().click();
    await expect(page.locator('h2.ask').first()).not.toHaveText('Add your address.', { timeout: 8000 });
    await page.waitForTimeout(600);
    const after = await boardText(page);
    expect(after).not.toMatch(/What city, state|Add your city|Add your address/i);
    // The street is not asked again on the board (owner, 11/24/2026: with a
    // city or ZIP on record it is asked once more when the invite goes out).
    // Was: asked once, in the "Then" row.
    expect((after.match(/Add your street address|Guests will ask where/g) || []).length, after).toBe(0);
    await ctx.close();
  });
}

// ═══════════════════════ 13" iPAD PORTRAIT ═══════════════════════════════
test.describe('13" portrait 1024x1366', () => {
  test('8: the rail is up on the page color with a hairline edge, a Your event group on top, the phase underlined; no bar', async ({ browser }) => {
    const { ctx, page } = await created(browser, TALL13);
    expect(await shown(page, '.srail'), 'the rail').toBe(1);
    expect(await shown(page, '[data-tt-bar]'), 'no bottom bar').toBe(0);
    expect(await shown(page, '.ev-eyebrow'), 'no ☰').toBe(0);
    const m = await page.evaluate(() => {
      const rail = document.querySelector('.srail'); const cs = getComputedStyle(rail); const r = rail.getBoundingClientRect();
      const bg = (e) => getComputedStyle(e).backgroundColor;
      const page = bg(document.querySelector('.app')) !== 'rgba(0, 0, 0, 0)' ? bg(document.querySelector('.app')) : bg(document.querySelector('.stagewrap'));
      const groups = [...rail.querySelectorAll('.srail-g')];
      const first = groups[0];
      const stages = [...rail.querySelectorAll('[data-rail-stage]')].map((b) => { const s = getComputedStyle(b); const br = b.getBoundingClientRect(); const a = getComputedStyle(b.querySelector('.srail-l'), '::after'); return { label: b.textContent.trim(), on: b.getAttribute('aria-current') === 'page', border: s.borderTopColor === 'rgba(0, 0, 0, 0)' ? 0 : parseFloat(s.borderTopWidth), bar: a.content !== 'none' && a.content !== 'normal' ? parseFloat(a.height) : 0, bg: s.backgroundColor, h: br.height, w: br.width }; });
      return { left: r.left, bg: cs.backgroundColor, bgImg: cs.backgroundImage, page, edge: parseFloat(cs.borderRightWidth), firstTitle: first && first.querySelector('.srail-t').textContent.trim(), firstHasStages: !!first && !!first.querySelector('[data-rail-stage]'), stages };
    });
    expect(m.left).toBeLessThanOrEqual(1);
    expect(['rgba(0, 0, 0, 0)', m.page], `rail fill ${m.bg} on page ${m.page}`).toContain(m.bg);
    expect(m.bgImg).toBe('none');
    expect(m.edge, 'a hairline right edge').toBeGreaterThan(0);
    expect(m.edge).toBeLessThanOrEqual(1);
    expect(m.firstTitle).toMatch(/^your event$/i);
    expect(m.firstHasStages).toBe(true);
    expect(m.stages.map((s) => s.label)).toEqual(['Create', 'Plan', 'The Day', 'After']);
    for (const s of m.stages) expect(s.h).toBeGreaterThanOrEqual(44);
    const on = m.stages.filter((s) => s.on);
    expect(on.map((s) => s.label)).toEqual(['Plan']);
    // Underlined, not outlined (owner, 11/24/2026, render 7; was "outlined").
    expect(on[0].border, 'no outline').toBe(0);
    expect(on[0].bar, 'a 2px bar under the label').toBe(2);
    expect(on[0].bg, 'not filled').toBe('rgba(0, 0, 0, 0)');
    for (const s of m.stages.filter((x) => !x.on)) expect(s.border).toBe(0);
    await ctx.close();
  });

  test('9: the question sits under the ribbon; one column: question, Where you stand, the rest', async ({ browser }) => {
    const { ctx, page } = await created(browser, TALL13);
    const m = await page.evaluate(() => {
      const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right }; };
      return { rib: r('[data-tt-ribbon]'), ask: r('h2.ask'), stand: r('.escreen.on .bento'), fold: r('.escreen.on .efold'), sign: r('[data-keep-ask]') };
    });
    const gap = m.ask.top - m.rib.bottom;
    expect(gap, `the question under the ribbon (gap ${Math.round(gap)}px)`).toBeGreaterThanOrEqual(0);
    expect(gap, `no empty band (gap ${Math.round(gap)}px)`).toBeLessThanOrEqual(64);
    expect(m.stand.top).toBeGreaterThan(m.ask.bottom);
    expect(m.stand.top - m.ask.bottom, 'no empty band above Where you stand').toBeLessThanOrEqual(400);
    expect(Math.abs(m.stand.left - m.ask.left), 'one column').toBeLessThanOrEqual(2);
    expect(m.fold.top).toBeGreaterThanOrEqual(m.stand.bottom - 1);
    await ctx.close();
  });

  test('10: no NOW tag and no “dated work needs you now”; the current part is bold', async ({ browser }) => {
    const { ctx, page } = await created(browser, TALL13);
    expect(await page.locator('.tt-now').count()).toBe(0);
    const txt = await boardText(page);
    expect(txt).not.toMatch(/\bNOW\b/);
    expect(txt).not.toMatch(/needs you now/i);
    const parts = await page.evaluate(() => [...document.querySelectorAll('[data-tt-ribbon] [data-part]')].map((p) => ({ id: p.dataset.part, state: p.dataset.state, w: Number(getComputedStyle(p.querySelector('.tt-pl')).fontWeight) })));
    const cur = parts.filter((p) => p.state === 'now');
    expect(cur).toHaveLength(1);
    expect(cur[0].w, 'the current part is bold').toBeGreaterThanOrEqual(700);
    for (const p of parts.filter((x) => x.state !== 'now')) expect(p.w).toBeLessThan(700);
    await ctx.close();
  });

  test('2: the type line, hidden for Thanksgiving Dinner, shown for Grandma’s 80th', async ({ browser }) => {
    const a = await created(browser, TALL13);
    expect(await shown(a.page, '[data-tt-head] .tt-sub')).toBe(0);
    await a.ctx.close();
    const b = await seeded(browser, TALL13, GRANDMA);
    await expect(b.page.locator('[data-tt-head] .tt-sub')).toHaveText('Birthday Party');
    await b.ctx.close();
  });

  test('one place each: no NEXT bar at depth; the rail’s Plan returns to the question; The Day changes the stage', async ({ browser }) => {
    const { ctx, page } = await wanda(browser, TALL13);
    await scrollApp(page, 'end'); await page.waitForTimeout(500);
    expect(await page.locator('.next-bar').count()).toBe(0);
    expect(await heroInView(page)).toBe(false);
    await page.locator('.srail [data-rail-stage="plan"]').click();
    await expect.poll(() => heroInView(page), { timeout: 5000 }).toBe(true);
    // Each door is in the rail once.
    const labels = await page.evaluate(() => [...document.querySelectorAll('.srail .srail-row')].map((b) => b.getAttribute('aria-label') || b.textContent.trim()));
    expect(new Set(labels).size, labels.join(' | ')).toBe(labels.length);
    await page.locator('.srail [data-rail-stage="day"]').click();
    await expect(page.locator('.srail [data-rail-stage="day"]')).toHaveAttribute('aria-current', 'page');
    await ctx.close();
  });
});

// ═══════════════ THE OTHER SIZES KEEP THEIR NAVIGATION ════════════════════
test('768x1024 portrait keeps today’s tall mode: the bottom bar, no rail, no pill', async ({ browser }) => {
  const { ctx, page } = await created(browser, TABLET);
  expect(await shown(page, '[data-tt-bar]')).toBe(1);
  expect(await shown(page, '.srail')).toBe(0);
  expect(await page.locator('[data-tt-bar][data-pill]').count()).toBe(0);
  await ctx.close();
});

for (const vp of [{ width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
  test(`${vp.width}x${vp.height} landscape keeps the rail and no bottom bar or pill`, async ({ browser }) => {
    const { ctx, page } = await created(browser, vp);
    expect(await shown(page, '.srail')).toBe(1);
    expect(await shown(page, '[data-tt-bar]')).toBe(0);
    // Owner, 11/24/2026: every rail carries Create · Plan · The Day · After,
    // not only the 13" portrait's (was 0 here; see everyWideBoardKnowsItsEventAndStages).
    expect(await page.locator('[data-rail-stage]').count(), 'every rail carries the four stages').toBe(4);
    await ctx.close();
  });
}
