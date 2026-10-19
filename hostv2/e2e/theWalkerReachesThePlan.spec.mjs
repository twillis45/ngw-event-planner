// ─── "SHE USES A WALKER" REACHES THE PLAN (P1-2) ────────────────────────────
//
// The acceptance case Sprint 0 named, proven where it actually counts: on
// screen. `HostShellV2:9455` records the original defect in the host's own
// terms — she typed "…sit-down lunch, she uses a walker", both halves vanished,
// and "for an 80th, mobility is the constraint that decides venue access,
// seating and where the cake table goes."
//
// WHAT THIS PROVES, AND WHAT IT DELIBERATELY DOES NOT.
//
// Proves: a normalized `accessNeeds` entry — the shape the creation seam now
// writes from her sentence (HostShellV2:8224, the same seam and rule as
// `lodgingWants` directly above it) — changes what the host SEES in the house
// requirements. Not a field in storage; a line on the screen.
//
// Does not: drive the creation flow itself. Four specs that do are listed in
// playwright.config's VIEWPORT_INDEPENDENT block for timing a shard out at
// 30m19s, and the sentence→field half is already pinned by 26 unit tests in
// `oneAccessNeedOneAnswer.test.js`. This file owns the half jest cannot reach.
//
// THE COPY IS THE POINT, not just the chip. "Someone asked about stairs" is
// correct for a need stated at intake about a person who is not a roster row —
// the honoree rarely RSVPs to her own party. A redesign that renders this as a
// named guest would be inventing one.
import { test, expect, settled, dateIn } from './fixtures.mjs';

const SANTA_FE = (over = {}) => ({
  id: 'e2e-walker', name: "Mom's 80th", type: 'Birthday',
  date: dateIn(45), endDate: dateIn(49),
  // A real destination basis — a guessed one would be downgraded to null by
  // the P0-1 invariant and the travel stack would never render.
  isDestination: true, destinationBasis: 'travel-language',
  venueCity: 'Santa Fe', state: 'NM',
  guestMode: 'list', totalBudget: 6000, budget: [], vendors: [],
  guests: Array.from({ length: 8 }, (_, i) => ({ id: `g${i}`, name: `G${i}`, rsvp: 'Yes' })),
  ...over,
});

// Exactly what `heardAccessNeeds("…, she uses a walker")` returns.
const WALKER = [{ kind: 'step-free', phrase: 'she uses a walker', source: 'host-said' }];

const boot = async (page, ev) => {
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1');
  await settled(page);
  // The travel stack renders inline under its own section rather than in a
  // `.sheet`, so this opens the section and then reads the page.
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('button,[role="button"],a')]
      .find((x) => (x.innerText || '').trim() === 'Travel & where everyone stays');
    if (el) el.click();
  });
  await page.waitForTimeout(2000);
  return page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));
};

test('an access need stated at intake becomes a house requirement on screen', async ({ page }) => {
  const body = await boot(page, SANTA_FE({ accessNeeds: WALKER }));

  expect(body, 'the requirements block is on screen at all').toMatch(/WHAT THE HOUSE NEEDS/i);
  // The ✓ is the discriminator, not the label. Every must-have in the
  // vocabulary is RENDERED as a choosable option whether or not it applies —
  // found by this file's own negative control, which failed on a bare
  // /Step-free access/ and was right to.
  expect(body, 'and step-free is one the plan actually asked for').toMatch(/✓ Step-free access/);
  // The reason is given in the host's terms, and attributed to a person we were
  // never told the name of — "Someone", not a guest invented off the roster.
  expect(body).toMatch(/Someone asked about stairs/i);
  expect(body).toMatch(/ground-floor bed and bath/i);
});

test('NEGATIVE CONTROL — the same event without the clause does not ask for one', async ({ page }) => {
  // Without this the test above would pass on an app that asks every group
  // house for a ground floor, which would make the whole feature meaningless.
  const body = await boot(page, SANTA_FE());
  expect(body, 'the requirements block still renders').toMatch(/WHAT THE HOUSE NEEDS/i);
  expect(body, 'but nothing SELECTS a step-free need nobody stated').not.toMatch(/✓ Step-free access/);
  expect(body, 'and no reason is given for one').not.toMatch(/asked about stairs/i);
});
