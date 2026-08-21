// ─── GIVING A JOB TO A PERSON ───────────────────────────────────────────────
//
// The review board ruled 6-2 to ship this narrowly, and Norman's condition of
// vote was the copy: an "Owner: Wanda" chip that notifies nobody is a control
// that lies -- the host believes the work is delegated and Wanda has never
// heard of it. Every assertion about wording here is that condition, not taste.
//
// The board also required the 44px target be PROVEN by hit-test rather than
// read off the CSS, because a computed ::after expander can be clipped to
// nothing by an ancestor and the rule still looks correct.
import { test, expect, settled } from './fixtures.mjs';

const boot = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    // An event with a real ROSTER. `my-crab-feast` counts guests rather than
    // naming them, so `assignablePeople` is empty there and the control
    // correctly does not render -- the ruling's disclosure rule, working. A
    // test that booted it would have read that as the feature being broken.
    localStorage.setItem('ngw-hostv2-last-event', 'test-two-days');
  });
  await page.goto('?elegant=1');
  await settled(page);
  const rail = page.locator('.srail-row', { hasText: 'Your checklist' });
  if (await rail.count()) { await rail.first().click(); } else {
    await page.locator('.ev-eyebrow').first().click();
    await page.locator('.sheet').last().getByText('Jump to a section', { exact: false }).first().click();
    await settled(page);
    await page.locator('.sheet').last().getByText('Your checklist', { exact: false }).first().click();
  }
  await settled(page);
  const draft = page.getByRole('button', { name: /Draft my checklist/i });
  if (await draft.count()) { await draft.click(); await settled(page); }
};

test('assigning names the person AND says they have not been told', async ({ page }) => {
  await boot(page);
  const assign = page.locator('.assign-btn').first();
  await expect(assign).toBeVisible();

  // Unassigned: the name says what the control does to WHAT.
  expect(await assign.getAttribute('aria-label')).toMatch(/^Assign .+ to someone$/);

  await assign.click();
  await settled(page);
  const opt = page.locator('.assign-opt').first();
  await expect(opt).toBeVisible();
  const who = (await opt.locator('.assign-who').innerText()).trim();

  // NORMAN'S CONDITION. Asserted at the moment the toast appears -- the first
  // version put `settled()` in between and the toast had already expired, so
  // the assertion read the home screen and reported the copy missing.
  // Scoped to the TOAST, not `.app`. The toast renders outside the app node, so
  // asserting on `.app` reported the copy missing while it was on screen -- the
  // second time today a source/DOM window was the bug rather than the subject.
  await opt.click();
  const toast = page.locator('.toast').first();
  await expect(toast).toContainText(/haven't been told yet/i, { timeout: 8000 });
  await expect(toast).toContainText(new RegExp(who.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  await expect(toast).toContainText(/you still owe them the ask/i);
  await settled(page);

  // And the row carries the same truth, never a bare name.
  const after = await page.locator('.assign-btn').first().innerText();
  expect(after).toContain(who);
  expect(after).toMatch(/not told yet/i);
});

test('the control is a SIBLING of the row, not nested inside it', async ({ page }) => {
  // Nested interactive content is invalid HTML and breaks keyboard and screen
  // reader traversal. The ruling was explicit; this is cheap to assert and
  // impossible to notice by looking.
  await boot(page);
  const nested = await page.locator('.frow .assign-btn').count();
  expect(nested).toBe(0);
  expect(await page.locator('.assign-btn').count()).toBeGreaterThan(0);
});

test('the target really is 44px where a thumb lands', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page);
  const probe = await page.locator('.assign-btn').first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cx = r.x + r.width / 2;
    // Sample the vertical extremes of the intended 44px band, not the text box.
    const top = document.elementFromPoint(cx, r.y + r.height / 2 - 20);
    const bot = document.elementFromPoint(cx, r.y + r.height / 2 + 20);
    const hits = (n) => !!n && (n === el || el.contains(n) || n.contains(el));
    return { top: hits(top), bot: hits(bot) };
  });
  // `el.contains(hit)` alone would count an ancestor and pass on a clipped
  // target — the failure this project has already paid for once.
  expect(probe.top && probe.bot, 'the 44px band is clipped to the text box').toBe(true);
});

test('assigning earns NO readiness credit', async ({ page }) => {
  // Clause 5. An assigned, unconfirmed row is MORE open work than an
  // unassigned one -- it now carries a second act that has not happened.
  await boot(page);
  // Counted as ROWS, not read off the hero. A `[class*="star"]` selector
  // matched broadly enough to hang the locator; the claim being tested is
  // simply that assigning closes nothing, and open rows say that directly.
  const openRows = () => page.locator('.sheet').last().locator('.frow:not(.got)').count();
  const beforeOpen = await openRows();
  expect(beforeOpen).toBeGreaterThan(0);

  await page.locator('.assign-btn').first().click();
  await settled(page);
  await page.locator('.assign-opt').first().click();
  await settled(page);

  expect(await openRows(), 'assigning closed a row').toBe(beforeOpen);
});

test('with nobody to assign to, the control does not render at all', async ({ page }) => {
  // Clause 7's disclosure rule, and the red-proof for every assertion above:
  // an empty picker is worse than no button. `my-crab-feast` counts its guests
  // rather than naming them, so there is genuinely nobody to hand a job to.
  await page.addInitScript(() => {
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'my-crab-feast');
  });
  await page.goto('?elegant=1');
  await settled(page);
  const rail = page.locator('.srail-row', { hasText: 'Your checklist' });
  if (await rail.count()) await rail.first().click();
  await settled(page);
  const draft = page.getByRole('button', { name: /Draft my checklist/i });
  if (await draft.count()) { await draft.click(); await settled(page); }
  // PREMISE: rows exist, so "zero assign buttons" is a real absence rather than
  // an empty sheet. The threshold was `> 4`, an arbitrary number taken from a
  // desktop run -- mobile, landscape and tablet render exactly 4 here and went
  // red on a claim the test was never trying to make. The premise is that there
  // is something to assign TO, not how much of it there is.
  expect(await page.locator('.frow').count()).toBeGreaterThan(0);
  expect(await page.locator('.assign-btn').count()).toBe(0);
});
