// ─── THE BOARD'S ASK IS STEEL IN LIGHT (owner ruling 29, 11/21/2026) ─────────
//
// The owner, from a rendered comparison: "C: steel, like Your money". In LIGHT
// the board hero's primary (`.hero.elegant .cta`) wears the same lit steel as
// every sheet's `.cta`: background var(--cta-grad), label var(--on-steel). Its
// keycap depth stays, on a steel edge (--steel-dark) and the light panel shadow,
// never the near-black --key-edge that read as a heavy dark slab on the warm
// canvas. DARK is unchanged: the 7/31 soft tier (--sheen ground, --ink label,
// --key-edge keycap).
//
// The hero ask renders its `.cta` only in some states (most asks are decision
// rows or steppers). The recap of an event three days past always renders one,
// "Save what worked", so that is the state measured here.
//
// SELF-PINNED (playwright.config.mjs): drives 390x844 and 1024x1366 itself.
import { test, expect, settled, dateIn, goToStage } from './fixtures.mjs';

const PAST = {
  id: 'b29-past', name: 'Maya’s 40th Birthday', type: 'Birthday', createdAt: '2026-11-01',
  date: dateIn(-3), startTime: '18:00', startTimeSource: 'host',
  venue: 'The Ironwood Room', venueAddress: '41 Market St, Annapolis, MD', venueCity: 'Annapolis, MD',
  guestMode: 'list', guestEstimate: 14, guestCountSource: 'host',
  guests: [{ id: 'g1', name: 'Jordan Avery', rsvp: 'Yes' }, { id: 'g2', name: 'Riley Park', rsvp: 'Yes' }],
  vendors: [], budget: [{ id: 'food', category: 'Food', budgeted: 2500, actual: 0 }], timeline: [],
};

const boot = async (page, theme, [w, h]) => {
  await page.setViewportSize({ width: w, height: h });
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, PAST);
  await page.goto(`?theme=${theme}`);
  await settled(page);
  // Her own plan after its day lands on After (owner, 11/24/2026, cohesion
  // batch E); this ask is the Plan board's, so step there, as she would.
  await goToStage(page, 'Plan');
  const cta = page.locator('.hero.elegant .cta', { hasText: 'Save what worked' });
  await expect(cta, 'premise: the hero ask renders its .cta').toBeVisible();
  // the keycap transition is .1s; let any entrance settle before reading styles
  await page.waitForTimeout(400);
  return cta;
};

// Runs in the page: the button's computed look, and every token it is held to,
// resolved through a probe so the comparison is computed-to-computed.
const look = (el) => {
  const resolve = (prop, value) => {
    const p = document.createElement('div');
    p.style[prop] = value;
    document.body.appendChild(p);
    const v = getComputedStyle(p)[prop];
    p.remove();
    return v;
  };
  const cs = getComputedStyle(el);
  const rgba = (s) => { const m = (s.match(/[\d.]+/g) || []).map(Number); return [m[0], m[1], m[2], m[3] === undefined ? 1 : m[3]]; };
  const lum = ([r, g, b]) => {
    const c = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const label = rgba(cs.color);
  const stops = (cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(rgba);
  // Opaque shadow colors darker than any steel: the near-black keycap edge.
  const shadowColors = (cs.boxShadow.match(/rgba?\([^)]+\)/g) || []).map(rgba);
  const nearBlack = shadowColors.filter((c) => c[3] === 1 && Math.max(c[0], c[1], c[2]) < 40).map((c) => c.join(','));
  return {
    image: cs.backgroundImage, bgColor: cs.backgroundColor, color: cs.color, shadow: cs.boxShadow,
    lit: resolve('backgroundImage', 'var(--cta-grad)'),
    onSteel: resolve('color', 'var(--on-steel)'),
    ink: resolve('color', 'var(--ink)'),
    sheen: resolve('backgroundColor', 'var(--sheen)'),
    keyEdge: resolve('color', 'var(--key-edge)'),
    stopRatios: stops.map((s) => Math.round(ratio(label, s) * 100) / 100),
    // The button against what it sits on (UX_12 condition: the steel clears 3:1).
    groundRatios: (() => {
      let n = el.parentElement; let g = null;
      while (n && !g) { const c = rgba(getComputedStyle(n).backgroundColor); if (c[3] === 1) g = c; n = n.parentElement; }
      if (!g) g = rgba(getComputedStyle(document.body).backgroundColor);
      // The edge is a color-mix, which Chromium reports as color(srgb r g b / a) in 0–1.
      const edgeM = cs.boxShadow.match(/(rgba?\([^)]+\)|color\(srgb [^)]+\)) 0px 0px 0px 1px/);
      const e = !edgeM ? null : edgeM[1].startsWith('color(')
        ? (() => { const m = edgeM[1].match(/[\d.]+/g).map(Number); return [m[0] * 255, m[1] * 255, m[2] * 255, m[3] === undefined ? 1 : m[3]]; })()
        : rgba(edgeM[1]);
      const edge = e ? [0, 1, 2].map((i) => e[i] * e[3] + g[i] * (1 - e[3])) : null;
      return { stops: stops.map((s) => Math.round(ratio(s, g) * 100) / 100), edge: edge ? Math.round(ratio(edge, g) * 100) / 100 : null };
    })(),
    nearBlack,
  };
};

// Runs in the page: lit (--cta-grad) controls on the board, outside any sheet.
const litOnBoard = () => {
  const p = document.createElement('div');
  p.style.backgroundImage = 'var(--cta-grad)';
  document.body.appendChild(p);
  const lit = getComputedStyle(p).backgroundImage;
  p.remove();
  return [...document.querySelectorAll('button, a, [role="button"]')].filter((e) => {
    if (!e.getClientRects().length || e.closest('.sheet, [inert], [aria-hidden="true"]')) return false;
    const cs = getComputedStyle(e);
    return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.01 && cs.backgroundImage === lit;
  }).map((e) => (e.innerText || '').trim().slice(0, 40));
};

for (const size of [[390, 844], [1024, 1366]]) {
  test(`light: the board's ask wears the steel primary, keycap on a steel edge — ${size.join('x')}`, async ({ page }) => {
    const cta = await boot(page, 'light', size);
    const r = await cta.evaluate(look);
    test.info().annotations.push({ type: 'light', description: JSON.stringify({ shadow: r.shadow, stopRatios: r.stopRatios }) });
    expect(r.lit, 'premise: --cta-grad resolves to a gradient').toMatch(/^linear-gradient\(/);
    expect(r.image, 'background is the cta gradient').toBe(r.lit);
    expect(r.color, 'label is --on-steel').toBe(r.onSteel);
    expect(r.stopRatios.length, 'premise: three gradient stops measured').toBe(3);
    for (const x of r.stopRatios) expect(x, 'label on every gradient stop').toBeGreaterThanOrEqual(4.5);
    expect(r.shadow, 'the keycap edge stays').toMatch(/0px 3px 0px/);
    expect(r.nearBlack, 'no near-black keycap edge').toEqual([]);
    // One primary on the board: the ask is the only lit control outside a sheet.
    expect(await page.evaluate(litOnBoard)).toEqual(['Save what worked']);
    // The raised key still lifts on hover and its edge stays steel.
    if (size[0] >= 1024) {
      await cta.hover();
      await page.waitForTimeout(250);
      const hov = await cta.evaluate(look);
      expect(hov.image, 'hover keeps the gradient').toBe(hov.lit);
      expect(hov.shadow, 'hover lifts the edge to 4px').toMatch(/0px 4px 0px/);
      expect(hov.nearBlack, 'no near-black edge on hover').toEqual([]);
    }
  });

  // OWNER, 11/26/2026: "C". Rulings 29 and 31 kept the dark board's ask soft, and
  // on the dark card it read as one more dark slab: the attention cue could not
  // make it noticeable ("the cue wasn't noticeable enough"). Dark now wears the
  // same steel primary as light; still one lit control on the board.
  test(`dark: the board's ask wears the steel primary too — ${size.join('x')}`, async ({ page }) => {
    const cta = await boot(page, 'dark', size);
    const r = await cta.evaluate(look);
    test.info().annotations.push({ type: 'dark', description: JSON.stringify({ shadow: r.shadow, stopRatios: r.stopRatios, groundRatios: r.groundRatios }) });
    expect(r.image, 'background is the cta gradient').toBe(r.lit);
    expect(r.color, 'label is --on-steel').toBe(r.onSteel);
    expect(r.stopRatios.length, 'premise: three gradient stops measured').toBe(3);
    for (const x of r.stopRatios) expect(x, 'label on every gradient stop').toBeGreaterThanOrEqual(4.5);
    // The boundary clears 3:1 (UX_12): the gradient's deep stop alone measures
    // 2.74 on the dark ground, so the button draws a 1px steel edge.
    expect(Math.max(r.groundRatios.edge || 0, ...r.groundRatios.stops), 'the button\'s boundary against the dark ground').toBeGreaterThanOrEqual(3);
    expect(r.groundRatios.edge, 'the dark edge itself clears 3:1').toBeGreaterThanOrEqual(3);
    expect(r.shadow, 'the keycap edge stays').toMatch(/0px 3px 0px/);
    expect(await page.evaluate(litOnBoard)).toEqual(['Save what worked']);
  });
}
