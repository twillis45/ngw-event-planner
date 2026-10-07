// ─── THE ONE ELEMENT ON THE SCREEN THAT IS NOT OURS ───────────────────────
//
// C4 of the 2026-10-06 audit, narrowed by the board: the guest row offered
// FOUR controls for one integer — the app's own minus and plus, a text field,
// and the browser's native spinner duplicating the first two inside the third.
// The verifier's cleanest measurement was that `rgb(66,66,66)` occupied 238
// pixels on the guest screen and ZERO across the other nine captures: a colour
// appearing nowhere else in the system, on the control that sets the number
// every engine in the product reads from.
//
// Censused 2026-10-06: sixteen `type="number"` inputs in this shell, and the
// suppression rule named exactly one of them — `.bigval-input`, written for
// the display input. The other fifteen shipped the artifact.
//
// PLATFORM SCOPE, stated rather than implied by a green check. This asserts
// the suppression is in force in the browser it runs in. iOS WebKit paints its
// stepper through a mechanism this pseudo-element never exposed, and
// Playwright's WebKit is the desktop port with a spoofed user agent — so
// neither this spec nor its absence settles the iPhone. The claim is "no OS
// stepper where we can suppress one."
import { test, expect } from './fixtures.mjs';

test('NO OS STEPPER on any of our number fields', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* private */ } });
  await page.goto('./?elegant=1');
  await expect(page.locator('.app, .sheet').first()).toBeVisible({ timeout: 20000 });

  // Probe the RULE rather than hunting a surface: mount one of each shape the
  // shell uses and read the computed style. A sweep of live screens would only
  // ever cover the screens it managed to reach, which is how the first fix
  // covered one input of sixteen.
  const seen = await page.evaluate(() => {
    const out = [];
    for (const cls of ['field', 'bigval-input']) {
      const el = document.createElement('input');
      el.type = 'number';
      el.className = cls;
      document.body.appendChild(el);
      const cs = getComputedStyle(el);
      const spin = getComputedStyle(el, '::-webkit-inner-spin-button');
      out.push({
        cls,
        appearance: cs.appearance || cs.webkitAppearance || '',
        spinDisplay: spin ? spin.display : 'n/a',
      });
      el.remove();
    }
    return out;
  });

  expect(seen.length).toBe(2);
  for (const s of seen) {
    // textfield appearance is the suppression; `none` on the pseudo is the
    // other half. Either one holding means no painted stepper.
    const suppressed = /textfield/.test(s.appearance) || s.spinDisplay === 'none';
    expect(suppressed, `${s.cls}: appearance=${s.appearance} spin=${s.spinDisplay}`).toBe(true);
  }
});
