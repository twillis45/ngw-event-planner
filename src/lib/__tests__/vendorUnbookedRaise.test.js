// ─── A WEDDING THREE DAYS OUT WITH NO CATERER SAID NOTHING ──────────────────
//
// W8's last Coverage cap, and the shell documented it against itself at
// `HostShellV2.jsx:9189` — "no SURFACES id covers 'not yet booked' … add a real
// raiser before adding another."
//
// Measured before this existed, with a Caterer at `Shortlisted` and a DJ at
// `Contacted`: at T-120, T-45, T-20, T-7 and even **T-3** the ranked list said
// nothing about either. Twenty raises three days before a wedding, none of them
// "you have no caterer". The only matches at any distance were two standing risk
// cards that render whether every vendor is booked or none is.
//
// THE THRESHOLD IS AUTHORED. Playbooks declare a booking lead per category —
// `{ category: 'Caterer', required: true, when: 'T-300d' }` — so "should have
// been booked by now" is a declared fact, not a number I picked.
//
// MATCHED IS NOT BOOKED. `buildVendorPlan.booked` means a row EXISTS in that
// category; vendorPlan.js documents that distinction deliberately. A Shortlisted
// caterer is matched and not booked, which is the entire case this raiser exists
// for — so it resolves `vendorId` and asks `isVendorBooked`.
import { raiseAll } from '../surfaceRegistry';

const isoIn = (days) => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const EV = (over = {}) => ({
  id: 'ev-ub', type: 'Wedding', date: isoIn(20), guestMode: 'count', guestCount: 80,
  venue: 'The Hall', venueCity: 'Santa Fe, NM', venueState: 'NM', totalBudget: 12000,
  // `category`, not `role`: buildVendorPlan's matcher keys on `v.category` (it
  // normalizes 'Catering' to 'Caterer', but only on that field). My first fixture
  // used `role` and a genuinely-Booked caterer was still raised — the match never
  // resolved, so the raiser could not see the status. The repo's own COI_PATCH
  // fixture uses `category`, which is the real shape.
  vendors: [
    { id: 'v1', name: 'Acme Catering', category: 'Caterer', status: 'Shortlisted' },
    { id: 'v2', name: 'Sol DJ', category: 'Band or DJ', status: 'Contacted' },
  ],
  ...over,
});

const unbooked = (event) => (raiseAll(event) || []).filter((r) => r && String(r.key || '').startsWith('vendor-unbooked'));

describe('it speaks once the authored booking window has passed', () => {
  test('PREMISE — the ledger is real and the fixture reaches the vendor plan', () => {
    expect((raiseAll(EV()) || []).length).toBeGreaterThan(5);
    expect(unbooked(EV()).length).toBeGreaterThan(0);
  });

  test('a Shortlisted caterer 20 days out is raised — matched is not booked', () => {
    const rows = unbooked(EV());
    expect(rows.some((r) => /caterer/i.test(r.title))).toBe(true);
  });

  test('it says how far past the authored window the host is', () => {
    const row = unbooked(EV()).find((r) => /caterer/i.test(r.title));
    expect(row.why).toMatch(/booked by 300d out/);
    expect(row.why).toMatch(/280 days past/);      // 20 − 300
    expect(row.dueInDays).toBe(-280);              // ranks as genuinely late
  });

  test('nothing is raised before any window opens', () => {
    // A wedding 400 days out is EARLY, not behind. The earliest authored lead is
    // T-365d, so at T-400 every category is still inside its window.
    expect(unbooked(EV({ date: isoIn(400) }))).toEqual([]);
  });
});

describe('and refuses every case where the claim would be false', () => {
  test('a genuinely booked vendor is never named', () => {
    const rows = unbooked(EV({ vendors: [
      { id: 'v1', name: 'Acme Catering', category: 'Caterer', status: 'Booked' },
    ] }));
    expect(rows.some((r) => /caterer/i.test(r.title))).toBe(false);
  });

  test('A VENUE THE HOST NAMED IS NOT AN UNBOOKED VENUE', () => {
    // Caught before shipping. The playbook lists Venue as a required VENDOR
    // category, and a host who types a venue name never creates a vendor row for
    // it — so the category looked unmatched while the fact sat on the event.
    // Telling that host they have no venue is the kind of wrong that makes them
    // stop believing the rest of the list.
    expect(unbooked(EV()).some((r) => /venue/i.test(r.title))).toBe(false);
    expect(unbooked(EV({ venue: '' })).some((r) => /venue/i.test(r.title))).toBe(true);
  });

  test('a CITY in the venue field is not a booked hall', () => {
    // venueFor exists because `venue: "Santa Fe, NM"` is a place, not a venue.
    // Accepting a town here would silence the raise on an event with nowhere to be.
    expect(unbooked(EV({ venue: 'Santa Fe, NM' })).some((r) => /venue/i.test(r.title))).toBe(true);
  });

  test('optional categories are never nagged', () => {
    // Only `required: true` rows can be late. A videographer is a choice.
    expect(unbooked(EV()).some((r) => /videographer/i.test(r.title))).toBe(false);
  });

  test('a past event raises nothing', () => {
    expect(unbooked(EV({ date: isoIn(-2) }))).toEqual([]);
  });

  test('junk input is answered, not thrown at', () => {
    expect(() => raiseAll({ id: 'x', type: 'Wedding', date: isoIn(20), vendors: null })).not.toThrow();
    expect(() => raiseAll({ id: 'x', type: 'Wedding', date: isoIn(20), vendors: [null, {}] })).not.toThrow();
  });
});
