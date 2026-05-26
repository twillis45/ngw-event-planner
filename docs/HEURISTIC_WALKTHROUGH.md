# Heuristic Walkthrough — NGW Slices

> ⚠️ **This document is NOT human operational validation.** It is informed
> structural analysis by an automated agent against the locked Studio Matte
> doctrine, intended to catch obvious issues *before* real operators are
> exposed to the slices. Every claim below has a confidence rating and a
> "needs human" flag. None of these findings substitute for the
> `HUMAN_VALIDATION_PROTOCOL.md` pass. Do not move the
> Human-Operational-Validation progress number based on this document.

**Slices analyzed:** `?slice=vendor`, `?slice=desktop-density`
**Viewports analyzed:** 1440 desktop, 1280 desktop, 1024 tablet landscape
**Method:** DOM inspection + computed style audit + state-transition probes
via the preview's `eval` tool. **No human eyes.**

---

## 1. Findings matrix

| # | Question | Heuristic answer | Confidence | Needs human to confirm |
|---|---|---|---|---|
| 1 | Is there exactly one structural P1 at any state? | ✅ Yes. Verified by DOM: `Surface role="active"` (or `"escalation"` at emergency) renders only on the primary; secondaries are `role="card"`. No co-equal P1 surface observed in any tested state. | High | Confirm operator's eyes land on it first |
| 2 | Does P1 win via structure, not saturation? | ✅ Mass-led: primary surface uses the elevated matte plane + grounding shadow; the red on the EMERGENCY surface is the bg fill, not a glow or pulse. No animated emphasis. | High | Confirm "red enough?" is the wrong question |
| 3 | As severity rises, does the interface get quieter? | ✅ Verified: secondaries shed metadata at `secondaries ≥ 2 || emergency`; the context rail does NOT grow new elements at any severity tier. Density signal propagates via `DensityContext` → primitives consume it. | High | Confirm it *feels* quieter, not just renders quieter |
| 4 | Is motion within the locked matrix? | ✅ Verified at runtime (Sprint 11A): sheet rises with `0.23s cubic-bezier(0.16,1,0.3,1)` at escalation; `0.2s cubic-bezier(0.05,0.7,0.1,1)` at emergency. No bounce/spring/overshoot anywhere. | High | Subjective "feel" remains unvalidated |
| 5 | Does the awareness rail (Other Threads) avoid competing with the primary? | ✅ Compressed cards are pad-3 vs. primary pad-6; secondary text only; no action buttons; no badge. Hierarchy gap is structural, ~3× mass differential. | Medium | Operators may still read it as "noise" — observe |
| 6 | Does the context rail remain useful and persistent? | ✅ All three zones (event/mode/vendor status) survive at every severity tier with no chrome added. Vendor status grid uses tertiary text color (steel) under nominal, primary text only when severity rises. | Medium | Operators may ignore it entirely — observe whether eyes ever land there |
| 7 | Spatial command layout — does each zone have a singular purpose? | ✅ Yes by design. Left = context, center = action, right = awareness. No mixed-purpose zones. Tablet-landscape collapses to 2-zone + stacked strip, preserving purpose. | High | Observers should ask "what's this rail for?" — silence/wrong answer = failure |
| 8 | Recovery decompression — does the interface return to nominal calmly? | ✅ Reset clears all escalation state in one tick; "All clear" message centered in the orchestration column; secondaries vanish. No celebratory motion. Doctrine-correct. | Medium | Could feel "anticlimactic" to operators expecting closure feedback — observe |
| 9 | SaaS drift — any startup-generic patterns? | ✅ None detected. No card-grid feel (zones have distinct roles), no KPI tiles, no glow/pulse/gradient, no notification-center behavior. | High | Operators with SaaS exposure may still pattern-match; observe their language |

---

## 2. Predicted friction points (heuristic only — likely to surface in real tests)

These are **predictions**, not findings. Real humans may or may not confirm.

| # | Predicted friction | Where | Likelihood (heuristic) | Why I suspect it |
|---|---|---|---|---|
| F1 | Operators may not realize the Other Threads cards are **clickable to promote**. | `?slice=desktop-density` right rail | Medium | No visual affordance for "click to promote." Cursor is set to pointer, but there's no hover lift or "click to focus" hint. |
| F2 | Recovery may feel **anticlimactic** ("did it really resolve?"). | both slices | Medium | "Mark resolved" returns to a quiet state with no acknowledgment chip. Doctrine-correct (no celebration), but operators conditioned by SaaS may want a "✓ resolved" pill briefly. |
| F3 | At EMERGENCY, the primary action label change (`Call lead directly → CONTACT NOW`) may register as a **new action** rather than the same one promoted. | desktop-density | Low–Medium | Two adjacent rapid label/style swaps. Could cause a brief "wait, what changed?" pause. |
| F4 | The context rail's **vendor status grid** uses identical-size dots regardless of severity. | desktop-density | Low | At a glance, escalating vendors don't pop *in the rail*; they only pop in the center + right. Possibly intentional (rail is reference, not signal) but may cause peripheral-vision miss. |
| F5 | The 1024-tablet-landscape reflow puts Other Threads as a **horizontal strip below**. Operators primed for the right-rail position may not immediately register them. | desktop-density at 1024 | Medium | Layout shift between viewports is operator-dependent. Inherent tradeoff. |
| F6 | Demo driver bar is visually similar to a toolbar — operators may interact with it thinking it's part of the real product. | both slices | High | This is fine in a lab context; but if shown to a paying customer it would confuse. Cosmetic / labeling concern only. |

**None of F1–F6 are doctrine violations.** All are observable patterns that may or may not bite. **Do not patch them pre-emptively** — wait for human signal.

---

## 3. Using the observer instrumentation
Add `&observe=1` to either slice URL:
```
http://localhost:3000/?slice=desktop-density&observe=1
```
What it captures (silently, operator doesn't see it):
- Every button click with the button's label.
- The wall-clock delay (ms) between the last visible state change and the next click — a proxy for hesitation.
- Every state-significant change: badge text (EMERGENCY/CRITICAL/ESCALATION), Other-Threads count, primary-action label.

**During the session:** observer keeps notes by hand as per the protocol.
**After the session:** observer presses **Ctrl/Cmd + Shift + L** — the transcript is copied to the clipboard. Paste into your findings doc next to the operator's notes.

The transcript looks like:
```
time         hesitation_ms   kind     what
------------ --------------- -------- -------------------------------------------
13:21:04.512                 state    badge → ESCALATION
13:21:04.518                 state    primary action → Call lead directly
13:21:08.711            4193 click    Call lead directly
13:21:08.713                 state    secondaries → OTHER THREADS (2)
```
**Hesitation column** = the data point. >3000ms before clicking a P1 is a signal worth investigating.

---

## 4. What this walkthrough does NOT prove
- It does **not** prove the system is "operator-ready."
- It does **not** prove motion *feels* trustworthy.
- It does **not** prove the hierarchy is *perceived* correctly.
- It does **not** prove operators trust the system under real stress.
- It does **not** prove SaaS drift is *experienced* as absent.

**All of those require real humans.** This document only confirms the system is
**structurally consistent** with the locked doctrine — a necessary but not
sufficient condition for operator trust.

---

## 5. What to do with this document
1. **Read it once** before exposing the slices to operators — confirms no
   obvious structural break.
2. **Don't share with operators.** It primes them and pollutes the data.
3. **Compare its predictions (F1–F6) against real findings** after the human
   pass. Patterns I predicted correctly = the heuristic captured a real
   structural pattern. Patterns operators showed but I missed = my heuristic
   blind spot, worth noting for future passes.
4. **Do not act on F1–F6 unilaterally.** They are predictions, not findings.
