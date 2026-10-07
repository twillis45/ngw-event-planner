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

// STICKY, NOT FIXED — AND THE FIRST VERSION OF THIS TEST COULD NOT TELL.
// It asserted the short draft's submit sat above `viewport - 20`. A bench
// measured both states: pinned 459, in flow 478, and the threshold was 488 —
// so it passed either way and survived `position:static`. It was the fourth
// gate of mine this week that could not fail for its own reason.
//
// The claim it was guarding was ALSO false. I wrote that a submit already on
// screen "does not move"; sticky pins whenever the flow position would fall
// below the scrollport, and at 390x508 the short draft's scroller overflows
// (801 > 508), so it pins too. What actually separates sticky from fixed is
// what happens when there is NOTHING to scroll: sticky leaves the element in
// flow, fixed welds it to the viewport. So that is what this measures now.
test('with nothing to scroll, the submit stays in flow — sticky, not fixed', async ({ page }) => {
  await fresh(page);
  await page.setViewportSize({ width: 390, height: 1200 });   // taller than the content
  await page.fill('#smart-text-input', SEEDS.short);
  await page.waitForTimeout(1100);

  const m = await page.evaluate(() => {
    const cta = document.querySelector('button.cta.big');
    const sc = cta.closest('.app');
    const r = cta.getBoundingClientRect();
    return { bottom: Math.round(r.bottom), h: window.innerHeight,
             overflows: sc.scrollHeight > sc.clientHeight };
  });
  // PREMISE: this viewport really does fit the content, or the distinction
  // being drawn does not exist on this screen.
  expect(m.overflows, 'content fits — nothing to stick against').toBe(false);
  // Fixed would weld it near the bottom; sticky leaves it where the flow put
  // it, which on a 1200px viewport is far above the fold.
  expect(m.bottom, `submit bottom ${m.bottom} should sit in flow, not at the fold`)
    .toBeLessThan(m.h - 200);
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

// ─── A LIVE MICROPHONE MUST KEEP ITS OFF SWITCH ─────────────────────────────
// A review bench found this four hours after the retire-on-text guard shipped,
// and it is the worst thing either of us introduced tonight. Dictation's FIRST
// interim word sets `smartText`, which unmounted the voice door — and that
// button is the only user-reachable `stopVoice()` in the shell, the only thing
// that renders "Listening…", and the only `aria-pressed`. The 20s idle backstop
// resets on every result, so it never fires while someone is talking.
// The guard is `|| listening` now. This holds it there.
//
// BOTH globals are faked on purpose: Chromium defines `window.SpeechRecognition`
// and the shell reads `SpeechRecognition || webkitSpeechRecognition`, so faking
// only the webkit one leaves the real engine in charge and the test green for
// the wrong reason.
test('the voice door stays while the mic is live, so it can be switched off', async ({ page }) => {
  await page.addInitScript(() => {
    class FakeRec {
      constructor() { this.lang = ''; this.continuous = false; this.interimResults = false; window.__rec = this; }
      start() { this.started = true; }
      stop() { this.stopped = true; if (this.onend) this.onend(); }
      abort() { this.stopped = true; }
      // one interim word — the first thing any real dictation produces
      say(text) {
        const res = [Object.assign([{ transcript: text }], { isFinal: false, length: 1 })];
        if (this.onresult) this.onresult({ resultIndex: 0, results: Object.assign(res, { length: res.length }) });
      }
    }
    window.SpeechRecognition = FakeRec;
    window.webkitSpeechRecognition = FakeRec;
  });
  await fresh(page);

  // PREMISE: the door is offered, and tapping it really starts the recognizer.
  const door = page.locator('button.voice-door');
  await expect(door).toHaveCount(1);
  await door.click();
  expect(await page.evaluate(() => !!(window.__rec && window.__rec.started)), 'dictation started').toBe(true);

  // THE MOMENT THAT BROKE IT: one interim word lands in the field.
  await page.evaluate(() => window.__rec.say("mom's 80th birthday"));
  await page.waitForTimeout(400);
  expect(await page.inputValue('#smart-text-input')).not.toBe('');

  // …and the way out must still be on screen.
  await expect(door, 'the stop control survives the first spoken word').toHaveCount(1);
  await expect(door).toHaveAttribute('aria-pressed', 'true');
  await expect(door).toContainText(/listening/i);

  // And it genuinely stops.
  await door.click();
  expect(await page.evaluate(() => !!window.__rec.stopped), 'tapping it stops the recognizer').toBe(true);
});
