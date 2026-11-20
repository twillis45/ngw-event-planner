// "our pick" carries the reason for the pick. With a mouse it used to float as a
// tooltip over the paragraph below it; on touch it already sat in the page.
// Since 11/20/2026 it sits in the page on every device: visible without a
// gesture, and covering nothing.
import { test, expect, settled, openSectionByName, dateIn } from './fixtures.mjs';

const EV = { id: 'cust-pick', name: 'Dinner at Casey’s', type: 'dinnerParty', date: dateIn(4),
  guestMode: 'count', guestCount: 10, guestCountSource: 'host', budget: [], vendors: [], guests: [], timeline: [] };

test('the reason for "our pick" is in the page and overlaps nothing', async ({ page }) => {
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EV);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Calls to make');
  await settled(page);
  const why = page.locator('.decopt.pick:visible').first().locator('.decopt-why');
  await expect(why).toBeVisible();                       // no hover, no tap needed
  // A short landscape screen puts it below the fold; the point check needs it on screen.
  await why.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const r = await why.evaluate((el) => {
    const cs = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    // Whatever is painted at the reason's centre must be the reason itself.
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + Math.min(10, box.height / 2));
    const btn = el.closest('.decopt');
    const next = btn && btn.parentElement ? [...btn.parentElement.children][[...btn.parentElement.children].indexOf(btn) + 1] : null;
    return { position: cs.position, mine: !!hit && el.contains(hit) || hit === el,
      insideRow: !!btn && box.bottom <= btn.getBoundingClientRect().bottom + 1,
      clearOfNext: !next || box.bottom <= next.getBoundingClientRect().top + 1 };
  });
  expect(r.position).toBe('static');
  expect(r.mine).toBe(true);
  expect(r.insideRow).toBe(true);
  expect(r.clearOfNext).toBe(true);
});
