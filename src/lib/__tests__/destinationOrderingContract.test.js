// ─── DOWNSTREAM MUST NOT OUTRANK UNRESOLVED UPSTREAM (ruling, 2026-08-06) ───
//
// A real host event — a destination 80th in Santa Fe — was reported showing
// "decide the menu" first. Traced against the recovered event it does not
// reproduce: lodging leads and menu is second. But the guarantee was resting on
// two authored priority NUMBERS in phaseProgress with nothing asserting the
// relationship, so a retune from 4/6 to 7/6 would have inverted it silently and
// every suite would have stayed green.
//
// THE RULING (host, 2026-08-06): unresolved upstream decisions must OUTRANK
// downstream ones — not suppress them. Suppression was the other option and was
// declined: menu sitting visibly second is more useful than menu hidden, and
// hard `dependsOn` gating would have removed it from the board entirely.
//
// So this file locks the ORDER, not the presence. Every test below asserts a
// relationship between axes rather than a magic number, so a re-tune is free as
// long as the operational truth survives.
//
// The authored ladder these encode (phaseProgress.js):
//     date missing      1
//     location missing  3
//     lodging           4   (destination events only)
//     food              6
// which is the operational chain: destination → dates → lodging → … → food.
import { deriveEventPhaseProgress } from '../phaseProgress';
import { STAY_FROM_CONFIRMATION } from '../lodgingIntel';

// Fixed clock: these events are ~10 months out, so phase is pre_event and the
// ladder is the pre-event one. A relative date would drift the phase over time.
const NOW = new Date(2026, 7, 6, 9, 0, 0);

// The recovered real event's shape, minus the id — the facts are what matter.
const destEvent = (extra) => ({
  id: 'oc-dest', type: 'Birthday', name: 'A destination birthday',
  isDestination: true,
  venueCity: 'Santa Fe', venueState: 'NM',
  date: '2027-06-20', endDate: '2027-06-24',
  guestMode: 'count', guestEstimate: 5, guestCount: 5,
  totalBudget: 2000,
  budget: [], guests: [], vendors: [], timeline: [],
  ...extra,
});

const axes = (ev) => (deriveEventPhaseProgress(ev, NOW) || {}).items || [];
const axis = (ev, id) => axes(ev).find((a) => a.id === id) || null;
/** Open axes in the order the host meets them — the same sort the cue uses. */
const openOrder = (ev) => axes(ev)
  .filter((a) => !a.handled)
  .sort((x, y) => (x.priority || 9) - (y.priority || 9))
  .map((a) => a.id);
const leads = (ev) => openOrder(ev)[0];
const rankOf = (ev, id) => openOrder(ev).indexOf(id);

describe('the destination chain outranks food', () => {
  test('THE CASE THAT WAS REPORTED: lodging leads, menu is second — not hidden', () => {
    const ev = destEvent();
    expect(rankOf(ev, 'lodging')).toBeGreaterThanOrEqual(0);
    expect(rankOf(ev, 'food')).toBeGreaterThanOrEqual(0);
    // The ruling: outrank, not suppress. Food must still be REACHABLE.
    expect(rankOf(ev, 'lodging')).toBeLessThan(rankOf(ev, 'food'));
  });

  test('a missing date outranks both — nothing is plannable without it', () => {
    const ev = destEvent({ date: '', endDate: '' });
    expect(rankOf(ev, 'datetime')).toBeLessThan(rankOf(ev, 'lodging'));
    expect(rankOf(ev, 'datetime')).toBeLessThan(rankOf(ev, 'food'));
    expect(leads(ev)).toBe('datetime');
  });

  test('a missing location outranks lodging — you cannot book a town you have not named', () => {
    const ev = destEvent({ venueCity: '', venueState: '', venue: '' });
    expect(rankOf(ev, 'location')).toBeLessThan(rankOf(ev, 'lodging'));
  });

  test('once the rooms are held, food rises — the order is contextual, not "menu always last"', () => {
    const held = destEvent({ lodging: { hotelName: 'The Eldorado', from: STAY_FROM_CONFIRMATION } });
    expect(axis(held, 'lodging').handled).toBe(true);
    // Lodging leaves the open list entirely, so food moves up.
    expect(rankOf(held, 'lodging')).toBe(-1);
    expect(leads(held)).toBe('food');
  });

  test('a mere PICK does not satisfy lodging — choosing is not booking', () => {
    const picked = destEvent({ lodging: { hotelName: 'The Eldorado', from: 'the option you picked' } });
    expect(axis(picked, 'lodging').handled).toBe(false);
    expect(rankOf(picked, 'lodging')).toBeLessThan(rankOf(picked, 'food'));
  });
});

describe('a local event inherits no travel logic', () => {
  test('no lodging axis exists at all when isDestination is false', () => {
    const local = destEvent({ isDestination: false });
    expect(axis(local, 'lodging')).toBeNull();
  });

  test('…and food leads, because it is genuinely the next thing', () => {
    const local = destEvent({ isDestination: false });
    expect(leads(local)).toBe('food');
  });

  test('the honoree being 80 changes nothing — age is not a fact about travel', () => {
    // Guards against anyone "fixing" ordering by inferring from a name or age.
    const a = openOrder(destEvent({ name: 'My 80th Birthday', honoree: 'Mom' }));
    const b = openOrder(destEvent({ name: 'A weekend away', honoree: '' }));
    expect(a).toEqual(b);
  });
});

describe('the rule is general, not authored per event type', () => {
  // Same relationship across every type that can be a destination event. If this
  // were a one-off rule for birthdays, these would diverge.
  test.each([
    ['Birthday'], ['Wedding'], ['Family Reunion'], ['Retirement Party'], ['Anniversary'],
  ])('%s — lodging outranks food when both are open', (type) => {
    const ev = destEvent({ type, id: `oc-${type}` });
    const l = rankOf(ev, 'lodging');
    const f = rankOf(ev, 'food');
    if (l === -1 || f === -1) return;   // that type may not raise both; not a failure
    expect(l).toBeLessThan(f);
  });

  test('the same is true for a different destination entirely', () => {
    const ev = destEvent({ venueCity: 'Tulum', venueState: '', type: 'Family Reunion', guestCount: 22, guestEstimate: 22 });
    expect(rankOf(ev, 'lodging')).toBeLessThan(rankOf(ev, 'food'));
  });
});

describe('order comes from consequence, not from array position', () => {
  test('the ladder is sorted by priority, so producer order cannot decide it', () => {
    const ev = destEvent();
    const forward = openOrder(ev);
    // Reverse the raw axis list and re-sort: same answer, because the sort key
    // is the authored priority and not the insertion index.
    const reversed = axes(ev).filter((a) => !a.handled).reverse()
      .sort((x, y) => (x.priority || 9) - (y.priority || 9)).map((a) => a.id);
    expect(reversed).toEqual(forward);
  });

  test('lodging’s priority is genuinely ahead of food’s, not equal-and-lucky', () => {
    // A tie would make the order an artifact of sort stability. It must be strict.
    const ev = destEvent();
    expect(axis(ev, 'lodging').priority).toBeLessThan(axis(ev, 'food').priority);
  });
});
