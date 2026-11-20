// ─── QUIET TEXT STILL READS (design audit batch 1, 11/20/2026) ──────────────
//
// MEASURED, by compositing every ancestor background and every ancestor
// `opacity` the way the eye receives them. The helper notes under Your money,
// People you're hiring and You & settings are `.grounding` — `--muted` #909296,
// 5.29:1 on the sheet — and 31 of them carried an inline `opacity: .75` (or .7,
// .8, .85, .65) on top. At .75 they rendered at 3.58:1. The "Sample" tag on
// Your events was an inline-styled pill at opacity .7: 3.42:1. Every one was
// under the 4.5:1 floor for text this size.
//
// The fix was removing the inline dims and letting the class's token speak
// (the Sample tag reuses `.eb-sample`, the sample chip the header already has).
// This spec measures the rendered pixels, not the source, so a dim that comes
// back from anywhere — an inline style, a class, an ancestor — fails it.
import { test, expect, settled, sheetSettled, openSectionByName, dateIn } from './fixtures.mjs';

// Composited WCAG contrast of an element's text against what is really behind it.
// Waits for any finite animation on the element or an ancestor first: a row
// mid-fade is not the color a host reads.
const contrastOf = (locator) => locator.evaluate(async (el) => {
  const anims = [];
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    for (const a of n.getAnimations()) {
      const t = a.effect && a.effect.getComputedTiming && a.effect.getComputedTiming();
      if (t && Number.isFinite(t.endTime)) anims.push(a.finished.catch(() => {}));
    }
  }
  await Promise.race([Promise.all(anims), new Promise((r) => setTimeout(r, 4000))]);
  const parse = (s) => {
    const m = String(s || '').match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (t, b) => {
    const a = t.a + b.a * (1 - t.a);
    const ch = (k) => (t[k] * t.a + b[k] * b.a * (1 - t.a)) / a;
    return { r: ch('r'), g: ch('g'), b: ch('b'), a };
  };
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const layers = [];
  let opacity = 1;
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const cs = getComputedStyle(n);
    opacity *= parseFloat(cs.opacity);
    const c = parse(cs.backgroundColor);
    if (c && c.a > 0 && layers.every((l) => l.a < 1)) layers.push(c);
  }
  let bg = parse(getComputedStyle(document.body).backgroundColor) || { r: 0, g: 0, b: 0, a: 1 };
  bg = { ...bg, a: 1 };
  for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg);
  const cs = getComputedStyle(el);
  const fc = parse(cs.color);
  const text = over({ ...fc, a: fc.a * opacity }, bg);
  const l1 = lum(text), l2 = lum(bg);
  const size = parseFloat(cs.fontSize), weight = Number(cs.fontWeight);
  const large = size >= 24 || (size >= 18.66 && weight >= 700);
  return { ratio: (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05), need: large ? 3 : 4.5, size, opacity };
});

// The audit's seed: over budget (so Money lists what it protects), vendors on
// file (so Hiring shows its planning ranges).
const EVENT = {
  id: 'quiet-ev', name: 'Maya’s 40th Birthday', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(9), startTime: '18:00', startTimeSource: 'host',
  venue: 'The Ironwood Room', venueAddress: '41 Market St, Annapolis, MD', venueCity: 'Annapolis, MD',
  guestMode: 'list', guestEstimate: 14, guestCountSource: 'host',
  guests: [
    { id: 'g1', name: 'Jordan Avery', phone: '(555) 010-0101', rsvp: 'Yes' },
    { id: 'g2', name: 'Riley Park', email: 'riley@example.com', rsvp: 'Maybe' },
  ],
  vendors: [
    { id: 'v-cat', name: 'Harvest Table Catering', category: 'Catering', status: 'Considering', phone: '(410) 555-0142', cost: 2400, budgetCategory: 'Food' },
    { id: 'v-dj', name: 'Night Shift DJ', category: 'DJ', status: 'Deposit Paid', cost: 900, depositAmt: 300, depositPaid: true, contractSigned: true },
    { id: 'v-ph', name: 'Lumen Photo', category: 'Photographer', status: 'Contacted', cost: 1200 },
  ],
  budget: [
    { id: 'food', category: 'Food', budgeted: 2500, actual: 0 },
    { id: 'music', category: 'Music', budgeted: 1000, actual: 300 },
    { id: 'decor', category: 'Decor', budgeted: 400, actual: 120 },
  ],
  timeline: [],
};

const boot = async (page) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.goto('?elegant=1');
  await settled(page);
};

const NOTES = [
  ['Your money', /^Protected — not on the cut list/],
  ['People you’re hiring', /^Planning ranges for this kind of event/],
  ['You & settings', /^Used for local food prices/],
];

for (const [section, note] of NOTES) {
  test(`${section}: the helper note clears AA`, async ({ page }) => {
    await boot(page);
    await openSectionByName(page, section);
    await sheetSettled(page);
    const el = page.locator('.sheet .grounding', { hasText: note }).first();
    await expect(el).toBeVisible({ timeout: 8000 });
    await el.scrollIntoViewIfNeeded();
    const m = await contrastOf(el);
    expect(m.ratio, `"${note.source}" at ${m.ratio.toFixed(2)}:1 (opacity ${m.opacity})`).toBeGreaterThanOrEqual(m.need);
  });
}

test('Your events: the Sample tag clears AA', async ({ page }) => {
  await boot(page);
  // The events list opens from the menu at every width: the rail's "This event"
  // row where there is a rail, the menu's row where there is not.
  const rail = page.locator('.srail-row[aria-label="This event"]');
  if (await rail.count()) await rail.first().click();
  else {
    await page.locator('[aria-label="Menu"]').first().click();
    await page.locator('.sheet').last().locator('button', { hasText: /^This event/ }).first().click();
  }
  await expect(page.locator('#sheet-title')).toHaveText('Your events', { timeout: 8000 });
  await sheetSettled(page);
  const tag = page.locator('.sheet .frow .f-name > span', { hasText: /^sample$/i }).first();
  await expect(tag).toBeVisible();
  await tag.scrollIntoViewIfNeeded();
  const m = await contrastOf(tag);
  expect(m.ratio, `Sample tag at ${m.ratio.toFixed(2)}:1 (opacity ${m.opacity})`).toBeGreaterThanOrEqual(m.need);
});
