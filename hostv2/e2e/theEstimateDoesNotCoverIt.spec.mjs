// ─── THE HEADLINE THAT DOES NOT COVER THE PLAN'S OWN VENDORS ─────────────────
//
// Surprise Proposal's own roster requires a photographer and a ring — a $1,750
// floor — and its budget estimate is $100–$300–$500. `estimateTotalRange` has
// reported `belowRequiredVendors` since 2026-09-19 and nothing read it, so a
// host reached a one-tap "Use $300" with no idea their plan already called for
// six times that.
//
// Open call #3 was "refuse the headline or floor it". The decision (2026-09-23)
// is neither: refusing costs the host the number they came for, and flooring
// builds their primary figure out of 224 vendor ranges carrying zero
// provenance. They get both numbers, and are told which is which.
//
// DRIVEN, BECAUSE JEST CANNOT EXECUTE hostv2 — and because WHERE this lands is
// the whole point. A true sentence three screens away from the "Use $300"
// button would not have prevented the tap.
import { test, expect, settled, dateIn } from './fixtures.mjs';

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a')]
    .find((x) => rx.test((x.innerText || x.textContent || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}, src);

const bodyText = (page) => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

const openBudget = async (page, type, guestCount) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(([t, g, SEED_DATE]) => {
    const d = SEED_DATE;   // LOCAL, from fixtures.dateIn — toISOString is UTC
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([{
      id: 'e2e-sf', name: 'The Question', type: t, date: d,
      venueCity: 'Baltimore, MD', guestMode: 'count', guestCount: g,
      guests: [], budget: [], vendors: [],
    }]));
    localStorage.setItem('ngw-hostv2-last-event', 'e2e-sf');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, [type, guestCount, dateIn(120)]);
  await page.goto('?elegant=1');
  await settled(page);
  // The question is on the plan's front (owner, 11/26/2026: "As rendered is
  // fine"); the old hero needed a "Set your budget" tap first.
  if (!(await page.locator('[data-budget-plan]').count())) await tapText(page, 'Set your budget');
  await page.waitForTimeout(1200);
  await settled(page);
  return bodyText(page);
};

test('(premise) the budget proposal really is on screen, with its one-tap chip', async ({ page }) => {
  // Without this the assertions below could pass over a sheet that never opened.
  const t = await openBudget(page, 'Surprise Proposal', 2);
  // Owner, 11/24/2026 ("Copy is too wordy"): the budget ask card says it in one line; the headline is read where it stands.
  expect(t).toMatch(/How much do you want to spend\?.{0,200}?\$300/);
  expect(t).toMatch(/Plan with \$300/);
});

test('THE HOST IS TOLD BEFORE THEY TAP — both numbers, and which is which', async ({ page }) => {
  const t = await openBudget(page, 'Surprise Proposal', 2);
  // The same facts in the card's one sentence (owner, 11/24/2026): her
  // vendors' floor, the band's top, and which to set the number from.
  expect(t).toMatch(/vendors start around \$1,750/);
  expect(t).toMatch(/above this band’s \$500 top/);
  expect(t).toMatch(/set your number from them/);
});

test('IT SITS BETWEEN THE ESTIMATE AND THE BUTTON, which is the point', async ({ page }) => {
  // A true sentence below the fold would not have stopped the tap. This asserts
  // reading order: the estimate, then the warning, then the one-tap chip.
  const t = await openBudget(page, 'Surprise Proposal', 2);
  const estimate = t.search(/How much do you want to spend\?.{0,200}?\$300/);
  const note = t.search(/start around \$1,750/);
  const chip = t.search(/Plan with \$300/);
  expect(estimate).toBeGreaterThan(-1);
  expect(note).toBeGreaterThan(estimate);
  expect(chip).toBeGreaterThan(note);
});

test('THE HEADLINE IS NOT MOVED — flooring was refused, not quietly applied', async ({ page }) => {
  // If a future pass "fixes" this by raising the number instead, the chip stops
  // saying $300 and this fails. That is the whole distinction call #3 turned on.
  const t = await openBudget(page, 'Surprise Proposal', 2);
  expect(t).toMatch(/Plan with \$300/);
  expect(t).toMatch(/Lean \$100/);
  expect(t).toMatch(/All-out \$500/);
});

test('NEGATIVE CONTROL: an event whose estimate covers its plan says nothing', async ({ page }) => {
  // An 80-guest wedding clears its own roster. If the note appears here it has
  // become a disclaimer, and a disclaimer on every screen is read as decoration.
  const t = await openBudget(page, 'Wedding', 80);
  expect(t).toMatch(/How much do you want to spend\?/);
  expect(t).not.toMatch(/start around \$/);
  expect(t).not.toMatch(/above this band’s/);
});
