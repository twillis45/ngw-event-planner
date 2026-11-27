// ─── ONE ALLERGY STEP (owner ruling 2, 11/21/2026) ───────────────────────────
//
// The allergy was asked by two producers — "Collect dietary restrictions &
// allergies" (the decision-first gate) and "Note dietary needs on the food plan"
// (the food area's cue) — and setting one aside left the other standing: the
// gate keyed 'decision:dietary', the cue 'phase:food' on the list and a slugged
// 'top:readiness:note-dietary-…' as the hero. Now both are one debt under one
// id, 'decision:dietary', so a set-aside in either place holds for both.
// The unit twin is src/lib/__tests__/oneAllergyStep.test.js.
//
// Set-aside ("not now") lives on the v2 hero, so these boot with ?elegant=0.
import { test, expect, dateIn, settled } from './fixtures.mjs';

const ev = (days) => ({
  id: 'E2E_one_allergy', name: 'One allergy step', type: 'Thanksgiving Hosting', date: dateIn(days),
  guestMode: 'list', guestEstimate: 12, guestCountSource: 'host',
  guests: Array.from({ length: 12 }, (_, i) => ({ id: 'g' + i, name: 'Guest ' + (i + 1), rsvp: 'yes' })),
  venue: 'Home', venueKind: 'home', venueAddress: '12 Oak St, Austin, TX', venueCity: 'Austin, TX',
  startTime: '16:00', startTimeSource: 'host', totalBudget: 60000,
  budget: [], vendors: [], timeline: [], createdAt: new Date().toISOString(),
  // Every menu question answered; the table says there ARE needs, so the allergy is owed.
  foodChoices: {
    hosting_model: 'Host cooks the whole meal', service_style: 'Sit-down — everyone at the table',
    serve_time: 'Late afternoon, around 4 or 5', overnight_guests: 'No — everyone is local',
    turkey_method: 'Smoked', dietary_table: 'One or two needs — adjust dishes and label them',
    drinks: 'Wine with dinner, sparkling cider for everyone', // asked since 11/26/2026
  },
});
const boot = async (page, e) => {
  await page.setViewportSize({ width: 1024, height: 1366 });
  await page.addInitScript((x) => {
    if (localStorage.getItem('ngw-hostv2-last-event')) return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([x]));
    localStorage.setItem('ngw-hostv2-last-event', x.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-welcomed', '1');
  }, e);
  await page.goto('?elegant=0');
  await settled(page);
};
const STEP = /Collect dietary restrictions & allergies|Note dietary needs on the food plan/g;
const PILE = 'Set aside for now';
// What the hero and its queue ask (above the set-aside pile), and what the pile
// holds. The "Where you stand" ledger is cut off: it names each area's open
// cue as a status, and a set-aside is not a handled area.
const split = async (page) => {
  const t = await page.locator('body').innerText();
  const ledger = t.search(/where you stand/i);
  const body = ledger < 0 ? t : t.slice(0, ledger);
  const at = body.indexOf(PILE);
  return at < 0 ? { list: body, pile: '' } : { list: body.slice(0, at), pile: body.slice(at) };
};
const askText = (page) => page.locator('.hero h2.ask').first().innerText({ timeout: 1000 }).catch(() => '');
const heroCard = (page) => page.locator('.hero .hero-card').first();
const notNow = (page) => heroCard(page).locator('button.mini', { hasText: 'not now' }).first();

test('the allergy is one step, and setting it aside sets it aside', async ({ page }) => {
  await boot(page, ev(6));
  // PREMISE: the allergy is the hero, asked once.
  await expect(page.locator('.hero h2.ask').first()).toHaveText(/Who has a food allergy\?/);
  const before = await split(page);
  expect((before.list.match(STEP) || []).length, before.list).toBe(1);
  await notNow(page).click();
  await expect.poll(() => askText(page)).not.toMatch(/food allergy/);
  const after = await split(page);
  console.log('AFTER SETTING IT ASIDE:\n' + after.list.split('\n').filter((l) => /\S/.test(l)).slice(-12).join('\n'));
  expect(after.list).not.toMatch(STEP);
  expect(after.list).not.toMatch(/Who has a food allergy/);
  expect((after.pile.match(STEP) || []).length, after.pile).toBe(1);
});

test('the reverse: the food-plan cue set aside a month out stays aside when the gate opens', async ({ page }) => {
  // A month out no food buy is in its window: the food-plan cue is the hero.
  await boot(page, ev(30));
  await expect(heroCard(page)).toContainText('Note dietary needs on the food plan');
  await notNow(page).click();
  await expect.poll(() => askText(page)).not.toMatch(/food allergy/);
  // Six days out the gate's "Collect dietary restrictions & allergies" would lead.
  await page.evaluate((d) => {
    const evs = JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'));
    evs[0].date = d;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify(evs));
  }, dateIn(6));
  await page.reload();
  await settled(page);
  const after = await split(page);
  console.log('SIX DAYS OUT, SET ASIDE A MONTH OUT:\n' + after.list.split('\n').filter((l) => /\S/.test(l)).slice(-12).join('\n'));
  expect(after.list).not.toMatch(STEP);
  expect(after.list).not.toMatch(/Who has a food allergy/);
  expect((after.pile.match(STEP) || []).length, after.pile).toBe(1);
});
