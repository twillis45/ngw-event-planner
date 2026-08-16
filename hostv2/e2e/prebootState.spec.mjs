// ─── THE WHITE SCREEN WAS THE DEFECT (review board, 2026-08-16) ─────────────
//
// `#root` was empty until React mounted, so a host on slow or flaky network saw
// plain white. The board's Grandmother seat used her usability override on it,
// and her reasoning is the reason this file exists rather than a nicer spinner:
//
//   "Around three seconds I think hm. Around six I tap it again, harder. At
//    fifteen I put the phone down and ask my daughter to look on hers. Who do I
//    blame? Myself, and then my phone - never the app."
//
// A white screen reads as BROKEN. A visible loading state reads as WORKING. The
// gap between them is nearly the whole experience and has nothing to do with how
// long the load takes. The failure it prevents is invisible in metrics: a slow
// app does not generate complaints, it generates quiet drop-off.
//
// Two things have to stay true, and they pull against each other, which is why
// both are gated here: the skeleton must be in the HTML BEFORE any script runs,
// and it must be GONE once the shell mounts. A skeleton that outlives the mount
// is a worse bug than the white screen, because it says "still working" forever.
import { test, expect } from './fixtures.mjs';

test.describe('the pre-mount state', () => {
  test('ships in the HTML itself, not in a bundle', async ({ page }) => {
    // Fetched as raw text, never executed — this is the whole point. If the
    // skeleton needed JavaScript it would be absent during exactly the window it
    // exists to cover.
    const res = await page.request.get('./');
    const html = await res.text();
    expect(html).toContain('class="preboot"');
    expect(html).toMatch(/Getting your plan/);
    // Inline styles too: a stylesheet is another request that can be slow or
    // fail, and then the skeleton renders unstyled on a white page.
    expect(html).toMatch(/\.preboot\s*\{/);
    // It must be INSIDE #root so React's render replaces it with no teardown.
    const rootIdx = html.indexOf('<div id="root">');
    const prebootIdx = html.indexOf('class="preboot"');
    expect(rootIdx).toBeGreaterThan(-1);
    expect(prebootIdx).toBeGreaterThan(rootIdx);
  });

  test('announces itself to a screen reader as a live status', async ({ page }) => {
    const html = await (await page.request.get('./')).text();
    // A blank screen announces nothing at all. role=status + aria-live means a
    // host using VoiceOver is told the app is working rather than left guessing.
    expect(html).toMatch(/role="status"/);
    expect(html).toMatch(/aria-live="polite"/);
  });

  test('is GONE once the shell mounts — it must not outlive the app', async ({ page }) => {
    // The failure this catches: a skeleton that survives render sits on top of a
    // working app and tells the host forever that nothing has happened. That is
    // strictly worse than the white screen it replaced.
    await page.goto('./');
    await expect(page.locator('.app')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('.preboot')).toHaveCount(0);
  });

  test('respects reduced motion by stilling the dot, not hiding the message', async ({ page }) => {
    // A host who asked for less motion still needs to know the app is working.
    const html = await (await page.request.get('./')).text();
    expect(html).toMatch(/prefers-reduced-motion/);
    expect(html).toMatch(/animation:\s*none/);
  });
});
