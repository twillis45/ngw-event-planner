// ─── A MISSING REQUIRED VENDOR IS A STOP, NOT A LATE TASK ───────────────────
//
// Board ruling, 2026-08-17 (VENDOR_CONSEQUENCE_RULING). Measured across 827
// raises from all 39 playbooks, only `decisions` declared any consequence, so a
// caterer unbooked 280 days past its authored window ranked like a napkin order.
//
// WHY `gateHolder` AND NOT `unlocks`. `unlocks` counts what settling this FREES.
// A missing caterer frees nothing — it removes the ability to hold the event as
// planned. Saarinen, from the bench: "those are different failures." We assert
// the one with evidence and leave the count at 0.
//
// AND WHY NOTHING IS DERIVED. `blocks` is authored on DECISIONS, its targets are
// decision ids (`catering_style`, `vendor_team`); vendor rows carry only
// `category` / `required` / `when`. No authored mapping exists between them —
// `grep vendorCategory|vendorFor|categoryFor|linkedVendor` returns zero across
// the corpus and the engine. Inventing `Caterer -> catering_style` is the move
// that produced the `blocks:['catering']` phantom that broke a board this
// morning.
import { raiseAll } from '../surfaceRegistry';

const isoIn = (days) => {
  const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const EV = (over = {}) => ({
  id: 'ev-ub', type: 'Wedding', date: isoIn(20), venue: 'The Hall',
  venueCity: 'Santa Fe, NM', venueState: 'NM', guestMode: 'count',
  guestCount: 80, totalBudget: 12000,
  vendors: [
    { id: 'v1', name: 'Acme Catering', category: 'Caterer', status: 'Shortlisted' },
    { id: 'v2', name: 'Sol DJ', category: 'Band or DJ', status: 'Contacted' },
  ],
  ...over,
});

const unbooked = (event) => raiseAll(event).filter((r) => String(r.key || '').startsWith('vendor-unbooked'));

describe('an unbooked required vendor declares the stop', () => {
  test('PREMISE — the raise fires at all on this fixture', () => {
    expect(unbooked(EV()).length).toBeGreaterThan(0);
  });

  test('THE CATERER CARRIES gateHolder', () => {
    const row = unbooked(EV()).find((r) => /caterer/i.test(r.title));
    expect(row.gateHolder).toBe(true);
  });

  test('and unlocks stays 0 — we do not claim a count we cannot evidence', () => {
    // The honesty half. `unlocks` would rank it by a number nothing authored.
    for (const r of unbooked(EV())) expect(r.unlocks).toBe(0);
  });

  test('an OPTIONAL category never becomes a gate', () => {
    // Videographer is `required: false` in the wedding playbook. A choice is not
    // a stop, and promoting one would make the signal meaningless.
    expect(unbooked(EV()).some((r) => /videographer/i.test(r.title))).toBe(false);
  });

  test('a BOOKED vendor is not a gate', () => {
    const rows = unbooked(EV({ vendors: [
      { id: 'v1', name: 'Acme Catering', category: 'Caterer', status: 'Booked' },
    ] }));
    expect(rows.some((r) => /caterer/i.test(r.title))).toBe(false);
  });

  test('nothing is a gate before the authored window opens', () => {
    // 400 days out every category is still inside its lead. A gate that fires
    // early is just an alarm.
    expect(unbooked(EV({ date: isoIn(400) }))).toEqual([]);
  });
});
