// ONE BUDGET QUESTION FOR BOTH SHELLS (owner, 11/26/2026: step 0 of bringing v4
// into hostv2, "A with T2"). The same Thanksgiving for 14 got $200 / $300 / $400
// with $400 lit in hostv2 and one choice, "Just the essentials, about $200", in
// hostv4: two engines (the estimator's band in hostv2, cited shopping lines in
// hostv4). lib/budgetChoices is now the one answer both read: the estimator's
// Lean / Mid-range / All-out, the plan's own lines (hostSpending), the figure the
// ask lights (budgetProposalCta), the ask's words (budgetAskCopy) and what is not
// included (notIncludedFor). When the lit figure is none of the three, it is a
// choice of its own, "Covers your plan".
import { budgetChoices } from '../budgetChoices';
import { estimateTotalRange } from '../budgetEstimator';
import { budgetAskCopy, budgetProposalCta } from '../budgetCopy';
import { hostSpending } from '../hostSpending';
import { timeOfDayFor } from '../knownFacts';
import { spanNights } from '../dates';

const TG = { id: 'tg', name: 'Thanksgiving at ours', type: 'Thanksgiving', date: '2026-12-17', startTime: '15:00', startTimeSource: 'host', guestEstimate: 14, venueKind: 'home', guests: [], budget: [], timeline: [], vendors: [] };

test('the tiers are the estimator’s own low, middle and high, as hostv2 computed them', () => {
  const est = estimateTotalRange({ type: TG.type, guestCount: 14, date: TG.date, timeOfDay: timeOfDayFor(TG), isDestination: false, nights: spanNights(TG), lodgingFloor: null });
  const mid = Math.round(((est.lowTotal + est.highTotal) / 2) / 100) * 100;
  const bc = budgetChoices(TG);
  expect([bc.low, bc.typical, bc.high]).toEqual([est.lowTotal, mid, est.highTotal]);
  expect(bc.tiers.map((t) => [t.label, t.amount])).toEqual([['Lean', est.lowTotal], ['Mid‑range', mid], ['All-out', est.highTotal]]);
});

test('the lit figure and the words are hostv2’s, from the plan’s own lines', () => {
  const bc = budgetChoices(TG);
  const expected = hostSpending(TG, 1, {}).expected;
  expect(bc.expected).toBe(expected);
  expect(bc.cta).toEqual(budgetProposalCta(expected, bc.typical));
  expect(bc.ask).toEqual(budgetAskCopy({ expected, typical: bc.typical, guests: 14, type: TG.type, mustMark: bc.mustMark }));
});

test('the choices: every tier with its per-head, the lit one marked, and a "Covers your plan" choice only when the lit figure is no tier', () => {
  const bc = budgetChoices(TG);
  const lit = bc.choices.filter((c) => c.lit);
  expect(lit).toHaveLength(1);
  expect(lit[0].amount).toBe(bc.cta.lit);
  bc.choices.forEach((c) => expect(c.perHead).toMatch(/a head/));
  const covers = bc.choices.find((c) => c.key === 'covers');
  expect(!!covers).toBe(!bc.tiers.some((t) => t.amount === bc.cta.lit));
  const amounts = bc.choices.map((c) => c.amount);
  expect(amounts).toEqual([...amounts].sort((a, b) => a - b));
});

test('what it leaves out comes with it', () => {
  expect(budgetChoices(TG).notIncluded.length).toBeGreaterThan(0);
});

test('no type the estimator knows: no choices', () => {
  expect(budgetChoices({ id: 'x', type: '', guestEstimate: 0 })).toBe(null);
});
