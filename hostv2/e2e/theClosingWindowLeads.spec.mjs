// ─── THE RULING'S OWN CASE, ON THE SCREEN A HOST READS ───────────────────────
//
// The 2026-08-17 Ranking floor ruling closed with a bar: "the re-derived case
// inverts (reconfirm above the dead COI), AND a late critical item still
// outranks a scheduled one of higher raw consequence. Both directions, or the
// fix is half a fix."
//
// The second direction held. The first did not, for five weeks, because the
// reconfirm raise emitted no consequence signal at all and `latenessBoost` pays
// only for being PAST a window. A dead certificate 27 days late scored 4.90; a
// reconfirm whose window shuts in three days scored 0.00.
//
// Board decision 2026-09-23 (docs/audits/2026-09-23_CLOSING_WINDOW_RULING.md):
// add the axis the ruling seat named, paid on a DECLARED closing window rather
// than an inferred date range — because a raise knows whether its window
// reopens and the scorer cannot see that from two dates.
//
// DRIVEN, BECAUSE JEST CANNOT EXECUTE hostv2, and because the engine inverting
// is not the claim. The claim is that the ORDER A HOST READS inverted.
//
// ── WHY THIS FIXTURE USES "Deposit Paid" ───────────────────────────────────
// hostv2 demotes per-vendor confirm rows out of the queue unless exactly one
// vendor gates readiness (`rollup.counts.toConfirm === 1`) — a deliberate,
// pre-existing rule, documented at HostShellV2:3390. `Deposit Paid` is BOOKED
// and not CONFIRMED, which is the one state that admits the row. Measured
// first: with two Confirmed vendors the reconfirm is filtered out entirely and
// this spec would be asserting over a row the shell never renders.
import { test, expect, settled } from './fixtures.mjs';

const bodyText = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

const openBoard = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    // LOCAL calendar date, never toISOString(). MEASURED 2026-09-26: this spec
    // failed in the nightly full run and passed on a re-run seven hours later
    // with no code change. `toISOString()` is UTC, the board's day arithmetic
    // is local, so three-days-out became four whenever the two calendars
    // disagree — 8pm to midnight Eastern. CI runs in UTC and never sees it.
    const t = new Date(Date.now() + 3 * 864e5);
    const d = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-cw', name: 'Probe', type: 'Wedding', date: d,
      startTime: '3:00 PM', startTimeSource: 'host',
      guestMode: 'count', guestCount: 80, guests: [], totalBudget: 40000,
      venue: 'The Ironwood Room, Silver Spring, MD', venueCity: 'Silver Spring', state: 'MD',
      vendors: [{ id: 'v1', name: 'Ironwood', category: 'Venue', status: 'Deposit Paid', cost: 12000 }],
      budget: [{ category: 'Venue', budgeted: 12000 }],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-cw');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
  return bodyText(page);
};

test('(premise) both of the ruling’s rows are on the board a host sees', async ({ page }) => {
  // Without both, the ordering assertion below is about a screen that does not
  // exist — and the two-Confirmed-vendor case really does render only one of
  // them, which is why this premise is not decorative.
  const t = await openBoard(page);
  expect(t).toMatch(/Reconfirm Ironwood for the day/);
  expect(t).toMatch(/Ask Ironwood about insurance/);
});

test('THE BAR, ON SCREEN: the closing window leads the dead certificate', async ({ page }) => {
  const t = await openBoard(page);
  const reconfirm = t.search(/Reconfirm Ironwood for the day/);
  const certificate = t.search(/Ask Ironwood about insurance/);
  expect(reconfirm).toBeGreaterThan(-1);
  expect(certificate).toBeGreaterThan(-1);
  expect(reconfirm).toBeLessThan(certificate);
});

test('the certificate is still VISIBLE as late — demotion is not silence', async ({ page }) => {
  // Both the Liability & Trust Reviewer and "Grandmother" ruled on this:
  // "whatever moves down must still be VISIBLE as late". It moved down. It still
  // says so, in the host's own words.
  const t = await openBoard(page);
  const at = t.search(/Ask Ironwood about insurance/);
  expect(at).toBeGreaterThan(-1);
  expect(t.slice(at, at + 90)).toMatch(/past its window/i);
});

test('an ordinary day-of chore was NOT lifted with it', async ({ page }) => {
  // The packet's objection to a date predicate: it cannot tell "this cannot be
  // done later" from "this happens to be due soon". The emergency kit is due
  // TODAY with leadDays 0 and declares no closing window, so it must still sit
  // below both rows above.
  const t = await openBoard(page);
  const kit = t.search(/emergency kit/i);
  const certificate = t.search(/Ask Ironwood about insurance/);
  if (kit > -1 && certificate > -1) expect(kit).toBeGreaterThan(certificate);
});
