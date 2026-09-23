// ─── AUDIT DRIVE: AN 80TH BIRTHDAY, FROM THE FIRST SCREEN ───────────────────
//
// Not a guard. A capture run, prefixed `_` like the other capture specs so it
// stays out of the CI matrix. It creates a real event through the real creation
// flow — no localStorage seeding, because seeding skips exactly the screens the
// friction lives on — then walks the plan and photographs every surface at
// 390px, dumping the text of each so density and duplication can be counted
// rather than eyeballed.
import { test, expect, settled } from './fixtures.mjs';
import fs from 'node:fs';
import crypto from 'node:crypto';

const OUT = process.env.AUDIT_OUT || '/tmp/audit80';
fs.mkdirSync(OUT, { recursive: true });

// A capture that photographs an unchanged screen is worse than no capture: the
// first run produced two byte-identical files under different names and would
// have been audited as two surfaces. Every shot is fingerprinted, and a repeat
// is recorded as a repeat.
const seenHashes = new Map();
const shot = async (page, name) => {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  const txt = await page.evaluate(() => (document.body.innerText || '').replace(/\n{3,}/g, '\n\n'));
  fs.writeFileSync(`${OUT}/${name}.txt`, txt);
  const h = crypto.createHash('md5').update(txt).digest('hex');
  if (seenHashes.has(h)) console.log(`DUPLICATE SCREEN: ${name} === ${seenHashes.get(h)} (navigation did not move)`);
  else seenHashes.set(h, name);
  return txt;
};

// Every visible box, so spacing and density are measured rather than judged.
//
// THE SCROLLER IS NOT THE DOCUMENT. The first run of this reported every screen
// as exactly 1.00 viewports tall, which is not a finding about the design — it
// is the shell scrolling an inner container while documentElement stays fixed.
// Measuring the document here answers a question nobody asked. The real
// scroller is found by looking for it.
const metrics = (page) => page.evaluate(() => {
  const scroller = [...document.querySelectorAll('body *')]
    .filter((el) => el.scrollHeight > el.clientHeight + 40 && el.clientHeight > 200)
    .sort((a, b) => b.scrollHeight - a.scrollHeight)[0] || document.documentElement;
  const vis = [...document.querySelectorAll('body *')].filter((el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  });
  const tap = vis.filter((el) => /^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)
    || el.getAttribute('role') === 'button');
  const small = tap.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.height < 44 || r.width < 44;
  }).map((el) => `${el.tagName}.${(el.className || '').toString().split(' ')[0]} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)} "${(el.innerText || '').trim().slice(0, 28)}"`);
  // Repeated visible strings — the duplication signal.
  const seen = {};
  for (const el of vis) {
    if (el.children.length) continue;                 // leaves only
    const t = (el.innerText || '').trim();
    if (t.length < 8 || t.length > 90) continue;
    seen[t] = (seen[t] || 0) + 1;
  }
  const dupes = Object.entries(seen).filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1]).slice(0, 14);
  return {
    scrollerTag: scroller === document.documentElement ? 'document'
      : scroller.tagName + '.' + (scroller.className || '').toString().split(' ')[0],
    contentHeight: scroller.scrollHeight,
    viewport: window.innerHeight,
    screensTall: +(scroller.scrollHeight / window.innerHeight).toFixed(2),
    horizontalScroll: document.documentElement.scrollWidth > window.innerWidth + 1,
    scrollWidth: document.documentElement.scrollWidth,
    visibleEls: vis.length,
    tapTargets: tap.length,
    tapUnder44: small.length,
    tapUnder44Sample: small.slice(0, 12),
    repeatedStrings: dupes,
  };
});

const tapText = (page, src) => page.evaluate((s) => {
  const rx = new RegExp(s, 'i');
  const el = [...document.querySelectorAll('button,[role="button"],a,.frow,.tab')]
    .find((x) => rx.test((x.innerText || '').trim()));
  if (!el) return null;
  el.click();
  return (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 50);
}, src);

test('drive an 80th birthday from creation and photograph everything', async ({ page }) => {
  test.setTimeout(240000);
  const report = {};
  await page.setViewportSize({ width: 390, height: 844 });

  // ── 1. cold open ────────────────────────────────────────────────────────
  await page.addInitScript(() => {
    try { localStorage.clear(); } catch { /* private mode */ }
  });
  await page.goto('./?elegant=1');
  await settled(page);
  await shot(page, '01-cold-open');
  report['01-cold-open'] = await metrics(page);

  // ── 2. the creation flow, as a host meets it ────────────────────────────
  const started = await tapText(page, 'Start my event');
  console.log('START:', started);
  await page.waitForTimeout(900);
  await settled(page);
  await shot(page, '02-say-it');
  report['02-say-it'] = await metrics(page);

  // A real sentence a host would actually type. Deliberately NOT tidy — it
  // carries a date, a headcount, a venue hint and a constraint in one breath,
  // which is how people write and is what the parser has to survive.
  const SENTENCE = "Mom's 80th birthday party on June 14 2027, about 45 people, "
    + 'at the church hall in Baltimore, sit-down lunch, she uses a walker';
  const box = page.getByPlaceholder(/crab feast/i).first();
  await box.fill(SENTENCE);
  await page.waitForTimeout(300);
  await shot(page, '03-typed');

  await tapText(page, 'Say it');
  await page.waitForTimeout(1600);
  await settled(page);
  await shot(page, '04-parsed');
  report['04-parsed'] = await metrics(page);

  // ── 3. through to the plan ──────────────────────────────────────────────
  for (let i = 0; i < 6; i++) {
    const hit = await tapText(page, 'Put my plan together|Open your plan|Continue|Next');
    if (!hit) break;
    console.log('ADVANCE:', hit);
    await page.waitForTimeout(1500);
    await settled(page);
    await shot(page, `05-advance-${i + 1}`);
  }
  await settled(page);
  const plan = await shot(page, '06-plan');
  report['06-plan'] = await metrics(page);
  console.log('PLAN TEXT LENGTH:', plan.length);

  // ── 4. every tab a host can reach ───────────────────────────────────────
  // Measured off the shell's own route values (tab: '...') plus the summary
  // rows on the plan, rather than guessed from what looks like a tab bar —
  // this app opens SHEETS, it has no tab bar, and the first run's guess found
  // four names of which one was a no-op.
  const WANTED = ['Guests', 'Food', 'Budget', 'Vendors', 'Calls to make', 'Checklist',
    'Planning', 'Timeline', 'Event Details', 'Seating'];
  const tabs = await page.evaluate((w) => {
    const labels = [...document.querySelectorAll('button,[role="button"],a,.frow')]
      .map((x) => (x.innerText || '').trim().split('\n')[0].trim());
    return w.filter((t) => labels.some((l) => l.toLowerCase() === t.toLowerCase()));
  }, WANTED);
  console.log('TABS FOUND:', JSON.stringify([...new Set(tabs)]));
  for (const t of [...new Set(tabs)]) {
    const hit = await tapText(page, '^' + t + '$');
    if (!hit) continue;
    await page.waitForTimeout(1200);
    await settled(page);
    await shot(page, `07-tab-${t.toLowerCase().replace(/\s+/g, '-')}`);
    report[`07-tab-${t.toLowerCase().replace(/\s+/g, '-')}`] = await metrics(page);
  }

  fs.writeFileSync(`${OUT}/metrics.json`, JSON.stringify(report, null, 2));
  console.log('WROTE:', fs.readdirSync(OUT).length, 'files to', OUT);
  expect(Object.keys(report).length).toBeGreaterThan(3);
});
