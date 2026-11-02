// ─── CAPTURE: PEOPLE, AGAINST THE ART DIRECTION ─────────────────────────────
//
// The owner's §38 evidence set, and nothing else. A twenty-frame matrix that
// answers the open questions beats a sixty-frame matrix that has to be read.
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
// Intercepting the request removes the build from the loop entirely, and the
// paint check below fails the run rather than letting a frame lie again.
//
//   PEOPLE_ART=1 PW_CHROMIUM=/opt/pw-browsers/chromium \
//     npx playwright test e2e/_peopleArtDirection.spec.mjs --project=desktop
import { test, openSectionByName } from './fixtures.mjs';
import fs from 'node:fs';

const OUT = new URL('../../review-artifacts/2026-10-20_people_art_direction/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

test.skip(!process.env.PEOPLE_ART, 'capture instrument — set PEOPLE_ART=1 to run');
test.describe.configure({ timeout: 900_000 });

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

// ── §22 · ADVERSARIAL PEOPLE DATA ──────────────────────────────────────────
//
// "Do not validate with pretty fixture data alone." Everything below is a shape
// that occurs on a real guest list and that the information grammar has to
// survive — not a stress test for its own sake. Each one is here because it can
// break a specific thing:
//
//   a 34-character hyphenated name          → the identity line's ellipsis
//   five people sharing one surname          → whether a row is identifiable
//   a household whose members disagree       → whether "with X" implies "and X is coming"
//   an unnamed +1                            → "+1 undefined"
//   four dietary facts on one guest          → the need line becoming a wall
//   no contact details at all                → the nudge affordance's honesty
//   a 90-character free-text need            → the need line's overflow
const LONG = 'Konstantina Vasilakopoulou-Richardson';
const GROUPS = ['Family', 'Friends', 'Work', 'Neighbors', 'College'];
const FIRST = ['Tonya', 'Ray', 'Denise', 'Marcus', 'Pat', 'Joe', 'Alma', 'Curtis', 'Nia', 'Hollis', 'Georgia', 'Dez', 'Imani', 'Bernard', 'Lourdes'];
const LAST = ['Brooks', 'Okafor', 'Hall', 'Reyes', 'Whitfield'];

const hostileRoster = (n) => {
  const g = [];
  // A household that disagrees with itself — the sharpest case in the set.
  g.push({ id: 'h1', name: 'Tonya Brooks', rsvp: 'Yes', group: 'Family', coupleId: 'cA', kids: 2 });
  g.push({ id: 'h2', name: 'Desmond Brooks', rsvp: 'No', group: 'Family', coupleId: 'cA' });
  // A very long hyphenated name, with a need and a party.
  g.push({ id: 'h3', name: LONG, rsvp: 'Yes', group: 'Work', plusOne: 'Aleksandr', needs: 'uses a walker and needs a seat near the door, away from the speakers' });
  // An unnamed +1 — `plusOne` is truthy-but-blank in real data.
  g.push({ id: 'h4', name: 'Ray Okafor', rsvp: 'Yes', group: 'Friends', plusOne: '   ' });
  // Four dietary facts on one person.
  g.push({ id: 'h5', name: 'Alma Reyes', rsvp: 'Yes', group: 'Family', meal: 'Fish', diets: ['Vegetarian', 'Gluten-free'], allergens: ['Shellfish', 'Peanuts'] });
  // Five people, one surname, no other distinguishing data.
  for (let i = 0; i < 5; i += 1) {
    g.push({ id: 'hs' + i, name: FIRST[i] + ' Whitfield', rsvp: i % 2 ? '' : 'Maybe', group: 'Neighbors' });
  }
  // A guest with nothing but a name.
  g.push({ id: 'h6', name: 'Joe', rsvp: '' });
  // ...and the bulk, so the grammar is judged at scale rather than on ten rows.
  const RSVPS = ['Yes', 'Yes', 'Yes', '', '', 'Maybe', 'No'];
  for (let i = g.length; i < n; i += 1) {
    const row = {
      id: 'r' + i,
      // FIRST and LAST are coprime-ish in length (15 x 5) so the pairing walks
      // all 75 combinations before repeating — duplicate SURNAMES everywhere,
      // which is the real case, rather than four identical full names, which
      // was my generator being lazy and not a shape a host's list has.
      name: `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`,
      rsvp: RSVPS[i % RSVPS.length],
      group: GROUPS[i % GROUPS.length],
    };
    if (i % 9 === 0) row.plusOne = FIRST[(i + 4) % FIRST.length];
    if (i % 11 === 0) row.kids = 2;
    if (i % 7 === 3) row.diets = ['Vegetarian'];
    if (i % 13 === 5) row.allergens = ['Shellfish'];
    if (i % 17 === 2) row.needs = 'no stairs';
    if (i % 6 === 0) row.coupleId = 'c' + i;
    if (i % 6 === 1) row.coupleId = 'c' + (i - 1);
    g.push(row);
  }
  return g;
};

const base = (over) => ({
  id: 'art', name: "Wanda's 50th", type: 'Birthday', date: dateIn(45),
  venueCity: 'Annapolis', state: 'MD', totalBudget: 12000, budget: [], vendors: [],
  accessNeeds: [{ kind: 'step-free', phrase: 'she uses a walker', source: 'host-said' }],
  ...over,
});

const EVENTS = {
  // The small active-RSVP event the earlier reviews were judged on.
  rsvp: base({
    id: 'art-rsvp', guestMode: 'list',
    guests: [
      { id: 'g1', name: 'Tonya Brooks', rsvp: 'Yes', kids: 2 },
      { id: 'g2', name: 'Ray Okafor', rsvp: 'Yes', plusOne: 'Denise' },
      { id: 'g3', name: 'Uncle Joe', rsvp: 'Maybe' },
      { id: 'g4', name: 'Marcus Hall', rsvp: '' },
      { id: 'g5', name: 'Pat Reyes', rsvp: 'No' },
    ],
  }),
  // No roster at all: the estimate state.
  estimate: base({
    id: 'art-est', type: 'Cookout', totalBudget: 4000, guests: [],
    guestMode: 'count', guestEstimate: 40, guestCountSource: 'playbook-typical',
    accessNeeds: [],
  }),
  roster75: base({ id: 'art-75', guestMode: 'list', guests: hostileRoster(75) }),
  roster150: base({ id: 'art-150', guestMode: 'list', guests: hostileRoster(150) }),
};

const VP = { mobile: [390, 844], mobileL: [430, 932], tablet: [1024, 1366], desktop: [1440, 1024], wide: [1920, 1080] };

const settle = async (page) => {
  await page.waitForFunction(() => {
    const sp = document.querySelector('.splash');
    if (sp) { const cs = getComputedStyle(sp); if (cs.display !== 'none' && parseFloat(cs.opacity) > 0.01) return false; }
    const app = document.querySelector('.app');
    return !!app && (app.innerText || '').trim().length > 120;
  }, null, { timeout: 20_000 });
  await page.waitForTimeout(400);
};

/**
 * Open People in a given state and photograph the VIEWPORT (not the whole
 * element). A full-element capture of a 4000px sheet is not a design review of
 * a 390px screen; what matters is what the host actually has in front of her.
 * `scrollTo` and `scrollBy` move within the sheet's own scroller.
 */
const shot = async (page, { ev, theme, img, palette, vp, name, scrollTo, scrollBy, click, legacy }) => {
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
  // `legacy` drops the flag: the SAME state on the pre-redesign composition,
  // which is how a shell-level behaviour gets told apart from one of mine.
  const q = legacy ? ['elegant=1', 'theme=' + theme] : ['elegant=1', 'people=1', 'theme=' + theme];
  if (img) q.push('peoplefixture=' + encodeURIComponent(FIXTURE));
  if (palette) q.push('palette=' + palette);
  await page.goto('?' + q.join('&'));
  await settle(page);
  await openSectionByName(page, 'Guests', { settle: 700 });
  // THE HARNESS WAS MAKING ITS OWN DEFECT. `openSectionByName` clicks, which
  // leaves the pointer parked at that screen position; whatever row then
  // scrolled under it picked up `.grow:hover{background:var(--bg)}` and every
  // roster capture came back with exactly one row sitting on a lighter band,
  // in a different place each time. Three reviews read that as a product bug.
  // The probe settled it: every `.grow` computes `rgba(0,0,0,0)` with the
  // pointer away. Park it off-canvas before photographing anything.
  await page.mouse.move(-50, -50);
  await page.waitForTimeout(500);

  // THE FRAME MUST NOT LIE. An image-present capture whose <img> never decoded
  // is a grey gradient presented as an art-direction decision. Fail the run.
  if (img) {
    const painted = await page.evaluate(() => {
      const el = document.querySelector('.sheet img');
      return !!el && el.complete && el.naturalWidth > 0;
    });
    if (!painted) throw new Error(`${name}: fixture did not paint — this frame is not evidence`);
  }

  if (click) {
    const hit = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      el.click();
      return true;
    }, click);
    if (!hit) throw new Error(`${name}: nothing matched ${click}`);
    await page.waitForTimeout(500);
  }
  if (scrollTo) {
    const found = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      el.scrollIntoView({ block: 'start' });
      return true;
    }, scrollTo);
    if (!found) throw new Error(`${name}: ${scrollTo} not on screen`);
    await page.waitForTimeout(400);
  }
  if (scrollBy) {
    await page.evaluate((px) => {
      const sc = document.querySelector('.sheet');
      if (sc) sc.scrollTop += px;
      else window.scrollBy(0, px);
    }, scrollBy);
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: `${OUT}/${name}.png` });
};

// Contrast is MEASURED off the live DOM rather than assumed from source, so the
// palette evidence describes what actually paints.
const readTokens = (page) => page.evaluate(() => {
  const cs = getComputedStyle(document.documentElement);
  const out = {};
  for (const k of ['--bg', '--bg-band', '--card', '--ink', '--ink-soft', '--muted', '--faint', '--steel-soft']) {
    out[k] = cs.getPropertyValue(k).trim();
  }
  out.palette = document.documentElement.getAttribute('data-palette-ab') || 'production';
  return out;
});

test('§38 · the decisive evidence set', async ({ page }) => {
  await serveFixture(page);
  const E = EVENTS;

  // ── MOBILE ───────────────────────────────────────────────────────────────
  // A · active RSVP, the full useful flow: opening, then the body, then the
  //     action hierarchy. Three viewports of one screen, not three screens.
  await shot(page, { ev: E.rsvp, theme: 'dark', img: true, vp: 'mobile', name: 'A1-rsvp-open-dark' });
  await shot(page, { ev: E.rsvp, theme: 'dark', img: true, vp: 'mobile', scrollBy: 760, name: 'A2-rsvp-body-dark' });
  await shot(page, { ev: E.rsvp, theme: 'dark', img: true, vp: 'mobile', scrollTo: '#guests-invites-anchor', name: 'A3-rsvp-actions-dark' });
  await shot(page, { ev: E.rsvp, theme: 'light', img: true, vp: 'mobile', name: 'A4-rsvp-open-light' });
  // B · the estimate state
  await shot(page, { ev: E.estimate, theme: 'dark', img: true, vp: 'mobile', name: 'B1-estimate-dark' });
  await shot(page, { ev: E.estimate, theme: 'light', img: true, vp: 'mobile', name: 'B2-estimate-light' });
  // C · lower body on a 75-guest list — hierarchy and roster behaviour
  await shot(page, { ev: E.roster75, theme: 'dark', img: true, vp: 'mobile', scrollTo: '.people-roster', name: 'C1-roster75-dark' });
  await shot(page, { ev: E.roster75, theme: 'light', img: true, vp: 'mobile', scrollTo: '.people-roster', name: 'C2-roster75-light' });
  await shot(page, { ev: E.roster75, theme: 'dark', img: true, vp: 'mobile', scrollTo: '#guests-invites-anchor', name: 'C3-roster75-foot-dark' });
  // D / E · image present vs ABSENT — absent is the default, no pipeline exists
  await shot(page, { ev: E.rsvp, theme: 'dark', img: false, vp: 'mobile', name: 'E1-noimage-dark' });
  await shot(page, { ev: E.rsvp, theme: 'light', img: false, vp: 'mobile', name: 'E2-noimage-light' });
  // A larger phone, to prove the composition is not pinned to 390
  await shot(page, { ev: E.rsvp, theme: 'dark', img: true, vp: 'mobileL', name: 'A5-rsvp-430-dark' });

  // ── DESKTOP ──────────────────────────────────────────────────────────────
  // F · nothing selected (rail = event context) · G · guest selected (rail =
  //     the production detail panel) · H · the large roster
  await shot(page, { ev: E.roster75, theme: 'dark', img: true, vp: 'desktop', name: 'F1-desktop-noselect-dark' });
  await shot(page, { ev: E.roster75, theme: 'light', img: true, vp: 'desktop', name: 'F2-desktop-noselect-light' });
  await shot(page, { ev: E.roster75, theme: 'dark', img: true, vp: 'desktop', scrollTo: '.people-roster', click: '.people-roster .grow button', name: 'G1-desktop-selected-dark' });
  await shot(page, { ev: E.roster150, theme: 'dark', img: true, vp: 'desktop', scrollTo: '.people-roster', name: 'H1-desktop-roster150-dark' });

  // ── TABLET ───────────────────────────────────────────────────────────────
  await shot(page, { ev: E.roster75, theme: 'dark', img: true, vp: 'tablet', name: 'M1-tablet-dark' });
  // CONTROL: the same viewport without the flag. If the sheet floats and clips
  // here too, the tablet geometry is the shell's and not this surface's.
  await shot(page, { ev: E.roster75, theme: 'dark', img: false, vp: 'tablet', legacy: true, name: 'M0-tablet-LEGACY-dark' });
  await shot(page, { ev: E.roster75, theme: 'dark', img: true, vp: 'tablet', scrollTo: '.people-roster', name: 'M2-tablet-roster-dark' });

  // ── PALETTE A / B / C · identical content, identical composition ──────────
  for (const [tag, palette] of [['A-steel', null], ['B-warm', 'warm'], ['C-warmsteel', 'warmsteel']]) {
    await shot(page, { ev: E.rsvp, theme: 'light', img: true, vp: 'mobile', palette, name: `J-${tag}-light` });
    await shot(page, { ev: E.rsvp, theme: 'dark', img: true, vp: 'mobile', palette, name: `J-${tag}-dark` });
  }

  // Token evidence for the contrast table, read from what actually painted.
  const tokens = {};
  for (const theme of ['light', 'dark']) {
    for (const palette of [null, 'warm', 'warmsteel']) {
      await shot(page, { ev: E.rsvp, theme, img: false, vp: 'mobile', palette, name: `_tok-${theme}-${palette || 'prod'}` });
      tokens[`${theme}-${palette || 'production'}`] = await readTokens(page);
    }
  }
  fs.writeFileSync(`${OUT}/tokens.json`, JSON.stringify(tokens, null, 2));
});
