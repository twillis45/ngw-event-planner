// ─── THE INVITE: REPLY LEADS, AND IT FILLS THE SCREEN (owner, 11/11/2026) ─────
//
// The owner's decision, "full screen and fix 1-3":
//   · at 1024 and up the invite fills the window, light and dark: the invitation
//     on the left, the reply on the right (it was a 393px phone silhouette in a
//     1440 window, and a 720px column at 1024);
//   1. the reply is the primary action: all three answers on one row, "Yes"
//      filled until the guest picks;
//   2. the line saying where the reply goes, and Forward, sit directly under the
//      reply buttons, in the first screen (they were below the card, under the
//      fold on every viewport);
//   3. no "Be the first to say yes".
// Measured in the browser, at every project's viewport.
import { test, expect } from './fixtures.mjs';

const EVENT = (over) => ({
  id: 'cust-invite-reply', rsvpCode: 'invite-reply-code',
  name: 'Margaret Adeyemi’s Retirement Dinner', type: 'Retirement Party', date: '2027-03-06', startTime: '19:00',
  venueName: 'The Willow Room', guestEstimate: 40, guestMode: 'count', guests: [], vendors: [], budget: [], timeline: [], ...over,
});

const open = async (page, over = {}) => {
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT(over));
  await page.route('https://e2e-mock.invalid/**', (route) => route.fulfill({ status: 404, json: { detail: 'not found' } }));
  await page.goto('?rsvp=' + EVENT().rsvpCode);
  // PREMISE: the reply buttons rendered, so the layout under test is the real one.
  await expect(page.getByRole('radio', { name: /Yes, I.m in/i }).first()).toBeVisible();
  await page.waitForTimeout(2600);   // past the staged entrance
};

const replyRow = (page) => page.evaluate(() => {
  const radios = [...document.querySelectorAll('.inv2-replies [role=radio]')];
  const bg = (el) => getComputedStyle(el).backgroundColor;
  const yes = radios.find((r) => /Yes, I.m in/i.test(r.textContent));
  const maybe = radios.find((r) => /^Maybe$/i.test(r.textContent.trim()));
  return {
    count: radios.length,
    tops: [...new Set(radios.map((r) => Math.round(r.getBoundingClientRect().top)))],
    yesY: Math.round(yes.getBoundingClientRect().top),
    yesFilled: bg(yes) !== bg(maybe),
    rowBottom: Math.max(...radios.map((r) => r.getBoundingClientRect().bottom)),
    minHeight: Math.min(...radios.map((r) => r.getBoundingClientRect().height)),
  };
});

for (const tone of ['light', 'dark']) {
  test(`${tone}: the reply leads — one row, Yes filled, the delivery note and Forward right under it`, async ({ page }) => {
    await open(page, { inviteStyle: tone === 'dark' ? 'elegant' : 'bright' });
    const row = await replyRow(page);
    expect(row.count).toBe(3);
    expect(row.tops.length, 'the three replies wrapped onto more than one row').toBe(1);
    expect(row.minHeight, 'a reply button is smaller than a 44px tap target').toBeGreaterThanOrEqual(44);
    expect(row.yesFilled, '"Yes" is not the filled primary action').toBe(true);

    const below = await page.evaluate((rowBottom) => {
      const note = document.querySelector('.inv2-delivery');
      const fwd = [...document.querySelectorAll('button')].find((b) => /Forward this invite/.test(b.textContent));
      const n = note.getBoundingClientRect(); const f = fwd.getBoundingClientRect();
      return { gap: n.top - rowBottom, noteBottom: n.bottom, fwdBottom: f.bottom, fwdAfterNote: f.top >= n.bottom - 1, vh: innerHeight };
    }, row.rowBottom);
    expect(below.gap, 'the delivery note is not directly under the reply buttons').toBeLessThanOrEqual(24);
    expect(below.fwdAfterNote).toBe(true);
    // In the first screen wherever there is a first screen to speak of; a
    // landscape phone (430px tall) cannot hold the invitation and the reply both.
    if (below.vh >= 700) {
      expect(below.noteBottom, 'the delivery note is below the fold').toBeLessThanOrEqual(below.vh);
      expect(below.fwdBottom, 'Forward is below the fold').toBeLessThanOrEqual(below.vh);
    }

    // Once the guest picks, the pick carries the fill and Yes lets go of it.
    await page.getByRole('radio', { name: /Can.t make it/i }).first().click();
    const after = await page.evaluate(() => {
      const r = [...document.querySelectorAll('.inv2-replies [role=radio]')];
      const bg = (el) => getComputedStyle(el).backgroundColor;
      return { yes: bg(r[0]), maybe: bg(r[2]) };
    });
    expect(after.yes, 'two filled buttons at once: Yes kept its fill after another answer was picked').toBe(after.maybe);
  });
}

test('nobody has replied yet: the invite says nothing about it', async ({ page }) => {
  await open(page);
  // PREMISE: the facts block rendered (where the social line used to sit).
  await expect(page.locator('.inv2-val').first()).toBeVisible();
  await expect(page.getByText(/first to say yes/i)).toHaveCount(0);
});

test('at 1024 and up the invite fills the window, and opening the form moves nothing already on screen', async ({ page }) => {
  const vw = page.viewportSize().width;
  test.skip(vw < 1024, 'two columns start at 1024');
  await open(page);
  const m = await page.evaluate(() => {
    const s = document.querySelector('.inv2-sheet').getBoundingClientRect();
    const face = document.querySelector('.inv2-face').getBoundingClientRect();
    const ask = document.querySelector('.inv2-ask').getBoundingClientRect();
    const name = document.querySelector('.inv2-name');
    return {
      left: s.left, right: s.right, top: s.top, height: s.height, vw: innerWidth, vh: innerHeight,
      sideBySide: ask.left >= face.right - 1 && Math.abs(ask.top - face.top) <= 1,
      titleLines: Math.round(name.getBoundingClientRect().height / parseFloat(getComputedStyle(name).lineHeight)),
    };
  });
  expect(m.left).toBeLessThanOrEqual(1);
  expect(m.right).toBeGreaterThanOrEqual(m.vw - 1);
  expect(m.top).toBeLessThanOrEqual(1);
  expect(m.height, 'the card stops short of the bottom of the window').toBeGreaterThanOrEqual(m.vh - 1);
  expect(m.sideBySide, 'the reply is not beside the invitation').toBe(true);
  expect(m.titleLines, 'the event name runs past two lines').toBeLessThanOrEqual(2);

  const before = await replyRow(page);
  const countBefore = await page.locator('.inv2-count').evaluate((el) => el.getBoundingClientRect().top);
  await page.getByRole('radio', { name: /Yes, I.m in/i }).first().click();
  await expect(page.getByLabel(/Your name/i).first()).toBeVisible();
  await page.waitForTimeout(700);
  const afterRow = await replyRow(page);
  const countAfter = await page.locator('.inv2-count').evaluate((el) => el.getBoundingClientRect().top);
  expect(Math.abs(afterRow.yesY - before.yesY), 'the reply buttons jumped when the form opened').toBeLessThanOrEqual(1);
  expect(Math.abs(countAfter - countBefore), 'the invitation moved when the form opened').toBeLessThanOrEqual(1);
});
