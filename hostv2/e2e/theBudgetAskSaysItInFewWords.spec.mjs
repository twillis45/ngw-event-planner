// ─── THE BUDGET ASK SAYS IT IN FEW WORDS (owner, 11/24/2026) ─────────────────
//
// "Copy is too wordy." Approved for a new Thanksgiving for 12, whose plan's
// lines come to $334 against a $300 typical:
//   A number to plan around
//   $400  $33 a head · covers your plan · est.
//   Your plan's lines come to about $334. The mid-range for 12 at a Thanksgiving is $300.
//   5 things not included ▾
//   [Use $400] [Change]
//   or Lean $100 · Mid-range $300 · All-out $400
// The headline is the lit button's figure (UX_11 rule 12). The mid-range is a
// tier, tappable at 44px; the old "Use $300 and trim" link and the "midpoint of
// a planning band" paragraph are gone. ("Mid-range", not the approved
// "Typical": the host's 10/06/2026 ruling, pinned in theBudgetAskSaysWhoseMoney,
// waits on the owner.) Made-up names and places only.
//
// THE NEW STRUCTURE (owner, 11/26/2026: "As rendered is fine"; UX_12 A + T2):
//   How much do you want to spend?
//   $400  $33 a head · est.
//   ( ) Lean $100  ( ) Mid-range $300  (•) All-out — Covers your plan — $400
//   ( ) A different amount
//   How we got these · 5 things not included ▸
//   [Plan with $400]
// The same rules hold: the big figure is the lit button's, the mid-range is a
// choice tappable at 44px, and the plan's lines sentence is one tap down.
import { test, expect, settled, dateIn } from './fixtures.mjs';

const EVENT = {
  id: 'few-words', name: 'Thanksgiving at the Lanes', type: 'Thanksgiving', createdAt: '2026-11-20',
  date: dateIn(10), startTime: '15:00', startTimeSource: 'host', venue: 'Our place', venueKind: 'home', venueCity: 'Springfield, VA',
  guestMode: 'count', guestCount: 12, guestCountSource: 'host', guests: [], vendors: [], budget: [], timeline: [],
};

for (const [w, h] of [[390, 844], [1440, 900]])
test(`the budget ask is short, and its numbers agree — ${w}x${h}`, async ({ page }) => {
  await page.setViewportSize({ width: w, height: h });
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.goto('?elegant=1');
  await settled(page);
  const hero = page.locator('.hero').first();
  await expect(hero).toContainText('How much do you want to spend?');
  const text = (await hero.innerText()).replace(/\s+/g, ' ');

  // The headline is the lit button's figure.
  const lit = (await hero.locator('[data-budget-plan]').innerText()).trim();
  const litFig = /^Plan with (\$[\d,]+)$/.exec(lit);
  expect(litFig, `premise: the lit button offers a figure (${lit})`).not.toBeNull();
  const headline = /How much do you want to spend\?.*?(\$[\d,]+)/.exec(text);
  expect(headline && headline[1]).toBe(litFig[1]);
  expect(litFig[1]).toBe('$400');
  expect(text).toContain('$33 a head');
  // "Covers your plan" marks the picked choice; it is the row's, not the figure's.
  await expect(hero.locator('.optrow[aria-checked="true"]')).toContainText('Covers your plan');
  expect(text).toMatch(/\d+ things? not included/);
  // The plan's lines sentence is one tap down, in "How we got these".
  await hero.locator('[data-budget-why] summary').click();
  await expect(hero.locator('[data-budget-why]')).toContainText('Your plan’s lines come to about $334. The mid-range for 12 at a Thanksgiving is $300.');

  // The mid-range is a choice, tappable at 44px.
  const typical = hero.locator('.optrow', { hasText: /Mid.range\s*\$300/ });
  await expect(typical).toBeVisible();
  const box = await typical.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);

  // The button's attention ring is whole (owner, 11/26/2026, a screenshot of it
  // cut off below "Plan with $400"). The cue's pulse reaches 15px past the button
  // (outline-offset 12 + width 3), and the editor slot clips vertically; iOS Safari
  // ignores overflow-clip-margin, so the room has to be real.
  const room = await hero.locator('[data-budget-plan]').evaluate((b) => {
    const slot = b.closest('.editor-slot');
    return slot.getBoundingClientRect().bottom - b.getBoundingClientRect().bottom;
  });
  expect(room, 'room below the button for its 15px cue ring').toBeGreaterThanOrEqual(15);

  // What went.
  expect(text).not.toContain('midpoint of a planning band');
  expect(text).not.toContain('Use $300 and trim');
  expect(text).not.toContain('the middle of the range is');
  expect(text).not.toContain('A number to plan around');
});
