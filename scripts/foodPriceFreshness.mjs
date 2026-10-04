#!/usr/bin/env node
// ─── IS THE FOOD-PRICE FACTOR STILL ADVANCING? ──────────────────────────────
//
// ADDED 2026-10-04, after the app spent some unknown stretch reporting April
// prices in October. The number itself was fine; its LABEL was built from a
// series outside the basket. Nobody noticed because nothing was looking.
//
// WHAT THIS IS NOT. It does not fetch BLS, does not edit anything, and does
// not fail a build. `sourceFreshness.js` is explicit and this obeys it: "a
// stale source is not a wrong source. It is a source nobody has looked at
// lately, and the only correct response is to tell a human." A red build here
// would be this script overruling that doctrine.
//
// WHY THE THRESHOLD IS THREE MONTHS. BLS Average Price ships with the CPI
// release, roughly two months behind: on 2026-10-04 their newest month was
// 2026-08, verified against the API. Two months behind is HEALTHY, so warning
// at two would cry wolf every single month and train everyone to ignore it.
// Three means a release was genuinely missed.
const BASE = process.env.API_BASE || 'https://ngw-events-api.onrender.com';
const WARN_MONTHS = Number(process.env.FOOD_PRICE_WARN_MONTHS || 3);
const REGIONS = ['ne', 'mw', 'south', 'west'];

const monthsBetween = (ym, now) => {
  const m = /^(\d{4})-(\d{2})$/.exec(ym || '');
  if (!m) return null;
  return (now.getUTCFullYear() - Number(m[1])) * 12 + (now.getUTCMonth() + 1 - Number(m[2]));
};

const get = async (path) => {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
};

const main = async () => {
  const now = new Date();
  const notes = [];
  let worst = null;

  // The key question first, and it costs no BLS quota to ask.
  try {
    const s = await get('/api/food-prices/status');
    if (!s.keyed) {
      notes.push('BLS_API_KEY is NOT set. Unregistered allows ~25 queries a day '
        + 'and a refusal is cached until UTC midnight, so the cap is a silent '
        + 'outage. Free registration: data.bls.gov/registrationEngine/');
    } else {
      notes.push(`BLS_API_KEY set (cap ${s.daily_query_cap}/day).`);
    }
  } catch (e) {
    notes.push(`status endpoint unreachable: ${e.message}`);
  }

  for (const region of REGIONS) {
    try {
      const d = await get(`/api/food-prices?region=${region}`);
      const behind = monthsBetween(d.month, now);
      const used = `${d.items_used} of ${(d.basket || []).length}`;
      if (behind == null) {
        notes.push(`${region}: NO month reported (items ${used})`);
        continue;
      }
      if (worst == null || behind > worst) worst = behind;
      const flag = behind > WARN_MONTHS ? '  <-- STALE' : '';
      notes.push(`${region}: ${d.month} (${behind} months behind, items ${used})${flag}`);
    } catch (e) {
      notes.push(`${region}: ${e.message}`);
    }
  }

  console.log('\n=== FOOD-PRICE FRESHNESS ===');
  for (const n of notes) console.log('  ' + n);
  if (worst != null && worst > WARN_MONTHS) {
    console.log(`\n  WARNING: the newest region is ${worst} months behind, past the `
      + `${WARN_MONTHS}-month threshold. BLS normally runs two months behind, so `
      + `this suggests a missed release, an exhausted quota, or a discontinued `
      + `series. Reported, not failed -- freshness warns, it never invalidates.`);
  }
  console.log('');
  // ALWAYS zero. See the doctrine note at the top of this file.
  process.exit(0);
};

main().catch((e) => { console.log('food-price freshness check errored: ' + e.message); process.exit(0); });
