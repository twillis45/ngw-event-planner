# Intelligence Readers Registry — Canonical Contract

**Status:** Canonical, living. Part of the [Intelligence OS](./INTELLIGENCE_OPERATING_SYSTEM.md) (governs #3 Host Intelligence, #5 Context Intelligence, and every later consumer).
**Owner:** Todd. **Established:** 2026-07-02.

> **The rule (hard):** **No engine may consume Host Intelligence or Context Intelligence until it is registered here.** A pull request that reads memory/context without a registry entry is incomplete. This prevents intelligence from spreading inconsistently across the codebase — every reader declares, in one place, exactly what it may do.

---

## 0. Why a registry (not scattered reads)

Memory that N engines read N different ways is how AI products lose coherence and trust. A single registry means: one place to see everything that consumes intelligence, one place to audit thresholds, one place to guarantee every adjustment is explainable, gated, and revertable. It is the contract layer between the **stores** (Host Intelligence Profile, Context Intelligence) and the **engines** (sizing, shopping, ROS, budget, …).

---

## 1. The entry contract — every reader answers all nine

Each registered reader MUST specify:

1. **Reader** — the engine/surface that reads (name + `file:line`).
2. **Source + domains** — Host Intelligence (which domains) and/or Context Intelligence (which axes).
3. **Min confidence** — the per-domain confidence floor to act (`Medium`/`High`; see [INTEL-1 §5a](./INTEL_1_HOST_INTELLIGENCE_PROFILE.md)).
4. **Min stability** — the per-domain stability floor to auto-apply (`Medium`/`High`; INTEL-1 §5b). Below it ⇒ *ask, don't assume*.
5. **Max adjustment (clamp)** — the hard bound on how far memory may move the number (e.g. attendance ±25%), so a bad rollup can't produce an absurd plan.
6. **Fallback** — what's used when the gate isn't met: **the L2 playbook default** (always — never a guess).
7. **Because generator** — the template that renders provenance from the *same* observations the number used (INTEL-1 §5d). No adjustment without a because.
8. **User override** — how the host reverts/edits (always available; one tap).
9. **Analytics** — the event(s) captured (applied / reverted / overridden), so we can measure whether memory helps.

A reader that can't fill all nine is not ready to ship.

---

## 2. Registered readers

### Status legend: 🟢 live · 🟡 approved-unbuilt · ⚪ proposed

### R1 · Attendance → plan-to count (food/spending sizing)  🟢 live (INTEL-1 P4, shipped 2026-07-02)
| Field | Value |
|---|---|
| **Reader** | `attendanceAdjustment(profile, event)` (hostIntel.js) consumed in `FoodPlan` (App.js): sizes `playbookFoodPlan`/`attendanceBand` for the adjusted count |
| **Source + domains** | Host Intelligence · `attendance` |
| **Min confidence** | Medium (via the domain's `applicable`) |
| **Min stability** | Medium — High conf + Low stability ⇒ NOT applied (keep asking, INTEL-1 §5c) |
| **Max adjustment** | **±25%** off the planned count (`ATTENDANCE_CLAMP`); `clampHit` records which bound bound |
| **Fallback** | planned `guestCount` / L2 band, byte-identical — when absent/low/unstable/reverted, `applied:false` ⇒ `sizingEvent === event` |
| **Because** | "Based on your last events, {fewer/more} people usually came than planned — size for {suggested}?" — rendered ONLY when applied |
| **Override** | one-tap **"Keep {planned}"** ⇒ sets `event.intelAttendanceReverted` (per-event); restores default sizing. Host can also clear the domain in Settings (P3) |
| **Analytics** | `intel_attendance_applied` (trackOnce/event) · `intel_attendance_reverted` (on revert) — payload `{delta%, planned, suggested, n, confidence, stability, clamped}` |

*Scope note: R1 adjusts the **attendance count** only. It naturally flows into food/capacity sizing (more/fewer people ⇒ more/less food) — that is NOT R2 food personalization (per-item consumption ratios), which stays store-only.*

### R2 · Food per-item sizing → quantities  ⚪ proposed (INTEL-1 P4, second)
| Field | Value |
|---|---|
| **Reader** | `playbookFoodPlan` per-item qty (index.js); item identity via the Effective Item seam (`eff.displayName`/`rawCategory`, FOOD-2C) |
| **Source + domains** | Host Intelligence · `food.items[itemId]` |
| **Min confidence** | Medium (per item) |
| **Min stability** | Medium |
| **Max adjustment** | ±30% off the per-guest playbook quantity |
| **Fallback** | playbook per-guest quantity, unchanged |
| **Because** | "Last {n} {type}s you had {leftover} left over — planning {new} instead of {old}." |
| **Override** | the existing per-item qty stepper (host sets any amount) |
| **Analytics** | `intel_food_qty_applied` / `_reverted` (itemId, Δ) |

### R3 · Weather → ice (day-of / "To arrange")  ⚪ proposed (INTEL-1 P4, third)
| Field | Value |
|---|---|
| **Reader** | the ice line in the day-of / To-arrange supply list |
| **Source + domains** | Host Intelligence · `weather` (outdoor ice delta) — *later cross-checked with Context Intelligence season/climate* |
| **Min confidence** | Medium; **only for outdoor/at-home** events (`isAtHome`) |
| **Min stability** | Medium |
| **Max adjustment** | +50% ice cap |
| **Fallback** | playbook ice quantity, unchanged |
| **Because** | "Your outdoor events need ~{Δ}% more ice — planning {qty}." |
| **Override** | the item's qty control |
| **Analytics** | `intel_ice_applied` / `_reverted` |

### Context Intelligence readers
Context (L3) reshapes the **first** event and registers here on the SAME contract (min-confidence = strength of the region+type match; stability = N/A for context, mark `—`; because required). Entries land when [Context Intelligence](./CONTEXT_INTELLIGENCE.md) is specced. **Precedence:** where a reader has both, **Context sets the default; Host memory overrides it** only at Confidence ≥ Medium AND Stability ≥ Medium — and the because names both ("crab feasts usually plan 2 lb Old Bay/10; *you* run lighter → 1.5").

### Explicitly NOT reading forward yet (store-only)
`budget` · `cooking` (timing auto-shift) · `shopping` (store defaults) · `equipment` (auto-drop from arrange) — these **accrue observations now** but drive nothing until they earn their own registry entry, each through P4-style review.

---

## 3. Governance — adding a reader

1. Fill the nine-field entry (§1) in a PR that adds the reader.
2. The reader reads memory **only** through `hostIntel(profile).<domain>` / the Context helper — never ad-hoc.
3. It must **honest-empty**: gate unmet ⇒ the declared L2 fallback, byte-identical to today.
4. It must render its **because** and expose the **override**.
5. It must emit the declared **analytics** so the value is measurable (Intelligence-debt gate, OS §0).
6. Flip status ⚪→🟡 on approval, 🟡→🟢 when live + verified.

**One reader, one row.** If two surfaces read the same domain, they are two entries (they may clamp/explain differently). The registry is the exhaustive list of everywhere intelligence touches the plan.
