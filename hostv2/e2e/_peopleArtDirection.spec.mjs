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
// screen. Nothing is committed: the fixture file lives in dist/ (gitignored)
// and the output goes to review-artifacts/ (gitignored).
//
//   PEOPLE_ART=1 npx playwright test e2e/_peopleArtDirection.spec.mjs --project=desktop
import { test, openSectionByName } from './fixtures.mjs';
import fs from 'node:fs';

const OUT = new URL('../../review-artifacts/2026-10-20_people_art_direction/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

test.skip(!process.env.PEOPLE_ART, 'capture instrument — set PEOPLE_ART=1 to run');
test.describe.configure({ timeout: 240_000 });

const FIXTURE = 'http://127.0.0.1:5233/ngw-event-planner/hostv2/_people_fixture.jpg';
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

test('People at 390 — the mobile matrix', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const state of ['populated', 'sparse']) {
    for (const theme of ['dark', 'light']) {
      for (const img of [false, true]) {
        const ev = EVENTS[state];
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
        await page.goto(`?elegant=1&people=1&theme=${theme}${img ? '&peoplefixture=' + encodeURIComponent(FIXTURE) : ''}`);
        await settle(page);
        await openSectionByName(page, 'Guests', { settle: 700 });
        await page.waitForTimeout(600);
        const name = `${state}-${theme}-${img ? 'image' : 'noimage'}`;
        const sheet = page.locator('.sheet');
        if (await sheet.count()) await sheet.first().screenshot({ path: `${OUT}/${name}.png` });
        else await page.screenshot({ path: `${OUT}/${name}--NO-SHEET.png` });
      }
    }
  }
});
