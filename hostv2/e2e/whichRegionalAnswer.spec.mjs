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

// ── WHETHER THIS PLAN WAS ADJUSTED AT ALL, AND IT DEPENDS ON THE BACKEND ──
//
// The regional factor comes from a live BLS proxy. CI builds against
// `https://e2e-mock.invalid`, so the fetch fails and `foodPrices` correctly
// degrades to factor 1 — the sheet then says "National average · NOT YET
// adjusted for the South". A local build picks up `.env.local`, which points
// at PROD, gets a real ~0.98, and says "Adjusted for the South".
//
// THE FIRST VERSION OF THIS FILE DID NOT KNOW THAT, and its premise test
// matched /Adjusted for the South/i — which also matches "not yet ADJUSTED
// FOR THE SOUTH". It passed in CI on the exact opposite of the condition it
// claimed to establish, while three real assertions below it went red: 28
// failures, all mine, on a suite that was green on this machine.
//
// So the invariant is CONDITIONAL, and that is the honest shape: whichever
// way the network went, the sheet must not claim more than it did.
const wasAdjusted = (txt) => !/not yet adjusted/i.test(txt) && /adjusted for the/i.test(txt);

test('PREMISE: the sheet states plainly whether it adjusted, one way or the other', async ({ page }) => {
  await openList(page);
  const txt = await sheetText(page);
  expect(txt).toMatch(/adjusted for the/i);   // it says SOMETHING about region
});

test('a line priced from the region’s basket says so — and an unadjusted plan claims nothing', async ({ page }) => {
  await openList(page);
  const txt = await sheetText(page);
  if (!wasAdjusted(txt)) {
    // No factor, no second quality of answer, and therefore no marker. The
    // negative half matters as much: an unadjusted plan must not wear a
    // regional badge it did not earn.
    expect(txt).not.toMatch(/area average/);
    expect(txt).not.toMatch(/own BLS price/);
    return;
  }
  expect(txt).toMatch(/area average/);
});

test('ICE — the line with no published price of its own — carries the marker', async ({ page }) => {
  // The concrete case the board sat on. Ice has no BLS series: geoAdjust
  // returns factor 1 and national:true, and the plan engine imputes the
  // basket mean anyway. That is legitimate — it is roughly how official
  // statistics handle an unpriced item — but an imputed number may not wear
  // a label implying it was measured.
  await openList(page);
  const txt = await sheetText(page);
  const ice = await page.evaluate(() => [...document.querySelectorAll('.sheet .fitem, .sheet li, .sheet .frow')]
    .map((e) => (e.innerText || '').replace(/\s+/g, ' '))
    .find((t) => /^Ice\b/i.test(t)) || null);
  expect(ice, 'the ice row is on the screen at all').toBeTruthy();
  if (!wasAdjusted(txt)) { expect(ice).not.toMatch(/area average/); return; }
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
  if (!wasAdjusted(txt)) { expect(txt).not.toMatch(/basket stood in/); return; }
  expect((txt.match(/basket stood in/g) || []).length).toBe(1);
  expect(txt).not.toMatch(/no published price for this line itself[\s\S]*no published price for this line itself/);
});

test('THE REGIONAL SEAT\'S FINDING: ice tells the host what to actually buy', async ({ page }) => {
  // Nobody buys 46 pounds of ice. The board's Maryland crab-house operator was
  // the only seat that saw it, and it is the reason a regional practitioner
  // was added to a panel about arithmetic.
  //
  // The line is STILL priced per pound — that is what its cost evidence
  // measured (ice-retail-2026 / ice-warehouse-2026, five of six cited bags at
  // 20lb) — so no total moves. This asserts the hint is beside the quantity
  // AND that the money did not change with it.
  await openList(page);
  const ice = await page.evaluate(() => [...document.querySelectorAll('.sheet .fitem, .sheet li, .sheet .frow')]
    .map((e) => (e.innerText || '').replace(/\s+/g, ' '))
    .find((t) => /^Ice\b/i.test(t)) || '');
  expect(ice).toMatch(/\d+ lbs?/);                       // still priced by weight
  expect(ice).toMatch(/about \d+ × 20 lb bags?/);        // …and shoppable
  expect(ice).toMatch(/\$0\.\d{2}–\$0\.\d{2}\/lb/);      // the rate is untouched
});

test('NEGATIVE CONTROL: nothing else priced by the pound grew a bag', async ({ page }) => {
  // The guardrail this repo already keeps: "serving", "piece" and "lb" are
  // legitimate units and a blanket re-uniting would be over-reach. Ribs are
  // bought by the pound at a counter.
  await openList(page);
  const rows = await page.evaluate(() => [...document.querySelectorAll('.sheet .fitem, .sheet li, .sheet .frow')]
    .map((e) => (e.innerText || '').replace(/\s+/g, ' ')));
  const withBags = rows.filter((t) => /× 20 lb bag/.test(t));
  expect(withBags.length).toBe(1);
  expect(withBags[0]).toMatch(/^Ice\b/i);
});
