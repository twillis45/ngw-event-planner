import { test, expect } from './fixtures.mjs';
import { previewUrl } from '../deployBase.mjs';

// ─── THE REPLY FORM HOLDS STILL WHILE IT OPENS (G28, root-caused 11/16/2026) ──
//
// The WebKit rsvpLocalReply test failed 3 main merges: the tap on "Send my
// reply" was dispatched and submit() never ran. Cause (CI trace, run
// 43781764852): the form under the attendance buttons (.inv2-more) opens by
// growing max-height with overflow:hidden, which a SCRIPT can scroll. Bringing
// Send into view scrolled the half-open form's inside; each frame of the
// opening pulled it back, so Send slid 100-165px per frame. A press on Send and
// a release a frame later landed on different elements, so no click reached
// the button. WebKit is slow enough between press and release to hit it; a
// guest whose phone scrolls the half-open form (focus, autofill) can too.
// Fix: overflow:clip (styles.css), which hides the same pixels and cannot be
// scrolled. Red-proof: fails 10/10 without it, passes 10/10 with it.
test('the opening reply form cannot be scrolled, so Send stays where it was brought into view', async ({ page }) => {
  await page.goto(previewUrl(Number(process.env.PW_SYNCTEST_PORT || 5244)) + '?rsvp=test-two-days');
  await expect(page.getByLabel(/Your name/i).first()).toBeVisible();
  await page.getByRole('radio', { name: /Yes, I.m in/i }).first().click();
  // No waiting for the open transition: the loss happens inside it.
  const offsets = await page.evaluate(async () => {
    const more = document.querySelector('.inv2-more');
    const send = [...more.querySelectorAll('button')].find(b => /Send my reply/.test(b.textContent));
    send.scrollIntoView({ block: 'end' });   // what Playwright, focus and autofill all do
    const off = () => Math.round(send.getBoundingClientRect().top - more.getBoundingClientRect().top);
    const out = [off()];
    for (let i = 0; i < 6; i++) { await new Promise(r => requestAnimationFrame(r)); out.push(off()); }
    return out;
  });
  expect(new Set(offsets).size, 'Send slid inside the opening form: ' + offsets.join(', ')).toBe(1);
});
