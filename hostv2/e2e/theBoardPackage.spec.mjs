// ─── THE BOARD PACKAGE (owner-approved renders, 11/24/2026) ──────────────────
// The owner approved rendered mock-ups of the board and ruled each piece. Each
// is measured here, never eyeballed, on the owner's own plan typed into
// creation, with the page clock pinned to Monday 11/23/2026 (Thursday 11/26 is
// three days out):
//
//   1  NAV SELECTED STATE = UNDERLINE (renders 1a, 7). In the phone pill, the
//      768–1023 tall bar and the 13" rail's "Your event" group, the selected
//      stage has no circle, outline or box: a white semibold label with a short
//      2px bar beneath it, 60% of the label's width, centered in the pill and
//      the bar, left-aligned in the rail. The others are muted. One style.
//   2  AFTER A DECISION THE HERO ADVANCES (render 2). Answering a call shows
//      the NEXT item right away, never "That's decided." Above it, one quiet
//      line: "✓ Decided · Undo" (a green check; Undo restores her prior
//      answer). It clears after about 6s or on her next action. No "Next:
//      Resolve …" link.
//   3  "THEN, IN ORDER" SHOWS TIMING AND BLOCKING TOGETHER (render 3): a row
//      others wait on, with a deadline, reads "by Tue · others wait on it"; a
//      row with a date always shows its date ("by Wed").
import { test, expect } from '@playwright/test';
import { settled } from './fixtures.mjs';

const dateIn = (d) => { const t = new Date(); t.setDate(t.getDate() + d); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };

const PHONE = { width: 390, height: 844 };
const TABLET = { width: 768, height: 1024 };
const TALL13 = { width: 1024, height: 1366 };
const TEXT = 'Thanksgiving dinner for 14 at my house on Thursday 11/26 at 3pm, budget $400';

const created = async (browser, vp, { touch = vp.width < 1100, init } = {}) => {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-11-23T12:00:00'));
  if (init) await page.addInitScript(init);
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
  return { ctx, page };
};

// ═══════════════════ 1. THE SELECTED STAGE IS UNDERLINED ═══════════════════
// Every stage button under `sel`: its box, its label and the label's ::after.
const stages = (page, sel) => page.evaluate((s) => {
  const res = (v) => { const p = document.createElement('div'); p.style.color = v; document.body.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
  return {
    ink: res('var(--ink)'), muted: res('var(--muted)'),
    rows: [...document.querySelectorAll(s)].map((b) => {
      const cs = getComputedStyle(b);
      // The label is the button's one text element (the rail's .srail-l, the
      // bar's .nav-l); on a bare-text button it is the button itself.
      const lab = b.querySelector('.srail-l, .nav-l') || b;
      const lr = lab.getBoundingClientRect();
      const ls = getComputedStyle(lab);
      const a = getComputedStyle(lab, '::after');
      const has = a.content !== 'none' && a.content !== 'normal' && a.display !== 'none';
      return {
        label: b.textContent.trim(), on: b.classList.contains('on') || b.classList.contains('is-stage'),
        bg: cs.backgroundColor, img: cs.backgroundImage, shadow: cs.boxShadow, outline: cs.outlineStyle === 'none' ? 0 : parseFloat(cs.outlineWidth),
        edges: ['Top', 'Right', 'Bottom', 'Left'].map((k) => (cs[`border${k}Color`] === 'rgba(0, 0, 0, 0)' ? 0 : parseFloat(cs[`border${k}Width`]))),
        ink: ls.color, weight: Number(ls.fontWeight),
        lw: lr.width, lh: lr.height,
        under: has ? { left: parseFloat(a.left), width: parseFloat(a.width), height: parseFloat(a.height), bottom: parseFloat(a.bottom), bg: a.backgroundColor } : null,
      };
    }),
  };
}, sel);

const SURFACES = [
  { name: 'the phone pill', vp: PHONE, sel: '[data-tt-bar] .tt-seg-b', align: 'center' },
  { name: 'the 768 tall bar', vp: TABLET, sel: '[data-tt-bar] .tt-seg-b', align: 'center' },
  { name: 'the 13" rail', vp: TALL13, sel: '.srail [data-rail-stage]', align: 'left' },
];

test('1: the selected stage is underlined, one style on the pill, the 768 bar and the 13" rail; the rest muted', async ({ browser }) => {
  test.setTimeout(150_000);
  const looks = [];
  for (const s of SURFACES) {
    const { ctx, page } = await created(browser, s.vp);
    const m = await stages(page, s.sel);
    const w = s.name;
    expect(m.rows.map((r) => r.label), `premise: ${w} shows the four stages`).toEqual(['Create', 'Plan', 'The Day', 'After']);
    const on = m.rows.filter((r) => r.on);
    expect(on.map((r) => r.label), w).toEqual(['Plan']);
    const p = on[0];
    expect.soft(p.bg, `${w}: no fill`).toBe('rgba(0, 0, 0, 0)');
    expect.soft(p.img, `${w}: no gradient`).toBe('none');
    expect.soft(p.shadow, `${w}: no ring`).toBe('none');
    expect.soft(p.edges, `${w}: no outline`).toEqual([0, 0, 0, 0]);
    expect.soft(p.outline, `${w}: no outline`).toBe(0);
    expect.soft(p.ink, `${w}: white (the ink)`).toBe(m.ink);
    expect.soft(p.weight, `${w}: semibold`).toBe(600);
    expect(p.under, `${w}: a bar beneath the label`).not.toBeNull();
    expect.soft(p.under.height, `${w}: 2px`).toBe(2);
    expect.soft(p.under.width / p.lw, `${w}: 60% of the label`).toBeCloseTo(0.6, 1);
    expect.soft(p.under.bottom, `${w}: beneath the label`).toBeLessThan(0);
    if (s.align === 'center') expect.soft(p.under.left + p.under.width / 2, `${w}: centered`).toBeCloseTo(p.lw / 2, 0);
    else expect.soft(p.under.left, `${w}: left-aligned`).toBe(0);
    for (const r of m.rows.filter((x) => !x.on)) {
      expect.soft(r.ink, `${w}: ${r.label} is muted`).toBe(m.muted);
      expect.soft(r.under, `${w}: ${r.label} has no bar`).toBeNull();
      expect.soft(r.edges, `${w}: ${r.label} has no outline`).toEqual([0, 0, 0, 0]);
    }
    looks.push(`${p.ink} ${p.weight} ${p.under.height} ${p.under.bg}`);
    await ctx.close();
  }
  expect(new Set(looks).size, `one shared style: ${looks.join(' | ')}`).toBe(1);
});

// ═══════════════════ 2. AFTER A DECISION THE HERO ADVANCES ═════════════════
// A Get-Together, walked from the first ask as oneUndoAndAnHonestQuiet walks it:
// its call is the last open call while other work waits, the board that used
// to stop on "That's decided." with a "Next: …" link.
const seededPhone = async (browser, ev) => {
  const ctx = await browser.newContext({ viewport: PHONE, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('./?elegant=1&noanalytics=1');
  await settled(page);
  await page.waitForTimeout(600);
  return { ctx, page };
};
const GET_TOGETHER = { id: 'ev-decided-advances', name: 'Saturday Get-Together', type: 'Get-Together', date: dateIn(86), guestMode: 'count', guestCount: 16,
  totalBudget: 0, budget: [], vendors: [], guests: [], timeline: [] };
const hero = (page) => page.locator('.escreen.on');
const askText = async (page) => ((await page.locator('.escreen.on h2.ask').count()) ? (await page.locator('.escreen.on h2.ask').first().innerText()).trim() : '');
const storedChoices = (page) => page.evaluate(() => JSON.stringify((JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0] || {}).foodChoices || {}));
const toTheCall = async (page) => {
  await hero(page).locator('button.cta').first().click(); await page.waitForTimeout(1200);
  const inp = hero(page).locator('input:visible');
  if (await inp.count()) {
    await inp.first().fill('Our place, Annapolis, MD');
    await hero(page).locator('button').filter({ hasText: /^Save/ }).first().click(); await page.waitForTimeout(1200);
  }
  await expect(hero(page).locator('.decopt.pick').first(), 'premise: the hero asks a call').toBeVisible();
};
const visibleUndos = (page) => page.evaluate(() => [...document.querySelectorAll('button')]
  .filter((b) => /^Undo$/.test((b.innerText || '').trim()) && b.getBoundingClientRect().width > 0 && !b.closest('[inert]')).length);

test('2: answering a call advances the hero to the next item under one quiet "✓ Decided · Undo" line', async ({ browser }) => {
  test.setTimeout(90_000);
  const { ctx, page } = await seededPhone(browser, GET_TOGETHER);
  await toTheCall(page);
  const asked = await askText(page);
  const before = await storedChoices(page);
  await hero(page).locator('.decopt.pick').first().click();
  await page.waitForTimeout(900);
  const t = await hero(page).innerText();
  expect(t, 'never stops on a payoff while work is open').not.toMatch(/That’s decided|Those are decided|That’s settled|Those are settled/);
  expect(await page.locator('.ac-next').count(), 'no "Next: …" link').toBe(0);
  expect(t).not.toMatch(/Next: Resolve/);
  const next = await askText(page);
  expect(next, 'the hero shows the next item').not.toBe('');
  expect(next, 'the next item, not the call just answered').not.toBe(asked);
  const line = hero(page).locator('[data-decided]');
  await expect(line).toBeVisible();
  await expect(line).toHaveText('✓ Decided · Undo', { useInnerText: true });
  const m = await page.evaluate(() => {
    const l = document.querySelector('.escreen.on [data-decided]');
    const res = (v) => { const p = document.createElement('div'); p.style.color = v; document.body.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    return { above: l.getBoundingClientRect().bottom <= document.querySelector('.escreen.on h2.ask').getBoundingClientRect().top + 1,
      check: getComputedStyle(l.querySelector('[data-decided-check]')).color, ok: res('var(--ok)'), muted: res('var(--muted)'),
      undo: getComputedStyle(l.querySelector('button')).color };
  });
  expect(m.above, 'the line sits above the ask').toBe(true);
  expect(m.check, 'a green check').toBe(m.ok);
  expect(m.undo, 'Undo is a muted text link').toBe(m.muted);
  expect(await visibleUndos(page), 'one Undo on screen').toBe(1);
  expect(await storedChoices(page), 'premise: the answer saved').not.toBe(before);
  // UNDO RESTORES HER PRIOR ANSWER, and the call comes back to the hero.
  await line.getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(900);
  expect(await storedChoices(page), 'the prior answer is restored').toBe(before);
  expect(await askText(page), 'the call is asked again').toBe(asked);
  await expect(hero(page).locator('[data-decided]')).toHaveCount(0);
  await ctx.close();
});

test('2: the decided line clears on her next action, and on its own after about 6s', async ({ browser }) => {
  test.setTimeout(90_000);
  const { ctx, page } = await seededPhone(browser, GET_TOGETHER);
  await toTheCall(page);
  await hero(page).locator('.decopt.pick').first().click();
  await expect(hero(page).locator('[data-decided]')).toBeVisible();
  const kept = await storedChoices(page);
  // Her next action (a tap on the board that is not the Undo) clears it.
  await page.locator('.escreen.on h2.ask').click();
  await expect(hero(page).locator('[data-decided]')).toHaveCount(0);
  expect(await storedChoices(page), 'the answer stays').toBe(kept);
  await ctx.close();
  // ...and left alone, it is gone after about six seconds (not before five).
  const s2 = await seededPhone(browser, { ...GET_TOGETHER, id: 'ev-decided-timer' });
  await toTheCall(s2.page);
  await hero(s2.page).locator('.decopt.pick').first().click();
  await expect(hero(s2.page).locator('[data-decided]')).toBeVisible();
  await s2.page.waitForTimeout(4500);
  await expect(hero(s2.page).locator('[data-decided]'), 'still up at 4.5s').toBeVisible();
  await expect(hero(s2.page).locator('[data-decided]')).toHaveCount(0, { timeout: 3000 });
  await s2.ctx.close();
});

// ═══════════ 3. "THEN, IN ORDER" SHOWS TIMING AND BLOCKING TOGETHER ═══════════
const thenRows = (page) => page.evaluate(() => [...document.querySelectorAll('.ef-row')].map((r) => ({
  t: (r.querySelector('.t') || r).innerText.trim(), why: ((r.querySelector('.ef-why') || {}).innerText || '').trim() })));
test('3: Then, in order: "Plan the food" reads its day and that others wait on it', async ({ browser }) => {
  test.setTimeout(90_000);
  const { ctx, page } = await created(browser, PHONE);
  await page.locator('.efold').first().click();
  await page.waitForTimeout(900);
  const rows = await thenRows(page);
  const food = rows.find((r) => /^Plan the food/.test(r.t));
  expect(food, `premise: the food row (${JSON.stringify(rows)})`).toBeTruthy();
  // Monday 11/23. Measured on the real plan: the food step is due today (the
  // render's "by Tue" was illustrative), and others wait on it. Before the
  // ruling this row read "other steps wait on this" alone.
  expect(food.why).toBe('due today · others wait on it');
  // The shopping row has no clock while the menu is open (phaseProgress,
  // "decide the menu before the shop", owner 11/18/2026), so it has no date to
  // show; "a row with a date always shows its date" is pinned in
  // theThenRowShowsTimingAndBlocking.test.js.
  await ctx.close();
});
