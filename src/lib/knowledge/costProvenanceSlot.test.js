// ─── THE COST BLOCK: TWO CLAIMS, TWO SLOTS (Design A, board 2026-08-15) ──────
//
// A purchase line says how much to buy AND what it costs. Those are separate
// claims, judged by separate registries, and they shared one `provenance` slot —
// so citing the price meant deleting the amount. ~109 lines were blocked by a
// claim they already carried.
//
// This file gates the four properties the board made conditions of the ruling.
// Each is red-proved in its own comment: the fault to reintroduce is named, so a
// future reader can check the gate still bites instead of trusting that it does.
import { classifyClaim, HOST_LABELS, SOURCED_LABELS } from './claimBasis';
import { axisForField, axesForField, wouldGround, validateSourcesFor } from './sourceAuthority';
import { QTY_SOURCES } from './quantityProvenance';
import { COST_SOURCES } from './costProvenance';

const SOURCED = new Set(SOURCED_LABELS);
const costBlock = () => ({
  tier: 'researched', confidence: 'high', verificationStatus: 'cited',
  sources: [Object.keys(COST_SOURCES)[0]],
  claim: 'A test cost claim citing a registered cost source',
});
const qtyBlock = () => ({
  tier: 'researched', confidence: 'high', verificationStatus: 'cited',
  sources: [Object.keys(QTY_SOURCES)[0]],
  claim: 'A test quantity claim citing a registered quantity source',
});

describe('the cost block is additive — nothing reclassifies without one', () => {
  test('omitting it classifies exactly as before', () => {
    // The whole reason no corpus rewrite was needed. Red-prove by making the
    // second argument required: every existing line would change label at once.
    const prov = qtyBlock();
    expect(classifyClaim(prov).hostLabel).toBe(classifyClaim(prov, undefined).hostLabel);
    expect(classifyClaim(prov).hostLabel).toBe(HOST_LABELS.AMOUNT_SOURCED);
  });

  test('a cost citation in the NEW block earns the price label', () => {
    // The migration's actual purpose: a line can now be priced without its
    // quantity claim being overwritten to make room.
    const c = classifyClaim({ tier: 'trade-heuristic', claim: '~0.5 lb per guest' }, costBlock());
    expect(c.hostLabel).toBe(HOST_LABELS.PRICE_SOURCED);
    expect(c.directCitationEligible).toBe(true);
  });

  test('BOTH axes cited is the only thing that earns the unqualified label', () => {
    expect(classifyClaim(qtyBlock(), costBlock()).hostLabel).toBe(HOST_LABELS.DIRECTLY_SOURCED);
  });

  test('the quantity claim SURVIVES the cost citation — the point of the ruling', () => {
    // Red-prove by having the cost block overwrite `provenance`: this basis
    // reverts to whatever the cost block says and the authored rate is gone.
    const prov = { tier: 'trade-heuristic', claim: '~0.5 lb grazing per guest' };
    const c = classifyClaim(prov, costBlock());
    // The authored quantity block is untouched by classification...
    expect(prov.claim).toBe('~0.5 lb grazing per guest');
    // ...and the line's BASIS is still the quantity claim's, not the cost block's.
    // If the cost block were being written into the shared slot instead, this
    // would read 'researched' and the grazing rate would be gone.
    expect(c.basis).toBe('trade-heuristic');
  });
});

describe('a price never outranks a cultural basis', () => {
  // The condition the cultural seats made non-negotiable. Before the cost block
  // existed this was enforced by accident — `tier` is single-valued, so a
  // `cultural-tradition` slot could not satisfy `isGroundedCost`. Adding a second
  // block removes that accident, which is exactly why this test exists.
  const cultural = (tier) => ({
    tier, verificationStatus: 'synthesized', sources: [],
    claim: 'Watermelon as an early Juneteenth red food, served with dignity',
  });

  test.each(['cultural-tradition', 'culture-bearer'])(
    '%s + a real cost citation still reads Cultural tradition', (tier) => {
      // RED-PROVE: delete the `culturalBasis` guard in claimBasis and this line
      // starts reading "Price directly sourced" — a grocery price introduced as
      // the basis for a dignity claim.
      const c = classifyClaim(cultural(tier), costBlock());
      expect(c.hostLabel).toBe(HOST_LABELS.CULTURAL_TRADITION);
      expect(SOURCED.has(c.hostLabel)).toBe(false);
    });

  test('the price is not DELETED, only kept from speaking first', () => {
    // The guard must suppress the label, not the evidence — otherwise it would be
    // a different kind of dishonesty, hiding a real citation.
    const c = classifyClaim(cultural('cultural-tradition'), costBlock());
    expect(c.directCitationEligible).toBe(true);
  });

  test('a cultural line whose QUANTITY is cited still names that axis', () => {
    // The guard is scoped to the cost axis. A cultural line with a genuinely
    // cited per-guest rate has had its own claim verified, and saying so is not
    // the harm the seats described.
    expect(classifyClaim({ ...cultural('cultural-tradition'), ...qtyBlock() }, costBlock())
      .hostLabel).toBe(HOST_LABELS.DIRECTLY_SOURCED);
  });
});

describe('the axis map is total, and points the right way', () => {
  test('every governed purchase field resolves to an axis', () => {
    // `validateSourcesFor` returns {ok:true} when the axis is null — an
    // unrecognised path SKIPS validation entirely. So a field missing from this
    // map is not a gap in a table, it is an unguarded publish path.
    for (const f of ['provenance', 'costProvenance', 'qtyPerGuest', 'qtyFlat',
      'unitCostRange', 'priceLadder', 'servingGuide']) {
      expect(axesForField(`p_ice.${f}`).length).toBeGreaterThan(0);
    }
  });

  test('cost fields resolve to the COST registry', () => {
    // RED-PROVE: put `unitCostRange` back in the quantity branch. It goes red
    // here, which is the point — that was live until 2026-08-15.
    for (const f of ['costProvenance', 'unitCostRange', 'priceLadder']) {
      expect(axisForField(`p_ice.${f}`).id).toBe('cost');
    }
    expect(axisForField('crab_size.costFactorProvenance').id).toBe('cost');
  });

  test('a registered COST source grounds in the cost block and is accepted there', () => {
    const id = Object.keys(COST_SOURCES)[0];
    expect(validateSourcesFor('p_ice.costProvenance', [id]).ok).toBe(true);
    expect(wouldGround('p_ice.costProvenance', { tier: 'researched', sources: [id] })).toBe(true);
  });

  test('a QUANTITY source is the wrong axis IN THE COST BLOCK, and says so', () => {
    // The separation has to cut both ways or it is not a separation.
    const r = validateSourcesFor('p_ice.costProvenance', [Object.keys(QTY_SOURCES)[0]]);
    expect(r.ok).toBe(false);
    expect(r.wrongAxis[0].belongsTo).toBe('quantity');
  });
});

describe('the two registries stay disjoint', () => {
  test('no source id resolves in both, so "which axis" is always decidable', () => {
    // Everything above assumes an id belongs to exactly one axis. If that ever
    // stops being true, `wrongAxis` becomes meaningless and the cost/quantity
    // split silently stops separating anything. Red-prove by copying any id from
    // one registry into the other.
    const overlap = Object.keys(QTY_SOURCES).filter((id) => COST_SOURCES[id]);
    expect(overlap).toEqual([]);
  });
});
