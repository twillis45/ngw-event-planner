// ─── THE VENDOR DETAIL OPENS IN LABELED GROUPS (cohesion batch B) ───────────
//
// Owner approval, 11/24/2026, of the renders on renders/cohesion-b, with two
// fixes: the header keeps the name on its own line with the meta on one line
// under it (price and status on the right, never squeezing the name), and
// Paperwork's buttons are quiet so only "Send … the details" is lit.
//
// UX_11 rules 1, 2, 3 and 9. The audit (#7, #8, #9, #22) measured an opened
// vendor as ~30 unlabeled controls, "Remove from this event" mid-card, no lit
// action, and 16px status pills. As approved:
//   - groups, in order: Who they are · Where it stands · Reach them · The day ·
//     Money · Paperwork · What they said (a friend helping has no status,
//     money or paperwork groups);
//   - Call / Text / Email are tel:, sms: and mailto: links, which only open
//     the phone's own apps, and the card says nothing is sent from here;
//   - one lit action, "Send <their contact, or the vendor> the details";
//   - Remove alone at the bottom, naming who goes, with Undo.
// The 44px floor and rules 2/3 on this card are the sweep's
// (everySheetKeepsTheCohesionRules, "an opened vendor").
import { test, expect, settled, sheetSettled, openSectionByName } from './fixtures.mjs';

const iso = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const EVENT = {
  id: 'vd-groups', name: 'Jordan’s Retirement Party', type: 'Retirement Party', createdAt: '2026-11-01',
  date: iso(45), startTime: '17:00', startTimeSource: 'host', venue: 'Elm Court Hall',
  venueAddress: '42 Elm Ct, Springfield, VA 22150', guestMode: 'count', guestEstimate: 60, guestCountSource: 'host',
  guests: [], budget: [], timeline: [],
  vendors: [
    { id: 'v1', name: 'Elm Court Catering', category: 'Catering', status: 'Quoted', cost: 1500, phone: '(555) 010-0142',
      email: 'events@elmcourtcatering.example', contactName: 'Dana Cole', arrivalTime: '15:30' },
    { id: 'h1', name: 'Cousin Dana', category: 'Rentals', isInformal: true, phone: '(555) 010-0199' },
  ],
};
const PAID = ['Who they are', 'Where it stands', 'Reach them', 'The day', 'Money', 'Paperwork', 'What they said'];
const HELPER = ['Who they are', 'Reach them', 'The day', 'What they said'];

const boot = async (page) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.route('**/*', (r) => (r.request().method() === 'GET' ? r.fallback() : r.abort()));
  await page.route('https://e2e-mock.invalid/**', (r) => r.fulfill({ status: 404, json: { detail: 'not found' } }));
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'People you’re hiring', { settle: 600 });
  await sheetSettled(page);
};
const open = async (page, id) => {
  const card = page.locator(`.sheet .vcard[data-vid="${id}"]`);
  await card.locator('.vc-name').click();
  await expect(card).toHaveClass(/\bopen\b/);
  await card.evaluate((el) => Promise.allSettled(el.getAnimations({ subtree: true }).map((a) => a.finished)));
  return card;
};
const groups = (card) => card.locator('.vd-group > .shelf-label > :first-child').allInnerTexts()
  .then((a) => a.map((s) => s.trim().replace(/\s+/g, ' ')).map((s) => s.charAt(0) + s.slice(1).toLowerCase()));
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events') || '[]')[0]);

test('an opened vendor reads in its labeled groups, in order', async ({ page }) => {
  await boot(page);
  const card = await open(page, 'v1');
  expect(await groups(card)).toEqual(PAID.map((s) => s.charAt(0) + s.slice(1).toLowerCase()));
});

test('a friend helping out gets no status, money or paperwork groups', async ({ page }) => {
  await boot(page);
  const card = await open(page, 'h1');
  expect(await groups(card)).toEqual(HELPER.map((s) => s.charAt(0) + s.slice(1).toLowerCase()));
});

test('the name is a labeled field at the top, and writes the vendor', async ({ page }) => {
  await boot(page);
  const card = await open(page, 'v1');
  const first = card.locator('.vd-group').first();
  await expect(first.getByLabel('Name', { exact: true })).toHaveValue('Elm Court Catering');
  await first.getByLabel('Name', { exact: true }).fill('Elm Court Catering & Events');
  await expect.poll(async () => (await saved(page)).vendors[0].name).toBe('Elm Court Catering & Events');
});

test('Call, Text and Email only open the phone\'s own apps', async ({ page }) => {
  await boot(page);
  const card = await open(page, 'v1');
  const reach = card.locator('.vd-group', { has: page.locator('.shelf-label', { hasText: /Reach them/i }) });
  await expect(reach.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:5550100142');
  await expect(reach.getByRole('link', { name: 'Text' })).toHaveAttribute('href', 'sms:5550100142');
  await expect(reach.getByRole('link', { name: 'Email' })).toHaveAttribute('href', 'mailto:events@elmcourtcatering.example');
  await expect(reach).toContainText('Nothing is sent from here');
});

test('one lit action on the opened vendor: Send … the details', async ({ page }) => {
  await boot(page);
  await open(page, 'v1');
  const lit = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.backgroundImage = 'var(--cta-grad)';
    document.body.appendChild(probe);
    const grad = getComputedStyle(probe).backgroundImage; probe.remove();
    const sh = [...document.querySelectorAll('.sheet')].pop();
    return [...sh.querySelectorAll('button, a, [role="button"]')].filter((e) => {
      if (!e.getClientRects().length || e.closest('[inert], [aria-hidden="true"]')) return false;
      const cs = getComputedStyle(e);
      return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01 && cs.backgroundImage === grad;
    }).map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim());
  });
  // The button greets the vendor's own contact when the host named one (VB2).
  expect(lit).toEqual(['Send Dana the details']);
});

test('Remove is last and alone, names who goes, and Undo brings them back', async ({ page }) => {
  await boot(page);
  const card = await open(page, 'v1');
  const last = await card.evaluate((c) => {
    const all = [...c.querySelectorAll('.vc-more button, .vc-more a[href], .vc-more input, .vc-more textarea, .vc-more select, .vc-more [role=button]')]
      .filter((e) => e.getClientRects().length);
    return (all.pop().innerText || '').trim();
  });
  expect(last).toBe('Remove Elm Court Catering from this event');
  await card.getByRole('button', { name: 'Remove Elm Court Catering from this event' }).click();
  await expect.poll(async () => (await saved(page)).vendors.map((v) => v.id)).toEqual(['h1']);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await saved(page)).vendors.map((v) => v.id).sort()).toEqual(['h1', 'v1']);
});

// The header, measured at the four approved widths (owner's fix 1).
for (const [w, h] of [[390, 844], [834, 1194], [1024, 1366], [1440, 900]]) {
  test(`the header keeps the name on one line and the meta on one line at ${w}`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'pins its own four widths; measured once, under desktop');
    await page.setViewportSize({ width: w, height: h });
    await boot(page);
    const m = await page.locator('.sheet .vcard[data-vid="v1"] .vc-head').evaluate((head) => {
      const box = (s) => head.querySelector(s).getBoundingClientRect();
      const lines = (s) => { const e = head.querySelector(s); const lh = parseFloat(getComputedStyle(e).fontSize) * 1.6; return e.getBoundingClientRect().height / lh; };
      const name = head.querySelector('.vc-name');
      return { nameLines: lines('.vc-name'), metaLines: lines('.vc-cat'), nameClipped: name.scrollWidth > name.clientWidth + 1,
        name: box('.vc-name'), amt: box('.vc-amt'), pill: box('.vc-pill'), head: head.getBoundingClientRect() };
    });
    expect(m.nameLines, 'the name is one line').toBeLessThan(1.05);
    expect(m.metaLines, 'the meta is one line').toBeLessThan(1.05);
    expect(m.nameClipped, 'the name is not cut short').toBe(false);
    // price and status sit on the right
    expect(m.amt.left).toBeGreaterThanOrEqual(m.name.right - 1);
    expect(m.head.right - m.amt.right).toBeLessThan(24);
    expect(m.head.right - m.pill.right).toBeLessThan(24);
    expect(m.pill.left).toBeGreaterThan(m.head.left + m.head.width / 2);
  });
}
