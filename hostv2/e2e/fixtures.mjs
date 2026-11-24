// ─── A GLOBAL SAFETY NET FOR THE FAKE API HOST (2026-08-06) ────────────────
//
// THE CANONICAL BUILD FOR THIS SUITE IS `npm run e2e:build`, NOT `npm run
// build` (named here 2026-10-19 — see below). It bakes
// REACT_APP_API_BASE_URL=https://e2e-mock.invalid (a real, never-resolving RFC
// 2606 host) so isUnfurlConfigured() reads true and the lodgingCockpit specs
// that depend on it can exercise their real code path (see
// lodgingCockpit.spec.mjs's own header for why).
//
// WHY THAT LINE IS NOW A SCRIPT. This header used to say "the e2e build bakes"
// it, and nothing local did: `npm run build` bakes no REACT_APP_* at all, and
// the only place the fake host was written down was checks.yml's `env:` block.
// Following the webServer comment's "run npm run build first" therefore
// produced a bundle this suite was never written against — 33 specs failed on
// it in Sprint 0 and the failures were read as code defects for an hour. CI now
// calls the same script, so there is one definition of the e2e bundle.
//
// That env var is baked into the WHOLE bundle, not scoped to the lodging
// feature — found live: making it true broke decisionIdentity.spec.mjs and
// boardMatrix.spec.mjs, both asserting "no console errors", because SOME
// OTHER surface also gates on the same API_BASE and fired its own request the
// moment isUnfurlConfigured()-equivalent code saw it was configured. Every
// one of those became a real DNS failure (net::ERR_NAME_NOT_RESOLVED) against
// a host that can never resolve.
//
// Rather than track down and hand-mock every surface that happens to touch
// API_BASE, EVERY test gets a page-level catch-all: any request to the fake
// host is answered with a harmless empty 200 unless a test registers its own,
// more specific route first. Playwright tries routes most-recently-registered
// first, so a spec-specific mock (see mockUnfurl/mockResults in
// lodgingCockpit.spec.mjs) still wins over this fallback.
import { test as base, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// THE SITE-ROOT MANIFEST (WebKit full run, 11/17/2026). index.html links
// /ngw-event-planner/hostv2-manifest.json, which the deploy serves from the
// repo's root public/ (live: 200). The hostv2 preview serves only hostv2's own
// build, so every test page 404'd on it — invisible in Chromium's headless
// shell, which never fetches manifests, and a console error in every WebKit
// spec that asserts none. Served here from the real file. (Since 11/23/2026
// the preview itself serves the site-root files under E2E_BASE — see the
// ngw-preview-site-root plugin in vite.config.js; this route predates it.)
const MANIFEST = readFileSync(new URL('../../public/hostv2-manifest.json', import.meta.url));

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('https://e2e-mock.invalid/**',
      (route) => route.fulfill({ status: 200, json: { ok: true } }));
    await page.route('**/ngw-event-planner/hostv2-manifest.json',
      (route) => route.fulfill({ status: 200, contentType: 'application/manifest+json', body: MANIFEST }));
    await use(page);
  },
});

export { expect };

// ─── OPEN "WHAT'S COUNTED" THE WAY A HOST DOES (WebKit full run, 11/17/2026) ──
// Readiness pills, "Worth finding out", the unheld-clause block and the plan
// parts live in the #whats-counted slide-down, closed and `inert` until its
// caret is tapped. Chromium's innerText (and a programmatic .click()) reached
// them anyway, so specs read and clicked controls a host could not see; WebKit
// gives them no text, and 17 specs failed there. This taps the visible caret
// when the panel is closed and waits for it to reach its content height — the
// INNER wrapper's, since the panel's own scrollHeight tracks its growing
// height mid-transition. Safe to call twice; call it again after a reload.
export const openWhatsCounted = async (page) => {
  const panel = page.locator('#whats-counted');
  if (!(await panel.count())) return;
  if ((await panel.getAttribute('inert')) !== null) {
    await page.locator('[aria-controls="whats-counted"]:visible').first().click();
  }
  await page.waitForFunction(() => {
    const p = document.getElementById('whats-counted');
    const inner = p && p.querySelector('.slidepanel-inner');
    const h = p ? p.getBoundingClientRect().height : 0;
    return !!inner && !p.hasAttribute('inert') && h > 0 && h >= inner.scrollHeight - 1;
  });
};

// ─── THE RAIL IS UP FROM 1024, NOT 1280 (2026-09-02, skip census) ───────────
//
// Nine e2e guards read `viewport.width < 1280` and explained themselves as
// "uses the rail" / "rail is only up at desktop widths". That last one was a
// flat contradiction of the app: `isWideBp` in lib/viewport.js counts
// tablet-land as wide, tablet-land starts at 1024, and styles.css:4915 already
// says in as many words that data-rail is "1" from 1024 and NOT from 1280.
// A unit test asserts the same thing. Only the e2e guards never got the memo.
//
// Measured against the built bundle: 18 rail rows at 1024x768, 1279x800,
// 1280x800 and 1440x900 alike.
//
// Cost: ten tests skipped on two projects each — twenty executions per matrix
// run — on a geometry where the surface they test demonstrably exists. A skip
// reads as a pass in a summary line, so this was twenty silent passes.
//
// Kept as ONE constant so the next breakpoint move has one place to land, and
// railBoundaryMatchesApp.test.js fails if it ever drifts from viewport.js.
export const RAIL_MIN_WIDTH = 1024;

// ─── EVENT FIXTURE DATES ARE LOCAL CALENDAR DAYS, NEVER toISOString ─────────
//
// MEASURED 2026-09-26. `theClosingWindowLeads.spec.mjs` failed in the nightly
// full run and passed on a re-run seven hours later with no code change. It
// built its event date with `toISOString().slice(0, 10)`, which is UTC, while
// the board's day arithmetic (`dates.getToday`, `setHours(0,0,0,0)`) is LOCAL.
// Whenever the two calendars disagree — 8pm to midnight Eastern, and most of
// the day across the eastern hemisphere — three-days-out became four and the
// rows the spec ranks never both appeared.
//
// CI runs in UTC, where they never disagree, so CI could not reproduce it.
//
// 15 sites across 12 specs carried the same idiom. They all come here, so the
// rule has ONE home rather than a per-file idiom: the CRA side already learned
// this lesson three times module by module (dateChips, dayAlerts,
// experienceContext), and each fix stayed local to its module.
//
// For a spec whose date is computed INSIDE `addInitScript` (browser context, no
// imports), call this in Node and pass the string through as an argument —
// never re-derive it in the page.
/** A LOCAL calendar date `days` from today, as YYYY-MM-DD. */
export const dateIn = (days = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + Number(days || 0));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** True where the section rail is rendered and can be used as the door.
 *  From 1024 in either orientation: the 13" iPad held upright (1024x1366,
 *  tablet-tall) has the rail again (owner ruling 8, 11/23/2026; 11/22 had
 *  given it the bar). The 768–1023 portrait tablets are below 1024 anyway. */
export const hasRail = (viewport) => !!viewport && viewport.width >= RAIL_MIN_WIDTH;


// ─── THE BOOT BEAT WAS A SLEEP IN FRONT OF A BROKEN STATE-WAIT (2026-08-15) ──
//
// Five specs opened with this, character for character:
//
//     await page.goto('?elegant=1');
//     await page.waitForTimeout(1600);                                  // guess
//     await page.locator('.splash').waitFor({ state: 'detached', … });  // real
//     await page.waitForTimeout(300);                                   // guess
//
// The state-wait in the middle looks like the load-bearing line and is not.
// `waitFor({ state:'detached' })` resolves IMMEDIATELY when the element has
// never mounted — and right after `goto` the splash usually has not mounted
// yet. So on a fast machine it returned at once, the boot was governed by the
// two sleeps, and on a slow one it did the opposite. That is the race the 1600
// was padding, and padding a race is how you get a suite whose two runs at the
// same SHA produce disjoint failure sets (see the `retries: 1` note in
// playwright.config.mjs — this is the "actual flake source" it names).
//
// `waitForFunction` cannot resolve early, because it asserts the END state
// rather than a transition: the splash is gone AND the app has real content.
// Both halves are needed — "splash gone" alone is true one frame before the
// app paints, which is the same early-return in a new costume.
//
// Typically settles in ~300ms against a fixed 1900ms, and it is DETERMINISTIC:
// a slow machine waits longer instead of failing, a fast one stops waiting.
export const settled = (page) =>
  page.waitForFunction(() => {
    const sp = document.querySelector('.splash');
    if (sp) {
      const cs = getComputedStyle(sp);
      if (cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01) return false;
    }
    const app = document.querySelector('.app');
    return !!app && (app.innerText || '').trim().length > 120;
  }, null, { timeout: 20_000 });

// ─── AND A SHEET OPENING IS NOT THE APP BOOTING ─────────────────────────────
//
// `settled` above answers "has the app finished starting" — splash gone, shell
// populated. It says nothing about a SHEET, so every spec that taps one open
// guarded it with a guess: `waitForTimeout(1600)` appears across this
// directory more than any other line. Measured 2026-09-28: 192 fixed sleeps,
// 3.6 minutes of dead wall-clock per pass, and — per playwright.config.mjs —
// "the actual flake source". One of them produced the single flaky test in
// matrix14.
//
// A sheet is open when it EXISTS, has finished animating in, and has content.
// All three matter: the element mounts before the transition runs, and an
// assertion against a sheet at opacity 0.4 mid-slide reads a box that is
// still moving — which is how a geometry spec goes flaky without ever being
// wrong about the product.
export const sheetSettled = (page, timeout = 15_000) =>
  page.waitForFunction(() => {
    const sh = document.querySelector('.sheet');
    if (!sh) return false;
    const cs = getComputedStyle(sh);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    if (parseFloat(cs.opacity) < 0.99) return false;        // still sliding in
    return (sh.innerText || '').trim().length > 40;          // and it has content
  }, null, { timeout });

// ─── THE PHONE'S PILL TUCKS AWAY ON SCROLL DOWN (owner ruling 5, 11/23/2026) ─
// It comes back when she scrolls up, so a door that starts on the pill first
// scrolls the board up a little, the way she would, and waits for it. A no-op
// where there is no pill, or it is showing.
export const revealBar = async (page) => {
  const hidden = page.locator('[data-tt-bar].is-hidden');
  if (!(await hidden.count())) return;
  await page.evaluate(() => { const a = document.querySelector('.app'); if (a) a.scrollTop = Math.max(0, a.scrollTop - 80); });
  await expect(hidden).toHaveCount(0, { timeout: 5000 });
  await page.waitForTimeout(300);   // its slide back in (240ms)
};

// Wait for the board to carry whichever door this viewport has before a
// helper chooses its path: called right after `goto`, the choice was made on
// an empty page and fell through to the ☰, which a phone no longer has (owner
// ruling 1, 11/23/2026).
const anyDoor = (page, timeout = 15_000) =>
  page.locator('.srail-row, [data-tt-bar], .ev-eyebrow').first().waitFor({ state: 'attached', timeout });

// ─── THE SECTION DOOR MOVES WITH THE VIEWPORT ───────────────────────────────
//
// Below the rail band, the way into a section is two taps: the eyebrow menu,
// then "Jump to a section". At rail widths that row is deliberately NOT
// rendered — with the rail up it opened a sheet whose only content was a
// second copy of the rail (2026-08-21) — and the rail IS the section list.
//
// Ten specs had hand-rolled the phone path inline. Hiding that row turned all
// ten red in CI at `desktop` and `wide` while the app was fine, and I fixed
// exactly one of them (a11yFloor) because that was the one my local desktop
// run happened to execute. Nine were still carrying the old assumption.
//
// So the door lives here now, once. A spec that wants a section asks for the
// section; which door this viewport has is not a spec's business.
export const openSectionByName = async (page, name, opts = {}) => {
  const timeout = opts.timeout || 8000;
  await anyDoor(page);
  const rail = page.locator('.srail-row', { hasText: name });
  if (await page.locator('.srail-row').count()) {
    await rail.first().click({ timeout });
  } else if (await page.locator('[data-tt-bar]').count()) {
    // THE TALL IPAD'S DOOR (owner, 11/22/2026): a portrait tablet has no rail
    // and no eyebrow; its bar's "All sections" opens the index. Same sheet
    // walk-back as the phone path below: the bar sits under an open sheet.
    if (await page.locator('.sheet').count()) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
    }
    await revealBar(page);
    await page.locator('[data-tt-bar]').getByRole('button', { name: 'All sections' }).click({ timeout });
    await page.locator('.sheet').last().locator('[data-door]', { hasText: name }).first().click({ timeout });
  } else {
    // CLOSE ANY OPEN SHEET FIRST. Below the rail band the sheet covers the
    // whole stage, including the eyebrow this walk starts from, so calling
    // this helper while a sheet is open put the click on a scrim and timed out
    // eight seconds later.
    //
    // Fixed HERE rather than at the call site, and that is the point: this is
    // the fifth time in one session that the phone door-walk broke a spec at
    // every width except desktop. Four of those were patched locally, which is
    // how it came back a fifth time. A shared helper that only works from one
    // starting state is a trap with a countdown on it.
    if (await page.locator('.sheet').count()) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
    }
    await page.locator('.ev-eyebrow').first().click({ timeout });
    await page.locator('.sheet').last()
      .getByText('Jump to a section', { exact: false }).first().click({ timeout });
    await page.locator('.sheet').last()
      .getByText(name, { exact: false }).first().click({ timeout });
  }
  await page.waitForTimeout(opts.settle == null ? 400 : opts.settle);
};

// ─── THE BOARD'S IDENTITY AND ITS EVENT SWITCHER, WHEREVER THEY ARE ─────────
// (tall iPad, owner 11/22/2026). On a portrait tablet the ☰ eyebrow is gone:
// the same identity values print in the header's first row, and the title is
// the event switcher. A spec that wants the identity line or the events sheet
// asks for it here; which layout this viewport has is not a spec's business.
// Read with { useInnerText: true }: both lines show their dates uppercased,
// the eyebrow in its text and the header through text-transform.
export const identityLine = (page) => page.locator('.ev-eyebrow .eb-text, [data-tt-head] .tt-r1').first();
export const openEventsSheet = async (page, opts = {}) => {
  const timeout = opts.timeout || 15_000;
  // Her own plan after its day lands on After (owner, 11/24/2026, cohesion
  // batch E), and the event switcher lives in the board's header: on a stage
  // without it, step to Plan first, as she would.
  await anyDoor(page);
  if (!(await page.locator('[data-tt-title], .ev-eyebrow').count())) await goToStage(page, 'Plan');
  // Wait for the board's header, whichever layout it is, before choosing.
  await page.locator('[data-tt-title], .ev-eyebrow').first().waitFor({ timeout });
  const title = page.locator('[data-tt-title]');
  if (await title.count()) { await title.first().click({ timeout }); return; }
  await page.locator('.ev-eyebrow').first().click({ timeout });
  await page.locator('.navrow', { hasText: 'This event' }).first().click({ timeout });
};

// The phases (Create · Plan · The Day · After): the tall iPad's bar, or the
// menu's segmented control everywhere else.
export const goToStage = async (page, label, opts = {}) => {
  const timeout = opts.timeout || 8000;
  await anyDoor(page);
  const closeSheets = async () => {
    if (await page.locator('.sheet').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  };
  const bar = page.locator('[data-tt-bar]');
  if (await bar.count()) {
    await closeSheets();
    await revealBar(page);
    await bar.getByRole('button', { name: label, exact: true }).click({ timeout });
    return;
  }
  // The 13" iPad upright: the rail's Your event group (owner ruling 8, 11/23/2026).
  const railStage = page.locator('.srail [data-rail-stage]', { hasText: label });
  if (await railStage.count()) {
    await closeSheets();
    await railStage.first().click({ timeout });
    return;
  }
  // The menu may already be open (a spec that read Jump to first).
  if (!(await page.locator('.sheet .navseg-b').count())) {
    await closeSheets();
    await page.locator('.ev-eyebrow').first().click({ timeout });
  }
  await page.locator('.navseg-b', { hasText: label }).first().click({ timeout });
};

// The menu's own rows that are doors in the section list too (You & settings,
// Ask, The One-Event Pass): the rail where it is up, the tall iPad's index,
// or the menu's row on a phone. "Feeling stuck?" is reached the same way.
export const openMenuDoor = async (page, label, opts = {}) => {
  const timeout = opts.timeout || 8000;
  await anyDoor(page);
  const rail = page.locator('.srail-row', { hasText: label });
  if (await rail.count()) { await rail.first().click({ timeout }); return; }
  const bar = page.locator('[data-tt-bar]');
  if (await bar.count()) {
    if (await page.locator('.sheet').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
    await revealBar(page);
    await bar.getByRole('button', { name: 'All sections' }).click({ timeout });
    await page.locator('.sheet').last().locator('[data-door]', { hasText: label }).first().click({ timeout });
    return;
  }
  await page.locator('.ev-eyebrow').first().click({ timeout });
  await page.locator('.navrow', { hasText: label }).first().click({ timeout });
};

// "Jump to", wherever it is: the ☰ menu sheet, or on a tall iPad the index the
// bar's "All sections" opens (which carries the same pass row). `passRow`
// finds that row in either.
export const openJumpTo = async (page) => {
  // The 13" iPad upright: the rail is the menu, always open (owner ruling 8).
  if (await page.locator('.srail [data-rail-stage]').count()) return;
  const bar = page.locator('[data-tt-bar]');
  if (await bar.count()) {
    await revealBar(page);
    await bar.getByRole('button', { name: 'All sections' }).click();
    await expect(page.locator('#sheet-title')).toHaveText('Everything in your plan');
    return;
  }
  await page.locator('[aria-label="Menu"]').first().click();
  await expect(page.locator('#sheet-title')).toHaveText('Jump to');
};
export const passRow = (page) => page.locator('.nav-pass, .tt-index-pass, .srail:has([data-rail-stage]) .srail-pass');

// ─── THE CHECKLIST'S STEPS OPEN IN PLACE (cohesion batch D, 11/24/2026) ──────
// Owner D1–D5: the first open step is "Up next" (its route is the sheet's one
// lit button), the rest sit in phases by when with only the current phase
// open, and a step's controls live inside the step, opened under its row. A
// spec that wants a step's own action asks here, wherever that step sits.
// Rows carry `data-step-action` (the route's label), so nothing reads words
// to find them.
export const openAllPhases = async (page) => {
  const sheet = page.locator('.sheet').last();
  const closed = sheet.locator('[data-phase][data-open="false"] [data-phase-toggle]');
  for (let n = await closed.count(); n > 0; n -= 1) {
    await closed.first().click();
  }
};
// The step whose title holds `text`, opened in place. Returns its [data-step-row].
export const openChecklistStep = async (page, text) => {
  await openAllPhases(page);
  const row = page.locator('.sheet').last().locator('[data-step-row]')
    .filter({ has: page.locator('[data-step-body]', { hasText: text }) }).first();
  await row.waitFor();
  const body = row.locator('[data-step-body]');
  if ((await body.getAttribute('aria-expanded')) !== 'true') await body.click();
  return row;
};
// A step's own action button by its label: Up next's lit button when that
// step is next, else the button inside the (opened) step.
export const checklistStepAction = async (page, label, { nth = 0 } = {}) => {
  const sheet = page.locator('.sheet').last();
  const up = sheet.locator('[data-up-next] [data-row-action]').filter({ hasText: label });
  const upN = await up.count();
  if (nth < upN) return up.nth(nth);
  await openAllPhases(page);
  const row = sheet.locator('[data-step-row]').filter({ has: page.locator(`[data-step-action="${label}"]`) }).nth(nth - upN);
  const rowSelf = sheet.locator(`[data-step-row][data-step-action="${label}"]`).nth(nth - upN);
  const target = (await rowSelf.count()) ? rowSelf : row;
  await target.waitFor();
  const body = target.locator('[data-step-body]');
  if ((await body.getAttribute('aria-expanded')) !== 'true') await body.click();
  return target.locator('[data-row-action]').first();
};
// A step's row (title holding `text`) whether it is Up next, in a phase, or
// done: for class checks (.got) and check-offs.
export const checklistRow = (page, text) => page.locator('.sheet').last().locator('.frow').filter({ hasText: text });
// A step's own action, found by the step's title: Up next's lit button when
// that step is next, else the button inside the opened step.
export const checklistActionByTitle = async (page, text) => {
  const sheet = page.locator('.sheet').last();
  const up = sheet.locator('[data-up-next]').filter({ has: page.locator('.ck-next-name', { hasText: text }) });
  if (await up.count()) return up.locator('[data-row-action]').first();
  const row = await openChecklistStep(page, text);
  return row.locator('[data-row-action]').first();
};
// Every word the checklist can show: every phase opened, then each step opened
// in turn (its detail and controls live inside it). For specs that check that
// a step's words reach the screen. Lower-cased only if asked.
export const checklistText = async (page) => {
  await openAllPhases(page);
  const sheet = page.locator('.sheet').last();
  const parts = [await sheet.innerText()];
  const bodies = sheet.locator('[data-step-row] [data-step-body]');
  const n = await bodies.count();
  for (let k = 0; k < n; k += 1) {
    const b = bodies.nth(k);
    if ((await b.getAttribute('aria-expanded')) !== 'true') await b.click();
    const open = sheet.locator('[data-step-row]').nth(k).locator('[data-step-open]');
    if (await open.count()) parts.push(await open.innerText());
  }
  return parts.join('\n');
};
// Bring a step's controls on screen by its title: nothing to do when it is up
// next (the card shows them), else open it in place.
export const revealChecklistStep = async (page, text) => {
  const up = page.locator('.sheet').last().locator('[data-up-next]').filter({ has: page.locator('.ck-next-name', { hasText: text }) });
  if (await up.count()) return up.first();
  return openChecklistStep(page, text);
};
