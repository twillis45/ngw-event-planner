// ─── "NATIONAL BASELINE" OVER A MARKET THE HOST ALREADY PICKED ───────────────
//
// The event's metro market was written under two field names — `event.market`
// by the CRA create flow, `event.metroMarket` by this shell's own picker — from
// the same METRO_MARKETS list. Every reader chose one, so an event saved by one
// shell read as unset in the other.
//
// The unit suite proves `marketFor` reads both and proves what the three lib
// readers then do with it. It cannot prove EITHER half of this file: jest does
// not execute hostv2, so the label the host actually sees and the field the
// picker actually writes have no guard anywhere else.
//
// MEASURED 2026-09-19 against the built bundle in Chromium at 390px, on an
// event carrying `metroMarket: 'dc'` and nothing else:
//
//   without the accessor   Which market · National baseline ›      (Venue…)
//   with the accessor      Which market · Washington DC / NoVA ›   (Esti…)
//
// The vendor rows underneath change with it — that label sits over a metro
// price factor, so "National baseline" was not only wrong, it was pricing the
// whole vendor plan at the national factor for a host who had chosen DC.
//
// Pinned to 390px: the market sheet is the mobile-flagship surface, and running
// this at six viewports would buy six identical results.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

// A LEGACY hostv2 save — the market id under the OLD field name only. This is
// what every event this shell wrote before 2026-09-19 looks like on disk.
const LEGACY = {
  id: 'cust-mkt-probe', demoSeed: true, name: 'Market Probe', type: 'Wedding',
  date: '2027-05-15', guestMode: 'count', guestCount: 80, guests: [],
  metroMarket: 'dc', budget: [], vendors: [], lodgingOptions: [],
};

const stored = (page) => page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]');
  const e = raw.find((x) => x && x.id === 'cust-mkt-probe') || {};
  return { market: e.market ?? null, metroMarket: e.metroMarket ?? null };
});

test('a market saved under the old field name still reads, and the picker writes the new one', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((ev) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, LEGACY);
  await page.goto('?elegant=1');
  await settled(page);

  // (premise) the seed really is legacy-shaped — otherwise this proves nothing.
  expect(await stored(page)).toEqual({ market: null, metroMarket: 'dc' });

  await openSectionByName(page, 'People you’re hiring');
  await settled(page);
  const sheet = page.locator('.sheet').last();
  const row = sheet.locator('.fstat', { hasText: 'Which market' }).first();

  // 1 — THE LABEL. The host's own choice, not "National baseline".
  await expect(row).toContainText(/Washington DC/i);
  await expect(row).not.toContainText(/National baseline/i);

  // 2 — THE WRITE. Changing it stores the canonical field and clears the old
  //     name, so the two can never diverge again from this surface.
  await row.click();
  await settled(page);
  await page.locator('#metro-market-pick').selectOption('atl');
  await settled(page);
  expect(await stored(page)).toEqual({ market: 'atl', metroMarket: null });

  // …and the surface followed the write. The select reads through the same
  // accessor, so a value that stuck on 'dc' here would mean the screen had
  // closed over the store all over again — the defect class this repo pays for.
  await expect(page.locator('#metro-market-pick')).toHaveValue('atl');
});
