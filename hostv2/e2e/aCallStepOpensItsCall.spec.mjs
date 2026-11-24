// ─── A CHECKLIST STEP THAT IS A CALL OPENS THAT CALL (11/21/2026) ────────────
//
// "Decide whose midnight it is: the late adult party, the family countdown at
// 9, or the early-then-late double" sat in the New Year's Eve checklist with no
// button, though the call (midnight_model) is on Calls to make. The step names
// its call (`answeredBy`), and checklistRouteFor sends it there.
// Jest twin: src/__tests__/everyChecklistRowHasADestination.test.js.
import { test, expect, settled, sheetSettled, dateIn, openSectionByName, checklistStepAction } from './fixtures.mjs';

const ID = 'e2e-nye-call';
const STEP = 'Decide whose midnight it is: the late adult party, the family countdown at 9, or the early-then-late double';

test('the midnight step opens Calls to make on that call', async ({ page }) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, {
    id: ID, name: 'Our New Year', type: "New Year's Eve Party", date: dateIn(30),
    createdAt: new Date().toISOString(), venue: 'Home', venueKind: 'home', venueCity: 'Austin', venueState: 'TX',
    startTime: '20:00', guestMode: 'count', guestEstimate: 20, guestCountSource: 'host', guests: [], vendors: [],
    totalBudget: 600, budget: [], foodChoices: {},
    timeline: [{ id: `pbt-${ID}-t_model`, task: STEP, leadDays: -21, week: '3 weeks out', done: false, owner: '', category: 'planning', phase: 'planning' }],
  });
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'Your checklist');
  await sheetSettled(page);
  const btn = (await checklistStepAction(page, 'Make the call'));
  await expect(btn).toBeVisible();
  await btn.click();
  await sheetSettled(page);
  const sheet = page.locator('.sheet').last();
  await expect(sheet.locator('#sheet-title')).toHaveText('Calls to make');
  await expect(sheet.locator('.rowfocus')).toContainText(/midnight/i);
});
