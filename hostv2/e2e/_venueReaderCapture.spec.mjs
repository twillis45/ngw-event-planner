// Render-first capture for the VENUE READER sitting (ROSTER step 1).
// Not a gate — env-guarded, output is gitignored review-artifacts/.
//
//   VENUE_CAPTURE=1 npx playwright test e2e/_venueReaderCapture.spec.mjs --project=desktop
//
// THE QUESTION THE BOARD IS BEING ASKED. Two engines read one fact and disagree:
//
//   eventLocationStatus(ev)     "city_only"   -> location essential HANDLED
//   deriveDecisionBlockers(ev)  venue-selection, urgency: "critical"
//
// So on a destination event with a town but no named venue, the stat column's
// Venue chip says "handled" while a card lower on the SAME screen says "Not set
// yet · Venue · Where is the event?". These captures are that contradiction in
// one frame, at each geometry, plus the two unambiguous states either side of it.
import { test } from './fixtures.mjs';
import fs from 'fs';

const OUT = new URL('../../review-artifacts/2026-08-14_venue_reader/', import.meta.url).pathname;
const VIEWPORTS = [
  ['mobile-390', 390, 844],
  ['tablet-768', 768, 1024],
  ['desktop-1440', 1440, 900],
  ['widescreen-1728', 1728, 1080],
];

const BASE = {
  type: 'Birthday', name: "Mom's 70th", isDestination: true,
  date: '2027-06-20', endDate: '2027-06-24',
  guestMode: 'count', guestEstimate: 24, guestCount: 24, totalBudget: 9000,
  budget: [], guests: [], vendors: [], timeline: [],
};

// The three states. CITY_ONLY is the disputed one; the other two are the poles
// the board can compare it against.
const CASES = [
  ['a-nothing',   { ...BASE, id: 'vr-nothing' }],
  ['b-cityonly',  { ...BASE, id: 'vr-cityonly', venueCity: 'Santa Fe', venueState: 'NM' }],
  ['c-named',     { ...BASE, id: 'vr-named', venueCity: 'Santa Fe', venueState: 'NM', venue: 'The Lodge at Santa Fe' }],
];

const boot = async (page, ev) => {
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-welcomed', '1');
  }, ev);
  await page.goto('./');
  await page.waitForFunction(() => {
    const sp = document.querySelector('.splash');
    if (sp) {
      const cs = getComputedStyle(sp);
      if (cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01) return false;
    }
    const app = document.querySelector('.app');
    return !!app && (app.innerText || '').trim().length > 120;
  }, null, { timeout: 20_000 });
};

test('capture the three venue states the sitting judges', async ({ page }) => {
  test.skip(!process.env.VENUE_CAPTURE, 'render-first capture — set VENUE_CAPTURE=1 to run');
  test.setTimeout(300000);
  fs.mkdirSync(OUT, { recursive: true });
  const facts = [];
  for (const [caseName, ev] of CASES) {
    for (const [vpName, w, h] of VIEWPORTS) {
      await page.setViewportSize({ width: w, height: h });
      await boot(page, ev);
      await page.screenshot({ path: `${OUT}${caseName}__${vpName}.png`, fullPage: true });
    }
    // The words each surface uses for the same fact, captured as text so the
    // board reads what shipped rather than what a doc says shipped.
    const read = await page.evaluate(() => {
      const vis = (n) => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      return {
        heroAsk: (document.querySelector('.hero.elegant .hzone') || {}).innerText || null,
        venueChip: [...document.querySelectorAll('.tile-a button.chip')]
          .map((c) => c.getAttribute('aria-label')).find((a) => /venue/i.test(a || '')) || null,
        cards: [...document.querySelectorAll('article.card')].filter(vis)
          .map((n) => ({ tag: (n.querySelector('.tag') || {}).innerText || null, h3: (n.querySelector('h3') || {}).innerText || null })),
        venueInputs: [...document.querySelectorAll('input')].filter(vis)
          .filter((n) => /name|address/i.test(n.placeholder || '')).length,
      };
    });
    facts.push({ case: caseName, ...read });
  }
  fs.writeFileSync(`${OUT}facts.json`, JSON.stringify(facts, null, 2));
});
