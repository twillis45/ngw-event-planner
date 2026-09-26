// ─── A RATE THAT ROUNDS TO NOTHING IS NOT A CHEAP RATE ───────────────────────
//
// The food sheet's per-unit rate went through hostv2's generic `fmt`, which
// rounds to whole dollars. Correct for a line total; ruinous for a rate, because
// most of this corpus's rates are under a dollar. Ice, authored at $0.20–$0.40
// per pound and stored to the cent, rendered as "$0–$0/lb".
//
// Counted across the whole corpus: 440 lines carry a per-unit band, 84 had a
// bound round to $0, and 22 collapsed to "$0–$0". On The Cookout alone — the
// fixture below — 12 of 22 rows printed a number the plan never authored, six
// of them with a $0 bound.
//
// DRIVEN, BECAUSE JEST CANNOT EXECUTE hostv2. src/lib/__tests__/perUnitText.test.js
// proves the formatting rule against the real corpus; only a browser proves the
// sheet a host opens is the thing that changed. The negative control below is
// the half that matters: an assertion that "$0/lb" is absent proves nothing
// unless the rates are demonstrably on the screen.
import { test, expect, settled } from './fixtures.mjs';

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80);
}, src);

// Every per-unit rate currently in the DOM, read off the meta line that renders
// them. Reading the rendered text rather than the data is the whole point: the
// data was always right.
const rates = (page) => page.evaluate(() => [...document.querySelectorAll('.v-meta')]
  .map((x) => (x.innerText || '').replace(/\s+/g, ' '))
  .flatMap((s) => s.match(/(?:<)?\$[\d,]+(?:\.\d{2})?(?:–(?:<)?\$[\d,]+(?:\.\d{2})?)?\/[^\s·]+/g) || []));

const openShelves = async (page) => {
  // The groups are collapsed by default — no row exists in the DOM until a
  // shelf is opened, so an assertion over the closed list asserts over nothing.
  const opened = await page.evaluate(() => [...document.querySelectorAll('.fg-head')]
    .map((h) => { h.click(); return (h.innerText || '').replace(/\s+/g, ' ').slice(0, 40); }));
  await page.waitForTimeout(600);
  await settled(page);
  return opened;
};

const openList = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-rate', name: 'The Cookout', type: 'The Cookout',
      date: '2027-06-17', venueCity: '21014',
      guestMode: 'count', guestCount: 20, totalBudget: 1200,
      budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-rate');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
  await tapText(page, "what you.?re serving");
  await page.waitForTimeout(1600);
  await settled(page);
  await tapText(page, 'The list[\\s\\S]*item');
  await page.waitForTimeout(1600);
  await settled(page);
  return openShelves(page);
};

test('(premise) the shelves really opened and the rates are really on the screen', async ({ page }) => {
  // Without this every assertion below passes over an empty list.
  const opened = await openList(page);
  console.log('SHELVES:', JSON.stringify(opened));
  const r = await rates(page);
  console.log('RATES:', JSON.stringify(r));
  expect(opened.length).toBeGreaterThan(1);
  expect(r.length).toBeGreaterThan(8);
});

test('NOT ONE ROW SAYS $0 — the defect this spec exists for', async ({ page }) => {
  await openList(page);
  const zeroed = (await rates(page)).filter((s) => /\$0(?![.\d])/.test(s));
  expect(zeroed).toEqual([]);
});

test('ICE IS TWENTY CENTS A POUND, and the sheet now says so', async ({ page }) => {
  // The concrete row. It read "$0–$0/lb" — a host was being told the ice was
  // free. The corpus authors it at 0.20–0.40 and always has.
  await openList(page);
  const r = await rates(page);
  expect(r).toContain('$0.20–$0.40/lb');
});

test('sub-dollar rates keep their cents, whole-dollar rates stay whole', async ({ page }) => {
  // Both halves of the rule on one screen, so a future "just use toFixed(2)"
  // that turns "$3–$8/drinks" into "$3.00–$8.00/drinks" fails here.
  const r = await openList(page).then(() => rates(page));
  expect(r).toContain('$0.30–$0.60/buns');   // was "$0–$1/buns"
  expect(r).toContain('$3.20–$8/drinks');    // was "$3–$8/drinks"
  for (const s of r) expect(s).not.toMatch(/\.00(?:[–/]|$)/);
});
