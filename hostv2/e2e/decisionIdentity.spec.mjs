// ─── LAYER-2 DECISION IDENTITY — one card, one subject, at true geometry ─────
//
// PR #70. The defect these probes exist for was invisible to 4,277 unit tests
// and visible in one glance at the running shell: the hero asked "Decide the
// menu.", the record underneath was a snack-quantity line, and the panel under
// THAT offered a food-provider choice the host had already made. Three
// independent derivations of "what is this card about".
//
// Chrome's window minimum bottoms out around 500 CSS px, so a resized desktop
// window CANNOT reach 390. These run under real device geometry instead.
import { test, expect } from './fixtures.mjs';

// The host's own Game Night, exactly as it sits in storage — a real created
// event in 'ngw-events' plus its shell patch. sourcing:'host cooks' is the
// COMPLETED provider decision that used to supply the phantom panel.
const GN_EVENT = {
  id: 'gn', name: 'Game Night', type: 'game night', createdAt: '2026-06-21',
  guestMode: 'count', guestCount: 12, venueKind: 'home', venueCity: 'Atlanta', venueState: 'GA',
  guests: [], vendors: [], timeline: [], budget: [], totalBudget: 600,
};
const GN_PATCH = {
  startTime: '15:00', startTimeSource: 'host', startTimeBasis: 'rule-of-thumb',
  foodChoices: {
    game_type: 'Mixed (fillers + one headliner)', food_model: 'Host provides snacks',
    drinks: 'Add one batch cocktail', sourcing: 'host cooks',
  },
  dietCounts: { Vegetarian: 1 }, sourcing: 'costco',
};

// ── A LOCAL DAY, NOT A UTC ONE (2026-08-06) ────────────────────────────────
// These specs seed the event N days out with `new Date()` + `setDate()`, which
// are LOCAL, and then serialised with `.toISOString()`, which is UTC. West of
// Greenwich that rolls the date forward an extra calendar day once local time
// passes ~20:00 — so "2 days out" silently became 3, the engine picked a
// different top decision, and all 24 runs from this file failed. It passed
// every daytime run and failed at night; the app was never wrong.
// Playwright sets no TZ (jest uses TZ=UTC, which is why only e2e saw it).
const localISO = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const VIEWPORTS = [
  { name: 'mobile 390×844', viewport: { width: 390, height: 844 } },
  { name: 'desktop 1440×900', viewport: { width: 1440, height: 900 } },
];

const bootGameNight = async (page) => {
  const d = new Date(); d.setDate(d.getDate() + 2);
  await page.addInitScript(([ev, patch, iso]) => {
    localStorage.setItem('ngw-events', JSON.stringify([{ ...ev, date: iso }]));
    localStorage.setItem('ngw-hostv2-patch-gn', JSON.stringify(patch));
    localStorage.setItem('ngw-hostv2-last-event', 'gn');
    localStorage.setItem('ngw-v2-splash-seen', '1');
  }, [GN_EVENT, GN_PATCH, localISO(d)]);
};

// The solemn control. NOT the ev-x-repast sample — that one carries a fixed
// past date (2026-07-25) and renders a recap, no hero at all. This is the live
// repast the fix was verified against: 4 days out, 50 by count, church hall,
// and its authored food-provider lever still OPEN — the case where a decision
// panel is exactly right, and must not be collateral damage.
const RP_EVENT = {
  id: 'rp', name: 'Repast for Deacon Willie Hayes', type: 'repast', createdAt: '2026-07-29',
  guestMode: 'count', guestCount: 50, venueKind: 'venue',
  venue: 'Mount Zion Baptist Church — Fellowship Hall',
  guests: [], vendors: [], timeline: [], budget: [],
};
const RP_PATCH = {
  startTime: '15:00', startTimeSource: 'derived', startTimeBasis: 'rule-of-thumb',
  startTimeWhy: 'Most repasts are afternoon gatherings, so we set a 3:00 PM start to plan around — this is a starting point, not your plan. Change it to whatever is true.',
};

const bootRepast = async (page) => {
  const d = new Date(); d.setDate(d.getDate() + 4);
  await page.addInitScript(([ev, patch, iso]) => {
    localStorage.setItem('ngw-events', JSON.stringify([{ ...ev, date: iso }]));
    localStorage.setItem('ngw-hostv2-patch-rp', JSON.stringify(patch));
    localStorage.setItem('ngw-hostv2-last-event', 'rp');
    localStorage.setItem('ngw-v2-splash-seen', '1');
  }, [RP_EVENT, RP_PATCH, localISO(d)]);
};

// What the hero is actually saying, read off the DOM — the ask, the record, and
// whether a decision panel is attached to it.
const readHero = (page) => page.evaluate(() => {
  const card = document.querySelector('.hero-card');
  const h2 = document.querySelector('h2.ask') || document.querySelector('h2');
  const cta = card && card.querySelector('button.cta');
  return {
    ask: h2 ? h2.textContent.trim() : null,
    cardId: card ? card.id : null,
    record: card && card.querySelector('h3') ? card.querySelector('h3').textContent.trim() : null,
    hasPanel: !!(card && card.querySelector('.decopts')),
    options: card ? [...card.querySelectorAll('.decopt-name')].map(n => n.textContent.trim()) : [],
    chosen: card ? [...card.querySelectorAll('.decopt.pick .decopt-name')].map(n => n.textContent.trim()) : [],
    ctaText: cta ? cta.textContent.trim() : null,
    bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    text: card ? card.textContent : '',
  };
});

const MALFORMED = [/\?\?/, /\.\./, /\bundefined\b/, /\bnull\b/, /\bNaN\b/, /\[object Object\]/];

const assertClean = (hero) => {
  const all = [hero.ask, hero.record, hero.ctaText, hero.text].filter(Boolean).join(' • ');
  for (const re of MALFORMED) expect(all, `malformed: ${re}`).not.toMatch(re);
  expect(hero.ask).toBeTruthy();
  expect(hero.ask).not.toBe('?');
  // No horizontal overflow at any width.
  expect(hero.bodyOverflow).toBeLessThanOrEqual(0);
};

for (const { name, viewport } of VIEWPORTS) {
  test.describe(`Game Night — ${name}`, () => {
    test.use({ viewport });

    test('the ask, the record and the panel are about ONE thing', async ({ page }) => {
      const errors = [];
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', e => errors.push(String(e)));

      await bootGameNight(page);
      await page.goto('./');
      await page.waitForSelector('.hero-card', { timeout: 15_000 });
      const hero = await readHero(page);

      // The action is the shopping line it always was.
      expect(hero.cardId).toBe('card-top:operational:p_snacks');
      expect(hero.record).toMatch(/snack servings/i);

      // THE REGRESSION: no menu ask, and no provider panel on a non-decision action.
      expect(hero.ask).not.toMatch(/menu/i);
      expect(hero.hasPanel).toBe(false);
      expect(hero.options).toEqual([]);
      expect(hero.text).not.toMatch(/A caterer handles it|Potluck|We’ll cook it/);

      // The action still has a way to act, and it is the action's own.
      expect(hero.ctaText).toBeTruthy();

      assertClean(hero);
      expect(errors).toEqual([]);
    });

    test('the same identity survives three reloads', async ({ page }) => {
      await bootGameNight(page);
      const seen = [];
      for (let i = 0; i < 3; i++) {
        await page.goto('./');
        await page.waitForSelector('.hero-card', { timeout: 15_000 });
        const h = await readHero(page);
        seen.push(`${h.cardId} | ${h.ask} | panel=${h.hasPanel}`);
      }
      expect(new Set(seen).size, `drifted across reloads: ${JSON.stringify(seen, null, 1)}`).toBe(1);
      expect(seen[0]).toContain('card-top:operational:p_snacks');
      expect(seen[0]).toContain('panel=false');
    });
  });

  test.describe(`Solemn repast — ${name}`, () => {
    test.use({ viewport });

    test('a real open decision still renders, aligned with its ask', async ({ page }) => {
      const errors = [];
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', e => errors.push(String(e)));

      await bootRepast(page);
      await page.goto('./');
      await page.waitForSelector('.hero-card', { timeout: 15_000 });
      const hero = await readHero(page);

      // The repast's food-provider lever is genuinely open — the panel belongs here.
      expect(hero.ask).toMatch(/who provides the food/i);
      expect(hero.hasPanel).toBe(true);
      expect(hero.options.join(' • ')).toMatch(/church|repast committee/i);

      // No blame grammar on a solemn day.
      expect(hero.text).not.toMatch(/past its easy window|past its window|overdue|behind/i);

      assertClean(hero);
      expect(errors).toEqual([]);
    });
  });
}
