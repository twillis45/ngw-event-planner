// ─── READING A VENDOR'S REPLY SAYS "SIGN IN" IN THE HOST'S WORDS (#139) ──────
//
// Owner's live demo, 11/15/2026: signed out, "Log what the vendor said" took a
// pasted reply, and only after "Read the message" printed the AI service's raw
// "Please sign in to use AI features." Owner call A (11/16) for the same
// situation on "Send the details": ask to sign in, say why, lead there.
// Here: the answer names the button's own act and offers Sign in; the pasted
// text is kept. (Where sign-in exists and the host is signed out, the panel
// asks BEFORE any typing — that branch needs a Supabase-configured bundle with
// the AI proxy, which no e2e bundle has; it is the same predicate as call A.)
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';

test('a signed-out read answers in plain words and leads to sign-in, keeping the pasted text', async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.addInitScript(() => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.route(`${API}/api/ai/parse-vendor-reply`, (route) => route.fulfill({ status: 401, json: { detail: 'Planner authentication required' } }));
  await page.goto('?demo=1&elegant=1');
  await settled(page);
  await page.locator('button', { hasText: /^Seed \/ reset$/ }).click();
  await settled(page);
  await openSectionByName(page, 'People you’re hiring');
  await settled(page);
  const card = page.locator('.vcard', { hasText: 'Capital Rotisserie' }).first();
  await card.evaluate((c) => c.click());
  // The paste box opens in place from its own row (batch B, rule 2).
  await card.getByRole('button', { name: 'Paste their email or text', exact: true }).click();
  const box = card.locator('textarea[aria-label="Paste the vendor\'s message"]');
  await box.fill('We will arrive at 2pm, final count 85.');
  await card.getByRole('button', { name: 'Read the message', exact: true }).click();
  const note = card.locator('[data-reply-signin]');
  await expect(note).toContainText('Sign in to have it read the message');
  await expect(card).not.toContainText('Please sign in to use AI features');
  await expect(box).toHaveValue('We will arrive at 2pm, final count 85.');
  await note.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('#sheet-title')).toHaveText('You & settings');
});

// THE WAIT IS SHOWN (attention audit, 11/18/2026): an AI read takes 3–15 s and
// only the button said "Reading…". A status line under it names the wait.
test('while the message is read, a status line says so, and it clears', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  });
  let release; const held = new Promise((r) => { release = r; });
  await page.route(`${API}/api/ai/parse-vendor-reply`, async (route) => {
    await held;
    await route.fulfill({ status: 401, json: { detail: 'Planner authentication required' } });
  });
  await page.goto('?demo=1&elegant=1');
  await settled(page);
  await page.locator('button', { hasText: /^Seed \/ reset$/ }).click();
  await settled(page);
  await openSectionByName(page, 'People you’re hiring');
  await settled(page);
  const card = page.locator('.vcard', { hasText: 'Capital Rotisserie' }).first();
  await card.evaluate((c) => c.click());
  await card.getByRole('button', { name: 'Paste their email or text', exact: true }).click();
  await card.locator('textarea[aria-label="Paste the vendor\'s message"]').fill('We will arrive at 2pm, final count 85.');
  await card.getByRole('button', { name: 'Read the message', exact: true }).click();
  await expect(card.locator('[data-busy-line]')).toContainText(/Reading the message from Capital Rotisserie/);
  release();
  await expect(card.locator('[data-busy-line]')).toHaveCount(0);
});
