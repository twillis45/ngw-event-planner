// ─── $3,000–$30,000, AND NOTHING ON SCREEN SAID WHAT IT WAS ──────────────────
//
// MEASURED across ALL_PLAYBOOKS 2026-09-19: 224 playbook vendor rows author a
// costRange and ZERO author provenance. `moneyDisclosure`'s contract is
// `mustMark` = the figure may not be rendered bare. Driven here at 390px, on a
// Wedding with 80 guests, these were bare:
//
//   before, no market set    Venue  about $3,000–$30,000, before your quotes come in.
//                            …and NOTHING above it. The factors line only
//                            rendered when a metro or rush factor applied, so a
//                            host who had set no market saw no basis at all.
//
//   before, market = dc      Estimates below: Washington DC / NoVA typically runs
//                            above the national baseline … (+45%).
//                            Venue  about $4,350–$43,500, …
//                            — a confident +45% over a factor the money registry
//                            grades tier 'estimate', confidence 'low', on a note
//                            ending "NO FACTOR MOVED".
//
// The unit suite proves the engine reports the keys. It cannot prove the line
// renders: jest does not execute hostv2. Both states are driven here because
// the no-market state is the one that had NO disclosure whatsoever, and it is
// the state every host starts in.
//
// Pinned to 390px — the mobile-flagship geometry this was measured at.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const BASIS = /Planning ranges for this kind of event — not quotes, and not live market rates\./;

const mk = (extra) => ({
  id: 'cust-vendor-basis', demoSeed: true, name: 'Basis Probe', type: 'Wedding',
  date: '2027-05-15', guestMode: 'count', guestCount: 80, guests: [],
  budget: [], vendors: [], lodgingOptions: [], ...extra,
});

const openHiring = async (page, ev) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'People you’re hiring');
  await settled(page);
  return page.locator('.sheet').last();
};

test('with no market set, the ranges still say what they are', async ({ page }) => {
  const sheet = await openHiring(page, mk({}));
  // (premise) the estimates are really on screen — otherwise this proves nothing.
  await expect(sheet).toContainText(/\$3,000[–-]\$30,000/);
  await expect(sheet).toContainText(BASIS);
  // No factor applied, so no factor sentence is claimed. A disclosure naming a
  // market this event never set would be as false as an unmarked figure.
  await expect(sheet).not.toContainText(/Estimates below:/);
});

test('with a market set, the basis sits above what moved it', async ({ page }) => {
  const sheet = await openHiring(page, mk({ market: 'dc' }));
  await expect(sheet).toContainText(BASIS);
  await expect(sheet).toContainText(/Estimates below: Washington DC \/ NoVA/);
  // Order matters: what these numbers ARE, then what moved them. Reversed, the
  // host reads a precise +45% before learning it is applied to a planning range.
  const txt = (await sheet.innerText()).replace(/\s+/g, ' ');
  expect(txt.search(BASIS)).toBeLessThan(txt.search(/Estimates below:/));
});
