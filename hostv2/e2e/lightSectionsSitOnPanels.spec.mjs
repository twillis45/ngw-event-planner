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
import { test, expect, openSectionByName, dateIn, goToStage } from './fixtures.mjs';

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
  // ── A TALL IPAD'S TWO LISTS ARE ROWS, NOT BOXES (owner, 11/22/2026) ──────
  // The tall-iPad package ruled that "Worth having a plan for" and "Who's
  // confirmed" share one treatment there: full-width hairline rows with no
  // card or box. Ruling 25's panels hold for every other block; those two
  // are held to the newer ruling instead — no fill, and rows edged with --line-soft.
  // The tall board is [data-tall="1"] (the 13" keeps it with the rail and no
  // bar since owner ruling 8; a phone's pill is a bar but not a tall board).
  if (await page.locator('.stagewrap[data-tall="1"]').count()) {
    const isRowList = (r) => /ef-watch|who-confirmed/.test(r.what);
    onAPanel(rows.filter((r) => !isRowList(r)), 'board');
    for (const r of rows.filter(isRowList)) expect.soft(r.bg, `tall board: ${r.what} has no box`).toBe('rgba(0, 0, 0, 0)');
    const edges = await page.evaluate(() => {
      const tok = (n) => { const d = document.createElement('div'); d.style.color = `var(${n})`; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; };
      const soft = tok('--line-soft');
      return [...document.querySelectorAll('.ef-watch .watch-row, [data-who-row]')].map((e) => getComputedStyle(e).borderTopColor === soft && parseFloat(getComputedStyle(e).borderTopWidth) >= 1);
    });
    expect(edges.length, 'premise: the tall board has row lists').toBeGreaterThan(0);
    expect(edges.every(Boolean), 'every row is edged with --line-soft').toBe(true);
  } else {
    onAPanel(rows, 'board');
  }
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

// ── PARITY IN DARK (owner, 11/22/2026: "We may want to have screen section
// panel parity from the light theme in the dark theme too") ────────────────
// Supersedes "dark keeps today's look": dark sections render on the same
// panels as light. Counted by what is painted, not by class: a raised block
// is one whose fill differs from the ground around it, with a radius of at
// least 10px, at least 60% of the sheet's width and 80px tall. Each sheet and
// The Day must show the same count in both themes. Dark's canvas does not
// move: a dark sheet's ground becomes the canvas (--bg) and its panels the
// raised --card it already had.
const raised = (scopeSel) => {
  const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const scope = [...document.querySelectorAll(scopeSel)].pop();
  if (!scope) return -1;
  const sw = scope.getBoundingClientRect().width;
  const groundOf = (el) => {
    for (let n = el.parentElement; n; n = n.parentElement) {
      const b = rgb(getComputedStyle(n).backgroundColor);
      if (b.length >= 3 && (b[3] === undefined || b[3] === 1)) return b.slice(0, 3).join(',');
    }
    return '255,255,255';
  };
  let n = 0;
  for (const el of scope.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width < sw * 0.6 || r.height < 80) continue;
    const cs = getComputedStyle(el);
    let b = rgb(cs.backgroundColor);
    // The Day's panel is the carbon panel GRADIENT: its first opaque stop is its fill.
    if ((b.length < 3 || b[3] === 0) && /gradient/.test(cs.backgroundImage)) {
      const stop = (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(rgb).find((x) => x[3] === undefined || x[3] === 1);
      if (stop) b = stop;
    }
    if (parseFloat(cs.borderTopLeftRadius) < 10) continue;
    const filled = b.length >= 3 && (b[3] === undefined || b[3] === 1) && b.slice(0, 3).join(',') !== groundOf(el);
    // or an edged card on the ground (The Day's .dayof-card: a --line edge, no fill)
    const edge = rgb(cs.borderTopColor);
    const edged = parseFloat(cs.borderTopWidth) >= 1 && edge.length >= 3 && (edge[3] === undefined || edge[3] > 0);
    if (filled || edged) n++;
  }
  return n;
};

const PARITY = ['Your money', 'The spread & shopping', 'Your checklist', 'People you’re hiring', 'Space, seats', 'Guests'];

test('dark sits its sections on the same panels as light, and The Day too', async ({ browser }, info) => {
  test.skip(info.project.name !== 'mobile', 'pins its own 390 contexts; one run is the whole check');
  test.setTimeout(120_000);
  const counts = {};
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await boot(page, theme);
    for (const name of PARITY) {
      await openSectionByName(page, name, { settle: 1200 });
      counts[`${name} (${theme})`] = await page.evaluate(raised, '.sheet');
    }
    if (await page.locator('.sheet').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
    // The phase through the shared door (the phone's pill since owner ruling 4, 11/23/2026).
    await goToStage(page, 'The Day');
    await page.waitForTimeout(1200);
    counts[`The Day (${theme})`] = await page.evaluate(raised, '.day-sec');
    await ctx.close();
  }
  console.log(counts);
  const off = [...PARITY, 'The Day'].filter((n) => counts[`${n} (light)`] !== counts[`${n} (dark)`])
    .map((n) => `${n}: light ${counts[`${n} (light)`]}, dark ${counts[`${n} (dark)`]}`);
  for (const n of PARITY) expect(counts[`${n} (light)`], `premise: ${n} has panels in light`).toBeGreaterThan(0);
  expect(off).toEqual([]);
});

test('on the day, The Day shows the same panels in both themes', async ({ browser }, info) => {
  test.skip(info.project.name !== 'mobile', 'pins its own 390 contexts; one run is the whole check');
  test.setTimeout(90_000);
  const counts = {};
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date(EVENT.date + 'T15:00:00'));
    await boot(page, theme);
    // The phase through the shared door (the phone's pill since owner ruling 4, 11/23/2026).
    await goToStage(page, 'The Day');
    await page.waitForTimeout(1200);
    counts[`The Day (${theme})`] = await page.evaluate(raised, '.day-sec');
    await ctx.close();
  }
  console.log(counts);
  expect(counts['The Day (light)'], 'premise: The Day has a panel on the day').toBeGreaterThan(0);
  expect(counts['The Day (dark)']).toBe(counts['The Day (light)']);
});

test('dark: its sheet ground is the canvas and its panels are the raised --card', async ({ page }) => {
  await boot(page, 'dark');
  await openSectionByName(page, 'Your money', { settle: 1000 });
  expect(await page.locator('.sheet .panel').count()).toBeGreaterThan(0);
  const s = await page.evaluate(() => {
    const tok = (n) => { const d = document.createElement('div'); d.style.color = `var(${n})`; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; };
    return { sheet: getComputedStyle(document.querySelector('.sheet')).backgroundColor, bg: tok('--bg'), card: tok('--card'),
      panel: getComputedStyle(document.querySelector('.sheet .panel')).backgroundColor };
  });
  expect(s.sheet).toBe(s.bg);
  expect(s.panel).toBe(s.card);
});

// ONE PANEL PADDING (audit 2 lane F P2-5, 11/22/2026). The Day's day-of card
// (.dayof-card) has a --line edge and no padding, so its text sat 1px inside
// the edge in both themes (measured on the built bundle). Every edged or filled
// block on The Day keeps its text at least 8px off its own edge.
test('The Day keeps its text off every panel edge, in both themes', async ({ browser }, info) => {
  test.skip(info.project.name !== 'mobile', 'pins its own 390 contexts; one run is the whole check');
  test.setTimeout(90_000);
  const tight = [];
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await boot(page, theme);
    // The phase through the shared door (the phone's pill since owner ruling 4, 11/23/2026).
    await goToStage(page, 'The Day');
    await page.waitForTimeout(1200);
    const rows = await page.evaluate(() => {
      const out = [];
      const sec = document.querySelector('.day-sec');
      if (!sec) return ['no .day-sec'];
      for (const el of sec.querySelectorAll('*')) {
        const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
        if (r.width < 100 || r.height < 20) continue;
        const filled = cs.backgroundImage !== 'none' || !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor);
        const edged = parseFloat(cs.borderLeftWidth) > 0 && !/rgba\(0, 0, 0, 0\)/.test(cs.borderLeftColor);
        if (!filled && !edged) continue;
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; let inset = Infinity;
        while ((n = w.nextNode())) {
          if (!n.textContent.trim()) continue;
          const rg = document.createRange(); rg.selectNodeContents(n);
          for (const q of rg.getClientRects()) if (q.width > 0) inset = Math.min(inset, q.left - r.left);
        }
        if (inset < 8) out.push(`${String(el.className || el.tagName)} text ${inset.toFixed(1)}px from its edge`);
      }
      return out;
    });
    tight.push(...rows.map((x) => `${theme}: ${x}`));
    await ctx.close();
  }
  expect(tight).toEqual([]);
});
