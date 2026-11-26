// ─── SETTLED = GREEN, ONE RULE (owner-approved render 5, 11/24/2026) ────────
//
// Every status value on a sheet row (the right-hand summary: "all set",
// "noted · 2 flagged", "Grocery · one-stop", "covered", a bringer's name) is
// read by ONE reader (lib/rowStatus) that says settled, open or overdue, and
// the color comes from that answer alone: settled is the existing --ok green,
// open stays neutral, overdue is the existing --warn amber.
//
// Before this, each row decided its own color inline, and "How it's sourced"
// never went green even when the host had picked a tier herself.
//
// The sweep: a plan where every food row is settled, and a plan where none is.
// Every row value carries the reader's answer, a settled value is never
// neutral, and an open one is never green.
import { test, expect, settled, dateIn, openSectionByName, sheetSettled } from './fixtures.mjs';

const ALL_SET = {
  hosting_model: 'Host cooks the turkey and core dishes, guests bring sides and desserts',
  turkey_method: 'Roasted in the oven',
  dietary_table: 'Nobody — the traditional menu works for everyone',
  drinks: 'Wine with dinner, sparkling cider for everyone', // Thanksgiving asks since 11/26/2026
  service_style: 'Sit-down — everyone at the table',
  serve_time: 'Late afternoon, around 4 or 5',
  overnight_guests: 'No — everyone is local',
};
const NAMED = Object.fromEntries(['p_potatoes', 'p_cranberry', 'p_green_beans', 'p_sweet_potatoes', 'p_mac', 'p_corn',
  'p_roast_veg', 'p_pies'].map((k, i) => [k, 'Guest ' + (i + 1)]));
const seed = (id, extra) => ({
  id, name: 'Our Thanksgiving', type: 'Thanksgiving Hosting', date: dateIn(20), startTime: '16:00', startTimeSource: 'host',
  venue: 'Home', venueKind: 'home', venueAddress: '12 Oak St, Austin, TX', venueCity: 'Austin, TX',
  guestMode: 'list', guestEstimate: 12, guestCountSource: 'host', totalBudget: 60000,
  guests: Array.from({ length: 12 }, (_, i) => ({ id: 'g' + i, name: 'Guest ' + (i + 1), rsvp: 'Yes' })),
  budget: [], vendors: [], timeline: [], createdAt: new Date().toISOString(),
  ...extra,
});
const boot = async (page, ev) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.goto('?elegant=1');
  await settled(page);
};

// Every row value in the open sheet: its label, the reader's answer, its color,
// and the two token colors resolved on the same element.
const readValues = (page) => page.evaluate(() => {
  const sh = [...document.querySelectorAll('.sheet')].pop();
  const probe = (v) => { const s = document.createElement('span'); s.style.color = v; document.body.appendChild(s); const c = getComputedStyle(s).color; s.remove(); return c; };
  const ok = probe('var(--ok)'); const warn = probe('var(--warn)');
  return [...sh.querySelectorAll('.fstat-v')].filter((v) => v.offsetParent).map((v) => {
    const row = v.closest('.fstat');
    const label = ((row && row.querySelector('.fstat-l')) || {}).innerText || '';
    return { label: label.trim(), text: v.innerText.replace(/\s+/g, ' ').trim(), status: v.getAttribute('data-status'), color: getComputedStyle(v).color, ok, warn };
  });
});
// The spread's rows, wherever they are: one page, or (before 11/24) three tabs.
const sweepSpread = async (page) => {
  const seen = [];
  const tabs = page.locator('.sheet .fmodes [role="tab"]');
  const n = await tabs.count();
  if (!n) {
    // One page (11/24/2026): finished sections are one green row; open them
    // so their rows are read too.
    const folds = page.locator('.sheet').last().locator('[data-done-fold]');
    for (let k = 0; k < 10 && await folds.count(); k++) { await folds.first().click(); await page.waitForTimeout(200); }
    return readValues(page);
  }
  for (let i = 0; i < n; i++) {
    await tabs.nth(i).click();
    await page.waitForTimeout(300);
    seen.push(...await readValues(page));
  }
  return seen;
};

test('a plan with every food row settled: every row value is green, and says settled', async ({ page }) => {
  await boot(page, seed('e2e-settled-green', { foodChoices: ALL_SET, dietaryNoted: true, sourcing: 'grocery', foodOwner: NAMED }));
  await openSectionByName(page, /spread/i);
  await sheetSettled(page);
  const vals = await sweepSpread(page);
  const labels = vals.map((v) => v.label);
  // The rows the render names are all here.
  // Every choice settled, Your choices is the one green "Choices set" row
  // (one food page, 11/24/2026); its rows are read once it is reopened.
  const set = page.locator('.sheet').last().locator('[data-food-section="choices"] [data-done-fold]');
  if (await set.count()) {
    await set.click();
    await page.waitForTimeout(300);
    vals.push(...(await readValues(page)).filter((v) => !vals.some((w) => w.label === v.label && w.text === v.text)));
    labels.push(...vals.map((v) => v.label));
  }
  for (const want of ['Menu', 'Dietary needs', 'How it’s sourced']) expect(labels, `rows: ${labels.join(' | ')}`).toContain(want);
  // Settled here: the three choices rows, and each brought dish with its
  // bringer's name on it.
  const SETTLED = new Set(['Menu', 'Dietary needs', 'How it’s sourced']);
  const settledRows = vals.filter((v) => SETTLED.has(v.label) || /^Guest \d+$/.test(v.text));
  expect(settledRows.length, vals.map((v) => `${v.label}=${v.text}`).join(' | ')).toBeGreaterThan(8);
  for (const v of settledRows) {
    expect(v.status, `${v.label}: "${v.text}" carries the reader's answer`).toBe('settled');
    expect(v.color, `${v.label}: "${v.text}" is settled, so it is --ok, never neutral`).toBe(v.ok);
  }
  // And the one rule holds for every other row on the page.
  for (const v of vals) {
    expect(['settled', 'open', 'overdue'], `${v.label}: "${v.text}"`).toContain(v.status);
    if (v.status === 'settled') expect(v.color, `${v.label}: "${v.text}"`).toBe(v.ok);
    else expect(v.color, `${v.label}: "${v.text}"`).not.toBe(v.ok);
  }
});

test('a plan with nothing settled: no row value is green', async ({ page }) => {
  await boot(page, seed('e2e-settled-open', {}));
  await openSectionByName(page, /spread/i);
  await sheetSettled(page);
  const vals = await sweepSpread(page);
  expect(vals.length).toBeGreaterThan(2);
  for (const v of vals) {
    expect(['settled', 'open', 'overdue'], `${v.label}: "${v.text}"`).toContain(v.status);
    if (v.status !== 'settled') expect(v.color, `${v.label}: "${v.text}" is ${v.status}, so it is not green`).not.toBe(v.ok);
    if (v.status === 'overdue') expect(v.color).toBe(v.warn);
  }
  const by = Object.fromEntries(vals.map((v) => [v.label, v.status]));
  expect(by['Menu']).toBe('open');
  expect(by['Dietary needs']).toBe('open');
  expect(by['How it’s sourced']).toBe('open');
});

test('the space sheet: a covered piece of gear is settled and green, one still needed is open', async ({ page }) => {
  const CHAIRS = 'extra chairs + a table leaf or folding table';
  await boot(page, seed('e2e-settled-space', {
    capacityHave: { [CHAIRS]: 99 }, capacityQty: { [CHAIRS]: 0 }, capacityOwned: { [CHAIRS]: true },
  }));
  await openSectionByName(page, /Space, seats/i);
  await sheetSettled(page);
  const before = await readValues(page);
  const covered = before.filter((v) => /^covered/.test(v.text));
  expect(covered.length, before.map((v) => `${v.label}=${v.text}`).join(' | ')).toBeGreaterThan(0);
  for (const v of covered) expect(v.status).toBe('settled');
  expect(before.some((v) => v.status === 'open')).toBe(true);
  for (const v of before) expect(['settled', 'open', 'overdue'], `${v.label}: "${v.text}"`).toContain(v.status);
  for (const v of before) if (v.status === 'settled') expect(v.color).toBe(v.ok); else expect(v.color).not.toBe(v.ok);
});
