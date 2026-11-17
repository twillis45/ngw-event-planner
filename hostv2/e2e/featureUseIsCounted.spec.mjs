// ─── FEATURE USE IS COUNTED (owner, 11/16/2026: "add analytics") ────────────
// In the browser, not just in source: opening a section records which one,
// and adding the plan to a calendar records how. Read from the dev tap
// (window.__NGW_TRACK__), since this runs on localhost where PostHog is off.
// Nothing recorded carries a name, an email or a body.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

test('opening the Calendar and adding the plan to a calendar are counted, kind only', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-retirement-party');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Calendar');
  await expect(page.locator('[data-calendar]')).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('[data-cal-ics]').click()]);
  expect(dl.suggestedFilename()).toMatch(/\.ics$/);
  const tap = await page.evaluate(() => window.__NGW_TRACK__ || []);
  expect(tap.filter((t) => t.event === 'section_opened' && t.section === 'calendar').length).toBeGreaterThanOrEqual(1);
  expect(tap.filter((t) => t.event === 'calendar_added' && t.how === 'file')).toHaveLength(1);
  for (const t of tap.filter((x) => ['section_opened', 'calendar_added'].includes(x.event))) {
    expect(Object.keys(t).sort().join()).toMatch(/^(event,section|event,how)$/);
  }
});
