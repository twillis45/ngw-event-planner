// ─── MONEY SAYS WHAT IT RESTS ON (audit 2, lanes G and A, 11/22/2026) ────────
//
// Three honesty defects in how the money is described, each a case where the
// screen said one thing and the arithmetic another:
//   G #2  a `costPending` pick showed its stand-in's price, never "pending";
//   G #3  the Spread priced an app-supplied count that Your money held at $0;
//   G #6  lines the regional factor moved were labeled "National average";
import { ALL_PLAYBOOKS, playbookFoodPlan } from '../playbooks';
import { hostSpending } from '../hostSpending';
import { layerForLine, layerCoverage, coverageNote } from '../priceLayers';
import { PRICE_PENDING_LABEL, priceSourceNote } from '../priceBasis';

const ev = (type, extra = {}) => ({
  id: 'm', type, date: '2026-12-12', guestEstimate: 40, guestMode: 'count', guestCountSource: 'host', ...extra,
});

describe('G #2 — a pick priced as another until a source exists says so', () => {
  const pending = ALL_PLAYBOOKS.flatMap((pb) => (pb.decisions || []).filter((d) => d.costPending).map((d) => [pb.type, d]));

  test('all nine owner-listed decisions name which picks are pending', () => {
    expect(pending.length).toBe(9);
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
