// ─── SIXTEEN OR SEVENTEEN CHANGES EVERY PER-HEAD FIGURE ───────────────────
//
// The creation chip asks "How many?" and nothing more; "including you" does
// not appear anywhere in this repo. A house at $4,200 is $263 each across
// sixteen and $247 across seventeen, and nobody has ever been asked which.
import { hostCounts, headsFor, perHeadOf } from '../perHead';

const EV = (over) => ({ guestCount: 16, ...over });

describe('who is in the number', () => {
  test('unstated is the default, and it says so rather than guessing', () => {
    expect(hostCounts(EV())).toBeNull();
    const h = headsFor(EV());
    expect(h.heads).toBe(16);
    expect(h.hostIncluded).toBeNull();
    expect(h.stated).toBe(false);
    expect(h.basis).toMatch(/nobody said/i);
  });

  test('"my number includes me" leaves the count alone', () => {
    const h = headsFor(EV({ hostCounts: true }));
    expect(h.heads).toBe(16);
    expect(h.hostIncluded).toBe(true);
    expect(h.stated).toBe(true);
  });

  test('"my number is guests only" adds the host', () => {
    const h = headsFor(EV({ hostCounts: false }));
    expect(h.heads).toBe(17);
    expect(h.hostIncluded).toBe(false);
    expect(h.stated).toBe(true);
  });

  test('THE DIFFERENCE IS MONEY, which is the reason this exists', () => {
    expect(perHeadOf(4200, EV({ hostCounts: true })).each).toBe(263);
    expect(perHeadOf(4200, EV({ hostCounts: false })).each).toBe(247);
  });

  test('a per-head figure always carries whether the count was stated', () => {
    expect(perHeadOf(4200, EV()).stated).toBe(false);
    expect(perHeadOf(4200, EV({ hostCounts: true })).stated).toBe(true);
  });

  test('no count, no number — never a zero and never a one', () => {
    expect(headsFor({}).heads).toBeNull();
    expect(perHeadOf(4200, {})).toBeNull();
    expect(perHeadOf(0, EV())).toBeNull();
    expect(perHeadOf(null, EV())).toBeNull();
    expect(perHeadOf('lots', EV())).toBeNull();
  });

  test('a bad hostCounts value is unstated, not truthy', () => {
    expect(hostCounts({ guestCount: 16, hostCounts: 'yes' })).toBeNull();
    expect(headsFor({ guestCount: 16, hostCounts: 1 }).heads).toBe(16);
  });
});
