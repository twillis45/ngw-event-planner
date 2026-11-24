// ─── INVITE RULES IN THE INVITE STEP (owner-approved renders 10a/10b, 11/24/2026)
//
// The invite rules (plus-ones, kids, collecting mailing addresses, the gift
// note) are one component, rendered in "Before your invite goes out" and in
// the guest list, writing the same event fields with the values the RSVP page
// already reads. Plain labels, one wording. Chips are outlined; the selected
// one has a green outline and a check, and no fill. In the guest list they are
// open, not folded behind "Invite rules — …".
import { test, expect, settled, dateIn, openSectionByName, sheetSettled } from './fixtures.mjs';

// No place yet, so "Invite your guest list" opens the invite step first.
const EVENT = {
  id: 'e2e-invite-rules', name: 'Vida’s Friendsgiving', type: 'Friendsgiving',
  date: dateIn(12), createdAt: new Date().toISOString(), startTime: '16:00', startTimeSource: 'host',
  guestMode: 'list', guestEstimate: 6, guestCountSource: 'host', budget: [], vendors: [], timeline: [],
  guests: [{ id: 'g1', name: 'Maya Chen', email: 'maya@example.test' }],
};
const boot = async (page, ev = EVENT) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1');
  await settled(page);
};
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);
const WORDING = {
  plus: ['Plus-ones', ['Welcome', 'Not this time', 'Not set']],
  kids: ['Kids', ['Kids welcome', 'Adults only', 'Not set']],
  addr: ['Collect mailing addresses', ['Yes', 'No']],
  gift: ['Gift note', ['None', '“No gifts, please”', 'Registry link']],
};
const readRules = (root) => root.locator('[data-invite-rule]').evaluateAll((els) => Object.fromEntries(els.map((el) => [
  el.getAttribute('data-invite-rule'),
  [el.querySelector('.invite-rule-l').innerText.trim(),
    [...el.querySelectorAll('.chip')].map((c) => c.innerText.replace(/^✓\s*/, '').trim()),
    [...el.querySelectorAll('.chip[aria-pressed="true"]')].map((c) => c.innerText.replace(/^✓\s*/, '').trim())],
])));
const openGuests = async (page) => { await openSectionByName(page, /^Guests/); await sheetSettled(page); };
const openInviteStep = async (page) => {
  await openGuests(page);
  await page.locator('.sheet').last().getByRole('button', { name: /^Invite your guest list \(\d+\)$/ }).first().click();
  await expect(page.locator('[data-invite-check]')).toBeVisible();
};

test('the invite step carries the rules, in plain words, nothing set', async ({ page }) => {
  await boot(page);
  await openInviteStep(page);
  const rules = page.locator('[data-invite-check] [data-invite-rules]');
  await expect(rules).toBeVisible();
  const r = await readRules(rules);
  for (const [k, [label, opts]] of Object.entries(WORDING)) {
    expect(r[k][0]).toBe(label);
    expect(r[k][1]).toEqual(opts);
  }
  expect(r.plus[2]).toEqual(['Not set']);
  expect(r.kids[2]).toEqual(['Not set']);
  expect(r.addr[2]).toEqual(['No']);
  expect(r.gift[2]).toEqual(['None']);
});

test('a pick in the invite step writes the stored value the RSVP page reads, and the guest list shows it', async ({ page }) => {
  await boot(page);
  await openInviteStep(page);
  const rules = page.locator('[data-invite-check] [data-invite-rules]');
  await rules.locator('[data-invite-rule="plus"] .chip', { hasText: 'Welcome' }).click();
  await rules.locator('[data-invite-rule="kids"] .chip', { hasText: 'Adults only' }).click();
  await rules.locator('[data-invite-rule="addr"] .chip', { hasText: 'Yes' }).click();
  await rules.locator('[data-invite-rule="gift"] .chip', { hasText: 'No gifts' }).click();
  await page.waitForTimeout(300);
  const ev = await stored(page);
  expect(ev.plusOnePolicy).toBe('plus_one_ok');
  expect(ev.kidsPolicy).toBe('adults_only');
  expect(ev.collectAddresses).toBe(true);
  expect(ev.giftWish).toMatchObject({ mode: 'no_gifts' });
  // Selected: a green outline and a check, no fill.
  const look = await rules.locator('[data-invite-rule="plus"] .chip[aria-pressed="true"]').evaluate((el) => {
    const s = document.createElement('span'); s.style.color = 'var(--ok)'; document.body.appendChild(s);
    const ok = getComputedStyle(s).color; s.remove();
    const cs = getComputedStyle(el);
    return { border: cs.borderTopColor, bg: cs.backgroundColor, check: getComputedStyle(el, '::before').content, ok };
  });
  expect(look.border).toBe(look.ok);
  expect(look.bg).toBe('rgba(0, 0, 0, 0)');
  expect(look.check).toContain('✓');
  const offBg = await rules.locator('[data-invite-rule="plus"] .chip[aria-pressed="false"]').first().evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(offBg).toBe('rgba(0, 0, 0, 0)');
  // The same component, open, in the guest list, reading the same record.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await openGuests(page);
  const g = page.locator('.sheet').last().locator('[data-invite-rules]');
  await expect(g).toBeVisible();
  const r = await readRules(g);
  expect(r.plus[2]).toEqual(['Welcome']);
  expect(r.kids[2]).toEqual(['Adults only']);
  expect(r.addr[2]).toEqual(['Yes']);
  expect(r.gift[2]).toEqual(['“No gifts, please”']);
  // Back to unset from the guest list.
  await g.locator('[data-invite-rule="plus"] .chip', { hasText: 'Not set' }).click();
  await g.locator('[data-invite-rule="gift"] .chip', { hasText: 'None' }).click();
  await g.locator('[data-invite-rule="addr"] .chip', { hasText: 'No' }).click();
  await page.waitForTimeout(300);
  const ev2 = await stored(page);
  expect(ev2.plusOnePolicy == null).toBe(true);
  expect(ev2.giftWish == null || !ev2.giftWish.mode).toBe(true);
  expect(ev2.collectAddresses).toBe(false);
  expect(await page.locator('.sheet').last().getByText(/^Invite rules — /).count()).toBe(0);
});

test('a gift wish stored before the plain labels stays shown and selected', async ({ page }) => {
  await boot(page, { ...EVENT, id: 'e2e-invite-rules-legacy', giftWish: { mode: 'charity', detail: 'The food bank' } });
  await openGuests(page);
  const r = await readRules(page.locator('.sheet').last().locator('[data-invite-rules]'));
  expect(r.gift[2]).toEqual(['A donation']);
  expect((await stored(page)).giftWish).toEqual({ mode: 'charity', detail: 'The food bank' });
});
