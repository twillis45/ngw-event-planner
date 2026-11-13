// ─── STEEL-FILLED LABELS AND THE WELCOME READ IN BOTH THEMES (2026-11-11) ────
//
// Two surfaces whose ground is fixed in both themes painted their text with
// tokens that follow the theme, so light mode put near-black ink on them.
// Measured at 390x844 on the built bundle, light theme:
//   - every steel-filled primary (.cta on --cta-grad #4E6877): #0d0f12 label,
//     3.26:1 (dark painted #eef0f4, 5.16:1). Pressed chips on --steel: 3.17:1.
//   - the welcome (.content.welcome, carbon #0d1014 in both themes): the
//     headline 1.01:1, "Explore a sample first" 2.75:1, the sub and note 3.45:1.
// Steel fills now label with the fixed --on-steel; the welcome's text reads the
// fixed --carbon-* tokens, as the creation reveal does (revealTextLegible).
//
// Walks every visible text element, so a role added later on a moded token
// fails here without anyone having to list it. Ground = translucent layers
// composited down to the first opaque background.
import { test, expect, openSectionByName } from './fixtures.mjs';

const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const EV = {
  id: 'E2E_contrast', type: 'Birthday', name: 'Forty for Ana', date: day(30), createdAt: new Date().toISOString(),
  guestCount: 40, totalBudget: 3000, budget: [], timeline: [], vendors: [],
  guests: [{ id: 'g1', name: 'Ana Cole', rsvp: 'Yes' }, { id: 'g2', name: 'Ben Diaz', rsvp: 'Maybe' }],
};

// Steel-filled controls and the primary atom. Ghost/soft variants are included
// on purpose: their ground follows the theme, and they must pass on it too.
const STEEL = '.cta, .chip[aria-pressed="true"], .chip[aria-checked="true"], .lens[aria-pressed="true"], .dock button[aria-current="true"], .people-move-cta, .pr-primary';

// Runs in the page. Returns one row per visible text-bearing element among the
// roots `sel` matches inside `scopeSel` (each root and its descendants).
const measure = ([sel, scopeSel]) => {
  const lum = ([r, g, b]) => {
    const c = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const rgba = (s) => { const m = (s.match(/[\d.]+/g) || []).map(Number); return m.length >= 3 ? [m[0], m[1], m[2], m[3] === undefined ? 1 : m[3]] : null; };
  const over = (top, under) => top.slice(0, 3).map((v, i) => v * top[3] + under[i] * (1 - top[3]));
  const els = new Set();
  for (const root of document.querySelectorAll(sel)) {
    if (scopeSel && !root.closest(scopeSel)) continue;
    els.add(root); for (const d of root.querySelectorAll('*')) els.add(d);
  }
  const out = [];
  for (const el of els) {
    const text = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
    if (!text) continue;
    if (el.closest('button:disabled, [aria-disabled="true"]')) continue;   // inactive: 1.4.3 exempt
    const box = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (!box.width || !box.height || cs.visibility === 'hidden') continue;
    let op = 1;
    for (let n = el; n; n = n.parentElement) op *= Number(getComputedStyle(n).opacity);
    if (op < 0.02) continue;
    const layers = [];
    let ground = [255, 255, 255];
    for (let n = el; n; n = n.parentElement) {
      const b = rgba(getComputedStyle(n).backgroundColor);
      if (!b || b[3] === 0) continue;
      if (b[3] === 1) { ground = b.slice(0, 3); break; }
      layers.push(b);
    }
    for (const l of layers.reverse()) ground = over(l, ground);
    const c = rgba(cs.color);
    const ink = over([c[0], c[1], c[2], c[3] * op], ground);
    const px = parseFloat(cs.fontSize);
    const large = px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700);
    out.push({ what: `${String(el.className) || el.tagName} "${text.slice(0, 30)}"`,
      ratio: Math.round(ratio(ink, ground) * 100) / 100, floor: large ? 3 : 4.5 });
  }
  return out;
};

const assertRows = (rows, theme, where) => {
  console.log(`[${theme}] ${where}\n${rows.map((r) => `  ${r.ratio.toFixed(2)}  ${r.what}`).join('\n')}`);
  for (const r of rows) expect(r.ratio, `${where}: ${r.what} (${theme})`).toBeGreaterThanOrEqual(r.floor);
};

for (const theme of ['dark', 'light']) {
  test(`the welcome's every line meets the contrast floor (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      try { localStorage.clear(); } catch { /* private */ }
    });
    await page.goto(`./?theme=${theme}`);
    await expect(page.locator('.welcome-h1')).toBeVisible({ timeout: 20000 });
    // The stagger is held at frame one (opacity 0) until the boot splash leaves.
    await expect(page.locator('.content.welcome.splash-hold')).toHaveCount(0, { timeout: 15000 });
    await page.waitForTimeout(1500);   // the .55s stagger, last delay .4s
    const rows = await page.evaluate(measure, ['.content.welcome section > *', null]);
    const names = rows.map((r) => r.what).join('\n');
    for (const role of ['eyebrow', 'welcome-h1', 'welcome-sub', 'cta big "Start my event"', 'cta ghost "Explore a sample first"', 'welcome-note']) {
      expect(names, `premise: ${role} is on the welcome`).toContain(role);
    }
    assertRows(rows, theme, 'welcome');
  });

  test(`steel-filled labels on the board, Guests and Your money meet the floor (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((e) => {
      if (localStorage.getItem('ngw-hostv2-last-event')) return;
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
      localStorage.setItem('ngw-hostv2-last-event', e.id);
      localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
      localStorage.setItem('ngw-v2-welcomed', '1');
      localStorage.setItem('ngw-welcomed', '1');
    }, EV);
    await page.goto(`./?theme=${theme}`);
    await expect.poll(() => page.locator('.tile-b .t-num').first().innerText(), { timeout: 20000 }).toBe('40');
    await page.waitForTimeout(800);
    const all = [];
    const board = await page.evaluate(measure, [STEEL, null]);
    assertRows(board, theme, 'board');
    all.push(...board);
    for (const name of ['Your money', 'Guests']) {
      await openSectionByName(page, name, { settle: 800 });
      // "Add them" is disabled (and exempt) until there is a name to add; a
      // typed name enables it, which is the state a host taps it in.
      if (name === 'Guests') await page.getByLabel('Add guest names').fill('Cy Evans');
      const rows = await page.evaluate(measure, [STEEL, '.sheet']);
      assertRows(rows, theme, name);
      all.push(...rows);
    }
    // Premise: a steel-FILLED primary was among what got measured, not only
    // ghosts. The atom's label is the one that read 3.26:1 in light.
    expect(all.map((r) => r.what), 'premise: the steel-filled "Add them" was measured').toContain('cta "Add them"');
  });

  // Live axe, 11/13/2026: the one serious rule on the live build was
  // color-contrast from (1) unselected filter chips faded to .82 opacity
  // (Guests 3.77:1 light), (2) the vendor booking pill on the lavender
  // --progress token, 2.18:1 in light (the token PR #117 missed).
  test(`unselected filter chips and the vendor booking pill meet the floor (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const ev = { ...EV, vendors: [{ id: 'v1', name: 'Rosa Catering', category: 'Catering', status: 'Contacted' }] };
    await page.addInitScript((e) => {
      if (localStorage.getItem('ngw-hostv2-last-event')) return;
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
      localStorage.setItem('ngw-hostv2-last-event', e.id);
      localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
      localStorage.setItem('ngw-v2-welcomed', '1');
      localStorage.setItem('ngw-welcomed', '1');
    }, ev);
    await page.goto(`./?theme=${theme}`);
    await expect.poll(() => page.locator('.tile-b .t-num').first().innerText(), { timeout: 20000 }).toBe('40');
    await openSectionByName(page, 'Guests', { settle: 800 });
    const chips = await page.evaluate(measure, ['.chip[aria-pressed="false"]', '.sheet']);
    expect(chips.length, 'premise: unselected filter chips were measured').toBeGreaterThan(0);
    assertRows(chips, theme, 'Guests chips');
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    await openSectionByName(page, 'People you’re hiring', { settle: 800 });
    const card = page.locator('.vcard', { hasText: 'Rosa Catering' }).first();
    await card.waitFor({ state: 'visible', timeout: 10000 });
    await card.click();
    const pill = await page.evaluate(measure, ['.vc-pill.mid', '.sheet']);
    expect(pill.length, 'premise: the in-progress booking pill was measured').toBeGreaterThan(0);
    assertRows(pill, theme, 'vendor booking pill');
  });
}
