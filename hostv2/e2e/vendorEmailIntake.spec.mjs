// ─── THE SEND HAD NO ADDRESS TO SEND TO ─────────────────────────────────────
//
// The transport board measured two things that together made the vendor send
// unreachable on every event in the app: only 1 of 24 `openDraft` call sites
// passed a `vendorId` (and `emailTarget` requires one), and 0 of 126 seeded
// vendors carry an email — vendor `contact` holds a person's NAME.
//
// So the send button this product already owns had never rendered anywhere,
// and its absence read as a missing feature rather than a missing address.
// Silence was the defect: the control genuinely cannot render without an
// address, but the host can be told why and handed the field that fixes it.
import { test, expect, settled } from './fixtures.mjs';

const boot = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
  });
  await page.goto('?elegant=1');
  await settled(page);
  const rail = page.locator('.srail-row', { hasText: /People you/ });
  if (await rail.count()) { await rail.first().click(); } else {
    await page.locator('.ev-eyebrow').first().click();
    await page.locator('.sheet').last().getByText('Jump to a section', { exact: false }).first().click();
    await settled(page);
    await page.locator('.sheet').last().getByText(/People you/).first().click();
  }
  await settled(page);
};

// NOT ASSERTED IN THE BROWSER, and the reason is worth recording: the
// missing-address sentence is deliberately gated on `session`, because a
// signed-out host cannot send at all -- telling them "no email for X yet"
// would invite them to add an address that still produces no send button,
// which is a worse lie than silence. The e2e build has no session, so the
// sentence correctly does not appear and cannot be driven here.
//
// Its wiring is pinned at source level in sendLedger.test.js instead, beside
// the other draft-sheet pins. What CAN be driven is the field the sentence
// promises, below.

test('the vendor card carries the field the sentence promises', async ({ page }) => {
  // The intake was never missing — nothing pointed at it. If this field ever
  // moves, the sentence above becomes a lie and this is what says so.
  await boot(page);
  await page.locator('.vcard').first().click();
  await settled(page);
  const field = page.locator('.vc-more [aria-label="Vendor email"]').first();
  await expect(field).toBeVisible();
  await field.fill('not-an-email');
  await settled(page);
  // Its own validation still speaks — a malformed address must not silently
  // become a send target.
  await expect(page.locator('.vc-more').first()).toContainText(/doesn.t look like an email/i);
});
