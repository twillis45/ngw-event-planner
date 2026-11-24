// ─── HOST WORDS ON EVERY STAGE (UX_11 rule 4, cohesion batch A, 11/24/2026) ──
//
// Owner-approved cohesion audit, 11/24/2026, P1 #3: the day-of board printed
// engine copy to the host — "Planning this as retirement party + birthday
// (compound event, requires merging).", "Open decisions block timeline,
// vendor, and approval progress downstream." and a title cut mid-quote,
// `Resolve "… ask coworkers + family for ".`
//
// Rule 4: no app shorthand, engine ids or developer copy. This sweep reads the
// visible text of every stage (Plan, The Day, After) for a host's own plan and
// the Wanda sample, with the clock at the day before, the event day before
// and during the run of show, and two days after, and fails on any word in
// src/lib/hostWords.json (the audit's jargon list) or a quote closed on
// nothing. Fixed at the source (the engines' host-facing text), never masked.
import { test, expect } from './fixtures.mjs';
import { EVENTS, MOMENTS, HOST_WORDS, boot, openStage } from './theDayStageFixture.mjs';

const STAGES = ['Plan', 'The Day', 'After'];

const offenders = (text) => {
  const out = [];
  for (const h of HOST_WORDS) {
    const re = new RegExp(h.re, h.flags.includes('g') ? h.flags : h.flags + 'g');
    for (const m of text.matchAll(re)) {
      const at = m.index;
      out.push(`${h.word}: …${text.slice(Math.max(0, at - 50), at + 40).replace(/\s+/g, ' ')}…`);
    }
  }
  return out;
};

for (const ev of EVENTS) {
  for (const [when, at] of Object.entries(MOMENTS)) {
    test(`host words on every stage — ${ev.label}, ${when}`, async ({ page }) => {
      await boot(page, ev, at);
      const found = [];
      for (const stage of STAGES) {
        await openStage(page, stage);
        const text = await page.evaluate(() => (document.querySelector('.app') || document.body).innerText || '');
        expect(text.length, `premise: ${stage} rendered`).toBeGreaterThan(120);
        for (const o of offenders(text)) found.push(`${stage} · ${o}`);
      }
      expect(found, found.join('\n')).toEqual([]);
    });
  }
}
