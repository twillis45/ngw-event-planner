// THE BUDGET IS BUILT FROM CITED PRICES (owner, 11/25/2026: "the budget figure
// is going to come from source material … build from cited").
//
// The first figure a host saw came from PER_HEAD_BY_TYPE, whose rows (all but
// Wedding) carry no source. Every birthday shopping line, by contrast, prices
// itself with registered sources and a lastVerified date. sourcedBudget() totals
// ONLY cited lines, scaled by the same quantity rules the shopping list uses,
// in three steps a host can read: the essentials, then the extras, then
// everything (lines that hang on a decision such as alcohol). A line without a
// citation is never counted; it is named as left out. A type with no cited line
// gets no figure at all. Freshness is the app's own rule (assessFreshness).
import { sourcedBudget } from '../playbooks';

const AS_OF = new Date('2026-09-01T12:00:00Z');

test('a 25-guest birthday is three cited steps, cumulative', () => {
  const b = sourcedBudget({ type: 'Birthday', guestEstimate: 25 }, AS_OF);
  expect(b.guests).toBe(25);
  expect(b.steps.map((s) => s.key)).toEqual(['essentials', 'extras', 'everything']);
  const [e, x, all] = b.steps;
  expect([Math.round(e.low), Math.round(e.high)]).toEqual([177, 621]);
  expect([Math.round(x.low), Math.round(x.high)]).toEqual([242, 876]);
  expect([Math.round(all.low), Math.round(all.high)]).toEqual([467, 1326]);
  // Counted things are bought whole (resolveQuantity): 37.5 place settings is 38.
  expect([e.mid, x.mid, all.mid]).toEqual([400, 550, 900]);
  // each step lists the lines it adds, each with its sources and check date
  const cake = e.adds.find((l) => l.id === 'p_cake');
  expect(cake.sources.length).toBeGreaterThan(0);
  expect(cake.lastVerified).toBe('2026-08-15');
  expect(all.adds.map((l) => l.id)).toEqual(['p_alcohol']);
  expect(b.leftOut).toEqual([]);
});

test('an uncited line is never counted, only named', () => {
  // Thanksgiving Hosting: 20 of 39 priced lines cited (measured 11/25/2026).
  const b = sourcedBudget({ type: 'Thanksgiving Hosting', guestEstimate: 12 }, AS_OF);
  expect(b).not.toBeNull();
  expect(b.leftOut.length).toBeGreaterThan(0);
  const counted = new Set(b.steps.flatMap((s) => s.adds.map((l) => l.id)));
  for (const l of b.leftOut) expect(counted.has(l.id)).toBe(false);
});

test('a type with no cited line gets no figure', () => {
  expect(sourcedBudget({ type: 'Client Dinner', guestEstimate: 8 }, AS_OF)).toBeNull();
});

test('freshness is the app’s own rule, per line', () => {
  const fresh = sourcedBudget({ type: 'Birthday', guestEstimate: 25 }, new Date('2026-08-20T12:00:00Z'));
  expect(fresh.stale).toEqual([]);
  const later = sourcedBudget({ type: 'Birthday', guestEstimate: 25 }, new Date('2026-11-25T12:00:00Z'));
  expect(later.stale.length).toBe(14);
});
