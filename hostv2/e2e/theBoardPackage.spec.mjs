// ─── THE BOARD PACKAGE (owner-approved renders, 11/24/2026) ──────────────────
// The owner approved rendered mock-ups of the board and ruled each piece. Each
// is measured here, never eyeballed, on the owner's own plan typed into
// creation, with the page clock pinned to Monday 11/23/2026 (Thursday 11/26 is
// three days out):
//
//   1  NAV SELECTED STATE = UNDERLINE (renders 1a, 7). In the phone pill, the
//      768–1023 tall bar and the 13" rail's "Your event" group, the selected
//      stage has no circle, outline or box: a white semibold label with a short
//      2px bar beneath it, 60% of the label's width, centered in the pill and
//      the bar, left-aligned in the rail. The others are muted. One style.
import { test, expect } from '@playwright/test';
import { settled } from './fixtures.mjs';

const PHONE = { width: 390, height: 844 };
const TABLET = { width: 768, height: 1024 };
const TALL13 = { width: 1024, height: 1366 };
const TEXT = 'Thanksgiving dinner for 14 at my house on Thursday 11/26 at 3pm, budget $400';

const created = async (browser, vp, { touch = vp.width < 1100, init } = {}) => {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-11-23T12:00:00'));
  if (init) await page.addInitScript(init);
  await page.goto('./?elegant=1');
  await page.getByRole('button', { name: 'Start my event' }).first().click();
  await expect(page.getByText(/what are we planning/i)).toBeVisible({ timeout: 20_000 });
  await page.getByPlaceholder(/crab feast/i).first().fill(TEXT);
  await page.getByRole('button', { name: /^Put my plan together$/ }).click();
  const open = page.getByRole('button', { name: /^Open (your|my) plan/ });
  await expect(open).toBeVisible({ timeout: 25_000 });
  await open.click();
  await settled(page);
  await expect(page.locator('h2.ask').first()).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(700);
  return { ctx, page };
};

// ═══════════════════ 1. THE SELECTED STAGE IS UNDERLINED ═══════════════════
// Every stage button under `sel`: its box, its label and the label's ::after.
const stages = (page, sel) => page.evaluate((s) => {
  const res = (v) => { const p = document.createElement('div'); p.style.color = v; document.body.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
  return {
    ink: res('var(--ink)'), muted: res('var(--muted)'),
    rows: [...document.querySelectorAll(s)].map((b) => {
      const cs = getComputedStyle(b);
      // The label is the button's one text element (the rail's .srail-l, the
      // bar's .nav-l); on a bare-text button it is the button itself.
      const lab = b.querySelector('.srail-l, .nav-l') || b;
      const lr = lab.getBoundingClientRect();
      const ls = getComputedStyle(lab);
      const a = getComputedStyle(lab, '::after');
      const has = a.content !== 'none' && a.content !== 'normal' && a.display !== 'none';
      return {
        label: b.textContent.trim(), on: b.classList.contains('on') || b.classList.contains('is-stage'),
        bg: cs.backgroundColor, img: cs.backgroundImage, shadow: cs.boxShadow, outline: cs.outlineStyle === 'none' ? 0 : parseFloat(cs.outlineWidth),
        edges: ['Top', 'Right', 'Bottom', 'Left'].map((k) => (cs[`border${k}Color`] === 'rgba(0, 0, 0, 0)' ? 0 : parseFloat(cs[`border${k}Width`]))),
        ink: ls.color, weight: Number(ls.fontWeight),
        lw: lr.width, lh: lr.height,
        under: has ? { left: parseFloat(a.left), width: parseFloat(a.width), height: parseFloat(a.height), bottom: parseFloat(a.bottom), bg: a.backgroundColor } : null,
      };
    }),
  };
}, sel);

const SURFACES = [
  { name: 'the phone pill', vp: PHONE, sel: '[data-tt-bar] .tt-seg-b', align: 'center' },
  { name: 'the 768 tall bar', vp: TABLET, sel: '[data-tt-bar] .tt-seg-b', align: 'center' },
  { name: 'the 13" rail', vp: TALL13, sel: '.srail [data-rail-stage]', align: 'left' },
];

test('1: the selected stage is underlined, one style on the pill, the 768 bar and the 13" rail; the rest muted', async ({ browser }) => {
  test.setTimeout(150_000);
  const looks = [];
  for (const s of SURFACES) {
    const { ctx, page } = await created(browser, s.vp);
    const m = await stages(page, s.sel);
    const w = s.name;
    expect(m.rows.map((r) => r.label), `premise: ${w} shows the four stages`).toEqual(['Create', 'Plan', 'The Day', 'After']);
    const on = m.rows.filter((r) => r.on);
    expect(on.map((r) => r.label), w).toEqual(['Plan']);
    const p = on[0];
    expect.soft(p.bg, `${w}: no fill`).toBe('rgba(0, 0, 0, 0)');
    expect.soft(p.img, `${w}: no gradient`).toBe('none');
    expect.soft(p.shadow, `${w}: no ring`).toBe('none');
    expect.soft(p.edges, `${w}: no outline`).toEqual([0, 0, 0, 0]);
    expect.soft(p.outline, `${w}: no outline`).toBe(0);
    expect.soft(p.ink, `${w}: white (the ink)`).toBe(m.ink);
    expect.soft(p.weight, `${w}: semibold`).toBe(600);
    expect(p.under, `${w}: a bar beneath the label`).not.toBeNull();
    expect.soft(p.under.height, `${w}: 2px`).toBe(2);
    expect.soft(p.under.width / p.lw, `${w}: 60% of the label`).toBeCloseTo(0.6, 1);
    expect.soft(p.under.bottom, `${w}: beneath the label`).toBeLessThan(0);
    if (s.align === 'center') expect.soft(p.under.left + p.under.width / 2, `${w}: centered`).toBeCloseTo(p.lw / 2, 0);
    else expect.soft(p.under.left, `${w}: left-aligned`).toBe(0);
    for (const r of m.rows.filter((x) => !x.on)) {
      expect.soft(r.ink, `${w}: ${r.label} is muted`).toBe(m.muted);
      expect.soft(r.under, `${w}: ${r.label} has no bar`).toBeNull();
      expect.soft(r.edges, `${w}: ${r.label} has no outline`).toEqual([0, 0, 0, 0]);
    }
    looks.push(`${p.ink} ${p.weight} ${p.under.height} ${p.under.bg}`);
    await ctx.close();
  }
  expect(new Set(looks).size, `one shared style: ${looks.join(' | ')}`).toBe(1);
});
