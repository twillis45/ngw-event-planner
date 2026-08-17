// ─── marketing-video capture pass 2 — plan surfaces ─────────────────────────
import { webkit, devices } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', '..', 'review-artifacts', '2026-08-10-marketing-video');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:5199/';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const b = await webkit.launch();
const ctx = await b.newContext({ ...devices['iPhone 15 Pro'] });
const p = await ctx.newPage();
const shot = async (f) => { await p.screenshot({ path: path.join(OUT, f + '.png') }); console.log('shot', f); };
const scrollInner = async (dy) => {
  await p.evaluate((d) => {
    const els = [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 40 && e.clientHeight > 300);
    const el = els.sort((a, b2) => b2.clientHeight - a.clientHeight)[0];
    if (el) el.scrollBy(0, d); else window.scrollBy(0, d);
  }, dy);
};
const clickText = async (t) => {
  const loc = p.getByText(t, { exact: false }).first();
  try { await loc.click({ timeout: 4000 }); return true; } catch { console.log('MISS', t); return false; }
};
const boot = async () => {
  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  await sleep(2600);
  await clickText('Explore a sample first'); // present only on first run per storage
  await sleep(2200);
};

// A — the full plan pull ("The rest of your plan")
await boot();
await clickText('The rest of your plan');
await sleep(1400); await shot('08-plan-pull');
await scrollInner(900); await sleep(600); await shot('09-plan-pull-scroll');

// B — the ordered next steps
for (const [label, file] of [
  ["Decide what you're serving", '10-serving'],
  ['Set your budget', '11-budget'],
  ['Confirm the start time', '12-start-time'],
]) {
  await boot();
  await scrollInner(700); await sleep(500);
  if (await clickText(label)) { await sleep(1800); await shot(file); }
}

// C — the menu (hamburger) — event switcher / sections
await boot();
await p.mouse.click(84, 145).catch(() => {});
await sleep(1200); await shot('13-menu');

await b.close();
console.log('DONE');
