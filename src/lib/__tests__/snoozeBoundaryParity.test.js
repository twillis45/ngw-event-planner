// ─── ONE SNOOZE BOUNDARY, NOT TWO ───────────────────────────────────────────
//
// W7-F1, the third of three sub-dimensions capping Ranking at 3/10, re-derived
// against the running engine on 2026-08-17 rather than inherited.
//
// There are two ways to set an item down: tap "not now" (proposedSnoozeDays picks
// the day) or pick a date (clampSnoozeUntil bounds the choice). They computed the
// same boundary differently and disagreed at exactly one point:
//
//     windowCloses === 1   proposal: 1 day   clamp: null (refuse)
//
// So the same item was un-snoozeable by picking a date and snoozeable by tapping
// "not now". Two answers to one question, differing only at the edge — which is
// where a host is most likely to be standing when it actually matters.
//
// The proposal was the wrong one: its `Math.max(1, windowCloses - 1)` floor
// overrode the rule written one line above it ("Come back with a day to spare"),
// returning the closing day itself with zero days to spare.
//
// This file pins the two paths TO EACH OTHER rather than to a hardcoded table, so
// the property survives any future change to what the boundary is — what must not
// survive is the two of them disagreeing about it.
import { proposedSnoozeDays, proposedSnoozeUntil, clampSnoozeUntil } from '../snooze';

const isoIn = (days) => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

describe('the two snooze paths agree about what can be set down', () => {
  // Swept rather than spot-checked: a divergence that lives at one boundary is
  // exactly what a handful of hand-picked cases misses.
  const cases = [];
  for (let toEvent = 2; toEvent <= 30; toEvent++) {
    for (let lead = -1; lead >= -30; lead--) {
      if (toEvent + lead < -3) continue;         // far past the window, not interesting
      cases.push([toEvent, lead]);
    }
  }

  test('PREMISE — the sweep really covers the boundary that diverged', () => {
    // windowCloses === 1 is the single point they disagreed on. If the sweep
    // stops generating it, this file silently stops testing the thing it exists
    // for.
    const atBoundary = cases.filter(([e, l]) => e + l === 1);
    expect(atBoundary.length).toBeGreaterThan(5);
    expect(cases.length).toBeGreaterThan(100);
  });

  test('refusal is unanimous — neither path hides what the other will not', () => {
    const divergent = [];
    for (const [toEvent, lead] of cases) {
      const event = { date: isoIn(toEvent) };
      const proposal = proposedSnoozeUntil(event, { leadDays: lead });
      // Ask the clamp for a far-out date so only its CEILING can refuse — this
      // compares boundaries, not the host's choice.
      const clamped = clampSnoozeUntil(event, isoIn(toEvent + 10), { leadDays: lead });
      if ((proposal === null) !== (clamped === null)) {
        divergent.push(`toEvent=${toEvent} lead=${lead} windowCloses=${toEvent + lead}: proposal=${proposal} clamp=${clamped}`);
      }
    }
    expect(divergent).toEqual([]);
  });

  test('and when both allow it, the proposal never lands past the clamp ceiling', () => {
    // Agreement on "can it be hidden" is not agreement on "until when". A
    // proposal that resurfaces after the clamp's own ceiling would be the same
    // divergence wearing a different hat.
    const late = [];
    for (const [toEvent, lead] of cases) {
      const event = { date: isoIn(toEvent) };
      const proposal = proposedSnoozeUntil(event, { leadDays: lead });
      if (proposal === null) continue;
      const ceiling = clampSnoozeUntil(event, isoIn(toEvent + 10), { leadDays: lead });
      if (ceiling && proposal > ceiling) late.push(`toEvent=${toEvent} lead=${lead}: ${proposal} > ${ceiling}`);
    }
    expect(late).toEqual([]);
  });
});

describe('the rule the boundary is meant to keep', () => {
  test('a snooze always comes back with at least a day to spare', () => {
    // The invariant the old Math.max floor silently broke. Stated as itself, so a
    // future edit has to break the RULE rather than just the number.
    for (let toEvent = 2; toEvent <= 30; toEvent++) {
      for (let lead = -1; lead >= -20; lead--) {
        const days = proposedSnoozeDays({ date: isoIn(toEvent) }, { leadDays: lead });
        if (days == null) continue;
        const windowCloses = toEvent + lead;
        expect(days).toBeLessThanOrEqual(windowCloses - 1);
      }
    }
  });

  test('windowCloses === 1 is refused by BOTH — the exact point that diverged', () => {
    const event = { date: isoIn(10) };
    expect(proposedSnoozeDays(event, { leadDays: -9 })).toBeNull();
    expect(proposedSnoozeUntil(event, { leadDays: -9 })).toBeNull();
    expect(clampSnoozeUntil(event, isoIn(3), { leadDays: -9 })).toBeNull();
  });

  test('windowCloses === 2 is still allowed by both — the fix did not overshoot', () => {
    // A refusal that swallowed the next case too would be a regression dressed as
    // a fix: items that CAN honestly be set down must still be settable.
    const event = { date: isoIn(10) };
    expect(proposedSnoozeDays(event, { leadDays: -8 })).toBe(1);
    expect(clampSnoozeUntil(event, isoIn(3), { leadDays: -8 })).not.toBeNull();
  });
});
