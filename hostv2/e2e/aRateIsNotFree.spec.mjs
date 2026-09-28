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
import { test, expect, settled, sheetSettled } from './fixtures.mjs';

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
  await sheetSettled(page);
  await tapText(page, 'The list[\\s\\S]*item');
  await sheetSettled(page);
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
  //
  // THE LITERAL MOVED, AND WHY IT IS NOT A FUDGE. This asserted the exact
  // string "$0.20–$0.40/lb" until 2026-09-27, when f558376c made the event's
  // state actually resolve and the regional path started running. Ice has no
  // BLS series of its own, so the plan engine imputes the region's basket
  // mean (~0.98) and the top of the band renders $0.39. That is the authored
  // corpus value, regionally adjusted — not a lost cent.
  //
  // Editing the number alone would have written today's behaviour into the
  // gate, which the board named as the trap. So the band is asserted as a
  // RANGE around the authored value, and the claim that makes the adjustment
  // honest is asserted with it: a line adjusted from the basket must say so.
  // A silent re-scaling now fails here even when the arithmetic is right.
  await openList(page);
  const r = await rates(page);
  const ice = r.find((x) => /^\$0\.(19|20|21)–\$0\.(3[5-9]|40|41)\/lb$/.test(x));
  expect(ice, `no ice rate near the authored $0.20–$0.40 band in ${JSON.stringify(r)}`).toBeTruthy();

  // ONLY WHEN THE PLAN WAS ACTUALLY ADJUSTED. The regional factor comes from a
  // live BLS proxy; CI builds against e2e-mock.invalid, the fetch fails, and
  // the sheet honestly reads "National average · not yet adjusted". Asserting
  // the marker unconditionally reds CI on correct behaviour — it did, seven
  // times, on this test.
  const sheet = await page.evaluate(() => (document.querySelector('.sheet') || {}).innerText || '');
  const adjusted = !/not yet adjusted/i.test(sheet) && /adjusted for the/i.test(sheet);
  const iceRow = await page.evaluate(() => [...document.querySelectorAll('.sheet .fitem, .sheet li, .sheet .frow')]
    .map((e) => (e.innerText || '').replace(/\s+/g, ' '))
    .find((t) => /^Ice\b/i.test(t)) || '');
  if (adjusted) expect(iceRow, 'an adjusted line names the basis of its adjustment').toMatch(/area average/);
  else expect(iceRow, 'an unadjusted line claims no regional basis').not.toMatch(/area average/);
});

test('sub-dollar rates keep their cents, whole-dollar rates stay whole', async ({ page }) => {
  // Both halves of the rule on one screen, so a future "just use toFixed(2)"
  // that turns "$3–$8/drinks" into "$3.00–$8.00/drinks" fails here.
  // LITERALS REPLACED BY THE RULE THEY STOOD FOR, 2026-09-27. These pinned
  // "$0.30–$0.60/buns" and "$3.20–$8/drinks" — exact strings that only held
  // while no regional factor applied. Once f558376c let the state resolve,
  // the same rows render $0.29–$0.59 and the test failed on arithmetic that
  // was correct. The rule it exists for never mentioned those numbers: a rate
  // under a dollar must keep its cents, and a whole-dollar rate must not grow
  // a fake ".00". Both are now asserted as properties of every rate on the
  // screen, so they survive any legitimate re-pricing and still catch the
  // "just use toFixed(2)" regression.
  const r = await openList(page).then(() => rates(page));
  expect(r.length).toBeGreaterThan(8);

  const bounds = r.flatMap((s) => s.match(/\$[\d,]+(?:\.\d{2})?/g) || []);
  const subDollar = bounds.filter((b) => /^\$0(?:\.|$)/.test(b));
  expect(subDollar.length, `no sub-dollar rate on screen to test the rule with: ${JSON.stringify(r)}`)
    .toBeGreaterThan(0);
  // A sub-dollar bound that lost its cents reads "$0" — the original defect.
  for (const b of subDollar) expect(b).toMatch(/^\$0\.\d{2}$/);
  // …and nothing grew a decorative ".00".
  for (const s of r) expect(s).not.toMatch(/\.00(?:[–/]|$)/);
});
