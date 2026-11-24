// A drafted note to a vendor: "Text it" opens Messages addressed to that
// vendor when their number is on file (owner, 11/20/2026). Without a number,
// the composer opens with no recipient and the host picks one.
import { test, expect, settled, openSectionByName, dateIn } from './fixtures.mjs';

const EV = (phone) => ({ id: 'cust-vtext', name: 'My Friendsgiving', type: 'Friendsgiving', date: dateIn(10),
  guestEstimate: 12, guestMode: 'count', guestCountSource: 'host', budget: [], guests: [], timeline: [],
  vendors: [{ id: 'v-cat', name: 'Harvest Table Catering', category: 'Catering', status: 'Considering', contactName: 'Dana', ...(phone ? { phone } : {}) }] });

const openNote = async (page, ev) => {
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'People you’re hiring');
  await settled(page);
  const card = page.locator('.vcard', { hasText: 'Harvest Table Catering' }).first();
  await card.evaluate((c) => c.click());
  await card.getByRole('button', { name: 'Draft a note instead', exact: true }).click();
  return page.locator('.sheet').last().getByRole('link', { name: 'Text it', exact: true });
};

test('a vendor with a number: Text it is addressed to them', async ({ page }) => {
  const link = await openNote(page, EV('(410) 555-0142'));
  await expect(link).toHaveAttribute('href', /^sms:4105550142\?&body=./);
  // The help line names "Share…" only when that button is on screen (11/20/2026).
  const sheet = page.locator('.sheet').last();
  const hasShare = await sheet.getByRole('button', { name: 'Share…' }).count();
  if (!hasShare) await expect(sheet).not.toContainText('Share…');
});

test('no number on file: no recipient, the host picks', async ({ page }) => {
  const link = await openNote(page, EV(null));
  await expect(link).toHaveAttribute('href', /^sms:\?&body=./);
});
