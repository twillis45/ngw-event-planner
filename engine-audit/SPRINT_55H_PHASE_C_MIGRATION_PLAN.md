# Sprint 55H — Phase C Migration Plan: Collapse the Two Next-Action Authorities

*Migration plan only. No implementation. The goal of an eventual Phase C is **one** next-action authority instead of two-plus-a-shadow — but only after the agreement data justifies it. This document says how to get the data and how to merge safely; it does not merge.*

---

## The three things that compute "what's next"

| System | File | Role | Output | Rendered where |
|---|---|---|---|---|
| `selectEventNextAction` / `_selectEventNextActionInner` | `CommandCenter.jsx:1063/1113` | **Reactive cascade** (now decision-first, post-55G) | `{level, category, title, consequence, primaryCta, primaryRoute}` | Command Center NBA, Client Event next action, and (via the studio delegate) the Home Spine |
| `selectStudioCommand` | `CommandCenter.jsx:802` | **Cross-event router** over the attention stream + per-event delegate | same shape | Home Spine, dashboard command |
| `eventSolve.binding` | `lib/eventSolve.mjs` (via `eventSolveAdapter`) | **Proactive backward-solve** (dependency graph) | `{binding{name,owner}, daysOut, family, flag, dateAtRisk, delivery, readiness, criticalChain}` | A per-event "next milestone" **row label** (`App.js:2093, 15135, 16678`) — **parallel to the spine** |
| `EngineNextStep` (shadow) | `components/EngineNextStep.jsx` | **Comparator** | logs `{engineBinding, spine, agree, flag, dateAtRisk, daysOut, family}` → `localStorage['ngw_engine_shadow_v1']` | Nothing user-facing; gated behind `?enginePreview=1` |

**The duplication:** the cascade (spine) and the solve binding (row label) are two live authorities that can name different next-steps for the same event. `selectStudioCommand` is *not* a third authority — it routes the cascade. The shadow exists precisely to measure cascade-vs-solve agreement before merging.

---

## 1. Agreement rate — **unknown; must be measured first**

**Honest status:** there is **no usable agreement dataset today.** The shadow logs only when a user loads with `?enginePreview=1` (`EngineNextStep.jsx:59`), which is effectively never in normal use, so `ngw_engine_shadow_v1` is empty/sparse in production. Any "agreement rate" quoted now would be fabricated.

**Worse, the existing metric is weak:** `agree` is *loose keyword overlap* — "does any >3-char word of the solve binding name appear in the spine title?" (`EngineNextStep.jsx:17`). That over-counts agreement (incidental word matches) and can't tell "same action" from "same noun." **Before any merge decision, replace this with a structured comparison** (same category? same target event/tab? same owner? same due window?).

**Plan to obtain the rate (step 1 of the migration):** enable shadow collection for a bounded sample of real sessions (a sampling flag, not the manual `?enginePreview=1`), with the structured metric, for N sessions across all event types — *measurement only, nothing user-facing changes.*

---

## 2. Disagreement categories (expected, from first principles)

Until measured, these are the categories to *expect* and bucket the collected data into:

1. **Reactive-now vs proactive-soon.** Cascade surfaces an open blocker (overdue decision, vendor issue); solve surfaces the next *milestone* by lead-time. Both valid; different actions. (Likely the largest bucket.)
2. **Decision-gate vs milestone (new since 55G).** The cascade can now say "Confirm final guest count" (Pattern 001); the solve binding models milestones, not the decision gate — guaranteed divergence the old shadow never saw.
3. **Window vs lead-time timing.** Cascade purchase/decision tiers fire on a ±2-day buy window; solve fires on graph lead-time — they pick different "next" at different horizons.
4. **Granularity.** Solve binding is a milestone ("Lock the menu"); cascade can be a concrete action ("Buy protein"/"Confirm count") — overlapping intent, different text.
5. **True conflict.** Both claim to be *the* top priority but point at contradictory work. **This is the only bucket that blocks a merge** — the others are reconcilable by ordering.

---

## 3. Production risk

| Risk | Level | Why |
|---|---|---|
| Surfaced next-step changes app-wide | **High** | Merging authorities can change the Home Spine / row label for many events at once — the single most visible string in the product. |
| Re-introducing a hydration/trust regression | Med | The spine already had a red→steel flash (Pattern 003); a new compute path must preserve `eventsHydrated` gating. |
| Losing the 55G decision-first ordering | Med | A merge must keep decisions outranking the solve binding, or it regresses the just-shipped win. |
| Row-label vs spine contradiction persists | Med | If only one consumer is migrated, the two can still disagree — must migrate both the spine path and the row-label path together. |
| Performance | Low | Solve already runs per event for the row label; folding it into the cascade adds no new heavy compute. |

---

## 4. Flag strategy

- **`ngw_nextaction_authority` = `cascade` (default) | `shadow-collect` | `merged`.**
  - `cascade`: today's behavior, untouched.
  - `shadow-collect`: cascade still authoritative; solve runs and logs the structured comparison for a sampled set (step 1). **No user-facing change.**
  - `merged`: the solve `flag`/`dateAtRisk`/`criticalChain` enter the cascade as the **Tier 1 "critical solve issue"** candidate (per the 55F ladder), the binding becomes a ranked candidate, the row label reads from the same authority, and `EngineNextStep` + `?enginePreview` are retired.
- Roll `merged` **per-event-family** (start with the 5 host playbooks, where behavior is best understood), behind the flag, with the shadow still collecting so any new divergence is caught.

---

## 5. Migration sequence (staged; each independently reversible)

1. **Instrument.** Replace loose-keyword `agree` with a structured comparator; add the sampling flag so the shadow collects on real sessions without `?enginePreview=1`. *(Measurement only.)*
2. **Measure.** Collect across all event types until the agreement base-rate and the disagreement-bucket distribution are stable. Define the **merge rule** from the data (how each bucket resolves: e.g. "reactive blocker always outranks proactive binding; decision-gate outranks both").
3. **Define the unified ladder.** Confirm the 55F canonical ladder (1 solve → 2 blocking decision → 3 vendor → 4 readiness → 5 op-decision → 6 purchase → 7 execution → 8 contingency) absorbs the solve `flag` as Tier 1 without displacing the 55G decision tier.
4. **Merge behind `merged`, per family.** Fold solve into the cascade; point the row label at the same authority; keep `eventsHydrated` gating (Pattern 003). Shadow keeps watching.
5. **Verify parity, then retire.** When `merged` matches or beats `cascade` on agreement + shows no Tier-5 (true-conflict) regressions across families, make `merged` the default, delete `EngineNextStep.jsx`, the `?enginePreview` path, and the `ngw_engine_shadow_v1` log.

---

## Recommendation

**PARK Phase C until the data exists.** It is the highest-risk item in the 55F design (it changes the most-visible string app-wide) and its core justification — the agreement rate — is currently **unmeasured**, with a **weak existing metric**. The correct next action is *not* a merge; it is **step 1 (instrument + sample-collect with a structured metric)**, which is low-risk and user-invisible. Do Phase B first (high value, low risk); let the shadow gather real agreement data in parallel; only schedule the merge once the numbers and merge rules are in hand.

*Plan only — nothing implemented or changed.*
