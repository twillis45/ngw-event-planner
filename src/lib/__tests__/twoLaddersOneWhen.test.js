// ─── TWO LADDERS, ONE FACT, OPPOSITE ANSWERS ─────────────────────────────────
//
// MEASURED 2026-09-19 on one wedding, three days out, with a date set and an
// unconfirmed start time (`startTimeSource: 'derived'` — the app's own guess):
//
//   _eventFoundationActions   id=date      done=TRUE    "Set the date."
//   deriveEventPhaseProgress  id=datetime  handled=FALSE "Confirm the start time"
//
// Same event, same moment. And `CommandCenter.jsx` sixty lines below the ladder
// asserts "Single source: the same _eventFoundationActions dominoes eventPlan
// uses". It was not one source for this rung: phaseProgress merged the day and
// the hour into one "when" area on a host directive (2026-07-14); this ladder
// never did, so its `date` domino read DONE the moment a date existed.
//
// WHAT IT COSTS. The "Confirm the start time" action reaches the ranker with no
// ladder consequence — its rung reads closed — and `dueInDays: null` sorts last
// among equals, so it sits **9 of 9** at T-3 …
//
// …while an unconfirmed hour withholds the time from NINE outward artifacts:
// the vendor-brief run-of-show slice ships `time: null` (vendorBrief.js:79), and
// `timePhrase()` falls back to the bucket phrase for draftInvite,
// draftGuestBrief, draftRsvpChase, draftDayBeforeDetails, draftVendorReconfirm,
// draftGuestUpdate and draftGettingHereNote (doItForMe.js). The comment beside
// phaseProgress's own priority calls this "a real but low-stakes gap". Nine
// refusing drafts three days before a wedding is not low-stakes.
//
// THIS FIXES THE LEDGER AND DELIBERATELY NOT THE RANKING. Giving the rung real
// consequence was tried and reverted the same hour, because three ruled guards
// said no and all three were right:
//
//   `decisionSoundness` — "the head asks for the count". Merging the hour into
//     the rung and stopping there gave the HOUR the DATE's place at the top of
//     the ladder, so an event with no guest list headlined "confirm the time".
//     The guest count sizes the budget, the food and the schedule; the hour
//     sizes nothing.
//   `hostEngineSelectionParity` — "they MOVE TOGETHER". With consequence 2.00
//     the hour simply won a quiet board, so the ENGINE headlined the start time
//     while the HOST shell said food. Those two disagree about FOOD (this ladder
//     counts `host cooks` done; phaseProgress counts its open food DECISIONS) —
//     real, pre-existing, and not a start-time change's to decide by accident.
//   The `_openDomino` pass's own pinning warning — holding the hour off position
//     one after the sort is the shape that "broke the hero (12 matrix failures)".
//
// So the rung carries `rankLadder: false` when only the hour is open: the board
// stays byte-identical, and the two ledgers stop contradicting each other. What
// the hour is worth in the QUEUE is a product call with this measurement behind
// it, not a constant to pick while fixing something else.
//
// AND THIS CHANGES NOTHING A HOST SEES TODAY — stated here because an e2e guard
// was written for it and then DELETED for failing to fail. The shell reads
// `phaseCues.completedCount` and only falls back to `eventPlan.progress`
// (HostShellV2 ~:9740), and `doneAnim` (~:7081) computes `plan.progress.done`
// and renders it nowhere. So the count on screen was already the honest one; the
// ladder was wrong privately. That is worth fixing anyway — it is the thing the
// next reader would have trusted, under a comment claiming a single source — but
// it is an ENGINE consistency fix, not a visible one, and a guard that cannot
// fail would have said otherwise.
import { eventPlan, _eventFoundationActions, actionConsequence } from '../../CommandCenter';
import { deriveEventPhaseProgress } from '../phaseProgress';
import { startTimeIsConfirmed } from '../startTime';

const iso = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const base = (extra) => ({
  id: 'e', name: 'Probe', type: 'Wedding', date: iso(3),
  guestMode: 'count', guestCount: 80, guests: [], totalBudget: 40000,
  venue: 'The Ironwood Room, Silver Spring, MD', venueCity: 'Silver Spring', state: 'MD',
  vendors: [{ id: 'v1', name: 'Ironwood', category: 'Venue', status: 'Confirmed', cost: 12000 }],
  budget: [{ category: 'Venue', budgeted: 12000 }],
  ...extra,
});
// The app's own guess, not the host's word — the state every new event arrives in.
const UNCONFIRMED = { startTime: '3:00 PM', startTimeSource: 'derived' };
const CONFIRMED = { startTime: '3:00 PM', startTimeSource: 'host' };
const rungOf = (ev, id) => _eventFoundationActions(ev).find((r) => r && r.id === id);
const areaOf = (ev, id) => {
  const pp = deriveEventPhaseProgress(ev);
  return ((pp && (pp.items || pp.areas)) || []).find((x) => x && x.id === id);
};

describe('two ladders, one "when"', () => {
  test('(premise) the fact really is unresolved, and the other ledger really says so', () => {
    const ev = base(UNCONFIRMED);
    expect(startTimeIsConfirmed(ev)).toBe(false);
    expect(areaOf(ev, 'datetime').handled).toBe(false);
    expect(String(areaOf(ev, 'datetime').cueLabel)).toMatch(/start time/i);
  });

  test('THE DEFECT: the two ladders now agree about whether "when" is handled', () => {
    const open = base(UNCONFIRMED);
    expect(rungOf(open, 'date').done).toBe(false);
    expect(areaOf(open, 'datetime').handled).toBe(false);

    const shut = base(CONFIRMED);
    expect(rungOf(shut, 'date').done).toBe(true);
    expect(areaOf(shut, 'datetime').handled).toBe(true);
  });

  test('the ledger moved and the BOARD did not — the scope of this change', () => {
    // The whole point of `rankLadder: false`. If a later pass decides what the
    // hour is worth in the queue, this is the test that should be rewritten
    // deliberately rather than discovered failing.
    const acts = eventPlan(base(UNCONFIRMED)).nextActions || [];
    const row = acts.find((a) => /start time/i.test(a.title || ''));
    expect(row).toBeTruthy();
    expect(actionConsequence(row)).toBe(0);
    expect(row.gateHolder).toBeFalsy();
  });

  test('the open hour is invisible to the ranker but not to the ledger', () => {
    // Two readers, one rung, and they are SUPPOSED to differ here: the ladder's
    // `done` is the truth about the plan; `_openDomino` is the ranker's input.
    const open = _eventFoundationActions(base(UNCONFIRMED)).find((r) => r.id === 'date');
    expect(open.done).toBe(false);
    expect(open.rankLadder).toBe(false);
    // With the date itself missing the rung is a real ranking domino again.
    const noDate = _eventFoundationActions(base({ date: '' })).find((r) => r.id === 'date');
    expect(noDate.done).toBe(false);
    expect(noDate.rankLadder).toBeUndefined();
  });

  test('the copy says which half is open — "Set the date." on a dated event was the trap', () => {
    // The rung is named for the whole question now, so its title has to move
    // with the half that is actually missing. A dated event told to "Set the
    // date." would be a worse defect than the one this fixes.
    expect(rungOf(base({ date: '' }), 'date').title).toBe('Set the date.');
    expect(rungOf(base(UNCONFIRMED), 'date').title).toBe('Confirm the start time.');
    expect(rungOf(base({ date: iso(3) }), 'date').title).toBe('Set the start time.');
    // …and it routes to the field it is asking about, not the date field.
    expect(rungOf(base(UNCONFIRMED), 'date').route.focusField).toBe('event-start');
    expect(rungOf(base({ date: '' }), 'date').route.focusField).toBe('event-date');
  });

  test('NEGATIVE CONTROL: a missing DATE keeps the top of the ladder', () => {
    // This is what decisionSoundness's "the head asks for the count" protects,
    // one rung up: the date anchors every countdown, so it leads and it still
    // ranks. Only the HOUR-only state is demoted and de-ranked.
    const ladder = _eventFoundationActions(base({ date: '' }));
    expect(ladder[0].id).toBe('date');
    expect(ladder[0].done).toBe(false);
    expect(ladder[0].rankLadder).toBeUndefined();
  });

  test('NEGATIVE CONTROL: an open hour changes no other row’s consequence', () => {
    // `_openDomino` counts unlocks by POSITION among open rungs, so a rung that
    // entered that count would have shifted every other domino's number. The
    // board must be identical with the hour open and with it confirmed.
    const score = (ev) => (eventPlan(ev).nextActions || [])
      .filter((a) => !/start time/i.test(a.title || ''))
      .map((a) => `${a.title}=${actionConsequence(a).toFixed(2)}`);
    expect(score(base(UNCONFIRMED))).toEqual(score(base(CONFIRMED)));
  });

  test('NEGATIVE CONTROL: a confirmed hour closes the rung and restores the order', () => {
    // With both halves answered the rung is done, sits back in position one, and
    // nothing about the ladder differs from before this change.
    const ev = base(CONFIRMED);
    const ladder = _eventFoundationActions(ev);
    expect(ladder[0].id).toBe('date');
    expect(ladder[0].done).toBe(true);
    expect(ladder[0].handledFact).toBe('Date & time set');
    const acts = eventPlan(ev).nextActions || [];
    expect(acts.some((a) => /start time/i.test(a.title || ''))).toBe(false);
  });

  test('NEGATIVE CONTROL: the engine and the host shell still name the same head', () => {
    // The contract `hostEngineSelectionParity` owns, asserted here too because
    // this is the change that broke it once. Whatever the engine leads with, it
    // must not be the hour while another surface is asking for something else.
    const head = (eventPlan(base(UNCONFIRMED)).nextActions || [])[0];
    expect(head).toBeTruthy();
    expect(/start time/i.test(head.title || '')).toBe(false);
  });
});
