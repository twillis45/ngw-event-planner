// ─── THE DAY FITS THE MOMENT (UX_11 rule 13, cohesion batch A, 11/24/2026) ───
//
// Owner-approved cohesion audit, 11/24/2026, P1 #1: on the event day the board
// headed its list "Still open from planning · not today’s job" and put cards
// tagged "due today" under it ("5 things need you today", "Reconfirm 3
// vendors for the day · due today").
//
// Rule 13: plain urgency that fits where she is, and "NOW" only means now.
// Two checks, at the day before, the event day before the first cue, during
// a cue, and two days after, on a host's own plan and the Wanda sample:
//   1. No section headed "not today’s job" holds a card saying "due today",
//      "past its window", "needs you today" or "need you today".
//   2. A "now" label (the walkthrough's `.now-label`, the board hero's cue
//      eyebrow) says now only while the clock is inside that cue: never the
//      day before, never two days after, never before the first cue.
import { test, expect } from './fixtures.mjs';
import { EVENTS, MOMENTS, boot, openStage } from './theDayStageFixture.mjs';

const TODAY_WORDS = /due today|past (its|their) window|needs? you today/i;

// Runs in the page: each section header's `when` text, with the text of the
// cards that follow it until the next header.
const sections = () => [...document.querySelectorAll('.sect')].map((s) => {
  const when = (s.querySelector('.when') || {}).innerText || '';
  const parts = [];
  for (let n = s.nextElementSibling; n && !n.classList.contains('sect'); n = n.nextElementSibling) parts.push(n.innerText || '');
  return { head: (s.innerText || '').replace(/\s+/g, ' ').trim(), when: when.trim(), body: parts.join('\n') };
});

// Runs in the page: every visible label that claims the present moment.
const nowLabels = () => [...document.querySelectorAll('.now-label, [data-dayof-cue] .of')]
  .filter((e) => e.getClientRects().length)
  .map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim())
  .filter((t) => /\bnow\b/i.test(t));

for (const ev of EVENTS) {
  for (const [when, at] of Object.entries(MOMENTS)) {
    test(`the day fits the moment — ${ev.label}, ${when}`, async ({ page }) => {
      await boot(page, ev, at);
      const wrong = [];
      for (const stage of ['Plan', 'The Day']) {
        await openStage(page, stage);
        for (const s of await page.evaluate(sections)) {
          if (/not today/i.test(s.when) && TODAY_WORDS.test(s.body)) {
            wrong.push(`${stage}: "${s.head}" sits over "${(s.body.match(TODAY_WORDS) || [])[0]}"`);
          }
        }
        const claims = await page.evaluate(nowLabels);
        if (when !== 'during') for (const c of claims) wrong.push(`${stage}: "${c}" when it is not now (${when})`);
      }
      expect(wrong, wrong.join('\n')).toEqual([]);
    });
  }
}
