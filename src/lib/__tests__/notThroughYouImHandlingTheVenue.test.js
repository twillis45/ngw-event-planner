// ─── "PICK THE PLACE IN SANTA FE." — EVERY SINGLE OPEN ───────────────────────
//
// The venue blocker is the most privileged item on the command board.
// `_selectEventNextActionInner` promotes it to the hero at EVERY urgency, where
// every other blocker must reach `critical` first, and it declares
// `blocks: ['vendors','timeline','logistics']`. Right for a host choosing a
// venue; wrong for the host who already has one, or is booking through a resort
// or a travel agent. Host ruling 2026-09-22: "this needs a way to be parked or
// preempted with 'are you choosing a venue through app'."
//
// NOTHING NEW IS PERSISTED. `event.decisionBlockerStatus[type]` already existed
// and was already READ in the two places that matter. What was missing was a
// writer — only the frozen CRA shell ever set it, so no hostv2 host could reach
// it. venuePark.js is that writer, and it is a module rather than a nested-map
// poke in the shell for the same reason venueFor.js owns the raw venue fields.
//
// THE LINE THIS FILE EXISTS TO HOLD: **parking is not answering.** The app does
// not learn where the event is; it stops being the one asked to find out. If a
// future change makes parking also mark the venue handled, the parts meter
// starts lying and these tests fail.
import { venueParked, parkVenuePatch, unparkVenuePatch, VENUE_BLOCKER } from '../venuePark';
import { venueFor } from '../venueFor';
import { deriveDecisionBlockers } from '../assembleRevealEngines';

const base = (extra) => ({
  id: 'v', name: "Mom's 80th", type: 'Birthday',
  date: '2027-06-17', endDate: '2027-06-21',
  isDestination: true, venueCity: 'Santa Fe', state: 'NM',
  guestMode: 'count', guestCount: 10, ...extra,
});
const apply = (ev, patch) => ({ ...ev, ...patch });
const blockerTypes = (ev) => {
  const all = deriveDecisionBlockers(ev, null) || [];
  const status = ev.decisionBlockerStatus || {};
  // The exact filter experienceContext.js:69 applies.
  return all.filter((b) => !status[b.type]).map((b) => b.type);
};

describe('a host can say they are not picking the venue here', () => {
  test('(premise) the venue blocker really is raised for this event', () => {
    // Everything below asserts it goes away. If it was never there, nothing here
    // means anything.
    expect(blockerTypes(base({}))).toContain(VENUE_BLOCKER);
    expect(venueParked(base({}))).toBe(false);
  });

  test('THE FIX: parking clears the venue blocker from the context', () => {
    const ev = base({});
    const parked = apply(ev, parkVenuePatch(ev));
    expect(venueParked(parked)).toBe(true);
    expect(blockerTypes(parked)).not.toContain(VENUE_BLOCKER);
  });

  test('PARKING IS NOT ANSWERING — no venue fact is invented', () => {
    // The whole risk of this feature. Parking must not write a venue, and the
    // venue reader must still report the place as unknown.
    const ev = base({});
    const patch = parkVenuePatch(ev);
    expect(Object.keys(patch)).toEqual(['decisionBlockerStatus']);
    const parked = apply(ev, patch);
    expect(venueFor(parked).isSet).toBe(venueFor(ev).isSet);
    expect(venueFor(parked).addressSettled).toBe(venueFor(ev).addressSettled);
    expect(parked.venue).toBe(ev.venue);
  });

  test('it is REVERSIBLE, and un-parking removes the key rather than falsifying it', () => {
    // Every reader tests truthiness (`!status[b.type]`), so a stored '' or null
    // would read as parked forever and be invisible in the data.
    const ev = base({});
    const parked = apply(ev, parkVenuePatch(ev));
    const back = apply(parked, unparkVenuePatch(parked));
    expect(venueParked(back)).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(back.decisionBlockerStatus, VENUE_BLOCKER)).toBe(false);
    expect(blockerTypes(back)).toContain(VENUE_BLOCKER);
  });

  test('"acknowledged", not "dismissed" — the work is accepted, not refused', () => {
    // Both values hide the blocker, but CommandCenter.jsx:1727 reads
    // 'acknowledged' as Accepted in the readiness ledger and everything else as
    // Blocked. A host handling the venue themselves has taken the work on.
    const ev = base({});
    expect(parkVenuePatch(ev).decisionBlockerStatus[VENUE_BLOCKER]).toBe('acknowledged');
  });

  test('NEGATIVE CONTROL: parking the venue never drops another blocker’s status', () => {
    // The nested-map hazard this module exists to remove. A shell spreading it
    // by hand is exactly how a sibling key gets clobbered.
    const ev = base({ decisionBlockerStatus: { 'some-other-blocker': 'dismissed' } });
    const parked = apply(ev, parkVenuePatch(ev));
    expect(parked.decisionBlockerStatus['some-other-blocker']).toBe('dismissed');
    const back = apply(parked, unparkVenuePatch(parked));
    expect(back.decisionBlockerStatus['some-other-blocker']).toBe('dismissed');
  });

  test('NEGATIVE CONTROL: parking leaves every OTHER blocker raised', () => {
    // Scope. This parks one thing, not the board.
    const ev = base({});
    const before = blockerTypes(ev).filter((t) => t !== VENUE_BLOCKER);
    const parked = apply(ev, parkVenuePatch(ev));
    expect(blockerTypes(parked)).toEqual(before);
  });

  test('NEGATIVE CONTROL: an untouched event is not parked by accident', () => {
    expect(venueParked(base({}))).toBe(false);
    expect(venueParked(base({ decisionBlockerStatus: {} }))).toBe(false);
    expect(venueParked(null)).toBe(false);
    expect(venueParked({})).toBe(false);
    // A DIFFERENT status value is not a park — only the one this writer sets.
    expect(venueParked(base({ decisionBlockerStatus: { [VENUE_BLOCKER]: 'dismissed' } }))).toBe(false);
  });
});
