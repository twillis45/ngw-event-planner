// ─── THE AUDIT'S P1 TEXT READS, ON SCREEN, AT ITS LOWEST POINT (11/22/2026) ──
//
// Audit 2, lane F measured these under 4.5:1 at 390, and the token census
// (test/statusInkClearsItsTint.test.mjs) cannot see three of the causes,
// because they are not tokens:
//   P1-1  dark: the board pills, "Sample", the RSVP tags and filter chips on
//         their own tints under the glow's top stop (3.72-4.47);
//   P1-2  light: the pass chip and After's "What carries forward" (4.13), and
//         After's subtitle (3.62), which also BREATHES to .82 opacity;
//   P1-3  the create screen's subtitle at that breath's low point (3.96 dark,
//         3.76 light);
//   P1-6  the reveal's "why" lines (an extra .82 opacity, 4.32) and its
//         footer in the faint tier (4.09).
//
// The measure is lightThemeContrast's (every gradient stop, translucent layers
// composited), with one addition: an element's opacity is taken at the LOWEST
// keyframe of any running opacity animation on it or an ancestor, so a line
// that dips under AA once every seven seconds fails here every time.
import { test, expect, openSectionByName, settled, sheetSettled, dateIn, goToStage, openMenuDoor } from './fixtures.mjs';
import { previewUrl } from '../deployBase.mjs';

const measure = ([sel, scopeSel]) => {
  const lum = ([r, g, b]) => {
    const c = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const rgba = (s) => { const m = (s.match(/[\d.]+/g) || []).map(Number); return m.length >= 3 ? [m[0], m[1], m[2], m[3] === undefined ? 1 : m[3]] : null; };
  const over = (top, under) => top.slice(0, 3).map((v, i) => v * top[3] + under[i] * (1 - top[3]));
  // The opacity a node reaches at its lowest: the smaller of its computed value
  // and every opacity keyframe of the animations running on it.
  const lowest = (n) => {
    let o = Number(getComputedStyle(n).opacity);
    for (const a of n.getAnimations ? n.getAnimations() : []) {
      const ks = (a.effect && a.effect.getKeyframes ? a.effect.getKeyframes() : []).map((k) => Number(k.opacity)).filter((v) => !Number.isNaN(v));
      if (ks.length && a.playState === 'running' && (a.effect.getComputedTiming().iterations === Infinity)) o = Math.min(o, ...ks);
    }
    return o;
  };
  const els = new Set();
  for (const root of document.querySelectorAll(sel)) {
    if (scopeSel && !root.closest(scopeSel)) continue;
    els.add(root); for (const d of root.querySelectorAll('*')) els.add(d);
  }
  const out = [];
  for (const el of els) {
    const text = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
    if (!text || el.closest('button:disabled, [aria-disabled="true"]')) continue;
    const box = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (!box.width || !box.height || cs.visibility === 'hidden') continue;
    let op = 1;
    for (let n = el; n; n = n.parentElement) op *= lowest(n);
    if (op < 0.02) continue;
    const layers = [];
    let grounds = [[255, 255, 255]];
    let wash = null;
    for (let n = el; n; n = n.parentElement) {
      const ncs = getComputedStyle(n);
      if (!wash && /gradient/.test(ncs.backgroundImage)) {
        const all = (ncs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(rgba).filter(Boolean);
        if (all.length && all.every((x) => x[3] < 1)) wash = all;
      }
      const stops = /gradient/.test(ncs.backgroundImage) ? (ncs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(rgba).filter((x) => x && x[3] === 1) : [];
      if (stops.length) { grounds = stops.map((x) => x.slice(0, 3)); break; }
      const b = rgba(ncs.backgroundColor);
      if (!b || b[3] === 0) continue;
      if (b[3] === 1) { grounds = [b.slice(0, 3)]; break; }
      layers.push(b);
    }
    if (wash) grounds = grounds.flatMap((g) => [g, ...wash.map((w) => over(w, g))]);
    const c = rgba(cs.color);
    let worst = null;
    for (let g of grounds) {
      for (const l of layers.slice().reverse()) g = over(l, g);
      const r = ratio(over([c[0], c[1], c[2], c[3] * op], g), g);
      if (worst === null || r < worst) worst = r;
    }
    const px = parseFloat(cs.fontSize);
    const large = px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700);
    out.push({ what: `${String(el.className) || el.tagName} "${text.slice(0, 30)}"`, ratio: Math.round(worst * 100) / 100, floor: large ? 3 : 4.5 });
  }
  return out;
};

const check = (rows, where) => {
  expect(rows.length, `premise: something was measured on ${where}`).toBeGreaterThan(0);
  const low = rows.filter((r) => r.ratio < r.floor).map((r) => `${r.ratio.toFixed(2)}  ${r.what}`);
  expect(low, `${where}: text under its floor`).toEqual([]);
};

const seed = async (page, theme, events, lastId) => {
  await page.addInitScript(([th, evs, last]) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    localStorage.setItem('ngw-theme', th);
    if (!last) return;
    if (evs.length) localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify(evs));
    localStorage.setItem('ngw-hostv2-last-event', last);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, [theme, events, lastId]);
  await page.route('https://e2e-mock.invalid/**', (route) => route.fulfill({ status: 404, json: { detail: 'not found' } }));
};

// thePassIsOnTheBoard's event: a destination that takes the pass.
const PASS_EV = { id: 'cust-board-pass', name: 'Lake House Weekend', type: 'Birthday Party', date: dateIn(60),
  guestEstimate: 12, guestMode: 'count', guestCountSource: 'host', budget: [], vendors: [], guests: [], timeline: [],
  isDestination: true, passRequired: true, passReasons: ['destination'] };

const PASSGATE_API = 'https://passgate-mock.invalid';
const passgate = async (page) => {
  await page.route(PASSGATE_API + '/**', (route) => route.fulfill({ status: 200, json: {} }));
  await page.route(PASSGATE_API + '/api/capabilities', (route) => route.fulfill({ status: 200, json: { stripe_configured: true, stripe_can_honour_purchases: true } }));
  await page.route(PASSGATE_API + '/api/stripe/pass**', (route) => route.fulfill({ status: 200, json: { event_id: PASS_EV.id, held: false } }));
};

// Through the shared doors (the phone has no ☰ since owner ruling 1, 11/23/2026).
const menu = async (page, label) => {
  if (['Create', 'Plan', 'The Day', 'After'].includes(label)) await goToStage(page, label);
  else await openMenuDoor(page, label);
  await page.waitForTimeout(1200);
};

for (const theme of ['dark', 'light']) {
  test.describe(`the audit's P1 text reads (${theme})`, () => {
    test.beforeEach(async ({ page }, info) => {
      test.skip(info.project.name !== 'mobile', 'measured at the phone the audit measured; tokens are covered at every width by the census');
      await page.setViewportSize({ width: 390, height: 844 });
    });

    test('the board pills, the Sample chip and the progress line (Wanda)', async ({ page }) => {
      await seed(page, theme, [], 'ev-x-wanda');
      await page.goto('./?elegant=1');
      await settled(page);
      await page.waitForTimeout(800);
      check(await page.evaluate(measure, ['.pill, .eb-sample, .eprog-labels', null]), 'board');
    });

    // The pass chip shows only where billing is live: the passgate bundle, with
    // the capability mocked (thePassIsOnTheBoard's harness).
    test('the pass chip (billing live)', async ({ page }) => {
      await seed(page, theme, [PASS_EV], PASS_EV.id);
      await passgate(page);
      await page.goto(previewUrl(Number(process.env.PW_PASSGATE_PORT || 5266)) + '?elegant=1');
      await settled(page);
      await page.locator('.pass-status-needed').first().waitFor({ timeout: 15_000 });
      await page.waitForTimeout(800);
      check(await page.evaluate(measure, ['.pass-status-needed', null]), 'the pass chip');
    });

    test('the RSVP tags and the filter chips (Wanda)', async ({ page }) => {
      await seed(page, theme, [], 'ev-x-wanda');
      await page.goto('./?elegant=1');
      await settled(page);
      await openSectionByName(page, 'Guests', { settle: 800 });
      await sheetSettled(page);
      check(await page.evaluate(measure, ['.tag, .rtool-lens .chip', '.sheet']), 'Guests');
    });

    test('After: its subtitle at the breath\'s low point, and what carries forward', async ({ page }) => {
      await seed(page, theme, [], 'ev-x-wanda');
      await page.goto('./?elegant=1');
      await settled(page);
      await menu(page, 'After');
      check(await page.evaluate(measure, ['.mega-sub, section > .empty', null]), 'After');
    });

    test('the create screen\'s subtitle, and the reveal\'s why lines and footer', async ({ page }) => {
      test.setTimeout(90_000);
      await seed(page, theme, [], null);
      await page.goto('./?elegant=1');
      await page.getByRole('button', { name: 'Start my event' }).first().click({ timeout: 30_000 });
      await page.getByText(/what are we planning/i).first().waitFor({ timeout: 20_000 });
      await page.waitForTimeout(900);
      check(await page.evaluate(measure, ['.create-stage .mega-sub', null]), 'create');
      await page.getByPlaceholder(/crab feast/i).first().fill('Backyard crab feast for 20 people on Saturday');
      await page.getByRole('button', { name: /^Put my plan together$/ }).click();
      await page.getByRole('button', { name: /^Open your plan$|^Keep this plan$/ }).waitFor({ timeout: 30_000 });
      await page.waitForTimeout(6000);
      check(await page.evaluate(measure, ['.rv-swhy, .reveal-stage .grounding', null]), 'the reveal');
    });

  // Coordinator, 11/22/2026: on the create screen in dark the type guess
  // ("Reading this as a birthday from "80th" — …") was bright amber body
  // copy, the same "dirty orange" the owner rejected in light. B's treatment
  // in both themes: the sentence in the calm text tier, the guessed type as an
  // umber-on-honey chip carrying the signal.
  test('the create screen\'s type guess: calm text, the guess on a honey chip', async ({ page }) => {
    test.setTimeout(90_000);
    await seed(page, theme, [], null);
    await page.goto('./?elegant=1');
    await page.getByRole('button', { name: 'Start my event' }).first().click({ timeout: 30_000 });
    await page.getByText(/what are we planning/i).first().waitFor({ timeout: 20_000 });
    await page.getByPlaceholder(/crab feast/i).first().fill('Mom’s 80th, about 30 people, Saturday afternoon');
    const note = page.locator('p.grounding', { hasText: 'Reading this as' }).first();
    await note.waitFor({ timeout: 10_000 });
    const got = await note.evaluate((p) => {
      const tok = (n) => { const d = document.createElement('div'); d.style.color = `var(${n})`; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; };
      const strong = p.querySelector('strong');
      return { text: getComputedStyle(p).color, warn: tok('--warn'), muted: tok('--muted'),
        chip: getComputedStyle(strong).backgroundColor, honey: tok('--honey') };
    });
    expect(got.text, 'the sentence is not warning-colored body copy').not.toBe(got.warn);
    expect(got.text, 'the sentence reads in the calm meta tier').toBe(got.muted);
    expect(got.chip, 'the guessed type sits on the honey chip').toBe(got.honey);
    check(await page.evaluate(measure, ['p.grounding', '.create-stage']), 'the type guess');
  });
});
}

