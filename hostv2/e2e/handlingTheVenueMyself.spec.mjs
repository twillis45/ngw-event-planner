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
import { test, expect, settled } from './fixtures.mjs';

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}, src);
const labels = (page) => page.evaluate(() => [...document.querySelectorAll('button,[role="button"],a')]
  .map((x) => (x.innerText || '').trim().replace(/\s+/g, ' ')).filter(Boolean));
const bodyText = (page) => page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));

const openBoard = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const ev = {
      id: 'e2e-venue', name: 'Mom’s 80th', type: 'Birthday',
      date: '2027-06-17', endDate: '2027-06-21',
      isDestination: true, venueCity: 'Santa Fe', state: 'NM',
      guestMode: 'count', guestCount: 10, totalBudget: 4000,
      budget: [], vendors: [], guests: [],
    };
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-venue');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
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
  expect((await labels(page)).some((x) => /I.m handling the venue myself/i.test(x))).toBe(true);
});

test('parking stops the board leading with the venue', async ({ page }) => {
  await openBoard(page);
  await tapText(page, 'I.m handling the venue myself');
  await page.waitForTimeout(1600);
  await settled(page);
  expect(await bodyText(page)).not.toMatch(/Pick the place in Santa Fe/i);
});

test('PARKING IS NOT ANSWERING — the plan still shows the venue unknown', async ({ page }) => {
  // The dangerous version of this feature is one that quietly marks the venue
  // handled. The parts meter must be unmoved, and the card must say so.
  await openBoard(page);
  const before = (await bodyText(page)).match(/(\d+) of (\d+) plan parts handled/i);
  await tapText(page, 'I.m handling the venue myself');
  await page.waitForTimeout(1600);
  await settled(page);
  const t = await bodyText(page);
  const after = t.match(/(\d+) of (\d+) plan parts handled/i);
  expect(after && after[0]).toBe(before && before[0]);
  expect(t).toMatch(/we don.t know the place yet/i);
});

test('it is reversible, and the parked state says so while it lasts', async ({ page }) => {
  await openBoard(page);
  await tapText(page, 'I.m handling the venue myself');
  await page.waitForTimeout(1600);
  await settled(page);
  expect(await bodyText(page)).toMatch(/Parked — you.re sorting the venue yourself/i);

  await tapText(page, 'Actually, help me find one');
  await page.waitForTimeout(1600);
  await settled(page);
  expect(await bodyText(page)).toMatch(/Pick the place in Santa Fe/i);
});
