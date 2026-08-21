// ─── MOTION: THE THREE CLAIMS THAT ARE NOT A MATTER OF TASTE ────────────────
//
// The 2026-08-21 motion audit found this app strong on state feedback and
// reduced motion, and behind the category on ONE axis: continuity. Nothing
// connected a before-state to an after-state. A sheet opened from the last row
// of a list rose from the same 24px offset as one opened from the first.
//
// Three of the fixes make claims a machine can check, and each has a failure
// mode that looks fine on screen:
//
//  1. THE SHEET HAS AN ORIGIN. Easy to "ship" and have do nothing — if the
//     custom property never gets written, every sheet quietly keeps the 24px
//     default and the feature is indistinguishable from its own absence.
//  2. THE BAR FILLS MOVED FROM width TO scaleX. A geometry change disguised as
//     a performance change: scaleX(0.43) of a full-width element and width:43%
//     should land on the same pixel, and if they do not, every progress bar in
//     the app is now lying by a few percent.
//  3. THE LANDING RING CLEARS UNDER REDUCED MOTION. The ring lived in the base
//     rule and only the animation removed it, so `animation:none` left it
//     stuck on permanently. Invisible to anyone not running the preference.
import { test, expect, settled } from './fixtures.mjs';

const boot = async (page, opts = {}) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-hostv2-last-event', 'test-two-days');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1' + (opts.q || ''));
  await settled(page);
};

test('a sheet rises from the row that opened it, not from a constant', async ({ page }) => {
  await boot(page);

  // Open the same surface from two rows far apart on the screen, and compare
  // the origin each one recorded. Reading --from-y off the element is the
  // machine-checkable definition of "it has an origin" — the pixels during a
  // 260ms animation are not something a test should be chasing.
  // The rail is the obvious row list and it only exists at desktop. Skipping
  // mobile would be exactly the wrong call — 390px IS the flagship target, and
  // it is where a sheet covers the whole screen and the origin cue does the
  // most work. So the test finds whichever door list this viewport actually
  // has: the rail above 1280, the Sections sheet below it.
  const rowsFor = async () => {
    const rail = page.locator('.srail-row:not(.srail-min)');
    if (await rail.count()) return rail;
    // The phone's door is two taps, and the exact path is the one a11yFloor
    // already walks (its own header records getting this wrong once).
    await page.locator('.ev-eyebrow').first().click({ timeout: 6000 });
    await page.locator('.sheet').last()
      .getByText('Jump to a section', { exact: false }).first().click({ timeout: 6000 });
    await settled(page);
    return page.locator('.sheet .sec-row');
  };

  const openFrom = async (nth) => {
    const rows = await rowsFor();
    const row = rows.nth(nth);
    await row.scrollIntoViewIfNeeded();
    const box = await row.boundingBox();
    await row.click();
    await settled(page);
    // Read the PAINTED first frame, not the property.
    //
    // The first version of this asserted `--from-y` off the inline style and
    // was worthless: red-proofing it by reverting the keyframe to a constant
    // 24px left it green, because JS still wrote the property that nothing
    // read any more. That is the exact "shipped and does nothing" failure this
    // test exists to catch, and the test had it.
    //
    // Pinning the animation to currentTime 0 and reading the computed matrix
    // asks the only question that matters: where does this sheet actually
    // start from. The translateY is the matrix's 6th component.
    const fromY = await page.locator('.sheet').evaluate((n) => {
      const anim = n.getAnimations().find((a) => a.animationName === 'sheetrise');
      if (!anim) return NaN;
      anim.pause();
      anim.currentTime = 0;
      const m = new DOMMatrixReadOnly(getComputedStyle(n).transform);
      return m.m42;
    });
    await page.keyboard.press('Escape');
    await settled(page);
    return { fromY, tapY: box.y + box.height / 2 };
  };

  const first = await openFrom(0);
  const last = await openFrom(8);

  // Both recorded something, and it is not the default.
  expect(Number.isFinite(first.fromY)).toBe(true);
  expect(Number.isFinite(last.fromY)).toBe(true);
  // The two origins differ, and they differ in the same direction the taps did.
  expect(last.tapY).toBeGreaterThan(first.tapY);
  expect(last.fromY).toBeGreaterThan(first.fromY);
  expect(last.fromY - first.fromY).toBeGreaterThan(80);
  // Clamped: a full-viewport travel at a fixed 260ms reads as a lurch.
  expect(last.fromY).toBeLessThanOrEqual(320);
});

test('a scaled bar fill lands where the width-based one did', async ({ page }) => {
  await boot(page);

  // The equivalence is the whole safety argument for the change, so assert it
  // directly: build both forms in the page at the same stops and compare the
  // painted extent. Anything over half a pixel apart means every bar in the app
  // shifted when the implementation did.
  const drift = await page.evaluate(() => {
    const track = document.createElement('div');
    track.style.cssText = 'position:fixed;left:0;top:0;width:300px;height:10px;overflow:hidden;visibility:hidden';
    const scaled = document.createElement('i');
    const widthed = document.createElement('i');
    for (const el of [scaled, widthed]) { el.style.display = 'block'; el.style.height = '100%'; }
    track.append(scaled, widthed);
    document.body.append(track);
    const out = [];
    for (const pct of [0, 7, 43, 99, 100]) {
      scaled.style.cssText += ';width:100%;transform-origin:left center;transition:none';
      scaled.style.transform = `scaleX(${pct / 100})`;
      widthed.style.width = pct + '%';
      const a = scaled.getBoundingClientRect().width * (pct / 100 === 0 ? 0 : 1);
      // getBoundingClientRect already reports the TRANSFORMED box, so this is
      // the painted extent, not the layout width.
      out.push(Math.abs(scaled.getBoundingClientRect().width - widthed.getBoundingClientRect().width));
      void a;
    }
    track.remove();
    return Math.max(...out);
  });
  expect(drift).toBeLessThanOrEqual(0.5);

  // And the real ones are actually driven by the property now — a bar still
  // carrying an inline width would mean a call site was missed.
  await page.locator('.sheet').count();
  const stragglers = await page.locator('.bar i').evaluateAll(
    (ns) => ns.filter((n) => n.style.width && n.style.width !== '100%').length);
  expect(stragglers).toBe(0);
});

test.describe('reduced motion', () => {
  test('the landing ring is legible and does not stack up', async ({ page }) => {
    // Emulated on the page rather than declared with `test.use({reducedMotion})`,
    // because that form silently did not reach the page here — `matchMedia(
    // '(prefers-reduced-motion: reduce)').matches` read FALSE inside a describe
    // that declared it, so the test was passing/failing against the ordinary
    // stylesheet while claiming to test the reduced one. A reduced-motion test
    // that is not actually in reduced motion is the worst kind of green, so
    // this asserts the emulation took before it asserts anything about the ring.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await boot(page);
    const on = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
    expect(on, 'reduced-motion emulation did not take').toBe(true);
    // The base rule's ring is a 2px core PLUS an 8px halo, sized to be seen for
    // three seconds and then leave. With animations off it never left. The
    // accommodation keeps the core (the row-level-CTA law needs the host to be
    // told where they landed) and drops the transient halo.
    const halo = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.className = 'rowfocus';
      document.body.append(probe);
      const shadow = getComputedStyle(probe).boxShadow;
      probe.remove();
      return shadow;
    });
    expect(halo).not.toBe('none');
    // One ring, not two: the halo's 8px spread must be gone.
    //
    // NOT `split(',')` — that was the first version and it counted 7, because
    // a computed box-shadow spells its colors `rgb(78, 104, 119)` and every
    // one of those commas looks like a layer separator. Each layer contributes
    // exactly one color function, so counting those counts layers.
    const layers = (halo.match(/rgba?\(/g) || []).length;
    expect(layers, `expected one ring, got: ${halo}`).toBe(1);
  });
});
