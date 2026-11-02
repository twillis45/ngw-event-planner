// ─── A BOUNDED GAP STAYS BOUNDED ────────────────────────────────────────────
//
// SPRINT 0.5 DECISION 4.
//
// "READY does not mean feature-complete; READY means architecturally safe to
// proceed" is correct and is also the most abusable sentence in the package.
// Sprint 0 shipped READY carrying one declared gap, and the rule it was
// declared under lived in a paragraph of SPRINT_0_VERDICT.md.
//
// THIS REPO HAS ALREADY MEASURED WHAT PARAGRAPHS ARE WORTH. The surfaces table
// in CLAUDE.md — the first thing read every session — said "stages 1-4 passed,
// 5 and 7 open" for six weeks after it stopped being true. P0-2's provenance
// field was written at every site and read by almost nothing. Decision 2's
// `alsoDerives` requirement was documented in a doc comment and that is exactly
// why a caller could forget it. A governance rule recorded only in prose is a
// governance rule that will be out of date before it is next needed.
//
// So the rule's two checkable halves are a test:
//
//   · THE HOST IS STILL TOLD. A gap is bounded only while the product says it
//     honestly. Asserted through the reader the SURFACE calls, never through
//     the mechanism underneath it — a wrapper can satisfy the mechanism's test
//     while the screen has gone quiet.
//   · THE JUSTIFICATION IS PINNED. Every gap here is bounded BECAUSE of some
//     measured fact about the destination that would have to receive it. Pin
//     that fact, and the day it changes, the test fails and says to
//     re-adjudicate instead of letting a stale excuse stand.
//
// NOT ASSERTED HERE, deliberately: "the gap is named" and "it has a future
// disposition" are document conditions, and a test that greps a markdown file
// for its own paragraph is theatre. They live in SPRINT_0_5_ARCHITECTURE_
// DECISIONS.md, Decision 4, with a measurement date.
import fs from 'fs';
import path from 'path';
import { clausesNotUsed, heardNotUsedFor } from '../heardClauses';
import { parseSmartEventText } from '../smartParseEvent';
import { guestItinerary } from '../itinerary';

const ROOT = path.resolve(__dirname, '../../..');

// ─── GAP 1 · "2 excursions" HAS NO TRUTHFUL DESTINATION ─────────────────────
//
// The host's own sentence, from the WANDA-A seed. Everything else in it lands
// somewhere real; a bare count of unnamed outings lands nowhere.
const SEED = '50th birthday nov 2027 8 couples 5 nights Disneyland 2 excursions airbnb accomodations';

describe('GAP 1 — the clause with nowhere to go is still disclosed', () => {
  test('the host is told, through the reader the screen uses', () => {
    // `itSaysWhatItDidNotUse` already pins this at `unusedClauses`. That is the
    // MECHANISM, and since Decision 2 it is no longer what the shell calls —
    // `clausesNotUsed` is, and it supplies three seam readers the mechanism
    // knows nothing about. A seam reader that swallowed this clause without
    // giving it a destination would leave that test green and this one red,
    // which is the right way round.
    expect(clausesNotUsed(SEED)).toContain('2 excursions');
  });

  test('…and on a saved event, which is where she can still answer it', () => {
    expect(heardNotUsedFor({ id: 'ev-exc', type: 'Birthday', createdFromText: SEED }))
      .toContain('2 excursions');
  });

  test('NOTHING WAS FABRICATED TO CLOSE IT — the parser writes no programme field', () => {
    // The failure mode the gap exists to prevent: inventing "Excursion 1" and
    // "Excursion 2" so the count has somewhere to sit. The host named no
    // outing, no day and no time.
    const parsed = parseSmartEventText(SEED) || {};
    for (const field of ['itinerary', 'ros', 'timeline', 'activities', 'vendors']) {
      expect({ [field]: parsed[field] }).toEqual({ [field]: undefined });
    }
  });

  test('THE JUSTIFICATION IS PINNED — the destination refuses a nameless row', () => {
    // This is WHY the gap is bounded rather than lazy, and it is not an opinion:
    // `itinerary.js`'s own normaliser drops a row with no title (`if (!title)
    // return null`). A count of outings supplies no title, so the one structure
    // that could hold it would throw it away.
    const titleless = guestItinerary(
      { id: 'ev-exc', type: 'Birthday', date: '2027-11-06', itinerary: [{ day: 1, slot: 'afternoon', title: '' }] },
      () => null,
    );
    expect({ relevant: titleless.relevant, rows: titleless.rows }).toEqual({ relevant: false, rows: [] });

    // THE GATE BITES: the same row with the thing named DOES become a programme
    // row, so the assertion above is about the missing name, not about the path
    // being dead.
    const named = guestItinerary(
      { id: 'ev-exc', type: 'Birthday', date: '2027-11-06', itinerary: [{ day: 1, slot: 'afternoon', title: 'Disneyland' }] },
      () => null,
    );
    expect(named.rows.map((r) => r.title)).toEqual(['Disneyland']);
  });

  test('and the guest programme stays empty rather than inventing an arc', () => {
    const empty = guestItinerary({ id: 'ev-exc', type: 'Birthday', date: '2027-11-06' }, () => null);
    expect({ relevant: empty.relevant, rows: empty.rows }).toEqual({ relevant: false, rows: [] });
  });
});

// ─── GAP 2 · EVERY EVENT THAT ALREADY EXISTS HAS NO SENTENCE ────────────────
//
// A different shape, and the one that shows the rule is not a single-case
// special pleading. P1-3 made the host's sentence survive creation so a clause
// stays answerable. It cannot be backfilled: an event created before that slice
// never stored what she typed, and there is nothing to reconstruct it from.
//
// Bounded because the honest answer to "what did you not use from my sentence?"
// on an event that has no stored sentence is silence — not a guess, and not an
// error the host has to read.
describe('GAP 2 — a pre-existing event has no clause list, and says so by being quiet', () => {
  test('empty, not thrown, not guessed', () => {
    expect(heardNotUsedFor({ id: 'ev-old', type: 'Birthday' })).toEqual([]);
    expect(heardNotUsedFor({ id: 'ev-old', type: 'Birthday', createdFromText: '' })).toEqual([]);
    expect(heardNotUsedFor(null)).toEqual([]);
  });

  test('THE DISPOSITION IS REAL — it closes going forward, it is not permanent', () => {
    // "Superseded by another capability" is only a disposition if the capability
    // actually arrives for new events. It does, on creation, with no migration.
    expect(heardNotUsedFor({ id: 'ev-new', type: 'Birthday', createdFromText: SEED }))
      .toContain('2 excursions');
  });
});

// ─── WHAT A REJECTED GAP LEAVES BEHIND ──────────────────────────────────────
//
// Decision 4 rejected two claims that would have been filed as bounded gaps,
// and the rejection produced code, not a note. The point of listing them here
// is that the day someone deletes that enforcement, the deletion lands in the
// governance suite with the decision's name attached — rather than looking like
// one more test nobody remembers the reason for.
describe('the rejections left enforcement, and it is still here', () => {
  const REQUIRED = [
    // REJECTED: "no permit capability" — the capability was INERT, not absent
    // (placeIntelligence pushed the sentence as a note in the frozen CRA shell,
    // unraised and unanswerable). Decision 3 made it a question.
    ['src/lib/__tests__/weNowNeedToKnow.test.js', 'outdoor-permit'],
    // REJECTED: an app-invented count reaching money or the outside world.
    ['src/lib/__tests__/anInventedCountDoesNotLeaveTheApp.test.js', 'guestCountIsConfirmed'],
    ['src/lib/__tests__/anInventedCountIsNotAVendorConflict.test.js', 'guestCountFor'],
  ];

  test('each suite exists and still asserts the thing the rejection turned on', () => {
    const missing = REQUIRED.filter(([file, anchor]) => {
      const p = path.join(ROOT, file);
      return !fs.existsSync(p) || !fs.readFileSync(p, 'utf8').includes(anchor);
    });
    // If this fails: a bounded-gap REJECTION is being undone. Re-read Decision 4
    // in SPRINT_0_5_ARCHITECTURE_DECISIONS.md before deleting the assertion.
    expect(missing.map(([f]) => f)).toEqual([]);
  });
});
