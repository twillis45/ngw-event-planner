// ─── THE BUDGET ASK SAYS IT IN FEW WORDS (owner, 11/24/2026: "Copy is too wordy") ─
//
// Approved wording, Thanksgiving for 12, the plan's lines $334, typical $300:
//   A number to plan around
//   $400   $33 a head · covers your plan · est.
//   Your plan's lines come to about $334. The mid-range for 12 at a Thanksgiving is $300.
//   5 things not included ▾
//   [Use $400] [Change]
//   or Lean $100 · Typical $300 · All-out $400
// And at or under the mid-range: the headline stays the mid-range, and one line:
//   "For N at <occasion>. An estimate, not a quote."
// "Mid-range", not the approved "Typical": the figure is the midpoint of an
// authored band, and the host's 10/06/2026 ruling (theBudgetAskSaysWhoseMoney,
// "A MIDPOINT IS NOT A TYPICAL") keeps that word until the owner rules again.
// Every number agrees (UX_11 rule 12): the headline is the lit button's figure,
// and the per-head is the headline over the guests, rounded as the tiers round.
const pbm = require('../playbooks');
const { budgetAskCopy, notIncludedLine, budgetProposalCta, estimateShortfallNote, stayOnTopOfTheRangeNote } = require('../budgetCopy');
const { perHeadRange, perHeadText } = require('../perHead');
const { formatCurrency } = require('../currency');

const fmt = (n) => formatCurrency(n);
const words = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;
const sentences = (s) => String(s).trim().split(/(?<=[.!?])\s+(?=[A-Z$])/).filter(Boolean).length;

test('over typical: the covering figure leads, the line says both numbers', () => {
  const c = budgetAskCopy({ expected: 334, typical: 300, guests: 12, type: 'Thanksgiving', mustMark: true });
  expect(c.headline).toBe(400);
  expect(c.headline).toBe(budgetProposalCta(334, 300).lit);
  expect(c.covers).toBe(true);
  expect(c.perHead).toBe(perHeadText(perHeadRange(400, 400, 12), fmt));
  expect(c.perHead).toBe('$33 a head');
  expect(c.tag).toBe('covers your plan · est.');
  expect(c.grounding).toBe('Your plan’s lines come to about $334. The mid-range for 12 at a Thanksgiving is $300.');
  expect(c.grounding).not.toMatch(/\btypical\b|most .* run/i);
});

test('at or under typical: the typical figure leads, in one short line', () => {
  const c = budgetAskCopy({ expected: 250, typical: 300, guests: 12, type: 'Thanksgiving', mustMark: true });
  expect([c.headline, c.covers, c.tag]).toEqual([300, false, 'Mid‑range · est.']);
  expect(c.headline).toBe(budgetProposalCta(250, 300).lit);
  expect(c.grounding).toBe('For 12 at a Thanksgiving. An estimate, not a quote.');
  const plain = budgetAskCopy({ expected: 0, typical: 300, guests: 12, type: 'Thanksgiving', mustMark: false });
  expect([plain.tag, plain.grounding]).toEqual(['Mid‑range', 'For 12 at a Thanksgiving.']);
});

test('the occasion is the plan’s own', () => {
  const c = budgetAskCopy({ expected: 334, typical: 300, guests: 12, type: 'Watch Party', mustMark: true });
  expect(c.grounding).toBe('Your plan’s lines come to about $334. The mid-range for 12 at a watch party is $300.');
  expect(budgetAskCopy({ expected: 0, typical: 300, guests: 0, type: 'Anniversary', mustMark: false }).grounding).toBe('At an anniversary.');
});

test('every playbook’s line stays near 25 words, both ways', () => {
  const long = [];
  for (const pb of pbm.ALL_PLAYBOOKS) {
    for (const [expected, typical] of [[12345, 9800], [100, 9800]]) {
      const c = budgetAskCopy({ expected, typical, guests: 120, type: pb.type, mustMark: true });
      if (words(c.grounding) > 25) long.push(`${pb.type}: ${words(c.grounding)} words — ${c.grounding}`);
      if (/undefined|null|NaN/.test(c.grounding)) long.push(`${pb.type}: ${c.grounding}`);
    }
  }
  expect(long).toEqual([]);
});

test('the fold says how many things are not included', () => {
  expect(notIncludedLine(['Gifts', 'Tips', 'The cake', 'Outfits', 'Favors'])).toBe('5 things not included');
  expect(notIncludedLine(['Gifts'])).toBe('1 thing not included');
  expect(notIncludedLine([])).toBe(null);
});

test('the card’s other notes keep their meaning in one sentence each', () => {
  const short = estimateShortfallNote({ belowRequiredVendors: true, requiredVendorFloor: 1750, highTotal: 500 }, { short: true });
  expect(sentences(short)).toBe(1);
  expect(short).toMatch(/\$1,750/);
  expect(short).toMatch(/\$500/);
  const stay = { rung: 'cheapest', name: 'Elm Court Cottage' };
  const rooms = stayOnTopOfTheRangeNote({ lodgingFloor: 2180, highTotal: 6000, belowLodgingFloor: false }, stay, { short: true });
  expect(stayOnTopOfTheRangeNote({ lodgingFloor: 2180, highTotal: 6000, belowLodgingFloor: false }, stay)).toBeTruthy();
  expect(sentences(rooms)).toBe(1);
  expect(rooms).toMatch(/\$2,180/);
  expect(rooms).toMatch(/Elm Court Cottage/);
  expect(rooms).toMatch(/on top/);
  // Her own evidence only, as the long one: a basis it can't vouch for is silent.
  expect(stayOnTopOfTheRangeNote({ lodgingFloor: 2180, highTotal: 6000 }, { rung: 'listings' }, { short: true })).toBe(null);
});
