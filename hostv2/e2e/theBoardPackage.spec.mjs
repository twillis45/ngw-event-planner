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
//   4  RENAME (renders 4a, 4b, 12a, 12b). A long press (about 500ms) on the
//      title on touch, or a double-click on a desktop, turns the title into a
//      field in place, its text selected; Done saves; Escape, or leaving it
//      unchanged, cancels. A single tap still opens the events sheet, whose
//      current row has "Rename" (the same field). A placeholder name carries a
//      quiet "Name it". A one-time tip: "Tip: press and hold the name to
//      rename it ×". The invite step's name ask is the same field.
//   5  THE ATTENTION CUE (renders 6a, 6b, 6c). The one input or button the
//      hero asks for gets a soft steel ring: two breaths of about 1.2s, then a
//      faint steady outline. It plays when the hero settles and after each
//      completed step, stops on interaction, and never marks two elements.
//      With reduced motion: the steady outline only.
//   6  ONE ADDRESS ASK (render 11). At home with no address the hero asks
//      "Add your address." under "Guests, weather and shopping all use it — a
//      city or ZIP works too.", with a "Street, city, state" field and Save. A
//      full address, a city or a ZIP each saves through the one place reader
//      (lib/readPlace) and clears the ask; with only a city or ZIP the street
//      is asked once more when the invite goes out, not on the board.
//   7  "GUESTS & INVITE". The Guests door in All sections, the 13" rail and
//      search reads "Guests & invite" (same destination); search for "invite"
//      lands there.
import { test, expect } from '@playwright/test';
import { settled, sheetSettled, openSectionByName } from './fixtures.mjs';

const dateIn = (d) => { const t = new Date(); t.setDate(t.getDate() + d); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };

const PHONE = { width: 390, height: 844 };
const TABLET = { width: 768, height: 1024 };
const TALL13 = { width: 1024, height: 1366 };
const TEXT = 'Thanksgiving dinner for 14 at my house on Thursday 11/26 at 3pm, budget $400';

const created = async (browser, vp, { touch = vp.width < 1100, init, reducedMotion } = {}) => {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, ...(reducedMotion ? { reducedMotion } : null) });
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

// ═══════════════════════════════ 4. RENAME ═══════════════════════════════
// A held finger, as a touch screen sends it: pointerdown, ~600ms, pointerup.
const longPress = async (page, sel, ms = 650) => {
  const el = await page.locator(sel).first().elementHandle();
  const box = await el.boundingBox();
  const at = { clientX: box.x + 20, clientY: box.y + box.height / 2, pointerType: 'touch', isPrimary: true, bubbles: true, pointerId: 7 };
  await el.dispatchEvent('pointerdown', at);
  await page.waitForTimeout(ms);
  // The finger lifts on the button it pressed, which the field has replaced.
  await el.evaluate((e, init) => e.dispatchEvent(new PointerEvent('pointerup', init)), at);
};
const titleName = (page) => page.locator('[data-tt-head] .tt-name').first().innerText();
const field = (page, mode) => page.locator(`[data-rename="${mode}"] input`);

test('4: a long press turns the title into a field in place, its text selected; Done saves; a tap still opens the events sheet', async ({ browser }) => {
  test.setTimeout(90_000);
  const { ctx, page } = await created(browser, PHONE);
  const before = await page.locator('[data-tt-title]').boundingBox();
  await longPress(page, '[data-tt-title]');
  const f = field(page, 'title');
  await expect(f).toBeVisible();
  await expect(f).toHaveValue('Thanksgiving Dinner');
  expect(await page.locator('.sheet').count(), 'the long press does not open the events sheet').toBe(0);
  const sel = await f.evaluate((i) => [document.activeElement === i, i.selectionStart, i.selectionEnd, i.value.length]);
  expect(sel, 'focused, the whole name selected').toEqual([true, 0, sel[3], sel[3]]);
  const r = await f.boundingBox();
  expect(Math.abs(r.y + r.height / 2 - (before.y + before.height / 2)), 'in place: where the title was').toBeLessThan(12);
  await f.fill('Grandma’s Thanksgiving');
  await page.locator('[data-rename="title"]').getByRole('button', { name: 'Done' }).click();
  await expect(field(page, 'title')).toHaveCount(0);
  expect(await titleName(page)).toBe('Grandma’s Thanksgiving');
  // A single tap is still the events sheet (the 11/23 ruling).
  await page.locator('[data-tt-title]').click();
  await sheetSettled(page);
  await expect(page.locator('#sheet-title')).toHaveText('Your events');
  await ctx.close();
});

test('4: on a desktop (a mouse, no touch), a double-click renames; one click still opens the events sheet', async ({ browser }) => {
  test.setTimeout(90_000);
  // A desktop window that shows the board's title (the tall header). At
  // 1440x900 the board has no title, only the ☰ eyebrow (see HANDOFF).
  const { ctx, page } = await created(browser, TABLET, { touch: false });
  await page.locator('[data-tt-title]').dblclick();
  const f = field(page, 'title');
  await expect(f).toBeVisible();
  await expect(f).toHaveValue('Thanksgiving Dinner');
  expect(await page.locator('.sheet').count(), 'a double-click is not the events sheet').toBe(0);
  await f.fill('Thanksgiving at Ours');
  await f.press('Enter');
  expect(await titleName(page)).toBe('Thanksgiving at Ours');
  expect(await page.locator('[data-rename-tip]').count(), 'the press-and-hold tip is a touch screen’s').toBe(0);
  await page.locator('[data-tt-title]').click();
  await sheetSettled(page);
  await expect(page.locator('#sheet-title')).toHaveText('Your events');
  await ctx.close();
});

test('4: Escape, or leaving the field unchanged, cancels', async ({ browser }) => {
  test.setTimeout(90_000);
  const { ctx, page } = await created(browser, PHONE);
  await longPress(page, '[data-tt-title]');
  await field(page, 'title').fill('Something else');
  await field(page, 'title').press('Escape');
  await expect(field(page, 'title')).toHaveCount(0);
  expect(await titleName(page)).toBe('Thanksgiving Dinner');
  await longPress(page, '[data-tt-title]');
  await expect(field(page, 'title')).toBeVisible();
  await page.locator('h2.ask').first().click();
  await expect(field(page, 'title'), 'blur without a change cancels').toHaveCount(0);
  expect(await titleName(page)).toBe('Thanksgiving Dinner');
  await ctx.close();
});

test('4: the events sheet’s current row has Rename, the same field', async ({ browser }) => {
  test.setTimeout(90_000);
  const { ctx, page } = await created(browser, PHONE);
  await page.locator('[data-tt-title]').click();
  await sheetSettled(page);
  await page.locator('.sheet [data-rename-open]').click();
  const f = field(page, 'sheet');
  await expect(f).toBeVisible();
  await expect(f).toHaveValue('Thanksgiving Dinner');
  await expect(page.locator('[data-rename="sheet"]').getByRole('button', { name: 'Cancel' })).toBeVisible();
  await f.fill('Thanksgiving at Ours');
  await page.locator('[data-rename="sheet"]').getByRole('button', { name: 'Save' }).click();
  await expect(field(page, 'sheet')).toHaveCount(0);
  await expect(page.locator('.sheet .frow.rowfocus .f-name')).toContainText('Thanksgiving at Ours');
  await page.keyboard.press('Escape');
  await expect.poll(() => titleName(page)).toBe('Thanksgiving at Ours');
  await ctx.close();
});

const PLACEHOLDER = { id: 'ev-name-it', name: 'My Thanksgiving Hosting', type: 'Thanksgiving', date: dateIn(30), startTime: '15:00', startTimeSource: 'host',
  venue: 'Home', venueKind: 'home', venueCity: 'Springfield', venueState: 'VA', venueAddress: '123 Maple St, Springfield, VA 22150',
  guestMode: 'list', guestCount: 3, guestEstimate: 3, guestCountSource: 'host', totalBudget: 400, budget: [], vendors: [], timeline: [],
  guests: [{ id: 'g1', name: 'Aunt Rose', rsvp: '' }, { id: 'g2', name: 'Cousin Lee', rsvp: '' }, { id: 'g3', name: 'Pat Moore', rsvp: '' }] };

test('4: a placeholder name carries a quiet “Name it” that opens the same field; a real name does not', async ({ browser }) => {
  test.setTimeout(90_000);
  const { ctx, page } = await seededPhone(browser, PLACEHOLDER);
  const link = page.locator('[data-name-it]');
  await expect(link).toHaveText('Name it');
  const [t, l] = [await page.locator('[data-tt-title]').boundingBox(), await link.boundingBox()];
  expect(l.x, 'it follows the title').toBeGreaterThanOrEqual(t.x + t.width - 1);
  expect(Math.abs(l.y + l.height / 2 - (t.y + t.height / 2)), 'on the title’s line').toBeLessThan(12);
  expect(l.height).toBeGreaterThanOrEqual(44);
  await link.click();
  await field(page, 'title').fill('Rose’s Thanksgiving');
  await field(page, 'title').press('Enter');
  expect(await titleName(page)).toBe('Rose’s Thanksgiving');
  await expect(page.locator('[data-name-it]'), 'a name she gave needs no “Name it”').toHaveCount(0);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].name);
  expect(stored).toBe('Rose’s Thanksgiving');
  await ctx.close();
});

// CHANGED BY THE OWNER (cohesion G #57, 11/24/2026): the one-time
// "press and hold" tip is gone; a touch screen shows a visible "✎ Rename"
// beside her own title, every time, and it opens the same rename field.
test('4: on a touch screen her title carries a visible “✎ Rename”, every time, and it opens the field', async ({ browser }) => {
  test.setTimeout(90_000);
  const { ctx, page } = await seededPhone(browser, { ...PLACEHOLDER, id: 'ev-tip', name: 'Rose’s Thanksgiving' });
  await expect(page.locator('[data-rename-tip]')).toHaveCount(0);
  const btn = page.locator('[data-rename-btn]');
  await expect(btn).toHaveText('✎ Rename');
  const [t, b] = [await page.locator('[data-tt-title]').boundingBox(), await btn.boundingBox()];
  expect(b.height, 'a 44px tap').toBeGreaterThanOrEqual(44);
  expect(Math.abs((b.y + b.height / 2) - (t.y + t.height / 2)) <= t.height || b.y >= t.y, 'beside or under the title').toBe(true);
  await page.reload(); await settled(page); await page.waitForTimeout(500);
  await expect(page.locator('[data-rename-btn]'), 'still there after a reload').toBeVisible();
  await page.locator('[data-rename-btn]').click();
  await expect(page.locator('.tt-renaming input')).toBeVisible();
  await ctx.close();
});

test('4: the invite step’s “What do you call it?” is the same rename field', async ({ browser }) => {
  test.setTimeout(90_000);
  const { ctx, page } = await seededPhone(browser, { ...PLACEHOLDER, id: 'ev-invite-name' });
  await openSectionByName(page, 'Guests');
  await sheetSettled(page);
  await page.locator('.sheet button').filter({ hasText: /^Copy the invite$/ }).first().click();
  const ask = page.locator('[data-outward-name]');
  await expect(ask).toBeVisible({ timeout: 10_000 });
  const f = ask.locator('[data-rename="invite"] input');
  await expect(f).toHaveAttribute('aria-label', 'The event’s name');
  await expect(f).toHaveAttribute('placeholder', 'My Thanksgiving Hosting');
  await f.fill('Rose’s Thanksgiving');
  await ask.getByRole('button', { name: 'Save the name' }).click();
  await expect(page.locator('[data-outward-name]')).toHaveCount(0);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0].name);
  expect(stored).toBe('Rose’s Thanksgiving');
  await ctx.close();
});

// ═════════════════════════════ 5. THE ATTENTION CUE ═════════════════════════
const cues = (page) => page.evaluate(() => [...document.querySelectorAll('[data-cue]')].map((e) => {
  const cs = getComputedStyle(e);
  return { tag: e.tagName.toLowerCase(), cls: String(e.className), inHero: !!e.closest('.escreen.on .hero-card'),
    anim: cs.animationName, dur: cs.animationDuration, iter: cs.animationIterationCount, ow: parseFloat(cs.outlineWidth), os: cs.outlineStyle, oc: cs.outlineColor,
    // The ring: a box-shadow on a field (its outline is its focus ring), an outline on a button.
    ring: /^(INPUT|TEXTAREA)$/.test(e.tagName) ? (cs.boxShadow === 'none' ? '' : cs.boxShadow) : (cs.outlineStyle === 'none' ? '' : cs.outlineColor) };
}));

test('5: one strong ring on the one field the hero asks for: two breaths, then steady; it stops on interaction and returns after a completed step', async ({ browser }) => {
  test.setTimeout(90_000);
  const { ctx, page } = await created(browser, PHONE);
  await expect.poll(() => cues(page).then((c) => c.length)).toBe(1);
  let c = (await cues(page))[0];
  expect(c.inHero, 'it is in the hero card').toBe(true);
  expect(c.tag, 'the city field the hero asks for').toBe('input');
  expect(c.anim).toMatch(/cue-breathe/);
  expect(c.anim).toMatch(/cue-settle/);
  expect(c.dur.split(',')[0].trim(), 'a breath is about 1.2s').toBe('1.2s');
  expect(c.iter.split(',')[0].trim(), 'two breaths').toBe('2');
  // Settled: a steady outline in steel, clearly visible but not solid
  // (owner, 11/24/2026, "make pulse strong": it was at most 30%; now 40–60%).
  await page.waitForTimeout(3300);
  c = (await cues(page))[0];
  expect(c.ring, 'a steady ring').not.toBe('');
  // The alpha, however the browser serializes the color (rgba(…, a) or oklab(… / a)).
  const alpha = Number((/(?:\/\s*|,\s*)([\d.]+)\)/.exec(c.ring) || [])[1]);
  expect(alpha, `visible at rest (${c.ring})`).toBeGreaterThanOrEqual(0.4);
  expect(alpha, `not a solid border (${c.ring})`).toBeLessThanOrEqual(0.6);
  // Her interaction stops it.
  await page.locator('h2.ask').first().click();
  await expect.poll(() => cues(page).then((x) => x.length)).toBe(0);
  // A completed step: it plays again, on the next ask's one element.
  await page.locator('.escreen.on .hero-card input.field').first().fill('Springfield, VA');
  await page.locator('.escreen.on .hero-card').getByRole('button', { name: /^Save/ }).first().click();
  await expect.poll(() => cues(page).then((x) => x.length), { timeout: 8000 }).toBe(1);
  expect((await cues(page))[0].inHero).toBe(true);
  // Never two.
  for (let i = 0; i < 6; i++) { expect((await cues(page)).length).toBeLessThanOrEqual(1); await page.waitForTimeout(300); }
  await ctx.close();
});

test('5: with reduced motion the cue is the steady outline only, no animation', async ({ browser }) => {
  test.setTimeout(90_000);
  const { ctx, page } = await created(browser, PHONE, { reducedMotion: 'reduce' });
  await expect.poll(() => cues(page).then((c) => c.length)).toBe(1);
  const c = (await cues(page))[0];
  expect(c.anim).toBe('none');
  expect(c.ring, 'the steady ring only').not.toBe('');
  await ctx.close();
});

// A STRONG PULSE (owner, 11/24/2026: "make pulse strong"). The ring was steel at
// 30% at its peak and 16% at rest, too faint to catch the eye. Read from the
// stylesheet's own keyframes, so a later softening fails here.
test('5: the cue pulses strong (peak at least 65%) and settles visible (at least 40%)', async ({ browser }) => {
  test.setTimeout(90_000);
  const { ctx, page } = await created(browser, PHONE);
  const pct = await page.evaluate(() => {
    const out = {};
    const read = (txt) => { const m = /steel-soft\)\s*(\d+)%/.exec(String(txt)); return m ? Number(m[1]) : null; };
    for (const sh of [...document.styleSheets]) {
      let rules; try { rules = [...sh.cssRules]; } catch { continue; }
      for (const r of rules) {
        if (r.type === CSSRule.KEYFRAMES_RULE && /^cue-(breathe|settle)(-ring)?$/.test(r.name)) {
          for (const k of [...r.cssRules]) {
            const v = read(k.style.outlineColor || k.style.boxShadow);
            if (v != null) out[r.name] = Math.max(out[r.name] || 0, v);
          }
        }
      }
    }
    return out;
  });
  expect(pct['cue-breathe'], 'button pulse peak').toBeGreaterThanOrEqual(65);
  expect(pct['cue-breathe-ring'], 'field pulse peak').toBeGreaterThanOrEqual(65);
  expect(pct['cue-settle'], 'button ring at rest').toBeGreaterThanOrEqual(40);
  expect(pct['cue-settle-ring'], 'field ring at rest').toBeGreaterThanOrEqual(40);
  await ctx.close();
});

// ═══════════════════════════════ 7. GUESTS & INVITE ═══════════════════════════
test('7: the Guests door reads “Guests & invite” in All sections, the 13" rail and search; “invite” finds it', async ({ browser }) => {
  test.setTimeout(120_000);
  // All sections, on a phone.
  let { ctx, page } = await created(browser, PHONE);
  await page.locator('[data-tt-bar]').getByRole('button', { name: 'All sections' }).click();
  await sheetSettled(page);
  const tiles = await page.locator('.sheet').last().locator('[data-door]').allInnerTexts();
  expect(tiles.map((t) => t.trim())).toContain('Guests & invite');
  expect(tiles.map((t) => t.trim()), 'one door, renamed').not.toContain('Guests');
  await page.locator('.sheet').last().locator('[data-door]', { hasText: 'Guests & invite' }).first().click();
  await sheetSettled(page);
  await expect(page.locator('#sheet-title')).toHaveText(/Guest list|People/);
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  // Search: "invite" lands on it.
  await page.locator('[data-tt-bar]').getByRole('button', { name: 'Search' }).click();
  await page.getByRole('textbox', { name: 'Search events and destinations' }).fill('invite');
  const first = page.locator('.palette-row').first();
  await expect(first).toContainText('Guests & invite');
  await first.click();
  await sheetSettled(page);
  await expect(page.locator('#sheet-title')).toHaveText(/Guest list|People/);
  await ctx.close();
  // The 13" rail.
  ({ ctx, page } = await created(browser, TALL13));
  const rail = await page.locator('.srail .srail-row .srail-l').allInnerTexts();
  expect(rail.map((t) => t.trim())).toContain('Guests & invite');
  expect(rail.map((t) => t.trim())).not.toContain('Guests');
  await ctx.close();
});

// ═══════════════════════════════ 6. ONE ADDRESS ASK ═══════════════════════════
const savedEvent = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]').at(-1));
const boardWords = (page) => page.evaluate(() => {
  const out = [];
  const walk = (n) => {
    if (n.nodeType === 3) { const p = n.parentElement; const r = p.getBoundingClientRect(); if (r.width && r.height && getComputedStyle(p).visibility !== 'hidden') out.push(n.textContent); return; }
    if (n.nodeType !== 1 || n.hasAttribute('inert') || getComputedStyle(n).display === 'none') return;
    for (const c of n.childNodes) walk(c);
  };
  walk(document.querySelector('.app'));
  return out.join(' ').replace(/\s+/g, ' ');
});
const ADDRESS_CASES = [
  ['a full address', '123 Maple St, Springfield, VA 22150', { venueAddress: '123 Maple St', venueCity: 'Springfield', venueState: 'VA', venueZip: '22150' }],
  ['a city', 'Springfield, VA', { venueCity: 'Springfield', venueState: 'VA' }],
  ['a ZIP', '22150', { venueZip: '22150' }],
];
test('6: at home with no address the hero asks for the address once, in the approved words', async ({ browser }) => {
  test.setTimeout(90_000);
  const { ctx, page } = await created(browser, PHONE);
  await expect(page.locator('h2.ask').first()).toHaveText('Add your address.');
  const card = page.locator('.escreen.on .ecenter');
  await expect(card).toContainText('Guests, weather and shopping all use it — a city or ZIP works too.');
  const input = card.locator('.hero-card input.field').first();
  // Labeled, with a made-up example (cohesion G: every input has a visible label).
  await expect(input).toHaveAttribute('placeholder', 'For example: 42 Elm Ct, Springfield, VA');
  await expect(card.getByLabel('Your street, city and state').first()).toBeVisible();
  await expect(card.locator('.hero-card').getByRole('button', { name: 'Save', exact: true }).first()).toBeVisible();
  const words = await boardWords(page);
  expect(words).not.toMatch(/Add your city|Your home is set — weather and shopping need the city/);
  await ctx.close();
});
for (const [what, typed, want] of ADDRESS_CASES) {
  test(`6: ${what} answers the address ask, read by the one place reader; the board does not ask for the street again`, async ({ browser }) => {
    test.setTimeout(90_000);
    const { ctx, page } = await created(browser, PHONE);
    const card = page.locator('.escreen.on .ecenter');
    await card.locator('.hero-card input.field').first().fill(typed);
    await card.locator('.hero-card').getByRole('button', { name: 'Save', exact: true }).first().click();
    await expect(page.locator('h2.ask').first()).not.toHaveText('Add your address.', { timeout: 8000 });
    const ev = await savedEvent(page);
    expect(ev.venueKind, 'still her home').toBe('home');
    for (const [k, v] of Object.entries(want)) expect(ev[k], k).toBe(v);
    await page.locator('.efold').first().click(); await page.waitForTimeout(800);
    const words = await boardWords(page);
    expect(words, 'the ask is answered').not.toMatch(/Add your address|Add your city/);
    expect(words, 'the board does not ask for the street again').not.toMatch(/Add your street address|Guests will ask where/);
    await ctx.close();
  });
}
test('6: with only a city on record the street is asked once more when the invite goes out', async ({ browser }) => {
  test.setTimeout(90_000);
  // Her home with its city and no street, and a guest list to invite.
  const { venueAddress, ...cityOnly } = PLACEHOLDER;
  const { ctx, page } = await seededPhone(browser, { ...cityOnly, id: 'ev-city-only', name: 'Rose’s Thanksgiving' });
  expect(venueAddress, 'premise: the seed drops the street').toBeTruthy();
  expect(await boardWords(page), 'the board does not ask for the street').not.toMatch(/Add your street address|Add your address|Guests will ask where/);
  await openSectionByName(page, 'Guests');
  await sheetSettled(page);
  await page.locator('.sheet button').filter({ hasText: /^Copy the invite$/ }).first().click();
  await expect(page.locator('[data-invite-check]')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('[data-invite-check-item="address"]')).toHaveAttribute('data-ok', '0');
  await expect(page.locator('[data-outward-address]')).toBeVisible();
  await ctx.close();
});
