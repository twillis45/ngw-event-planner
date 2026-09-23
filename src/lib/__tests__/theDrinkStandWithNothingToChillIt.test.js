// ─── A DRINK STAND WITH NOTHING TO KEEP THE DRINKS COLD ──────────────────────
//
// PTA / Booster Fundraiser sells bottled water, juice boxes and soda from an
// outdoor stand — and carried no ice, no tubs and no coolers anywhere in the
// playbook. The only mention was a row in `schedules.purchasing`, a block no
// function in this codebase reads, so no host was ever told to buy any.
//
// HOW IT WAS FOUND, which is the part worth keeping. Retiring 250 dead schedule
// rows needed proof that deleting them lost nothing, so every clause in every
// dead row was checked against every live surface — tasks, purchases,
// milestones, decisions, risks, contingencies and the schedule rows that DO
// render. Exactly one clause in 250 had no live carrier: this one. The deletion
// did not create the gap; it is what made it visible.
//
// THE FIRST SWEEP MISSED IT, AND THE REASON GENERALISES. An earlier pass asked
// only whether tasks/purchases/milestones/decisions covered each clause, and
// came back with a long list of "uncovered" content that was in fact carried by
// risks and by live schedule rows — bachelorParty's "charge phones + speaker" is
// covered by its own `T0 -3h` beat, sweet16's charged backup device by a risk
// mitigation. The right detector on the wrong population is still a wrong
// answer. The number only became trustworthy once the population was every
// surface a host can see.
import { getPlaybook, playbookFoodPlan } from '../playbooks';
import { QTY_SOURCES } from '../knowledge/quantityProvenance';
import { COST_SOURCES } from '../knowledge/costProvenance';

const ev = {
  id: 'pta', name: 'Spring Carnival', type: 'PTA / Booster Fundraiser',
  date: '2027-05-15', guestMode: 'count', guestCount: 200,
};

describe('the fundraiser can actually chill what it sells', () => {
  test('(premise) it really does sell drinks from a stand', () => {
    // Without this, the missing ice would be an opinion rather than a gap.
    const drinks = getPlaybook('PTA / Booster Fundraiser').purchases.find((p) => p.id === 'p_drinks');
    expect(drinks.item).toMatch(/bottled water|soda/i);
    expect(drinks.essential).toBe(true);
  });

  test('THE FIX: ice is on the shopping list the host actually opens', () => {
    // The engine, not the data file — this is the surface the dead row never
    // reached, and reaching it is the whole point.
    const list = (playbookFoodPlan(ev) || {}).list || [];
    const ice = list.find((i) => /\bice\b/i.test(String(i.item || '')));
    expect(ice).toBeTruthy();
    expect(String(ice.item)).toMatch(/tub/i);
  });

  test('…bought on the day, because it melts', () => {
    const ice = getPlaybook('PTA / Booster Fundraiser').purchases.find((p) => p.id === 'p_ice');
    expect(ice.buyAt).toBe('T0');
    // It rides the same concessions decision as the drinks it chills: no stand,
    // no ice. A second, independent gate here could disagree with that one.
    const drinks = getPlaybook('PTA / Booster Fundraiser').purchases.find((p) => p.id === 'p_drinks');
    expect(ice.dependsOnDecision).toBe(drinks.dependsOnDecision);
  });

  test('THE NUMBER IS NOT THE VENDOR’S NUMBER', () => {
    // reddy-ice-2026 says 1-2 lb/guest and its own outdoor example computes to
    // 2.1. The registry discloses that the publisher manufactures ice. Taking
    // the example would be letting a seller size the order, so the figure sits
    // in the low-to-middle of the stated range — and this test fails if someone
    // later "corrects" it upward to match the source's worked example.
    const ice = getPlaybook('PTA / Booster Fundraiser').purchases.find((p) => p.id === 'p_ice');
    expect(ice.qtyPerGuest).toBe(1.5);
    expect(ice.unit).toBe('lb');
    expect(ice.qtyPerGuest).toBeLessThan(2.1);
    expect(ice.provenance.limitations).toContain('commercial_interest_disclosed');
  });

  test('both axes cite REGISTERED sources, not prose', () => {
    // Quantity and cost are separate claims with separate registries, and this
    // codebase has been bitten before by a cost figure resting on a quantity
    // source. Each id must exist in its own registry.
    const ice = getPlaybook('PTA / Booster Fundraiser').purchases.find((p) => p.id === 'p_ice');
    for (const id of ice.provenance.sources) expect(QTY_SOURCES[id]).toBeTruthy();
    for (const id of ice.costProvenance.sources) expect(COST_SOURCES[id]).toBeTruthy();
    expect(ice.provenance.sources).toContain('reddy-ice-2026');
    expect(ice.costProvenance.sources).toEqual(['ice-retail-2026', 'ice-warehouse-2026']);
  });

  test('the cost band spans the two CHANNELS the sources actually price', () => {
    // 10-12c/lb warehouse against 23-31c grocery. A band that fell outside both
    // would be a number nobody measured.
    const ice = getPlaybook('PTA / Booster Fundraiser').purchases.find((p) => p.id === 'p_ice');
    const [lo, hi] = ice.unitCostRange;
    expect(lo).toBeGreaterThanOrEqual(0.10);
    expect(lo).toBeLessThanOrEqual(0.12);
    expect(hi).toBeGreaterThanOrEqual(0.23);
    expect(hi).toBeLessThanOrEqual(0.45);
  });
});
