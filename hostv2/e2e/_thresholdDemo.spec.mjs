// ─── DEMO: the four new rules, on the screen a host actually sees ───────────
//
// Prefixed `_` like the other capture specs: this is an INSTRUMENT, not a
// guard. It asserts only enough to prove it reached the thing it photographs.
// The real guard for these rules is
// `src/lib/__tests__/theRuleMatchesItsOwnSentence.test.js`.
//
//   THRESHOLD_DEMO=1 npx playwright test e2e/_thresholdDemo.spec.mjs --project=desktop
//
// ENV-GUARDED AND SELF-PINNED, for the same two reasons as its siblings. It
// pins its own 393x852 geometry, so the six-project matrix would write six sets
// of screenshots to one path; it is listed in the config's SELF_PINNED so only
// `desktop` sees it. And it boots twice per case against the real preview
// server, so without the skip it would add four slow cases to a suite already
// sharded three ways to stay under the 30-minute job timeout.
//
// WHAT IT SHOWS. Four decisions gained a `recommendedWhen` rule on 2026-09-24,
// each threshold taken from the decision's own authored prose. This drives the
// REAL built bundle at iPhone dimensions and photographs the same decision on
// two events that differ only in headcount — one either side of the threshold.
//
//   Get-Together/food_style     25    Host grills everything  /  Hire a pitmaster
//   Engagement Party/help       30    Fully DIY               /  Hire a bartender
//   Holiday Party/food_format   20    Host-cooked heavy apps  /  Drop-off catering
//   Retirement Party/help       40    Fully DIY               /  Drop-off catering
//
// THIS IS CHROMIUM, NOT iOS. 393×852 is the iPhone 14 Pro's CSS viewport and
// the emulation sets touch, mobile UA and DPR 3 — it is the real app at real
// phone dimensions, and it is NOT Safari. It cannot catch a WebKit-specific
// layout or rendering bug. Said here so a screenshot from this file is never
// mistaken for iOS evidence.
import { test, expect } from './fixtures.mjs';
import fs from 'node:fs';
import path from 'node:path';

// Alongside the other capture output, under a dated folder, so the evidence for
// a given sitting stays together instead of accumulating in one bucket.
const OUT = new URL('../../review-artifacts/2026-09-24_threshold_demo/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

// iPhone 14 Pro. Pinned here rather than taken from a project so the demo runs
// once at one geometry instead of once per matrix viewport.
// FILE-LEVEL, not inside the test body. The sibling capture specs put their
// skip in the body, which works but only AFTER the `page` fixture has launched
// a browser — so a guarded-off capture still pays for a browser start on every
// CI run. Declared here it is evaluated before fixtures and costs nothing.
test.skip(!process.env.THRESHOLD_DEMO, 'capture instrument — set THRESHOLD_DEMO=1 to run');

test.use({
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

const localISO = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const CASES = [
  // `step` is the row on the home screen that leads to the decision. Taken from
  // the captured page text, not guessed — see the note in the boot helper.
  { key: 'holiday',    type: 'Holiday Party',    name: 'Holiday Party',     threshold: 20, below: 12, above: 30, step: 'Plan the food', decision: 'food_format' },
  { key: 'gettogether',type: 'Get-Together',     name: 'Summer Cookout',    threshold: 25, below: 15, above: 40, step: 'Plan the food', decision: 'food_style' },
  { key: 'engagement', type: 'Engagement Party', name: 'Engagement Party',  threshold: 30, below: 18, above: 45, step: 'Plan the food', decision: 'help' },
  { key: 'retirement', type: 'Retirement Party', name: 'Retirement Party',  threshold: 40, below: 25, above: 60, step: 'Plan the food', decision: 'help' },
];

const boot = async (page, c, guestCount) => {
  const d = new Date(); d.setDate(d.getDate() + 45);
  await page.addInitScript(([ev, iso]) => {
    localStorage.setItem('ngw-events', JSON.stringify([{ ...ev, date: iso }]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', '1');
  }, [{
    id: c.key, name: c.name, type: c.type, createdAt: '2026-09-24',
    guestMode: 'count', guestCount,
    venueKind: 'home', guests: [], vendors: [], timeline: [], budget: [],
  }, localISO(d)]);
  // './' NOT '/'. The bundle is served under a base path
  // (/ngw-event-planner/hostv2/), and page.goto('/') resolves against the
  // ORIGIN, discarding it — the first run of this file photographed
  // "Cannot GET /" eight times and reported four passes.
  await page.goto('./');
  await page.waitForLoadState('networkidle');
};

for (const c of CASES) {
  test(`${c.type} — the proposal moves across ${c.threshold} guests`, async ({ page }) => {
    const shots = []; const texts = [];
    for (const [label, guests] of [['below', c.below], ['above', c.above]]) {
      await boot(page, c, guests);
      // ── REACHING THE DECISION, THE WAY A HOST DOES ─────────────────────
      //
      // The home screen does not show the proposal. It shows the plan steps —
      // "Plan the food →", "Bring in help →" — and the decision sits behind
      // one. The first version of this file looked for a button named
      // /decid|call|settle/ and found nothing, so it photographed the home
      // screen twice and the captures differed only in budget and headcount.
      // That looked like a working demo of the wrong thing.
      const step = page.getByText(c.step, { exact: false }).first();
      if (await step.count()) {
        await step.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(900);
      }
      const file = path.join(OUT, `${c.key}-${label}-${guests}guests.png`);
      await page.screenshot({ path: file, fullPage: false });
      shots.push(file);
      // Record what the screen says, so the demo carries text as well as pixels.
      const text = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n').slice(0, 2600));
      fs.writeFileSync(file.replace(/\.png$/, '.txt'), text);
      texts.push(text);
    }
    // ── THE INSTRUMENT CHECKS ITSELF, AND THE FIRST VERSION DID NOT ────────
    //
    // The first version asserted only "two files exist and are over 5KB". Every
    // capture was the string "Cannot GET /" at 16,022 bytes — eight identical
    // images — and all four tests PASSED. The reasoning written here was that
    // asserting a difference "would make this a guard on a layout"; that was
    // wrong, and it is the same defect the 80th-birthday capture spec recorded
    // in its own header: two byte-identical files under different names.
    //
    // A capture instrument must prove it reached the thing it photographs.
    // These are reach checks, not layout guards: they say nothing about where
    // anything sits on the screen.
    expect(shots).toHaveLength(2);
    for (const s of shots) expect(fs.statSync(s).size).toBeGreaterThan(5000);
    // 1. it reached the app, not a 404
    for (const t of texts) expect(t).not.toMatch(/Cannot GET/i);
    // 2. it reached THIS event
    for (const t of texts) expect(t.toLowerCase()).toContain(c.name.toLowerCase().slice(0, 12));
    // 3. the two runs are not the same screen photographed twice
    expect(texts[0]).not.toBe(texts[1]);
  });
}
