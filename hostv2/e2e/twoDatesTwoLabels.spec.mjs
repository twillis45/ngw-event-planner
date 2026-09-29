// TWO IDENTICAL BOXES, NO WORDS (host report 2026-09-29).
// The creation step's date row is two <input type="date"> stacked on top of
// each other. Each carried an aria-label ("First day" / "Last day"), so a
// screen reader was told which was which and a sighted host was told nothing —
// two identical grey boxes, and the only way to learn which one was the end of
// the trip was to type in it and watch the countdown move.
//
// UX_05 is explicit and was not being followed here: "Position: ABOVE the
// input, always. Never inline/left-aligned." The <label> now wraps the input,
// so the visible text IS the accessible name — one string rather than two that
// can drift apart.
//
// Both cases are asserted, because a label that appears on every event would
// be its own defect: most events are one day, and the second field is deliberate
// progressive disclosure.
import { test, expect } from '@playwright/test';

const openCreate = async (page, sentence) => {
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* private mode */ } });
  await page.goto('./?elegant=1');
  await page.getByText(/Start my event/i).first().click();
  const box = page.getByPlaceholder(/crab feast/i).first();
  await box.fill(sentence);
  await page.getByText(/^Say it/i).first().click();
  // The confirm screen's date row opens from the date chip.
  const chip = page.locator('button', { hasText: /pick a day|^[A-Z][a-z]{2} \d/ }).first();
  await chip.waitFor({ state: 'visible', timeout: 15000 });
  await chip.click();
  await expect(page.locator('input[type="date"]').first()).toBeVisible({ timeout: 10000 });
};

test('a span shows FIRST DAY and LAST DAY, each above its own box', async ({ page }) => {
  // A sentence the parser actually resolves into a span. NOTE, measured while
  // writing this: "June 14 2027 to June 17 2027" does NOT parse as a range —
  // the tail lands in "didn't make it into the plan". Separate defect; this
  // gate is about the labels, so it uses a form that reaches the field.
  await openCreate(page, "Mom's 80th birthday in Santa Fe New Mexico on June 14 2027, about 30 people flying in for 3 nights");

  const inputs = page.locator('.field-lbl input[type="date"]');
  await expect(inputs).toHaveCount(2);

  // Not "somewhere on the screen" — the word has to sit on the box it names.
  await expect(page.locator('.field-lbl', { hasText: 'First day' }).locator('input[type="date"]')).toHaveCount(1);
  await expect(page.locator('.field-lbl', { hasText: 'Last day' }).locator('input[type="date"]')).toHaveCount(1);

  // ABOVE, per UX_05 — measured, not assumed.
  for (const word of ['First day', 'Last day']) {
    const lbl = page.locator('.field-lbl', { hasText: word }).first();
    const span = await lbl.locator('span').first().boundingBox();
    const inp = await lbl.locator('input[type="date"]').first().boundingBox();
    expect(span, `${word}: label has no box`).toBeTruthy();
    expect(inp, `${word}: input has no box`).toBeTruthy();
    expect(span.y + span.height, `${word} must sit ABOVE its input`).toBeLessThanOrEqual(inp.y + 1);
  }

  // The accessible name comes from the visible text, so the two cannot drift.
  await expect(page.getByLabel('Last day')).toHaveAttribute('type', 'date');
});

test('a one-day event says EVENT DATE and offers no second box', async ({ page }) => {
  await openCreate(page, 'cookout June 14 2027 for 20 people in Baltimore MD');

  await expect(page.locator('.field-lbl', { hasText: 'Event date' }).locator('input[type="date"]')).toHaveCount(1);
  await expect(page.locator('.field-lbl', { hasText: 'Last day' })).toHaveCount(0);
  await expect(page.locator('.field-lbl input[type="date"]')).toHaveCount(1);
});
