// ─── "PROTECT THE MOMENT" — THREE TIMES, UNDER A SINGULAR LABEL ──────────────
//
// The command board stacked three `grounding` paragraphs. Measured on the Santa
// Fe 80th, the first two were the same moment said twice:
//
//   Protect the moment: The song starts and everyone turns to them at once.
//   Also worth protecting: The candles are lit and the room goes quiet before
//                          the song.
//   Also worth protecting: The toast from their best friend — the one they
//                          didn't expect.
//
// Two defects pulling opposite ways: too loud for a board whose job is what
// needs doing today, AND `.slice(0, 3)` silently dropped authored content —
// Birthday writes FIVE moments and this block is their only consumer anywhere in
// hostv2, so two appeared nowhere in the app. Cutting to one alone would have
// deepened that; the fold is what lets the board quieten without losing them.
import { test, expect, settled } from './fixtures.mjs';

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}, src);
const bodyText = (page) => page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));

const openBoard = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const ev = {
      id: 'e2e-moment', name: 'Mom’s 80th', type: 'Birthday',
      date: '2027-06-17', endDate: '2027-06-21',
      isDestination: true, venueCity: 'Santa Fe', state: 'NM',
      guestMode: 'count', guestCount: 10, totalBudget: 4000,
      budget: [], vendors: [], guests: [],
    };
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-moment');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
};

test('(premise) the board really does carry the moment line', async ({ page }) => {
  await openBoard(page);
  expect(await bodyText(page)).toMatch(/Protect the moment: The song starts/i);
});

test('THE FIX: the singular label is followed by exactly one moment', async ({ page }) => {
  await openBoard(page);
  const t = await bodyText(page);
  expect((t.match(/Protect the moment:/gi) || []).length).toBe(1);
  expect(t).not.toMatch(/Also worth protecting/i);
  // The second authored moment is specifically NOT stacked underneath.
  expect(t).not.toMatch(/The candles are lit and the room goes quiet/i);
});

test('the door names how many are behind it — and it is ALL of them', async ({ page }) => {
  // Birthday authors five. The old block showed three, so this number is also
  // the proof that the silent truncation is gone: 5 - 1 shown = 4.
  await openBoard(page);
  expect(await bodyText(page)).toMatch(/\+ 4 more worth protecting/i);
});

test('opening it brings back every authored moment, including the two the board never showed', async ({ page }) => {
  await openBoard(page);
  await tapText(page, 'more worth protecting');
  await page.waitForTimeout(1200);
  await settled(page);
  const t = await bodyText(page);
  expect(t).toMatch(/The candles are lit and the room goes quiet/i);
  expect(t).toMatch(/The toast from their best friend/i);
  // These two were authored and rendered NOWHERE in hostv2 before this change.
  expect(t).toMatch(/The moment they realize this many people came just for them/i);
  expect(t).toMatch(/They blow out the candles and look genuinely surprised/i);
  expect((t.match(/Also worth protecting/gi) || []).length).toBe(4);
});
