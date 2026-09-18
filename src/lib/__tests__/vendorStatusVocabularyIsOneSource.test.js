// ─── ONE VENDOR-STATUS VOCABULARY, READ FROM ONE PLACE ───────────────────────
//
// workstreams.js owns the canonical vendor-status predicates: BOOKED_STATUSES
// via isVendorBooked ("the host is on the hook for this vendor") and
// CONFIRMED_STATUSES via isVendorConfirmed ("nothing left to confirm"). Engine
// adoption is broad, but private copies survived in four write-adjacent and
// closeout readers, each with its own word list:
//
//   phaseProgress.js   /confirmed|booked|contracted/i   (closeout "payments")
//   vendorContact.js   status.toLowerCase() === 'confirmed'
//   eventMemory.js     status === 'Confirmed' || status === 'Booked'
//   analyticsReader.js status === 'Confirmed' || status === 'Booked'
//   vendorAccountability/derive.js  Set(['Confirmed','Contracted','Deposit Paid'])
//
// Every one of them disagreed with the canonical set and with each other, so the
// SAME vendor read committed on one surface and not-started on the next. This
// suite locks the behaviour at each of those five sites against the canonical
// predicate, and each block carries a NEGATIVE CONTROL — a status or a state
// that must still come back negative — because a gate that cannot fail is not a
// gate.
//
// Deliberately behavioural: these run the real functions, not the source text.

import { deriveEventPhaseProgress } from '../phaseProgress';
import { contactState, silentVendors, SILENCE_DAYS } from '../vendorContact';
import { vendorMemoryFor } from '../eventMemory';
import { memoryDepth } from '../analyticsReader';
import { inferPromisesFromVendor } from '../vendorAccountability/derive';
import { isVendorBooked } from '../workstreams';

// The full status ladder the app stores, including the legacy synonyms the host
// shell still reads and writes.
const COMMITTED = ['Contracted', 'Deposit Paid', 'Confirmed', 'Booked', 'Paid'];
const SHOPPING = ['Considering', 'Quoted'];

test('the canonical predicate is the oracle these blocks are measured against', () => {
  // If this ever fails, the fixtures below are testing the wrong ladder.
  for (const status of COMMITTED) expect(isVendorBooked({ status })).toBe(true);
  for (const status of SHOPPING) expect(isVendorBooked({ status })).toBe(false);
  // NEGATIVE CONTROL: the predicate is a closed set, not a truthiness check.
  expect(isVendorBooked({ status: 'Ghosted' })).toBe(false);
  expect(isVendorBooked({})).toBe(false);
});

// ── 1. CLOSEOUT PAYMENTS — a status word is not a receipt ────────────────────
// MEASURED before the fix, event 5 days past, one vendor, cost 6000,
// balancePaid false, no depositPaid/contractSigned:
//   Contracted / Confirmed / Booked → handled false, "1 thing left"
//   Deposit Paid / Paid             → handled TRUE, "All wrapped up"
// 'Deposit Paid' is one pill tap away in the host shell, and that tap patches
// the status alone — so the app told a host they were finished with 6000 owed.
describe('closeout payments follow the MONEY, not the status word', () => {
  const NOW = new Date('2026-09-18T12:00:00');
  const past = (vendor) => deriveEventPhaseProgress({
    id: 'e1', name: 'X', type: 'Birthday Party', date: '2026-09-13',
    vendors: [{ id: 'v1', name: 'Fired Up BBQ', cost: 6000, balancePaid: false, ...vendor }],
    guests: [],
  }, NOW);
  const paymentsItem = (p) => (p.items || []).find((i) => i.id === 'payments');

  it.each(COMMITTED)('%s with an outstanding balance is NOT wrapped up', (status) => {
    const p = past({ status });
    expect(p.phase).toBe('post_event');
    expect(paymentsItem(p).handled).toBe(false);
    expect(paymentsItem(p).cueLabel).toBe('Settle up with Fired Up BBQ');
    expect(p.summary).toBe('1 thing left');
    expect(p.summary).not.toMatch(/All wrapped up/);
  });

  // NEGATIVE CONTROL 1 — the gate must be capable of saying "done".
  it('a paid balance IS wrapped up, whatever the status says', () => {
    for (const status of COMMITTED) {
      const p = past({ status, balancePaid: true });
      expect(paymentsItem(p).handled).toBe(true);
      expect(paymentsItem(p).cueLabel).toBe(null);
      expect(p.summary).toBe('All wrapped up');
    }
  });

  // NEGATIVE CONTROL 2 — shopping is not a debt. A quote you never accepted is
  // not money you owe, and the closeout must not invent a bill from one.
  it.each(SHOPPING)('%s with no money committed raises nothing', (status) => {
    const p = past({ status });
    expect(paymentsItem(p).handled).toBe(true);
    expect(p.summary).toBe('All wrapped up');
  });

  // The predicate is money, so it catches a case NO status list could: real
  // money out the door on a vendor still parked on 'Considering'.
  it('a deposit actually paid is a debt even under a shopping status', () => {
    const p = past({ status: 'Considering', depositPaid: true, depositAmt: 1000 });
    expect(paymentsItem(p).handled).toBe(false);
    expect(paymentsItem(p).cueLabel).toBe('Settle up with Fired Up BBQ');
  });

  it('a deposit paid leaves the REMAINING balance owed, not the whole cost', () => {
    const p = past({ status: 'Deposit Paid', depositPaid: true, depositAmt: 1000 });
    expect(paymentsItem(p).handled).toBe(false); // 5000 still out
  });
});

// ── 2. SILENCE — a committed vendor has, by definition, come back to you ─────
// MEASURED before the fix with outreach logged 25 days ago (SILENCE_DAYS 21) and
// no money flags: Contracted, Deposit Paid, Booked and Paid all returned
// silent:true / awaitingReply:true. Six of seven statuses read as silence, so a
// vendor card could show an amber "Silent 25 days" chip beside a "Locked in"
// label on the same screen.
describe('a committed status is evidence of a reply', () => {
  const NOW = new Date('2026-09-18T12:00:00');
  const daysBefore = (n) => new Date(NOW.getTime() - n * 86400000).toISOString();
  const stale = { lastContactedAt: daysBefore(25), lastContactSource: 'host-logged' };

  it.each(COMMITTED)('%s is neither silent nor awaiting a reply', (status) => {
    const s = contactState({ ...stale, status }, NOW);
    expect(s.daysSince).toBe(25);
    expect(s.awaitingReply).toBe(false);
    expect(s.silent).toBe(false);
  });

  it('accepts the stored casing and a lowercased status alike', () => {
    // The module's existing contract: 'confirmed' has always counted.
    expect(contactState({ ...stale, status: 'confirmed' }, NOW).silent).toBe(false);
    expect(contactState({ ...stale, status: 'deposit paid' }, NOW).silent).toBe(false);
  });

  // NEGATIVE CONTROL 1 — shopping statuses must STILL go silent. That is the
  // whole point of the surface: 25 days of nothing back from someone you are
  // still choosing between is exactly what the host needs to see.
  it.each(SHOPPING)('%s with no reply IS still silent', (status) => {
    const s = contactState({ ...stale, status }, NOW);
    expect(s.awaitingReply).toBe(true);
    expect(s.silent).toBe(true);
  });

  // NEGATIVE CONTROL 2 — an unrecognised word must not be quietly promoted into
  // evidence. This is what a loose regex would get wrong.
  it('an unknown status is not evidence of anything', () => {
    expect(contactState({ ...stale, status: 'Ghosted' }, NOW).silent).toBe(true);
    expect(contactState({ ...stale, status: 'Confirmed-ish' }, NOW).silent).toBe(true);
    expect(contactState({ ...stale, status: '' }, NOW).silent).toBe(true);
  });

  // NEGATIVE CONTROL 3 — the day line still bites.
  it('recent contact is not silence regardless of status', () => {
    const fresh = { lastContactedAt: daysBefore(SILENCE_DAYS - 1), lastContactSource: 'host-logged' };
    expect(contactState({ ...fresh, status: 'Quoted' }, NOW).silent).toBe(false);
  });

  it('silentVendors names only the vendors who really owe a reply', () => {
    const event = {
      vendors: [
        ...COMMITTED.map((status, i) => ({ id: `c${i}`, name: status, ...stale, status })),
        ...SHOPPING.map((status, i) => ({ id: `s${i}`, name: status, ...stale, status })),
      ],
    };
    expect(silentVendors(event, NOW).map((x) => x.vendor.name).sort())
      .toEqual([...SHOPPING].sort());
  });
});

// ── 3. VENDOR MEMORY — a track record of vendors USED ────────────────────────
// MEASURED before the fix across two past events holding the same vendor:
// Confirmed → 2 uses / rehired, Booked → 2 / rehired, Contracted, Deposit Paid
// and Paid → null. A caterer you paid a deposit to three times had no history.
describe('vendor memory counts every status the engine calls committed', () => {
  const twoPastEventsAt = (status) => ([
    { id: 'p1', vendors: [{ id: 'a', name: 'Bloom & Stem', status }] },
    { id: 'p2', vendors: [{ id: 'b', name: 'Bloom & Stem', status }] },
  ]);

  it.each(COMMITTED)('%s counts as a use, twice over is a rehire', (status) => {
    const m = vendorMemoryFor(twoPastEventsAt(status), 'Bloom & Stem', 'cur');
    expect(m).not.toBe(null);
    expect(m.timesUsed).toBe(2);
    expect(m.rehired).toBe(true);
  });

  // NEGATIVE CONTROL — considering a vendor is not hiring them. A track record
  // built from shortlists would be worthless.
  it.each(SHOPPING)('%s is NOT a use — there is no memory to report', (status) => {
    expect(vendorMemoryFor(twoPastEventsAt(status), 'Bloom & Stem', 'cur')).toBe(null);
  });

  it('a single use is a use but not a rehire', () => {
    const m = vendorMemoryFor([twoPastEventsAt('Deposit Paid')[0]], 'Bloom & Stem', 'cur');
    expect(m.timesUsed).toBe(1);
    expect(m.rehired).toBe(false);
  });
});

// ── 4. ANALYTICS memoryDepth — same question, same answer ────────────────────
// MEASURED before the fix over two events each holding the same vendor:
// Confirmed → 2 tracked / 1 rehired, Booked → 2 / 1, Contracted, Deposit Paid
// and Paid → 0 / 0.
describe('memoryDepth counts committed vendors, not one vocabulary of them', () => {
  const book = (status) => ([
    { id: 'evt-1', vendors: [{ id: 'a', name: 'Acme', status }] },
    { id: 'evt-2', vendors: [{ id: 'b', name: 'acme', status }] },
  ]);

  it.each(COMMITTED)('%s is tracked and rehired across two events', (status) => {
    const d = memoryDepth(book(status));
    expect(d.vendorsTracked).toBe(2);
    expect(d.rehiredVendors).toBe(1);
  });

  // NEGATIVE CONTROL — a book of shortlists must not read as a book of history.
  it.each(SHOPPING)('%s is tracked nowhere', (status) => {
    const d = memoryDepth(book(status));
    expect(d.vendorsTracked).toBe(0);
    expect(d.rehiredVendors).toBe(0);
  });

  it('memoryDepth and vendorMemoryFor cannot disagree about the same vendor', () => {
    // The two readers were the two spellings of the same pair. Lock them together.
    for (const status of [...COMMITTED, ...SHOPPING]) {
      const tracked = memoryDepth(book(status)).vendorsTracked > 0;
      const remembered = vendorMemoryFor(book(status), 'Acme', 'cur') !== null;
      expect(tracked).toBe(remembered);
    }
  });
});

// ── 5. SCOPE CONFIRMED BY STATUS ─────────────────────────────────────────────
// The scope_confirmed promise is declared by exactly one playbook — the OTHER
// fallback — so this only reaches vendors with a blank or unrecognised category.
// That is NOT nothing: a blank category is what a quick vendor add leaves.
// MEASURED before the fix, category undefined, no contract fields:
//   Contracted / Deposit Paid / Confirmed → 'confirmed'
//   Booked / Paid                         → 'not_requested'
describe('scope-confirmed-by-status reads the canonical set', () => {
  const EVENT = { id: 'e1', name: 'X', type: 'Birthday Party', date: '2026-12-01' };
  const scopeOf = (vendor) =>
    (inferPromisesFromVendor(vendor, EVENT) || []).find((p) => p.promiseKey === 'scope_confirmed');

  it('the fallback playbook really does carry the promise (the fixture is live)', () => {
    // Without this, every assertion below could pass on an absent promise.
    expect(scopeOf({ id: 'v1', name: 'N', status: 'Considering' })).toBeTruthy();
  });

  it.each(COMMITTED)('%s marks the scope agreed', (status) => {
    expect(scopeOf({ id: 'v1', name: 'N', status }).status).toBe('confirmed');
  });

  // NEGATIVE CONTROL 1 — shopping does not agree a scope.
  it.each(SHOPPING)('%s leaves the scope open', (status) => {
    expect(scopeOf({ id: 'v1', name: 'N', status }).status).not.toBe('confirmed');
  });

  // NEGATIVE CONTROL 2 — a status is not a document. The evidence honesty rule
  // this file already enforces must survive the widening.
  it('a committed status still attaches NO proof', () => {
    for (const status of COMMITTED) {
      const p = scopeOf({ id: 'v1', name: 'N', status });
      expect(p.status).toBe('confirmed');
      expect(p.evidenceStatus).toBe('none'); // not 'attached' — nothing was uploaded
    }
  });

  // A specialised playbook has no scope_confirmed promise at all, so nothing
  // here reaches it either way. Recorded so a future reader knows the blast
  // radius was measured rather than assumed.
  it('a specialised category is untouched by this predicate', () => {
    expect(scopeOf({ id: 'v1', name: 'N', category: 'Catering', status: 'Booked' })).toBeUndefined();
  });
});
