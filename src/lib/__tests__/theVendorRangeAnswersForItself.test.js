// ─── $4,350–$43,500 WITH NOTHING BEHIND IT ───────────────────────────────────
//
// MEASURED across ALL_PLAYBOOKS on 2026-09-19:
//
//   playbook vendor rows authoring a `costRange`       224
//   …carrying `provenance` or `costProvenance`           0
//
// The contrast sits inside ONE FILE. In `playbooks/data/wedding.js`,
// `p_bar_alcohol` authors `unitCostRange: [2, 6]` with a dated costProvenance
// naming two sources and stating what it excludes. ELEVEN LINES LATER the
// `Venue` vendor row authors `costRange: [3000, 30000]` — a 10x band, and the
// largest single figure this app shows a host — with no field at all. The food
// knowledge system grew provenance machinery; the vendor rows beside it did not.
//
// AND THE MONEY REGISTRY SAID OTHERWISE. `VENDOR_RANGE_FACTOR_KEYS` carried the
// line "the BASE cost range a vendor row starts from is authored in the playbook
// and carries the playbook's own provenance, which this module cannot speak
// for." There was nothing to speak for. The verdict that sentence reached — a
// vendor row is ungrounded — was right; its reason was false, and a wrong reason
// is how a gap survives an audit.
//
// WHAT A HOST SAW, driven in Chromium at 390px on a DC wedding, 80 guests:
//
//   Estimates below: Washington DC / NoVA typically runs above the national
//                    baseline used for this range (+45%).
//   Venue            about $4,350–$43,500, before your quotes come in.
//   Caterer          about $8,120–$29,000 … — $70–$250/guest at national baseline.
//
// That +45% comes from `vendor.metroMarkets`, which this very registry grades
// tier 'estimate', confidence 'low', on a researched note whose last three words
// are "NO FACTOR MOVED" and which puts DC at 1.23 against the shipped 1.45. With
// no market set, the factors line did not render AT ALL — so the ranges appeared
// with no basis stated anywhere. `moneyDisclosure`'s own contract is
// `mustMark` = the figure may not be rendered bare. These were bare.
//
// NOTHING IS INVENTED HERE AND NO BAND MOVED. The base is registered at the
// FLOOR with empty sources, exactly as `budget.playbookPerGuestCost` is, so a
// figure never reaches a host with no record — and a row that authors its own
// costProvenance is read directly and reported in place of the floor key.
import { ALL_PLAYBOOKS, getPlaybook } from '../playbooks';
import { buildVendorPlan } from '../vendorPlan';
import {
  MONEY_PROVENANCE, VENDOR_RANGE_FACTOR_KEYS, moneyDisclosure, isGroundedMoneyFactor,
} from '../budgetEstimator/moneyProvenance';

const ev = (extra) => ({
  id: 'e', name: 'Probe', type: 'Wedding', date: '2027-05-15',
  guestMode: 'count', guestCount: 80, guests: [], vendors: [], ...extra,
});

describe('a vendor cost range answers for itself', () => {
  test('(premise) the gap is really the size the fix is scoped to', () => {
    let withRange = 0; let withProv = 0;
    for (const pb of ALL_PLAYBOOKS) {
      for (const v of (pb.vendors || [])) {
        if (!v || !Array.isArray(v.costRange) || v.costRange.length !== 2) continue;
        withRange += 1;
        if (v.costProvenance || v.provenance) withProv += 1;
      }
    }
    // If a later pass authors real per-row provenance this number climbs and the
    // floor record steps aside for those rows — that is the intended direction,
    // and this line is where it becomes visible rather than silent.
    expect(`${withRange} ranges, ${withProv} with provenance`).toBe('224 ranges, 0 with provenance');
  });

  test('THE DEFECT: the base range is now a contributor a surface can ask about', () => {
    expect(Object.keys(MONEY_PROVENANCE)).toContain('vendor.playbookCostRange');
    expect(VENDOR_RANGE_FACTOR_KEYS).toContain('vendor.playbookCostRange');

    const plan = buildVendorPlan(ev({}), {});
    expect(plan.relevant).toBe(true);
    const venue = plan.categories.find((c) => c.category === 'Venue');
    expect(venue.baseRange).toEqual([3000, 30000]);
    // The row says what its money stands on, and the plan collects it.
    expect(venue.provenanceKeys).toEqual(['vendor.playbookCostRange']);
    expect(plan.provenanceKeys).toContain('vendor.playbookCostRange');

    // …and asking produces a verdict, where before there was no key to ask with.
    const d = moneyDisclosure(plan.provenanceKeys);
    expect(d.unknownKeys).toEqual([]);
    expect(d.mustMark).toBe(true);
  });

  test('the factors that MOVE the range are reported alongside it, and only when applied', () => {
    // A key claimed on an event that never triggered it would be a fabricated
    // disclosure — the disclosure has to be as true as the number.
    const flat = buildVendorPlan(ev({}), {});
    expect(flat.provenanceKeys).toEqual(['vendor.playbookCostRange']);

    const moved = buildVendorPlan(ev({}), {
      metroFactor: 1.45, metroLabel: 'Washington DC / NoVA',
      rush: { multiplier: 1.25, label: 'Under 30 days', explanation: 'Short notice.' },
    });
    expect([...moved.provenanceKeys].sort())
      .toEqual(['vendor.metroMarkets', 'vendor.playbookCostRange', 'vendor.rushFactor']);
    const venue = moved.categories.find((c) => c.category === 'Venue');
    expect(venue.estimateLow).toBe(Math.round(3000 * 1.45 * 1.25));
  });

  test('NEGATIVE CONTROL: the floor never outranks a row that answered for itself', () => {
    // The point of the record is that no figure reaches a host with nothing
    // behind it — NOT that every figure is weak. An authored costProvenance is
    // read directly, and the floor key steps aside for that row.
    const authored = {
      tier: 'researched', confidence: 'high', verificationStatus: 'cited',
      sources: ['x-2026'], lastVerified: '2026-09-19', claim: 'A real band.',
    };
    // buildVendorPlan reads the playbook by type, so the deferral is exercised
    // through the SHIPPED path — an authored record attached to a real row and
    // removed again — rather than by reaching past it with a fixture object.
    const row = getPlaybook('Wedding').vendors.find((v) => v.category === 'Venue');
    expect(row.costProvenance).toBeUndefined();
    try {
      row.costProvenance = authored;
      const venue = buildVendorPlan(ev({}), {}).categories.find((c) => c.category === 'Venue');
      expect(venue.costProvenance).toBe(authored);
      // The floor key is GONE for this row — the registry record exists so no
      // figure arrives with nothing behind it, not to outrank one that answered.
      expect(venue.provenanceKeys).toEqual([]);
    } finally {
      delete row.costProvenance;
    }

    // …and with the record removed again, the floor is back.
    const rows = buildVendorPlan(ev({}), {}).categories;
    // Every shipped row today reports null, because none authors one — stated so
    // that the day one does, this line is what changes.
    expect(rows.every((r) => r.costProvenance === null)).toBe(true);
    expect(rows.every((r) => r.provenanceKeys.includes('vendor.playbookCostRange'))).toBe(true);
  });

  test('NEGATIVE CONTROL: registering the base did not ground anything', () => {
    // Registering a figure is not evidence about it. If this record ever passes
    // the grounding predicate without 224 researched bands behind it, the
    // registry has started vouching for numbers nobody checked — which is the
    // defect this whole file exists to prevent, arriving from the other side.
    const rec = MONEY_PROVENANCE['vendor.playbookCostRange'];
    expect(rec.sources).toEqual([]);
    expect(rec.tier).toBe('estimate');
    expect(isGroundedMoneyFactor(rec)).toBe(false);
    expect(moneyDisclosure(VENDOR_RANGE_FACTOR_KEYS).grounded).toBe(false);
  });

  test('NEGATIVE CONTROL: a host quote still replaces the estimate entirely', () => {
    // An estimate never outranks a real number (vendorPlan's own hard rule). The
    // disclosure must not turn a quoted price into a marked estimate.
    const quoted = buildVendorPlan(
      ev({ vendors: [{ id: 'v1', name: 'The Ironwood', category: 'Venue', cost: 9000 }] }), {},
    );
    const venue = quoted.categories.find((c) => c.category === 'Venue');
    expect(venue.hasRealCost).toBe(true);
    expect(venue.realCost).toBe(9000);
    expect(venue.estimateCopy).toMatch(/from your quote/i);
  });
});
