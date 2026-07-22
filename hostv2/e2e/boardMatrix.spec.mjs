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
import { test, expect } from '@playwright/test';

const COI_PATCH = {
  vendors: [
    { id: 'tdv-v1', name: 'Ironwood Room', category: 'Venue', status: 'Confirmed', cost: 2200, depositAmt: 600, depositPaid: true, balancePaid: true, contractSigned: true, arrivalTime: '3:00 PM', coiStatus: 'received', coiVerified: true },
    { id: 'tdv-v2', name: 'TSW Catering', category: 'Catering', status: 'Deposit Paid', cost: 4200, depositAmt: 800, depositPaid: true, balancePaid: false, contractSigned: true, arrivalTime: '4:00 PM', coiStatus: 'received', coiVerified: false },
  ],
};

// The seeded states — the same roster the live drives used. Weather is staged
// deterministically for the outdoor T-2 event via route interception.
const STATES = [
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
  await page.waitForTimeout(1600); // quick-splash + settle beat
  await page.locator('.splash').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(300);
};

for (const state of STATES) {
  test.describe(state.label, () => {
    test('display lint — no machinery in visible copy', async ({ page }) => {
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

    test('loop-advance — a settle tap must move the board', async ({ page }) => {
      await boot(page, state);
      // The hero's actionable controls, most-specific first: decision/resolution
      // rows, then an in-place settle CTA (.cta.stay). Route-out CTAs are
      // excluded — navigation is its own advance.
      const control = page.locator('.decopt, .cta.stay').first();
      if (await control.count() === 0) { test.skip(true, 'no in-place settle on this state'); return; }
      const heroBefore = await page.locator('h2').first().innerText().catch(() => '');
      const bodyBefore = await page.locator('.hzone').innerText().catch(() => '');
      await control.click();
      await page.waitForTimeout(900);
      const heroAfter = await page.locator('h2').first().innerText().catch(() => '');
      const bodyAfter = await page.locator('.hzone').innerText().catch(() => '');
      // The W14b assertion: SOMETHING moved — the ask rolled, the panel
      // recomposed, or a settled state replaced the options.
      expect(heroAfter !== heroBefore || bodyAfter !== bodyBefore).toBe(true);
    });

    test('pinned geometry + scroll-end reachability', async ({ page }) => {
      await boot(page, state);
      // Real wheel scrolls (programmatic scrollTop doesn't flip the
      // IntersectionObserver that raises the pinned stack). Scroll until the
      // scroller is genuinely AT its end — mid-scroll there is always content
      // behind the pinned bar, so the reachability claim only exists at the end.
      await page.mouse.move(215, 430); // wheel events land at the pointer — put it IN the app
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
      test('fold peek — the pull handle is in the first viewport', async ({ page }) => {
        await boot(page, state);
        const grab = page.locator('.efold-grab');
        if (await grab.count() === 0) { test.skip(true, 'no fold on this state (calm/day-of)'); return; }
        const box = await grab.boundingBox();
        expect(box).not.toBeNull();
        expect(box.y).toBeLessThan(860); // inside the 430×860 viewport
      });
    }
  });
}
