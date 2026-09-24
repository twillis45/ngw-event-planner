// ─── THE FRESHNESS STAMP MUST NOT BE OLDER THAN THE PRICES IT LABELS ────────
//
// The shopping hero stamped "est. prices Jan 2026", formatted from a hardcoded
// `PRICE_TABLE_META.asOf`. That constant describes `CANONICAL_PROTEIN_PRICES` —
// a FALLBACK protein table — not the playbook purchase rows the dollars come
// from. Measured 2026-09-24 across the 533 dated rows:
//
//   earliest 2026-08-14 · latest 2026-09-17 · older than the stamp: 0
//
// Not one priced row on the screen was as old as the date the screen displayed.
// A host reading "Jan 2026" in September had been handed a reason to distrust
// numbers re-verified the month before.
//
// WHY THIS IS AN E2E AND NOT A UNIT TEST. jest cannot execute hostv2, so a jest
// assertion about this can only read the file's text. The structural half —
// that no module-scope PRICE_VINTAGE constant returns — is in
// src/lib/__tests__/theStampCannotOutliveItsData.test.js, and the ratchet in
// textGateRatchet.test.js records the split. THIS file is the half that only a
// browser can answer: what the composed sheet actually says to a host.
import { test, expect, openSectionByName } from './fixtures.mjs';

const boot = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-hostv2-last-event', 'test-day-before-vendors');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.goto('?elegant=1');
  await page.waitForFunction(() => {
    const s = document.querySelector('.splash');
    if (s && parseFloat(getComputedStyle(s).opacity) > 0.01) return false;
    const a = document.querySelector('.app');
    return !!a && (a.innerText || '').trim().length > 120;
  }, null, { timeout: 20000 });
};

// ─── THE SEPARATOR IS A NON-BREAKING SPACE (2026-09-24) ──────────────────────
//
// These matched `\w{3} \d{4}` with a LITERAL space and went red when the
// vintage was bound into one token to stop "Aug" and "2026" splitting across
// two lines. Caught by the e2e after the change had already been committed:
// the unit suites never render, so 547 green suites said nothing about it.
//
// `[\s\u00A0]` accepts either separator, because which one it is is a
// typographic decision that may change again; what these tests are for is that
// the MONTH is derived from the rows. Widened only along that axis.
test.describe('the price vintage is derived from the rows, not from a constant', () => {
  test('PREMISE — the shopping hero renders and carries a vintage stamp', async ({ page }) => {
    // Without this, both assertions below could pass on a sheet that never
    // opened: "does not say Jan 2026" is trivially true of a blank screen. This
    // is the check the threshold-demo capture did not have, which is how it
    // photographed the home screen four times and reported four passes.
    await boot(page);
    await openSectionByName(page, 'spread');
    await expect(page.locator('#sheet-title')).toBeVisible({ timeout: 8000 });
    const sheet = page.locator('.sheet').last();
    // The Shop hero led with "Bought so far / N of M" until 2026-09-24, when
    // board D moved the money to the headline and the count to the pinned
    // footer. The premise only needs proof the sheet is open and showing its
    // hero, so it now reads the line that replaced it.
    await expect(sheet).toContainText(/estimate, all in/i, { timeout: 8000 });
    await expect(sheet).toContainText(/est\. prices \w{3}[\s\u00A0]\d{4}/, { timeout: 8000 });
  });

  test('THE REGRESSION — it does not show the fallback table\'s January date', async ({ page }) => {
    await boot(page);
    await openSectionByName(page, 'spread');
    await expect(page.locator('#sheet-title')).toBeVisible({ timeout: 8000 });
    const text = await page.locator('.sheet').last().innerText();
    // Pinned as the literal the defect showed. If the price corpus is ever
    // genuinely re-verified in a January, this goes red and the reader has this
    // comment to tell them the stamp must still be DERIVED — at which point the
    // assertion is what changes, with a reason, not the derivation.
    expect(text).not.toMatch(/est\. prices Jan[\s\u00A0]2026/);
  });

  test('the month it shows is the month the corpus says, on the same screen', async ({ page }) => {
    // The positive half. "Not January" would also be satisfied by a stamp stuck
    // on some other wrong month, so the rendered month is checked against the
    // range the price rows were actually verified in.
    await boot(page);
    await openSectionByName(page, 'spread');
    await expect(page.locator('#sheet-title')).toBeVisible({ timeout: 8000 });
    const text = await page.locator('.sheet').last().innerText();
    const m = text.match(/est\. prices (\w{3})[\s\u00A0](\d{4})/);
    expect(m, 'no vintage stamp found on the food sheet').toBeTruthy();
    // Every dated row in the corpus falls in Aug–Sep 2026, and the derivation
    // takes the OLDEST so the label is true of all of them. A stamp outside this
    // window means either the corpus moved (update this WITH the reason) or the
    // derivation stopped reading the rows.
    expect(`${m[1]} ${m[2]}`).toBe('Aug 2026');
  });
});
