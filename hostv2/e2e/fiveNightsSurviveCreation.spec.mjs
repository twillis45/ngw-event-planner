// THE OWNER'S OWN SEED, END TO END (host report 2026-09-29).
//
//   "50th birthday nov 2027 8 couples 5 nights Disneyland 2 excursions
//    airbnb accomodations"
//
// The parser has heard "5 nights" since 2026-09-25. The creation flow never
// wrote it down, so the reveal read "Where Everyone Stays — Not picked yet."
// while the Santa Fe 80th, one sentence away in the same drive, read "Not
// picked yet · 3 nights to cover." The difference was never the destination:
// Santa Fe gave a DAY, so the count fell out of date→endDate arithmetic, and
// a month cannot do that.
//
// WHY THIS IS AN E2E AND NOT ANOTHER JEST CASE. The jest file
// (theHostSaidFiveNights) covers the parser, eventSpan and the reveal
// composer — every part except the one that was actually broken. The fault was
// a missing WRITE in the shell, and a test on the engine cannot fail on it:
// pass a `statedNights` into buildAssembleRevealStages by hand and the card is
// perfect whether or not any host can ever get one there. That is the gap this
// repo has already paid for once. So the seed goes in the box a host types in,
// and the assertion reads the screen that host lands on.
import { test, expect } from '@playwright/test';

const SEED = '50th birthday nov 2027 8 couples 5 nights Disneyland 2 excursions airbnb accomodations';

test('a month, no day, and five nights — the reveal still knows it is five nights', async ({ page }) => {
  test.setTimeout(120000);
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* private mode */ } });
  await page.goto('./?elegant=1');

  await page.getByText(/Start my event/i).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill(SEED);
  await page.getByText(/^Say it/i).first().click();

  // The confirm screen has to have heard the month and NOT invented a day —
  // if it ever resolves one, date→endDate carries the span and this whole
  // branch stops being the thing under test.
  await expect(page.getByText(/Nov 2027 · pick a day/i).first()).toBeVisible({ timeout: 20000 });

  await page.getByText(/Put my plan together/i).first().click();

  const card = page.getByText(/Where Everyone Stays/i).first();
  await card.waitFor({ state: 'visible', timeout: 30000 });
  await expect(page.getByText(/Not picked yet · 5 nights to cover\./).first())
    .toBeVisible({ timeout: 20000 });
});

test('and it never invents one — a seed with no duration says nothing about nights', async ({ page }) => {
  // The negative control. Without it this file would pass on a shell that
  // hardcoded the sentence, and "5 nights to cover" would be decoration.
  test.setTimeout(120000);
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* private mode */ } });
  await page.goto('./?elegant=1');

  await page.getByText(/Start my event/i).first().click();
  await page.getByPlaceholder(/crab feast/i).first()
    .fill('50th birthday nov 2027 8 couples Disneyland airbnb accomodations');
  await page.getByText(/^Say it/i).first().click();
  await page.getByText(/Put my plan together/i).first().click();

  await page.getByText(/Where Everyone Stays/i).first().waitFor({ state: 'visible', timeout: 30000 });
  await expect(page.getByText(/Not picked yet\./).first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(/nights to cover/)).toHaveCount(0);
});

// ── AND THE PAIRING SURVIVES IT TOO (2026-10-03) ───────────────────────────
// Same seed, same seam, same class of defect one field over. "8 couples" was
// multiplied into sixteen guests and then DISCARDED, so lodgingIntel's
// bedroomsNeeded had to assume double occupancy to answer "how many
// bedrooms" — and said so on screen, announcing an assumption about a fact
// this host had already stated in the box they typed in.
//
// E2E for exactly the reason the file header gives: jest covers the parser
// and the engine, and the broken part was the WRITE in between. A test on
// either end passes whether or not a host can ever get a value through.
test('the PAIRING survives creation too — "8 couples" is a fact, not just a multiplier', async ({ page }) => {
  test.setTimeout(120000);
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* private mode */ } });
  await page.goto('./?elegant=1');

  await page.getByText(/Start my event/i).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill(SEED);
  await page.getByText(/^Say it/i).first().click();
  await page.getByText(/Put my plan together/i).first().click();
  await page.getByText(/Where Everyone Stays/i).first().waitFor({ state: 'visible', timeout: 30000 });

  // Read what was actually WRITTEN, not what the screen renders — the whole
  // defect was a field that never reached storage.
  const ev = await page.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]');
    const id = localStorage.getItem('ngw-hostv2-last-event');
    return list.find((e) => e.id === id) || list[list.length - 1] || null;
  });

  expect(ev, 'the created event is in storage').toBeTruthy();
  // UNCHANGED, and asserted so the pairing can never start double-counting:
  // eight couples is sixteen people, not thirty-two.
  expect(Number(ev.guestEstimate)).toBe(16);
  // NEW: the pairing itself, which is what turns the bedroom count from an
  // assumption the host reads about into a derivation from their own words.
  expect(ev.guestPairs).toBe(8);
});
