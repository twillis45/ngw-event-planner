// ─── ELEVEN BEATS, IDENTICAL FOR A KITCHEN AND A HOTEL ROOM ──────────────────
//
// The Day tab's agenda is byte-identical for a host cooking in a rented house
// and a host in a room block with a caterer dropping the food off. Engine proof
// (including that the 11 rows really are identical):
// src/lib/__tests__/whoseDayIsThisWrittenFor.test.js.
//
// The fix is a DISCLOSURE, not a rewrite — no signal in the corpus says which
// beats a caterer performs, so re-owning them would be authoring a run-of-show
// nobody researched. What is driven here is that the note reaches the screen,
// only for the hosts it applies to, and that it changes no beat.
import { test, expect, settled } from './fixtures.mjs';

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 50);
}, src);
const bodyText = (page) => page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));

const openDay = async (page, food, lodging) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(([f, l]) => {
    const fc = {};
    if (f) fc.food_style = f;
    if (l) fc.dest_lodging = l;
    const ev = {
      id: 'e2e-ros', name: 'Mom’s 80th', type: 'Birthday',
      date: '2027-06-17', endDate: '2027-06-21',
      isDestination: true, venueCity: 'Santa Fe', state: 'NM',
      guestMode: 'count', guestCount: 10, totalBudget: 4000,
      budget: [], vendors: [], guests: [],
      ...(Object.keys(fc).length ? { foodChoices: fc } : {}),
    };
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-ros');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, [food, lodging]);
  await page.goto('?elegant=1');
  await settled(page);
  await tapText(page, '^The Day$');
  await page.waitForTimeout(1600);
  await settled(page);
};

test('(premise) the agenda really is on screen, with its beats', async ({ page }) => {
  await openDay(page, 'Cook/grill yourself', 'A house we rent for everyone');
  await tapText(page, 'Full agenda');
  await page.waitForTimeout(1200);
  await settled(page);
  expect(await bodyText(page)).toMatch(/set food \+ drinks stations/i);
});

test('THE FIX: a catered hotel stay is told what the agenda assumes', async ({ page }) => {
  await openDay(page, 'Drop-off catering', 'A room block I guarantee fills');
  const t = await bodyText(page);
  expect(t).toMatch(/playbook.s standard run/i);
  expect(t).toMatch(/not be yours to run/i);
  expect(t).toMatch(/change any line that does not fit your day/i);
});

test('the note CLAIMS NOTHING it cannot know', async ({ page }) => {
  // The discipline of this fix: no named owner, no timing claim, no instruction
  // to skip a line. Inventing any of those is the thing it refused to do.
  await openDay(page, 'Drop-off catering', 'A room block I guarantee fills');
  const t = await bodyText(page);
  const note = t.slice(t.indexOf('These times are the playbook'), t.indexOf('These times are the playbook') + 400);
  expect(note).not.toMatch(/\bcaterer\b/i);
  expect(note).not.toMatch(/\bskip\b|\bremove\b|\bignore\b/i);
});

test('and it changes NO beat — the agenda is untouched', async ({ page }) => {
  // A disclosure that quietly edited the agenda would be the refusal arriving by
  // the back door.
  await openDay(page, 'Drop-off catering', 'A room block I guarantee fills');
  await tapText(page, 'Full agenda');
  await page.waitForTimeout(1200);
  await settled(page);
  const t = await bodyText(page);
  expect(t).toMatch(/set food \+ drinks stations/i);
  expect(t).toMatch(/Food out while everyone.s still arriving/i);
  expect(t).toMatch(/Leftovers to containers/i);
});

test('NEGATIVE CONTROL: a host cooking in a rental is told nothing', async ({ page }) => {
  await openDay(page, 'Cook/grill yourself', 'A house we rent for everyone');
  expect(await bodyText(page)).not.toMatch(/playbook.s standard run/i);
});

test('NEGATIVE CONTROL: an UNANSWERED event is told nothing', async ({ page }) => {
  // Birthday DEFAULTS food_style to "Order pizza/trays", which resolves to
  // usesCaterer — so reading the engine raw fired this note at every untouched
  // birthday. A default is the app's guess, not the host's answer.
  await openDay(page, null, null);
  expect(await bodyText(page)).not.toMatch(/playbook.s standard run/i);
});
