// ─── FIFTY HOSTS: A FINISHED SECTION CLEARS BOTH HEROES (11/20/2026) ─────────
//
// Owner report: "Some heroes don't clear when a section is completed." Two
// heroes are on the line every time a host finishes a part of the plan:
//
//   1. the BOARD hero — the one loud ask. Once a part is handled it must stop
//      asking about it and roll to the next real item (or to calm), never say
//      "past due" about it, never point back into it;
//   2. the SECTION hero at the top of that part's sheet — once the part is
//      handled it must read settled, not an open count or an ask.
//
// And the board's own index ("Where you stand": each part, handled or still
// open) has to agree with both. A section whose sheet says "all set" while the
// index still lists it open is the same disagreement seen from the other side.
//
// FIFTY PROFILES FROM A FIXED TABLE, NOT A RANDOM SEED AT RUNTIME. The angles
// rotate on co-prime strides over the tables below, so every host is a stable,
// re-runnable case (`--grep "host 17"`), and the matrix still spreads: event
// type, guest size and mode, runway, starting state, the ORDER the host works
// in, WHERE she settles it (the hero itself vs the section sheet), whether she
// reloads between steps, and the viewport.
//
// Most hosts finish their sections through the real UI. A few profiles also
// start from a seeded state the code trace flagged (a picked-not-booked stay,
// a confirmed vendor with a deposit unpaid, a step retired after its date) —
// "seeded finished" is an angle here, not the whole sweep.
//
// RUN IT ALL: HERO_SWEEP=1 npx playwright test e2e/fiftyHostsHeroClears.spec.mjs
// (~15 minutes at 3 workers). Without the flag the gate runs every tenth host.
// HERO_SWEEP_DEBUG=1 logs each step's driver and timing.
//
// FAILURES ARE COLLECTED AS DATA. A host does not stop at its first miss: each
// check records {host, step, part, what the hero said} and the test fails at
// the end with the whole list, so one run names every class at once.
import { test, expect, dateIn, settled } from './fixtures.mjs';

const TYPES = [
  'Birthday', 'Thanksgiving Hosting', 'Friendsgiving', 'Holiday Party', "New Year's Eve Party",
  'Baby Shower', 'The Cookout', 'Game Night', 'Repast', 'Client Dinner', 'Dinner Party',
  'Housewarming', 'Graduation', 'Retirement Party', 'Wedding', 'Bachelorette Party',
];
const SIZES = [8, 24, 80];
const MODES = ['count', 'list'];
const RUNWAY = [2, 9, 30, 90];
const STARTS = ['fresh', 'half', 'almost'];
const ORDERS = ['forward', 'reverse', 'interleaved', 'heroFirst'];
const HOW = ['hero', 'sheet', 'mixed'];
const VIEWS = [
  { width: 1440, height: 900 }, { width: 1440, height: 900 }, { width: 1440, height: 900 },
  { width: 1024, height: 768 }, { width: 1920, height: 1080 },
];
// The part a host finishes, in the board index's own words. `forward` is this
// order; the other orders permute it.
const SECTIONS = ['Budget', 'Where it happens', 'Date & time', 'Food', 'Calls', 'Vendors'];
// Seeded angles from the code trace, assigned to a fixed handful of hosts.
const SEEDS = {
  4: 'vendorDepositOwed', 11: 'lodgingPicked', 19: 'checklistRetired', 23: 'lodgingPlan',
  29: 'vendorDepositOwed', 36: 'rosterAllRoomed', 41: 'checklistRetired', 47: 'lodgingPicked',
};

const permute = (order, i) => {
  const s = SECTIONS.slice();
  if (order === 'reverse') return s.reverse();
  if (order === 'interleaved') return [s[2], s[0], s[4], s[1], s[5], s[3]];
  if (order === 'heroFirst') return ['HERO', 'HERO', 'HERO', ...s.slice(i % 3)];
  return s;
};

const PROFILES = Array.from({ length: 50 }, (_, i) => {
  const seed = SEEDS[i] || null;
  const destination = seed === 'lodgingPicked' || seed === 'lodgingPlan' || seed === 'rosterAllRoomed';
  return {
    id: i,
    type: destination ? (i % 2 ? 'Bachelorette Party' : 'Group Trip') : TYPES[(i * 5) % TYPES.length],
    guests: SIZES[(i * 7) % SIZES.length],
    mode: MODES[(i * 3) % MODES.length],
    days: RUNWAY[(i * 3) % RUNWAY.length],
    start: STARTS[(i * 2) % STARTS.length],
    order: ORDERS[i % ORDERS.length],
    how: HOW[(i * 5) % HOW.length],
    reload: i % 3 === 1,
    view: VIEWS[(i * 3) % VIEWS.length],
    seed,
    destination,
  };
});

const NAMES = ['Jordan Avery', 'Riley Park', 'Sam Okafor', 'Dana Cruz', 'Lee Moreno', 'Kai Brooks'];
const eventFor = (p) => {
  const ev = {
    id: `E2E_fifty_${p.id}`, name: `Host ${p.id}`, type: p.type, date: dateIn(p.days),
    guestMode: p.mode, guestEstimate: p.guests, guestCountSource: 'host',
    budget: [], vendors: [], timeline: [],
    guests: p.mode === 'list'
      ? NAMES.map((n, k) => ({ id: `g${k}`, name: n, rsvp: k % 3 === 2 ? 'Pending' : 'Yes' }))
      : [],
  };
  if (p.start !== 'fresh') {
    ev.totalBudget = 40000;
    ev.venue = 'Lakeside Hall';
    ev.venueAddress = '12 Oak St, Austin, TX';
    ev.venueCity = 'Austin, TX';
  }
  if (p.start === 'almost') { ev.startTime = '18:00'; ev.startTimeSource = 'host'; }
  if (p.destination) {
    ev.isDestination = true;
    ev.venue = 'The Inn on the Plaza'; ev.venueCity = 'Santa Fe, NM'; ev.venueAddress = '100 E San Francisco St, Santa Fe, NM';
  }
  // A vendor for the cockpit to finish: booked, not yet locked in.
  if (p.id % 4 === 2 || p.seed === 'vendorDepositOwed') {
    ev.vendors = [{ id: 'v1', name: 'Night Shift DJ', category: 'DJ', status: 'Deposit Paid', cost: 600, depositAmt: 200, depositPaid: true, contractSigned: true }];
  }
  if (p.seed === 'vendorDepositOwed') {
    // Locked in on the status ladder, the deposit still owed.
    ev.vendors = [{ id: 'v1', name: 'Night Shift DJ', category: 'DJ', status: 'Confirmed', cost: 600, depositAmt: 200, depositPaid: false, contractSigned: true }];
  }
  if (p.seed === 'lodgingPicked') ev.lodging = { hotelName: 'La Fonda', from: 'the option you picked' };
  if (p.seed === 'lodgingPlan') ev.lodging = { hotelName: 'La Fonda', from: 'the plan, not booked yet' };
  if (p.seed === 'rosterAllRoomed') {
    ev.guests = NAMES.slice(0, 3).map((n, k) => ({ id: `g${k}`, name: n, rsvp: 'Yes', travel: { lodging: { status: 'booked' } } }));
    ev.guestMode = 'list';
  }
  if (p.seed === 'checklistRetired') {
    ev.timeline = [
      // Three days past its window, and set aside by the host.
      { id: 't-old', task: 'Order the balloons', leadDays: -(p.days + 3), retired: true },
      { id: 't-done', task: 'Pick up the folding chairs', leadDays: -(p.days + 5), done: true },
    ];
  }
  return ev;
};

// ── WHAT EACH PART'S OWN ASK SOUNDS LIKE ───────────────────────────────────
// The phrases the engine raises for a part while it is open (lib/phaseProgress
// cue labels, the hero's food and budget asks). Once the part reads handled
// none of them may be the loud line.
const PART_ASK = {
  'Date & time': /start time|the event date|add the day/i,
  'Where it happens': /add the location/i,
  'Venue address': /name the venue/i,
  Guests: /set the guest count/i,
  // "You chose “Order pizza/trays” for the food; a caterer is not booked yet"
  // is the Food part asking again (a pick that hires nobody). A host who chose
  // drop-off catering is asked to book it, rightly — that is a vendor, not Food.
  Food: /what you're serving|dietary needs|decide the menu|you chose “[^”]*(pizza|tray|takeout|take-out|restaurant|order)[^”]*” for the food/i,
  Budget: /set your budget|over your budget/i,
  Vendors: /follow up with/i,
  'Where everyone stays': /sort where everyone stays/i,
};
// A section hero that is still asking. Deliberately narrow: an open COUNT, an
// unset value, a "still need".
// "left to" counts open work ("3 left to confirm"), never money: part 1 of the
// six-cause fix (#242, owner 11/23) labels the budget "$767 left to spend",
// which is a figure, not an open count.
const SHEET_OPEN = /\b\d+ (open|to settle|still to confirm|left to(?! spend))\b|\bnot set yet\b|\bstill needs?\b|no place picked yet/i;
// A section hero that claims done.
const SHEET_DONE = /\ball set\b|everyone[’']s locked in|the stay is set|everyone has a room|every step is handled|nothing left to/i;

const readBoard = (page) => page.evaluate(() => {
  const hero = document.querySelector('.hero');
  const ask = hero && hero.querySelector('h2.ask');
  const card = hero ? (hero.innerText.split(/THEN, IN ORDER|Then, in order|WORTH HAVING/)[0] || '') : '';
  const parts = [...document.querySelectorAll('[aria-label$="Open it."]')].map((b) => {
    const m = /^(.*) — (handled|still open)\. Open it\.$/.exec(b.getAttribute('aria-label') || '');
    return m ? { name: m[1], handled: m[2] === 'handled' } : null;
  }).filter(Boolean);
  const status = (document.body.innerText.match(/Active planning[^\n]*|Final stretch[^\n]*|Every part of the plan[^\n]*/) || [''])[0];
  const decisionId = hero && hero.querySelector('[data-decision-id]') ? hero.querySelector('[data-decision-id]').getAttribute('data-decision-id') : null;
  return { ask: ask ? ask.innerText.trim() : null, card: card.replace(/\s+/g, ' ').trim().slice(0, 400), parts, status, decisionId };
});

const closeSheets = async (page) => {
  for (let k = 0; k < 3 && (await page.locator('.sheet').count()); k++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
};
const sheetHead = (page) => page.evaluate(() => {
  const sh = [...document.querySelectorAll('.sheet')].pop();
  if (!sh) return '';
  // The hero block: what sits under the sheet header, before the first list.
  return sh.innerText.split('\n').map((l) => l.trim()).filter(Boolean)
    .filter((l) => !/^(‹ Sections|Close|Plan|Shop)$/.test(l)).slice(1, 6).join(' | ');
});
// The index chip is the door when it is on screen; close to the day it can sit
// folded away, so the part's own rail row is the second door.
const PART_RAIL = {
  Budget: 'Your money', Food: 'The spread & shopping', Shopping: 'The spread & shopping',
  'Where it happens': 'Venue', 'Venue address': 'Venue', Guests: 'Guests',
  Vendors: 'People you’re hiring', 'Where everyone stays': 'Travel & where everyone stays',
};
const openPart = async (page, name) => {
  await closeSheets(page);
  const b = page.locator(`[aria-label^="${name} — "][aria-label$="Open it."]`).first();
  if ((await b.count()) && (await b.isVisible())) {
    try { await b.click({ timeout: 4000 }); await page.waitForTimeout(900); return true; } catch { /* second door */ }
  }
  return PART_RAIL[name] ? openRail(page, PART_RAIL[name]) : false;
};
const openRail = async (page, name) => {
  await closeSheets(page);
  const r = page.locator('.srail-row', { hasText: name }).first();
  if (!(await r.count())) return false;
  try { await r.click({ timeout: 4000 }); } catch { return false; }
  await page.waitForTimeout(1000);
  return true;
};
const sheet = (page) => page.locator('.sheet').last();
const tryClick = async (loc, timeout = 2500) => {
  try { if (!(await loc.count())) return false; await loc.first().click({ timeout }); return true; } catch { return false; }
};

// ── THE DRIVERS: HOW A HOST FINISHES EACH PART, THROUGH THE REAL UI ────────
const DRIVE = {
  async Budget(page, how) {
    if (how === 'hero' && await tryClick(page.locator('.hero').getByRole('button', { name: /^Use \$/ }))) return 'hero';
    if (!(await openPart(page, 'Budget'))) return 'n/a';
    const sh = sheet(page);
    await tryClick(sh.getByRole('button', { name: 'Change' }));
    const f = sh.getByRole('textbox', { name: 'Custom budget amount' }).or(sh.getByRole('spinbutton', { name: 'Custom budget amount' }));
    if (await f.count()) {
      await f.first().fill('40000');
      await tryClick(sh.getByRole('button', { name: 'Use it' }));
      return 'sheet';
    }
    return (await tryClick(sh.getByRole('button', { name: /^Use \$/ }))) ? 'sheet' : 'missed';
  },
  async 'Where it happens'(page, how) {
    const fillIn = async (scope) => {
      const f = scope.locator('input[data-venue-field]');
      if (!(await f.count())) return false;
      await f.first().fill('Lakeside Hall, 12 Oak St, Austin, TX');
      return tryClick(scope.getByRole('button', { name: 'Save' }));
    };
    if (how === 'hero' && await fillIn(page.locator('.hero'))) return 'hero';
    for (const part of ['Where it happens', 'Venue address']) {
      if (await openPart(page, part) && await fillIn(sheet(page))) return 'sheet';
    }
    return 'n/a';
  },
  async 'Date & time'(page) {
    if (!(await openPart(page, 'Date & time'))) return 'n/a';
    const sh = sheet(page);
    if (await tryClick(sh.getByRole('button', { name: /^use \d/i }))) return 'sheet';
    const t = sh.locator('input[type="time"]');
    if (await t.count()) { await t.first().fill('18:00'); await t.first().press('Enter').catch(() => {}); return 'sheet'; }
    return 'missed';
  },
  async Food(page, how) {
    let used = 'n/a';
    if (how === 'hero') {
      for (let k = 0; k < 3; k++) {
        if (!(await tryClick(page.locator('.hero button').filter({ hasText: /our pick/ })))) break;
        used = 'hero';
        await page.waitForTimeout(700);
      }
    }
    if (!(await openPart(page, 'Food'))) return used;
    const sh = sheet(page);
    // One food page (11/24/2026): no Plan tab; the menu's row is "Menu".
    if (await tryClick(sh.locator('[data-food-section="choices"] .fstat', { hasText: 'Menu' }))) {
      for (let k = 0; k < 12; k++) {
        const chips = sh.locator('.chips').first();
        if (!(await chips.count())) break;
        const pressed = chips.locator('.chip[aria-pressed="true"]');
        if (!(await tryClick(pressed)) && !(await tryClick(chips.locator('.chip')))) break;
        used = 'sheet';
        await page.waitForTimeout(450);
      }
      await tryClick(sh.getByRole('button', { name: 'Done' }));
      await page.waitForTimeout(300);
    }
    if (await tryClick(sh.locator('.fstat', { hasText: 'Dietary needs' }))) {
      await page.waitForTimeout(400);
      if (await tryClick(sh.getByRole('button', { name: /That’s everyone/ }))) used = 'sheet';
    }
    return used;
  },
  // Every call on the Calls sheet, settled on its own pick ("Sounds good").
  async Calls(page) {
    if (!(await openRail(page, 'Calls to make'))) return 'n/a';
    let n = 0;
    for (let k = 0; k < 16; k++) {
      const sh = sheet(page);
      if (!(await tryClick(sh.locator('button').filter({ hasText: /our pick/ })))) break;
      n += 1;
      await page.waitForTimeout(450);
    }
    return n ? 'sheet' : 'n/a';
  },
  async Vendors(page) {
    if (!(await openRail(page, 'People you’re hiring'))) return 'n/a';
    let n = 0;
    for (let k = 0; k < 4; k++) {
      const sh = sheet(page);
      const pill = sh.locator('button[data-vaction="booking"]:not(.good)');
      if (!(await pill.count())) break;
      // The picker is a toggle and can already be open (a route into the
      // vendor lands on it), so open it only when it is not.
      if (!(await page.locator('.vc-statuspick button').count())) {
        if (!(await tryClick(pill))) break;
        await page.waitForTimeout(300);
      }
      if (!(await tryClick(page.locator('.vc-statuspick button').filter({ hasText: /locked in/i })))) break;
      n += 1;
      await page.waitForTimeout(400);
    }
    // A deposit still owed is part of finishing a vendor: open the card, say it is paid.
    const cards = page.locator('.sheet .vcard');
    for (let k = 0; k < (await cards.count()); k++) {
      const card = cards.nth(k);
      const owed = card.getByRole('button', { name: 'Mark deposit paid', exact: true });
      if (!(await owed.count())) continue;
      await tryClick(card.locator('.vc-head'));
      await page.waitForTimeout(300);
      if (await tryClick(owed)) n += 1;
      await page.waitForTimeout(300);
    }
    return n ? 'sheet' : 'n/a';
  },
  // The host answers whatever the hero is asking, in the hero.
  async HERO(page) {
    const hero = page.locator('.hero');
    if (await tryClick(hero.locator('button').filter({ hasText: /our pick/ }))) return 'hero';
    if (await tryClick(hero.getByRole('button', { name: /^Use \$/ }))) return 'hero';
    const v = hero.locator('input[data-venue-field]');
    if (await v.count()) { await v.first().fill('Lakeside Hall, 12 Oak St, Austin, TX'); if (await tryClick(hero.getByRole('button', { name: 'Save' }))) return 'hero'; }
    return 'n/a';
  },
};

const sectionFor = (part) => ({
  'Where it happens': 'Where it happens', 'Venue address': 'Where it happens',
}[part] || part);

// ── THE CHECK, RUN AFTER EVERY STEP ────────────────────────────────────────
async function checkHeroes(page, p, step, fails, opts = {}) {
  const b = await readBoard(page);
  const handled = b.parts.filter((x) => x.handled).map((x) => x.name);
  const open = b.parts.filter((x) => !x.handled).map((x) => x.name);
  for (const part of handled) {
    const re = PART_ASK[part];
    if (!re) continue;
    if ((b.ask && re.test(b.ask)) || re.test(b.card)) {
      fails.push({ host: p.id, profile: `${p.type} · ${p.days}d · ${p.mode} · ${p.start}`, step, section: part,
        cls: 'board-hero-asks-a-finished-part', said: b.ask, card: b.card.slice(0, 200) });
    }
  }
  if (open.length === 0 && b.parts.length && b.ask && /nothing is waiting on you|every part of the plan is handled/i.test(b.status)) {
    fails.push({ host: p.id, profile: `${p.type} · ${p.days}d · ${p.mode} · ${p.start}`, step, section: '(all parts)',
      cls: 'board-calm-claim-under-a-live-ask', said: b.ask, card: b.card.slice(0, 200) });
  }
  if (!opts.sheets) return;
  // Each part's sheet hero agrees with the index.
  for (const part of b.parts) {
    if (!(await openPart(page, part.name))) continue;
    const head = await sheetHead(page);
    if (part.handled && SHEET_OPEN.test(head)) {
      fails.push({ host: p.id, profile: `${p.type} · ${p.days}d`, step, section: part.name, cls: 'sheet-hero-open-on-a-handled-part', said: head });
    }
    if (!part.handled && SHEET_DONE.test(head)) {
      fails.push({ host: p.id, profile: `${p.type} · ${p.days}d`, step, section: part.name, cls: 'sheet-hero-done-on-an-open-part', said: head });
    }
  }
  await closeSheets(page);
}

// Rail sheets whose hero has no index part of its own but sits under one.
async function checkRailSheets(page, p, step, fails) {
  const b = await readBoard(page);
  const partOpen = (n) => b.parts.some((x) => x.name === n && !x.handled);
  const RAIL = [
    ['People you’re hiring', 'Vendors'],
    ['Travel & where everyone stays', 'Where everyone stays'],
    ['Your checklist', null],
  ];
  for (const [rail, part] of RAIL) {
    if (!(await openRail(page, rail))) continue;
    const head = await sheetHead(page);
    if (part && partOpen(part) && SHEET_DONE.test(head)) {
      fails.push({ host: p.id, profile: `${p.type} · ${p.days}d`, step, section: part, cls: 'sheet-hero-done-on-an-open-part', said: head, ask: b.ask });
    }
    if (!part && /every step is handled/i.test(head) && /overdue|catch up/i.test(`${b.ask} ${b.card}`)) {
      fails.push({ host: p.id, profile: `${p.type} · ${p.days}d`, step, section: 'Checklist', cls: 'board-hero-asks-a-finished-part', said: b.ask, sheet: head });
    }
  }
  await closeSheets(page);
}

const boot = async (page, p) => {
  await page.setViewportSize(p.view);
  await page.addInitScript((e) => {
    if (localStorage.getItem('ngw-hostv2-last-event')) return;
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-welcomed', '1');
  }, eventFor(p));
  await page.goto('?elegant=1');
  await settled(page);
  await page.locator('.hero').first().waitFor({ state: 'visible', timeout: 20000 });
};

test.describe.configure({ mode: 'parallel' });

for (const p of PROFILES) {
  test(`host ${p.id} · ${p.type} · ${p.guests} ${p.mode} · ${p.days}d · ${p.start} · ${p.order}/${p.how}${p.reload ? ' · reload' : ''}${p.seed ? ' · ' + p.seed : ''}`, async ({ page }, testInfo) => {
    // One geometry per host, pinned by the profile itself (SELF_PINNED in
    // playwright.config.mjs runs this file once, at desktop).
    // ALL FIFTY ON DEMAND, FIVE ALWAYS (11/20/2026). The full matrix is ~15
    // minutes at 3 workers; CI's two shards run 26 minutes with 12% margin
    // (playwright.config.mjs), so the gate carries every tenth host — one per
    // order and both completion styles — and HERO_SWEEP=1 runs all fifty.
    test.skip(!process.env.HERO_SWEEP && p.id % 10 !== 0, 'the full fifty run with HERO_SWEEP=1');
    test.setTimeout(240_000);
    const fails = [];
    const log = [];
    const t0 = Date.now();
    // A missing control is a finding, not a hang.
    page.setDefaultTimeout(8000);
    await boot(page, p);
    await checkHeroes(page, p, 'boot', fails, { sheets: !!p.seed });
    if (p.seed) await checkRailSheets(page, p, 'boot', fails);
    const steps = permute(p.order, p.id);
    for (let s = 0; s < steps.length; s++) {
      const sec = steps[s];
      const how = p.how === 'mixed' ? (s % 2 ? 'sheet' : 'hero') : p.how;
      let used = 'n/a';
      try { used = await DRIVE[sec](page, how); } catch (e) { used = 'error: ' + String(e.message || e).slice(0, 80); }
      await closeSheets(page);
      await page.waitForTimeout(500);
      if (p.reload) { await page.reload(); await settled(page); }
      log.push(`${sec}:${used}`);
      if (process.env.HERO_SWEEP_DEBUG) console.log(`host ${p.id} step ${s + 1} ${sec} ${used} at ${Date.now() - t0}ms`);
      await checkHeroes(page, p, `${s + 1}:${sec}(${used})`, fails, { sheets: s === steps.length - 1 || s % 2 === 1 });
    }
    if (p.seed) await checkRailSheets(page, p, 'end', fails);
    const end = await readBoard(page);
    testInfo.annotations.push({ type: 'steps', description: log.join(' → ') });
    testInfo.annotations.push({ type: 'end', description: `${end.ask || '(calm)'} || ${end.parts.map((x) => x.name + (x.handled ? '✓' : '·')).join(' ')}` });
    if (fails.length) {
      await testInfo.attach('hero-fails.json', { body: JSON.stringify(fails, null, 1), contentType: 'application/json' });
    }
    expect(fails, JSON.stringify(fails, null, 1)).toEqual([]);
  });
}
