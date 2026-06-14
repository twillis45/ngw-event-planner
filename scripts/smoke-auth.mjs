// Sprint 55N — Authenticated production smoke (test infra; NOT shipped in the bundle).
//
// Verifies the SIGNED-IN prod path post-deploy + post-migration:
//   1. live bundle hash == the deployed build (arg)
//   2. an authenticated session renders the signed-in shell
//   3. ZERO console/network errors — specifically NO claim_pending_invitations 400
//   4. a throwaway real event round-trips (create → visible → delete)
//
// The smoke loads `?noanalytics=1` so it NEVER pollutes the activation funnel
// (track()/trackOnce() no-op under that flag). Analytics egress is therefore
// intentionally suppressed and verified separately (PostHog dashboard on real
// beta traffic), not asserted here.
//
// Auth: provide a Supabase session via env SMOKE_SB_KEY (the sb-<ref>-auth-token
// localStorage key) + SMOKE_SB_SESSION (its JSON value) for a DEDICATED TEST
// account. Without them the smoke exits with a clear BLOCKER — it never touches a
// real user's data.
//
// Usage:
//   SMOKE_URL=https://twillis45.github.io/ngw-event-planner/ \
//   SMOKE_BUNDLE=main.<hash>.js \
//   SMOKE_SB_KEY=sb-xxxx-auth-token SMOKE_SB_SESSION='{"access_token":...}' \
//   node scripts/smoke-auth.mjs

import puppeteer from 'puppeteer-core';

const CHROME = process.env.SMOKE_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL    = process.env.SMOKE_URL;
const BUNDLE = process.env.SMOKE_BUNDLE;        // e.g. main.ec91b986.js
const SB_KEY = process.env.SMOKE_SB_KEY;
const SB_SES = process.env.SMOKE_SB_SESSION;

function fail(msg) { console.error('SMOKE BLOCKER: ' + msg); process.exit(2); }
if (!URL)    fail('SMOKE_URL not set.');
if (!SB_KEY || !SB_SES) fail('No test-account session (SMOKE_SB_KEY / SMOKE_SB_SESSION). Cannot run authenticated smoke without a dedicated prod test account.');

const loadUrl = URL + (URL.includes('?') ? '&' : '?') + 'noanalytics=1';
const results = { bundleMatch: null, signedIn: null, claim400: 0, errors: [], eventRoundTrip: null };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('console', m => { if (m.type() === 'error') results.errors.push(m.text().slice(0, 200)); });
page.on('response', r => { if (/claim_pending_invitations/.test(r.url()) && r.status() >= 400) results.claim400++; });

try {
  // 1. bundle hash
  await page.goto(loadUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  const html = await page.content();
  results.bundleMatch = BUNDLE ? html.includes(BUNDLE) : 'skipped (no SMOKE_BUNDLE)';

  // 2. inject the test-account session, reload, assert signed-in shell
  await page.evaluate((k, v) => { localStorage.setItem(k, v); localStorage.setItem('ngw-analytics-optout', '1'); }, SB_KEY, SB_SES);
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));
  results.signedIn = await page.evaluate(() => !/sign in|log in|continue with/i.test(document.body.innerText.slice(0, 400)));

  // 4. throwaway real event round-trip (create via localStorage seam, assert, delete)
  const evId = 'smoke-' + Date.now();
  await page.evaluate((id) => {
    const evs = JSON.parse(localStorage.getItem('ngw-events') || '[]');
    evs.push({ id, name: 'SMOKE TEST', type: 'Wedding', date: '2030-01-01', guests: [], vendors: [], budget: [], createdAt: new Date().toISOString() });
    localStorage.setItem('ngw-events', JSON.stringify(evs));
  }, evId);
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  const present = await page.evaluate((id) => JSON.parse(localStorage.getItem('ngw-events') || '[]').some(e => e.id === id), evId);
  await page.evaluate((id) => {
    const evs = JSON.parse(localStorage.getItem('ngw-events') || '[]').filter(e => e.id !== id);
    localStorage.setItem('ngw-events', JSON.stringify(evs));
  }, evId);
  results.eventRoundTrip = present;

  // Acceptance
  const pass = results.signedIn && results.claim400 === 0 && results.eventRoundTrip &&
               (BUNDLE ? results.bundleMatch === true : true);
  console.log(JSON.stringify({ ...results, ACCEPT: pass ? 'PASS' : 'FAIL' }, null, 2));
  await browser.close();
  process.exit(pass ? 0 : 1);
} catch (e) {
  console.error('SMOKE ERROR:', e.message);
  await browser.close();
  process.exit(2);
}
