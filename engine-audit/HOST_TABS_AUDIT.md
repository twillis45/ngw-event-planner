# Host Tabs Audit — Figma vs Code (parity · transitions · haptics · sound)

> Render-first audit, 2026-06-27. Figma file `CYlmJqDCXEaacCuz9wW3bd`. Runtime `src/App.js` + `src/lib/*`.
> Screenshots: `review-artifacts/now-audit/`, `review-artifacts/figma_b1_weather.png`, `figma_b2_severity.png`, `figma_a1_messages.png`.
> Legend: 🟢 match/built · 🟠 partial/differs · 🔴 missing/designed-not-built · ⚪ no design source.

## Master scorecard

| Surface | Parity | Transitions | Figma → runtime notes |
|---|---|---|---|
| **Your Event** (Command) | 🔴 | 🟠 | Tab renders `CommandCenter`, **not** a `PlanNowHero` — flagship frame has zero hero parity. Identity+"14 DAYS" countdown card + 2 status folds missing. |
| **Plan** | 🟢 | 🟢 | Closest match. Breathing hero + recessed folds. Missing sticky CTA, "Food plan" fold, "View full shopping list · N" link-row. |
| **Budget** | 🟠 | 🟠 | Hero shape matches; **no inline swap decision** ("Drop photo booth / Keep it") — flattened to "Open budget →". Folds differ (3 category cards vs Total/By-category). |
| **Guests** | 🔴 | 🟠 | Hero missing **inline −/N/+ stepper + "Lock it" + "nudge the N →"** — richest action surface in the set, reduced to one nav button. Headcount whisper-row + "Who's coming" fold missing. |
| **Day-of** | 🟠 | 🟢 | now/next cue + "send everyone their part" brief built. **3-tier severity stack 🔴 not built**; weather "your move" 🟠 engine exists but planner-only. |
| **Recap** (post-day) | 🟢 | 🟢 | `PostEventRecap` exceeds Figma (Figma has no recap frame). Must-have outcome + final numbers + keepsake draft all built. |

**Cross-cutting chrome (all NOW-View tabs):**
- 🔴 **`readiness-track`** — the 4px progress hairline (node dot + ticks) on every Figma frame. **0 in code.** The shared progress signifier of the whole system.
- 🟠 **Per-tab sticky CTA** — Figma pins a full-width CTA at bottom (Your Event "Review & send invite", Plan "Add to shopping list", Guests "Open & share invite"). Runtime buries the CTA inside the hero card. (Budget intentionally has none.)
- 🟠 Collapsible body has **no height/expand animation** (chevron rotates, body just mounts).

## Haptics — Figma `1677:3` "Haptics — Feedback Map" → **0 of 24 built** 🔴

24 cues across 6 tiers (light `vibrate(10)` · medium `(20)` · heavy `(30)` · success `[15,40,15]` · warning `[30,40,30]` · soft sequence). Principle: *"confirmation, not noise — one haptic per deliberate action; never scroll/idle/passive."* **Runtime: zero** (`navigator.vibrate` absent everywhere).
**Build:** one `src/lib/haptics.js` → `haptic(tier)` guarded by `typeof navigator.vibrate === 'function'` + reduced-motion, called from the deliberate-action handlers. **Honest caveat: iOS Safari has no Vibration API** → these are Android-web only; full iOS fidelity needs a native/WKWebView wrapper.

## Sound — **no Figma spec exists** ⚪ · runtime = 1 cue

Exhaustive search of the file found **no sound/audio/SFX cue spec** (the "~11 cues" claim is unsubstantiated — no design source). Runtime `src/lib/notificationSound.js` has exactly **one** cue: `playMessageChime` (Web-Audio "ding-dong" on inbound message, `App.js:40479`). Mute flag exists but is **in-memory only, no Settings UI**. So sound is *not a parity gap* — it's a greenfield decision (do we want a cue set + a persisted Settings toggle), not a Figma→code delta.

## Ranked burndown

**P0 — high user-visible impact / host-correctness**
1. **Guests hero inline controls** — stepper + "Lock it" + "nudge the N →" into the `scope==='guests'` hero (App.js ~38207). Act-in-hero vs navigate-away.
2. **Day-of 3-tier severity stack on the HOST surface** — add `heads-up` tier to `computeDayAlerts` (34046), reshape alerts to `{tier, headline, move}`, render dot+eyebrow+headline+"→ move" card stack closing with "Everything else is on track." Host-gated (`isHost`) — the current `EventDayBar` panic-strip violates the Ruthless Host Lens.
3. **Your Event NOW hero** — decide: mount `PlanNowHero` (global next-step) on the Command tab, or accept `CommandCenter` as the divergent surface. Flagship tab currently has zero hero parity.
4. **Weather "your move" on host day-of + amber WARNING tier** — `WeatherAlert` engine already built; surface it in `isDayOf && isHost` (~21255) and stop collapsing medium→muted.

**P1**
5. `readiness-track` hairline on all NOW tabs (shared progress signifier).
6. Per-tab sticky CTA (Your Event / Plan / Guests).
7. Budget inline swap decision ("Drop photo booth / Keep it") — wire the parked swap-to-save.
8. Missing collapsibles: Your Event "Where things stand" + "The day a peek"; Guests "Headcount" whisper-row + "Who's coming" fold.
9. **Haptics util** (`haptics.js`, 24 cues) — cheap, high-feel, foundational.

**P2**
10. Budget fold structure reconcile (Total / By-category roll-up w/ status dots).
11. Plan "Food plan" fold + "View full shopping list · N" link-row.
12. Day-of "Who's helping" roster (A1) + "reality check" readiness sweep (B3).
13. Collapsible body height animation.
14. Sound: persist mute + Settings toggle (optional — no design source).
- **Defer:** per-helper day-of thread (A2) — new comms surface, and Communications is FROZEN.
