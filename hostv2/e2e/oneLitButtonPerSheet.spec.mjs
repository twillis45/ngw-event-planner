// ─── ONE LIT BUTTON PER SHEET (design batch 4, 11/21/2026) ──────────────────
//
// UX_05 Primary Button: "Maximum ONE primary button per view section. If you
// have two primary buttons, one of them should be secondary." Doctrine 02
// § Gradients puts --cta-grad on the primary `.cta` only; soft and ghost stay
// flat. So a primary is measured, not named: a rendered control whose computed
// background-image IS the resolved --cta-grad. Every section a host can open
// is walked, and no sheet may render two of them at once.
//
// Measured 11/21/2026 on the batch-3 bundle: no sheet rendered two, at any of
// the seven matrix sizes, for either fixture — the audit's own per-surface
// counts (rounds 1 and 2) never exceeded one either. This is the guard that
// keeps it so. Red-proofed: "Change" beside "Use $2,200" in Your money turned
// from .mini into .cta fails it with "Your money: Use $2,200 | Change".
import { test, expect, settled, sheetSettled, openSectionByName, dateIn } from './fixtures.mjs';
import { OWN, MOMENTS } from './theDayStageFixture.mjs';

const EVENT = {
  id: 'one-lit', name: 'Maya’s 40th Birthday', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(9), startTime: '18:00', startTimeSource: 'host',
  venue: 'The Ironwood Room', venueAddress: '41 Market St, Annapolis, MD', venueCity: 'Annapolis, MD',
  guestMode: 'list', guestEstimate: 14, guestCountSource: 'host',
  guests: [
    { id: 'g1', name: 'Jordan Avery', rsvp: 'Yes' },
    { id: 'g2', name: 'Riley Park', rsvp: 'Yes', dietary: 'Peanut' },
    { id: 'g3', name: 'Morgan Diaz', rsvp: 'Maybe' },
  ],
  vendors: [{ id: 'v-cat', name: 'Harvest Table Catering', category: 'Catering', status: 'Considering', phone: '(410) 555-0142', cost: 2400, budgetCategory: 'Food' }],
  budget: [{ id: 'food', category: 'Food', budgeted: 2500, actual: 0 }],
  timeline: [{ id: 't1', task: 'Confirm final headcount with caterer', week: 'This week' }],
};

// The same host with nothing entered yet: the empty states carry their own
// primaries ("Add them", "Use it", "Draft my checklist"), so they are walked too.
const EMPTY = { id: 'one-lit-empty', name: 'Sam’s Graduation', type: 'Graduation', createdAt: '2026-11-01',
  date: dateIn(30), guests: [], vendors: [], budget: [], timeline: [] };

const boot = async (page, event, at = null) => {
  if (at) await page.clock.setFixedTime(new Date(at));
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, event);
  await page.goto('?elegant=1');
  await settled(page);
};

// The section names this event offers, read from whichever door this viewport has.
const sectionNames = async (page) => {
  if (await page.locator('.srail-row').count()) {
    return page.locator('.srail-row').evaluateAll((rows) => rows.map((r) => (r.querySelector('.srail-l, .srail-name') || r).innerText.split('\n')[0].trim()).filter(Boolean));
  }
  // The index (the pill's or the bar's All sections), else the ☰ menu's Jump to.
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

// Runs in the page: the lit buttons the open sheet renders.
const litButtons = () => {
  const probe = document.createElement('div');
  probe.style.backgroundImage = 'var(--cta-grad)';
  document.body.appendChild(probe);
  const lit = getComputedStyle(probe).backgroundImage;
  probe.remove();
  const sh = [...document.querySelectorAll('.sheet')].pop();
  if (!sh || !lit || lit === 'none') return { lit, found: [] };
  const found = [...sh.querySelectorAll('button, a, [role="button"]')].filter((e) => {
    if (!e.getClientRects().length || e.closest('[inert], [aria-hidden="true"], details:not([open]) > :not(summary)')) return false;
    const cs = getComputedStyle(e);
    return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01 && cs.backgroundImage === lit;
  }).map((e) => (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40));
  return { lit, found };
};

// SELF-PINNED (playwright.config.mjs): each walk opens ~20 sheets, so it runs
// once per geometry that changes which door and which sheet frame a host gets —
// the phone, tablet landscape with the rail up, and the desktop panel — rather
// than seven times over.
const RUNS = [
  ['a plan under way', EVENT, 390, 844], ['a plan under way', EVENT, 1024, 768], ['a plan under way', EVENT, 1440, 900],
  ['a plan with nothing entered', EMPTY, 390, 844], ['a plan with nothing entered', EMPTY, 1440, 900],
  // THE SHEETS ON THE DAY (UX_11 rule 1, cohesion batch A, 11/24/2026): the
  // same walk with the clock on the event day, the state the cohesion audit
  // flagged, so a sheet opened from The Day stage is held to one lit too.
  ['a plan on its day', OWN, 390, 844, MOMENTS.dayBeforeFirstCue], ['a plan on its day', OWN, 1440, 900, MOMENTS.dayBeforeFirstCue],
];
for (const [label, event, w, h, at] of RUNS)
test(`no sheet renders two lit primary buttons — ${label}, ${w}x${h}`, async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: w, height: h });
  await boot(page, event, at);
  const names = await sectionNames(page);
  expect(names.length, 'premise: the sections were listed').toBeGreaterThan(8);
  const twoLit = [];
  let measured = 0;
  for (const name of names) {
    try {
      await openSectionByName(page, name, { settle: 600 });
      await sheetSettled(page, 8000);
    } catch (_e) { continue; } // a row that opens a stage, not a sheet
    const r = await page.evaluate(litButtons);
    expect(r.lit, 'premise: --cta-grad resolves to a gradient').toMatch(/gradient/);
    measured += 1;
    if (r.found.length > 1) twoLit.push(`${name}: ${r.found.join(' | ')}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
  expect(measured, 'premise: sheets were measured').toBeGreaterThan(8);
  test.info().annotations.push({ type: 'measured', description: `${measured} of ${names.length} sections` });
  expect(twoLit, 'sheets with more than one lit primary').toEqual([]);
});
