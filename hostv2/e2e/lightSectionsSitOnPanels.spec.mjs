// ─── IN LIGHT, EVERY SECTION SITS ON A PANEL (owner ruling 25, 11/21/2026) ───
//
// Doctrine 02, ruling 25 ("W1"): the light canvas is warm, and each distinct
// block of a screen or sheet sits on a white --card panel with a --line edge
// and a soft shadow, so sections read as separate objects. A sheet's ground is
// the page (--bg), not the panel.
//
// Measured, not looked at. For each listed block: its background is --card,
// its border is --line and at least 1px, and the ground around it is a
// different color. On the sheets, every visible block under the head is a
// panel (or a vendor card, already its own object), so a section added later
// that skips the panel fails here without anyone having to list it.
//
// Dark keeps today's look; the last test holds it to that.
import { test, expect, openSectionByName, dateIn } from './fixtures.mjs';

const EVENT = {
  id: 'panels-ev', name: 'Maya’s 40th Birthday', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(9), startTime: '18:00', startTimeSource: 'host',
  venue: 'The Ironwood Room', venueAddress: '41 Market St, Annapolis, MD', venueCity: 'Annapolis, MD',
  hostName: 'Casey Morgan', guestMode: 'list', guestEstimate: 14, guestCountSource: 'host',
  guests: [{ id: 'g1', name: 'Jordan Avery', rsvp: 'Yes' }, { id: 'g2', name: 'Riley Park', rsvp: 'Yes', allergens: ['Peanut'] }],
  vendors: [
    { id: 'v-cat', name: 'Harvest Table Catering', category: 'Catering', status: 'Considering', phone: '(410) 555-0142', cost: 2400, budgetCategory: 'Food' },
    { id: 'v-dj', name: 'Night Shift DJ', category: 'DJ', status: 'Deposit Paid', cost: 900, depositAmt: 300, depositPaid: true, contractSigned: true },
  ],
  budget: [{ id: 'food', category: 'Food', budgeted: 2500, actual: 0 }, { id: 'music', category: 'Music', budgeted: 1000, actual: 300 }],
  timeline: [{ id: 't1', task: 'Confirm final headcount with caterer', week: 'This week' }],
};

const boot = async (page, theme) => {
  await page.addInitScript(([e, th]) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-theme', th);
  }, [EVENT, theme]);
  await page.goto('?elegant=1');
  await expect(page.locator('.app')).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(1200);
};

// Runs in the page: one row per element `sel` matches (visible ones only), with
// its own fill, its edge, and the opaque ground of its parent.
const probe = (sel) => {
  const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const tok = (name) => {
    const d = document.createElement('div'); d.style.color = `var(${name})`; document.body.appendChild(d);
    const c = getComputedStyle(d).color; d.remove(); return c;
  };
  const groundOf = (el) => {
    for (let n = el.parentElement; n; n = n.parentElement) {
      const b = rgb(getComputedStyle(n).backgroundColor);
      if (b.length >= 3 && (b[3] === undefined || b[3] === 1)) return `rgb(${b[0]}, ${b[1]}, ${b[2]})`;
    }
    return 'rgb(255, 255, 255)';
  };
  const card = tok('--card'); const line = tok('--line');
  return [...document.querySelectorAll(sel)].filter((el) => {
    const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  }).map((el) => {
    const cs = getComputedStyle(el);
    return {
      what: `${el.tagName.toLowerCase()}.${String(el.className).split(' ').join('.')} "${(el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40)}"`,
      bg: cs.backgroundColor, border: cs.borderTopColor, width: parseFloat(cs.borderTopWidth),
      ground: groundOf(el), card, line,
    };
  });
};

const onAPanel = (rows, where) => {
  for (const r of rows) {
    expect.soft(r.bg, `${where}: ${r.what} fills with --card`).toBe(r.card);
    expect.soft(r.border, `${where}: ${r.what} is edged with --line`).toBe(r.line);
    expect.soft(r.width, `${where}: ${r.what} edge is at least 1px`).toBeGreaterThanOrEqual(1);
    expect.soft(r.ground, `${where}: ${r.what} stands off its ground`).not.toBe(r.card);
  }
};

// Everything under a sheet's head is a panel, or a vendor card (its own object).
const SHEET_BLOCKS = '.sheet-body > :not(.sheet-head):not(datalist)';

const SHEETS = ['Your money', 'The spread & shopping', 'Your checklist', 'People you’re hiring', 'Space, seats', 'Guests'];

test('light: the board\'s below-fold blocks and the pick sit on white panels', async ({ page }) => {
  await boot(page, 'light');
  // The fold opens on a phone; at the rail widths the blocks are already out.
  const fold = page.locator('.efold');
  if (await fold.isVisible().catch(() => false)) { await fold.click(); await page.waitForTimeout(700); }
  const rows = await page.evaluate(probe, '.hero.elegant .then-fold, .hero.elegant .ef-watch, .hero.elegant .bento, [data-who-confirmed]');
  const names = rows.map((r) => r.what).join('\n');
  for (const want of ['then-fold', 'ef-watch', 'bento', 'section.who-confirmed']) expect(names, `premise: ${want} was measured`).toContain(want);
  onAPanel(rows, 'board');
  // The pick is on white (its steel edge stays: it is the selected option).
  const pick = await page.evaluate(probe, '.decopt.pick');
  expect(pick.length, 'premise: the board shows its pick').toBeGreaterThan(0);
  for (const r of pick) expect(r.bg, `board: ${r.what} is on white`).toBe(r.card);
});

test('light: every section of the money, shopping, checklist, People, Space and Guests sheets sits on a panel', async ({ page }) => {
  await boot(page, 'light');
  for (const name of SHEETS) {
    await openSectionByName(page, name, { settle: 1200 });
    const ground = await page.evaluate(() => {
      const d = document.createElement('div'); d.style.color = 'var(--bg)'; document.body.appendChild(d);
      const bg = getComputedStyle(d).color; d.remove();
      return { sheet: getComputedStyle(document.querySelector('.sheet')).backgroundColor, bg };
    });
    expect(ground.sheet, `${name}: the sheet's ground is --bg`).toBe(ground.bg);
    const rows = (await page.evaluate(probe, SHEET_BLOCKS))
      // The Plan / Shop switch is the sheet's own control, like its head.
      .filter((r) => !/\.fmodes\b/.test(r.what));
    expect(rows.length, `premise: ${name} has blocks under its head`).toBeGreaterThan(0);
    for (const r of rows) expect.soft(/\.(panel|vcard)\b/.test(r.what), `${name}: ${r.what} sits on a panel`).toBe(true);
    onAPanel(rows, name);
  }
});

test('dark keeps today\'s look: no panels, the sheet on --card, no panel shadow', async ({ page }) => {
  await boot(page, 'dark');
  await openSectionByName(page, 'Your money', { settle: 1000 });
  expect(await page.locator('.panel').count()).toBe(0);
  const s = await page.evaluate(() => {
    const d = document.createElement('div'); d.style.color = 'var(--card)'; document.body.appendChild(d);
    const card = getComputedStyle(d).color; d.remove();
    return { sheet: getComputedStyle(document.querySelector('.sheet')).backgroundColor, card,
      shadow: getComputedStyle(document.documentElement).getPropertyValue('--panel-shadow').trim() };
  });
  expect(s.sheet).toBe(s.card);
  expect(s.shadow).toBe('none');
});
