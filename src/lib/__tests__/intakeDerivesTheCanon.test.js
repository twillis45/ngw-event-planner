// ─── A MIRROR IS A COPY WITH A PROMISE ATTACHED ──────────────────────────────
//
// workstreams.js exported the PREDICATES but not the SETS. csvParsers needs the
// vocabulary itself — "is this a status this app tracks at all" is a question
// about the list, not about one vendor — so it kept a hand-written copy with a
// comment promising the two matched.
//
// They did not match, and the failure is on the record: 'Booked' and 'Paid' are
// in both canonical sets and hostv2's cycleVendorStatus treats them as
// synonyms of 'Confirmed' — but they were missing from the importer's list. Only
// members of that list get case-normalised, so `booked` from a CSV landed in the
// store as `booked`, which `isVendorBooked` answers FALSE for. The import
// produced a vendor that read as never-contacted.
//
// The sets are exported now and intake derives from them. This file pins the
// derivation as a PROPERTY rather than re-listing the statuses, because a test
// that repeats the list is a third copy.
import {
  BOOKED_STATUSES, CONFIRMED_STATUSES, SHOPPING_STATUSES, ALL_VENDOR_STATUSES,
  isVendorBooked, isVendorConfirmed,
} from '../workstreams';
import { transformVendorRows } from '../csvParsers';

// The importer reads TITLE-CASE CSV HEADERS ('Status'), not the stored field
// name. My first draft passed `status` and every row came back as the coercion
// fallback — which looked exactly like a code failure and was a test failure.
// Asserted below so the next reader does not spend that time again.
const storedStatus = (raw) => {
  const rows = transformVendorRows([{ 'Vendor Name': 'Aurora', 'Email': 'a@b.co', 'Status': raw }]);
  const r = Array.isArray(rows) ? rows[0] : (rows && rows.rows ? rows.rows[0] : null);
  return r ? r.status : undefined;
};

describe('the canon is one object, not three lists', () => {
  test('confirmed is a subset of booked — the two rungs, not two vocabularies', () => {
    for (const s of CONFIRMED_STATUSES) expect(BOOKED_STATUSES.has(s)).toBe(true);
  });

  test('shopping and booked do not overlap — a status is one or the other', () => {
    for (const s of SHOPPING_STATUSES) expect(BOOKED_STATUSES.has(s)).toBe(false);
  });

  test('the union is exactly shopping + booked, nothing invented in between', () => {
    expect([...ALL_VENDOR_STATUSES].sort())
      .toEqual([...new Set([...SHOPPING_STATUSES, ...BOOKED_STATUSES])].sort());
  });

  test('the sets are frozen — a consumer cannot edit the canon it reads', () => {
    // A Set that a caller can .add() to is a shared mutable global, and this
    // file exists because the vocabulary drifted once already.
    expect(Object.isFrozen(BOOKED_STATUSES)).toBe(true);
    expect(Object.isFrozen(CONFIRMED_STATUSES)).toBe(true);
    expect(Object.isFrozen(ALL_VENDOR_STATUSES)).toBe(true);
  });
});

describe('intake accepts exactly what the app tracks', () => {
  test('(premise) the probe actually reaches the status column', () => {
    // Without this, every assertion below passes vacuously the day the header
    // name changes — each one would just read the coercion fallback.
    expect(storedStatus('Quoted')).toBe('Quoted');
    expect(storedStatus('Quoted')).not.toBe('Considering');
  });

  test('every canonical status survives import unchanged', () => {
    // The property that was false: Booked and Paid were real and rejected.
    for (const s of ALL_VENDOR_STATUSES) expect(storedStatus(s)).toBe(s);
  });

  test('every canonical status case-normalises', () => {
    // The sharper half of the old defect — a rejected status is not merely
    // flagged, it skips normalisation and lands lowercase in the store.
    for (const s of ALL_VENDOR_STATUSES) {
      expect(storedStatus(s.toLowerCase())).toBe(s);
      expect(storedStatus(s.toUpperCase())).toBe(s);
    }
  });

  test('a stored status always answers the predicates the same way', () => {
    // The end-to-end claim: import a status, and the readiness engines agree
    // with the ladder about what it means.
    for (const s of ALL_VENDOR_STATUSES) {
      const stored = storedStatus(s);
      expect(isVendorBooked({ status: stored })).toBe(BOOKED_STATUSES.has(s));
      expect(isVendorConfirmed({ status: stored })).toBe(CONFIRMED_STATUSES.has(s));
    }
  });

  test('NEGATIVE CONTROL: an off-vocabulary status is still refused', () => {
    // Deriving the list must not have widened it. 'Partial' is the phantom that
    // reached a store this way and rendered an amber badge while isVendorBooked
    // answered false on the same screen.
    for (const junk of ['Partial', 'Pencilled in', 'Signed', 'Confirmed-ish', 'Ghosted']) {
      expect(storedStatus(junk)).not.toBe(junk);
      expect(isVendorBooked({ status: storedStatus(junk) })).toBe(false);
    }
  });

  test('NEGATIVE CONTROL: the phantom cannot be smuggled in by case', () => {
    for (const junk of ['partial', 'PARTIAL']) {
      expect(String(storedStatus(junk)).toLowerCase()).not.toBe('partial');
    }
  });
});
