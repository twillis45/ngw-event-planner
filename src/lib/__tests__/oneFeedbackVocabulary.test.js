// ─── THE SHELL FELT DIFFERENT BECAUSE IT WAS GUESSING ───────────────────────
//
// `src/lib/feedback.js` is a tuned haptic vocabulary: ten bands, each duration
// chosen ABOVE the Android perceptible floor, with the reason written down —
// "a 9ms buzz technically fires but the motor renders nothing, so a haptic you
// can't feel is pointless." It respects `prefers-reduced-motion` and an
// `ngw-haptics` opt-out.
//
// `HostShellV2.jsx` called `navigator.vibrate` itself, with three durations of
// its own, until 2026-09-24. All three differences were defects:
//
//   · the default was 10ms — BELOW the floor the engine documents. Eight of the
//     shell's thirteen feedback calls (every `act`, every `tick`) used it, so
//     they fired and nobody felt them.
//   · `prefers-reduced-motion` was ignored for vibration, in a file that
//     honours it for animation.
//   · the `ngw-haptics` opt-out did not reach this shell at all.
//
// ── THE DIFFERENCE THAT WAS A DECISION, AND SURVIVED THE FOLD ───────────────
//
// The shell's own comment records a motion re-audit: muting SOUND had been
// killing vibration too, so silent-haptics was impossible, and the fix was to
// separate them. The engine already separates them — `ngw-haptics` and
// `ngw-sounds` are different keys — so delegating KEEPS that rule. This is the
// opposite of `authHeaders`, where folding would have destroyed a deliberate
// difference, and it is why this one was folded and that one was capped.
//
// The chime stays local on purpose: `playMessageChime` is the shell's message
// tone, not the engine's `tone()`.
import { VIBE_BANDS, FEEDBACK_BAND, haptic } from '../feedback';

describe('one feedback vocabulary', () => {
  test('(premise) the engine publishes its bands', () => {
    // Without this, every mapping assertion below passes over an empty object.
    expect(Object.keys(VIBE_BANDS).length).toBeGreaterThan(5);
  });

  test('THE GUARD: every band the shell maps to is a real engine band', () => {
    // A typo here is a silent downgrade — `haptic()` falls back to `tap` for an
    // unknown kind, so `magic → 'seel'` would quietly become a light tick on the
    // app's biggest payoff moment and nothing would say so.
    for (const [intent, band] of Object.entries(FEEDBACK_BAND)) {
      expect(`${intent} → ${band} (known: ${band in VIBE_BANDS})`)
        .toBe(`${intent} → ${band} (known: true)`);
    }
  });

  test('AND EVERY MAPPED BAND CLEARS THE PERCEPTIBLE FLOOR', () => {
    // The whole point of the fold. feedback.js documents ~25-30ms as the floor
    // below which a motor renders nothing; the shell's old default was 10.
    // A pattern (array) is a sequence of pulses — its longest pulse is what has
    // to clear the floor, not its total.
    const FLOOR = 25;
    for (const band of Object.values(FEEDBACK_BAND)) {
      const v = VIBE_BANDS[band];
      const strongest = Array.isArray(v) ? Math.max(...v) : v;
      expect(`${band}=${strongest}ms`).toBe(`${band}=${strongest >= FLOOR ? strongest : 'BELOW FLOOR'}ms`);
    }
  });

  test('the shell no longer calls navigator.vibrate itself', () => {
    // The fold is only real if the old call is gone. Source-anchored, and
    // line-anchored so the explanatory comment above the change is prose, not a
    // match — a lesson this session paid for twice.
    const fs = require('fs');
    const path = require('path');
    const shell = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'hostv2', 'src', 'HostShellV2.jsx'), 'utf8',
    );
    expect(shell).not.toMatch(/^\s*(?:try\s*\{\s*)?if\s*\(navigator\.vibrate\)/m);
    expect(shell).toMatch(/^\s*import\s*\{[^}]*\bhaptic\b[^}]*\}\s*from\s*['"]@app\/lib\/feedback['"]/m);
  });

  test('NEGATIVE CONTROL: an unknown band would be caught, and is a real downgrade', () => {
    // Proves the guard above can fail, and documents the failure mode it exists
    // for: haptic() does not throw on a bad kind, it silently degrades.
    expect('seel' in VIBE_BANDS).toBe(false);
    expect(() => haptic('seel')).not.toThrow();   // silent — which is why the guard is needed
  });
});
