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
