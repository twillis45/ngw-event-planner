// ─── THE INVITE SITS BALANCED ON ITS CARD (owner, 11/11/2026) ────────────────
//
// The invitation card keeps a fixed canvas (min-height), and its content is a
// top-aligned column, so every spare pixel collected at the BOTTOM. Measured
// before the fix: 20px above the content and 209px below it on a 390x844 phone,
// 222–235px below it on tablet, laptop and desktop. The owner, on a laptop:
// "make sure invite spacing is balanced for viewports".
//
// What must hold, measured rather than asserted on a CSS property:
//   · the space above the content and the space below it are within 24px of
//     each other (the card's own padding differs by 2px);
//   · the reply still sits close under the countdown (the earlier ruling: no
//     canyon above the ask), at most 48px;
//   · the card never runs off the side of the screen.
import { test, expect } from './fixtures.mjs';

const EVENT = {
  id: 'cust-invite-balance', rsvpCode: 'invite-balance-code',
  name: 'My Game Night', type: 'Game Night', date: '2027-03-06', time: '19:00', venueName: 'Home',
  guestEstimate: 6, guestMode: 'count', guests: [], vendors: [], budget: [], timeline: [],
};

test('the invitation card splits its spare height evenly above and below the content', async ({ page }) => {
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.route('https://e2e-mock.invalid/**', (route) => route.fulfill({ status: 404, json: { detail: 'not found' } }));
  await page.goto('?rsvp=' + EVENT.rsvpCode);
  const sheet = page.locator('.inv2-sheet').first();
  await expect(sheet).toBeVisible();
  // PREMISE: the reply buttons rendered, so the layout under test is the real one.
  await expect(page.getByRole('radio', { name: /Yes, I.m in/i }).first()).toBeVisible();
  await page.waitForTimeout(600);   // past the entrance animation

  const m = await sheet.evaluate((s) => {
    // At 1024 and up the card is two columns (theInviteReplyLeads.spec.mjs), and
    // the balance that matters is the invitation inside its own column. Below
    // that, .inv2-face has no box (display:contents) and its children are the
    // card's column, as they always were.
    const face = s.querySelector('.inv2-face');
    const twoColumn = getComputedStyle(face).display !== 'contents';
    const frame = twoColumn ? face : s;
    const r = frame.getBoundingClientRect();
    const inner = twoColumn ? [...face.children] : [...s.children].flatMap((k) => (k === face ? [...face.children] : [k]));
    const kids = inner.filter((k) => k.getBoundingClientRect().height > 0 && getComputedStyle(k).display !== 'none');
    const first = kids[0].getBoundingClientRect();
    const last = kids[kids.length - 1].getBoundingClientRect();
    const ask = s.querySelector('.inv2-ask');
    const count = s.querySelector('.inv2-countflex');
    return {
      top: first.top - r.top,
      bottom: r.bottom - last.bottom,
      aboveAsk: !twoColumn && ask && count ? ask.getBoundingClientRect().top - count.getBoundingClientRect().bottom : 0,
      right: s.getBoundingClientRect().right, vw: window.innerWidth,
    };
  });
  expect(Math.abs(m.top - m.bottom), `unbalanced: ${Math.round(m.top)}px above the content, ${Math.round(m.bottom)}px below`).toBeLessThanOrEqual(24);
  expect(m.aboveAsk, 'a canyon opened above the reply').toBeLessThanOrEqual(48);
  expect(m.right, 'the card runs off the side of the screen').toBeLessThanOrEqual(m.vw + 1);
});
