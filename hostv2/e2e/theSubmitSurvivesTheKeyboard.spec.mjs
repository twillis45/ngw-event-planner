// ─── THE SUBMIT IS REACHABLE WITH THE KEYBOARD UP ───────────────────────────
//
// Doctrine, not taste: UX_03_MULTI_VIEWPORT_EXCELLENCE.md:72 and :223 both say
// "Primary CTA visible without scrolling (above the fold)". Two review benches
// independently measured the creation screen failing it, and one of them caught
// a commit message of mine CLAIMING it was fixed:
//
//   before the mic was demoted   CTA bottom 576px   68px below the fold
//   after                        CTA bottom 618px   110px below
//
// I had reasoned that deleting a control frees vertical space. It does not when
// the control sat BESIDE the field — `.create-inputrow` is `align-items:stretch`
// and the mic was the field's right-hand cap, so removing it freed zero height,
// while the replacement link line added 8 + 8 + 8 + 18 = exactly 42px. The
// claim was inferred from an edit instead of measured on a screen.
//
// THE FOLD, and why it is a viewport and not a number: an iPhone 17 soft
// keyboard is ~336px of a 844px screen, leaving ~508px of layout viewport. We
// emulate that by SIZING the viewport, which is what Chromium gives us.
// CAVEAT, stated because the remedy depends on it being read: iOS may OVERLAY
// the keyboard rather than shrink the layout viewport, in which case the honest
// number comes from `visualViewport.height` on a device. The remedy is the same
// either way — the control has to sit higher — so this gate is worth having at
// the viewport it can actually measure.
import { test, expect } from '@playwright/test';
import { settled } from './fixtures.mjs';

const KEYBOARD_FOLD = { width: 390, height: 508 };

// CLEARING STORAGE DOES NOT LAND ON THE CREATION SCREEN. The app ships sample
// events, so an empty store opens a seeded demo plan — my first version of this
// spec asserted against "Margaret Adeyemi's Retirement Celebration" and failed
// its own premise, which is the premise assertion earning its keep on the first
// run. The route below is the one `typingIsSubmitting.spec.mjs` already proves.
const fresh = async (page) => {
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* private mode */ } });
  await page.setViewportSize(KEYBOARD_FOLD);
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await expect(page.getByText(/what are we planning/i)).toBeVisible({ timeout: 20000 });
  await settled(page);
};

// THREE DRAFTS, NOT ONE — and this is the whole lesson of the file. The first
// version of this gate used the short seed alone and PASSED while the defect
// was live, because the stack above the submit grows with the sentence: the
// recognition chips and the "didn't make it into the plan" block are both
// draft-sized. Measured before the fix, CTA bottom at 390px:
//
//     short 470   dual 576   heavy 702        (keyboard-up viewport ~508)
//
// So one seed is not a measurement of this surface, it is a measurement of that
// seed. A draft that resolves no type renders no CTA at all, so each of these
// is also checked for the control's presence before its position is judged.
const SEEDS = {
  short: 'crab feast for 20, Aug 2',
  dual: "Dad's 90th birthday and retirement celebration in Santa Fe for 45, June 20-24",
  heavy: "Mom's 80th birthday in Santa Fe, 30 people, June 20 to June 24, "
    + 'she uses a walker and the altitude worries me, barbecue and a cake',
};
const SEED = SEEDS.short;

test('PREMISE — typing the seed renders a real submit', async ({ page }) => {
  await fresh(page);
  await page.fill('#smart-text-input', SEED);
  await page.waitForTimeout(700);
  await expect(page.locator('button.cta.big')).toHaveCount(1);
});

for (const [name, seed] of Object.entries(SEEDS)) {
  test(`the submit is inside the keyboard-up viewport, unscrolled — ${name} draft`, async ({ page }) => {
    await fresh(page);
    await page.fill('#smart-text-input', seed);
    await page.waitForTimeout(1100);

    const m = await page.evaluate(() => {
      const cta = document.querySelector('button.cta.big');
      if (!cta) return null;
      const r = cta.getBoundingClientRect();
      const scroller = cta.closest('.app') || document.scrollingElement;
      return { bottom: Math.round(r.bottom), top: Math.round(r.top),
               scrollTop: Math.round(scroller.scrollTop),
               scrollH: scroller.scrollHeight, clientH: scroller.clientHeight,
               h: window.innerHeight };
    });
    expect(m, `the submit renders for the ${name} draft`).not.toBeNull();

    // PREMISE: this draft really does overflow, for the two that should. A
    // pinned control proves nothing on a page that fits — the test would pass
    // on a blank screen.
    if (name !== 'short') {
      expect(m.scrollH, `${name} draft overflows the fold`).toBeGreaterThan(m.clientH);
    }

    expect(m.scrollTop, 'measured unscrolled — reachable-by-scrolling is not above the fold').toBe(0);
    expect(m.top, `${name}: submit top ${m.top}`).toBeGreaterThanOrEqual(0);
    expect(m.bottom, `${name}: submit bottom ${m.bottom} must sit within the ${m.h}px keyboard-up viewport`)
      .toBeLessThanOrEqual(m.h);
  });
}

// NOT PINNED WHEN IT DOES NOT NEED TO BE. `sticky` is chosen over `fixed`
// precisely so a submit already on screen does not move, and that is a claim
// worth a check of its own: the short draft must still paint the button where
// it sat in flow, not dragged down to the fold edge.
test('a draft that already fits leaves the submit where it sat', async ({ page }) => {
  await fresh(page);
  await page.fill('#smart-text-input', SEEDS.short);
  await page.waitForTimeout(1100);
  const m = await page.evaluate(() => {
    const cta = document.querySelector('button.cta.big');
    const r = cta.getBoundingClientRect();
    return { bottom: Math.round(r.bottom), h: window.innerHeight };
  });
  // It measured 470 in a 508 viewport before any pinning existed. If sticky
  // ever starts dragging it to the bottom edge, this catches it.
  expect(m.bottom).toBeLessThan(m.h - 20);
});

// THE VOICE DOOR RETIRES, which is the other half of the fix and the half that
// cannot regress silently. It used to sit BETWEEN the field and the submit, so
// it was both the 42px and a hierarchy fault: the screen's one loud thing is the
// control that submits, and a secondary door stood in front of it. It now takes
// the same condition its sibling door already had — present while the field is
// empty, gone once there is a draft to submit.
test('the voice door is offered on an empty field and retires once there is text', async ({ page }) => {
  await fresh(page);
  // PREMISE: it is really offered to begin with. A gate that only checks the
  // absence would pass just as well if the control had been deleted outright.
  await expect(page.locator('button.voice-door')).toHaveCount(1);

  await page.fill('#smart-text-input', SEED);
  await page.waitForTimeout(700);
  await expect(page.locator('button.voice-door')).toHaveCount(0);
  await expect(page.locator('button.cta.big')).toHaveCount(1);
});
