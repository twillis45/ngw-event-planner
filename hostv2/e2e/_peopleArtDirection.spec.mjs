// ─── CAPTURE: PEOPLE, AGAINST THE ART DIRECTION ─────────────────────────────
//
// Owner §13's mobile matrix: image-present / image-absent × populated / sparse
// × light / dark, at the mobile flagship geometry, because mobile is the hero
// platform and the composition is designed there first.
//
// THE FIXTURE IS NOT PRODUCTION AND CANNOT BECOME IT. The host-supplied cover
// media pipeline is not authorized, so the surface reads a forward-compatible
// `event.coverImageUrl` it never writes, and this instrument passes a
// review-only `?peoplefixture=` URL that is never persisted and is labelled on
// screen. Nothing is committed: the fixture file and the output both live under
// review-artifacts/ (gitignored).
//
// ── WHY THE FIXTURE IS ROUTE-INTERCEPTED AND NOT A FILE IN dist/ ───────────
//
// It was a file in dist/ for exactly one run. `npm run e2e:build` regenerates
// dist/ from scratch, so the next build deleted it and the matrix silently
// captured twelve frames of grey gradient — an image-present review with no
// image in it, which is worse than no review because it looks like evidence.
// Intercepting the request removes the build from the loop entirely, and
// `fixtureBytes()` throws loudly rather than letting a frame lie again.
//
//   PEOPLE_ART=1 npx playwright test e2e/_peopleArtDirection.spec.mjs --project=desktop
import { test, openSectionByName } from './fixtures.mjs';
import fs from 'node:fs';

const OUT = new URL('../../review-artifacts/2026-10-20_people_art_direction/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

test.skip(!process.env.PEOPLE_ART, 'capture instrument — set PEOPLE_ART=1 to run');
test.describe.configure({ timeout: 240_000 });

// Any absolute URL works — nothing serves it; the route below fulfills it.
const FIXTURE = 'http://127.0.0.1:5233/_review/people_cover.png';
const FIXTURE_FILE = new URL('../../review-artifacts/_fixtures/people_cover.png', import.meta.url).pathname;

const fixtureBytes = () => {
  if (!fs.existsSync(FIXTURE_FILE)) {
    throw new Error(
      `Review fixture missing: ${FIXTURE_FILE}\n` +
      'The image-present frames cannot be judged without it. Restore the crop ' +
      'before running the matrix — do NOT capture grey frames and call them evidence.',
    );
  }
  return fs.readFileSync(FIXTURE_FILE);
};

const serveFixture = (page) => page.route(FIXTURE, (route) => route.fulfill({
  status: 200, contentType: 'image/png', body: fixtureBytes(),
}));
const dateIn = (d) => { const t = new Date(); t.setDate(t.getDate() + d); return t.toISOString().slice(0, 10); };

const EVENTS = {
  populated: {
    id: 'art-pop', name: "Wanda's 50th", type: 'Birthday', date: dateIn(45),
    venueCity: 'Annapolis', state: 'MD', totalBudget: 5000, budget: [], vendors: [],
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
  // ── A REAL-SIZED ROSTER (owner §9: "~75 guests") ──────────────────────────
  // The owner's stated scale, with the shapes that actually occur on one: a
  // household filed under a group, couples linked by `coupleId`, named +1s,
  // children, dietary notes from the invite, a free-text need, and every reply
  // state including silence. A 5-row fixture cannot show whether a list reads
  // as a CRM table — only 75 can.
  roster: (() => {
    const FIRST = ['Tonya', 'Ray', 'Denise', 'Marcus', 'Pat', 'Joe', 'Alma', 'Curtis', 'Nia', 'Hollis', 'Georgia', 'Dez', 'Imani', 'Bernard', 'Lourdes'];
    const LAST = ['Brooks', 'Okafor', 'Hall', 'Reyes', 'Whitfield'];
    const GROUPS = ['Family', 'Friends', 'Work', 'Neighbors'];
    const RSVPS = ['Yes', 'Yes', 'Yes', '', '', 'Maybe', 'No'];
    const guests = Array.from({ length: 75 }, (_, i) => {
      const g = {
        id: 'r' + i,
        name: `${FIRST[i % FIRST.length]} ${LAST[(i * 3) % LAST.length]}`,
        rsvp: RSVPS[i % RSVPS.length],
        group: GROUPS[i % GROUPS.length],
      };
      if (i % 9 === 0) g.plusOne = FIRST[(i + 4) % FIRST.length];
      if (i % 11 === 0) g.kids = 2;
      if (i % 7 === 3) g.diets = ['Vegetarian'];
      if (i % 13 === 5) g.allergens = ['Shellfish'];
      if (i % 17 === 2) g.needs = 'no stairs';
      if (i % 6 === 0) g.coupleId = 'c' + i;
      if (i % 6 === 1) g.coupleId = 'c' + (i - 1);
      return g;
    });
    return {
      id: 'art-roster', name: "Wanda's 50th", type: 'Birthday', date: dateIn(45),
      venueCity: 'Annapolis', state: 'MD', totalBudget: 12000, budget: [], vendors: [],
      guestMode: 'list', guests,
      accessNeeds: [{ kind: 'step-free', phrase: 'she uses a walker', source: 'host-said' }],
    };
  })(),
  sparse: {
    id: 'art-sparse', name: "Wanda's 50th", type: 'Cookout', date: dateIn(45),
    venueCity: 'Annapolis', state: 'MD', totalBudget: 4000, budget: [], vendors: [], guests: [],
    guestMode: 'count', guestEstimate: 40, guestCountSource: 'playbook-typical',
  },
};

const settle = async (page) => {
  await page.waitForFunction(() => {
    const sp = document.querySelector('.splash');
    if (sp) { const cs = getComputedStyle(sp); if (cs.display !== 'none' && parseFloat(cs.opacity) > 0.01) return false; }
    const app = document.querySelector('.app');
    return !!app && (app.innerText || '').trim().length > 120;
  }, null, { timeout: 20_000 });
  await page.waitForTimeout(400);
};

// ── THE REVIEW MATRIX (owner §15) ──────────────────────────────────────────
// A estimate/no roster · B active RSVP · C image absent · D tablet · E desktop
// · F palette A/B on an identical screen. Deliberately not dozens of frames:
// enough evidence to make the product decisions, and no more.
const VP = { mobile: [390, 844], tablet: [1024, 1366], desktop: [1440, 1024] };

const shot = async (page, { ev, theme, img, palette, vp, name, scrollTo }) => {
  const [w, h] = VP[vp];
  await page.setViewportSize({ width: w, height: h });
  await page.addInitScript((e) => {
    try {
      localStorage.clear();
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
      localStorage.setItem('ngw-hostv2-last-event', e.id);
      localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
      localStorage.setItem('ngw-welcomed', '1');
      localStorage.setItem('ngw-v2-welcomed', '1');
    } catch (_) { /* private mode */ }
  }, ev);
  const q = ['elegant=1', 'people=1', 'theme=' + theme];
  if (img) q.push('peoplefixture=' + encodeURIComponent(FIXTURE));
  if (palette) q.push('palette=' + palette);
  await page.goto('?' + q.join('&'));
  await settle(page);
  await openSectionByName(page, 'Guests', { settle: 700 });
  await page.waitForTimeout(600);
  // THE FRAME MUST NOT LIE. An image-present capture whose <img> never decoded
  // is a grey gradient presented as an art-direction decision. Fail the run.
  if (img) {
    const painted = await page.evaluate(() => {
      const el = document.querySelector('.sheet img');
      return !!el && el.complete && el.naturalWidth > 0;
    });
    if (!painted) throw new Error(`${name}: fixture did not paint — this frame is not evidence`);
  }
  // §9's evidence is BELOW the editorial opening, so the roster frames scroll
  // the sheet's own scroller to the anchor and photograph the viewport. A
  // full-element capture of a 3000px sheet is not a design review of a 390px
  // screen — what matters is what the host actually has in front of her.
  if (scrollTo) {
    const found = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      el.scrollIntoView({ block: 'start' });
      return true;
    }, scrollTo);
    if (!found) throw new Error(`${name}: ${scrollTo} not on screen`);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    return;
  }
  const sheet = page.locator('.sheet');
  if (await sheet.count()) await sheet.first().screenshot({ path: `${OUT}/${name}.png` });
  else await page.screenshot({ path: `${OUT}/${name}--NO-SHEET.png` });
};

// Contrast is MEASURED off the live DOM rather than assumed from source, so the
// A/B evidence describes what actually paints.
const readTokens = (page) => page.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  const out = {};
  for (const k of ['--bg', '--bg-band', '--card', '--ink', '--ink-soft', '--muted', '--faint', '--steel-soft']) {
    out[k] = cs.getPropertyValue(k).trim();
  }
  out.palette = document.documentElement.getAttribute('data-palette-ab') || 'production';
  return out;
});

// The older ad-hoc 390 sweep (populated/sparse x light/dark x image/noimage)
// was folded into this matrix on 2026-10-20. Two capture instruments writing
// into one folder, with only one of them guarding that the fixture painted, is
// how a grey frame got presented as an art-direction decision in the first
// place. One instrument, one convention.
test('the review matrix', async ({ page }) => {
  await serveFixture(page);
  const E = EVENTS;
  // A · estimate, no roster
  await shot(page, { ev: E.sparse, theme: 'light', img: true, vp: 'mobile', name: 'A-estimate-mobile-light' });
  await shot(page, { ev: E.sparse, theme: 'dark', img: true, vp: 'mobile', name: 'A-estimate-mobile-dark' });
  // B · active RSVP, populated
  await shot(page, { ev: E.populated, theme: 'light', img: true, vp: 'mobile', name: 'B-rsvp-mobile-light' });
  await shot(page, { ev: E.populated, theme: 'dark', img: true, vp: 'mobile', name: 'B-rsvp-mobile-dark' });
  // C · image absent — the DEFAULT state, since no cover pipeline exists
  await shot(page, { ev: E.populated, theme: 'light', img: false, vp: 'mobile', name: 'C-noimage-mobile-light' });
  await shot(page, { ev: E.populated, theme: 'dark', img: false, vp: 'mobile', name: 'C-noimage-mobile-dark' });
  await shot(page, { ev: E.sparse, theme: 'light', img: false, vp: 'mobile', name: 'C-noimage-estimate-light' });
  // G · THE ROSTER (§9), which is where the old product was still showing
  await shot(page, { ev: E.roster, theme: 'dark', img: true, vp: 'mobile', scrollTo: '.roster', name: 'G-roster-mobile-dark' });
  await shot(page, { ev: E.roster, theme: 'light', img: true, vp: 'mobile', scrollTo: '.roster', name: 'G-roster-mobile-light' });
  await shot(page, { ev: E.roster, theme: 'dark', img: true, vp: 'mobile', scrollTo: '#guests-invites-anchor', name: 'H-getresponses-mobile-dark' });
  // D / E · tablet and desktop, populated
  await shot(page, { ev: E.populated, theme: 'dark', img: true, vp: 'tablet', name: 'D-tablet-dark' });
  await shot(page, { ev: E.populated, theme: 'dark', img: true, vp: 'desktop', name: 'E-desktop-dark' });
  // F · palette A/B — IDENTICAL screen, only the tokens differ
  await shot(page, { ev: E.populated, theme: 'light', img: true, vp: 'mobile', name: 'F-paletteA-steel-light' });
  await shot(page, { ev: E.populated, theme: 'light', img: true, vp: 'mobile', palette: 'warm', name: 'F-paletteB-warm-light' });
  await shot(page, { ev: E.populated, theme: 'dark', img: true, vp: 'mobile', name: 'F-paletteA-steel-dark' });
  await shot(page, { ev: E.populated, theme: 'dark', img: true, vp: 'mobile', palette: 'warm', name: 'F-paletteB-warm-dark' });

  // Token evidence for the contrast table, read from what actually painted.
  const tokens = {};
  for (const [theme, palette] of [['light', null], ['light', 'warm'], ['dark', null], ['dark', 'warm']]) {
    await shot(page, { ev: E.populated, theme, img: false, vp: 'mobile', palette, name: `_tok-${theme}-${palette || 'prod'}` });
    tokens[`${theme}-${palette || 'production'}`] = await readTokens(page);
  }
  fs.writeFileSync(`${OUT}/tokens.json`, JSON.stringify(tokens, null, 2));
});
