// DESTINATION-3 (budget) — pooled dues as a first-class cost-sharing mode.
// The budget module's implicit per-guest/self-pay assumption becomes an
// explicit mode, and the susu / sou-sou / family-reunion-dues pattern (an
// ongoing pool with sliding-scale tiers and a stated reason) becomes its peer.
// Doctrine under test: the reader NEVER invents an amount — empty or unpriced
// tiers produce zero numbers, and no pool total is ever computed (per-tier
// headcounts are unknown).
import {
  COST_SHARING_MODES,
  normalizeCostSharingMode,
  costSharingSummary,
} from '../costSharing';

describe('normalizeCostSharingMode', () => {
  test('canonical keys pass through', () => {
    expect(normalizeCostSharingMode('self-pay')).toBe('self-pay');
    expect(normalizeCostSharingMode('pooled-dues')).toBe('pooled-dues');
  });
  test('obvious variants normalize', () => {
    expect(normalizeCostSharingMode('pooled_dues')).toBe('pooled-dues');
    expect(normalizeCostSharingMode('Pooled Dues')).toBe('pooled-dues');
    expect(normalizeCostSharingMode('SELF PAY')).toBe('self-pay');
  });
  test('junk resolves to self-pay, never to the pooled mode', () => {
    expect(normalizeCostSharingMode('venmo-me')).toBe('self-pay');
    expect(normalizeCostSharingMode(null)).toBe('self-pay');
    expect(normalizeCostSharingMode(42)).toBe('self-pay');
  });
  test('mode vocabulary is exactly the two modes', () => {
    expect(COST_SHARING_MODES).toEqual(['self-pay', 'pooled-dues']);
  });
});

describe('costSharingSummary — self-pay (the explicit default)', () => {
  test('absent costSharing reads as self-pay: today implicit assumption made explicit', () => {
    const s = costSharingSummary({ type: 'Birthday' });
    expect(s.mode).toBe('self-pay');
    expect(s.pooled).toBe(false);
    expect(s.tiers).toEqual([]);
    expect(s.lowestDue).toBeNull();
    expect(s.highestDue).toBeNull();
    expect(s.headline).toBe('Everyone covers their own costs.');
  });

  test('junk / missing event still returns a valid self-pay summary', () => {
    for (const ev of [null, undefined, {}, { costSharing: 'yes' }, { costSharing: 7 }]) {
      const s = costSharingSummary(ev);
      expect(s.mode).toBe('self-pay');
      expect(s.headline).toBe('Everyone covers their own costs.');
    }
  });

  test('self-pay ignores stray tiers/reason — no pooled copy leaks through', () => {
    const s = costSharingSummary({
      costSharing: { mode: 'self-pay', reason: 'leftover', tiers: [{ label: 'Adults', amount: 50 }] },
    });
    expect(s.tiers).toEqual([]);
    expect(s.reason).toBeNull();
    expect(s.headline).not.toMatch(/\$/);
  });
});

describe('costSharingSummary — pooled dues (susu / reunion-dues pattern)', () => {
  const pooled = {
    costSharing: {
      mode: 'pooled-dues',
      reason: 'so Grandma can come',
      cadence: 'monthly',
      tiers: [
        { label: 'Working adults', amount: 50 },
        { label: 'Students', amount: 20, note: 'part-time income' },
        { label: 'Fixed income', amount: 10, note: 'elders on a fixed income' },
      ],
    },
  };

  test('sliding-scale tiers summarize with real entered amounts only', () => {
    const s = costSharingSummary(pooled);
    expect(s.mode).toBe('pooled-dues');
    expect(s.pooled).toBe(true);
    expect(s.tierCount).toBe(3);
    expect(s.pricedTierCount).toBe(3);
    expect(s.lowestDue).toBe(10);
    expect(s.highestDue).toBe(50);
    expect(s.headline).toBe('Ongoing pool — 3 contribution tiers, $10–$50 monthly. Why: so Grandma can come');
  });

  test('the reason and cadence are the host words, passed through verbatim', () => {
    const s = costSharingSummary(pooled);
    expect(s.reason).toBe('so Grandma can come');
    expect(s.cadence).toBe('monthly');
  });

  test('NO pool total is ever computed — per-tier headcounts are unknown', () => {
    const s = costSharingSummary(pooled);
    expect(s).not.toHaveProperty('poolTotal');
    expect(s).not.toHaveProperty('total');
    expect(s.headline).not.toMatch(/80/); // 50+20+10 never summed
  });

  test('empty tiers → no numbers anywhere', () => {
    const s = costSharingSummary({ costSharing: { mode: 'pooled-dues', tiers: [] } });
    expect(s.tierCount).toBe(0);
    expect(s.lowestDue).toBeNull();
    expect(s.highestDue).toBeNull();
    expect(s.headline).toBe('Ongoing pool — contribution tiers not set yet.');
    expect(s.headline).not.toMatch(/\$/);
  });

  test('labeled-but-unpriced tiers stay honest — no invented amounts', () => {
    const s = costSharingSummary({
      costSharing: { mode: 'pooled-dues', tiers: [{ label: 'Adults' }, { label: 'Kids' }] },
    });
    expect(s.tierCount).toBe(2);
    expect(s.pricedTierCount).toBe(0);
    expect(s.tiers.every((t) => t.amount === null)).toBe(true);
    expect(s.headline).toBe('Ongoing pool — 2 contribution tiers, amounts not set yet.');
    expect(s.headline).not.toMatch(/\$/);
  });

  test('a mixed roster: unlabeled tiers drop, string amounts parse, zero/negative amounts read as unpriced', () => {
    const s = costSharingSummary({
      costSharing: {
        mode: 'pooled_dues', // variant spelling
        tiers: [
          { label: '  Working adults ', amount: '75' }, // trims + parses
          { amount: 30 },                                // no label → dropped
          { label: 'Elders', amount: 0 },                // 0 is not an entered due
          { label: 'Kids', amount: -5 },                 // negative is not a due
          null,                                          // junk row
        ],
      },
    });
    expect(s.mode).toBe('pooled-dues');
    expect(s.tierCount).toBe(3); // Working adults, Elders, Kids
    expect(s.pricedTierCount).toBe(1);
    expect(s.tiers[0]).toEqual({ label: 'Working adults', amount: 75, note: null });
    expect(s.lowestDue).toBe(75);
    expect(s.highestDue).toBe(75);
  });

  test('a single priced tier reads as one amount, not a fake range', () => {
    const s = costSharingSummary({
      costSharing: { mode: 'pooled-dues', cadence: 'per paycheck', tiers: [{ label: 'Everyone', amount: 25 }] },
    });
    expect(s.headline).toBe('Ongoing pool — 1 contribution tier, $25 per paycheck.');
  });
});
