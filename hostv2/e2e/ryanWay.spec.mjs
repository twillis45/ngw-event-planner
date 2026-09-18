// ─── THE RYAN WAY SEED — one host sentence, end to end ───────────────────────
//
// Host seed, typed live 2026-09-18:
//
//   "Big game this Sunday at 1 pm at 8100 Ryan Way, Greenbelt MD. For 5 people."
//
// It found TWO defects that 446 green suites did not:
//
//   1. bare "Big game" (no article) routed to Day Party — the sports pattern
//      required `the big game`
//   2. the street was stored correctly at creation and NO venue surface could
//      see it, so the plan went on asking where the event was
//
// (2) needed SIX fixes, not one, because six places each kept their own copy of
// "is the venue set?". Fixing the reader was not enough; fixing the blocker
// un-suppressed a card that had only ever been hidden BY the blocker. That is
// why this is an e2e and not a unit test: the unit tests all passed while the
// host was still being asked, and only driving the real screens showed it.
//
// The source-text half — "no line re-derives the verdict from vf.name" — lives
// in src/lib/__tests__/creationAddressCarries.test.js, which is the right shape
// for a claim about code rather than behavior.
import { test, expect } from '@playwright/test';
import { settled } from './fixtures.mjs';

const SEED = 'Big game this Sunday at 1 pm at 8100 Ryan Way, Greenbelt MD. For 5 people.';

// EVERY known venue-ask wording, not one surface's. The first version of this
// walk passed while a second surface was still asking, because it grepped only
// the reveal engine's string. A check that names one surface proves one surface.
const VENUE_ASKS = [
  'Where is the event',
  'Where is it happening',
  'Everything depends on venue',
  'Everything hangs off the venue',
  'Add the location',
  'Name the venue',
];

const create = async (page, text) => {
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* private mode */ } });
  await page.goto('./');
  await settled(page);
  await page.getByText('Start my event', { exact: false }).first().click();
  await page.getByPlaceholder(/crab feast/i).first().fill(text);
  await page.getByText('Say it', { exact: false }).first().click();
  await expect(page.getByText('Put my plan together', { exact: false }).first()).toBeVisible({ timeout: 15000 });
};

const appText = (page) => page.evaluate(() => document.querySelector('.app')?.innerText || '');

test.describe('the Ryan Way seed', () => {
  test('bare "Big game" routes to Watch Party and the street survives', async ({ page }) => {
    await create(page, SEED);
    const review = await appText(page);
    expect(review).toContain('Watch');
    // The street echoed back at review: it WAS being stored correctly before
    // this fix, and the host had no way to know — silence reads as dropped.
    expect(review).toContain('8100 Ryan Way');

    // The record is not persisted until the plan is built, so submit FIRST.
    // Reading it at the review screen returns null — which is the test being
    // wrong about when state exists, not the app failing to store it.
    await page.getByText('Put my plan together', { exact: false }).first().click();
    await expect(page.getByText('Open your plan', { exact: false }).first()).toBeVisible({ timeout: 20000 });

    const stored = await page.evaluate(() => {
      let found = null;
      for (const k of Object.keys(localStorage)) {
        const raw = localStorage.getItem(k) || '';
        if (!raw.trim().startsWith('{') && !raw.trim().startsWith('[')) continue;
        try {
          const o = JSON.parse(raw);
          for (const c of (Array.isArray(o) ? o : [o])) {
            if (c && typeof c === 'object' && 'venueAddress' in c) found = c;
          }
        } catch (e) { /* not ours */ }
      }
      return found && { type: found.type, venue: found.venue, venueAddress: found.venueAddress, startTime: found.startTime, startTimeSource: found.startTimeSource };
    });
    expect(stored).toBeTruthy();
    expect(stored.type).toBe('Watch Party');
    expect(stored.venueAddress).toBe('8100 Ryan Way');
    expect(stored.venue).toBe('');                 // the premise: a street, no venue NAME
    expect(stored.startTime).toBe('1:00 PM');      // her hour, not one we invented
    expect(stored.startTimeSource).toBe('host');
  });

  test('no surface asks for a venue the plan already knows', async ({ page }) => {
    await create(page, SEED);
    await page.getByText('Put my plan together', { exact: false }).first().click();
    await expect(page.getByText('Open your plan', { exact: false }).first()).toBeVisible({ timeout: 20000 });

    const reveal = await appText(page);
    for (const ask of VENUE_ASKS) expect(reveal, `reveal asks "${ask}"`).not.toContain(ask);

    await page.getByText('Open your plan', { exact: false }).first().click();
    await settled(page);
    const plan = await appText(page);
    expect(plan.length).toBeGreaterThan(200);
    for (const ask of VENUE_ASKS) expect(plan, `plan asks "${ask}"`).not.toContain(ask);
  });

  // THE NEGATIVE CONTROL, and it is not optional. Every assertion above is an
  // absence, and absences pass for the wrong reason all the time — a selector
  // that stopped matching, a screen that never rendered. This proves the asks
  // still fire when the app genuinely does not know where the event is.
  test('an event with no location is still asked', async ({ page }) => {
    await create(page, 'Birthday party next Saturday for 12 people.');
    await page.getByText('Put my plan together', { exact: false }).first().click();
    await expect(page.getByText('Open your plan', { exact: false }).first()).toBeVisible({ timeout: 20000 });
    const reveal = await appText(page);
    expect(VENUE_ASKS.some((a) => reveal.includes(a))).toBe(true);
  });
});
