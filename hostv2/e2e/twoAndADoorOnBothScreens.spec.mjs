// ─── THIRTEEN STEPPERS, OR TWO AND A DOOR ────────────────────────────────────
//
// The same dietary control renders on two surfaces and they disagreed.
// Measured on the Santa Fe 80th: the food sheet showed "Vegetarian · Vegan ·
// + 11 more", the Calls editor showed all thirteen −/+ rows expanded. Thirteen
// steppers is most of a phone screen spent on questions nobody asked.
//
// Engine proof: src/lib/__tests__/thirteenSteppersOrTwoAndADoor.test.js. What
// is driven HERE is the thing jest cannot see — that both SCREENS now read it.
import { test, expect, settled } from './fixtures.mjs';

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}, src);
const bodyText = (page) => page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));

// The tags that must NOT be on screen until the door is opened: everything past
// the first two unanswered ones.
const FOLDED = ['Pescatarian', 'Gluten-free', 'Dairy-free', 'Nut allergy', 'Shellfish',
  'Halal', 'Kosher', 'Alcohol-free', 'Egg allergy', 'Soy allergy', 'Diabetic-friendly'];

const seed = async (page, dietCounts) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((d) => {
    const ev = {
      id: 'e2e-diet', name: 'Mom’s 80th', type: 'Birthday',
      date: '2027-06-17', endDate: '2027-06-21',
      isDestination: true, venueCity: 'Santa Fe', state: 'NM',
      guestMode: 'count', guestCount: 10, totalBudget: 4000,
      budget: [], vendors: [], guests: [],
      ...(d ? { dietCounts: d } : {}),
    };
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-diet');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, dietCounts);
  await page.goto('?elegant=1');
  await settled(page);
};

const openCalls = async (page, dietCounts) => {
  await seed(page, dietCounts);
  await tapText(page, 'Calls to make');
  await page.waitForTimeout(1600);
  await settled(page);
};

test('(premise) the Calls screen really does carry the dietary steppers', async ({ page }) => {
  await openCalls(page, null);
  const t = await bodyText(page);
  expect(t).toMatch(/Allergies and dietary needs/i);
  expect(t).toMatch(/Vegetarian/);
});

test('THE FIX: Calls to make no longer dumps all thirteen', async ({ page }) => {
  await openCalls(page, null);
  const t = await bodyText(page);
  for (const tag of FOLDED) {
    // Each folded tag may still appear inside the "+ 11 more — ..." preview
    // line, so the check is that it is not a row of its own: a stepper row
    // renders the tag with its own −/+ controls and a count.
    expect(t).not.toMatch(new RegExp(tag + '\\s*−\\s*\\d+\\s*\\+'));
  }
  // The two that ARE offered still are.
  expect(t).toMatch(/Vegetarian\s*−\s*0\s*\+/);
  expect(t).toMatch(/Vegan\s*−\s*0\s*\+/);
});

test('the door is there, and it says what is behind it', async ({ page }) => {
  await openCalls(page, null);
  expect(await bodyText(page)).toMatch(/\+ 11 more/i);
});

test('opening the door brings the rest back', async ({ page }) => {
  // A fold that cannot be opened is a deletion.
  await openCalls(page, null);
  await tapText(page, '\\+ 11 more');
  await page.waitForTimeout(1200);
  await settled(page);
  const t = await bodyText(page);
  expect(t).toMatch(/Kosher\s*−\s*0\s*\+/);
  expect(t).toMatch(/Diabetic-friendly\s*−\s*0\s*\+/);
});

test('A COUNT IS AN ANSWER: an answered tag leads, however far down the list', async ({ page }) => {
  // Kosher sits 9th and would vanish behind a plain slice(0, 2). It is the
  // host's own input, so it must be on screen without opening anything.
  await openCalls(page, { Kosher: 3 });
  const t = await bodyText(page);
  expect(t).toMatch(/Kosher\s*−\s*3\s*\+/);
  expect(t).toMatch(/\+ 10 more/i);
});

test('NEGATIVE CONTROL: the food sheet still folds exactly as it did', async ({ page }) => {
  // The other half of "one rule, both surfaces" — the screen that was already
  // right must not have changed.
  await seed(page, null);
  await tapText(page, "what you.?re serving|dietary needs on the food plan");
  await page.waitForTimeout(1500);
  await settled(page);
  // DIETARY NEEDS MOVED TO THE PLAN TAB (2026-09-24). The spread sheet split
  // into Plan / Bringing / Shop, and the planning rows — Your choices, Dietary
  // needs, How it's sourced — left the shopping tab, which is what stopped it
  // being seven stacked blocks deep before the first grocery. The sheet opens
  // on Shop, so the door is one tap further in. The fold behaviour this test
  // guards is unchanged; only the route to it moved.
  await tapText(page, '^Plan$');
  await page.waitForTimeout(600);
  await settled(page);
  await tapText(page, 'Dietary needs');
  await page.waitForTimeout(1200);
  await settled(page);
  const t = await bodyText(page);
  expect(t).toMatch(/Vegetarian/);
  expect(t).toMatch(/\+ 11 more/i);
});
