// ─── THE GUEST SEES THE WHOLE ADDRESS AND THE NAME AS TYPED (owner's invite, 11/24/2026) ──
//
// The owner's invite email read "Mom Lindas …" for a name typed with an
// apostrophe, and its WHERE had no ZIP. This is the guest's own page, opened
// cold from the link: the name in the heading and in both calendar files, the
// place line with its ZIP, the directions link and the "tell me when I'm close"
// geocode, each asked with the ZIP. A straight ' and a curly ’ both. Made-up
// names and places only.
import { test, expect } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const CODE = 'whole-address-code-0001';
const LINE = '42 Elm Ct, Springfield, VA 22150';

for (const [label, name] of [['straight', "Aunt Rosa's Dinner"], ['curly', 'Aunt Rosa’s Dinner']]) {
  test(`the ${label} apostrophe and the ZIP reach every part of the guest's page`, async ({ page, context }) => {
    // Her event is today, so "Getting there" shows its directions.
    await page.clock.setFixedTime(new Date('2027-12-04T10:00:00'));
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 38.79, longitude: -77.18 });
    const EVENT = {
      id: 'ev-whole-address', name, type: 'Dinner Party', date: '2027-12-04', startTime: '18:00',
      recordKind: 'host_event', venueKind: 'home', venueAddress: '42 Elm Ct', venueCity: 'Springfield',
      venueState: 'VA', venueZip: '22150', hostName: 'Rosa Diaz', rsvpCode: CODE, goingCount: 2,
    };
    const geocodes = [];
    await page.route(`${API}/**`, (r) => r.fulfill({ status: 404, json: { detail: 'not found' } }));
    await page.route(`${API}/api/public/invite/${CODE}`, (r) => r.fulfill({ status: 200, json: { ok: true, event: EVENT } }));
    await page.route(`${API}/api/public/rsvp/${CODE}`, (r) => r.fulfill({ status: 200, json: { ok: true, submitted_at: '2027-12-04T10:00:00Z' } }));
    await page.route(`${API}/api/weather/geocode**`, (r) => {
      geocodes.push(new URL(r.request().url()).searchParams.get('q'));
      return r.fulfill({ status: 200, json: { ok: true, result: { lat: 38.79, lon: -77.18, name: 'Springfield' } } });
    });
    await page.goto('?rsvp=' + CODE);

    await expect(page.locator('h1.inv2-name')).toHaveText(name);
    await expect(page.locator('[data-invite-where]')).toHaveText(LINE);

    // Getting there: the directions and the geocode ask with the ZIP.
    const directions = page.getByRole('link', { name: 'Directions' });
    await expect(directions).toHaveAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(LINE));
    await page.getByRole('button', { name: /Tell me when I.m close/ }).click();
    await expect.poll(() => geocodes).toEqual(['22150']);

    // Her reply, then both calendar files carry the name as typed and the whole address.
    await page.getByRole('radio', { name: /Yes, I.m in/i }).first().click();
    await page.getByRole('textbox', { name: 'Your name' }).fill('Sam Roe');
    await page.getByRole('button', { name: /^Send my reply$/ }).click();
    const gcal = page.getByRole('link', { name: 'Add to Google Calendar' });
    await expect(gcal).toBeVisible();
    const g = new URL(await gcal.getAttribute('href'));
    expect(g.searchParams.get('text')).toBe(name);
    expect(g.searchParams.get('location')).toBe(LINE);
    const ics = decodeURIComponent((await page.getByRole('link', { name: 'Add to Apple Calendar' }).getAttribute('href')).split(',').slice(1).join(','));
    expect(ics).toContain(`SUMMARY:${name}`);
    expect(ics).toContain('LOCATION:42 Elm Ct\\, Springfield\\, VA 22150');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
