// ─── A HEADCOUNT IS NOT RE-SIZED TO REPLY ROWS (Wanda audit P0-7) ───────────
//
// Your money offered Wanda "Re-size for 7 confirmed guests (plan is sized for
// 75)". Two things were wrong at once:
//   · the 7 is ROWS — the seven Yes rows bring 17 people (plus-ones, P0-8);
//   · she plans by headcount (`guestMode: 'count'`). Her guest rows are "just
//     for tracking, no chasing" — the app's own words — so a handful of
//     replies is not a reason to shrink a 75-person plan.
//
// The suggestion now reads the one heads reader (confirmedRsvpCovers) and
// stays silent in headcount mode.
import W from '../../data/wandaGoldEvent';
import { buildBudgetRecoveryPlan } from '../budgetRecovery';

const rightsize = (ev) => (buildBudgetRecoveryPlan(ev).suggestions || []).find((s) => s.id === 'guests-rightsize') || null;

describe('guest right-sizing', () => {
  test('premise: Wanda is over budget, so suggestions are offered', () => {
    expect(buildBudgetRecoveryPlan(W).status).not.toBe('not_over_budget');
    expect(buildBudgetRecoveryPlan(W).status).not.toBe('needs_more_data');
  });

  test('a headcount host is never told to re-size to her tracking rows', () => {
    expect(W.guestMode).toBe('count');
    expect(rightsize(W)).toBeNull();
  });

  test('a list host is told people, not rows', () => {
    // Same roster, planning by list, every row answered (the one Maybe and
    // the one Pending made definite), sized for 75.
    const guests = W.guests.map((g) => ({ ...g, rsvp: g.rsvp === 'Yes' ? 'Yes' : 'No' }));
    const s = rightsize({ ...W, guestMode: 'roster', guests });
    expect(s).not.toBeNull();
    expect(s.label).toBe('Re-size for 17 confirmed guests (plan is sized for 75)');
  });
});
