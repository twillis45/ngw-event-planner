# Sprint 58D — Outcome Capture v1 (audit + design)

*Design only (the deliverables are inventories/matrices/analysis/roadmap — no build scope). Completes the learning triple `Decision → Reason → Outcome`. The governing insight: **derive what's already observable; capture only the few signals that aren't.** Every claim traced to runtime. Date: 2026-06-18.*

## Core question
*Can NGW tell whether a decision produced a good outcome?* Today: **no** — `decisionMemory[]` (58C) holds Decision + Reason but no Outcome. The smallest architecture closes that gap **without a new engine, workflow, or table** — because much of the outcome signal already lives in the event.

---

## Deliverable 1 · Outcome Inventory (ranked by value)
| Decision type | Outcome realistically observable later? | Value |
|---|---|---|
| **Vendor selection** | execution quality / reliability (on-time, no-show, great/poor) | **Highest** (feeds the Vendor Bank moat) |
| **Budget reallocation** | budget variance — **already in data** (`actual` vs `budgeted`) | High (calibrates estimates) |
| **Timeline / decision override** | did the deferred item land — **observable** (`done` by `snoozedUntil`) | Med |
| **Guest count lock** | final vs actual attendance | Med-low (no `attended` field today) |
| **Venue selection** | venue performance (parking/power/load-in) — deferred decision; no signal | Low (Venue parked) |
| **Staffing** | did crew show / confirm — partially observable (`crew.status`) | Low |

## Deliverable 2 · Outcome Signal Matrix (small, structured, no narrative)
| Decision | Signals (tiny enum) | Source |
|---|---|---|
| **Vendor selection** | `on_time · late · no_show · replaced · great · acceptable · poor` | **CAPTURE** (1-tap at vendor-done / event-done) |
| **Budget reallocation** | `within · exceeded · underspent` | **DERIVE** (`actual` vs `budgeted`) |
| **Timeline override** | `held · slipped · missed` | **DERIVE** (`done` + date vs `snoozedUntil`/event date) |
| **Event (overall)** | `great · ok · rough` | **CAPTURE** (1-tap at event completion) |
| **Guest count** | `accurate · over · under` | DERIVE *if* an `attended`/actual field is added (missing today) |
Rule: **one tap, one enum, never a survey/essay.**

## Deliverable 3 · Capture-Point Audit (reuse existing moments — no new workflow)
| Moment (exists in runtime) | Signal captured |
|---|---|
| **Event completion** — `isPast` (date passed) / `archived` (App.js:31242) / the **Post-Event** section (App.js:7263) | overall event outcome (1-tap) |
| **Vendor marked done/complete** — vendor status / the vendor cockpit | per-vendor outcome (1-tap) |
| **Budget finalized** — already continuous (`actual` entered against `budgeted`) | budget variance (**auto, no tap**) |
| **Timeline closed** — task `done`/overdue already tracked | timeline slip (**auto, no tap**) |
**Best single new touch:** a tiny "How did it go?" strip in the **Post-Event** moment for a passed event — overall + a one-tap per confirmed vendor. Everything else **derives**.

## Deliverable 4 · Outcome Model Recommendation (the architecture)
**Two complementary, no-new-table additions on the event blob:**
1. **Enrich `decisionMemory` records** with an `outcome` field — co-locates the full triple on the very record that learning will read:
```
decisionMemory[i].outcome = { status: 'great'|'late'|'within'|…, source: 'derived'|'captured', at: ISO }
```
   - **Derived** outcomes (budget/timeline) are computed by a pure reader from existing fields and written onto the matching record at completion — **no user action**.
   - **Captured** outcomes (vendor execution) come from the 1-tap.
2. **A small `event.outcomes` rollup** for event-level facts not tied to one decision:
```
event.outcomes = { overall: 'great'|'ok'|'rough', budgetVariance: number, capturedAt: ISO }
```
**Why this shape:** it rides the existing `setEvent → save → events.data (JSONB)` path (like 58C), keeps the triple together for the **Learning Loop**, and is trivially aggregatable for **Event Memory** and **Vendor Intelligence** (filter `decisionMemory` by `decisionType='vendor_selection'` + `outcome` across events). Reuse `pi.memory`. **No new engine, no migration.**

## Deliverable 5 · Learning Potential Analysis (ranked)
| Decision | Reason → Outcome pairing | Future recommendation impact |
|---|---|---|
| **Vendor** | "fast response" → "ran late / no-show" | **HIGH** — directly demotes a vendor in future picks; the moat |
| **Budget** | "cut catering" → "exceeded budget" | **MEDIUM** — calibrates this studio's estimates |
| **Timeline override** | "defer seating" → "missed" | **MEDIUM** — flags risky deferrals |
| **Overall event** | (context) → "rough" | LOW-MED — coarse, but a strong negative signal |
| **Override (one-offs)** | varies | LOW — rarely repeats |
The **vendor reason↔outcome pair is the single highest-leverage learning signal in the product** — it's exactly what turns the Vendor Bank's manual `rating` into earned, private reliability.

## Deliverable 6 · Vendor Intelligence v1 — prerequisites (DO NOT BUILD)
Required before a Vendor Intelligence v1 is honest:
1. **Stable vendor identity across events** — link the event vendor to a **Vendor Bank** record id (today they're separate; `vendorSpecialtiesFromHistory(v, events)` already wants this).
2. **Per-event vendor outcome** — exactly what 58D captures (`vendor_selection` outcome).
3. **The decision rationale** — 58C (so "why chosen" can be weighed against "how it went").
4. **N events of outcomes** — a few completed events per vendor before a score means anything (honest-scoring discipline already in the Vendor Bank: empty fields omitted).
The Vendor Bank's `eventsCompleted · onTimeRate · incidentCount · plannerRehireCount` (App.js:12117) are the **write targets** — Vendor Intelligence is the **write-back loop** that fills them from captured outcomes.

## Deliverable 7 · Event Memory — prerequisites (ranked roll-in)
What outcome data should eventually roll into Event Memory, by value:
1. **Vendor performance** (per-event outcomes → reliability) — top.
2. **Budget variance** (`actual` vs `budgeted`, already observable) — estimate calibration.
3. **Decision outcomes** (the enriched `decisionMemory`) — pattern learning.
4. **Timeline success** (slip rate, observable) — planning realism.
5. **Attendance** — *blocked*: needs a new `attended`/actual field (missing today).
6. **Lessons** (optional free-text, one line) — lowest structure, highest variance.

## Deliverable 8 · Moat Analysis — Decision Memory + Outcome Capture
**What becomes possible:** the **first complete learning loop** — `decision → reason → outcome` on one record. From it: per-studio vendor reliability earned from real outcomes (not manual ratings), estimate calibration from budget variance, and the raw material for "you picked them for fast response, but they ran late twice." This is the **first signal in the product that compounds with volume** — the moat's first turn.
**What remains missing:** (a) **aggregation across events** (Event Memory — this loop produces per-event records; nothing yet rolls them up), and (b) **expression back into recommendations** (Learning Loop — nothing yet reads outcomes to change a future suggestion). Outcome Capture fills the *data*; those two are the *use*.

## Deliverable 9 · Roadmap (EXECUTE / TEST / PARK / KILL)
| Capability | Verdict | Why |
|---|---|---|
| **Outcome Capture** | **EXECUTE (next)** | small: derive budget/timeline + 1-tap vendor/overall; enrich `decisionMemory` + `event.outcomes`; no new engine/table — completes the loop |
| **Event Memory** | **TEST → EXECUTE** | the aggregation layer; build once outcomes exist to roll up |
| **Vendor Intelligence** | **PARK (data-gated)** | needs vendor-identity linkage + N events of captured outcomes first (Deliverable 6) |
| **Knowledge Capture** | **FOLD into Outcome Capture** | "lessons" = one optional one-line signal at completion, not a separate system |
| **Learning Loop** | **PARK** | the expression layer; needs Event Memory first — don't express what isn't yet aggregated |

## Deliverable 10 · Final Recommendation
**EXECUTE Outcome Capture v1 as the immediate next build (58E), scoped to the minimum that closes the loop:**
1. A pure **outcome reader** that *derives* budget-variance (`actual` vs `budgeted`) and timeline-slip (`done`/`snoozedUntil`) and stamps them onto the matching `decisionMemory` records at completion — **zero user effort.**
2. A **1-tap capture** at the existing **Post-Event / completion** moment: overall event (`great/ok/rough`) + per confirmed vendor (`on_time/late/no_show/great/poor`) — written as `decisionMemory[i].outcome` and `event.outcomes`.
3. Reuse `pi.memory`, the `setEvent` save path, and the 58C lib (extend it). No new engine, workflow, or table.
**Then** TEST Event Memory (aggregate), and only after N events, build Vendor Intelligence.

## Success condition — what the design achieves
After Outcome Capture v1, NGW will know, on one record: **what decision was made · why · and what happened afterward** — most of it *derived* for free, the rest captured in a tap. That is not memory and not learning; it is the **first complete learning loop**, the substrate both depend on.

*Confidence: High — grounded in observable signals (`budget[].actual`/`budgeted` CommandCenter:315, `archived`/`isPast` App.js:31242, `crew.status`, `snoozedUntil`, the Post-Event section App.js:7263) and the 58C `decisionMemory` schema. Weakest point: **attendance** has no actual-count field, so guest-count outcomes are deferred until one is added; and vendor↔Vendor-Bank identity linkage is the real prerequisite for Vendor Intelligence, not Outcome Capture itself.*
