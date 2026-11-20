// ─── NOTHING READS DARK-ON-DARK IN LIGHT (design audit 2, 11/20/2026) ────────
//
// Measured in light on the built bundle, each against its composited ground:
//   - Jump to's stage switch kept a hex track (#17181b): "Plan" (lit) 1.58:1,
//     Create / The Day / After 3.27:1;
//   - the board's "our pick" badge kept a hex fill (#28343c): 1.84:1;
//   - the creation reveal's "Skip ›" (the reveal is carbon in both themes,
//     the label followed the theme's --ink): 1.14:1;
//   - The Day's eyebrows, "ongoing" and the beat count on the light carbon
//     body: 4.24:1;
//   - the grounding notes (3.23:1 in the audit; batch 1 removed their opacity
//     dims, measured here so they cannot come back).
// Fixed with theme tokens (--seg-track, --seg-on, --card, --carbon-ink,
// --carbon-muted), so every role is measured in BOTH themes, at every project.
import { test, expect, openSectionByName, dateIn } from './fixtures.mjs';

const EVENT = {
  id: 'quietlight-ev', name: 'Maya’s 40th Birthday', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(9), startTime: '18:00', startTimeSource: 'host',
  venue: 'The Ironwood Room', venueAddress: '41 Market St, Annapolis, MD', venueCity: 'Annapolis, MD',
  hostName: 'Casey Morgan', guestMode: 'list', guestEstimate: 14, guestCountSource: 'host',
  guests: [{ id: 'g1', name: 'Jordan Avery', rsvp: 'Yes' }, { id: 'g2', name: 'Riley Park', rsvp: 'Yes', allergens: ['Peanut'] }],
  vendors: [
    { id: 'v-cat', name: 'Harvest Table Catering', category: 'Catering', status: 'Considering', phone: '(410) 555-0142', cost: 2400, budgetCategory: 'Food' },
    { id: 'v-dj', name: 'Night Shift DJ', category: 'DJ', status: 'Deposit Paid', cost: 900, depositAmt: 300, depositPaid: true, contractSigned: true },
  ],
  budget: [{ id: 'food', category: 'Food', budgeted: 2500, actual: 0 }, { id: 'music', category: 'Music', budgeted: 1000, actual: 300 }],
  timeline: [{ id: 't1', task: 'Confirm final headcount with caterer', week: 'This week' }],
};

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
    let grounds = [[255, 255, 255]];
    for (let n = el; n; n = n.parentElement) {
      const ncs = getComputedStyle(n);
      // A gradient fill (the primary button since 11/20/2026): every stop is a
      // ground the label may sit on, and the WORST one counts (same rule as
      // lightThemeContrast.spec.mjs).
      const stops = /gradient/.test(ncs.backgroundImage) ? (ncs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(rgba).filter((x) => x && x[3] === 1) : [];
      if (stops.length) { grounds = stops.map((x) => x.slice(0, 3)); break; }
      const b = rgba(ncs.backgroundColor);
      if (!b || b[3] === 0) continue;
      if (b[3] === 1) { grounds = [b.slice(0, 3)]; break; }
      layers.push(b);
    }
    const c = rgba(cs.color);
    let worst = null;
    for (let g of grounds) {
      for (const l of layers.slice().reverse()) g = over(l, g);
      const ink = over([c[0], c[1], c[2], c[3] * op], g);
      const r = ratio(ink, g);
      if (worst === null || r < worst) worst = r;
    }
    const px = parseFloat(cs.fontSize);
    const large = px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700);
    out.push({ what: `${String(el.className) || el.tagName} "${text.slice(0, 30)}"`,
      ratio: Math.round(worst * 100) / 100, floor: large ? 3 : 4.5 });
  }
  return out;
};


const assertRows = (rows, where) => {
  for (const r of rows) expect.soft(r.ratio, `${where}: ${r.what}`).toBeGreaterThanOrEqual(r.floor);
};
const premise = (rows, needle, where) =>
  expect(rows.map((r) => r.what).join('\n'), `premise: ${needle} was measured on ${where}`).toContain(needle);

const boot = async (page, theme) => {
  await page.addInitScript(([e, th]) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-theme', th);
  }, [EVENT, theme]);
  await page.goto('?elegant=1');
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(1200);
};

const openJumpTo = async (page) => {
  if (await page.locator('.sheet').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  await page.locator('.ev-eyebrow').first().click();
  await expect(page.locator('#sheet-title')).toHaveText('Jump to', { timeout: 8000 });
  await page.waitForTimeout(500);
};

for (const theme of ['dark', 'light']) {
  test(`Jump to's switch, the "our pick" badge and The Day meet the floor (${theme})`, async ({ page }) => {
    await boot(page, theme);
    const badge = await page.evaluate(measure, ['.decopt-badge', null]);
    premise(badge, 'our pick', 'the board');
    assertRows(badge, `board (${theme})`);

    await openJumpTo(page);
    const seg = await page.evaluate(measure, ['.navseg', '.sheet']);
    premise(seg, 'navseg-b on', 'Jump to');
    premise(seg, '"After"', 'Jump to');
    assertRows(seg, `Jump to (${theme})`);

    await page.locator('.sheet').last().getByRole('button', { name: 'The Day', exact: true }).first().click();
    await page.waitForTimeout(1600);   // the stage's entrance settles
    if (await page.locator('.sheet').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
    const day = await page.evaluate(measure, ['.app', null]);
    premise(day, 'eyebrow', 'The Day');
    assertRows(day, `The Day (${theme})`);
  });

  test(`grounding notes meet the floor (${theme})`, async ({ page }) => {
    await boot(page, theme);
    const all = [];
    for (const name of ['People you’re hiring', 'Your money', 'You & settings']) {
      await openSectionByName(page, name, { settle: 900 });
      const rows = await page.evaluate(measure, ['.grounding', '.sheet']);
      assertRows(rows, `${name} (${theme})`);
      all.push(...rows);
    }
    premise(all, 'grounding', 'the sections');
  });

  test(`the reveal's "Skip ›" reads on its carbon stage (${theme})`, async ({ page }) => {
    await page.addInitScript((th) => {
      if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
      try { localStorage.clear(); } catch { /* private */ }
      localStorage.setItem('ngw-theme', th);
    }, theme);
    await page.goto('?elegant=1');
    await page.getByRole('button', { name: 'Start my event' }).first().click({ timeout: 20000 });
    await page.getByPlaceholder(/crab feast/i).first().fill('Backyard cookout for 30 people on July 4 2027 in Annapolis');
    await page.getByRole('button', { name: /^Put my plan together$/ }).click();
    const skip = page.locator('.reveal-stage').getByRole('button', { name: 'Skip ›' });
    await expect(skip).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(500);   // the stage's .4s fade-in
    const rows = await page.evaluate(measure, ['.reveal-stage .mini', null]);
    premise(rows, 'Skip', 'the reveal');
    assertRows(rows, `reveal (${theme})`);
  });
}
