# Sprint 60C — Planning Alignment Audit (Event Identity → existing surfaces)

**Branch:** `sprint-60c-planning-alignment`
**Flag:** `pi.identity` (existing; default per Host Activation — degrades to today's behavior)
**Date:** 2026-06-18
**Premise:** 60B made Event Identity a *reader*. 60C asks: **where should the identity it
reads quietly inform existing recommendations / decisions / vendor / memory surfaces** —
*expression before expansion.* No Human-Intelligence / Stakeholder / Outcome engine. The
fields are already captured (`meaning_why · honoree · honoree_story · must_have_moment ·
feeling_words`); this audit decides where they earn a **whisper**, never a computation.

---

## Governing principle
**Identity changes EMPHASIS and EXPLANATION — never the MATH or the SET.**
Test for every candidate: does the whisper change *what is foregrounded / why*
(expression → allowed) or *what is true — a number, deadline, score, or the set of
recommendations* (expansion → forbidden)? Identity rides the **`renderAction` persona
seam** (Pattern 011) and the existing **`becauseLayer`** — it annotates engine outputs,
it never becomes an engine input. No new engine/store/schema/workflow holds by construction.

## The whisper map

| Surface | Field(s) | Whisper | Verdict |
|---|---|---|---|
| **Outcomes / Memory** (`OutcomeCapture`) | `must_have_moment` (done) · `feeling_words` · `meaning_why` | Extend post-event reflection: "Did guests feel *[feeling]*?" + frame recap around *why it mattered*. **No mapping needed.** | **EXECUTE #1** |
| **Next-action / Spine** | `must_have_moment` | Add an identity **factor to the existing `becauseLayer`**: on the action serving the must-have, "→ this protects [the must-have]." Never reorders the decision-first ladder. | **EXECUTE #2** |
| **Vendor planning** | `must_have_moment` | Highlight the *one* vendor that delivers the must-have. Adds/removes nothing. | **EXECUTE #3** |
| **Event Day Schedule** (already reads identity) | `must_have_moment` | Pin the must-have as a can't-silently-delete day-of cue. | **EXECUTE #4** |
| **Budget** | `must_have_moment` | "Protect this line — it's your must-have" flag on the tied category. **Numbers unchanged** (EK-1). | **TEST** |
| **Readiness / Decision Confidence** | `must_have_moment` | A 5th *informational* line — "moment protected/unprotected" — inform-without-escalating (Pattern 010). **Never a score.** | **TEST** |
| **Venue Intelligence (56C)** | `feeling_words` | "Does this venue suit a *[feeling]* event?" — adequacy is confirm-not-assert (POS-P009-R1); edges into taste. | **PARK** (56C unshipped) |
| **Experience Intelligence** | `feeling_words` | "Intimate" → comfort-craft emphasis. Both pre-build. | **PARK** (dependency noted) |
| Confidence/readiness **math** · vendor/venue **selection** · ladder **reorder** | any | — | **KILL** (fabricates data / expansion / engine owns reality) |

## Biggest risk
**Emphasis creeping into computation** — a "protect" flag that de-prioritizes a real
deadline, or a readiness whisper that escalates (faking data; AP-005). **Guardrail:**
identity outputs are *annotations on engine outputs only*; they are **forbidden from
entering** `_selectEventNextActionInner`, `getEventReadiness`, `decisionConfidence`.

## Hidden cost
`must_have_moment` is **free text.** Every EXECUTE except Outcomes needs a fuzzy
`must-have → task/vendor/cue/category` match that *will* be wrong sometimes. So:
- **#1 Outcomes needs zero mapping** (reflects fields back) → highest ROI, no false-link risk.
- #2–#4 **degrade gracefully**: no confident match ⇒ today's behavior (show the must-have
  prominently, as 60B already does). A confidence-tiered `mustHaveLink → {target,
  confidence} | null` gates every linked whisper.

## Smallest implementation
Two pure helpers in `eventIdentity.js` (no engine touch; behind `pi.identity`):
- `identityReflection(event)` → feeling/why recap for Outcomes (#1).
- `mustHaveLink(event, candidates)` → confidence-tiered matcher; `null` when unsure (gates #2–#4).
**First slice = #1 (Outcomes) + #2 (identity factor in `becauseLayer`, confident link only).**
Instrument: does the must-have get marked "happened" more often post-event (the 60B loop)?

## Verdict
Identity earns a whisper in **four** existing surfaces (Outcomes, Spine, Vendors, Event
Day) — all annotation, all on the existing seam, **zero new engine**. A cautious whisper in
two (Budget, Readiness) as TEST under inform-without-escalating. **Forbidden** from
venue/experience selection and from any score/quantity/deadline. 60C ships as *the same
reader reaching four more surfaces*, not a new engine.
