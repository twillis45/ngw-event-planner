// ─── THE HONEST FLOOR HAS ONE ACTION ─────────────────────────────────────────
//
// Gold run (GOLD-01, 11/5/2026): an undated event with no venue showed the
// headline "Add the day." over a VENUE editor ("Venue — Name or address —
// Save"). The headline obeys the ruled floor (Figma 922:121: no date ⇒ the ask
// is "Add the day.", the one action "Set the event date"); the card rendered
// queue[0], which was the venue blocker. The two halves of the hero said two
// different things.
import { test, expect, settled } from './fixtures.mjs';

const undated = {
  id: 'e2e-honest-floor', name: 'Wanda’s Retirement & 50th Birthday', type: 'Retirement Party',
  honoree: 'Wanda', guestEstimate: 75, guestCountSource: 'host', guestMode: 'count',
  totalBudget: 5000, budget: [], vendors: [], guests: [],
};

test('no date: the hero card is the date, under "Add the day."', async ({ page }) => {
  await page.addInitScript((ev) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
    localStorage.setItem('ngw-hostv2-last-event', ev.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, undated);
  await page.goto('?elegant=1');
  await settled(page);
  await expect(page.locator('h2.ask').first()).toHaveText(/Add the day\./);
  // The hero is everything between the ask and the progress line.
  const hero = await page.evaluate(() => {
    const t = (document.querySelector('.app') || document.body).innerText.replace(/\s+/g, ' ');
    const a = t.indexOf('Add the day.');
    const b = t.indexOf('plan parts handled', a);
    return a >= 0 && b > a ? t.slice(a, b) : t.slice(a, a + 400);
  });
  expect(hero).not.toMatch(/Name or address/i);
  expect(hero).not.toMatch(/Everything depends on venue/i);
  expect(hero).toMatch(/date/i);
});
