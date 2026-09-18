// ─── ONE VENDOR-STATUS VOCABULARY — THE READINESS READERS ────────────────────
//
// Companion to vendorStatusVocabularyIsOneSource.test.js, which covers the
// write-adjacent and closeout readers. This file covers the five READINESS
// readers that still carried private copies of the canonical sets, plus the ONE
// intake writer that could mint a status outside them.
//
// Canonical source: workstreams.js
//   isVendorBooked    — BOOKED_STATUSES    {Confirmed, Booked, Paid, Deposit Paid, Contracted}
//                       "secured for the day"
//   isVendorConfirmed — CONFIRMED_STATUSES {Confirmed, Booked, Paid}
//                       "fully locked in, nothing left to confirm"
//
// The survivors, and what each one spelled instead:
//
//   vendorIntelligence  getVendorChallengeSummary  isCommitted = 4-value list, no 'Paid'
//                                                  isConfirmed = Confirmed|Booked
//                       getVendorNextAction        same pair
//                       getVendorPlanningState     same pair
//                       getActionableNextStep      status !== 'Confirmed' && !== 'Booked'
//                       getVendorLifecycleStage    case 'Booked' one rung below 'Confirmed',
//                                                  'Paid' falling to the default
//   vendorQuestions     generic scope question     'Confirmed' || 'Booked'
//   vendorCopilot       `committed`                4-value list, no 'Paid'
//   CommandCenter       figmaBadge                 Confirmed|Booked, + a 'Partial' rung
//                       cateringVendor             5-value list incl. 'Partial'
//                       stale-vendor signal        4-value list, no 'Paid'
//   csvParsers          VALID_VENDOR_STATUS        accepted neither 'Booked' nor 'Paid',
//                                                  and wrote anything else through verbatim
//
// 'Paid' is the hole every one of them shared, and 'Paid' is a status the rest
// of the app treats as equivalent to 'Confirmed'. The measured before/after for
// each block is recorded above it.
//
// Every block carries a NEGATIVE CONTROL: a status that must STILL come back
// negative, or a state the widening must not have swallowed. A gate that cannot
// fail is not a gate.
//
// Deliberately behavioural throughout — these run the real functions. Nothing
// here reads source text.

import {
  getVendorChallengeSummary,
  getVendorNextAction,
  getVendorPlanningState,
  getActionableNextStep,
  getVendorLifecycleStage,
} from '../vendorIntelligence';
import { getVendorRequiredQuestions } from '../vendorQuestions';
import { buildVendorCopilotContext, getRuleBasedPreview } from '../vendorCopilot';
import { transformVendorRows, validateVendorRows, applyVendorMerge } from '../csvParsers';
import { deriveCommandCenterData, getCrossEventAttentionItems } from '../../CommandCenter';
import { isVendorBooked, isVendorConfirmed } from '../workstreams';

// The stored ladder, plus the legacy synonyms the app still reads.
const CONFIRMED = ['Confirmed', 'Booked', 'Paid'];        // fully locked in
const BOOKED_ONLY = ['Contracted', 'Deposit Paid'];       // secured, confirm still open
const BOOKED = [...CONFIRMED, ...BOOKED_ONLY];
const SHOPPING = ['Considering', 'Quoted'];
// Words that look like statuses and are not. 'Partial' is here on purpose: it
// was read by three CommandCenter branches and written by nothing.
const OFF_VOCABULARY = ['Partial', 'Pencilled in', 'Signed', 'Confirmed-ish'];

const iso = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

// ── 0. THE ORACLE ────────────────────────────────────────────────────────────
// If this block is wrong every fixture below is measured against the wrong
// ladder, so it is asserted first rather than assumed.
describe('the canonical predicates are the oracle', () => {
  it('BOOKED covers the secured rungs and CONFIRMED the locked-in ones', () => {
    for (const status of BOOKED) expect(isVendorBooked({ status })).toBe(true);
    for (const status of CONFIRMED) expect(isVendorConfirmed({ status })).toBe(true);
  });

  // NEGATIVE CONTROL — the two predicates are NOT the same question. If a future
  // edit collapses them, every "booked but not yet confirmed" middle state in the
  // app silently becomes "done", which is the exact lie workstreams.js was split
  // to prevent.
  it('booked is strictly weaker than confirmed', () => {
    for (const status of BOOKED_ONLY) {
      expect(isVendorBooked({ status })).toBe(true);
      expect(isVendorConfirmed({ status })).toBe(false);
    }
  });

  // NEGATIVE CONTROL — closed sets, not truthiness.
  it('shopping and off-vocabulary statuses are neither', () => {
    for (const status of [...SHOPPING, ...OFF_VOCABULARY, '']) {
      expect(isVendorBooked({ status })).toBe(false);
      expect(isVendorConfirmed({ status })).toBe(false);
    }
    expect(isVendorBooked({})).toBe(false);
    expect(isVendorConfirmed({})).toBe(false);
  });
});

// ── 1. vendorIntelligence — the cockpit's four readers ───────────────────────
// MEASURED before the fix, category DJ, cost 1000, event 2026-12-01, no contract
// / deposit / balance flags:
//
//   status        challenge.booking  note                              nextAction.title                  planning.contract
//   Confirmed     attention          Confirmed but no contract on file  Get the signed contract from Acme  missing
//   Booked        attention          Confirmed but no contract on file  Get the signed contract from Acme  missing
//   Paid          attention          Status: Paid.                      Follow up with Acme.               pending
//
// 'Paid' fell off every confirmed branch and landed on the generic `Status: X.`
// fallback — the branch meant for words the app does not know. AFTER: the 'Paid'
// row is identical to the 'Confirmed' row.
describe('vendorIntelligence reads the canonical sets', () => {
  const EVENT = { id: 'e1', name: 'Gala', type: 'Birthday Party', date: '2026-12-01', guests: [], vendors: [] };
  const vendorAt = (status) => ({ id: 'v1', name: 'Acme', category: 'DJ', status, cost: 1000 });
  const contractOf = (status) =>
    (getVendorPlanningState(vendorAt(status), EVENT).find((p) => p.key === 'contract') || {}).status;

  it.each(CONFIRMED)('%s gets the confirmed-but-no-contract reading, not the unknown-word fallback', (status) => {
    const cs = getVendorChallengeSummary(vendorAt(status), EVENT);
    expect(cs.booking.level).toBe('attention');
    expect(cs.booking.note).toBe('Confirmed but no contract on file.');
    expect(cs.booking.note).not.toMatch(/^Status: /);
    expect(getVendorNextAction(vendorAt(status), EVENT).title).toBe('Get the signed contract from Acme.');
    expect(contractOf(status)).toBe('missing');
  });

  it.each(BOOKED_ONLY)('%s stays on the booked-not-confirmed rung', (status) => {
    const cs = getVendorChallengeSummary(vendorAt(status), EVENT);
    expect(cs.booking.note).toBe('Booking in progress — not yet confirmed.');
    // NEGATIVE CONTROL: the widening must NOT have promoted these to confirmed.
    expect(contractOf(status)).toBe('pending');
  });

  // NEGATIVE CONTROL — shopping still reads as shopping.
  it('Considering is not booked and Quoted needs a decision', () => {
    expect(getVendorChallengeSummary(vendorAt('Considering'), EVENT).booking.level).toBe('not_started');
    expect(getVendorChallengeSummary(vendorAt('Quoted'), EVENT).booking.note)
      .toBe('Quoted — needs decision before booking.');
  });

  // NEGATIVE CONTROL — the unknown-word fallback must survive. It is the branch
  // 'Paid' was wrongly landing on, so proving it still exists proves the fix was
  // a narrowing of that branch, not its removal.
  it.each(OFF_VOCABULARY)('%s still falls to the honest unknown-status fallback', (status) => {
    expect(getVendorChallengeSummary(vendorAt(status), EVENT).booking.note).toBe(`Status: ${status}.`);
  });

  // getActionableNextStep is a WRITE cta: it patches status to 'Confirmed'.
  // MEASURED before the fix, sourceCategory 'booking', no other vendor fields:
  //   Considering / Quoted / Contracted / Deposit Paid  -> 'Mark confirmed'
  //   Confirmed / Booked                                -> 'Review & update'
  //   Paid                                              -> 'Mark confirmed'  <-
  // The cockpit offered to confirm a vendor the canonical predicate already
  // calls confirmed — a button whose work was already done, and which would have
  // rewritten 'Paid' to 'Confirmed' on click.
  //
  // NOTE for future readers: the field is `sourceCategory`, NOT `category`. An
  // earlier draft of this block passed `{ category: 'booking' }`, every status
  // fell through to the generic 'Review & update', and the negative control
  // below is what caught it. Keep the negative control.
  describe('the one-click "Mark confirmed" write', () => {
    const bookingStep = (status) => getActionableNextStep({ sourceCategory: 'booking' }, vendorAt(status));

    it.each(CONFIRMED)('is NOT offered on %s', (status) => {
      const step = bookingStep(status);
      expect(step && step.ctaLabel).not.toBe('Mark confirmed');
    });

    // NEGATIVE CONTROL — it must still be offered where it does work.
    it.each([...BOOKED_ONLY, ...SHOPPING, ...OFF_VOCABULARY])('IS still offered on %s', (status) => {
      const step = bookingStep(status);
      expect(step.ctaLabel).toBe('Mark confirmed');
      expect(step.patch).toEqual({ status: 'Confirmed' });
    });
  });

  // MEASURED before: Confirmed → 'Locked in', Booked → 'Booked', Paid → 'Booked'
  // (via the default arm). Two statuses the canonical set calls identical to
  // 'Confirmed' rendered a rung below it.
  describe('the lifecycle stage label', () => {
    const EVENT_FAR = { id: 'e1', date: iso(120) };

    it.each(CONFIRMED)('%s is Locked in', (status) => {
      expect(getVendorLifecycleStage(vendorAt(status), EVENT_FAR)).toBe('Locked in');
    });

    it('Deposit Paid is Booked and Contracted is Booking — the rungs below survive', () => {
      expect(getVendorLifecycleStage(vendorAt('Deposit Paid'), EVENT_FAR)).toBe('Booked');
      expect(getVendorLifecycleStage(vendorAt('Contracted'), EVENT_FAR)).toBe('Booking');
    });

    // NEGATIVE CONTROL — shopping is still a Lead, and the date rules still win
    // over the status rules.
    it('Considering is a Lead, and event day beats every status', () => {
      expect(getVendorLifecycleStage(vendorAt('Considering'), EVENT_FAR)).toBe('Lead');
      expect(getVendorLifecycleStage(vendorAt('Confirmed'), { id: 'e1', date: iso(0) })).toBe('Event Day');
    });

    // KNOWN OVER-CLAIM, DELIBERATELY LEFT IN PLACE. The default arm answers
    // 'Booked' for a status no predicate in the repo recognises. It is not fixed
    // here because after the csvParsers coercion below nothing can mint such a
    // status any more, and re-staging vendors already sitting on a legacy value
    // in a real store is a data decision, not a code one. Asserted so the
    // over-claim is on the record and cannot change unnoticed.
    it.each(OFF_VOCABULARY)('%s STILL over-claims as Booked (known, unfixed)', (status) => {
      expect(getVendorLifecycleStage(vendorAt(status), EVENT_FAR)).toBe('Booked');
    });
  });
});

// ── 2. vendorQuestions — the generic scope question ──────────────────────────
// MEASURED before the fix, vendor with no category (the generic fallback
// template, which is what a quick vendor add with a blank category gets):
//   Confirmed → 'answered', Booked → 'answered', Paid → 'unknown'.
describe('the generic scope question reads the canonical confirmed set', () => {
  const EVENT = { id: 'e1', date: '2026-12-01' };
  const scopeOf = (status) =>
    getVendorRequiredQuestions({ id: 'v1', name: 'Acme', status }, EVENT).find((q) => q.key === 'scope');

  it('the fixture really produces the generic template (the question exists)', () => {
    // Without this, every assertion below could pass on an absent question.
    expect(scopeOf('Considering')).toBeTruthy();
  });

  it.each(CONFIRMED)('%s answers the scope question', (status) => {
    expect(scopeOf(status).status).toBe('answered');
  });

  // NEGATIVE CONTROL — booking is not agreeing a scope, and neither is a word
  // the app does not know.
  it.each([...BOOKED_ONLY, ...SHOPPING, ...OFF_VOCABULARY])('%s leaves the scope unanswered', (status) => {
    expect(scopeOf(status).status).toBe('unknown');
  });
});

// ── 3. vendorCopilot — the "what's missing" preview ──────────────────────────
// MEASURED before the fix, event 10 days out, DJ vendor, cost 1000, nothing else
// recorded:
//   Confirmed / Booked → 6 missing lines, first is "Contract signed: Not attached"
//   Contracted / Deposit Paid → 5 missing lines
//   Paid → 2 missing lines, first is "Vendor selected: Paid"
// i.e. for a vendor paid in full the copilot told the planner they had not
// picked a vendor yet, and said nothing about the missing contract or arrival
// time ten days out.
describe('the copilot preview counts a Paid vendor as committed', () => {
  const near = { id: 'e1', name: 'Gala', type: 'Birthday Party', date: iso(10), guests: [], vendors: [] };
  const missingFor = (status) => {
    const v = { id: 'v1', name: 'Acme', category: 'DJ', status, cost: 1000 };
    return getRuleBasedPreview(buildVendorCopilotContext(v, near)).missing || [];
  };

  it.each(CONFIRMED)('%s surfaces the contract gap, not a "no vendor selected" line', (status) => {
    const missing = missingFor(status);
    expect(missing.some((m) => /^Contract signed/.test(m))).toBe(true);
    expect(missing.some((m) => /^Vendor selected/.test(m))).toBe(false);
    expect(missing.length).toBe(missingFor('Confirmed').length);
  });

  it.each(BOOKED_ONLY)('%s surfaces the deposit gap', (status) => {
    expect(missingFor(status).some((m) => /^Deposit/.test(m))).toBe(true);
  });

  // NEGATIVE CONTROL — a vendor you are still choosing must NOT get the
  // committed vendor's checklist thrown at them. Widening `committed` must not
  // have widened it to everybody.
  it('Considering is told it has no vendor selected, and nothing more', () => {
    const missing = missingFor('Considering');
    expect(missing.some((m) => /^Vendor selected/.test(m))).toBe(true);
    expect(missing.some((m) => /^Contract signed/.test(m))).toBe(false);
    expect(missing.length).toBeLessThan(missingFor('Confirmed').length);
  });

  it.each(OFF_VOCABULARY)('%s is not treated as committed', (status) => {
    expect(missingFor(status).some((m) => /^Contract signed/.test(m))).toBe(false);
  });
});

// ── 4. CommandCenter — badge, caterer drift, stale signal ────────────────────
// MEASURED before the fix, one Catering vendor, cost 1000, event 2026-12-01:
//   status        board badge     catererDrift (catererCount 10 vs 2 yes RSVPs)
//   Confirmed     CONFIRMED       true
//   Booked        CONFIRMED       true
//   Deposit Paid  PARTIAL         true
//   Paid          NOT STARTED     false        <- paid in full, read as never contacted
//   Partial       PARTIAL         true         <- a status nothing writes
describe('the Command Center board reads the canonical sets', () => {
  const boardFor = (status, extra = {}) => deriveCommandCenterData({
    id: 'e1', name: 'Gala', type: 'Birthday Party', date: '2026-12-01',
    guests: [{ id: 'g1', name: 'A', rsvp: 'Yes' }, { id: 'g2', name: 'B', rsvp: 'Yes' }],
    vendors: [{ id: 'v1', name: 'Acme Catering', category: 'Catering', status, cost: 1000 }],
    ...extra,
  });
  const badgeFor = (status) => (boardFor(status).vendorRows[0] || {}).statusLabel;

  it.each(CONFIRMED)('%s badges CONFIRMED', (status) => {
    expect(badgeFor(status)).toBe('CONFIRMED');
  });

  it.each(BOOKED_ONLY)('%s badges PARTIAL', (status) => {
    expect(badgeFor(status)).toBe('PARTIAL');
  });

  // NEGATIVE CONTROL — the lower rungs must still be distinguishable. If
  // everything badged CONFIRMED the assertions above would be worthless.
  it('Quoted is PENDING and Considering is NOT STARTED', () => {
    expect(badgeFor('Quoted')).toBe('PENDING');
    expect(badgeFor('Considering')).toBe('NOT STARTED');
    expect(badgeFor('')).toBe('NOT STARTED');
  });

  // THE 'Partial' VERDICT. Nothing in the app writes this status — not the host
  // status ladder, not any seed or sample event, not any engine, and (since the
  // csvParsers change below) not the vendor importer either. It was a phantom
  // read by three branches, and while the importer accepted unknown statuses it
  // produced a live contradiction: an amber PARTIAL badge on the board beside
  // isVendorBooked === false in every readiness rollup on the same screen. It is
  // NOT a rung the canonical set is missing, so the branches are gone.
  it('Partial is not a status — it badges like any other unknown word', () => {
    expect(isVendorBooked({ status: 'Partial' })).toBe(false);
    expect(badgeFor('Partial')).toBe('NOT STARTED');
    expect(badgeFor('Partial')).toBe(badgeFor('Pencilled in'));
  });

  // Caterer drift is HOST-REACHABLE: eventPlan() reads catererDrift and raises
  // the headcount mismatch as a next action.
  describe('caterer headcount drift', () => {
    const driftFor = (status) => boardFor(status, { catererCount: 10 }).catererDrift;

    it.each(BOOKED)('%s is a committed caterer, so the mismatch is raised', (status) => {
      expect(driftFor(status)).toBe(true);
    });

    // NEGATIVE CONTROL — drift is only meaningful once a caterer is committed,
    // and only when the numbers actually disagree.
    it.each([...SHOPPING, ...OFF_VOCABULARY])('%s is not a committed caterer', (status) => {
      expect(driftFor(status)).toBe(false);
    });

    it('a matching headcount raises nothing even when the caterer is confirmed', () => {
      expect(boardFor('Confirmed', { catererCount: 2 }).catererDrift).toBe(false);
    });
  });
});

// MEASURED before the fix, event 30 days out, one DJ vendor whose last log entry
// is 40 days old: Contracted / Deposit Paid / Confirmed / Booked each raised one
// stale-vendor item; 'Paid' raised none. A vendor you had already paid could go
// quiet for forty days before the event and never be surfaced.
describe('the stale-vendor signal covers every committed status', () => {
  const staleCount = (status, overrides = {}) => {
    const ev = {
      id: 'e1', name: 'Gala', type: 'Birthday Party', date: iso(30), guests: [],
      vendors: [{ id: 'v1', name: 'Acme', category: 'DJ', status, log: [{ date: iso(-40), text: 'hi' }], ...overrides }],
    };
    return getCrossEventAttentionItems([ev]).filter((i) => i.kind === 'vendor-stale').length;
  };

  it.each(BOOKED)('%s going quiet for 40 days raises a stale item', (status) => {
    expect(staleCount(status)).toBe(1);
  });

  // NEGATIVE CONTROL 1 — an uncommitted vendor going quiet is a different
  // surface's problem (it already shows as an open vendor attention item), so
  // this signal must not fire for them.
  it.each([...SHOPPING, ...OFF_VOCABULARY])('%s raises no stale item', (status) => {
    expect(staleCount(status)).toBe(0);
  });

  // NEGATIVE CONTROL 2 — the DAY line must still bite. Widening the status set
  // must not have made the signal fire on recent contact.
  it('a committed vendor contacted yesterday is not stale', () => {
    expect(staleCount('Paid', { log: [{ date: iso(-1), text: 'hi' }] })).toBe(0);
  });

  // NEGATIVE CONTROL 3 — no log at all is not evidence of silence.
  it('a committed vendor with no log raises nothing', () => {
    expect(staleCount('Paid', { log: [] })).toBe(0);
  });
});

// ── 5. csvParsers — INTAKE, a different failure mode ─────────────────────────
// This is not a readiness predicate. It is the one writer in the repo that can
// put a status into the vendor store that no reader understands.
//
// MEASURED before the change, end to end (transform -> validate -> applyMerge),
// twelve rows in, statuses written to the store:
//   ["Considering","Quoted","Contracted","Deposit Paid","Confirmed","Booked",
//    "booked","Paid","paid","Partial","Pencilled in","Considering"]
// Six of those twelve are values isVendorBooked answers false for, including a
// lowercase 'booked' that arrived as a case variant of a status the app knows.
// Zero rows were marked invalid, so every one of them was written through.
//
// AFTER: ["Considering","Quoted","Contracted","Deposit Paid","Confirmed",
//         "Booked","Booked","Paid","Paid","Considering","Considering","Considering"]
describe('vendor CSV intake cannot mint a status the app does not read', () => {
  const importOne = (Status) => transformVendorRows([{ Name: 'Acme', Email: 'a@x.com', Status }])[0];
  const statusWarning = (row) => (row._warnings || []).find((w) => /^Status /.test(w)) || null;

  it.each([...BOOKED, ...SHOPPING])('%s is accepted and stored as-is', (Status) => {
    const row = importOne(Status);
    expect(row.status).toBe(Status);
    expect(statusWarning(row)).toBe(null);
  });

  it('a case variant of a known status is normalized, not written through', () => {
    // 'booked' used to be stored lowercase, which isVendorBooked answers false
    // for — an import that produced a vendor reading as never contacted.
    for (const [input, expected] of [['booked', 'Booked'], ['paid', 'Paid'], ['quoted', 'Quoted'], ['DEPOSIT PAID', 'Deposit Paid']]) {
      const row = importOne(input);
      expect(row.status).toBe(expected);
      expect(statusWarning(row)).toBe(null);
    }
  });

  it('a blank status still defaults to the bottom of the ladder, silently', () => {
    expect(importOne('').status).toBe('Considering');
    expect(statusWarning(importOne(''))).toBe(null);
  });

  it.each(OFF_VOCABULARY)('%s is coerced down and the original is reported', (Status) => {
    const row = importOne(Status);
    expect(row.status).toBe('Considering');
    // Coerced DOWN. Any other direction would invent readiness from a word the
    // app cannot read.
    expect(isVendorBooked(row)).toBe(false);
    expect(isVendorConfirmed(row)).toBe(false);
    // The planner's own word is not thrown away — it is reported on the row,
    // which the import wizard renders in the preview before the merge applies.
    expect(statusWarning(row)).toContain(`"${Status}"`);
    expect(statusWarning(row)).toContain('Considering');
  });

  // NEGATIVE CONTROL 1 — coercion is not rejection. The row must still import,
  // because Status is an optional column and the vendor's name, contact, cost
  // and tags are worth keeping.
  it('a coerced row is still valid and still imports', () => {
    const rows = validateVendorRows(transformVendorRows([
      { Name: 'Acme', Email: 'a@x.com', Status: 'Pencilled in', Cost: '$1,200.50' },
    ]));
    expect(rows[0]._valid).toBe(true);
    const merged = applyVendorMerge([], rows, 'merge', 'b1');
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe('Acme');
    expect(merged[0].cost).toBe(1200.5);
    expect(merged[0].status).toBe('Considering');
  });

  // NEGATIVE CONTROL 2 — the real required-field gates must still bite. If they
  // did not, "the row still imports" above would be meaningless.
  it('name and email validation are untouched', () => {
    const rows = validateVendorRows(transformVendorRows([
      { Name: '', Email: 'a@x.com', Status: 'Confirmed' },
      { Name: 'Acme', Email: 'nope', Status: 'Confirmed' },
    ]));
    expect(rows[0]._errors).toContain('Vendor name is required');
    expect(rows[1]._errors).toContain('Invalid email: "nope"');
  });

  // NEGATIVE CONTROL 3 — nothing that reaches the store may be a word the
  // canonical predicates cannot read. This is the property the whole change
  // exists to establish, asserted over the full mixed batch.
  it('every status written to the store is one the canonical predicates know', () => {
    const inputs = [...BOOKED, ...SHOPPING, ...OFF_VOCABULARY, 'booked', 'paid', ''];
    const rows = validateVendorRows(transformVendorRows(
      inputs.map((Status, i) => ({ Name: `V${i}`, Email: `v${i}@x.com`, Status }))
    ));
    const stored = applyVendorMerge([], rows, 'merge', 'b1');
    expect(stored).toHaveLength(inputs.length);
    for (const v of stored) {
      const known = isVendorBooked(v) || SHOPPING.includes(v.status);
      expect({ status: v.status, known }).toEqual({ status: v.status, known: true });
    }
  });

  // THE TWO-WAY DRIFT GATE. The intake vocabulary and the canonical predicates
  // must agree about every candidate word, in BOTH directions:
  //   - a status the predicates accept but intake coerces away would mean an
  //     importer that throws away real readiness,
  //   - a status intake accepts but the predicates do not know is the original
  //     bug: a value in the store that reads as nothing.
  // Adding a status to either side without the other fails here.
  it('the intake vocabulary and the canonical sets agree, both ways', () => {
    const candidates = [...BOOKED, ...SHOPPING, ...OFF_VOCABULARY, 'Not Started', 'Unconfirmed', 'Pending', 'Archived'];
    for (const Status of candidates) {
      const accepted = importOne(Status).status === Status;
      const canonical = isVendorBooked({ status: Status }) || SHOPPING.includes(Status);
      expect({ Status, accepted }).toEqual({ Status, accepted: canonical });
    }
  });
});
