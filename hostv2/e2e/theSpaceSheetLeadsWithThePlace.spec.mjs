// ─── THE SPACE SHEET LEADS WITH THE PLACE, AND ASKS FOR THE STREET ONCE ──────
//
// Owner report, 11/18/2026, on "Space, seats & helpers":
//   · the hero read "No helpers yet" while the helpers list sat at the bottom,
//     under the place checks and What to bring (ruling: the hero follows the
//     order, so it speaks to the place);
//   · "Venue / location — Set: 271 Whitaker Rd, Pasadena MD, Pasadena" sat
//     directly above "Guest arrival — Add your street address so guests know
//     exactly where to go." The street she typed is the address.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const openSpace = async (page) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, {
    id: 'e2e-space', name: 'Game night', type: 'Game Night', date: dateIn(10), recordKind: 'host_event',
    venue: '271 Whitaker Rd, Pasadena MD', venueKind: 'home', venueConfirmed: true, venueCity: 'Pasadena',
    guestMode: 'count', guestEstimate: 8, guestCountSource: 'host', budget: [], vendors: [], guests: [],
  });
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Space, seats');
  await expect(page.locator('.sheet').getByText(/^The place$/i).first()).toBeVisible();
  await settled(page);
  return page.locator('.sheet').last();
};

test('the hero speaks to the place, not to helpers listed at the bottom', async ({ page }) => {
  const sheet = await openSpace(page);
  const text = (await sheet.textContent()).replace(/\s+/g, ' ');
  expect(text).toMatch(/\d of \d set/);
  expect(text).not.toMatch(/No helpers yet/i);
  expect(text).not.toMatch(/The 271 Whitaker/);
  await page.screenshot({ path: test.info().outputPath('space-sheet.png') });
});

test('the street typed as the venue is not asked for again', async ({ page }) => {
  const sheet = await openSpace(page);
  const text = (await sheet.textContent()).replace(/\s+/g, ' ');
  expect(text).not.toMatch(/Add your street address/i);
  expect(text).not.toMatch(/Pasadena MD, Pasadena/);
  expect(text).toMatch(/Address entered/i);
});

// "The Vida's is set" (screenshot check at three sizes, 11/18/2026): a
// possessive place name takes no "The".
test('a place named for a person reads "Vida\'s is set", not "The Vida\'s"', async ({ page }) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, {
    id: 'e2e-vida', name: 'Friendsgiving', type: 'Friendsgiving', date: dateIn(10), venue: "Vida's", venueKind: 'venue',
    guestMode: 'count', guestEstimate: 15, guestCountSource: 'host', budget: [], vendors: [], guests: [],
  });
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Space, seats');
  const text = (await page.locator('.sheet').last().textContent()).replace(/\s+/g, ' ');
  expect(text).toMatch(/Vida['’]s is set/);
  expect(text).not.toMatch(/The Vida/);
});
