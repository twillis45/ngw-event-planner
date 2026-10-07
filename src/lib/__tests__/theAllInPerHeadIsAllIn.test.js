// ─── "ALL IN" THAT WAS NOT ALL IN ─────────────────────────────────────────
//
// C2 of the 2026-10-06 audit, confirmed and then independently re-derived by
// the review board's data-ink seat. On the Shop hero, two lines:
//
//   $535–$1,320
//   estimate, all in · $17–$39 a head · 30 guests
//
// $39 × 30 = $1,170. The printed top is $1,320. Both figures are individually
// correct; the LABEL is the lie. The headline sums food AND supplies, the
// per-head band is food only — `isFood = (i) => i.group !== 'Supplies'` — and
// the words "all in" plus a guest count on the same line are an explicit
// invitation to multiply. A host who accepts it is 13% short at the top of
// the band, on the one screen whose job is the grocery number.
//
// WHY IT IS FIXED BY ADDING, NOT BY WIDENING. `perGuestLow/High` are correct
// where they are used elsewhere: the sibling money row at HostShellV2 prints
// "≈ $17–$39 a head × 30 guests" against the food-only subtotal, and THERE the
// multiplication closes. Widening the existing pair would break the surface
// that is right to fix the one that is wrong. So the engine gains an all-in
// pair and the hero reads that instead — the same shape as shoppingCount.
import { playbookFoodPlan } from '../playbooks';

const EV = {
  id: 'ai', name: "Mom's 80th", type: 'Birthday', date: '2027-06-14', endDate: '2027-06-17',
  venueCity: 'Santa Fe', state: 'NM', guestMode: 'count', guestCount: 30, isDestination: true,
};

describe('the all-in per-head describes the all-in total', () => {
  const fp = playbookFoodPlan(EV);

  test('(premise) this plan really does carry supplies, so the two differ', () => {
    expect(fp).toBeTruthy();
    expect(fp.guests).toBeGreaterThan(0);
    expect(fp.suppliesHigh).toBeGreaterThan(0);
  });

  test('THE DEFECT: the food-only per-head does NOT multiply out to the all-in total', () => {
    // Stated as a fact about the old pair, so the file records what was wrong
    // rather than only what is now right.
    const allInHigh = (fp.foodHigh || 0) + (fp.suppliesHigh || 0);
    expect(fp.perGuestHigh * fp.guests).toBeLessThan(allInHigh);
  });

  test('THE FIX: the all-in per-head does', () => {
    const allInLow = (fp.foodLow || 0) + (fp.suppliesLow || 0);
    const allInHigh = (fp.foodHigh || 0) + (fp.suppliesHigh || 0);
    // Rounding is per-head, so the product can miss the total by up to half a
    // guest-count either way. Anything wider than that is a different basket.
    expect(Math.abs(fp.perGuestAllInLow * fp.guests - allInLow)).toBeLessThanOrEqual(fp.guests / 2);
    expect(Math.abs(fp.perGuestAllInHigh * fp.guests - allInHigh)).toBeLessThanOrEqual(fp.guests / 2);
  });

  test('…and it is genuinely bigger than the food-only pair', () => {
    expect(fp.perGuestAllInHigh).toBeGreaterThan(fp.perGuestHigh);
  });

  test('THE FOOD-ONLY PAIR IS UNTOUCHED — a sibling surface reconciles against it', () => {
    const foodHigh = fp.foodHigh || 0;
    expect(Math.abs(fp.perGuestHigh * fp.guests - foodHigh)).toBeLessThanOrEqual(fp.guests / 2);
  });

  test('NEGATIVE CONTROL: a zero-input event still answers a real number', () => {
    // My first draft asserted 0 here and was wrong about the ENGINE, not the
    // fix: `guestCount: 0` does not reach the `guests > 0` guard, because the
    // plan falls back to the playbook's own typical headcount when the host
    // has not given one. That is correct behaviour and it is why the number
    // comes back as 18 rather than 0.
    // What is actually worth guarding is the arithmetic: a per-head figure
    // must never reach a screen as NaN or Infinity.
    const none = playbookFoodPlan({ ...EV, guestCount: 0, guestMode: 'count' });
    expect(Number.isFinite(none.perGuestAllInLow)).toBe(true);
    expect(Number.isFinite(none.perGuestAllInHigh)).toBe(true);
    expect(none.perGuestAllInLow).toBeGreaterThanOrEqual(0);
  });
});
