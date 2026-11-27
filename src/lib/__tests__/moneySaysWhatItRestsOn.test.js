// ─── MONEY SAYS WHAT IT RESTS ON (audit 2, lanes G and A, 11/22/2026) ────────
//
// Four honesty defects in how the money is described, each a case where the
// screen said one thing and the arithmetic another:
//   G #2  a `costPending` pick showed its stand-in's price, never "pending";
//   G #3  the Spread priced an app-supplied count that Your money held at $0;
//   G #6  lines the regional factor moved were labeled "National average";
//   A P1-9  the crab order named a market Captain White's left in 2021.
import fs from 'fs';
import path from 'path';
import { ALL_PLAYBOOKS, playbookFoodPlan } from '../playbooks';
import { hostSpending } from '../hostSpending';
import { layerForLine, layerCoverage, coverageNote } from '../priceLayers';
import { PRICE_PENDING_LABEL, priceSourceNote } from '../priceBasis';
import { CRAB_REFERENCE_MARKET, CRAB_SERVING_GUIDE } from '../crabServing';

const ev = (type, extra = {}) => ({
  id: 'm', type, date: '2026-12-12', guestEstimate: 40, guestMode: 'count', guestCountSource: 'host', ...extra,
});

describe('G #2 — a pick priced as another until a source exists says so', () => {
  const pending = ALL_PLAYBOOKS.flatMap((pb) => (pb.decisions || []).filter((d) => d.costPending).map((d) => [pb.type, d]));

  // Ten since batch 11: Dinner Party's one catered course (#233 Left), which no
  // source prices and whose course the pick does not name.
  test('all ten listed decisions name which picks are pending', () => {
    expect(pending.length).toBe(10);
    for (const [type, d] of pending) {
      expect(`${type}:${d.id}:${Array.isArray(d.costPendingPicks)}`).toBe(`${type}:${d.id}:true`);
      for (const p of d.costPendingPicks) expect(d.options).toContain(p);
    }
  });

  test.each(pending.map(([t, d]) => [t, d.id, d]))('%s · %s: each pending pick reaches the plan, the note and Your money', (type, id, d) => {
    for (const pick of d.costPendingPicks) {
      const e = ev(type, { foodChoices: { [id]: pick } });
      const fp = playbookFoodPlan(e);
      expect(fp.pricePending).toEqual(expect.arrayContaining([expect.objectContaining({ id, pick, why: d.costPending })]));
      const note = priceSourceNote(fp);
      expect(note && note.text).toContain(`${PRICE_PENDING_LABEL}: “${pick}”`);
      const s = hostSpending(e);
      expect(s.priceSources && s.priceSources.text).toContain(`“${pick}”`);
    }
  });

  test('a priced pick is not called pending', () => {
    const fp = playbookFoodPlan(ev('Retirement Party', { foodChoices: { bar: 'Beer + wine only' } }));
    expect(fp.pricePending).toEqual([]);
    const fp2 = playbookFoodPlan(ev('Fish Fry'));
    expect(fp2.pricePending).toEqual([]);
  });
});

describe('G #3 — one count basis: an app-supplied count is a preview everywhere', () => {
  test.each(ALL_PLAYBOOKS.filter((pb) => pb.type !== 'Group Trip').map((pb) => [pb.type]))('%s: the Spread and Your money agree on a typical count', (type) => {
    const e = ev(type, { guestCountSource: 'playbook-typical' });
    const fp = playbookFoodPlan(e);
    const s = hostSpending(e);
    expect(fp.hasRealCount).toBe(false);
    expect(s.foodEstimate || 0).toBe(0);
  });

  test('a count the host gave prices both', () => {
    const e = ev('Birthday');
    expect(playbookFoodPlan(e).hasRealCount).toBe(true);
    expect(hostSpending(e).foodEstimate).toBeGreaterThan(0);
  });
});

describe('G #6 — the regional label matches the factor applied', () => {
  test('every line the factor moved reads regional; a quote reads as her quote', () => {
    for (const pb of ALL_PLAYBOOKS) {
      const flat = playbookFoodPlan(ev(pb.type));
      const moved = playbookFoodPlan(ev(pb.type), { priceFactor: 1.2 });
      const byId = new Map(flat.list.map((l) => [l.id, l]));
      for (const l of moved.list) {
        const f = byId.get(l.id);
        if (!f || !(Number(f.high) > 0) || l.high === f.high) continue;
        expect(`${pb.type}:${l.id}:${layerForLine({ purchase: l, geoBasis: l.geoBasis }).layer}`).toBe(`${pb.type}:${l.id}:regional`);
      }
    }
  });

  test('Birthday at 1.2: the note no longer calls moved lines national', () => {
    const fp = playbookFoodPlan(ev('Birthday'), { priceFactor: 1.2 });
    const cov = layerCoverage(fp.list.filter((l) => Number(l.high) > 0).map((l) => layerForLine({ purchase: l, geoBasis: l.geoBasis })));
    expect(coverageNote(cov)).toBe('Every line adjusted for your region.');
  });

  test('a caterer’s quote is not a national average and is not counted as one', () => {
    const fp = playbookFoodPlan(ev('Birthday', {
      foodChoices: { food_style: 'Drop-off catering' },
      vendors: [{ id: 'v', category: 'Catering', name: 'Q', status: 'Booked', cost: 2000 }],
    }), { priceFactor: 1.2 });
    const cat = fp.list.find((l) => l.id === 'fa-catering');
    const L = layerForLine({ purchase: cat, geoBasis: cat.geoBasis });
    expect(L.layer).toBe('quote');
    const cov = layerCoverage(fp.list.filter((l) => Number(l.high) > 0).map((l) => layerForLine({ purchase: l, geoBasis: l.geoBasis })));
    expect(coverageNote(cov)).toMatch(/^Every line adjusted for your region\. Your caterer’s quote is used as given\.$/);
  });
});

describe('A P1-9 — the crab order names one reference market', () => {
  test('the reference market is Captain White’s in Oxon Hill, as crabServing records', () => {
    expect(CRAB_REFERENCE_MARKET).toMatch(/Oxon Hill/);
    expect(CRAB_REFERENCE_MARKET).not.toMatch(/Maine Ave/);
    expect(CRAB_SERVING_GUIDE.dmvVendors.captainWhites.location).toMatch(/^Oxon Hill, MD/);
  });

  test('no host surface places Captain White’s at the Maine Ave Fish Market', () => {
    const shell = fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
    expect(shell).not.toMatch(/Captain White's, Maine Ave/);
    const crab = fs.readFileSync(path.join(__dirname, '../playbooks/data/crabFeast.js'), 'utf8');
    expect(crab).not.toMatch(/Captain White's Seafood, Maine Ave Fish Market/);
  });
});

describe('A P1-7 — the budget hero lights the number its own sentence recommends', () => {
  // eslint-disable-next-line global-require
  const { budgetProposalCta, planCostsAboveNote } = require('../budgetCopy');

  test('when the plan already costs more, the lit button is the plan’s figure', () => {
    // "Your plan’s own lines already add up to about $1,360 — more than this $1,000…"
    expect(planCostsAboveNote(1360, 1000).cover).toBe(1400);
    expect(budgetProposalCta(1360, 1000)).toEqual({ lit: 1400, alt: 1000 });
  });

  test('when the plan fits, the middle of the range stays lit and there is no second figure', () => {
    expect(budgetProposalCta(800, 1000)).toEqual({ lit: 1000, alt: null });
    expect(budgetProposalCta(0, 1000)).toEqual({ lit: 1000, alt: null });
  });

  test('the shell lights budgetProposalCta’s figure, not the band’s middle', () => {
    const shell = fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
    // Since 11/26/2026 the shell reads the lit figure from the shared answer
    // (lib/budgetChoices), which is budgetProposalCta's own.
    const choices = fs.readFileSync(path.join(__dirname, '../budgetChoices.js'), 'utf8');
    expect(choices).toMatch(/const cta = budgetProposalCta\(/);
    expect(shell).toMatch(/_bc\.cta\.lit/);
    expect(shell).not.toMatch(/<button className="cta" onClick=\{\(\) => setB\(typical\)\}>Use \{fmt\(typical\)\}<\/button>/);
  });
});
