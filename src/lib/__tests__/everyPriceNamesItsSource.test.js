// ─── EVERY PRICE NAMES ITS SOURCE, OR SAYS IT HAS NONE (owner rule, 11/22/2026) ──
//
// "Every price traces to a cited source; never invent a price. If a real source
// can't be found, the line must be LABELED to the host as an estimate without a
// source (or pending), not silently badged as sourced."
//
// Audit 2 lane G found 119 priced lines with no cited `costProvenance` and
// nothing that enforced one: `noCostFactorWithoutASource` and
// `playbookContract` check cost FACTORS and decisions, never the price on a
// line, and the engine-built lines (the catering band, the vegetarian main)
// never attached a source at all. Thanksgiving's prepared-dinner vendor is
// cited, and the citation was dropped on the way to the line.
//
// THE CENSUS. Every playbook, at 12 / 40 / 120 guests on its defaults and at
// 40 on every option of every decision, plus a booked caterer's quote and three
// vegetarian guests. Every line with a price on it must carry `priceBasis`, and
// that basis must be one of:
//   cited     its cost block (or the shared slot) resolves in COST_SOURCES
//   host      her own number: a dish she added with a cost, a price she locked
//   quote     her caterer's quote or booking
//   estimate  NO source — and only when the line is acknowledged, by name, in
//             UNSOURCED_PRICE_LINES with the reason. The host is told
//             "Estimate — no price source yet".
// An unacknowledged uncited line still renders the estimate label (the host is
// never misled), but it fails here, so a new uncited price cannot ship quietly.
// And the list cannot go stale: an acknowledged line that is now cited, or no
// longer exists, fails too, so citing a line means removing it from the list.
import { ALL_PLAYBOOKS, playbookFoodPlan } from '../playbooks';
import { UNSOURCED_PRICE_LINES, PRICE_BASIS_LABELS, priceSourceKey } from '../priceBasis';

const BANDS = [12, 40, 120];
const base = (type, n, extra = {}) => ({
  id: 'census', type, date: '2026-12-12', guestEstimate: n, guestMode: 'count', guestCountSource: 'host', ...extra,
});

function walk() {
  const seen = new Map();   // key -> { kinds:Set, label, example }
  const bad = [];
  const record = (pb, ctx, fp) => {
    for (const l of (fp && fp.list) || []) {
      if (!l || !(Number(l.high) > 0 || Number(l.low) > 0)) continue;
      const b = l.priceBasis;
      const key = priceSourceKey(pb.type, l.id);
      if (!b || !b.kind) { bad.push(`${key} (${ctx}): no priceBasis`); continue; }
      if (!['cited', 'host', 'quote', 'estimate'].includes(b.kind)) { bad.push(`${key} (${ctx}): kind ${b.kind}`); continue; }
      if (b.kind === 'estimate') {
        if (b.label !== PRICE_BASIS_LABELS.estimate) bad.push(`${key} (${ctx}): estimate without its label`);
        if (!b.acknowledged) bad.push(`${key} (${ctx}): uncited and not in UNSOURCED_PRICE_LINES — cite it or acknowledge it`);
      }
      const s = seen.get(b.acknowledgedAs || key) || { kinds: new Set() };
      s.kinds.add(b.kind);
      seen.set(b.acknowledgedAs || key, s);
    }
  };
  for (const pb of ALL_PLAYBOOKS) {
    for (const n of BANDS) record(pb, `default@${n}`, playbookFoodPlan(base(pb.type, n)));
    record(pb, 'veg@40', playbookFoodPlan(base(pb.type, 40, { dietCounts: { Vegetarian: 3 } })));
    for (const d of pb.decisions || []) {
      for (const o of d.options || []) {
        record(pb, `${d.id}=${o}@40`, playbookFoodPlan(base(pb.type, 40, { foodChoices: { [d.id]: o } })));
        if (/\bcater/i.test(String(o))) {
          record(pb, `${d.id}=${o}+quote@40`, playbookFoodPlan(base(pb.type, 40, {
            foodChoices: { [d.id]: o },
            vendors: [{ id: 'v-cat', category: 'Catering', name: 'Census Catering', status: 'Booked', cost: 2000 }],
          })));
        }
      }
    }
  }
  return { seen, bad };
}

const W = walk();

test('every priced line is cited, the host’s own number, her caterer’s quote, or an acknowledged estimate', () => {
  expect([...new Set(W.bad)].sort()).toEqual([]);
});

test('the acknowledged-estimate list holds only lines that are priced and still uncited', () => {
  const stale = Object.keys(UNSOURCED_PRICE_LINES).filter((k) => {
    const s = W.seen.get(k);
    return !s || !s.kinds.has('estimate');
  });
  expect(stale.sort()).toEqual([]);
});

test('every acknowledgement says why there is no source yet', () => {
  const blank = Object.entries(UNSOURCED_PRICE_LINES).filter(([, why]) => !(typeof why === 'string' && why.trim().length > 20)).map(([k]) => k);
  expect(blank).toEqual([]);
});

test('Thanksgiving’s ordered dinner carries its vendor’s cited price onto the catering line', () => {
  const pb = ALL_PLAYBOOKS.find((p) => p.type === 'Thanksgiving Hosting');
  const pick = pb.decisions.find((x) => x.id === 'hosting_model').options.find((o) => /^Ordered/.test(o));
  const fp = playbookFoodPlan(base(pb.type, 20, { foodChoices: { hosting_model: pick } }));
  const cat = fp.list.find((l) => l.id === 'fa-catering');
  expect(cat).toBeTruthy();
  expect(cat.costProvenance && cat.costProvenance.sources).toEqual(['thanksgiving-prepared-fox5-2026', 'thanksgiving-prepared-grocerydive-2026']);
  expect(cat.priceBasis.kind).toBe('cited');
});

test('a caterer’s quote reads as her caterer’s quote, not as an estimate', () => {
  const fp = playbookFoodPlan(base('Birthday', 40, {
    foodChoices: { food_style: 'Drop-off catering' },
    vendors: [{ id: 'v-cat', category: 'Catering', name: 'Census Catering', status: 'Booked', cost: 2000 }],
  }));
  const cat = fp.list.find((l) => l.id === 'fa-catering');
  expect(cat && cat.priceBasis).toMatchObject({ kind: 'quote', label: PRICE_BASIS_LABELS.quote });
});
