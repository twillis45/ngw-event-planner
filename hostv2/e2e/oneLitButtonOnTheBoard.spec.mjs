// ─── ONE LIT BUTTON ON THE BOARD (owner: "Do those 4", 11/21/2026) ───────────
//
// UX_05 Primary Button: "Maximum ONE primary button per view section." Ruling
// 29 names whose it is on the board: the hero's ask. `oneLitButtonPerSheet`
// walks the sheets only, so the board itself was unguarded, and an EMPTY event
// rendered two lit `.cta`s below the fold at once — the venue card's "Save"
// and the headcount card's "Confirm the headcount" — with the light hero's ask
// as a third, at every size and in both themes.
//
// "Lit" is the same measure `oneLitButtonPerSheet` uses: a rendered control
// whose computed background-image IS the resolved --cta-grad. Counted over the
// FULL board, below the fold included: the board's scroller is walked to its
// end and every lit control seen on the way is collected. Sheets are excluded
// (their own spec owns them).
//
// The rule asserted: nothing outside `.hero` is lit, the hero holds at most
// one lit control, and no scroll stop shows two lit controls at once. In light
// the hero's ask is that one (ruling 29); in dark it wears the soft tier, so
// the dark board shows none.
//
// THE NEXT BAR COUNTS. `.next-bar` (host request 7/16/2026) is the hero ask
// echoed and pinned to the frame bottom once the hero scrolls away. It wore
// --cta-grad, so an empty event showed THREE lit primaries over a scroll
// (hero ask in light, Save, Confirm the headcount, plus the bar), and at
// 860x430 in light the bar and the lit ask shared the screen. It is counted
// like any other board control, outside the hero, so it must not be lit.
// The walk also records whether the bar was seen, so a run that never
// scrolled far enough to show it says so.
//
// Runs on the full project matrix (every geometry, landscape included), on an
// empty event, a plan under way, and four seeded boardMatrix states.
import { test, expect, settled, dateIn } from './fixtures.mjs';

const EMPTY = { id: 'board-lit-empty', name: 'Sam’s Graduation', type: 'Graduation', createdAt: '2026-11-01',
  date: dateIn(30), guests: [], vendors: [], budget: [], timeline: [] };

const UNDER_WAY = {
  id: 'board-lit-underway', name: 'Maya’s 40th Birthday', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(9), startTime: '18:00', startTimeSource: 'host',
  venue: 'The Ironwood Room', venueAddress: '41 Market St, Annapolis, MD', venueCity: 'Annapolis, MD',
  guestMode: 'list', guestEstimate: 14, guestCountSource: 'host',
  guests: [{ id: 'g1', name: 'Jordan Avery', rsvp: 'Yes' }, { id: 'g2', name: 'Riley Park', rsvp: 'Maybe' }],
  vendors: [{ id: 'v-cat', name: 'Harvest Table Catering', category: 'Catering', status: 'Considering', cost: 2400, budgetCategory: 'Food' }],
  budget: [{ id: 'food', category: 'Food', budgeted: 2500, actual: 0 }],
  timeline: [{ id: 't1', task: 'Confirm final headcount with caterer', week: 'This week' }],
};

// Seeded demo events, as boardMatrix boots them (id + optional patch).
const VENUE = { venue: 'The Ironwood Room', venueCity: 'Annapolis, MD' };
// The dinner inside the trip (11/21/2026): its board card's button is soft.
const TRIP = { id: 'board-lit-trip', name: 'Mom’s 80th Birthday', honoree: 'Mom', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(200), endDate: dateIn(203), isDestination: true, destinationBasis: 'travel-language', guestsStayOvernight: true,
  travelMode: 'fly', venueCity: 'Santa Fe', venueState: 'NM', guestMode: 'count', guestEstimate: 30, guestCountSource: 'host',
  celebration: { place: 'adobe courtyard' }, guests: [], vendors: [], budget: [], timeline: [] };
const STATES = [
  { label: 'an empty event', custom: EMPTY },
  { label: 'a plan under way', custom: UNDER_WAY },
  // No budget yet: the hero is the money ask, "Use $2,200" (11/21/2026).
  { label: 'a plan with no budget', custom: { ...UNDER_WAY, id: 'board-lit-nobudget', budget: [], vendors: [] } },
  { label: 'Game Night T-2', id: 'test-two-days', patch: VENUE },
  { label: 'Dinner T-1, vendors', id: 'test-day-before-vendors' },
  { label: 'Wanda far-out', id: 'ev-x-wanda' },
  { label: 'Graduation (past)', id: 'ev-x-graduation' },
  { label: 'a destination trip with its dinner', custom: TRIP },
];

const boot = async (page, state, theme, elegant = '1') => {
  await page.addInitScript(([s, th]) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    if (s.custom) {
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([s.custom]));
      localStorage.setItem('ngw-hostv2-last-event', s.custom.id);
    } else {
      localStorage.setItem('ngw-hostv2-last-event', s.id);
      if (s.patch) localStorage.setItem('ngw-hostv2-patch-' + s.id, JSON.stringify(s.patch));
    }
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-theme', th);
  }, [state, theme]);
  await page.goto(`?elegant=${elegant}&theme=${theme}`);
  await settled(page);
  await page.waitForTimeout(400);
};

// Runs in the page: the lit controls on the board right now (outside sheets),
// each tagged with whether it sits in the hero and whether it is on screen.
const litOnBoard = () => {
  const probe = document.createElement('div');
  probe.style.backgroundImage = 'var(--cta-grad)';
  document.body.appendChild(probe);
  const lit = getComputedStyle(probe).backgroundImage;
  probe.remove();
  const found = [...document.querySelectorAll('button, a, [role="button"]')].filter((e) => {
    if (!e.getClientRects().length || e.closest('.sheet, [inert], [aria-hidden="true"], details:not([open]) > :not(summary)')) return false;
    const cs = getComputedStyle(e);
    return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01 && cs.backgroundImage === lit;
  }).map((e) => {
    const b = e.getBoundingClientRect();
    return {
      label: (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      hero: !!e.closest('.hero'),
      onScreen: b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth,
    };
  });
  return { lit, found };
};

// Walk every scroller on the board (the phone scrolls `.app`, wider frames
// scroll inner columns) from top to bottom, collecting lit controls as it goes.
const walkBoard = async (page) => {
  const seen = new Map();
  const together = [];
  let barSeen = false;
  const take = async () => {
    const r = await page.evaluate(litOnBoard);
    expect(r.lit, 'premise: --cta-grad resolves to a gradient').toMatch(/gradient/);
    if (!barSeen) barSeen = await page.locator('.next-bar').isVisible();
    for (const f of r.found) seen.set(`${f.hero ? 'hero' : 'board'}:${f.label}`, f);
    const onScreen = r.found.filter((f) => f.onScreen);
    if (onScreen.length > 1) together.push(onScreen.map((f) => f.label).join(' + '));
  };
  await take();
  for (let i = 0; i < 40; i++) {
    const moved = await page.evaluate(() => {
      let any = false;
      const scrollers = [document.scrollingElement, ...document.querySelectorAll('*')].filter((el) => {
        if (!el || el.closest('.sheet')) return false;
        const cs = el === document.scrollingElement ? null : getComputedStyle(el);
        if (cs && !/(auto|scroll)/.test(cs.overflowY)) return false;
        return el.scrollHeight - el.clientHeight > 4;
      });
      for (const el of scrollers) {
        const before = el.scrollTop;
        el.scrollTop = Math.min(el.scrollHeight, before + Math.max(200, el.clientHeight * 0.8));
        if (el.scrollTop !== before) any = true;
      }
      return any;
    });
    await page.waitForTimeout(120);
    await take();
    if (!moved) break;
  }
  return { lit: [...seen.values()], together, barSeen };
};

// ?elegant=0, the full board (11/21/2026): the hero's money ask "Use $2,200"
// and the bundle card's "See all 3" below it were both lit. Same rule, and in
// dark its hero ask is unlit like the elegant one (11/22/2026).
for (const elegant of ['1', '0'])
for (const theme of ['light', 'dark'])
for (const state of STATES)
test(`the board shows at most one lit primary, and only in the hero — ${state.label}, ${theme}${elegant === '0' ? ', ?elegant=0' : ''}`, async ({ page }) => {
  test.setTimeout(60_000);
  await boot(page, state, theme, elegant);
  // A hero that proposes a pick (our pick, not yet settled) carries the
  // board's one lit act (owner F1, 11/24/2026: "Go with drop-off catering").
  const heroPick = await page.locator('.hero .decopts .decopt.pick:not([aria-pressed])').count();
  const { lit, together, barSeen } = await walkBoard(page);
  test.info().annotations.push({ type: 'lit', description: JSON.stringify(lit) });
  test.info().annotations.push({ type: 'next-bar seen', description: String(barSeen) });
  expect(lit.filter((f) => !f.hero).map((f) => f.label), 'lit primaries outside the hero (the board\'s lit button is the hero ask)').toEqual([]);
  const heroLit = lit.filter((f) => f.hero).map((f) => f.label);
  expect(heroLit.length, `lit primaries in the hero: ${heroLit.join(' | ')}`).toBeLessThanOrEqual(1);
  // Ruling 31: none lit in dark, `?elegant=0` included (#220 Open, 11/22/2026:
  // the full board's hero card kept its ask lit in dark). In light the hero's
  // ask is the board's one lit button in both modes.
  if (theme === 'dark') expect(heroLit, 'the dark hero ask wears the soft tier (rulings 29, 31)').toEqual([]);
  expect(together, 'two lit controls on screen at once').toEqual([]);
  // TIGHTENED TO ONE (cohesion F1, owner 11/24/2026; UX_11 rule 1). The choice
  // card used to show 0 lit at every width ("Tap one to settle it"), so the
  // board had no lit act at all. In light, our pick is said as the one button.
  if (theme === 'light' && heroPick) expect(heroLit, 'the pick is the board’s one lit button').toEqual([expect.stringMatching(/^Go with /)]);
});

// F1: the lit button settles our pick, the same write as tapping its row.
test('Wanda: "Go with …" under our pick settles it, and the lead says what the rows are', async ({ page }) => {
  test.setTimeout(60_000);
  await boot(page, { id: 'ev-x-wanda' }, 'light');
  const hero = page.locator('.hero .hero-card');
  await expect(hero.locator('.decopts-lead')).toHaveText('Our pick is first. Tap another to choose it instead — nothing else changes.');
  const pickName = (await hero.locator('.decopt.pick .decopt-name').first().innerText()).trim();
  const go = hero.locator('[data-pick-go]');
  await expect(go).toHaveText(`Go with ${pickName.charAt(0).toLowerCase()}${pickName.slice(1)}`);
  // Directly under the pick row.
  expect(await go.evaluate((b) => b.previousElementSibling && b.previousElementSibling.classList.contains('pick'))).toBe(true);
  await go.click();
  await expect(page.locator('.toast, [role="status"]').filter({ hasText: /Decided|Undo|planned|set/i }).first()).toBeVisible();
  await expect(page.locator('.hero').getByText('How is the food handled?', { exact: false })).toHaveCount(0);
});
