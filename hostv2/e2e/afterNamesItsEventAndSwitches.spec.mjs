// ─── AFTER NAMES ITS EVENT, AND ITS TITLE IS THE SWITCHER (cohesion F, 11/25/2026)
//
// D's open question for F: a past plan of her own lands on After (cohesion E),
// and After had no event name and, on a phone or an iPad, no way to another
// plan but back through Plan, where the title block is the event switcher.
// Ruling (F, UX_11 rule 8, one door one name): After wears Plan's own title
// block, so the plan is named and its title opens the same events sheet.
// Made-up events only.
import { test, expect, settled } from './fixtures.mjs';

const daysAgo = (d) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
const daysOn = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
const PAST = {
  id: 'cust-after-switch', name: 'Rosa’s Harvest Dinner', type: 'Dinner Party', date: daysAgo(3), startTime: '18:00', startTimeSource: 'host',
  createdAt: '2026-10-01', venue: 'Home', venueKind: 'home', venueAddress: '42 Elm Ct, Springfield, VA 22150',
  guestMode: 'list', guests: [{ id: 'g1', name: 'Ada Pine', rsvp: 'Yes' }, { id: 'g2', name: 'Ben Oak', rsvp: 'Yes' }], vendors: [], budget: [], timeline: [],
};
const NEXT = { ...PAST, id: 'cust-after-next', name: 'Sam’s Graduation', type: 'Graduation', date: daysOn(40) };

for (const [w, h, touch] of [[390, 844, true], [834, 1194, true], [1440, 900, false]]) {
  test(`${w}x${h}: a past plan's After names it, and its title opens the events sheet`, async ({ browser }) => {
    test.setTimeout(60_000);
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch && w < 600 });
    const page = await ctx.newPage();
    await page.route('https://e2e-mock.invalid/**', (r) => r.fulfill({ status: 404, json: { detail: 'not found' } }));
    await page.addInitScript(([e, n]) => {
      if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e, n]));
      localStorage.setItem('ngw-hostv2-last-event', e.id);
      localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    }, [PAST, NEXT]);
    await page.goto('./?elegant=1');
    await settled(page);
    // Premise: her past plan lands on After.
    await expect(page.getByText('How it landed.', { exact: true })).toBeVisible();
    // Named once, by Plan's own title block.
    const title = page.locator('[data-tt-title]:visible');
    await expect(title).toHaveCount(1);
    await expect(title).toContainText('Rosa’s Harvest Dinner');
    await expect(page.locator('[data-tt-head]:visible')).toContainText('3 days ago', { ignoreCase: true });
    // The title is the switcher: the same events sheet, holding her other plan.
    await title.click();
    await expect(page.locator('#sheet-title')).toHaveText('Your events', { timeout: 8000 });
    await expect(page.locator('.sheet').last()).toContainText('Sam’s Graduation');
    await ctx.close();
  });
}
