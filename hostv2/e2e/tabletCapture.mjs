// Tablet-prototype stage-1 reference capture (not a test).
// Boots each seeded board state at the two UX_03 tablet sizes and saves
// viewport + full-page PNGs. Run: node e2e/tabletCapture.mjs <outDir>
// Assumes `npm run build` has produced dist/ (same contract as the matrix).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] || 'tablet-refs';
mkdirSync(OUT, { recursive: true });

const PORT = 5234;
const BASE = `http://127.0.0.1:${PORT}/ngw-event-planner/hostv2/`;

const COI_PATCH = {
  vendors: [
    { id: 'tdv-v1', name: 'Ironwood Room', category: 'Venue', status: 'Confirmed', cost: 2200, depositAmt: 600, depositPaid: true, balancePaid: true, contractSigned: true, arrivalTime: '3:00 PM', coiStatus: 'received', coiVerified: true },
    { id: 'tdv-v2', name: 'TSW Catering', category: 'Catering', status: 'Deposit Paid', cost: 4200, depositAmt: 800, depositPaid: true, balancePaid: false, contractSigned: true, arrivalTime: '4:00 PM', coiStatus: 'received', coiVerified: false },
  ],
};

const STATES = [
  { id: 'test-two-days', tag: 'T1-gamenight', weather: true },
  { id: 'test-day-before-vendors', tag: 'T5-dinner-coi', patch: COI_PATCH },
  { id: 'ev-x-repast', tag: 'T6-repast' },
  { id: 'ev-x-graduation', tag: 'T7-graduation-past' },
  { id: 'ev-x-wanda', tag: 'Tx-wanda-farout' },
];

const VIEWPORTS = [
  { w: 768, h: 1024, tag: '768' },
  { w: 1024, h: 768, tag: '1024' },
];

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

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
  { env: { ...process.env, E2E_BASE: '1' }, stdio: 'ignore' });
const ready = async () => {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(BASE); if (r.ok) return; } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('preview never became ready');
};

try {
  await ready();
  const browser = await chromium.launch();
  for (const state of STATES) {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
      const page = await ctx.newPage();
      if (state.weather) await stageWeather(page);
      await page.addInitScript(([id, patch]) => {
        localStorage.setItem('ngw-hostv2-last-event', id);
        if (patch) localStorage.setItem('ngw-hostv2-patch-' + id, JSON.stringify(patch));
        localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
        localStorage.setItem('ngw-welcomed', '1');
        localStorage.setItem('ngw-v2-welcomed', '1');
      }, [state.id, state.patch || null]);
      await page.goto(BASE + '?elegant=1');
      await page.waitForTimeout(1600);
      await page.locator('.splash').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${state.tag}-${vp.tag}.png` });
      await page.screenshot({ path: `${OUT}/${state.tag}-${vp.tag}-full.png`, fullPage: true });
      await ctx.close();
      console.log(`${state.tag} @ ${vp.tag} captured`);
    }
  }
  await browser.close();
} finally {
  server.kill();
}
