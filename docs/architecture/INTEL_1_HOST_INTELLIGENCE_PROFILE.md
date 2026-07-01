# INTEL-1 — Host Intelligence Profile + Reality Reconciliation (Build-Plan Spec)

**Status:** Spec — design only, do NOT build yet. Roadmap #3+#4 of the [Intelligence OS](./INTELLIGENCE_OPERATING_SYSTEM.md) (Level 4 — Memory).
**Owner:** Todd. **Drafted:** 2026-07-02.
**Grounded in:** `attendanceBand` / `guestCountResolved` / `sizingGuests` (index.js), `playbookFoodPlan` (per-item qty), `PostEventRecap` (App.js ~21121, the existing post-event surface), the Effective Item seam (FOOD-2A/B/C), `event.budget`/`totalBudget`, `event.foodQty`/`foodLocked`/`foodGot`, `event.startTime`/`ros`/`rosDone`.

> **The pair:** the **Host Intelligence Profile** is the *store* of learned operational behavior; **Reality Reconciliation** is the *loop* that fills it. Neither is "AI" — it is accumulated, reconciled fact, which is far more trustworthy. Structure ships now (empty); it compounds only as real events close.

---

## 0. Principles (non-negotiable)

1. **Grounded** — every stored number comes from a *reconciled* estimate-vs-reality observation the host confirmed. Never a fabricated multiplier.
2. **Backward-compatible** — a new **optional** store; absent ⇒ today's behavior exactly. No existing field changes meaning.
3. **Honest-empty when thin** — with <3 observations in a domain, the profile is **noted, not applied**. The plan keeps using the grounded L2 playbook defaults. Confidence is shown, never hidden.
4. **Memory before prediction** — this is L4. It stores and adjusts from *observed* deltas only. No forecasts, no risk scores (that's L5, later).
5. **Suggestion before silent override** — a learned adjustment is surfaced *with its reason and confidence* and (at first) requires one host confirmation; it never silently changes a number the host didn't see.

---

## 1. Where it lives (data model)

The profile is **per-host / per-household**, NOT per-event — it accumulates across events. It lives on the **profile/studio** record (the event-independent home), synced with the host's own account like other host data.

```
profile.hostIntelligence = {
  version: 1,
  eventsObserved: 0,            // count of reconciled events (the master confidence signal)
  domains: {
    attendance:  { … },        // §2a
    food:        { items: {…} },// §2b  (keyed by canonical item id)
    budget:      { … },        // §2c
    cooking:     { … },        // §2d
    guests:      { … },        // §2e
    weather:     { … },        // §2f
    shopping:    { stores: […] },// §2g
    equipment:   { owns: […], borrows: […] }, // §2h
  }
}
```

Absent `profile.hostIntelligence` ⇒ honest-empty everywhere. A tiny reader `hostIntel(profile)` returns a safe empty shape so no consumer needs a guard.

---

## 2. The profile data shape (per domain)

Each numeric domain stores **observations** (not just a single number) so confidence and recency can be computed, and so a bad night can't poison the profile.

```
Observation = { eventId, date, estimate, actual, delta, ratio }   // ratio = actual / estimate
Rollup      = { ratio, confidence, stability, n, lastN: [Observation…] }  // per-domain (§5); confidence + stability both computed; n capped (~8)
```

### 2a. Attendance — `domains.attendance`
- **Estimate:** `attendanceBand(event).planned` (or locked `guestCount`).
- **Actual:** host-entered "how many actually came" at close.
- **Stored:** `ratio` (e.g. 36/42 = 0.86 → **−14%**), rolled up with confidence.
- **Reads forward:** a gentle band adjustment (§7).

### 2b. Food — `domains.food.items[itemId]`
Per **canonical item** (keyed off the Effective Item's stable id, so "brisket" reconciles across events):
- **Estimate:** the planned quantity from `playbookFoodPlan` (`i.qty`/derived per-guest × guests).
- **Actual consumed:** `estimate − leftover` (host enters leftover, or "ran out" ⇒ actual ≥ estimate).
- **Stored:** per-guest consumption ratio + a **recommendation** ("18 lb → 16 lb next time").
- Uses `eff.displayName` (short-first) for the label, `eff.rawCategory` for grouping — the FOOD-2C fields, so the profile and the shopping list speak the same item language.

### 2c. Budget — `domains.budget`
- **Estimate:** the plan roll-up (`PlanBudgetRollup` sum: food + supplies) or `totalBudget`.
- **Actual:** `event.budget` actuals + `foodLocked` totals.
- **Stored:** **budget drift** ratio (e.g. $1,030/$850 = +21%).

### 2d. Cooking / timing — `domains.cooking`
- **Estimate:** planned prep-start from the ROS anchor (`parseRosStartMin` / first prep cue).
- **Actual:** when the host actually marked the first prep cue done (`rosDone` timestamps) OR a close-out "we started ~45 min late".
- **Stored:** typical start drift (minutes) → "auto-shift prep".

### 2e. Guests composition — `domains.guests`
- **Kids ratio:** actual kids / actual adults across events (e.g. +18%) → "increase drinks".
- Derived from the reconciled headcount + a kids count at close (ties to `kidsPolicy`/`kidsCount`).

### 2f. Weather — `domains.weather`
- **Ice (and shade/water) delta:** for **outdoor / at-home** events (`isAtHome`), how much more ice than planned was needed (e.g. +40%). Cross-references the season/temperature at the event date (the Context engine's job later; here we just store the observed delta).

### 2g. Shopping — `domains.shopping.stores[]`
- **Frequently purchased at:** stores the host actually chose (from `where`/Where-to-shop taps + close-out confirmation) — Costco · Butcher · Restaurant Depot. Frequency counts, not a ranking model.

### 2h. Equipment — `domains.equipment`
- **Owns / borrows:** items the host marked "have these" repeatedly in "To arrange" (`capacityOwned`) → learned inventory ("owns coolers/tables/canopies; borrows chairs"). Reduces the arrange list next time.

---

## 3. Reality Reconciliation — the capture loop

The loop, run **once at event close**:

```
Estimate (already in the system)  →  Reality (host confirms/enters)  →  Delta  →  Store on the profile (forever)
```

**Surface:** extend the existing **`PostEventRecap`** (App.js ~21121) — the post-event screen the host already sees. Add a short, skippable **"How'd it go?"** reconciliation card. It is *low-friction*: pre-fills the estimate, asks only for the few realities the system can't know, one tap to confirm.

**What it asks (only the unknowns):**
| Domain | Pre-filled estimate | Host enters |
|---|---|---|
| Attendance | planned N | actual came (stepper, defaults to confirmed-yes count) |
| Food | top 3–5 priced items | leftover per item: "none / some / lots" (3-way), or a number |
| Budget | plan total | actual spent (or "about right / over / under") |
| Timing | planned start | "on time / ~30 late / ~60 late" |
| Weather (outdoor) | — | "enough ice? / needed more" |

**Honesty:** everything is skippable; an unanswered domain stores **no** observation (never a guessed one). Answering writes one `Observation` per domain to the profile and increments `eventsObserved`.

**Single-source & idempotent:** reconciliation writes only to `profile.hostIntelligence`; re-opening the recap edits the same event's observation (keyed by `eventId`), never double-counts. Mirrors the `rosDone` single-source discipline.

---

## 4. Estimate → reality deltas (the math)

- **ratio = actual / estimate** (guard estimate>0; else store nothing).
- Rollup **ratio = recency-weighted mean** of the last ~8 observations (recent events weigh more; a one-off outlier can't dominate).
- Food recommendation = `round(plannedPerGuest × rollupRatio × nextGuests)`, surfaced as "recommend 16 lb" with the **because** ("you had ~3 lb left last 2 times").
- Deltas are **stored raw** (estimate, actual) so the rollup math can change later without losing the source — reconciliation stores facts, not conclusions.

---

## 5. Confidence AND stability — two independent, per-domain gates

Confidence alone is not enough — a household can be *confidently* unpredictable. Two orthogonal signals, **computed per domain (each matures independently)**, together decide whether memory may drive a decision.

### 5a. Confidence — "do we have enough observations?" (per domain)
Every domain carries its **own** confidence; they do not move together. Attendance can be **High** while Ice is **Low** and Budget is **None** — and each behaves accordingly (attendance adjusts, ice doesn't, budget uses defaults, cooking-pace adjusts). Confidence is a function of observation count (and recency):

| n (observations, this domain) | Confidence | Behavior |
|---|---|---|
| 0 | **None** | invisible; L2 playbook default only |
| 1–2 | **Low** | noted, not applied — "we're starting to learn this," never changes a number |
| 3–4 | **Medium** | suggested — opt-in adjustment with its because |
| 5+ | **High** | default-applied (with the because + one-tap revert) |

Confidence **decays** if a domain's observations are stale (>~18 months) — old patterns shouldn't silently drive a changed household.

### 5b. Stability — "are the observations consistent?" (per domain)
Confidence measures *how many*; **stability** measures *how consistent*. Attendance ratios `80% · 125% · 72% · 118%` average to 99% (**High confidence**) but the household is **unstable** — the mean is meaningless. Stability = the spread (e.g. coefficient of variation) of the last-N ratios in that domain.

| Spread of last-N ratios | Stability |
|---|---|
| tight (low variance) | **High** — a real, repeatable pattern |
| moderate | **Medium** |
| wide (bounces around) | **Low** — keep asking, don't automate |

### 5c. The combined gate
A domain may **auto-apply** only at **Confidence ≥ Medium AND Stability ≥ Medium**. Otherwise:
- **High confidence + Low stability ⇒ keep asking** ("your attendance varies a lot — we'll ask rather than assume").
- **Low confidence ⇒ noted only.**

A **stable** household earns automation; an **unstable** one keeps getting asked. That distinction — automate the predictable, keep asking the volatile — is a major trust feature and is honest about when memory has *earned* the right to decide.

### 5d. Explainability (provenance) — every learned number shows its work
No memory-driven change may appear without its **because** — the observations behind it. This is the single biggest trust feature in the platform. Never *"We adjusted your food quantities."* Always:

> **We planned 16 lb of burgers** (was 18) because:
> • your last 5 cookouts averaged **84% attendance**
> • guests typically ate **~1.4 burgers/person**
> Confidence: High · Stability: High · **[Revert]**

The because is generated from the **same** observations the rollup used (domain + last-N + ratio), so it can never disagree with the number it explains. Every reader in the [readers registry](./INTELLIGENCE_READERS_REGISTRY.md) MUST supply a because template + declare its min-confidence and min-stability.

---

## 6. Privacy guardrails

1. **The host's own data only.** The profile is built solely from the host's own events. It is **never** cross-host aggregated here — that's the separate grounded *corpus*, a different system with its own consent. No other host's data enters this profile.
2. **No guest PII.** The profile stores *operational* patterns (ratios, counts, store names, equipment) — never guest names, addresses, or per-guest data. Kids ratio is an aggregate number, not a roster.
3. **Opt-in + visible + deletable.** The profile is inspectable in one place ("What Event Boss has learned"), each learned fact editable/removable, and the whole thing clearable. Turning it off ⇒ reverts to L2 defaults, honestly.
4. **Local-first, host-scoped sync.** Stored like other host data (their account), not a shared table. `mailingAddress`/PII from RSVP (P3) never flows into intelligence.
5. **No dark inference.** We only store what the host reconciled — never silently mined behavior. The reconciliation card is explicit.

---

## 7. First engines allowed to read it forward (conservative)

Start with the **three** highest-signal, lowest-risk readers; everything else waits. Each reads through a single helper `hostIntel(profile).<domain>`, **must be registered in the [Intelligence Readers Registry](./INTELLIGENCE_READERS_REGISTRY.md) before it may consume memory**, and applies **only at Confidence ≥ Medium AND Stability ≥ Medium (§5c)** — always with the because (§5d) + a revert.

1. **Attendance band** (`attendanceBand` / `sizingGuests`) — apply the attendance ratio to the plan-to number: *"You usually see ~14% fewer than planned — size food for 36?"* This is the highest-leverage read (it moves food/seating/budget downstream). **First.**
2. **Food per-item sizing** (`playbookFoodPlan`) — apply per-item consumption ratios to quantities: *"Last 2 crab feasts you had leftover Old Bay — plan 1½ instead of 2."* Uses the FOOD-2C `displayName`/`rawCategory` so it lands cleanly on the Effective Item seam.
3. **Weather → ice** (the "To arrange" / day-of ice line) — apply the outdoor ice delta: *"Your outdoor events need ~40% more ice — planning 25 lb."*

**Explicitly NOT reading it forward yet:** budget auto-adjust, cooking auto-shift, shopping store defaults, equipment auto-drop. They store observations now (so memory accrues) but do not drive the plan until INTEL-2+, each behind the same confidence + confirmation discipline.

---

## 8. Backward-compat + honest-empty (the guarantees)

- No existing event/profile field changes shape or meaning. Only `profile.hostIntelligence` is added (optional).
- `hostIntel(profile)` returns a total-empty shape when absent ⇒ every reader no-ops to today's L2 behavior.
- With thin memory, the plan is **identical** to today. The seam only diverges once a domain hits Medium confidence AND the host confirms.
- All learned reads are **removable** and **revert to L2** — no lock-in, no silent drift.

---

## 9. Build sequence (phased — do NOT build yet)

- **P1 — Store + reader (no reads-forward).** Add `profile.hostIntelligence` shape + `hostIntel(profile)` empty-safe reader. Ships inert. Zero behavior change.
- **P2 — Reality Reconciliation capture.** The "How'd it go?" card in `PostEventRecap`; writes attendance + food-leftover + budget observations. The profile starts filling. Still no reads-forward.
- **P3 — Inline surfacing (NOT a dashboard).** Memory appears ONLY where it changes a decision — *"We remembered…"* on the burger quantity, *"Last time…"* on the ice, *"Based on…"* on arrival times — each with its because + revert (§5d). **No standalone "Host Intelligence Dashboard"** (everyone builds one; almost nobody revisits it). The only central surface is a lightweight *audit/clear* affordance in settings for the privacy guarantee (§6), reached deliberately — not a browsing view. **Memory is invisible until it's useful.**
- **P4 — First read-forward (attendance).** Behind Medium+ confidence + one-tap confirm. Then food per-item, then weather→ice — one at a time, each render- and reconciliation-verified.
- Reconciliation quality-gates the whole thing: prediction (L5) remains gated on `eventsObserved` being real (ties to activation — memory can't compound without real events).

---

## 10. What NOT to build

- **No cross-host learning here** (that's the corpus, separate consent).
- **No prediction / risk / probability** (L5, later — memory first).
- **No silent overrides** — everything learned is shown, confirmed, revertable.
- **No memory dashboard** — memory surfaces inline, only where it changes a decision (§9 P3); no browsing view.
- **No automation on unstable domains** — High confidence + Low stability keeps *asking*, never assumes (§5c).
- **No unregistered readers** — an engine may not consume memory until it's in the [Intelligence Readers Registry](./INTELLIGENCE_READERS_REGISTRY.md).
- **No guessed multipliers** — thin memory ⇒ L2 defaults, full stop.
- **No new engine forks** — reconciliation reads the SAME estimates the plan already produces (`attendanceBand`, `playbookFoodPlan`, the roll-up) and the SAME item identity the Effective Item seam owns.
- **No guest PII in intelligence** — operational patterns only.

---

## Summary — the thesis

The Host Intelligence Profile stores **reconciled operational fact** — attendance, per-item consumption, budget drift, timing, kids ratio, ice, stores, equipment — each as raw estimate-vs-reality observations with rising confidence, per household, honest-empty until real events close. Reality Reconciliation is the low-friction "how'd it go?" loop at event close that fills it. It ships inert and backward-compatible; it reads forward only at Medium+ confidence, only through three conservative first readers (attendance → food sizing → ice), always with the because and a one-tap revert. It is Level-4 **memory**, not AI — the tenth-event moat that compounds only once activation delivers real events, and the honest foundation Prediction (L5) will later be *earned* on top of.
