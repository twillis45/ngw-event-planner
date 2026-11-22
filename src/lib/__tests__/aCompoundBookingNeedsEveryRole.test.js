// ─── A COMPOUND BOOKING STEP NEEDS A BOOKED VENDOR PER ROLE (Wanda audit P0-11) ──
//
// "Book photobooth + night-of photographer, or trim to fit budget" was marked
// "done by your plan" while the photobooth and the night-of photographer were
// both still at Considering. The one booked "photo" vendor was Wanda's friend
// shooting her BEFORE the event for the 6-ft prints — a different job — and
// the photobooth was not a role the rule knew, so the photographer match alone
// closed the whole step.
//
// The rule now: every role the step names needs its OWN booked, hired vendor.
// A photobooth is its own role; a booth is not a photographer; a pre-event
// photoshoot is not the event's photographer; a friend helping (isInformal)
// is not a booking.
import W from '../../data/wandaGoldEvent';
import { taskSatisfied } from '../taskEngine';

const STEP = W.timeline.find((t) => t.id === 'ev-x-wanda-t3');
const withStatus = (ids, status) => ({
  ...W,
  vendors: W.vendors.map((v) => (ids.includes(v.id) ? { ...v, status } : v)),
});
const BOOTH = 'ev-x-wanda-v5';
const NIGHT_OF = 'ev-x-wanda-v6';

describe('Book photobooth + night-of photographer', () => {
  test('premise: the step is the audited one', () => {
    expect(STEP.task).toMatch(/^Book photobooth \+ night-of photographer/);
  });

  test('neither booked → not done (the pre-event photoshoot is a different job)', () => {
    expect(taskSatisfied(W, STEP)).toBe(false);
  });

  test('only the booth booked → not done', () => {
    expect(taskSatisfied(withStatus([BOOTH], 'Deposit Paid'), STEP)).toBe(false);
  });

  test('only the photographer booked → not done', () => {
    expect(taskSatisfied(withStatus([NIGHT_OF], 'Deposit Paid'), STEP)).toBe(false);
  });

  test('both booked → done', () => {
    expect(taskSatisfied(withStatus([BOOTH, NIGHT_OF], 'Deposit Paid'), STEP)).toBe(true);
  });
});

describe('the role readers', () => {
  const ev = (vendors) => ({ ...W, timeline: [], vendors });
  const book = { task: 'Book the photographer' };

  test('a booked photobooth is not a photographer', () => {
    expect(taskSatisfied(ev([{ id: 'b', name: 'Snap Booth Co.', category: 'Photobooth', status: 'Confirmed' }]), book)).toBe(false);
  });

  test('a friend helping is not a booked photographer', () => {
    expect(taskSatisfied(ev([{ id: 'f', name: 'Cousin Dee', category: 'Photography', status: 'Confirmed', isInformal: true }]), book)).toBe(false);
  });

  test('one vendor cannot fill two roles', () => {
    const both = { task: 'Book the DJ and the photographer' };
    expect(taskSatisfied(ev([{ id: 'x', name: 'Photo & DJ Combo', category: 'Photography', status: 'Confirmed' }]), both)).toBe(false);
    expect(taskSatisfied(ev([
      { id: 'x', name: 'Lens Co.', category: 'Photography', status: 'Confirmed' },
      { id: 'y', name: 'DJ Kane', category: 'DJ', status: 'Confirmed' },
    ]), both)).toBe(true);
  });

  test('premise: a real booked photographer still closes "Book the photographer"', () => {
    expect(taskSatisfied(ev([{ id: 'p', name: 'Lens Co.', category: 'Photography', status: 'Deposit Paid' }]), book)).toBe(true);
  });
});
