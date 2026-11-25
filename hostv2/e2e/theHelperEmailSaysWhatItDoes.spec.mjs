// ─── THE HELPER EMAIL SAYS WHAT IT DOES (owner, 11/20/2026) ─────────────────
//
// "There will be a branded envelope too" (the helper ask). A helper with an
// email saved on the plan gets "Email Jordan their job": the server sends the
// ask in the invite's frame (backend helper_link.email_helper_job) and records
// it for Messages. The button names the act, shows its wait, and a refusal or
// a failure in place; "Emailed" appears only when the server reports the email
// service accepted it — never "Sent" (UX_07). The words are pinned in jest
// (src/lib/api/__tests__/helperEmail.test.js); this drives the shipped row.
//
// The API is mocked at the e2e bundle's fake host. Everything is synthetic.
import { test, expect, settled, openSectionByName, dateIn, revealChecklistStep } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const EVENT_ID = 'he-e2e';

const EVENT = {
  id: EVENT_ID, name: 'My Friendsgiving', type: 'friendsgiving', createdAt: '2026-11-01',
  guestMode: 'list', venue: 'Vida’s', venueAddress: '271 Whitaker Rd',
  startTime: '4:00 PM', startTimeSource: 'host', hostName: 'Casey Morgan',
  guests: [{ id: 'g-jordan', name: 'Jordan Avery', email: 'jordan.helper@example.test', rsvp: 'Yes' }],
  vendors: [], budget: [],
  timeline: [{ id: 't-chairs', task: 'Bring folding chairs', owner: 'Jordan Avery', week: 'Week of' }],
};

const boot = async (page, answer) => {
  const calls = [];
  let release;
  const held = new Promise((r) => { release = r; });
  await page.route(`${API}/api/events/${EVENT_ID}/helper-confirmations`, (r) => r.fulfill({ status: 200, json: [] }));
  await page.route(`${API}/api/events/${EVENT_ID}/helper-links/email`, async (route) => {
    calls.push(route.request().postDataJSON());
    await held;
    return route.fulfill(answer);
  });
  await page.addInitScript(([ev, iso]) => {
    localStorage.setItem('ngw-events', JSON.stringify([{ ...ev, date: iso }]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-profile', JSON.stringify({ name: 'Casey Morgan' }));
  }, [EVENT, dateIn(20)]);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Your checklist');
  await settled(page);
  await revealChecklistStep(page, 'Bring folding chairs');   // its controls on screen (cohesion batch D)
  return { calls, release };
};

const button = (page) => page.locator('[data-helper-email]');

test('it says what it does, shows its wait, and says "Emailed" only once the server accepted it', async ({ page }) => {
  const { calls, release } = await boot(page, { status: 200, json: { ok: true, status: 'accepted', message_id: '1' } });
  await expect(button(page)).toHaveText('Email Jordan their job');
  await button(page).click();
  // The wait, in place, and one send at a time.
  await expect(button(page)).toHaveText('Emailing Jordan…');
  await expect(button(page)).toBeDisabled();
  await expect(page.locator('.helper-email-line')).toHaveCount(0);
  release();
  const line = page.locator('.helper-email-line');
  await expect(line).toHaveText('Emailed — the email service accepted it. Delivery shows in Messages.');
  await expect(line).toHaveAttribute('role', 'status');
  await expect(button(page)).toBeEnabled();
  // The client named the helper; the server finds the address.
  expect(calls).toEqual([{ helper_name: 'Jordan Avery' }]);
  // Counted (11/20/2026): ok only, never who.
  expect(await page.evaluate(() => (window.__NGW_TRACK__ || []).filter((t) => t.event === 'helper_email_sent'))).toEqual([{ event: 'helper_email_sent', ok: true }]);
  await expect(page.locator('.assign-row, .row-assign').filter({ hasText: /\bSent\b/ })).toHaveCount(0);
});

test('a failure shows in place and never says "Emailed" or "Sent"', async ({ page }) => {
  const { release } = await boot(page, { status: 200, json: { ok: false, status: 'failed', message_id: '1' } });
  await button(page).click();
  await expect(button(page)).toHaveText('Emailing Jordan…');
  release();
  const line = page.locator('.helper-email-line');
  await expect(line).toHaveText('The email service didn’t take it. The email didn’t go out.');
  await expect(line).toHaveAttribute('role', 'alert');
  await expect(button(page)).toHaveText('Email Jordan their job');
  await expect(page.locator('.row-assign').filter({ hasText: /Emailed|\bSent\b/ })).toHaveCount(0);
  expect(await page.evaluate(() => (window.__NGW_TRACK__ || []).filter((t) => t.event === 'helper_email_sent'))).toEqual([{ event: 'helper_email_sent', ok: false, reason: 'refused' }]);
});

test('the day’s cap is a refusal said plainly, in place', async ({ page }) => {
  const { release } = await boot(page, { status: 429, json: { detail: 'This event has sent its email for today.' } });
  await button(page).click();
  release();
  await expect(page.locator('.helper-email-line'))
    .toHaveText('This event has sent its email for today. Try again tomorrow. The email didn’t go out.');
  expect(await page.evaluate(() => (window.__NGW_TRACK__ || []).filter((t) => t.event === 'helper_email_sent'))).toEqual([{ event: 'helper_email_sent', ok: false, reason: 'capped' }]);
  await expect(page.locator('.row-assign').filter({ hasText: /Emailed|\bSent\b/ })).toHaveCount(0);
});
