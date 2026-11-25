// A SHORT LANDSCAPE FITS EVERY KIND OF ASK (live check, 11/24/2026).
//
// The event title (owner, 11/24/2026: every wide board names its event) is
// taller than the eyebrow it replaced. The first fix sized only the card-style
// ask to the screen's height, and the live check of e1ff88b found the
// three-option vendor ask at 1024x768 with two of its answers under the fold.
// So the rule is asserted per ask KIND, not per screen: whatever the hero asks,
// every answer it offers starts and ends in the first screen, above the fold
// handle. Made-up events only.
import { test, expect, settled, dateIn } from './fixtures.mjs';

const CARD_ASK = {
  id: 'E2E_TEST_short-card', name: 'Maya’s 40th Birthday', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(9), startTime: '18:00', startTimeSource: 'host',
  venue: 'The Ironwood Room', venueAddress: '41 Market St, Annapolis, MD', venueCity: 'Annapolis, MD',
  hostName: 'Casey Morgan', guestMode: 'list', guestEstimate: 14, guestCountSource: 'host',
  guests: [{ id: 'g1', name: 'Jordan Avery', rsvp: 'Yes' }, { id: 'g2', name: 'Riley Park', rsvp: 'Yes' }],
  vendors: [
    { id: 'v-cat', name: 'Harvest Table Catering', category: 'Catering', status: 'Considering', cost: 2400, budgetCategory: 'Food' },
    { id: 'v-dj', name: 'Night Shift DJ', category: 'DJ', status: 'Deposit Paid', cost: 900, depositAmt: 300, depositPaid: true, contractSigned: true },
  ],
  budget: [{ id: 'food', category: 'Food', budgeted: 2500, actual: 0 }, { id: 'music', category: 'Music', budgeted: 1000, actual: 300 }],
  timeline: [{ id: 't1', task: 'Confirm final headcount with caterer', week: 'This week' }],
};

// The live check's own event: its hero asks about the caterer's insurance,
// with three stacked answers.
const OPTIONS_ASK = {
  id: 'E2E_TEST_short-options', name: 'Rosa’s Harvest Dinner', type: 'Dinner Party', createdAt: '2026-11-01',
  date: dateIn(25), startTime: '18:00', startTimeSource: 'host',
  venue: 'Home', venueKind: 'home', venueAddress: '42 Elm Ct, Springfield, VA 22150', venueCity: 'Springfield', venueState: 'VA',
  guestMode: 'list', guestEstimate: 12, guestCountSource: 'host', totalBudget: 900,
  guests: [{ id: 'g1', name: 'Ada Pine', rsvp: 'Yes' }, { id: 'g2', name: 'Ben Oak', rsvp: 'Maybe' }, { id: 'g3', name: 'Cy Fern', rsvp: '' }],
  vendors: [{ id: 'v1', name: 'Maple Table Catering', category: 'Catering', status: 'Considering', cost: 600, budgetCategory: 'Food' }],
  budget: [{ id: 'food', category: 'Food', budgeted: 600, actual: 0 }],
  timeline: [{ id: 't1', task: 'Confirm final headcount', week: 'This week' }],
};

const boot = async (page, ev, w, h) => {
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.setViewportSize({ width: w, height: h });
  await page.goto('./?elegant=1');
  await settled(page);
  await page.waitForFunction(() => {
    const a = document.querySelector('.hero.elegant .ask');
    return !!a && a.getAnimations().every((x) => x.playState !== 'running');
  }, null, { timeout: 5000 });
};

// The ask's answers: every button inside the question column, above its
// "Other ways" / "Calls to make" links (those are checked by the stat-column
// spec; here it is the answers themselves).
const measure = (page) => page.evaluate(() => {
  const ec = document.querySelector('.hero.elegant .escreen.on > .ecenter');
  const fold = document.querySelector('.hero.elegant > .efold');
  const answers = ec ? [...ec.querySelectorAll('.eanswer button, .eanswer .card')]
    .filter((b) => b.getClientRects().length && !/^(Other ways|Calls to make)/.test((b.textContent || '').trim()))
    .map((b) => ({ text: (b.textContent || '').trim().slice(0, 40), b: Math.round(b.getBoundingClientRect().bottom) })) : [];
  return { vh: innerHeight, fold: fold ? Math.round(fold.getBoundingClientRect().top) : innerHeight, answers };
});

// An iPad is a touch screen: there the title carries its "press and hold to
// rename" tip, a line the pointer layout does not have. Both are checked.
for (const touch of [false, true]) test.describe(touch ? 'touch' : 'pointer', () => {
  test.use({ hasTouch: touch, isMobile: touch });
for (const [kind, ev] of [['a card ask', CARD_ASK], ['a three-answer ask', OPTIONS_ASK]]) {
  for (const [w, h] of [[1024, 768], [1133, 744], [1180, 820]]) {
    test(`${w}x${h}: ${kind} keeps every answer in the first screen`, async ({ page }) => {
      await boot(page, ev, w, h);
      const m = await measure(page);
      expect(m.answers.length, 'the ask offers answers').toBeGreaterThan(0);
      const limit = Math.min(m.vh, m.fold);
      for (const a of m.answers) expect(a.b, `"${a.text}" bottom vs first screen ${limit}`).toBeLessThanOrEqual(limit);
    });
  }
}
  // The fold handle itself is on the first screen (11/25/2026: on touch at
  // 1133x744 it sat at y=759, under the screen, so the limit above silently
  // fell back to innerHeight). Its top must leave at least 28px of it showing;
  // with a mouse at 1024x768 it sits at innerHeight − 32. Run with a mouse and
  // with touch (the describe blocks above).
  for (const [w, h] of [[1024, 768], [1133, 744], [1180, 820]]) {
    test(`${w}x${h}: the fold handle starts on the first screen`, async ({ page }) => {
      await boot(page, CARD_ASK, w, h);
      const m = await measure(page);
      const fold = await page.evaluate(() => {
        const f = document.querySelector('.hero.elegant > .efold');
        if (!f || !f.getClientRects().length) return null;
        const r = f.getBoundingClientRect();
        return { top: Math.round(r.top), bottom: Math.round(r.bottom) };
      });
      expect(fold, 'the board has a fold handle').not.toBeNull();
      expect(fold.top, `fold handle top vs innerHeight ${m.vh}`).toBeLessThanOrEqual(m.vh - 28);
    });
  }
});
