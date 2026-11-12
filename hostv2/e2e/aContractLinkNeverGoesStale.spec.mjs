// ─── A CONTRACT LINK NEVER GOES STALE (H4, 11/12/2026) ──────────────────────
//
// uploadFile() returns a signed URL valid for ONE HOUR, and the shell saved it
// as `contractUrl` and opened it forever after. An hour past the upload, the
// card's "View" opened a dead link while the card still said the file was on
// record. The fix re-signs `contractStoragePath` at the tap
// (src/lib/contractLink.js; its jest test pins the rule itself).
//
// What jest cannot see is the SHELL: that the tap really asks the storage API
// for a fresh signature, that the tab it opens lands on THAT URL and never on
// the saved one, and that a refused signature is said out loud.
//
// THE HARNESS is crossDeviceSync's: the synctest bundle on 5244, the only e2e
// bundle with a (fake) Supabase project configured, so `getSignedUrl` actually
// reaches the wire. The shared e2e bundle has no storage at all. A fabricated
// session sits in localStorage and every request to the project is answered
// here, on the CONTEXT so the popup's navigation is answered too.
//
// NOT COVERED HERE: "Analyze with AI". It renders only when the AI proxy is
// configured, and no e2e bundle that has Supabase also has an API base. It
// calls the same contractUrlFor() as View; the jest test covers that function.
//
// RUN: cd hostv2 && npx playwright test e2e/aContractLinkNeverGoesStale.spec.mjs --project=desktop
import { test, expect } from '@playwright/test';
import { previewUrl } from '../deployBase.mjs';

const BASE = previewUrl(Number(process.env.PW_SYNCTEST_PORT || 5244));
const PROJECT = 'https://synctest.supabase.co';
const STUDIO = '11111111-2222-3333-4444-555555555555';
const EVENT_ID = 'ev-contract-link';
const PATH = '99999999-8888-7777-6666-555555555555/ev-contract-link/contract/1762900000000_Ironwood_contract.pdf';
const EXPIRED = `${PROJECT}/storage/v1/object/sign/event-files/${PATH}?token=EXPIRED-AN-HOUR-AFTER-UPLOAD`;
const FRESH_TOKEN = 'FRESH-SIGNED-AT-THE-TAP';

const fakeSession = () => ({
  access_token: 'fake.access.token', refresh_token: 'fake-refresh', token_type: 'bearer',
  expires_in: 999999, expires_at: Math.floor(Date.now() / 1000) + 999999,
  user: { id: '99999999-8888-7777-6666-555555555555', email: 'harness@example.invalid', aud: 'authenticated', role: 'authenticated' },
});

const theEvent = () => ({
  id: EVENT_ID, name: 'The Wedding', type: 'Wedding', date: '2027-05-01',
  guestMode: 'count', guestCount: 80, venue: 'The Old Room',
  createdAt: '2026-08-01T10:00:00.000Z', budget: [], guests: [],
  vendors: [{
    id: 'v1', name: 'Ironwood', category: 'Venue', status: 'Confirmed', cost: 12000,
    contact: 'book@ironwood.test', contractSigned: true, depositPaid: true,
    contractStoragePath: PATH, contractFileName: 'Ironwood contract.pdf', contractUrl: EXPIRED,
  }],
});

/** `sign`: 'ok' answers the sign call with a fresh token; 'refused' answers 400. */
const install = async (page, { sign }) => {
  const seen = { signs: [], opened: [] };
  await page.context().route(`${PROJECT}/**`, async (route) => {
    const req = route.request();
    const url = req.url();
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (req.method() === 'POST' && url.includes('/storage/v1/object/sign/')) {
      seen.signs.push(decodeURIComponent(url));
      if (sign === 'refused') return json({ statusCode: '400', error: 'InvalidJWT', message: 'invalid signature' }, 400);
      return json({ signedURL: `/object/sign/event-files/${PATH}?token=${FRESH_TOKEN}` });
    }
    if (req.method() === 'GET' && url.includes('/storage/v1/object/sign/')) {
      seen.opened.push(url);
      return route.fulfill({ status: 200, contentType: 'text/plain', body: 'IRONWOOD CONTRACT' });
    }
    if (url.includes('/rest/v1/studio_members')) return json([{ studio_id: STUDIO, role: 'owner' }]);
    if (url.includes('/rest/v1/studio_settings')) return json([]);
    if (url.includes('/auth/v1/')) return json({});
    if (url.includes('/rest/v1/events')) {
      if (req.method() === 'GET') {
        if (/select=updated_at(&|$)/.test(url)) return json(null);
        return json([{ id: EVENT_ID, data: theEvent(), updated_at: '2026-11-12T10:00:00.000Z' }]);
      }
      return json([{ id: EVENT_ID, updated_at: '2026-11-12T11:00:00.000Z' }]);
    }
    return json([]);
  });

  await page.addInitScript(([sess, ev]) => {
    localStorage.setItem('sb-synctest-auth-token', JSON.stringify(sess));
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    window.__toastsSeen = [];
    setInterval(() => {
      const n = document.querySelector('div.toast');
      if (!n) return;
      const t = (n.innerText || '').replace(/\s+/g, ' ').trim();
      if (t && !window.__toastsSeen.includes(t)) window.__toastsSeen.push(t);
    }, 80);
  }, [fakeSession(), theEvent()]);
  return seen;
};

/** Boot at phone width, open Vendors, open Ironwood's card; return its View control. */
const openContract = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '?elegant=1');
  await page.waitForFunction(() => {
    const s = document.querySelector('.splash');
    if (s && parseFloat(getComputedStyle(s).opacity) > 0.01) return false;
    const a = document.querySelector('.app');
    return !!a && (a.innerText || '').trim().length > 120;
  }, null, { timeout: 20000 });
  await page.waitForTimeout(1500);   // hydrate
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('button,[role="button"],a')]
      .find((x) => /Vendors/i.test((x.innerText || '').trim()));
    if (el) el.click();
  });
  const card = page.locator('.vcard', { hasText: 'Ironwood' }).first();
  await card.waitFor({ state: 'visible', timeout: 10_000 });
  await card.click();
  const row = page.locator('[data-vaction="contract"]').first();
  await expect(row, 'premise: the contract row is on the open card').toBeVisible({ timeout: 10_000 });
  await expect(row).toContainText('Ironwood contract.pdf');
  // Link or button: what matters is where the tap lands, not the element.
  return row.locator('a, button').filter({ hasText: /^Open the contract$/ }).first();
};

test.describe('a stored contract is re-signed when the host opens it', () => {
  test('View asks for a fresh signature and opens that, never the saved one', async ({ page }) => {
    const seen = await install(page, { sign: 'ok' });
    const view = await openContract(page);
    const [popup] = await Promise.all([page.waitForEvent('popup'), view.click()]);
    await popup.waitForURL(new RegExp(FRESH_TOKEN), { timeout: 10_000 });

    expect(seen.signs.length, 'the tap did not ask storage for a fresh signature').toBe(1);
    expect(seen.signs[0]).toContain(`/object/sign/event-files/${PATH}`);
    expect(popup.url()).toContain(FRESH_TOKEN);
    expect(seen.opened.filter((u) => u.includes('EXPIRED')), 'the expired link was opened').toHaveLength(0);
    await expect(popup.locator('body')).toContainText('IRONWOOD CONTRACT');
  });

  test('a refused signature is said out loud, and no dead tab is left open', async ({ page }) => {
    const seen = await install(page, { sign: 'refused' });
    const view = await openContract(page);
    const popupP = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);
    await view.click();
    await expect.poll(() => page.evaluate(() => window.__toastsSeen.join(' | ')), { timeout: 8000 })
      .toMatch(/Couldn’t open Ironwood contract\.pdf.*fresh link.*tap Open the contract again/);
    expect(seen.signs.length, 'premise: the sign call went out').toBe(1);
    expect(seen.opened, 'something was opened although signing failed').toHaveLength(0);
    const popup = await popupP;
    if (popup) await expect.poll(() => popup.isClosed(), { timeout: 5000 }).toBe(true);
  });
});
