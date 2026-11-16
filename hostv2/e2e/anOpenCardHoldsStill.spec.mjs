// ─── AN OPEN CARD HOLDS STILL (owner's live hunt 11/15/2026, item 1 / #134) ───
//
// An open vendor card carried `ref={el => { if (el && isOpen) el.scrollIntoView(...) }}`.
// An inline callback ref runs on EVERY render, so every change inside the card
// — a tap, a keystroke — re-centered it. Measured on the live demo: "Send … the
// details" scrolled the sheet up 1,050px, "Mark asked" 1,150px, three digits in
// the phone field 385px. The result of the tap landed off screen, so the button
// looked dead. The same pattern sat on 11 other focused rows.
//
// The rule now: scroll when the card or row OPENS, never again while it stays
// open. Measured, not clicked-and-expected: the scroll container's scrollTop
// before and after an action inside the open card. Synthetic event.
import { test, expect, settled, openSectionByName, dateIn } from './fixtures.mjs';

const EVENT = {
  id: 'cust-hold-still', name: 'Harbor Retirement Dinner', type: 'Retirement Party', date: dateIn(40),
  startTime: '18:00', startTimeSource: 'host', venue: 'Elm Hall', hostName: 'Rae Kim',
  guestCount: 60, guestMode: 'count', guestCountSource: 'host', passRequired: false, passReasons: [], budget: [],
  vendors: [
    { id: 'v-a', name: 'Alder Rentals', category: 'Rentals', status: 'Quoted' },
    { id: 'v-b', name: 'Birch Sound', category: 'DJ', status: 'Quoted' },
    { id: 'v-cat', name: 'Harbor Rotisserie', contactName: 'Marco Bell', category: 'Catering', status: 'Contracted', coiStatus: 'required' },
  ],
  guests: [], timeline: [],
};

const boot = async (page) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.addInitScript((e) => {
    if (localStorage.getItem('ngw-hostv2-custom-events')) return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'People you’re hiring');
  await settled(page);
  await page.locator('.vcard', { hasText: 'Harbor Rotisserie' }).first().evaluate((c) => c.click());
  await page.waitForTimeout(600);   // the opening scroll is allowed — and finished
};

// The nearest scrolling ancestor of the open card, and its scrollTop.
const scrollTop = (page) => page.locator('.vcard.open').first().evaluate((card) => {
  let n = card.parentElement;
  while (n && n !== document.body) {
    const s = getComputedStyle(n);
    if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight) return Math.round(n.scrollTop);
    n = n.parentElement;
  }
  return Math.round(document.scrollingElement.scrollTop);
});

test('typing in the open card’s phone field does not move the sheet', async ({ page }) => {
  await boot(page);
  // A person taps a field they can see: bring it on screen first, then measure.
  const phone = page.locator('.vcard.open input[placeholder="phone"]').first();
  await phone.scrollIntoViewIfNeeded();
  await phone.click();
  await page.waitForTimeout(300);
  const before = await scrollTop(page);
  await page.keyboard.type('555');
  await page.waitForTimeout(400);
  expect(Math.abs((await scrollTop(page)) - before)).toBeLessThanOrEqual(2);
});

test('"Mark asked" on the open card does not move the sheet', async ({ page }) => {
  await boot(page);
  const before = await scrollTop(page);
  await page.locator('.vcard.open').getByRole('button', { name: /^Mark asked$/ }).first().evaluate((b) => b.click());
  await page.waitForTimeout(400);
  expect(Math.abs((await scrollTop(page)) - before)).toBeLessThanOrEqual(2);
});
