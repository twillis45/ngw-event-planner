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
  // Whichever door this viewport has — the rail above 1280, the two-tap menu
  // below it. First version hand-rolled the phone path and went red at four
  // viewports I had not run locally (landscape, tablet, tablet-land,
  // tablet-tall) while the feature was fine everywhere. That is the same
  // assumption that had just broken nine other specs, reintroduced in the file
  // written to replace it.
  const rowsFor = async () => {
    const rail = page.locator('.srail-row:not(.srail-min)');
    if (await rail.count()) return rail;
    await page.locator('.ev-eyebrow').first().click({ timeout: 8000 });
    await page.locator('.sheet').last()
      .getByText('Jump to a section', { exact: false }).first().click({ timeout: 8000 });
    await settled(page);
    return page.locator('.sheet').last().locator('.sec-row');
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
      // EITHER keyframe: the centered-panel breakpoint swaps `sheetrise` for
      // `panelrise`. Naming only the first is how the feature shipped with a
      // hole in it at tablet and landscape.
      const anim = n.getAnimations().find(
        (a) => a.animationName === 'sheetrise' || a.animationName === 'panelrise');
      if (!anim) return NaN;
      anim.pause();
      const at = (t) => {
        anim.currentTime = t;
        return new DOMMatrixReadOnly(getComputedStyle(n).transform).m42;
      };
      // The animation's OWN TRAVEL — first frame minus last — rather than the
      // raw first-frame offset. `panelrise` also carries a -50% centring
      // translate, and correcting for it with the sheet's height was wrong the
      // moment two sections had different heights: the correction leaked half
      // the height difference into the comparison and read as a 201px error.
      // Measuring one sheet against itself cancels the centring exactly,
      // whichever composition it is using.
      const start = at(0);
      const end = at(anim.effect.getTiming().duration || 260);
      return start - end;
    });
    // Read the top BEFORE closing. It was below the Escape at first, which
    // meant waiting 30 seconds for a locator on a sheet that had just been
    // dismissed — a timeout that looks like a hang, not like a mistake.
    const top = await page.locator('.sheet').evaluate((n) => n.getBoundingClientRect().top);
    await page.keyboard.press('Escape');
    await settled(page);
    return { fromY, tapY: box.y + box.height / 2, top };
  };

  const a = await openFrom(0);
  const b = await openFrom(8);

  // THE CLAIM, asserted per-open: the sheet starts from the tap, measured
  // against THAT sheet's own top.
  //
  // Two earlier versions compared the two opens against each other and both
  // were wrong for the same reason. At landscape the door list scrolls, so
  // "row 8" is not below "row 0"; at tablet-tall the sheet is a CENTERED
  // panel whose top moves with its own height, so two sections of different
  // heights legitimately produce origins that do not track the taps at all —
  // it read as a 201px error while the feature was behaving exactly right.
  // The relationship only ever held per-open; comparing opens was importing
  // an assumption about layout that three viewports do not share.
  const clamp = (v) => Math.max(0, Math.min(320, v));
  for (const o of [a, b]) {
    expect(Number.isFinite(o.fromY)).toBe(true);
    expect(Math.abs(o.fromY - clamp(Math.round(o.tapY - o.top))),
      `origin ${o.fromY} does not match tap ${o.tapY} - top ${o.top}`).toBeLessThanOrEqual(4);
  }
  // And it is not a constant: two taps at different heights give two origins.
  // Without this the check above would pass on a sheet that always rose 24px
  // from a top that happened to move with it.
  expect(Math.abs(a.fromY - b.fromY)).toBeGreaterThan(8);
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

test('a list entrance plays on arrival and not on every redraw', async ({ page }) => {
  test.skip(!page.viewportSize() || page.viewportSize().width < 1280,
    'needs the rail, whose collapse toggle is the re-render trigger this uses');
  await boot(page);

  // Open a sheet that carries a staggered list. Named, not indexed: the first
  // version reached for rail index 2 and got "Your money", whose rows are
  // `.brow` — so it measured zero animated `.frow` and read as the gate having
  // deleted the entrance, when the entrance was fine and the probe was aimed at
  // the wrong sheet. Five of fifteen doors carry a staggered list; this is one.
  await page.locator('.srail-row', { hasText: 'Your checklist' }).first().click();
  await settled(page);
  const animatedNow = await page.locator('.sheet .frow, .sheet .brow').evaluateAll(
    (ns) => ns.filter((n) => (n.style.animation || '').includes('cardin')).length);
  expect(animatedNow, 'the entrance did not play on arrival').toBeGreaterThan(0);

  // Past the arrival window, force a real re-render of the open sheet. The
  // rail's collapse toggle is the cleanest trigger available: it re-renders the
  // whole shell without navigating, changing data, or closing anything — so any
  // animation that comes back did so purely because the component redrew.
  await page.waitForTimeout(1100);
  await page.locator('.srail-min').click();
  await page.waitForFunction(() => document.querySelector('.stagewrap').dataset.railmin === '1');
  const animatedAfter = await page.locator('.sheet .frow, .sheet .brow').evaluateAll(
    (ns) => ns.filter((n) => (n.style.animation || '').includes('cardin')).length);
  expect(animatedAfter, 'the list re-played its entrance on a redraw').toBe(0);
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
