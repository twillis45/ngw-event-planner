// ─── CAPTURE: PRE-REDESIGN HOST V2 PEOPLE vs REDESIGNED PEOPLE ──────────────
//
// OWNER REQUIREMENT 8, 2026-10-20: acceptance evidence covering capability,
// routes, data authority, persistence, mobile / tablet / desktop, light / dark,
// and a representative populated and sparse state.
//
// ── WHAT MAKES THE COMPARISON MEANINGFUL ───────────────────────────────────
//
// THE SAME EVENT, THE SAME STORAGE, THE SAME SHELL — the only difference
// between a baseline frame and its redesigned twin is `?people=1`. Requirement
// 4 asks for the same fixtures "where practical"; here it is not merely
// practical, it is unavoidable, because the redesign is composed INSIDE the
// existing Guests door rather than beside it. There is no second application to
// drift from, which is the whole point of the preservation mechanism.
//
// ── NOT AN ASSERTION SUITE ─────────────────────────────────────────────────
//
// Its output is the PNGs, the same contract driftCapture.spec.mjs states. The
// behavioural assertions live in thePeopleZoneTellsTheTruth.spec.mjs; a capture
// that also asserted would fail for reasons that have nothing to do with what
// it photographs. Env-gated and `_`-prefixed like the other four instruments,
// so the ordinary suite never pays for it.
//
//   PEOPLE_COMPARE=1 npx playwright test e2e/_peopleBaselineCompare.spec.mjs \
//     --project=desktop
//
// Output goes to /review-artifacts/ (gitignored, regenerable). Nothing here
// writes to hostv2/review-shots/ — those are the owner's durable reference
// baselines and this instrument must never overwrite them.
import { test, openSectionByName } from './fixtures.mjs';
import fs from 'node:fs';

const OUT = new URL('../../review-artifacts/2026-10-20_people_baseline_vs_redesign/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

test.skip(!process.env.PEOPLE_COMPARE, 'capture instrument — set PEOPLE_COMPARE=1 to run');
test.describe.configure({ timeout: 180_000 });

const dateIn = (d) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t.toISOString().slice(0, 10);
};

// ── THE TWO STATES, both deliberately chosen to exercise what the redesign
// claims. POPULATED carries replies, a plus-one, kids and an unowned access
// need, so the attendance band has real spread and the needs zone has something
// to say. SPARSE carries an APP-SUPPLIED estimate and no roster — the state
// where the baseline shows a number with no provenance at all, which is the
// single clearest before/after in the slice.
const EVENTS = {
  populated: {
    id: 'cap-people-pop', name: 'The Cookout', type: 'Cookout', date: dateIn(45),
    venueCity: 'Annapolis', state: 'MD', totalBudget: 4000, budget: [], vendors: [],
    guestMode: 'list',
    guests: [
      { id: 'g1', name: 'Tonya Brooks', rsvp: 'Yes', kids: 2 },
      { id: 'g2', name: 'Ray Okafor', rsvp: 'Yes', plusOne: 'Denise' },
      { id: 'g3', name: 'Uncle Joe', rsvp: 'Maybe' },
      { id: 'g4', name: 'Marcus Hall', rsvp: '' },
      { id: 'g5', name: 'Pat Reyes', rsvp: 'No' },
    ],
    accessNeeds: [{ kind: 'step-free', phrase: 'she uses a walker', source: 'host-said' }],
  },
  sparse: {
    id: 'cap-people-sparse', name: 'The Cookout', type: 'Cookout', date: dateIn(45),
    venueCity: 'Annapolis', state: 'MD', totalBudget: 4000, budget: [], vendors: [], guests: [],
    guestMode: 'count', guestEstimate: 40, guestCountSource: 'playbook-typical',
  },
};

const VIEWPORTS = [
  { tag: '390', width: 390, height: 844, mobile: true },   // mobile flagship
  { tag: '834', width: 834, height: 1112, mobile: false }, // tablet portrait
  { tag: '1440', width: 1440, height: 900, mobile: false },// desktop
];

const settle = async (page) => {
  await page.waitForFunction(() => {
    const sp = document.querySelector('.splash');
    if (sp) {
      const cs = getComputedStyle(sp);
      if (cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01) return false;
    }
    const app = document.querySelector('.app');
    return !!app && (app.innerText || '').trim().length > 120;
  }, null, { timeout: 20_000 });
  await page.waitForTimeout(400);
};

/** One frame: seed, open the Guests door, photograph the sheet. */
const frame = async (page, { ev, theme, people, name }) => {
  await page.context().clearCookies();
  await page.addInitScript((e) => {
    try {
      localStorage.clear();
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
      localStorage.setItem('ngw-hostv2-last-event', e.id);
      localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
      localStorage.setItem('ngw-welcomed', '1');
      localStorage.setItem('ngw-v2-welcomed', '1');
    } catch (_) { /* private mode: the capture is not worth a throw */ }
  }, ev);
  await page.goto(`?elegant=1&theme=${theme}${people ? '&people=1' : ''}`);
  await settle(page);
  await openSectionByName(page, 'Guests', { settle: 700 });
  await page.waitForTimeout(500);
  const sheet = page.locator('.sheet');
  // The sheet when it exists, else the whole stage — a frame is better than a
  // gap, and a missing sheet is itself worth seeing in the artefact.
  if (await sheet.count()) await sheet.first().screenshot({ path: `${OUT}/${name}.png` });
  else await page.screenshot({ path: `${OUT}/${name}--NO-SHEET.png`, fullPage: false });
};

for (const vp of VIEWPORTS) {
  test(`People, baseline vs redesigned — ${vp.tag}px`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const state of ['populated', 'sparse']) {
      for (const theme of ['dark', 'light']) {
        for (const people of [false, true]) {
          await frame(page, {
            ev: EVENTS[state],
            theme,
            people,
            name: `${state}-${vp.tag}-${theme}-${people ? 'redesigned' : 'baseline'}`,
          });
        }
      }
    }
  });
}
