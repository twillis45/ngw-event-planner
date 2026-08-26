// ─── DERIVED TASKS MUST EARN THEIR ROW ───────────────────────────────────────
//
// The measured gap: a Wedding with a booked caterer at `coiStatus: 'missing'`,
// no deposit and no contract produced an 11-row checklist with zero rows about
// any of it, while the vendor engine already knew the COI was required.
//
// The risk in fixing that is the opposite failure — a derived list that always
// has rows in it. A host learns to stop reading a list that is never empty, and
// then the real obligation is invisible for a different reason. So most of this
// file tests SILENCE.
import { vendorObligations, vendorObligationCount } from '../vendorObligations';

const EV = (vendors) => ({
  id: 'x', type: 'Wedding', date: '2027-06-20',
  guestMode: 'count', guestCount: 80, venue: 'The Hall',
  venueCity: 'Santa Fe', venueState: 'NM', vendors,
});
const booked = (over = {}) => ({
  id: 'v1', name: 'Acme Catering', role: 'Caterer', status: 'Booked',
  coiStatus: 'received', depositPaid: true, contractSigned: true,
  arrivalTime: '14:00', ...over,
});

describe('it speaks only when a vendor actually owes something', () => {
  test('PREMISE — the fixture status is one the engine ACCEPTS as booked', () => {
    // Written after the fixture used lowercase 'booked' and every positive
    // assertion silently produced zero rows while every silence assertion
    // passed. The canonical set is capitalised: Confirmed / Booked / Paid /
    // Deposit Paid / Contracted. Without this premise the whole file can go
    // green while measuring nothing.
    expect(vendorObligations(EV([booked({ coiStatus: 'missing' })])).length).toBeGreaterThan(0);
  });

  test('a fully settled vendor produces NOTHING', () => {
    // The most important test here. A derived row that always appears is a nag,
    // and a nag trains the host to skim past the row that matters.
    expect(vendorObligations(EV([booked()]))).toEqual([]);
  });

  test('an event with no vendors produces nothing', () => {
    expect(vendorObligations(EV([]))).toEqual([]);
    expect(vendorObligations({})).toEqual([]);
    expect(vendorObligations(null)).toEqual([]);
  });

  test('an UNBOOKED vendor owes nothing yet', () => {
    // An idea for a caterer has no obligations. Emitting "pay the deposit" for
    // someone the host is merely considering invents a commitment.
    const rows = vendorObligations(EV([booked({ status: 'Shortlisted', depositPaid: false, contractSigned: false })]));
    expect(rows).toEqual([]);
  });

  test('a nameless row is skipped rather than rendered as "undefined"', () => {
    expect(vendorObligations(EV([{ id: 'v9', status: 'Booked', depositPaid: false }]))).toEqual([]);
  });
});

describe('each obligation fires on real state, and names the vendor', () => {
  test('a missing COI produces one row that says why', () => {
    const rows = vendorObligations(EV([booked({ coiStatus: 'missing' })]));
    const coi = rows.find((r) => r.id.startsWith('d_coi'));
    expect(coi).toBeTruthy();
    expect(coi.label).toContain('Acme Catering');       // routes to a person, not a tab
    expect(coi.why).toMatch(/turn a vendor away|load-in/i);
    expect(coi.vendorId).toBe('v1');
    expect(coi.derived).toBe(true);
  });

  test('unpaid deposit, unsigned contract and unset arrival each produce exactly one row', () => {
    const rows = vendorObligations(EV([booked({
      depositPaid: false, contractSigned: false, arrivalTime: null,
    })]));
    expect(rows.filter((r) => r.id.startsWith('d_dep'))).toHaveLength(1);
    expect(rows.filter((r) => r.id.startsWith('d_con'))).toHaveLength(1);
    expect(rows.filter((r) => r.id.startsWith('d_arr'))).toHaveLength(1);
  });

  test('UNDEFINED is not FALSE — an unanswered field owes nothing', () => {
    // The subtle one. `depositPaid: undefined` means the host has not said, and
    // that is different from having said no. Treating absence as an obligation
    // would fabricate a debt out of a blank field.
    const rows = vendorObligations(EV([{
      id: 'v2', name: 'DJ Sol', status: 'Booked', coiStatus: 'received', arrivalTime: '15:00',
    }]));
    expect(rows.filter((r) => r.id.startsWith('d_dep'))).toEqual([]);
    expect(rows.filter((r) => r.id.startsWith('d_con'))).toEqual([]);
  });

  test('two vendors owing different things do not collide on id', () => {
    const rows = vendorObligations(EV([
      booked({ id: 'a', name: 'Acme', coiStatus: 'missing' }),
      booked({ id: 'b', name: 'Sol', depositPaid: false }),
    ]));
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    expect(rows).toHaveLength(2);
  });

  test('a certificate ALREADY IN HAND raises nothing, verified or not', () => {
    // `getVendorCOIState` puts "received" one rung below "verified", and the
    // first version of this module fired on that gap — telling a host to get a
    // document they were holding. Received is in hand; the verify step is the
    // cockpit's business, not a checklist row.
    expect(vendorObligations(EV([booked({ coiStatus: 'received' })]))).toEqual([]);
    expect(vendorObligations(EV([booked({ coiStatus: 'received', coiVerified: true })]))).toEqual([]);
  });
});

describe('it stays on the PREP side of the line', () => {
  test('no derived row is a day-of beat', () => {
    // The board scoped derivation to prep and barred it from the day-of
    // program, which is authored ritual no engine can infer. "Agree an arrival
    // time" is a prep act; "cue the processional" is not derivable and must
    // never appear here.
    const rows = vendorObligations(EV([booked({
      coiStatus: 'missing', depositPaid: false, contractSigned: false, arrivalTime: null,
    })]));
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.phase).toBe('vendor');
      expect(r.when).toMatch(/^T-\d+d$/);        // strictly before the day
      expect(r.when).not.toMatch(/^T0/);
    }
  });

  test('every row carries the shape the render seam expects', () => {
    const rows = vendorObligations(EV([booked({ coiStatus: 'missing' })]));
    for (const r of rows) {
      expect(typeof r.id).toBe('string');
      expect(typeof r.label).toBe('string');
      expect(r.label.length).toBeGreaterThan(8);
      expect(r.derived).toBe(true);
    }
  });

  test('the count matches the rows — a rollup must not overstate', () => {
    const ev = EV([booked({ coiStatus: 'missing', depositPaid: false })]);
    expect(vendorObligationCount(ev)).toBe(vendorObligations(ev).length);
    expect(vendorObligationCount(EV([booked()]))).toBe(0);
  });
});
