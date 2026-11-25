// ─── ONE LIT BUTTON ON THE DAY (owner ruling 31 extended, 11/22/2026) ───────
//
// Owner, verbatim: "One lit button on the day". Audit 2 lane F P2-1: The Day
// on a Group Trip lit both "Yes, pencil them in" (the start-time proposal) and
// "Done — next" (the walk-through) at once. While the day has no clock the
// proposal is the one act; the walk-through steps down to the soft tier.
//
// "Lit" is the measure the board and sheet specs use: a rendered control whose
// computed background-image IS the resolved --cta-grad.
import { test, expect, settled, dateIn, goToStage } from './fixtures.mjs';

const UNTIMED = [
  { id: 'day-lit-trip', name: 'Lake weekend', type: 'Group Trip', createdAt: '2026-11-01', date: dateIn(10), endDate: dateIn(13),
    guestMode: 'count', guestCount: 8, guests: [], vendors: [], budget: [], timeline: [] },
  { id: 'day-lit-bday', name: 'Maya’s 40th', type: 'Birthday', createdAt: '2026-11-01', date: dateIn(10),
    venue: 'The Ironwood Room', venueCity: 'Annapolis, MD', guestMode: 'count', guestCount: 20, guests: [], vendors: [], budget: [], timeline: [] },
];

const litOnScreen = () => {
  const probe = document.createElement('div');
  probe.style.backgroundImage = 'var(--cta-grad)';
  document.body.appendChild(probe);
  const lit = getComputedStyle(probe).backgroundImage;
  probe.remove();
  return [...document.querySelectorAll('button, a, [role="button"]')].filter((e) => {
    if (!e.getClientRects().length || e.closest('[inert], [aria-hidden="true"]')) return false;
    const cs = getComputedStyle(e); const b = e.getBoundingClientRect();
    return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01 && cs.backgroundImage === lit
      && b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth;
  }).map((e) => (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40));
};

for (const ev of UNTIMED) {
  for (const theme of ['light', 'dark']) {
    test(`The Day lights one button — ${ev.type}, ${theme}`, async ({ page }) => {
      await page.addInitScript(([e, th]) => {
        if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
        localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
        localStorage.setItem('ngw-hostv2-last-event', e.id);
        localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
        localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
        localStorage.setItem('ngw-theme', th);
      }, [ev, theme]);
      await page.goto(`?elegant=1&theme=${theme}`);
      await settled(page);
      await goToStage(page, 'The Day');
      await settled(page);
      await page.waitForTimeout(500);
      // Premise: the untimed day offers to pencil the times.
      await expect(page.getByRole('button', { name: /pencil/i }).first()).toBeVisible();
      // Every scroll stop of The Day: never two lit at once.
      for (let i = 0; i < 6; i++) {
        const lit = await page.evaluate(litOnScreen);
        expect(lit.length, `lit at once: ${lit.join(' | ')}`).toBeLessThanOrEqual(1);
        await page.mouse.wheel(0, 500); await page.waitForTimeout(250);
      }
    });
  }
}

// ─── EVERY STAGE AROUND THE DAY HAS ITS ONE LIT ACTION (UX_11 rule 1, ────────
// cohesion batch A, 11/24/2026)
//
// Owner-approved cohesion audit, P1 #2: on the event day the board had no lit
// action at all (lit = 0), only about ten equal buttons ("See all 5", "Run
// the day", "Open your guest list", "Mark done", "Draft the details", "Draft a
// reconfirm for each"…). P1 #11: After lit three ("Save it", "Publish the
// recap", "Draft the thank-you").
//
// Rule 1: one lit, primary action per screen, and it moves as the state
// changes. Walked top to bottom, each stage the host meets around her day —
// the board on the day, The Day on the day and The Day's walkthrough the day
// before — shows exactly one lit control in light, and
// never two at once in either theme (ruling 31 keeps dark's asks soft).
import { EVENTS as AROUND, MOMENTS, boot as bootAt, openStage } from './theDayStageFixture.mjs';

const litAll = () => {
  const probe = document.createElement('div');
  probe.style.backgroundImage = 'var(--cta-grad)';
  document.body.appendChild(probe);
  const lit = getComputedStyle(probe).backgroundImage;
  probe.remove();
  return [...document.querySelectorAll('button, a, [role="button"]')].filter((e) => {
    if (!e.getClientRects().length || e.closest('.sheet, [inert], [aria-hidden="true"], details:not([open]) > :not(summary)')) return false;
    const cs = getComputedStyle(e);
    return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01 && cs.backgroundImage === lit;
  }).map((e) => {
    const b = e.getBoundingClientRect();
    return { label: (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      onScreen: b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth };
  });
};

const walkStage = async (page) => {
  const seen = new Set(); const together = [];
  const take = async () => {
    const found = await page.evaluate(litAll);
    for (const f of found) seen.add(f.label);
    const on = found.filter((f) => f.onScreen);
    if (on.length > 1) together.push(on.map((f) => f.label).join(' + '));
  };
  await take();
  for (let i = 0; i < 40; i++) {
    const moved = await page.evaluate(() => {
      let any = false;
      for (const el of [document.scrollingElement, ...document.querySelectorAll('*')]) {
        if (!el || el.closest('.sheet')) continue;
        const cs = el === document.scrollingElement ? null : getComputedStyle(el);
        if (cs && !/(auto|scroll)/.test(cs.overflowY)) continue;
        if (el.scrollHeight - el.clientHeight <= 4) continue;
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
  return { lit: [...seen], together };
};

const SCREENS = [
  { label: 'the board on the day', stage: 'Plan', at: MOMENTS.dayBeforeFirstCue },
  { label: 'The Day on the day', stage: 'The Day', at: MOMENTS.during },
  { label: 'The Day the day before', stage: 'The Day', at: MOMENTS.dayBefore },
  // After is NOT here yet. Measured 11/24/2026 it lights three ("Save it",
  // "Publish the recap", "Draft the thank-you"; audit P1 #11, batch E). Which
  // one stays lit is a design change the owner approves from renders first;
  // its row joins this list in the same change that fixes it.
];

for (const ev of AROUND)
for (const sc of SCREENS)
for (const theme of ['light', 'dark'])
test(`one lit action — ${sc.label}, ${ev.label}, ${theme}`, async ({ page }) => {
  test.setTimeout(60_000);
  await bootAt(page, ev, sc.at, theme);
  await openStage(page, sc.stage);
  const { lit, together } = await walkStage(page);
  test.info().annotations.push({ type: 'lit', description: JSON.stringify(lit) });
  expect(together, 'two lit controls on screen at once').toEqual([]);
  if (theme === 'light') expect(lit, 'exactly one lit action on this stage').toHaveLength(1);
  else expect(lit.length, `lit in dark: ${lit.join(' | ')}`).toBeLessThanOrEqual(1);
});
