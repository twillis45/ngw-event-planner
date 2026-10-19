// ─── A DECISION MAKES A QUESTION RELEVANT (P1-5) ─────────────────────────────
//
// The consequence primitive, proven where it has to work: on the board, with
// the host able to answer it.
//
// THE CHAIN THIS CLOSES. P1-2 normalised "she uses a walker" into a step-free
// requirement, wired it to seating and lodging, and recorded `place` as a
// domain it deliberately does NOT reach — a step-free requirement cannot be
// checked against a venue the app knows nothing about. True, and still true of
// any unnamed venue. The moment the host names one there is a specific
// building and a specific unknown, and exactly one party who can settle it.
//
// WHAT MUST STAY TRUE, and each is a line somebody can check:
//   · both halves required — a venue alone asks nothing, a need alone asks
//     nothing;
//   · the question says what made it relevant, in her own words;
//   · the app does not answer it — it names who to ask;
//   · answering closes it, INCLUDING answering no, and the answer sticks.
import { test, expect, settled, dateIn } from './fixtures.mjs';

// Exactly what heardAccessNeeds writes from "…, she uses a walker".
const WALKER = [{ kind: 'step-free', phrase: 'she uses a walker', source: 'host-said' }];

const EV = (over = {}) => ({
  id: 'e2e-oq', name: "Mom's 80th", type: 'Birthday',
  date: dateIn(45),
  venueCity: 'Santa Fe', state: 'NM',
  guestMode: 'count', guestCount: 20, totalBudget: 4000,
  budget: [], vendors: [], guests: [],
  ...over,
});

const boot = async (page, ev) => {
  await page.addInitScript((e) => {
    // Seed only if absent — addInitScript re-runs on every navigation, so an
    // unconditional seed erases what the test just did on reload.
    if (!localStorage.getItem('ngw-hostv2-custom-events')) {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    }
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1');
  await settled(page);
};

// `.shelf-label` is uppercased by CSS and innerText reflects text-transform,
// so every assertion on the heading is case-insensitive.
const bodyText = (p) => p.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));

const answer = (p, label) => p.evaluate((l) => {
  const el = [...document.querySelectorAll('button.chip')]
    .find((x) => (x.innerText || '').trim() === l);
  if (!el) return false;
  el.click();
  return true;
}, label);

test('a named venue plus a step-free need produces the question, with its reason', async ({ page }) => {
  await boot(page, EV({ venue: 'The Lodge at Santa Fe', accessNeeds: WALKER }));
  const body = await bodyText(page);

  expect(body).toMatch(/Worth finding out/i);
  expect(body, 'it names the building').toMatch(/Is there a step-free way into The Lodge at Santa Fe\?/);
  // "because Y changed", in her own words, including the clause she typed.
  expect(body).toMatch(/You named The Lodge at Santa Fe/);
  expect(body).toMatch(/she uses a walker/);
  // The app does not answer it — it says who can.
  expect(body).toMatch(/Ask the venue/i);
});

test('NEGATIVE CONTROL — a venue with no access need asks nothing', async ({ page }) => {
  // The guard against a primitive that grows into a checklist. Without this,
  // the test above would pass on an app that asks every host about every venue.
  await boot(page, EV({ id: 'e2e-oq-noneed', venue: 'The Lodge at Santa Fe' }));
  expect(await bodyText(page)).not.toMatch(/step-free way into/i);
});

test('NEGATIVE CONTROL — a need with no venue asks nothing', async ({ page }) => {
  // There is no building to ask about yet, so there is no question to ask.
  await boot(page, EV({ id: 'e2e-oq-novenue', accessNeeds: WALKER }));
  expect(await bodyText(page)).not.toMatch(/step-free way into/i);
});

test('"No" closes it as firmly as "Yes", and the answer survives a reload', async ({ page }) => {
  // The distinction that keeps this from becoming the resurfacing P1-3 just
  // removed: "there are steps" is information the plan can use, not an
  // unanswered question.
  await boot(page, EV({ id: 'e2e-oq-no', venue: 'The Lodge at Santa Fe', accessNeeds: WALKER }));
  expect(await answer(page, 'No')).toBe(true);
  await page.waitForTimeout(900);
  expect(await bodyText(page), 'it closes immediately').not.toMatch(/step-free way into/i);

  await page.reload();
  await settled(page);
  const after = await bodyText(page);
  expect(after, 'and stays closed — it was written to the event').not.toMatch(/step-free way into/i);
  expect(after).not.toMatch(/Worth finding out/i);

  // And the answer itself is on the event, not just absent from the screen.
  const stored = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]')[0]; }
    catch { return null; }
  });
  expect(stored.venueStepFree).toBe(false);
});
