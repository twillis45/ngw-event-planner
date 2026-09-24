// ─── `impacts` WAS NEVER AUTHORED, AND NEVER NEEDED TO BE ───────────────────
//
// DECISION_SCHEMA_SPEC.md lists `impacts` as
// ('budget'|'shopping'|'schedule'|'guestComms'|'seating'|'vendors'|'risk')[],
// status BLANK for non-cost, with the note "Alcohol hits shopping + liability
// and comms, not just cost." Zero decisions carry it.
//
// It does not need authoring. `blocks` already names what a decision holds up,
// on 250 of 260 decisions, in the authors' own words. What was missing was the
// translation from free-form targets into the spec's seven-value enum.
//
// ── THE MAP DOES NOT GUESS, AND THAT IS WHY COVERAGE IS NOT 100% ────────────
//
// A target is mapped only where the WORD ITSELF settles it. 77 targets stay
// unmapped — `celebration`, `ceremony`, `location`, `ring` — because folding
// them into a near neighbour would invent exactly the fact this field exists to
// state. Coverage is a measured outcome, not a number to hit: a map that
// reached 100% would be a map that had started guessing.
import { ALL_PLAYBOOKS } from '../playbooks';
import { decisionImpacts, unmappedBlocks, MAPPED_BLOCKS, IMPACT, IMPACT_VALUES } from '../decisionImpacts';
import { normalizeBlocks, BLOCK } from '../blockVocabulary';

const decOf = (type, id) => (ALL_PLAYBOOKS.find((p) => p.type === type).decisions || [])
  .find((d) => d.id === id);

describe('EVERY KEY IS A REAL STRING — the bug that hid seven uses', () => {
  test('no map key resolved to undefined', () => {
    // `[BLOCK.SEATING]` was written before that token existed. JS accepted
    // `undefined` as a computed key without a murmur, so the map gained a key
    // literally named "undefined" and `seating` (7 uses) read as unmapped while
    // the map looked correct on the page. A missing token is the one thing
    // tokens are supposed to make loud, and a computed key is where JS lets it
    // stay silent. The module now throws at import; this is the second lock.
    expect(MAPPED_BLOCKS).not.toContain('undefined');
    for (const k of MAPPED_BLOCKS) expect(typeof k === 'string' && k.length > 0).toBe(true);
  });

  test('every BLOCK token the map uses actually exists', () => {
    for (const t of ['SEATING', 'VENUE', 'SHOPPING', 'RENTALS', 'BEVERAGE', 'PERMIT',
      'RESERVATIONS', 'PURCHASING', 'INVITATIONS', 'VENDOR', 'GUESTS', 'STAFFING']) {
      expect(typeof BLOCK[t]).toBe('string');
    }
  });

  test('and every mapped value is in the spec’s enum, never a near-miss string', () => {
    for (const impacts of Object.values(
      ALL_PLAYBOOKS.flatMap((pb) => (pb.decisions || []).map((d) => decisionImpacts(d))))) {
      for (const i of impacts) expect(IMPACT_VALUES).toContain(i);
    }
  });
});

describe('it derives what the spec asked for', () => {
  test('the spec’s own example: alcohol hits more than cost', () => {
    // "Alcohol hits shopping + liability and comms, not just cost."
    const impacts = decisionImpacts({ blocks: ['bar_purchases'] });
    expect(impacts).toContain(IMPACT.SHOPPING);
    expect(impacts).toContain(IMPACT.BUDGET);
    expect(impacts).toContain(IMPACT.RISK);
  });

  test('a real decision, end to end', () => {
    const impacts = decisionImpacts(decOf('Birthday', 'food_style'));
    expect(impacts).toContain(IMPACT.SHOPPING);
    expect(impacts).toContain(IMPACT.BUDGET);
    expect(impacts).toContain(IMPACT.VENDORS);
  });

  test('the order is stable, so two decisions never render differently', () => {
    const a = decisionImpacts({ blocks: ['vendor', 'food'] });
    const b = decisionImpacts({ blocks: ['food', 'vendor'] });
    expect(a).toEqual(b);
    // …and it is the enum's own order, not insertion order.
    expect(a).toEqual(IMPACT_VALUES.filter((v) => a.includes(v)));
  });

  test('it reads normalized targets, so a plural still lands', () => {
    // The whole reason step 1 came first. `vendors` is how the corpus writes it.
    expect(decisionImpacts({ blocks: ['vendors'] })).toEqual(decisionImpacts({ blocks: ['vendor'] }));
    expect(decisionImpacts({ blocks: ['runofshow'] })).toEqual(decisionImpacts({ blocks: ['run_of_show'] }));
  });
});

describe('IT REFUSES RATHER THAN GUESSING', () => {
  test('an ambiguous target gets nothing, and says so', () => {
    // `celebration` could be schedule, comms or nothing. `ring` is a purchase,
    // or a ceremony item, or a vendor order. Folding either would invent the
    // fact the field exists to state.
    expect(decisionImpacts({ blocks: ['celebration'] })).toEqual([]);
    expect(unmappedBlocks({ blocks: ['celebration'] })).toEqual(['celebration']);
    expect(decisionImpacts({ blocks: ['ring'] })).toEqual([]);
  });

  test('and junk input is refused', () => {
    expect(decisionImpacts(null)).toEqual([]);
    expect(decisionImpacts({})).toEqual([]);
    expect(unmappedBlocks(null)).toEqual([]);
  });
});

describe('COVERAGE — measured, not targeted', () => {
  test('87% of decisions get at least one impact', () => {
    let withImpacts = 0; let total = 0;
    for (const pb of ALL_PLAYBOOKS) for (const d of (pb.decisions || [])) {
      total++;
      if (decisionImpacts(d).length) withImpacts++;
    }
    expect(total).toBe(260);
    expect(withImpacts).toBe(227);
  });

  test('81% of block uses are placed, and 77 targets are deliberately not', () => {
    let placed = 0; let uses = 0; const unmapped = new Set();
    for (const pb of ALL_PLAYBOOKS) for (const d of (pb.decisions || [])) {
      for (const b of normalizeBlocks(d.blocks)) {
        uses++;
        if (MAPPED_BLOCKS.includes(b)) placed++; else unmapped.add(b);
      }
    }
    expect(uses).toBe(471);
    expect(placed).toBe(380);
    expect(unmapped.size).toBe(77);
  });
});
