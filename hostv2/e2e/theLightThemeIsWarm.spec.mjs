// ─── LIGHT IS WARM LINEN EVERYWHERE, NOT ONLY ON THE BOARD (11/22/2026) ──────
//
// Owner, on the Linen compare sheets: "Light theme is blue." The board and the
// sheets had moved to linen, and The Day had not: its ground and panels read
// the --carbon* ramp, whose light step is cool (#e4ecf3 page, #b9cedf edge).
// The iPad sheet scrim was a flat neutral black wash, gray over linen.
//
// So this walks the views in light and fails on any large surface (half the
// screen wide, 60px tall) whose own background, or any stop of its gradient,
// is a cool color: hue 180-260 at more than 8% saturation and 30% lightness.
// Buttons and links are excluded (steel stays the accent, ruling 25), and so
// are the fixed carbon stages under 30% lightness (the creation reveal and the
// welcome are dark in both themes by design). Scrims over a light page must be
// warm, not neutral black.
import { test, expect, openSectionByName, settled, sheetSettled, goToStage } from './fixtures.mjs';

const coolSurfaces = () => {
  const rgba = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const hsl = ([r, g, b]) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  };
  const cool = (c) => { const [h, s, l] = hsl(c); return h >= 180 && h <= 260 && s > 0.08 && l >= 0.3; };
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('button, a, [role=button], .reveal-stage, .welcome')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < innerWidth * 0.5 || r.height < 60 || r.bottom < 0 || r.top > innerHeight) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const colors = [];
    const bg = rgba(cs.backgroundColor); if (bg.length >= 3 && (bg[3] === undefined || bg[3] > 0)) colors.push(bg);
    for (const s of cs.backgroundImage.match(/rgba?\([^)]+\)/g) || []) { const c = rgba(s); if (c[3] === undefined || c[3] > 0) colors.push(c); }
    const bad = colors.filter(cool);
    if (bad.length) out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} rgb(${bad[0].slice(0, 3).join(',')})`);
  }
  return [...new Set(out)];
};

const scrimIsWarm = () => {
  const s = document.querySelector('.sheet-scrim');
  if (!s) return null;
  const [r, g, b] = (getComputedStyle(s).backgroundColor.match(/[\d.]+/g) || []).map(Number);
  return r > b + 8;   // umber, not neutral or cool black
};

const SECTIONS = ['Guests', 'Your money', 'Calls to make', 'People you’re hiring', 'The spread & shopping', 'Space, seats', 'Your checklist'];

const boot = async (page, fresh) => {
  await page.addInitScript((f) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    localStorage.setItem('ngw-theme', 'light');
    if (f) return;
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, fresh);
  await page.route('https://e2e-mock.invalid/**', (route) => route.fulfill({ status: 404, json: { detail: 'not found' } }));
  await page.goto('./?elegant=1');
};
// The phase switch wherever it is: the menu, or a tall iPad's docked bar.
const viaMenu = async (page, label) => {
  await goToStage(page, label);
  await page.waitForTimeout(1200);
};

for (const [w, h] of [[390, 844], [834, 1194]]) {
  test.describe(`light has no cool ground (${w}x${h})`, () => {
    test.beforeEach(async ({ page }, info) => {
      test.skip(info.project.name !== 'mobile', 'pins its own two geometries');
      await page.setViewportSize({ width: w, height: h });
    });

    test('the board, every section with its scrim, The Day and After', async ({ page }) => {
      test.setTimeout(120_000);
      await boot(page, false);
      await settled(page);
      const found = (await page.evaluate(coolSurfaces)).map((s) => `board: ${s}`);
      for (const name of SECTIONS) {
        await openSectionByName(page, name, { settle: 800 });
        await sheetSettled(page);
        found.push(...(await page.evaluate(coolSurfaces)).map((s) => `${name}: ${s}`));
        const warm = await page.evaluate(scrimIsWarm);
        if (warm === false) found.push(`${name}: the sheet scrim is neutral or cool`);
        await page.keyboard.press('Escape'); await page.waitForTimeout(300);
      }
      await viaMenu(page, 'The Day');
      found.push(...(await page.evaluate(coolSurfaces)).map((s) => `The Day: ${s}`));
      await viaMenu(page, 'After');
      found.push(...(await page.evaluate(coolSurfaces)).map((s) => `After: ${s}`));
      expect(found).toEqual([]);
    });

    // The day itself (#229's day-of hero on the board, "Run the day", and The
    // Day's run-of-show) reads the same tokens; walk it on Wanda's date.
    test('on the day: the board\'s day-of hero and The Day', async ({ page }) => {
      test.setTimeout(90_000);
      await page.clock.setFixedTime(new Date('2027-03-20T15:00:00'));
      await boot(page, false);
      await settled(page);
      const found = (await page.evaluate(coolSurfaces)).map((s) => `board, the day: ${s}`);
      expect(await page.locator('[data-dayof-cue], .hero.is-dayof').count(), 'premise: the board is in its day-of state').toBeGreaterThan(0);
      await viaMenu(page, 'The Day');
      found.push(...(await page.evaluate(coolSurfaces)).map((s) => `The Day, the day: ${s}`));
      expect(found).toEqual([]);
    });

    test('the welcome\'s next step: the create screen', async ({ page }) => {
      await boot(page, true);
      await page.getByRole('button', { name: 'Start my event' }).first().click({ timeout: 30_000 });
      await page.getByText(/what are we planning/i).first().waitFor({ timeout: 20_000 });
      await page.waitForTimeout(900);
      expect(await page.evaluate(coolSurfaces)).toEqual([]);
    });
  });
}
