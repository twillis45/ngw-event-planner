// ─── THE ONE REAL EVENT ON THE DEVICE WAS THE HARDEST ROW TO FIND ──────────
//
// Measured on the live list 2026-09-27, before the fix: 17 rows, 13 of them
// tagged Sample, and "My Graduation · current" at index 15 — the host scrolled
// past a Retirement Party, a Wedding, a Repast, a Crab Feast, The Cookout,
// Game Night, a Team Retreat, a Dinner Party and two Reunions to reach the only
// event that was actually theirs. Directly under it: "Delete this event."
//
// It was not an ordering mistake, which is why looking at the list would not
// have explained it. `REAL_EVENTS` is defined with `!isStoredCustomId(e.id)`:
// an event the host created ON THIS DEVICE is excluded from the "Yours" shelf
// by construction, so it could only render in the sample list below it. The
// comment in that block said "a locally-created event is no less the host's"
// while putting it last.
//
// This gate is about POSITION, not about the string. It fails if the host's own
// event sits below any sample, however the shelves are labeled.
import { test, expect } from './fixtures.mjs';

const MINE = 'My Graduation';

const seed = async (page) => {
  await page.addInitScript((name) => {
    if (localStorage.getItem('ngw-hostv2-last-event') === 'e2e-mine') return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-mine', name, type: 'Graduation', date: '2027-05-30',
      venueCity: 'Annapolis', state: 'MD', guestMode: 'count', guestCount: 24,
      totalBudget: 1800, budget: [], vendors: [], guests: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-mine');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, MINE);
};

// TWO TAPS, WHICH IS ITSELF PART OF THE FINDING. On a phone there is no
// direct control: the masthead opens "Jump to", and "This event" inside it
// opens the list. Measured, not recalled — `.ev-kicker` and `.srail-row` are
// desktop-only, and reaching for them is why the first version of this file
// failed all four tests at the door and looked like a product fault.
const openTheList = async (page) => {
  await seed(page);
  await page.goto('?elegant=1');
  await page.locator('.ev-eyebrow').first().click();
  await page.locator('.navrow', { hasText: 'This event' }).first().click();
  await expect(page.getByRole('heading', { name: 'Your events' })).toBeVisible({ timeout: 15000 });
};

// Every row in the sheet, in the order a host scrolls them.
const rows = (page) => page.locator('.sheet .frow');

test('PREMISE: the list really is mostly samples', async ({ page }) => {
  // Without this the position test could pass on an empty or one-row list,
  // which is not the situation the finding was about.
  await openTheList(page);
  const all = await rows(page).count();
  const samples = await page.locator('.sheet .frow', { hasText: 'Sample' }).count();
  expect(all).toBeGreaterThan(10);
  expect(samples).toBeGreaterThan(8);
});

test("the host's own event comes before every sample", async ({ page }) => {
  await openTheList(page);
  const texts = await rows(page).allInnerTexts();
  const mine = texts.findIndex((t) => t.includes(MINE));
  const firstSample = texts.findIndex((t) => /\bSample\b/.test(t));

  expect(mine, 'the host’s own event is in the list at all').toBeGreaterThan(-1);
  expect(firstSample, 'samples are in the list at all').toBeGreaterThan(-1);
  expect(mine).toBeLessThan(firstSample);
});

test('it is the FIRST row, and it is not itself tagged Sample', async ({ page }) => {
  await openTheList(page);
  const first = rows(page).first();
  await expect(first).toContainText(MINE);
  await expect(first).toContainText('current');
  await expect(first).not.toContainText('Sample');
});

test('NEGATIVE CONTROL: no sample offers to be deleted', async ({ page }) => {
  // The delete control moved shelves with the events it acts on. A sample is
  // not the host's to lose, and a row offering to delete one offers a
  // meaningless act — worse, it sat directly under their real event.
  await openTheList(page);

  // COUNTING THEM WAS NOT ENOUGH, and red-proofing caught that: with one
  // host-owned row in the seed, dropping the ownership check on that shelf
  // left the count at 1 and the test passed on the fault it existed to catch.
  // POSITION is the real property — every delete control belongs above the
  // "Samples" divider, whatever the counts happen to be.
  const pos = await page.evaluate(() => {
    const sheet = document.querySelector('.sheet');
    const labels = [...sheet.querySelectorAll('.shelf-label')];
    // CASE-INSENSITIVE: the shelf label is uppercased by CSS, so innerText
    // reads "SAMPLES". A case-sensitive match found nothing and failed the
    // whole test on its own premise.
    const samples = labels.find((l) => /^samples\b/i.test(l.innerText.trim()));
    const nodes = [...sheet.querySelectorAll('*')];
    const at = (el) => nodes.indexOf(el);
    return {
      samplesAt: samples ? at(samples) : -1,
      deletesAt: [...sheet.querySelectorAll('button')]
        .filter((b) => /Delete this event/.test(b.innerText || ''))
        .map(at),
      sampleRows: [...sheet.querySelectorAll('.frow')]
        .filter((r) => /\bSample\b/.test(r.innerText || '')).length,
    };
  });

  expect(pos.samplesAt, 'there is a Samples shelf to be below').toBeGreaterThan(-1);
  expect(pos.sampleRows).toBeGreaterThan(8);
  expect(pos.deletesAt.length, 'the host’s own event can be deleted').toBeGreaterThan(0);
  for (const d of pos.deletesAt) expect(d).toBeLessThan(pos.samplesAt);
});
