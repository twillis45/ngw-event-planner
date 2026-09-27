// ─── "ADJUSTED FOR THE SOUTH" COVERED TWO DIFFERENT CLAIMS ─────────────────
//
// Board ruling 2026-09-27, option A. Measured before it: the shopping sheet
// said "Adjusted for the South · BLS Aug 2026" once, globally, over lines that
// had got two different qualities of answer — some scaled by their own
// published BLS series, most by the region's whole-basket mean because BLS
// prices nothing like them. Ice is the extreme case: no series at all, and it
// rendered $0.20–$0.39 with nothing saying where the adjustment came from.
//
// THE FINDING THE BOARD CALLED THE IMPORTANT ONE is not about ice. The honest
// sentence had existed in priceLayers since the layers landed, and
// threeLayersOfPrice.test.js had been asserting it the whole time — against a
// string NO SURFACE RENDERED, because HostShellV2 drew the layer only when it
// was 'store' and returned null otherwise. The composition was tested; the
// delivery never was. A green test on a string nobody can read.
//
// So this file gates the DELIVERY. jest can prove the sentence exists; only a
// browser can prove a host sees it.
import { test, expect, settled } from './fixtures.mjs';

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || '').trim()));
  if (el) el.click();
  return !!el;
}, src);

// A ZIP, deliberately: the regional path only runs once a state resolves, and
// f558376c (2026-09-27) is the commit that made it resolve at all.
const openList = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-scope', name: 'The Cookout', type: 'The Cookout',
      date: '2027-06-17', venueCity: '21014',
      guestMode: 'count', guestCount: 20, totalBudget: 1200,
      budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-scope');
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
  await page.evaluate(() => [...document.querySelectorAll('.fg-head')].forEach((h) => h.click()));
  await page.waitForTimeout(900);
};

const sheetText = (page) => page.evaluate(() => (document.querySelector('.sheet') || {}).innerText || '');

test('PREMISE: a regional adjustment really is in play', async ({ page }) => {
  // Without this every assertion below could pass on a national plan, where
  // there is no second quality of answer to disclose and nothing to get wrong.
  await openList(page);
  expect(await sheetText(page)).toMatch(/Adjusted for the South/i);
});

test('a line priced from the region’s basket says so, on the row', async ({ page }) => {
  await openList(page);
  const txt = await sheetText(page);
  expect(txt).toMatch(/area average/);
});

test('ICE — the line with no published price of its own — carries the marker', async ({ page }) => {
  // The concrete case the board sat on. Ice has no BLS series: geoAdjust
  // returns factor 1 and national:true, and the plan engine imputes the
  // basket mean anyway. That is legitimate — it is roughly how official
  // statistics handle an unpriced item — but an imputed number may not wear
  // a label implying it was measured.
  await openList(page);
  const ice = await page.evaluate(() => [...document.querySelectorAll('.sheet .fitem, .sheet li, .sheet .frow')]
    .map((e) => (e.innerText || '').replace(/\s+/g, ' '))
    .find((t) => /^Ice\b/i.test(t)) || null);
  expect(ice, 'the ice row is on the screen at all').toBeTruthy();
  expect(ice).toMatch(/area average/);
});

test('the sentence is said ONCE, not on every row', async ({ page }) => {
  // The first build of this rendered priceLayers' full sentence verbatim on
  // every regional line: sixteen copies, the list twice as long, and a
  // two-line caveat at the same weight as the prices it qualified. That is
  // the exact failure this repo already fixed once on the food hero. The rows
  // carry two words; the explanation is said once, in the header.
  await openList(page);
  const txt = await sheetText(page);
  expect((txt.match(/basket stood in/g) || []).length).toBe(1);
  expect(txt).not.toMatch(/no published price for this line itself[\s\S]*no published price for this line itself/);
});
