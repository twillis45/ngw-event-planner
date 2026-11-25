// ─── "WARMER" FITS THE VENDOR'S STAGE (11/16/2026) ───────────────────────────
// The Warmer tone told a caterer still quoting "So glad you’ll be part of it."
// The closing now follows who the note is for (lib/warmClosing). This drives
// the real Draft note → Warmer path on a vendor still at "Considering".
import { test, expect, settled, openSectionByName, dateIn } from './fixtures.mjs';

const EV = { id: 'cust-warm', name: 'My Friendsgiving', type: 'Friendsgiving', date: dateIn(10),
  guestEstimate: 12, guestMode: 'count', guestCountSource: 'host', budget: [], guests: [], timeline: [],
  vendors: [{ id: 'v-cat', name: 'Harvest Table Catering', category: 'Catering', status: 'Considering', contactName: 'Dana' }] };

test('Warmer on a note to a vendor still quoting thanks them, and never says they are part of it', async ({ page }) => {
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'People you’re hiring');
  await settled(page);
  const card = page.locator('.vcard', { hasText: 'Harvest Table Catering' }).first();
  await card.evaluate((c) => c.click());
  await card.getByRole('button', { name: 'Draft a note instead', exact: true }).click();
  const draft = page.locator('.sheet').last();
  await draft.getByRole('radio', { name: 'Warmer' }).click();
  await page.waitForTimeout(400);
  const text = await draft.evaluate((n) => n.innerText + '\n' + [...n.querySelectorAll('textarea')].map((t) => t.value).join('\n'));
  expect(text).toContain('Thank you for your time — I’d love to work with you on this.');
  expect(text).not.toContain('So glad you’ll be part of it.');
  // One thank-you, not two in a row (live check 11/16, 1:50 PM EST).
  expect(text).not.toContain('Thanks so much!');
});
