// ─── THE LIST EARNS ITS CONTENTS ───────────────────────────────────────────
//
// Three findings from the 1 August lodging listing research, built together
// because they answer one complaint: the shortlist does not sell itself.
//
// 1 · PROVENANCE. The research caught us in the fault we levelled at Blink —
//     "our unfurl parses, normalises and infers, and says nothing." Airbnb
//     marks machine-touched text and offers the original.
// 2 · WHY THESE. HotelTonight's "Why these hotels?" — the curation explains
//     itself on demand. "We rank candidates by must-have fit and never say so."
// 3 · PRICE HISTORY. Their struck price is their OWN history — a checkable
//     claim about themselves, not an unverifiable one about the market.
const {
  lodgingProvenance, lodgingRankBasis, lodgingPriceHistory,
} = require('../lodgingIntel');

describe('an option says where each field came from', () => {
  it('separates what was read from what was typed', () => {
    const p = lodgingProvenance({
      label: 'Cabin in McHenry', beds: 6, totalPrice: 4200,
      sources: { label: 'read', beds: 'read', totalPrice: 'typed' },
    });
    expect(p.read).toBe(2);
    expect(p.typed).toBe(1);
    expect(p.rows.find((r) => r.field === 'totalPrice').source).toBe('typed');
    expect(p.rows.find((r) => r.field === 'label').label).toBe('Name');
  });

  it('reports an unrecorded source as unknown — it never backfills a claim', () => {
    const p = lodgingProvenance({ label: 'The Ranch House', beds: 8 });
    expect(p.unknown).toBe(2);
    expect(p.read).toBe(0);
    expect(p.typed).toBe(0);
  });

  it('only reports fields that actually have a value', () => {
    const p = lodgingProvenance({ label: 'A place', beds: null, notes: '   ' });
    expect(p.rows.map((r) => r.field)).toEqual(['label']);
    expect(lodgingProvenance(null).rows).toEqual([]);
  });
});

const evt = (over) => ({
  id: 'ev-why', name: 'Mom’s 80th', type: 'Birthday',
  date: '2028-06-17', endDate: '2028-06-21', isDestination: true,
  venueCity: 'Santa Fe', venueState: 'NM', guestCount: 10, totalBudget: 4800,
  lodgingMustHaves: ['stepfree', 'laundry'],
  budget: [], vendors: [], guests: [],
  lodgingOptions: [
    { id: 'a', status: 'option', label: 'Ranch House', beds: 12, totalPrice: 4200 },
    { id: 'b', status: 'option', label: 'Casa Vista', beds: 8, totalPrice: 3800 },
  ],
  ...over,
});

describe('the ordering explains itself', () => {
  it('says nothing when there is nothing to order', () => {
    expect(lodgingRankBasis(evt({ lodgingOptions: [{ id: 'a', status: 'option', label: 'One' }] }))).toBeNull();
  });

  it('names the real basis rankCandidates uses', () => {
    const b = lodgingRankBasis(evt());
    const all = b.lines.join(' ');
    expect(all).toMatch(/must-have/i);
    expect(all).toMatch(/real beds/i);          // not headline capacity
    expect(all).toMatch(/\$4,800/);             // the budget the host set
  });

  it('states that the order is not a verdict', () => {
    const b = lodgingRankBasis(evt());
    expect(b.caveat).toMatch(/nothing is ruled out/i);
    expect(b.caveat).toMatch(/not a judgement/i);
  });
});

describe('a price remembers what you first recorded', () => {
  it('is silent when nothing changed, or when there is no history', () => {
    expect(lodgingPriceHistory({ totalPrice: 4200, priceFirstSeen: 4200 })).toBeNull();
    expect(lodgingPriceHistory({ totalPrice: 4200 })).toBeNull();
    expect(lodgingPriceHistory({ priceFirstSeen: 4200 })).toBeNull();
    expect(lodgingPriceHistory(null)).toBeNull();
  });

  it('states the first number and when it was taken — never a market claim', () => {
    const h = lodgingPriceHistory({ totalPrice: 4600, priceFirstSeen: 4200 });
    expect(h.text).toBe('was $4,200 when you saved it');
    expect(h.direction).toBe('up');
    expect(h.delta).toBe(400);
    // No adjective, no verdict — this is not a deal claim. The guard targets
    // DEAL language specifically: "saved it" here means saved to your list, and
    // the first cut of this assertion caught its own honest copy on /save/.
    expect(h.text).not.toMatch(/\bdeal\b|\bsavings?\b|discount|cheap|bargain|only\b/i);
    expect(h.text).toMatch(/when you saved it$/);
  });

  it('works in the other direction too', () => {
    const h = lodgingPriceHistory({ totalPrice: 3800, priceFirstSeen: 4200 });
    expect(h.direction).toBe('down');
    expect(h.delta).toBe(400);
  });
});
