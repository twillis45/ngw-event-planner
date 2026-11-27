// ─── THE BUDGET QUESTION WEARS T2 (owner, 11/27/2026: "T2 applied version is fine") ─
//
// The approved render put the budget question in the T2 mockup's own sizes
// (UX_12 decision T2: display weight 800, a big chosen figure with its per-head):
//   How much do you want to spend?        28px · 800 · tracking −0.02em, wraps plainly
//   $400  $33 a head · est.               52px · 800 · −0.02em; per-head 17px · 600
//   ┌ ( ) Lean               $100 ┐       one grouped card, 16px corners
//   │ ( ) Mid-range          $300 │       22px radios, 1.5px ring, a filled dot when on
//   │ (•) All-out            $400 │       labels in ink at 17px, amounts 16px
//   │     Covers your plan         │       green, 12px · 600 (owner: "why is green gone")
//   └ ( ) A different amount       ┘
// and dropped the card's own "Your budget" title, which repeated the question.
// Measured, not eyeballed: every number here is the mockup's. Made-up names only.
import { test, expect, settled, dateIn } from './fixtures.mjs';

const EVENT = {
  id: 't2-budget', name: 'Thanksgiving at the Lanes', type: 'Thanksgiving', createdAt: '2026-11-20',
  date: dateIn(21), startTime: '15:00', startTimeSource: 'host', venue: 'Our place', venueKind: 'home', venueCity: 'Springfield, VA',
  guestMode: 'count', guestCount: 12, guestCountSource: 'host', guests: [], vendors: [], budget: [], timeline: [],
};

const open = async (page, w, h, theme) => {
  await page.setViewportSize({ width: w, height: h });
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, EVENT);
  await page.goto('?elegant=1&theme=' + theme);
  await settled(page);
  await expect(page.locator('.hero h2.ask')).toHaveText('How much do you want to spend?');
};

const style = (page, sel, props) => page.locator(sel).first().evaluate((el, ps) => {
  const cs = getComputedStyle(el);
  return Object.fromEntries(ps.map((p) => [p, cs.getPropertyValue(p)]));
}, props);
const px = (v) => parseFloat(v);
const tokenRgb = (page, name) => page.evaluate((n) => {
  const d = document.createElement('i'); d.style.color = `var(${n})`; document.body.appendChild(d);
  const c = getComputedStyle(d).color; d.remove(); return c;
}, name);

for (const theme of ['dark', 'light'])
test(`the budget question in T2's sizes — 390x844 ${theme}`, async ({ page }) => {
  await open(page, 390, 844, theme);
  const hero = page.locator('.hero').first();

  // The card's "Your budget" title is gone: the question says it.
  await expect(hero.locator('.hero-card h3')).toHaveCount(0);

  // The question: 28 / 800 / −0.02em, plain wrap (not balance).
  const q = await style(page, '.hero h2.ask', ['font-size', 'font-weight', 'letter-spacing', 'text-wrap']);
  expect(px(q['font-size'])).toBe(28);
  expect(q['font-weight']).toBe('800');
  expect(px(q['letter-spacing'])).toBeCloseTo(-0.56, 2);   // the −0.02em floor, never tighter
  expect(q['text-wrap']).not.toContain('balance');

  // The figure and its per-head.
  const fig = await hero.locator('[data-budget-fig]').evaluate((el) => {
    const cs = getComputedStyle(el); return { fs: cs.fontSize, fw: cs.fontWeight, ls: cs.letterSpacing, t: el.textContent.trim() };
  });
  expect(fig.t).toBe('$400');
  expect(px(fig.fs)).toBe(52);
  expect(fig.fw).toBe('800');
  expect(px(fig.ls)).toBeCloseTo(-1.04, 2);
  const per = await style(page, '.hero [data-budget-per]', ['font-size', 'font-weight']);
  expect(px(per['font-size'])).toBe(17);
  expect(per['font-weight']).toBe('600');

  // The choices: one grouped card.
  const list = await style(page, '.hero .optlist[aria-label="Budget"]', ['background-color', 'border-top-left-radius']);
  expect(list['background-color']).toBe(await tokenRgb(page, '--card'));
  expect(px(list['border-top-left-radius'])).toBe(16);
  const dot = await style(page, '.hero .optlist[aria-label="Budget"] .optdot', ['width', 'height', 'border-top-width']);
  expect(px(dot.width)).toBe(22);
  expect(px(dot.height)).toBe(22);
  // Authored 1.5px; Chrome reports border widths snapped (1 here), so the check
  // is the ring's band, not its decimal: thicker than a hairline would fail it.
  expect(px(dot['border-top-width'])).toBeGreaterThanOrEqual(1);
  expect(px(dot['border-top-width'])).toBeLessThanOrEqual(1.5);
  const ink = await tokenRgb(page, '--ink');
  const lbl = await style(page, '.hero .optlist[aria-label="Budget"] .optrow:not(.on) .optlabel', ['font-size', 'color']);
  expect(px(lbl['font-size'])).toBe(17);
  expect(lbl.color).toBe(ink);
  const amt = await style(page, '.hero .optlist[aria-label="Budget"] .optsub', ['font-size']);
  expect(px(amt['font-size'])).toBe(16);
  // The picked row's dot is filled.
  const on = await hero.locator('.optlist[aria-label="Budget"] .optrow.on .optdot').evaluate((el) => getComputedStyle(el, '::after').content);
  expect(on).not.toBe('none');

  // "Covers your plan" is green again.
  const note = await style(page, '.hero .optlist[aria-label="Budget"] .optnote', ['font-size', 'font-weight', 'color']);
  expect(px(note['font-size'])).toBe(12);
  expect(note['font-weight']).toBe('600');
  expect(note.color).toBe(await tokenRgb(page, '--ok'));

  // Every row still clears the tap floor.
  for (const b of await hero.locator('.optlist[aria-label="Budget"] .optrow').all()) {
    expect((await b.boundingBox()).height).toBeGreaterThanOrEqual(44);
  }
});
