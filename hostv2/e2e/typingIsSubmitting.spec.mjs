// ─── THE CREATION SCREEN HAD NO SUBMIT ────────────────────────────────────
//
// Bench C of the 2026-10-06 review board, scoring input friction 3/10 twice:
// these are "the two cheapest fixes in the whole audit" and they went another
// four commits without being taken.
//
// THREE FAILURES OF ONE AFFORDANCE, stacked:
//   • `grep -c '<form'` over the whole shell returns ZERO. No form element
//     means no implicit submission.
//   • The input carried `onChange` and nothing else — pressing Return did
//     nothing at all.
//   • The real submit, "Put my plan together", is conditionally rendered on
//     `effType` and sits below the keyboard-reduced fold at 390px.
// So the only affordance adjacent to the field was the microphone, and on a
// real device tapping it raises an OS permission sheet over the creation
// screen. The audit's own capture robot fell into that before any human was
// looking: it typed the sentence, clicked the adjacent button, and put the app
// into dictation.
//
// AND THE MIC'S NAME WAS A WCAG 2.5.3 FAILURE (Label in Name, Level A):
// visible text "Say it", accessible name "Speak it instead". A voice-control
// user saying "tap Say it" got nothing. `a11yFloor` passes because the button
// HAS a name — it measures presence, not correspondence.
import { test, expect } from './fixtures.mjs';

const SEED = "Mom's 80th birthday in Santa Fe New Mexico on June 14 2027, "
  + 'about 30 people flying in for 3 nights, dinner at an adobe courtyard';

const toCreate = async (page) => {
  await page.addInitScript(() => {
    try { localStorage.clear(); } catch { /* private mode */ }
    // The mic must never be reached by this spec. If a change ever routes
    // Enter into dictation, this makes it a failure rather than a hang.
    window.__micCalls = 0;
    const orig = window.SpeechRecognition || window.webkitSpeechRecognition;
    const Spy = function () { window.__micCalls += 1; return new orig(); };
    if (orig) { window.SpeechRecognition = Spy; window.webkitSpeechRecognition = Spy; }
  });
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await expect(page.getByText(/what are we planning/i)).toBeVisible({ timeout: 20000 });
};

test('ENTER SUBMITS: typing and pressing Return builds the plan', async ({ page }) => {
  await toCreate(page);
  const box = page.getByPlaceholder(/crab feast/i).first();
  await box.fill(SEED);
  // (premise) the parser has resolved a type — the same condition the button
  // waits for. Without this, Enter could be "correctly" inert and the test
  // would be asserting the wrong thing.
  await expect(page.getByRole('button', { name: /^Put my plan together$/ })).toBeVisible({ timeout: 20000 });

  await box.press('Enter');

  // It reaches the plan by the host's own route, with no mouse.
  await expect(page.getByRole('button', { name: /^Open your plan$/ })).toBeVisible({ timeout: 20000 });
  expect(await page.evaluate(() => window.__micCalls || 0)).toBe(0);
});

test('AND IT HONOURS THE SAME GUARD THE BUTTON DOES', async ({ page }) => {
  // Enter must not be a back door around the date-conflict block. If the
  // button refuses to assemble, Return must refuse too — otherwise the
  // keyboard path creates a plan the pointer path declines to.
  await toCreate(page);
  const box = page.getByPlaceholder(/crab feast/i).first();
  await box.fill(SEED);
  const cta = page.getByRole('button', { name: /^Put my plan together$/ });
  await expect(cta).toBeVisible({ timeout: 20000 });
  const blocked = await cta.isDisabled();
  await box.press('Enter');
  await page.waitForTimeout(1200);
  const assembled = await page.getByRole('button', { name: /^Open your plan$/ }).isVisible().catch(() => false);
  // Whatever the button does, Enter does. On this seed nothing blocks, so both
  // proceed; the assertion is the AGREEMENT, which holds either way.
  expect(assembled).toBe(!blocked);
});

test('LABEL IN NAME: the mic\'s accessible name contains its visible text', async ({ page }) => {
  await toCreate(page);
  const bad = await page.evaluate(() => {
    const out = [];
    for (const b of document.querySelectorAll('button[aria-label]')) {
      const visible = (b.innerText || '').trim();
      const name = (b.getAttribute('aria-label') || '').trim();
      if (!visible) continue;                        // icon-only is out of scope
      if (!name.toLowerCase().includes(visible.toLowerCase())) {
        out.push(`"${visible}" -> aria-label "${name}"`);
      }
    }
    return out;
  });
  expect(bad).toEqual([]);
});

// ── AND THE PRIMARY SLOT IS NOT A MICROPHONE ────────────────────────────
// A demo host, 2026-10-06: "the say it seemed innately like an enter or
// submit button". That settles what three board seats split on — it was the
// GEOMETRY. `.create-inputrow` is align-items:stretch and the control took
// the field's own --r-lg, so it rendered as the input's right-hand cap and
// the word on it could not argue.
// This gates the composition rather than the copy: whatever sits welded to
// that field must be the thing that submits.
test('THE PRIMARY SLOT SUBMITS: no control impersonates the field\'s cap', async ({ page }) => {
  await toCreate(page);
  const row = await page.evaluate(() => {
    const el = document.querySelector('.create-inputrow');
    if (!el) return null;
    return {
      buttons: [...el.querySelectorAll('button')].map((b) => (b.innerText || '').trim()),
      hasInput: !!el.querySelector('input'),
    };
  });
  expect(row, 'the creation input row exists').toBeTruthy();
  expect(row.hasInput).toBe(true);
  // Nothing shares the field's row but the field. Voice moved to a text link.
  expect(row.buttons).toEqual([]);

  // …and voice is still reachable, as a secondary door, in the pattern this
  // screen already uses for its other one.
  const txt = await page.evaluate(() => document.body.innerText || '');
  expect(txt).toMatch(/speak it instead/i);

  // The honest end of it: there is exactly ONE control that submits, not an
  // inline button and a below-fold CTA saying different things.
  await page.getByPlaceholder(/crab feast/i).first().fill(SEED);
  await expect(page.getByRole('button', { name: /^Put my plan together$/ })).toBeVisible({ timeout: 20000 });
  const submits = await page.evaluate(() => [...document.querySelectorAll('button')]
    .filter((b) => /put my plan together/i.test(b.innerText || '')).length);
  expect(submits).toBe(1);
});
