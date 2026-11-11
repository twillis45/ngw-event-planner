// ─── HEALTH DETAILS SAY WHO SEES THEM (stage 9 board, WO #5, 11/11/2026) ─────
//
// The invite asks a guest for allergies, diet rules, and access needs before any
// privacy policy is published. At those fields it now says, in one owner-approved
// sentence (lib/guestDataNotice), who sees the answers and how to have them
// removed. This checks the guest can SEE that sentence, and that it sits with
// the fields it is about (not at the foot of the page), in light and dark
// invites, after a guest taps Yes:
//   · the full allergies / diet / access group (any event), and
//   · the shellfish question asked outright on a crab event.
// Seeded like theInviteReplyLeads.spec.mjs.
import { test, expect } from './fixtures.mjs';

// No e2e imports from src/ (its modules resolve extensionless, which Node ESM
// does not), so the spec pins what must stay true of whatever text the owner
// approves: it names the support inbox (BRAND.support). The exact wording is
// pinned by the jest test of the constant.
const SUPPORT = 'events@noguessworksystems.com';

const EVENT = (over) => ({
  id: 'cust-health-notice', rsvpCode: 'health-notice-code',
  name: 'Margaret Adeyemi’s Retirement Dinner', type: 'Retirement Party', date: '2027-03-06', startTime: '19:00',
  venueName: 'The Willow Room', guestEstimate: 40, guestMode: 'count', guests: [], vendors: [], budget: [], timeline: [], ...over,
});

const open = async (page, over = {}) => {
  const e = EVENT(over);
  await page.addInitScript((ev) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, e);
  await page.route('https://e2e-mock.invalid/**', (route) => route.fulfill({ status: 404, json: { detail: 'not found' } }));
  await page.goto('?rsvp=' + e.rsvpCode);
  // PREMISE: the reply buttons rendered.
  await expect(page.getByRole('radio', { name: /Yes, I.m in/i }).first()).toBeVisible();
  await page.waitForTimeout(2600);   // past the staged entrance
  await page.getByRole('radio', { name: /Yes, I.m in/i }).first().click();
};

// The notice is in the same field group when it follows the group's last field
// with no other question (shelf-label) between them, and sits close under it.
const placement = (page, kind, firstSel, lastSel) => page.evaluate(({ kind, firstSel, lastSel }) => {
  const note = document.querySelector(`[data-guest-data-notice="${kind}"]`);
  const first = document.querySelector(firstSel);
  const last = document.querySelector(lastSel);
  if (!note || !first || !last) return { found: false };
  const FOLLOWS = Node.DOCUMENT_POSITION_FOLLOWING;
  const labels = [...document.querySelectorAll('.shelf-label')]
    .filter((l) => (last.compareDocumentPosition(l) & FOLLOWS) && (l.compareDocumentPosition(note) & FOLLOWS));
  return {
    found: true,
    afterFields: !!(last.compareDocumentPosition(note) & FOLLOWS) && !!(first.compareDocumentPosition(note) & FOLLOWS),
    questionsBetween: labels.length,
    gap: note.getBoundingClientRect().top - last.getBoundingClientRect().bottom,
  };
}, { kind, firstSel, lastSel });

for (const tone of ['light', 'dark']) {
  const inviteStyle = tone === 'dark' ? 'elegant' : 'bright';

  test(`${tone}: the allergies / diet / access group says who sees the answers`, async ({ page }) => {
    await open(page, { inviteStyle });
    // Closed, there are no health fields and no notice to read.
    await expect(page.locator('[data-guest-data-notice="needs"]')).toHaveCount(0);
    await page.getByRole('button', { name: /^Add dietary or access needs$/ }).click();

    const allergies = page.getByRole('group', { name: 'Allergies' });
    const diet = page.getByRole('group', { name: 'Diet' });
    const access = page.getByRole('group', { name: 'Access needs' });
    await expect(allergies).toBeVisible();
    await expect(diet).toBeVisible();
    await expect(access).toBeVisible();

    const note = page.locator('[data-guest-data-notice="needs"]');
    await note.scrollIntoViewIfNeeded();
    await expect(note).toBeVisible();
    await expect(note).toContainText(SUPPORT);

    const p = await placement(page, 'needs', '[role=group][aria-label="Allergies"]', 'input[aria-label="Other needs"]');
    expect(p.found).toBe(true);
    expect(p.afterFields, 'the notice is not with the allergy / diet / access fields').toBe(true);
    expect(p.questionsBetween, 'another question sits between the fields and the notice').toBe(0);
    expect(p.gap, 'the notice is not directly under the fields').toBeLessThanOrEqual(24);

    // Not faded out or shrunk on this tone (the inv2-fine rule is 12.5px).
    const ink = await note.evaluate((el) => {
      const c = getComputedStyle(el);
      return { opacity: Number(c.opacity), fontSize: parseFloat(c.fontSize) };
    });
    expect(ink.opacity).toBeGreaterThan(0.5);
    expect(ink.fontSize).toBeGreaterThanOrEqual(12);
  });

  test(`${tone}: the shellfish question on a crab feast says who sees the answer`, async ({ page }) => {
    await open(page, { inviteStyle, name: 'Kent Island Crab Feast', type: 'Crab Feast' });
    const group = page.getByRole('group', { name: 'Shellfish allergy' });
    await expect(group).toBeVisible();
    const note = page.locator('[data-guest-data-notice="shellfish"]');
    await note.scrollIntoViewIfNeeded();
    await expect(note).toBeVisible();
    await expect(note).toContainText(SUPPORT);

    const p = await placement(page, 'shellfish', '[role=group][aria-label="Shellfish allergy"]', '[role=group][aria-label="Shellfish allergy"]');
    expect(p.found).toBe(true);
    expect(p.afterFields).toBe(true);
    expect(p.questionsBetween, 'the notice drifted past the next question').toBe(0);
    // The menu line sits between the chip and the notice, so allow two short lines.
    expect(p.gap).toBeLessThanOrEqual(60);
  });
}
