// ─── A "BAKE IT" BUTTON FOR A HOST WITH NO OVEN ──────────────────────────────
//
// Screen census of the Santa Fe 80th, room block answered. The Calls-to-make
// screen offered "Cake: bake, order, or cupcakes?" with **Bake it** live and
// tappable, while the food sheet said "there is no kitchen to cook in". A
// control the host cannot act on is worse than a wrong number — they can tap
// it, and tapping it would then inject the cook lever on top.
//
// Engine proof: src/lib/__tests__/aBakeItButtonInAHotelRoom.test.js. This drives
// it, because jest cannot execute hostv2 and a tappable button is a screen fact.
import { test, expect, settled } from './fixtures.mjs';

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 50);
}, src);

const labels = (page) => page.evaluate(() => [...document.querySelectorAll('button,[role="button"],a')]
  .map((x) => (x.innerText || '').trim().replace(/\s+/g, ' ')).filter(Boolean));
const bodyText = (page) => page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));

const openCalls = async (page, pick) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((p) => {
    const ev = {
      id: 'e2e-oven', name: 'Mom’s 80th', type: 'Birthday',
      date: '2027-06-17', endDate: '2027-06-21',
      isDestination: true, venueCity: 'Santa Fe', state: 'NM',
      guestMode: 'count', guestCount: 10, totalBudget: 4000,
      budget: [], vendors: [], guests: [],
      // `cake` dependsOn ['theme','headcount'], so without a theme the row reads
      // "Waiting on the theme" and renders NO options at all — measured, after a
      // first pass whose premise failed for exactly that reason.
      foodChoices: { theme: 'Milestone (decade) theme', ...(p ? { dest_lodging: p } : {}) },
    };
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-oven');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, pick);
  await page.goto('?elegant=1');
  await settled(page);
  await tapText(page, 'Calls to make');
  await page.waitForTimeout(1600);
  await settled(page);
  // THE ALTERNATIVES ARE COLLAPSED. The card shows only the engine's recommended
  // pick ("Order a cake · our pick") with every other option behind an "Other
  // ways" disclosure — so a spec that reads the card as landed finds no "Bake
  // it" for ANYONE and its absence proves nothing. Measured, after a first pass
  // whose premise failed for exactly that reason. Every disclosure on the screen
  // is opened rather than the first, so nothing rides on card ordering.
  // Match the COLLAPSED glyph only. The toggle relabels "Other ways \u25b8" ->
  // "Other ways \u25be" when it opens, so a selector on the bare words matches the
  // open one too and the next pass closes what the last one opened — measured,
  // after a loop that did exactly that and left the panel shut.
  for (let i = 0; i < 6; i++) {
    if (!(await tapText(page, 'Other ways \u25b8'))) break;
    await page.waitForTimeout(600);
  }
  await settled(page);
};

test('(premise) the cake decision really is on the Calls screen', async ({ page }) => {
  // Without this every absence below could just mean the screen never opened.
  await openCalls(page, 'A house we rent for everyone');
  const t = await bodyText(page);
  expect(t).toMatch(/cake/i);
  expect((await labels(page)).some((x) => /^Bake it$/i.test(x))).toBe(true);
});

test('a room block is never shown a Bake it button', async ({ page }) => {
  await openCalls(page, 'A room block I guarantee fills');
  expect((await labels(page)).some((x) => /^Bake it$/i.test(x))).toBe(false);
});

test('the heading no longer offers an option that is not there', async ({ page }) => {
  // It read "Cake: bake, order, or cupcakes?" above a list with no Bake button.
  await openCalls(page, 'A room block I guarantee fills');
  expect(await bodyText(page)).not.toMatch(/Cake: bake/i);
});

test('the decision itself survives — only the cooking option went', async ({ page }) => {
  // The over-correction: pruning so hard the host loses the decision.
  await openCalls(page, 'A room block I guarantee fills');
  const l = await labels(page);
  // Not /^Order a cake$/ — the engine's recommended option renders with its
  // "our pick" tag appended, so an anchored match finds nothing. Measured.
  expect(l.some((x) => /^Order a cake\b/i.test(x))).toBe(true);
  expect(l.some((x) => /^Cupcakes$/i.test(x))).toBe(true);
});

test('NEGATIVE CONTROL: an UNTOLD kitchen keeps Bake it', async ({ page }) => {
  await openCalls(page, null);
  expect((await labels(page)).some((x) => /^Bake it$/i.test(x))).toBe(true);
});
