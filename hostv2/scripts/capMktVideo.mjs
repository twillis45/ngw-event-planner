// ─── marketing-video capture — hostv2, iPhone profile, dev server ───────────
// node scripts/capMktVideo.mjs   (dev server on :5199 must be running)
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
let n = 0;
const shot = async (name) => { n++; const f = `${String(n).padStart(2,'0')}-${name}.png`; await p.screenshot({ path: path.join(OUT, f) }); console.log('shot', f); };
const swipe = async (dy) => { await p.evaluate(d => window.scrollBy({ top: d, behavior: 'instant' }), dy); };
const clickText = async (t) => {
  const loc = p.getByText(t, { exact: false }).first();
  try { await loc.click({ timeout: 4000 }); return true; } catch { console.log('MISS', t); return false; }
};

// 1 — welcome (forced) after splash settles
await p.goto(BASE + '?welcome', { waitUntil: 'domcontentloaded' });
await sleep(5200); // full splash film + settle
await shot('welcome');

// 2 — explore the sample → NOW-view hero
await clickText('Explore a sample first');
await sleep(2500);
await shot('now-hero');

// 3 — scroll the command surface
await swipe(700); await sleep(800); await shot('now-scroll-1');
await swipe(900); await sleep(800); await shot('now-scroll-2');
await swipe(1200); await sleep(800); await shot('now-scroll-3');

// 4 — sections, best-effort by label; return home between each
const SECTIONS = ['The spread & shopping', 'The crab order', 'Who pays for what',
  'Who sits where', 'Where everyone stays', 'What could go wrong', 'People you’re hiring'];
for (const s of SECTIONS) {
  await p.goto(BASE, { waitUntil: 'domcontentloaded' }); await sleep(1800);
  // open the section list if there's a "see all" / plan pull — try direct text first
  let ok = await clickText(s);
  if (!ok) { await swipe(1600); await sleep(500); ok = await clickText(s); }
  if (ok) { await sleep(1600); await shot(s.toLowerCase().replace(/[^a-z]+/g, '-')); }
}

// 5 — guest-facing invite
await p.goto(BASE + '?rsvp=crab', { waitUntil: 'domcontentloaded' });
await sleep(3500); await shot('invite-cover');
await swipe(900); await sleep(700); await shot('invite-rsvp');

await b.close();
console.log('DONE ->', OUT);
