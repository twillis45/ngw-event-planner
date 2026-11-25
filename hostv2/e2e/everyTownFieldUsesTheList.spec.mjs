// ─── EVERY TOWN FIELD USES THE CITY LIST ────────────────────────────────────
//
// Owner, 11/18/2026: "List for city state should be in app elsewhere." The
// "City, ST" suggestion list (CityField, ~29.7k US towns) served the event's
// own town fields and the store finder, but two places that ask for a town
// were bare inputs: "Your area" in You & settings, and the lodging cockpit's
// one-gap town field. Both now use the same component, so typing "Annap"
// offers "Annapolis, MD" — the shape the app saves a state from.
import { test, expect, settled, dateIn, openMenuDoor } from './fixtures.mjs';

const seed = (page, ev) => page.addInitScript((e) => {
  if (sessionStorage.getItem('seeded')) return;
  sessionStorage.setItem('seeded', '1');
  localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
  localStorage.setItem('ngw-hostv2-last-event', e.id);
  localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
  localStorage.setItem('ngw-welcomed', '1');
  localStorage.setItem('ngw-v2-welcomed', '1');
}, ev);

const EV = (extra) => ({
  id: 'e2e-towns', name: 'Town Probe', type: 'Birthday', date: dateIn(40),
  createdAt: new Date().toISOString(), guestCount: 12,
  guests: [], vendors: [], budget: [], timeline: [], ...extra,
});

test('"Your area" offers the city list and saves the picked town with its state', async ({ page }) => {
  await seed(page, EV({ venueCity: 'Baltimore', venueState: 'MD' }));
  await page.goto('?elegant=1');
  await settled(page);
  const header = page.locator('[aria-label="You and settings"]').first();
  if (await header.count() && await header.isVisible()) await header.click();
  else {
    await openMenuDoor(page, 'You & settings');
  }
  await expect(page.locator('#sheet-title')).toHaveText('You & settings', { timeout: 8000 });
  const area = page.getByRole('textbox', { name: 'Your town or city' });
  await area.fill('Annap');
  const pick = page.getByRole('button', { name: 'Annapolis, MD' }).first();
  await expect(pick).toBeVisible();
  await pick.click();
  await expect(area).toHaveValue('Annapolis, MD');
  await expect(page.getByText(/Area saved/i).first()).toBeVisible();
});

test('the lodging town field offers the city list', async ({ page }) => {
  await seed(page, EV({ isDestination: true, endDate: dateIn(43), guestCount: 10, totalBudget: 4800 }));
  await page.goto('?demo=lodging');
  const town = page.getByRole('textbox', { name: 'Town' });
  await expect(town).toBeVisible({ timeout: 15000 });
  await town.fill('Santa F');
  const pick = page.getByRole('button', { name: 'Santa Fe, NM' }).first();
  await expect(pick).toBeVisible();
  await pick.click();
  await expect(town).toHaveValue('Santa Fe, NM');
});
