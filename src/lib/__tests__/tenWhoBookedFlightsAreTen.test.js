// ─── A GUEST WITH A PLANE TICKET IS NOT A 10–15% NO-SHOW ─────────────────────
//
// MEASURED on the Santa Fe 80th. The host entered TEN. `attendanceBand` returned
// a 9–11 band from the `rsvp_social` shift class — "usually ~10–15% no-shows, a
// few plus-ones" — and `playbookFoodPlan` then sized to ELEVEN, a number she
// never typed and nothing on the screen explained.
//
// NEITHER HALF OF THAT SHIFT DESCRIBES A DESTINATION TRIP. Nobody turns up to
// New Mexico as an unannounced plus-one, and a guest holding a non-refundable
// fare and four nights' lodging is not a casual no-show. The class is
// keyword-matched on TYPE alone — `attendanceClass(type, playbook)` takes no
// event argument — so `isDestination` could never have reached it.
//
// THE FIX IS A REFUSAL, NOT A NEW BAND. Authoring destination attrition needs a
// corpus. Every source behind CLASS is a local-party or wedding-RSVP study
// (After Work Wonders, the 60% show-rate rule, a BBQ calculator, RSVPify, Glue
// Up, nunify) and none of them measures whether people who bought airfare turn
// up. attendanceModel's own header already says it does no no-show prediction
// "(that needs a corpus we don't have yet)". Inventing one for travellers is the
// over-application this file guards against everywhere else.
//
// So a destination takes the path a LOCKED count already takes — the host's
// number, honoured exactly, no modelled spread — and says why, because a host
// who sees the band vanish without explanation reads it as a bug.
import { eventSizing, attendanceBand, playbookFoodPlan, getPlaybook } from '../playbooks';

const EV = (over = {}) => ({
  id: 'ev-80', type: 'Birthday', date: '2027-06-17', endDate: '2027-06-21',
  isDestination: true, guestMode: 'count', guestCount: 10,
  budget: [], vendors: [], guests: [], ...over,
});
const sz = (ev) => eventSizing(ev, getPlaybook('Birthday'));

describe('ten who booked flights are ten', () => {
  test('(premise) the LOCAL event still bands, so this is a destination rule', () => {
    // If the local path stopped banding too, the change would be a silent
    // removal of the whole attendance model rather than a scoped refusal.
    const local = sz(EV({ isDestination: false }));
    expect(local.band.band).toBe(true);
    expect([local.band.low, local.band.high]).toEqual([9, 11]);
    expect(local.band.shift.class).toBe('rsvp_social');
    expect(local.ceiling).toBe(11);
  });

  test('THE DEFECT: the entered count survives to the ceiling and the floor', () => {
    const d = sz(EV());
    expect(d.ceiling).toBe(10);
    expect(d.floor).toBe(10);
    expect(d.band.band).toBe(false);
    expect([d.band.low, d.band.high]).toEqual([10, 10]);
  });

  test('the food plan sizes to what she said, not to eleven', () => {
    // The consumer that made the wrong number visible. It reads the ceiling.
    expect(playbookFoodPlan(EV()).guests).toBe(10);
    expect(playbookFoodPlan(EV({ isDestination: false })).guests).toBe(11);
  });

  test('no social shift is attached to a destination at all', () => {
    // Not merely equal low and high — the shift must not be CARRIED, or a later
    // consumer reads `band.shift.high` and re-applies the 1.05 downstream.
    const b = attendanceBand(EV());
    expect(b.shift ?? null).toBe(null);
    expect(b.basis).toBe('count');
  });

  test('it says WHY the band is flat', () => {
    // A vanished band with no sentence reads as a bug to the host.
    expect(attendanceBand(EV()).because).toMatch(/everyone travelling is counted/i);
    expect(attendanceBand(EV()).noShiftReason).toBe('destination');
    // …and the local event's sentence is untouched.
    expect(attendanceBand(EV({ isDestination: false })).because).toMatch(/typically show/);
  });

  test('NEGATIVE CONTROL: REAL RSVPs still win over everything', () => {
    // The roster branch returns long before this change is reached. A
    // destination event with actual replies must band on those replies — the
    // refusal covers the estimate path only, never real data.
    const roster = EV({
      guestMode: 'roster',
      guests: [{ rsvp: 'yes' }, { rsvp: 'yes' }, { rsvp: '' }, { rsvp: 'no' }],
    });
    const b = attendanceBand(roster);
    expect(b.basis).toBe('rsvp');
    expect(b.band).toBe(true);
    expect([b.low, b.high]).toEqual([2, 3]);
    expect(b.noShiftReason ?? null).toBe(null);
  });

  test('NEGATIVE CONTROL: a locked LOCAL count still honours itself', () => {
    // The path this change borrows must keep working on its own terms.
    const locked = sz(EV({ isDestination: false, guestCountLocked: true }));
    expect(locked.band.band).toBe(false);
    expect([locked.band.low, locked.band.high]).toEqual([10, 10]);
    expect(locked.band.noShiftReason ?? null).toBe(null); // locked, not destination
  });

  test('NEGATIVE CONTROL: no count is still no band, destination or not', () => {
    // The refusal must not manufacture an applicable band out of nothing.
    expect(attendanceBand(EV({ guestCount: 0 })).applicable).toBe(false);
    expect(attendanceBand(EV({ guestCount: 0, isDestination: false })).applicable).toBe(false);
  });

  test('NEGATIVE CONTROL: every OTHER type is untouched when local', () => {
    // The shift model still has to work for the 44 playbooks this never touches.
    for (const [type, cls] of [['Wedding', 'formal'], ['The Cookout', 'casual_open'], ['Graduation', 'rsvp_social']]) {
      const b = attendanceBand({ ...EV({ isDestination: false }), type, guestCount: 40 });
      expect(b.band).toBe(true);
      expect(b.shift.class).toBe(cls);
    }
  });
});
