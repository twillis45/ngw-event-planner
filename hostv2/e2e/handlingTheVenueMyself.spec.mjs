// ─── "PICK THE PLACE IN SANTA FE." — EVERY SINGLE OPEN ───────────────────────
//
// The venue blocker reaches the hero at EVERY urgency, where every other
// blocker needs `critical`. Right for a host choosing a venue; wrong for the
// host who already has one or is booking through a resort. Host ruling
// 2026-09-22: "this needs a way to be parked or preempted with 'are you
// choosing a venue through app'."
//
// The persistence already existed (`event.decisionBlockerStatus`) and was
// already read — what was missing was a WRITER reachable from hostv2, since
// only the frozen CRA shell ever set it. Engine proof:
// src/lib/__tests__/notThroughYouImHandlingTheVenue.test.js. This drives the
// round trip, because the whole point is a control a host can reach.
import { test, expect, settled, dateIn } from './fixtures.mjs';

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || x.textContent || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}, src);
const labels = (page) => page.evaluate(() => [...document.querySelectorAll('button,[role="button"],a')]
  .map((x) => (x.innerText || '').trim().replace(/\s+/g, ' ')).filter(Boolean));
const bodyText = (page) => page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));

const openBoard = async (page, days = 240) => {
  await page.setViewportSize({ width: 390, height: 844 });
  // A FIXED NUMBER OF DAYS OUT, not a fixed date (CI, 11/20/2026): at 209 days
  // the "How are guests staying?" call passes its window and rightly leads the
  // board, so a fixed June 2027 date aged out of the scenario this file tests.
  await page.addInitScript(([start, end]) => {
    const ev = {
      id: 'e2e-venue', name: 'Mom’s 80th', type: 'Birthday',
      date: start, endDate: end,
      isDestination: true, venueCity: 'Santa Fe', state: 'NM',
      guestMode: 'count', guestCount: 10, totalBudget: 4000,
      budget: [], vendors: [], guests: [],
    };
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-venue');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, [dateIn(days), dateIn(days + 4)]);
  await page.goto('?elegant=1');
  await settled(page);
};

test('(premise) the board really does lead with the venue', async ({ page }) => {
  // Everything below asserts this goes away. If it was never here, nothing means
  // anything.
  await openBoard(page);
  expect(await bodyText(page)).toMatch(/Pick the place in Santa Fe/i);
});

test('the escape hatch is on the card, before anything is typed', async ({ page }) => {
  // "Preempted", per the ruling — the host should not have to try and fail
  // first. The control sits with the venue input itself.
  await openBoard(page);
  expect((await labels(page)).some((x) => /I.ll sort this/i.test(x))).toBe(true);
});

test('parking stops the board leading with the venue', async ({ page }) => {
  await openBoard(page);
  await tapText(page, 'I.ll sort this');
  await page.waitForTimeout(1600);
  await settled(page);
  expect(await bodyText(page)).not.toMatch(/Pick the place in Santa Fe/i);
});

test('PARKING IS NOT ANSWERING — the plan still shows the venue unknown', async ({ page }) => {
  // The dangerous version of this feature is one that quietly marks the venue
  // handled. The parts meter must be unmoved, and the card must say so.
  await openBoard(page);
  const before = (await bodyText(page)).match(/(\d+) of (\d+) plan parts handled/i);
  await tapText(page, 'I.ll sort this');
  await page.waitForTimeout(1600);
  await settled(page);
  const t = await bodyText(page);
  const after = t.match(/(\d+) of (\d+) plan parts handled/i);
  expect(after && after[0]).toBe(before && before[0]);
  expect(t).toMatch(/we don.t know the place yet/i);
});

test('it is reversible, and the parked state says so while it lasts', async ({ page }) => {
  await openBoard(page);
  await tapText(page, 'I.ll sort this');
  await page.waitForTimeout(1600);
  await settled(page);
  expect(await bodyText(page)).toMatch(/Parked — you.re sorting the venue yourself/i);
  // Owner, 11/16/2026: once parked, the card stops asking and points at nothing
  // that is not there ("unanswered above" named no item above it).
  expect(await bodyText(page)).toMatch(/Venue: you.re handling it/);
  expect(await bodyText(page)).not.toMatch(/Where is it happening\?|unanswered above/);
  expect(await bodyText(page)).toMatch(/still counts as unanswered in your plan/);

  // The undo says what it does: it puts the venue back on the list. It never
  // promises to FIND one (11/16/2026) — the app has no venue search.
  expect(await bodyText(page)).not.toMatch(/help (me|you) find/i);
  await tapText(page, 'Put it back on my list');
  await page.waitForTimeout(1600);
  await settled(page);
  const t = await bodyText(page);
  expect(t).toMatch(/Pick the place in Santa Fe/i);
  expect(t).not.toMatch(/help (me|you) find/i);
});


// 50-host run (11/16/2026): parked, then the host names the place after all.
test('naming the venue after parking it ends the parking', async ({ page }) => {
  await openBoard(page);
  await tapText(page, 'I.ll sort this');
  await page.waitForTimeout(1200);
  const box = page.locator('article input[data-venue-field]:visible').first();
  await box.click(); await page.keyboard.type('House of Blues Anaheim', { delay: 5 });
  await box.locator('xpath=../..').getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(1200);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]')[0] || {});
  expect(stored.venue).toBe('House of Blues Anaheim');
  expect((stored.decisionBlockerStatus || {})['venue-selection']).toBeUndefined();
});


// ── THE VENUE LEADS THE STAY (owner rulings 11/20/2026: "Approve", then
// "Venue leads both") ─────────────────────────────────────────────────────────
// At 209 days out "How are guests staying?" and "How many guests are traveling
// in?" have both passed their T-210d window, and they used to lead the board
// over the venue. While the venue is open it goes first; both decisions still
// show beneath it with their window notes. Engine proof:
// src/lib/__tests__/venueLeadsStay.test.js.
test('past the stay window, an open venue still leads — the stay comes after', async ({ page }) => {
  await openBoard(page, 209);
  const h2 = (await page.locator('h2:visible').first().innerText()).trim();
  expect(h2).toMatch(/Pick the place in Santa Fe/i);
  const t = await bodyText(page);
  expect(t).toMatch(/How are guests staying[^]*?past its window/i);
  expect(t).toMatch(/How many guests are traveling in[^]*?past its window/i);
  // The stay is the next row in "Then, in order".
  const then = t.slice(t.search(/Then, in order/i));
  expect(then.search(/How are guests staying/i)).toBeGreaterThan(-1);
  expect(then.search(/How are guests staying/i)).toBeLessThan(then.search(/How many guests are traveling in/i));
});

test('once a venue is typed, the stay leads as before', async ({ page }) => {
  await openBoard(page, 209);
  const box = page.locator('article input[data-venue-field]:visible').first();
  await box.click(); await page.keyboard.type('La Fonda on the Plaza', { delay: 5 });
  await box.locator('xpath=../..').getByRole('button', { name: 'Save' }).click();
  await page.waitForTimeout(1200);
  await settled(page);
  const h2 = (await page.locator('h2:visible').first().innerText()).trim();
  expect(h2).toMatch(/How are guests staying/i);
  expect(await bodyText(page)).not.toMatch(/Pick the place in Santa Fe/i);
});
