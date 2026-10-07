// ─── "SAY IT LIKE YOU'D TEXT A FRIEND" TOLD A HOST NOTHING ────────────────
//
// Host, 2026-10-06: "too ambitious and not enough direction."
//
// Both halves are right and UX_06 already says so. Its opening rule is that
// copy must do at least one of: tell the planner what is happening, why it
// matters, or WHAT TO DO. "Say it like you'd text a friend" names a register,
// not content — a host still does not know whether to type three words or a
// paragraph, or which facts matter. And its empty-state rule is literally
// "explain what goes here and how to start".
//
// "I'll take it from there" is the ambition. The parser is good and it is not
// that good, which is why DIDN'T MAKE IT INTO THE PLAN exists at all. A
// promise the next screen walks back is worse than a smaller promise kept.
//
// This gates DIRECTION, not a particular sentence — the wording is the host's
// to change, and a spec that pins prose breaks on every edit. What it refuses
// is a creation screen that names none of the three things the plan actually
// needs, and the return of the over-promise.
import { test, expect } from './fixtures.mjs';

test('THE SCREEN SAYS WHAT TO TYPE', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* private */ } });
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await expect(page.getByText(/what are we planning/i)).toBeVisible({ timeout: 20000 });
  const txt = await page.evaluate(() => document.body.innerText || '');

  // The three the plan cannot start without — the same three the recognition
  // chips show back (type, headcount, date). Named, in the host's words, on
  // the screen rather than only inside a placeholder that vanishes on keypress.
  expect(txt).toMatch(/occasion/i);
  expect(txt).toMatch(/how many/i);
  expect(txt).toMatch(/\bwhen\b/i);

  // A worked example, visible rather than placeholder-only. This reverses the
  // 2026-07-11 "the prompt stands alone" ruling, which removed example chips
  // from this screen — revisited by the same owner on 2026-10-06, deliberately,
  // and recorded here so the next reader sees a decision rather than a lapse.
  expect(txt).toMatch(/Mom.s 80th in Santa Fe/i);

  // And the promise is the smaller, keepable one.
  expect(txt).not.toMatch(/take it from there/i);
});
