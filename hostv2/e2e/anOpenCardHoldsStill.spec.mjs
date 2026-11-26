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
  const phone = page.locator('.vcard.open').getByLabel('Phone', { exact: true }).first();
  await phone.scrollIntoViewIfNeeded();
  await phone.click();
  await page.waitForTimeout(300);
  const before = await scrollTop(page);
  await page.keyboard.type('555');
  await page.waitForTimeout(400);
  expect(Math.abs((await scrollTop(page)) - before)).toBeLessThanOrEqual(2);
});

// WHERE THE CARD SITS, NOT THE SCROLL OFFSET (11/22/2026, #231). "Mark asked"
// also rewrites the sheet's summary line ABOVE the card ("Insurance
// certificate not on file…" becomes "Booking in progress…"). Since sections sit
// on panels in dark (owner's parity ruling), that row is 34px narrower and the
// longer sentence takes three lines instead of two, so content above the card
// shrinks 16px and the browser's scroll anchoring takes 16px off scrollTop to
// keep the card where it was: measured card top 390 -> 390, scrollTop 338 ->
// 322. scrollTop is a proxy that reads an anchor correction as a move; the
// promise is the card's place on screen, and a re-centering scroll (the bug
// this file exists for, 1,150px) moves that too.
const cardTop = (page) => page.locator('.vcard.open').first().evaluate((c) => Math.round(c.getBoundingClientRect().top));

test('"Mark asked" on the open card does not move the sheet', async ({ page }) => {
  await boot(page);
  const before = await cardTop(page);
  await page.locator('.vcard.open').getByRole('button', { name: /^Mark asked$/ }).first().evaluate((b) => b.click());
  await page.waitForTimeout(400);
  expect(Math.abs((await cardTop(page)) - before)).toBeLessThanOrEqual(2);
});

// AND WHERE THE BROWSER DOES NOT ANCHOR (11/22/2026, #231). The test above
// passes on scroll anchoring: Chromium (and this repo's WebKit build) take
// the 16px off scrollTop themselves. Not every Safari the flagship phone runs
// anchors, so the shell holds the open card itself (holdOpenCard in
// HostShellV2: it notes the card's top before a vendor write and scrolls back
// by any drift on the next frame). Anchoring is switched off here to stand
// in for such a browser; without the shell's hold the card moves 16px.
test('"Mark asked" holds the card even where the browser does not anchor scrolling', async ({ page }) => {
  await page.addInitScript(() => {
    const add = () => { const s = document.createElement('style'); s.textContent = '*{overflow-anchor:none !important}'; document.head.appendChild(s); };
    if (document.head) add(); else document.addEventListener('DOMContentLoaded', add);
  });
  await boot(page);
  const before = await cardTop(page);
  await page.locator('.vcard.open').getByRole('button', { name: /^Mark asked$/ }).first().evaluate((b) => b.click());
  await page.waitForTimeout(400);
  expect(Math.abs((await cardTop(page)) - before)).toBeLessThanOrEqual(2);
});

// AND WHEN THE LINE ABOVE REFLOWS LATE (11/26/2026, main red on WebKit phone:
// the card moved 15px, run 45851381053). holdOpenCard corrected drift on ONE
// frame after the write; a reflow above the card that lands after that frame
// (here the summary line re-wrapping 120ms after the tap, as a later commit, a
// toast or an effect can) moved the card and nothing put it back. Measured on
// Chromium with the hold: 16px of drift left; the hold now keeps the card
// through the settle window.
test('"Mark asked" holds the card when the line above reflows after the first frame', async ({ page }) => {
  await page.addInitScript(() => {
    const add = () => { const s = document.createElement('style'); s.textContent = '*{overflow-anchor:none !important}'; document.head.appendChild(s); };
    if (document.head) add(); else document.addEventListener('DOMContentLoaded', add);
  });
  await boot(page);
  const before = await cardTop(page);
  await page.locator('.vcard.open').getByRole('button', { name: /^Mark asked$/ }).first().evaluate((b) => {
    b.click();
    setTimeout(() => { const n = document.querySelector('.fstat-note'); if (n) { n.style.display = 'block'; n.style.maxWidth = '90px'; } }, 120);
  });
  await page.waitForTimeout(900);
  expect(Math.abs((await cardTop(page)) - before)).toBeLessThanOrEqual(2);
});
