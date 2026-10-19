// ─── "I HEARD THIS TOO" — AND THEN WHAT? ────────────────────────────────────
//
// Two defects, both measured 2026-10-18, both in the mechanism that exists to
// earn the host's trust that the list means something.
//
// ONE · THREE CLAUSES WERE REPORTED DROPPED THAT THE APP ACTUALLY USED.
// The creation seam reads the host's sentence with three consumers the parser
// knows nothing about — `heardMustHaves`, `heardStayStyle`, `heardAccessNeeds`
// (HostShellV2:8222-8224) — and writes real fields from them.
// `unusedClauses` only re-parsed, so everything those consumed looked unread:
//
//   "a house with a hot tub"  → lodgingWants: ['hottub']   "Didn't make it"
//   "resort spa"              → lodgingStyle: 'resort spa' "Didn't make it"
//   "she uses a walker"       → accessNeeds: [...]         "Didn't make it"
//
// That is three false alarms in the one place the file's own comment says it
// is deliberately biased against them: "a false alarm costs them the belief
// that the list means anything." And the count grew by one the moment P1-2
// added a fourth consumer, which is how the third arrived.
//
// TWO · THERE WAS NOWHERE FOR AN ANSWER TO GO. The list is computed live in
// the creation flow and the sentence is never stored, so it is shown once —
// while she is still typing the event into existence — and then lost. The
// brief assumed a clause "endlessly resurfaces"; the opposite is true and is
// worse.
import { unusedClauses } from '../smartParseEvent';
import { heardAccessNeeds } from '../accessNeeds';
import { heardMustHaves, heardStayStyle } from '../lodgingIntel';
import {
  heardNotUsedFor, acknowledgeClausePatch, unacknowledgeClausePatch,
  clauseIsAcknowledged, clauseKey,
} from '../heardClauses';

// Exactly what the creation seam runs. Every call below passes these, because
// a caller that forgets them silently gets the old false alarms back.
const SEAM = { alsoDerives: [heardAccessNeeds, heardMustHaves, heardStayStyle] };

const WALKER = "Mom's 80th in Santa Fe, sit-down lunch, she uses a walker";
const HOTTUB = 'family reunion in Deep Creek Lake, a house with a hot tub, 20 people';
const SPA = '80th birthday in Santa Fe NM, resort spa, 40 guests';

describe('a clause the app USED is not a clause it dropped', () => {
  test('the walker clause is no longer reported — accessNeeds consumed it', () => {
    expect(unusedClauses(WALKER, SEAM)).not.toContain('she uses a walker');
  });

  test('nor the hot tub — lodgingWants consumed it', () => {
    expect(unusedClauses(HOTTUB, SEAM)).not.toContain('a house with a hot tub');
  });

  test('nor the resort spa — lodgingStyle consumed it', () => {
    expect(unusedClauses(SPA, SEAM)).not.toContain('resort spa');
  });

  test('PREMISE — all three WERE reported before the seam was accounted for', () => {
    // Without this the three tests above could pass because the clauses stopped
    // being produced for some unrelated reason. This is the defect, reproduced.
    expect(unusedClauses(WALKER, {})).toContain('she uses a walker');
    expect(unusedClauses(HOTTUB, {})).toContain('a house with a hot tub');
    expect(unusedClauses(SPA, {})).toContain('resort spa');
  });

  test('and a clause nothing consumed is STILL reported', () => {
    // The mechanism must not have been turned off. "sit-down lunch" is read by
    // nothing — parser or seam — and the host should still be told.
    expect(unusedClauses(WALKER, SEAM)).toContain('sit-down lunch');
  });

  test('a seam consumer that throws does not silently restore the false alarm', () => {
    const boom = () => { throw new Error('nope'); };
    // The clause is still suppressed by the honest consumers; the thrower just
    // contributes a constant, rather than making every clause look unread.
    const out = unusedClauses(WALKER, { alsoDerives: [heardAccessNeeds, boom] });
    expect(out).not.toContain('she uses a walker');
    expect(out).toContain('sit-down lunch');
  });

  test('a non-function in alsoDerives is ignored rather than thrown on', () => {
    expect(() => unusedClauses(WALKER, { alsoDerives: [null, 'nope', 42] })).not.toThrow();
  });
});

describe('the sentence survives creation, so the question can still be asked', () => {
  const created = (over = {}) => ({
    id: 'ev-heard', type: 'Birthday', date: '2027-06-17',
    createdFromText: WALKER,
    ...over,
  });

  test('what she said that the plan does not hold is still answerable later', () => {
    expect(heardNotUsedFor(created(), SEAM)).toContain('sit-down lunch');
  });

  test('an event created before the sentence was kept simply has none', () => {
    // Every event that exists today. Empty, not an error, and not a guess.
    expect(heardNotUsedFor({ id: 'ev-old', type: 'Birthday' }, SEAM)).toEqual([]);
    expect(heardNotUsedFor(null, SEAM)).toEqual([]);
  });

  test('the consumed clauses do not come back just because they persisted', () => {
    expect(heardNotUsedFor(created(), SEAM)).not.toContain('she uses a walker');
  });
});

describe('answering one makes it stop asking — and it is recoverable', () => {
  const created = () => ({ id: 'ev-ack', type: 'Birthday', createdFromText: WALKER });

  test('acknowledging removes it from what is still owed an answer', () => {
    const ev = created();
    expect(heardNotUsedFor(ev, SEAM)).toContain('sit-down lunch');
    const after = { ...ev, ...acknowledgeClausePatch(ev, 'sit-down lunch') };
    expect(heardNotUsedFor(after, SEAM)).not.toContain('sit-down lunch');
    expect(clauseIsAcknowledged(after, 'sit-down lunch')).toBe(true);
  });

  test('it is a patch, not a mutation — the caller owns persistence', () => {
    const ev = created();
    acknowledgeClausePatch(ev, 'sit-down lunch');
    expect(ev.clauseStatus).toBeUndefined();
  });

  test('acknowledging a second one does not forget the first', () => {
    let ev = created();
    ev = { ...ev, ...acknowledgeClausePatch(ev, 'sit-down lunch') };
    ev = { ...ev, ...acknowledgeClausePatch(ev, 'something else') };
    expect(clauseIsAcknowledged(ev, 'sit-down lunch')).toBe(true);
    expect(clauseIsAcknowledged(ev, 'something else')).toBe(true);
  });

  test('the key survives re-reading the same sentence differently', () => {
    // Punctuation and case must not make the app re-ask a question she has
    // already answered.
    expect(clauseKey('She Uses A Walker.')).toBe(clauseKey('she uses a walker'));
  });

  test('ACKNOWLEDGED IS NOT DELETED — a mistap is undoable', () => {
    let ev = created();
    ev = { ...ev, ...acknowledgeClausePatch(ev, 'sit-down lunch') };
    ev = { ...ev, ...unacknowledgeClausePatch(ev, 'sit-down lunch') };
    expect(clauseIsAcknowledged(ev, 'sit-down lunch')).toBe(false);
    expect(heardNotUsedFor(ev, SEAM)).toContain('sit-down lunch');
  });

  test('an empty clause is not acknowledgeable', () => {
    expect(acknowledgeClausePatch(created(), '')).toBe(null);
  });
});

describe('THE CANONICAL-WRITE PATH NEEDS NO MIGRATION', () => {
  // The reason heardClauses stores the SENTENCE and not the list: the day a
  // consumer starts reading a clause, the differential stops reporting it — on
  // every existing event, with nothing to backfill.
  //
  // ASSERTED AT THE MECHANISM, not through the root (updated Sprint 0.5
  // Decision 2). This property belongs to `unusedClauses` — it is the
  // differential comparison that makes a new reader self-registering in the
  // result. The first version simulated a future reader by passing one through
  // `heardNotUsedFor(ev, opts)`, and that argument is gone on purpose: the root
  // now supplies the readers so no caller can forget them. Adding a real seam
  // consumer is one line in heardClauses' SEAM_READERS, which is what this
  // simulates.
  test('a clause becomes canonical and leaves the list on its own', () => {
    expect(unusedClauses(WALKER, SEAM)).toContain('sit-down lunch');

    const readsSitDown = (text) => (/sit-down/i.test(text) ? { service: 'seated' } : null);
    const after = unusedClauses(WALKER, { alsoDerives: [...SEAM.alsoDerives, readsSitDown] });
    expect(after).not.toContain('sit-down lunch');
  });

  test('and the canonical entry point needs no argument to get it right', () => {
    const ev = { id: 'ev-canon', type: 'Birthday', createdFromText: WALKER };
    expect(heardNotUsedFor(ev)).toContain('sit-down lunch');
    expect(heardNotUsedFor(ev)).not.toContain('she uses a walker');
    // Nothing was acknowledged to achieve that — the host was never asked.
    expect(ev.clauseStatus).toBeUndefined();
  });
});
