// ─── WATCH PARTY MAJOR-EVENT — the differentiation reaches the host ─────────
//
// The 2026-09-13 session built a 16-event, 6-format differentiation system for
// Watch Party (major_event decision, whenChoice-gated purchases/tasks/risks/
// heartMoments, choiceShown()'s new {not:[...]} form, per-row whenChoice on
// timed schedule rows) entirely through direct engine calls
// (playbookFoodPlan/playbookRunOfShow/playbookChecklist/playbookHeartMoments/
// playbookRisks) — this sandbox had no working browser for most of that work.
// Three real, host-visible bugs were found ONLY by reading full engine output
// (ungated risks leaking onto every event; an impossible "halftime" heartMoment
// on no-halftime formats; a missing purchase caused by an unrelated decision
// collision) and none of them had a permanent test guarding against a repeat.
//
// This is that guard, driven through the ACTUAL rendered screen — not the
// engine directly — so a future refactor that breaks the wiring (not just the
// data) fails here instead of silently reaching nobody, the exact failure
// mode `checklistFollowsDecisions.spec.mjs` and `dayOfChecklist.spec.mjs` were
// each written to catch for other engines.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const WP_EVENT = {
  id: 'wp-e2e', name: 'Watch Party E2E', type: 'watch party', createdAt: '2026-09-01',
  guestMode: 'count', guestCount: 14, venueKind: 'home', venueCity: 'Baltimore', venueState: 'MD',
  guests: [], vendors: [], timeline: [], budget: [], totalBudget: 400,
};

const localISO = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Seeds a real Watch Party event, optionally pre-answering major_event (and
 * any other foodChoices) the way a stored patch would carry a host's picks. */
const bootWatchParty = async (page, foodChoices = {}) => {
  const d = new Date(); d.setDate(d.getDate() + 7);
  await page.addInitScript(([ev, patch, iso]) => {
    localStorage.setItem('ngw-events', JSON.stringify([{ ...ev, date: iso }]));
    if (Object.keys(patch.foodChoices || {}).length) {
      localStorage.setItem('ngw-hostv2-patch-wp-e2e', JSON.stringify(patch));
    }
    localStorage.setItem('ngw-hostv2-last-event', 'wp-e2e');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, [WP_EVENT, { foodChoices }, localISO(d)]);
  await page.goto('?elegant=1');
  await settled(page);
};

const readSheet = async (page, sectionName, sheetTitleMatch) => {
  await openSectionByName(page, sectionName, { timeout: 8000 });
  await expect(page.locator('#sheet-title')).toHaveText(sheetTitleMatch, { timeout: 8000 });
  return page.locator('.sheet').last().innerText();
};

/** The spread sheet shows category summary rows ("Food · 0 of 4 bought ›")
 * behind "The list" disclosure, and each category is itself collapsed behind
 * its own ".fg-label" row — item names (the actual test surface) only render
 * once every category is individually expanded. */
const readSpread = async (page) => {
  await openSectionByName(page, 'spread', { timeout: 8000 });
  await expect(page.locator('#sheet-title')).toHaveText(/spread|shopping/i, { timeout: 8000 });
  const sheet = page.locator('.sheet').last();
  const listRow = sheet.locator('text=The list').first();
  if (await listRow.count()) {
    await listRow.click();
    await settled(page);
  }
  const labels = sheet.locator('.fg-label');
  const categoryCount = await labels.count();
  for (let i = 0; i < categoryCount; i++) {
    await labels.nth(i).click();
    await page.waitForTimeout(300);
  }
  return sheet.innerText();
};

/** The checklist sheet sometimes needs an explicit "Draft my checklist from
 * the playbook" tap before any task text renders — the sheet otherwise shows
 * only a "catch up" prompt with no items to assert against. */
const readChecklist = async (page) => {
  await openSectionByName(page, 'Your checklist', { timeout: 8000 });
  await expect(page.locator('#sheet-title')).toHaveText(/checklist/i, { timeout: 8000 });
  const sheet = page.locator('.sheet').last();
  const draftBtn = sheet.locator('button', { hasText: 'Draft my checklist from the playbook' }).first();
  if (await draftBtn.count()) {
    await draftBtn.click();
    await settled(page);
  }
  return page.locator('.sheet').last().innerText();
};

test.describe('Watch Party — Super Bowl default reaches the host untouched', () => {
  test('the spread has the plain default items, nothing event-specific', async ({ page }) => {
    await bootWatchParty(page);
    const spread = await readSpread(page);
    expect(spread).toMatch(/wings/i);
    expect(spread).toMatch(/beer|soda/i);
    expect(spread).not.toMatch(/mint julep/i);
    expect(spread).not.toMatch(/team colors/i);
    expect(spread).not.toMatch(/pimento cheese/i);
  });

  test('no irrelevant risks leak onto the default path (the bug found 2026-09-13)', async ({ page }) => {
    await bootWatchParty(page);
    const risks = await readSheet(page, 'What could go wrong', /wrong/i);
    // r_derby_time and r_rivalry showed on EVERY event, including this one,
    // before playbookRisks() gained a whenChoice gate — this is the guard.
    expect(risks).not.toMatch(/over in about two minutes/i);
    expect(risks).not.toMatch(/two schools/i);
    expect(risks).toMatch(/food not ready/i);
  });
});

test.describe('Watch Party — a named event genuinely reshapes the plan', () => {
  test('Kentucky Derby: mint julep in the spread, the right risk, the wrong one gone', async ({ page }) => {
    await bootWatchParty(page, { major_event: 'Kentucky Derby' });
    const spread = await readSpread(page);
    expect(spread).toMatch(/mint julep/i);

    const risks = await readSheet(page, 'What could go wrong', /wrong/i);
    expect(risks).toMatch(/over in about two minutes/i);
    expect(risks).not.toMatch(/two schools/i);
  });

  test('UFC / Boxing: the cost-coverage decision appears, halftime does not', async ({ page }) => {
    await bootWatchParty(page, { major_event: 'UFC / Boxing' });
    const decisions = await readSheet(page, 'Calls to make', /calls to make/i);
    expect(decisions).toMatch(/covering the cost/i);

    const tasks = await readChecklist(page);
    expect(tasks).not.toMatch(/halftime refresh/i);
  });

  test('NFL Playoffs following the whole run: the repeatable-list task fires', async ({ page }) => {
    await bootWatchParty(page, { major_event: 'NFL Playoffs', tourney_span: 'Following the whole run' });
    const decisions = await readSheet(page, 'Calls to make', /calls to make/i);
    expect(decisions).toMatch(/how much of the tournament/i);

    const tasks = await readChecklist(page);
    expect(tasks).toMatch(/repeatable shopping list/i);
  });
});

// ── THE WIRING PROOF — driven through the decision board, not seeded data ───
// Mirrors checklistFollowsDecisions.spec.mjs's crab-swap test: everything above
// seeds foodChoices directly, which proves the DATA reaches the screen but not
// that a host can actually GET there by tapping. This walks the real path —
// open the board, disclose the alternatives, pick one — for the one event
// whose content differs the most (Kentucky Derby), so a break in the decision
// board's own click-through wiring fails here even if every seeded-data test
// above still passes.
test('the major_event pick, made on the board itself, reaches the spread', async ({ page }) => {
  await bootWatchParty(page);
  await openSectionByName(page, 'Calls to make', { timeout: 8000 });
  await expect(page.locator('#sheet-title')).toHaveText(/calls to make/i, { timeout: 8000 });
  const board = page.locator('.sheet').last();

  // The default pick (Super Bowl) is shown; the other 15 options sit behind
  // "Other ways" — same disclosure pattern every other decision card uses.
  // The card is a `[data-flip="major_event"]` row, not an <article>.
  const card = board.locator('[data-flip="major_event"]');
  await card.locator('button', { hasText: 'Other ways' }).first().click();
  await settled(page);
  await card.locator('button', { hasText: 'Kentucky Derby' }).first().click();
  await settled(page);

  const spread = await readSpread(page);
  expect(spread, 'the board pick never reached the spread').toMatch(/mint julep/i);
});
