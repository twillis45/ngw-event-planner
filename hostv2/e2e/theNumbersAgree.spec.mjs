// ─── THE NUMBERS AGREE (UX_11 rule 12; cohesion audit batch C, 11/24/2026) ───
//
// "One source per number; screens agree. Each count or amount is read from one
// place, so the board, the sheets and the money never disagree. 'All clear'
// only when nothing is open."
//
// The audit of 11/24/2026 found the same fact printed as two numbers a tap
// apart, each true of a different set under the same words:
//   #4  the board's "Open the spread (31 items)" and The Day's "37 items still
//       to get" (the day count added the rentals, which are not on the list);
//   #5  Your money's "$4,380 left to spend" beside "$3,410 not yet spoken for";
//   #6  "17 of 17 · Everyone's in a seat", in green, on a 75-guest plan;
//   #19 "Who's helping · 3" over six helper rows, and "Helpers 0 of 6" on the
//       board;
//   #20 "4 vendors are still unpriced" when two are friends helping, not hired.
//
// This spec is the rule, not those five strings. It reads every screen a host
// can reach on the richest sample (Wanda's, ev-x-wanda) at two moments (two
// weeks out and the day itself) and on a host's own plan, then checks:
//   1. items — every "Open the spread (N items)" is the spread's own list size;
//      every "N items still to get" / "N items to get" is what the spread has
//      not bought yet;
//   2. money — every "$X spoken for" on a screen is one figure; every
//      "$X expected" is one figure; one budget figure; no "left to spend",
//      which reads as the budget's room and is not;
//   3. seats — a "has a seat" / "in a seat" claim only when the seated count
//      reaches the headcount the plan is planned around;
//   4. helpers — every helper count (the board's "Helpers x of N", its
//      "Confirm N helpers", Space's "Who's helping · N") is one count;
//   5. vendors — "N vendors are still unpriced" never counts more vendors than
//      the hiring screen counts as hired (exact reader pinned in jest);
//   6. lit buttons — a lit (primary) button that carries a $ figure or a count
//      names a figure the text around it also names (PR #252's rule, made
//      general: she never taps a number the screen hasn't explained).
// Violations are collected across every screen and asserted once, so a red run
// lists all of them.
import { test, expect, settled, sheetSettled, openSectionByName, goToStage, openWhatsCounted, dateIn } from './fixtures.mjs';

const SECTIONS = ['The spread & shopping', 'Your money', 'Who sits where', 'Space, seats & helpers', 'Your checklist', 'People you’re hiring'];

const bootSample = async (page) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('__seeded')) return;
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
    sessionStorage.setItem('__seeded', '1');
  });
  await page.goto('?elegant=1');
  await settled(page);
};

// A host's own plan (made-up names and places): a budget, a hired caterer, a
// friend on the vendor list, a short roster under a bigger planned count.
const OWN = {
  id: 'numbers-agree', name: 'Jordan’s 40th Birthday', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(12), startTime: '18:00', startTimeSource: 'host',
  venue: 'Elm Court Hall', venueAddress: '42 Elm Ct, Springfield, VA 22150', venueCity: 'Springfield, VA',
  guestMode: 'list', guestEstimate: 30, guestCountSource: 'host',
  guests: [
    { id: 'g1', name: 'Avery Lane', rsvp: 'Yes', table: 1 },
    { id: 'g2', name: 'Riley Stone', rsvp: 'Yes', table: 1 },
    { id: 'g3', name: 'Morgan Vale', rsvp: 'Maybe' },
  ],
  tables: 4,
  vendors: [
    { id: 'v-cat', name: 'Maple Table Catering', category: 'Catering', status: 'Considering', phone: '(703) 555-0142', budgetCategory: 'Food' },
    { id: 'v-pal', name: 'Casey Brooks', category: 'Other', status: 'Considering', isInformal: true },
  ],
  budget: [{ id: 'food', category: 'Food', budgeted: 1500, actual: 0 }],
  timeline: [
    { id: 't1', task: 'Pick up the cake', owner: 'Casey Brooks', week: 'This week' },
    { id: 't2', task: 'Confirm final headcount with caterer', week: 'This week' },
  ],
};
// The owner's live report behind PR #252 (11/24/2026): a new Thanksgiving for
// 12 read "$300" and "about $334", and the lit button said "Use $400".
const THANKSGIVING = {
  id: 'numbers-agree-tg', name: 'Thanksgiving at the Lanes', type: 'Thanksgiving', createdAt: '2026-11-20',
  date: dateIn(10), startTime: '15:00', startTimeSource: 'host', venue: 'Our place', venueKind: 'home', venueCity: 'Springfield, VA',
  guestMode: 'count', guestCount: 12, guestCountSource: 'host', guests: [], vendors: [], budget: [], timeline: [],
};
const bootOwn = async (page, event = OWN) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('__seeded')) return; sessionStorage.setItem('__seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, event);
  await page.goto('?elegant=1');
  await settled(page);
};

// ── reading ──────────────────────────────────────────────────────────────────
const dollars = (s) => Number(String(s).replace(/[$,]/g, ''));
const all = (text, re) => [...String(text || '').matchAll(re)];
const flat = (s) => String(s || '').replace(/\s+/g, ' ');

// Lit buttons in a container, each with the text it SITS UNDER: everything in
// its own card (or hero, or sheet) before it, in reading order. Text below it
// does not explain it (the #252 case: "All-out $400" sat in a tier line under
// "Use $400", and the sentence above never said where $400 came from). Same
// lit test as oneLitButtonPerSheet (the CTA gradient), plus the board hero's
// primary, which wears --sheen in the dark theme.
const litWithContext = (sel) => {
  const probe = document.createElement('div');
  probe.style.backgroundImage = 'var(--cta-grad)';
  document.body.appendChild(probe);
  const lit = getComputedStyle(probe).backgroundImage;
  probe.remove();
  const root = sel === '.sheet' ? [...document.querySelectorAll('.sheet')].pop() : document.querySelector(sel);
  if (!root || !lit || lit === 'none') return [];
  const visible = (e) => {
    if (!e.getClientRects().length) return false;
    // Hidden inside the screen read (a closed slide-down); the screen's own
    // root can be inert under a first-visit tip and still be what she sees.
    const hidden = e.closest('[inert], [aria-hidden="true"]');
    if (hidden && hidden !== root && root.contains(hidden)) return false;
    const cs = getComputedStyle(e);
    return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01;
  };
  const litOnes = [...root.querySelectorAll('button, a, [role="button"]')].filter(visible)
    .filter((e) => getComputedStyle(e).backgroundImage === lit || e.matches('.hero .cta:not(.soft):not(.ghost)'));
  return litOnes.map((e) => {
    const box = e.closest('.card, article, .hero, .sheet') || root;
    const r = document.createRange();
    r.setStart(box, 0);
    r.setEndBefore(e);
    return { label: (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(), around: r.toString().replace(/\s+/g, ' ') };
  });
};

// A figure a button carries: a dollar amount, or a count (a bare number that is
// not part of a time, a date or a dollar amount).
const figuresIn = (label) => {
  const out = [];
  for (const m of all(label, /\$\d[\d,]*(?:\.\d\d)?/g)) out.push(m[0]);
  const stripped = label.replace(/\$\d[\d,]*(?:\.\d\d)?/g, ' ').replace(/\d{1,2}:\d\d/g, ' ').replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, ' ');
  for (const m of all(stripped, /\b\d+\b/g)) if (Number(m[0]) > 1) out.push(m[0]);
  return out;
};
const mentions = (text, fig) => fig.startsWith('$')
  ? text.includes(fig)
  : new RegExp(`(^|[^\\d$,.])${fig}(?![\\d,])`).test(text);

const readScreens = async (page, label) => {
  const screens = {};
  const lit = [];
  const grabLit = async (where, sel) => { for (const b of await page.evaluate(litWithContext, sel)) lit.push({ where, ...b }); };
  screens.board = flat(await page.locator('.app').innerText());
  try {
    await Promise.race([openWhatsCounted(page), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 6000))]);
    screens.boardCounted = flat(await page.locator('#whats-counted').innerText({ timeout: 3000 }));
  } catch { screens.boardCounted = ''; }
  await grabLit(`${label} board`, '.app');
  for (const name of SECTIONS) {
    try {
      await openSectionByName(page, name, { settle: 600 });
      await sheetSettled(page, 8000);
      screens[name] = flat(await page.locator('.sheet').last().innerText());
      await grabLit(`${label} ${name}`, '.sheet');
    } catch { screens[name] = ''; }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
  try {
    await goToStage(page, 'The Day');
    await page.waitForTimeout(800);
    screens.day = flat(await page.locator('.app').innerText());
    await grabLit(`${label} The Day`, '.app');
  } catch { screens.day = ''; }
  return { screens, lit };
};

// ── the rule ─────────────────────────────────────────────────────────────────
const violationsOf = ({ screens, lit }, label) => {
  const v = [];
  const say = (msg) => v.push(`${label}: ${msg}`);
  const S = screens;
  const every = Object.entries(S);

  // 1. Items.
  const spread = S['The spread & shopping'] || '';
  const bought = all(spread, /(\d+) of (\d+) bought/g).map((m) => [Number(m[1]), Number(m[2])]);
  if (bought.length) {
    // The list's own total is its largest "X of Y bought" (the whole list's line).
    const [gotAll, listAll] = bought.reduce((a, b) => (b[1] > a[1] ? b : a));
    const left = listAll - gotAll;
    for (const [where, t] of every) {
      for (const m of all(t, /Open the spread \((\d+) items?\)/g)) {
        if (Number(m[1]) !== listAll) say(`${where} says "Open the spread (${m[1]} items)" but the spread lists ${listAll}`);
      }
      for (const m of all(t, /(\d+) items? (?:still )?to get/g)) {
        if (Number(m[1]) !== left) say(`${where} says "${m[0]}" but the spread has ${left} not bought`);
      }
    }
  }

  // 2. Money.
  const one = (re, what) => {
    const seen = {};
    for (const [where, t] of every) for (const m of all(t, re)) (seen[dollars(m[1])] ||= new Set()).add(where);
    const figs = Object.keys(seen);
    if (figs.length > 1) say(`${what} reads ${figs.map((f) => `$${Number(f).toLocaleString('en-US')} (${[...seen[f]].join(', ')})`).join(' and ')}`);
  };
  one(/(\$[\d,]+) spoken for/g, '"spoken for"');
  one(/(\$[\d,]+) expected(?! over| under)/g, '"expected"');
  one(/(?:of a |Budget set · |Your budget — |against )(\$[\d,]+)(?: budget)?/g, 'the budget');
  for (const [where, t] of every) if (/left to spend/i.test(t)) say(`${where} prints "left to spend"`);

  // 3. Seats.
  // The plan's floor: the low end of "planned around · likely 68–75", else the
  // planned count itself (seatingClaim reads eventSizing's floor, the same band).
  const planned = (() => {
    const band = /planned around · likely (\d+)–(\d+)/.exec(S.board);
    if (band) return Number(band[1]);
    const m = /(\d+) planned around/.exec(S.board) || /planned for (\d+)/.exec(S.day || '');
    return m ? Number(m[1]) : null;
  })();
  const star = /Seated so far (\d+) of (\d+)/.exec(S['Who sits where'] || '');
  const seated = star ? Number(star[1]) : null;
  for (const [where, t] of every) {
    if (/Everyone(?:’|')s in a seat|Everyone has a seat/.test(t) && planned != null && seated != null && seated < planned) {
      say(`${where} says everyone has a seat with ${seated} seated on a plan for ${planned}`);
    }
  }

  // 4. Helpers.
  const helperCounts = {};
  const note = (n, where, what) => (helperCounts[n] ||= []).push(`${where} "${what}"`);
  for (const [where, t] of every) {
    for (const m of all(t, /Helpers (\d+) of (\d+)/g)) note(Number(m[2]), where, m[0]);
    for (const m of all(t, /Who(?:’|')s helping · (\d+)/gi)) if (where !== 'day') note(Number(m[1]), where, m[0]);
  }
  if (Object.keys(helperCounts).length > 1) say(`helper count reads ${Object.entries(helperCounts).map(([n, w]) => `${n} (${w.join(', ')})`).join(' and ')}`);
  for (const [where, t] of every) {
    const b = /Helpers (\d+) of (\d+)/.exec(t);
    for (const m of all(t, /Confirm (\d+) helpers?/g)) {
      if (b && Number(m[1]) !== Number(b[2]) - Number(b[1])) say(`${where} "${m[0]}" but "${b[0]}"`);
    }
  }
  // The Day's list of who arrives (venue, DJ, helpers) is not the helper count;
  // under the helper heading it must be.
  if (S.day && /Who(?:’|')s helping · (\d+)/i.test(S.day)) say('The Day heads its arrivals (vendors and helpers) "Who’s helping"');

  // 5. Vendors. The hiring screen's own total ("Booked so far X of N") is the
  // hired count; the money caveat cannot name more unpriced vendors than that.
  // (The exact reader, hiredVendors, is pinned in
  // src/lib/__tests__/theNumbersAgreeAtTheSource.test.js.)
  const unpriced = /(\d+) vendors? (?:are|is) still unpriced/.exec(S['Your money'] || '');
  const hired = /Booked so far \d+ of (\d+)/.exec(S['People you’re hiring'] || '');
  if (unpriced && hired && Number(unpriced[1]) > Number(hired[1])) {
    say(`Your money says "${unpriced[0]}" but the hiring screen counts ${hired[1]} hired`);
  }

  // 6. Lit buttons carry figures the text around them names.
  for (const b of lit) {
    for (const fig of figuresIn(b.label)) {
      if (!mentions(b.around, fig)) say(`${b.where}: the lit "${b.label}" offers ${fig}, named nowhere around it`);
    }
  }
  return v;
};

const MOMENTS = [
  ['four months out', '2026-11-24T12:00:00'],
  ['two weeks out', '2027-03-06T10:00:00'],
  ['the day', '2027-03-20T17:00:00'],
];
for (const [moment, at] of MOMENTS)
test(`every screen tells Wanda's plan the same numbers, ${moment}`, async ({ page }) => {
  test.setTimeout(240_000);
  await page.clock.setFixedTime(new Date(at));
  await bootSample(page);
  const read = await readScreens(page, `Wanda, ${moment}`);
  if (process.env.NUMBERS_DUMP) (await import('fs')).writeFileSync(`${process.env.NUMBERS_DUMP}/${moment.replace(/ /g, '_')}.json`, JSON.stringify(read, null, 1));
  expect(read.screens['Your money'], 'premise: Your money was read').toContain('spoken for');
  expect(read.screens['The spread & shopping'], 'premise: the spread was read').toMatch(/of \d+ bought/);
  expect(read.screens['Who sits where'], 'premise: Who sits where was read').toMatch(/\d+ of \d+/);
  expect(read.screens['Space, seats & helpers'], 'premise: Space was read').toMatch(/helping/i);
  expect(violationsOf(read, `Wanda, ${moment}`)).toEqual([]);
});

test('every screen tells a host’s own plan the same numbers', async ({ page }) => {
  test.setTimeout(240_000);
  await bootOwn(page);
  const read = await readScreens(page, 'own plan');
  expect(read.screens['Your money'], 'premise: Your money was read').toContain('$');
  expect(violationsOf(read, 'own plan')).toEqual([]);
});

// ── 6, everywhere: every section a host can open, not only the six above ─────
const sectionNames = async (page) => {
  if (await page.locator('.srail-row').count()) {
    return page.locator('.srail-row').evaluateAll((rows) => rows.map((r) => (r.querySelector('.srail-l, .srail-name') || r).innerText.split('\n')[0].trim()).filter(Boolean));
  }
  if (await page.locator('[data-tt-bar]').count()) {
    await page.locator('[data-tt-bar]').getByRole('button', { name: 'All sections', exact: true }).click();
  } else {
    await page.locator('.ev-eyebrow').first().click();
    await page.locator('.sheet').last().getByText('Jump to a section', { exact: false }).first().click();
  }
  await sheetSettled(page);
  const names = await page.locator('.sheet').last().locator('.sec-row .f-name, [data-door] > span').allInnerTexts();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  return names.map((n) => n.trim()).filter(Boolean);
};

for (const [who, boot] of [['Wanda’s plan', bootSample], ['a host’s own plan', (p) => bootOwn(p)], ['a new Thanksgiving for 12', (p) => bootOwn(p, THANKSGIVING)]])
test(`a lit button never offers a figure its screen hasn’t named — ${who}, every section`, async ({ page }) => {
  test.setTimeout(240_000);
  await boot(page);
  const lit = [];
  for (const b of await page.evaluate(litWithContext, '.app')) lit.push({ where: 'board', ...b });
  const names = await sectionNames(page);
  expect(names.length, 'premise: the sections were listed').toBeGreaterThan(8);
  let measured = 0;
  for (const name of names) {
    try {
      await openSectionByName(page, name, { settle: 600 });
      await sheetSettled(page, 8000);
    } catch { continue; } // a row that opens a stage, not a sheet
    measured += 1;
    for (const b of await page.evaluate(litWithContext, '.sheet')) lit.push({ where: name, ...b });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
  expect(measured, 'premise: sheets were measured').toBeGreaterThan(8);
  test.info().annotations.push({ type: 'lit buttons', description: lit.map((b) => `${b.where}: ${b.label}`).join(' | ') });
  const bad = [];
  for (const b of lit) for (const fig of figuresIn(b.label)) if (!mentions(b.around, fig)) bad.push(`${b.where}: the lit "${b.label}" offers ${fig}, named nowhere around it`);
  expect(bad).toEqual([]);
});

// ── 7. The family page's checklist count is the host's (audit #35) ───────────
// Owner ruling 11/24/2026, option a: her app saves its own "N of M" on the
// event (checklistCount); the server passes it to the family link (pinned in
// backend/tests/test_family_checklist_count.py). Here: what she reads on her
// checklist is what the family page prints from the event her app saved.
test('the family page counts the checklist the host counts', async ({ page }) => {
  test.setTimeout(120_000);
  await bootOwn(page);
  await openSectionByName(page, 'Your checklist', { settle: 600 });
  await sheetSettled(page);
  const host = /Checked off\s*(\d+) of (\d+)/.exec(await page.locator('.sheet').last().innerText());
  expect(host, 'premise: the host checklist shows N of M').not.toBeNull();
  // The event as her app saved it (the ordinary event write the sync sends).
  await expect.poll(() => page.evaluate(() => (JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0] || {}).checklistCount || null))
    .toEqual({ done: Number(host[1]), total: Number(host[2]) });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-hostv2-custom-events'))[0]);
  // The family projection's checklist is her stored steps (done = ticked), plus her count.
  const plan = {
    name: saved.name, type: saved.type, date: saved.date,
    checklist: (saved.timeline || []).filter((t) => t && !t.retired && t.task).map((t) => ({ task: t.task, done: !!t.done })),
    checklistCount: saved.checklistCount,
  };
  const CODE = 'fam-' + 'n'.repeat(28);
  await page.route('https://e2e-mock.invalid/api/public/family/' + CODE, (r) => r.fulfill({ status: 200, json: { ok: true, plan } }));
  await page.goto('?family=' + CODE);
  const line = page.locator('[data-family="checklist-count"]');
  await expect(line).toHaveText(`The checklist · ${host[1]} of ${host[2]} handled`);
});
