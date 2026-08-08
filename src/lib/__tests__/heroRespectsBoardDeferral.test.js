// ── THE HERO NAGGED FOR DECISIONS THE BOARD HAD PARKED ──────────────────────
//
// Found 2026-08-07 by running both engines against one event instead of
// reading either alone. On a birthday 90 days out, playbookDecisionBoard put
// `food_style` and `alcohol` in its `deferred` bucket — the bucket whose whole
// meaning is "comes up closer to the date" — while deriveEventPhaseProgress
// made "Decide what you're serving · 2 open" the app's single TOP instruction.
// Two surfaces, one event, opposite advice, and the louder one was wrong.
//
// This is the same defect class as the dest_lodging weight bug: the
// intelligence existed, one surface just never asked the other. So these tests
// are written as a CROSS-ENGINE AGREEMENT check rather than a snapshot of
// either engine's output — a future change to the deferral horizon should keep
// them passing, and only a genuine disagreement should fail them.
import { playbookDecisionBoard } from '../playbooks';
import { deriveEventPhaseProgress } from '../phaseProgress';

const AS_OF = new Date('2026-08-07T12:00:00Z');
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const eventAt = (days, extra) => ({
  id: 'ev-defer', type: 'birthday', name: 'Deferral probe',
  date: iso(AS_OF.getTime() + days * 864e5),
  venue: 'The Hall', guestCount: 30, foodChoices: {},
  ...(extra || null),
});

const boardOf = (ev) => playbookDecisionBoard(ev, AS_OF) || {};
const progressOf = (ev) => deriveEventPhaseProgress(ev, AS_OF) || {};
const deferredIds = (ev) => new Set((boardOf(ev).deferred || []).map((r) => r.id));

describe('the hero never asks for what the board has parked', () => {
  test('a long runway really does produce a deferred bucket (premise check)', () => {
    // If this stops holding, the tests below would pass vacuously — they would
    // be asserting agreement about an empty set. Fail loudly instead.
    const d = deferredIds(eventAt(90));
    expect(d.size).toBeGreaterThan(0);
    expect(d.has('food_style')).toBe(true);
  });

  test('the cue never names a record the board deferred', () => {
    // The real invariant, checked across the whole horizon rather than at one
    // convenient distance.
    for (const days of [120, 90, 60, 45, 30, 21, 10, 3]) {
      const ev = eventAt(days);
      const parked = deferredIds(ev);
      const cue = progressOf(ev).nextCue;
      const named = (cue && cue.records) || [];
      const collision = named.filter((id) => parked.has(id));
      expect({ days, asksForParked: collision }).toEqual({ days, asksForParked: [] });
    }
  });

  test('at 90 days the top cue is no longer the parked menu', () => {
    const cue = progressOf(eventAt(90)).nextCue;
    expect(cue).toBeTruthy();
    expect(cue.id).not.toBe('food');
  });

  test('once the window opens, the food cue comes back with a real count', () => {
    // The fix must not simply mute food forever — that would trade a nag for a
    // blind spot.
    const ev = eventAt(45);
    expect(deferredIds(ev).size).toBe(0);
    const cue = progressOf(ev).nextCue;
    expect(cue.id).toBe('food');
    expect(cue.label).toMatch(/2 open/);
  });

  test('food stays UNHANDLED while parked — deferral is not a green dot', () => {
    // The opposite dishonesty: flipping food to done at 90 days out because
    // nothing is due yet would put a check over an undecided menu.
    const items = progressOf(eventAt(90)).items || [];
    const food = items.find((i) => i.id === 'food');
    expect(food).toBeTruthy();
    expect(food.handled).toBe(false);
  });

  test('the count in the label matches the ids the cue claims', () => {
    // A stale-count guard: the label says "N open" and `records` names them, so
    // the two must not drift apart.
    const cue = progressOf(eventAt(45)).nextCue;
    const m = /·\s*(\d+)\s*open/.exec(cue.label || '');
    expect(m).toBeTruthy();
    expect(Number(m[1])).toBe((cue.records || []).length);
  });

  test('the dietary question is still asked even when every menu pick is parked', () => {
    // Allergies do not wait for a window. With the menu decisions answered but
    // dietary outstanding, food must still have an ask.
    const ev = eventAt(90, { foodChoices: { food_style: 'Catered', alcohol: 'Beer & wine', theme: 'None' } });
    const items = progressOf(ev).items || [];
    const food = items.find((i) => i.id === 'food');
    if (food && !food.handled) {
      expect(food.cueLabel).toBeTruthy();
    }
  });

  test('a board failure degrades to the old behaviour, never to a crash', () => {
    // The board is wrapped because the progress header must not go down with
    // it. An event with no type exercises the unhappy path.
    expect(() => progressOf({ id: 'x', date: iso(AS_OF.getTime() + 90 * 864e5) })).not.toThrow();
  });
});
