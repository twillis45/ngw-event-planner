// ─── THE PANE'S BUTTON NEVER COVERS ITS BACK LINK (iPad landscape) ──────────
// UX_13 (owner, 11/25/2026) puts each pane's one action in the pane's top bar,
// at the right, with its back link at the left. Seen live 11/28/2026 at 1194:
// in the 400px guest list pane, "Nudge the 2 who haven't replied" sat 46px
// over "‹ Your plan" at every split size (1024, 1180, 1194, 1366). A long
// action now wraps beside the back link instead of covering it, and stays a
// 44px target with its whole label shown. Measured, not looked at. Made-up names.
import { test, expect, settled, dateIn, openSectionByName } from './fixtures.mjs';

const EV = {
  id: 'gk-bar', name: 'Thanksgiving at ours', type: 'Thanksgiving', createdAt: '2026-11-20',
  date: dateIn(20), startTime: '15:00', startTimeSource: 'host', venueKind: 'home', venueCity: 'Springfield, VA',
  guestMode: 'list', guestEstimate: 14, guestCountSource: 'host', plusOnePolicy: 'plus_one_ok', kidsPolicy: 'kids_welcome', rsvpDeadline: dateIn(10),
  invitesSentAt: '2026-11-20T15:00:00.000Z', vendors: [], budget: [], timeline: [],
  guests: ['Rosa Lane', 'Bo Reed', 'Ava Lane'].map((name, i) => ({ id: 'g' + i, name, email: 'g' + i + '@example.com', invitedAt: '2026-11-20T15:00:00.000Z', rsvp: i === 0 ? 'Yes' : '' })),
};

for (const [w, h] of [[1024, 768], [1194, 834], [1366, 1024]])
test(`the list pane's button sits beside its back link, whole and tappable — ${w}x${h}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: h });
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e])); localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('?elegant=1&guests=kit');
  await settled(page);
  await openSectionByName(page, 'Guests', { settle: 700 });
  await expect(page.locator('[data-guests-kit] .tablet[data-layout="split"]')).toBeVisible();
  const act = page.locator('.gk .action .primary').first();
  await expect(act).toHaveText(/Nudge the 2 who haven.t replied/);
  const m = await page.evaluate(() => {
    const back = document.querySelector('[data-guests-kit] .backbtn').getBoundingClientRect();
    const el = document.querySelector('.gk .action .primary');
    const a = el.getBoundingClientRect();
    const apart = back.right <= a.left || back.bottom <= a.top || a.bottom <= back.top;
    return { apart, height: a.height, clipped: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1 };
  });
  expect(m.apart).toBe(true);
  expect(m.height).toBeGreaterThanOrEqual(44);
  expect(m.clipped).toBe(false);
});
