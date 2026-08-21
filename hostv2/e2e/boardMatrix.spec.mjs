// ─── LAYER-2 BOARD MATRIX — the browser checks no unit test can make ─────────
// The process ask (2026-07-22): a repeatable harness that finds the classes the
// host kept reporting by eye. Four probes per seeded state, real browser, built
// bundle, fresh context per test (the user's browser/storage never touched):
//
//   1. LOOP-ADVANCE (the W14/W14b class, "no next step after selection"):
//      tap the hero's first actionable control → the board MUST move — the hero
//      changes, or a receipt fires and the ask dissolves. A tap that leaves the
//      same screen standing is a dead-end and fails here.
//   2. DISPLAY LINT (W1/W5 class): headings/buttons/labels carry no internal
//      ids, no undefined/NaN leaks, no label truncated through a parenthetical.
//   3. PINNED GEOMETRY + SCROLL-END REACHABILITY (W2/W3/W10 class): at real
//      scroll-end, visible pinned layers don't overlap and the last content row
//      clears them.
//   4. FOLD PEEK (W9 class): on future-event ask screens the see-all pull
//      handle intersects the first viewport.
import { test, expect, settled, openSectionByName } from './fixtures.mjs';

const COI_PATCH = {
  vendors: [
    { id: 'tdv-v1', name: 'Ironwood Room', category: 'Venue', status: 'Confirmed', cost: 2200, depositAmt: 600, depositPaid: true, balancePaid: true, contractSigned: true, arrivalTime: '3:00 PM', coiStatus: 'received', coiVerified: true },
    { id: 'tdv-v2', name: 'TSW Catering', category: 'Catering', status: 'Deposit Paid', cost: 4200, depositAmt: 800, depositPaid: true, balancePaid: false, contractSigned: true, arrivalTime: '4:00 PM', coiStatus: 'received', coiVerified: false },
  ],
};

// The seeded states — the same roster the live drives used. Weather is staged
// deterministically for the outdoor T-2 event via route interception.
const DAY_OF_PATCH = { date: new Date().toISOString().slice(0, 10) };

const STATES = [
  { id: 'test-two-days', label: 'Game Night DAY-OF (elegant ask)', weather: false, future: true, patch: DAY_OF_PATCH, stateKey: 'day-of' },
  { id: 'test-two-days',           label: 'Game Night T-2 (outdoor, weather)', weather: true,  future: true },
  { id: 'test-day-before-vendors', label: 'Dinner T-1 (vendors, COI unverified)', weather: false, future: true, patch: COI_PATCH },
  { id: 'ev-x-repast',             label: 'Repast T-3 (solemn)',               weather: false, future: true },
  { id: 'ev-x-graduation',         label: 'Graduation (past)',                 weather: false, future: false },
  { id: 'ev-x-wanda',              label: 'Wanda far-out',                     weather: false, future: true },
];

const LINT = [
  { name: 'internal-id',   re: /\b(?:ev|tdv|trr|pbt?)-[a-z0-9][a-z0-9-]*\b|\bv-[a-z0-9]{6,}\b/i },
  { name: 'undefined-leak', re: /\bundefined\b|\bNaN\b|\[object Object\]/ },
];
const unbalanced = (s) => {
  let d = 0;
  for (const c of s) { if (c === '(') d++; else if (c === ')') d = Math.max(0, d - 1); }
  return d !== 0;
};


// ─── WHY SOME OF THESE RUN ON TWO GEOMETRIES AND NOT SIX ────────────────────
//
// Measured 2026-08-17 over a full matrix: this file was 1230s of the suite's
// 1689s — 73% — and ONE test in it, the decisions sweep, was 904s of that. 54%
// of the whole matrix was a single behavioural test re-running across six
// viewports.
//
// The split is by what a test actually asserts, not by convenience:
//   GEOMETRY  (pinned geometry + scroll-end reachability, fold peek) measure
//             rendered boxes and MUST run on every viewport — they are the
//             reason the six projects exist.
//   BEHAVIOUR (decisions sweep, checklist CTA, display lint, loop-advance) ask
//             "does the row open its editor", "does this CTA land somewhere
//             real", "is there machinery in the copy". None of that changes
//             between 768 and 1024 wide.
//
// Two, not one: 1280 is where the shell stops being a phone silhouette and the
// responsive canvases switch on (see the `desktop` project note in the config),
// so a phone and a desktop are genuinely different code paths for a behaviour
// test. The four middle widths were buying repeat results at ~10 minutes a run.
const BEHAVIOUR_GEOMETRIES = ['mobile', 'desktop'];
const behaviourOnly = (testInfo) =>
  test.skip(!BEHAVIOUR_GEOMETRIES.includes(testInfo.project.name),
    `behaviour test — runs on ${BEHAVIOUR_GEOMETRIES.join(' + ')} only (see the note above; this file was 73% of the matrix)`);

const stageWeather = async (page) => {
  const day = new Date(); day.setDate(day.getDate() + 2);
  const iso = day.toISOString().slice(0, 10);
  const noon = new Date(iso + 'T12:00:00');
  const hourly = [];
  for (let h = 8; h < 22; h++) {
    const t = new Date(iso + 'T00:00:00'); t.setHours(h);
    hourly.push({ dt: Math.floor(t.getTime() / 1000), pop: h >= 14 && h < 18 ? 0.85 : 0.1, weather: [{ main: h >= 14 && h < 18 ? 'Rain' : 'Clouds' }] });
  }
  await page.route('**/api/weather/geocode**', r => r.fulfill({ json: { result: { lat: 39.11, lon: -76.55 } } }));
  await page.route('**/api/weather/onecall**', r => r.fulfill({ json: {
    timezone_offset: -noon.getTimezoneOffset() * 60,
    daily: [{ dt: Math.floor(noon.getTime() / 1000), pop: 0.8, weather: [{ main: 'Rain', description: 'heavy rain', icon: '10d' }], temp: { min: 62, max: 74 } }],
    hourly,
  } }));
};

const boot = async (page, state) => {
  if (state.weather) await stageWeather(page);
  await page.addInitScript(([id, patch]) => {
    localStorage.setItem('ngw-hostv2-last-event', id);
    if (patch) localStorage.setItem('ngw-hostv2-patch-' + id, JSON.stringify(patch));
    // The gate Date.parse()s this — an epoch-millis string parses NaN and the
    // FULL splash plays over every probe (found by elementFromPoint debugging).
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1');
    localStorage.setItem('ngw-v2-welcomed', '1');
  }, [state.id, state.patch || null]);
  await page.goto('?elegant=1');
  await settled(page);
};

for (const state of STATES) {
  test.describe(state.label, () => {
    test('display lint — no machinery in visible copy', async ({ page }) => {
      behaviourOnly(test.info());
      await boot(page, state);
      const strings = await page.$$eval('h1, h2, h3, button, .decopt-name, .nb-title, .qt, .of, .eb-text',
        els => els.map(e => (e.innerText || '').trim()).filter(Boolean));
      const dirty = [];
      for (const s of strings) {
        for (const rule of LINT) if (rule.re.test(s)) dirty.push(`[${rule.name}] "${s.slice(0, 90)}"`);
        if (unbalanced(s)) dirty.push(`[unbalanced-paren] "${s.slice(0, 90)}"`);
      }
      expect(dirty).toEqual([]);
    });

    test('loop-advance — settles walk the queue without stalling', async ({ page }) => {
      behaviourOnly(test.info());
      await boot(page, state);
      // WALK THE QUEUE (Up-Next #2): repeatedly take the hero's first in-place
      // settle (.decopt row or .cta.stay) and require the board to MOVE each
      // time — the ask rolls, the panel recomposes, or a sheet opens (which we
      // close and continue). A tap that changes nothing is a dead-end and fails.
      // Mutations live in this test's own fresh context only.
      // Bounded reads: an absent element (usually #sheet-title) must resolve
      // in a beat, not wait out the default 30s locator timeout.
      const read = (sel) => page.locator(sel).first().innerText({ timeout: 400 }).catch(() => '');
      // The decision panel (article) sits OUTSIDE .hzone — a chosen-badge move
      // is a real change and must be visible to the snapshot.
      const snap = async () => [await read('h2'), await read('.hzone'), await read('article'), await read('#sheet-title')].join('§');
      let steps = 0;
      for (let i = 0; i < 8; i++) {
        // Only board-level settles — never controls inside an open sheet or the
        // weather pill (their flows are their own).
        // Skip rows already marked chosen — re-tapping a settled value fires a
        // receipt but legitimately re-renders nothing; the dead-end class is an
        // UNSETTLED control that changes nothing.
        const control = page.locator('.decopt:visible:not(:has-text("chosen")), .cta.stay:visible').first();
        if (await control.count() === 0) break;
        const inOverlay = await control.evaluate(el => !!el.closest('.sheet, .wxpill')).catch(() => true);
        if (inOverlay) break;
        const before = await snap();
        // A receipt toast can briefly overlay the next control — transient
        // chrome, not occlusion. Bounded click; a control that stays
        // unclickable IS a finding.
        try { await control.click({ timeout: 5000 }); }
        catch (e) { throw new Error(`settle #${i + 1} unclickable (covered?): ` + String(e).slice(0, 120)); }
        await page.waitForTimeout(900);
        const after = await snap();
        expect(after !== before, `settle #${i + 1} changed nothing (dead-end)`).toBe(true);
        steps++;
        // A settle that opened a sheet advanced the flow — close it and walk on.
        const closer = page.locator('.sheet-x:visible');
        if (await closer.count() > 0) { await closer.first().click({ timeout: 800 }).catch(() => {}); await page.waitForTimeout(400); }
        // Let the receipt toast clear before the next tap targets anything.
        await page.locator('.toast.on').waitFor({ state: 'hidden', timeout: 7000 }).catch(() => {});
      }
      if (steps === 0) { test.skip(true, 'no in-place settle on this state'); return; }
    });

    test('pinned geometry + scroll-end reachability', async ({ page }) => {
      await boot(page, state);
      // Real wheel scrolls (programmatic scrollTop doesn't flip the
      // IntersectionObserver that raises the pinned stack). Scroll until the
      // scroller is genuinely AT its end — mid-scroll there is always content
      // behind the pinned bar, so the reachability claim only exists at the end.
      const vp = page.viewportSize();
      await page.mouse.move(vp.width / 2, vp.height / 2); // wheel events land at the pointer — put it IN the app
      let atEnd = false;
      for (let i = 0; i < 60 && !atEnd; i++) {
        await page.mouse.wheel(0, 700);
        await page.waitForTimeout(70);
        atEnd = await page.evaluate(() => {
          const a = document.querySelector('.app');
          return !a || a.scrollTop + a.clientHeight >= a.scrollHeight - 2;
        });
      }
      expect(atEnd).toBe(true);
      await page.waitForTimeout(600);
      const report = await page.evaluate(() => {
        const vis = (el) => {
          if (!el) return null;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || Number(cs.opacity) === 0) return null;
          const r = el.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
        };
        const layers = ['.next-bar', '.wxpill', '.dock'].map(s => [s, vis(document.querySelector(s))]).filter(([, r]) => r);
        const overlaps = [];
        for (let i = 0; i < layers.length; i++) for (let j = i + 1; j < layers.length; j++) {
          const [na, a] = layers[i], [nb, b] = layers[j];
          const x = a.left < b.right && b.left < a.right, y = a.top < b.bottom && b.top < a.bottom;
          if (x && y) overlaps.push(`${na} × ${nb}`);
        }
        // Scroll-end reachability: the lowest CONTENT edge must clear the
        // highest pinned layer.
        const app = document.querySelector('.app');
        const pinnedTop = Math.min(...layers.map(([, r]) => r.top), Infinity);
        let lowestContent = 0; let lowestEl = null;
        if (app) for (const el of app.querySelectorAll('button, p, h2, h3')) {
          // The pinned overlays' own children are chrome, not content.
          if (el.closest('.next-bar, .dock, .wxpill')) continue;
          const r = el.getBoundingClientRect();
          if (!(r.height > 0 && r.bottom > lowestContent && r.bottom < innerHeight + 4)) continue;
          // ACTUALLY visible: an element clipped inside a collapsed panel
          // (overflow ancestors) reports a rect that spills past its box —
          // hit-test its bottom edge; if the point doesn't land on the element
          // (or a descendant), nothing is really there to occlude.
          const px = (r.left + r.right) / 2, py = r.bottom - 2;
          // CLIPPED? If any overflow-clipping ancestor's box excludes the test
          // point, the element isn't really there (a closed .slidepanel keeps
          // its children's rects while max-height:0 hides them) — skip BEFORE
          // hit-testing, or a coincident pinned layer gets falsely blamed.
          let clipped = false;
          for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
            const ov = getComputedStyle(n).overflowY;
            if (ov === 'hidden' || ov === 'clip' || ov === 'auto' || ov === 'scroll') {
              const nr = n.getBoundingClientRect();
              if (py < nr.top || py > nr.bottom) { clipped = true; break; }
            }
          }
          if (clipped) continue;
          const hit = document.elementFromPoint(px, py);
          const hitIsPinned = hit && hit.closest && hit.closest('.next-bar, .dock, .wxpill');
          // Hit on a pinned layer → genuinely occluded: count. Hit elsewhere →
          // covered by non-pinned chrome: skip. Hit on itself → visible.
          if (!hitIsPinned && (!hit || !(el === hit || el.contains(hit)))) continue;
          lowestContent = r.bottom; lowestEl = (el.className || el.tagName) + ': ' + (el.innerText || '').slice(0, 40);
        }
        const afterH = app ? getComputedStyle(app, '::after').height : null;
        return { overlaps, pinnedTop, lowestContent, lowestEl, hasLayers: layers.length > 0,
          scrollTop: app && app.scrollTop, scrollHeight: app && app.scrollHeight, clientHeight: app && app.clientHeight, afterH };
      });
      expect(report.overlaps).toEqual([]);
      if (report.hasLayers && report.lowestContent) {
        expect(report.lowestContent, 'occluded: ' + report.lowestEl + ' · ' + JSON.stringify({ scrollTop: report.scrollTop, scrollHeight: report.scrollHeight, clientHeight: report.clientHeight, afterH: report.afterH })).toBeLessThanOrEqual(report.pinnedTop + 1);
      }
    });

    if (state.future) {
      // Routing-audit adds (2026-07-27, queue item ⑥). The nav-layer unit gate
      // proves every route RESOLVES; these two prove the interaction layer in a
      // real browser — rows actually open their editors, and a checklist CTA
      // lands a sheet instead of dying under a fall-through.
      test('decisions sheet — every unsettled row opens its editor', async ({ page }) => {
        test.setTimeout(90_000);
        behaviourOnly(test.info());
        await boot(page, state);
        // Deterministic nav through whichever section door this viewport has.
        await openSectionByName(page, 'Calls to make', { timeout: 5000 });
        await expect(page.locator('#sheet-title')).toHaveText('Calls to make', { timeout: 5000 });
        const sheet = page.locator('.sheet').last();
        const read = () => sheet.innerText({ timeout: 1000 }).catch(() => '');
        // Sweep the sheet's row-level controls: each tap must CHANGE the sheet
        // (editor opens, chosen badge moves, row recomposes). Same chosen-row
        // exemption as loop-advance — a settled value re-render is legit-static.
        let swept = 0;
        for (let i = 0; i < 6; i++) {
          const row = sheet.locator('.frow .chip:visible[aria-pressed="false"], .decopt:visible:not(:has-text("chosen"))').nth(i);
          if (await row.count() === 0) break;
          const before = await read();
          await row.click({ timeout: 4000 }).catch(() => {});
          // POLL FOR THE CHANGE, don't sleep and hope. The old
          // `waitForTimeout(700)` paid 700ms on every row whether the sheet had
          // recomposed in 80ms or not — and this file runs its sweep six times
          // per state. It is also the exact idiom the config header names as the
          // suite's real flake source: a fixed sleep is a bet that the machine is
          // no slower than the day the number was picked.
          //
          // Polling is both faster AND a stronger assertion: it waits for the
          // thing the test is about instead of for the clock. The explicit expect
          // below still runs, so a genuinely dead row fails with its own message
          // rather than a poll timeout.
          let after = before;
          await expect.poll(async () => { after = await read(); return after !== before; },
            { timeout: 4000, intervals: [80, 120, 200, 300, 500] }).toBe(true).catch(() => {});
          expect(after !== before, `decisions row #${i + 1} changed nothing (dead row)`).toBe(true);
          swept++;
          await page.locator('.toast.on').waitFor({ state: 'hidden', timeout: 6000 }).catch(() => {});
        }
        if (swept === 0) test.skip(true, 'no unsettled decision rows on this state');
      });

      test('checklist CTA — a task action lands a real destination, never a dead tap', async ({ page }) => {
        test.setTimeout(60_000);
        behaviourOnly(test.info());
        await boot(page, state);
        await openSectionByName(page, 'Your checklist', { timeout: 5000 });
        await expect(page.locator('#sheet-title')).toHaveText('Your checklist', { timeout: 5000 });
        // First task-row action CTA (checklistActionFor renders it) — tapping it
        // must move the host somewhere real: the sheet title changes to the
        // destination sheet (the RIGHT-sheet claim the unit gate can't make), or
        // an in-sheet editor opens. Same-title + same-content = the audit's
        // fall-through dead-end class.
        const sheet = page.locator('.sheet').last();
        const cta = sheet.locator('.mini.rowlink:visible').first();
        if (await cta.count() === 0) { test.skip(true, 'no task CTA on this state'); return; }
        const focusSig = () => page.evaluate(() => {
          const f = document.querySelector('.rowfocus');
          return f ? (f.innerText || '').slice(0, 60) : '';
        });
        const beforeTitle = await page.locator('#sheet-title').innerText();
        const beforeBody = await sheet.innerText({ timeout: 1000 }).catch(() => '');
        const beforeFocus = await focusSig();
        await cta.click({ timeout: 4000 });
        await page.waitForTimeout(1200);
        // A route may legitimately CLOSE the sheet for a stage landing (the
        // day-of run of show) — sheet-gone is arrival, not a dead tap. All
        // reads bounded: a vanished element must answer in a beat, never the
        // 30s locator default (that wait was itself a probe timeout).
        const sheetGone = await page.evaluate(() => !document.querySelector('.sheet'));
        const afterTitle = await page.locator('#sheet-title').innerText({ timeout: 1500 }).catch(() => '');
        const afterBody = await page.locator('.sheet').last().innerText({ timeout: 1500 }).catch(() => '');
        const afterFocus = await focusSig();
        expect(sheetGone || afterTitle !== beforeTitle || afterBody !== beforeBody || afterFocus !== beforeFocus,
          'task CTA changed nothing — dead tap (fall-through class)').toBe(true);
      });

      test('fold peek — the pull handle is in the first viewport', async ({ page }) => {
        await boot(page, state);
        const grab = page.locator('.efold-grab');
        // ── THE FOLD MODEL IS A PHONE MODEL (host ruling 2026-08-07) ────────
        // "progress yes, fold no." A pull handle means "there is more below the
        // bottom edge", and a desktop canvas has no bottom edge in that sense:
        // `.escreen` is content-sized there, so the handle marked the foot of a
        // 324px block a third of the way down a 900px canvas.
        //
        // So this test now asserts the contract in BOTH directions rather than
        // skipping half of it — which matters, because two earlier versions of
        // this guard each silently disabled themselves. `count()` passes for a
        // display:none node, and a later `.app.has-more` guard would skip
        // everywhere the moment that class stopped existing.
        const isDesktopCanvas = await page
          .locator('.stagewrap--responsive-command[data-bp="desktop"]').count() > 0;
        if (isDesktopCanvas) {
          // The handle must be ABSENT here. Asserting the absence is what stops
          // it creeping back — it has done so twice already, once by escaping a
          // height-gated media query and once by auto-placing into a grid.
          const visibleGrabs = await grab.evaluateAll(
            (els) => els.filter((el) => el.getBoundingClientRect().height > 0).length);
          expect(visibleGrabs, 'a desktop canvas has no fold, so it must show no fold handle').toBe(0);
          return;
        }
        // Phone / tablet / tablet-land: the fold model applies and the peek
        // guarantee holds — the handle must exist and sit in the first viewport.
        if (await grab.count() === 0) { test.skip(true, 'no fold on this state (calm/day-of)'); return; }
        await expect(grab.first(), 'the fold model applies here, so the handle must render').toBeVisible({ timeout: 5000 });
        // Documented boundary: the peek guarantee applies when the ask FITS the
        // viewport. When the ask content itself exceeds it (short landscape),
        // scrolling is already inevitable and the handle follows the content.
        const askH = await page.locator('.escreen').first().evaluate(el => el.getBoundingClientRect().height).catch(() => 0);
        if (askH > page.viewportSize().height) { test.skip(true, 'ask exceeds viewport — peek boundary'); return; }
        const box = await grab.boundingBox();
        expect(box).not.toBeNull();
        expect(box.y).toBeLessThan(page.viewportSize().height); // inside the first viewport
      });
    }
  });
}
