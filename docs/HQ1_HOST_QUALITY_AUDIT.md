# HQ-1 — Host Quality Program Audit

**Date:** 2026-07-04
**Type:** Audit only. No code changed, no redesign, no implementation.
**Scope:** All 13 Host-facing surfaces, audited as a first-time host planning a real event.
**Method:** Full source trace (file:line citations throughout) of every recommendation, data flow, and continuity path across Editorial Cover → Assemble Reveal → Host Home → Planning surfaces.

---

## Executive Summary

The Host experience is architecturally honest — every surface audited is a "pure reader" over real event state; nothing found fabricates data, and that discipline (explicit in code comments throughout: "never invents data," "single source") is a genuine, load-bearing trust asset. IS-1 proved the runtime wiring works. IS-2 confirmed the routing is sound and frozen. **What HQ-1 finds is that the Host experience is honest but uneven** — one surface (Assemble Reveal) was built to a real explainability standard (what/why/evidence/confidence/next-decision), and that standard was never propagated to the other twelve.

Three findings matter more than the rest:

1. **A real dollar-drift bug.** `playbookFoodPlan()` is called with a regional price factor (`foodPP`) at some call sites and without it (silently defaulting to no regional adjustment) at others. The exact same event's food cost can display two different dollar figures depending on which screen the host is looking at. This is not a design nitpick — it is a factual inconsistency a host could catch and lose trust over immediately.

2. **An ungated AI write.** Budget's `suggestBudget()` calls an LLM and pushes its output directly into the budget state with no host confirmation step and no visible reasoning, evidence, or confidence — the one place in the entire audit where the app writes AI-generated content into a host's plan without asking first. Its failures are also silently swallowed.

3. **`confidenceLabel` — the field F4/IS-1 built and rendered — exists nowhere else.** Every other recommendation-bearing surface (Budget's AI suggestion, Food's menu defaults, Risks, Tasks) has zero confidence signal. Reveal is not average; it is the exception. The rest of the Host experience hasn't caught up to the bar Reveal set.

None of this requires new architecture. It requires making every surface answer the same five questions Reveal already answers well.

---

## Continuity Audit

**Editorial Cover → Assemble Reveal → Host Home → Planning surfaces**

| Check | Finding |
|---|---|
| Does anything disappear? | No outright loss found, but nothing genuinely *carries forward* either — see next row. |
| Does anything contradict? | **Yes — the food-cost drift (Finding #1) is a real contradiction**, not just a risk. Different screens can show different dollar totals for the same food plan. |
| Does anything reset? | No hard resets found. |
| Does the host repeat themselves? | No — guest count, once locked, is read from one resolved source (`guestCountResolved`/`attendanceBand`) everywhere. This is a genuine strength. |
| Does Reveal hand anything to Host Home? | **No.** Assemble Reveal is purely ephemeral — it writes nothing to the event object and is never read from again. Host Home independently re-derives identity (`eventIdentity(ev)` — the *legacy* reader, not the one Reveal uses), guest count, and food plan from scratch. The two surfaces don't share a data path; they happen to agree today because they both read the same underlying event fields, not because one hands off to the other. |

**Verdict:** Continuity mostly holds by accident (shared underlying fields) rather than by design (no explicit handoff). The one place it visibly breaks is the food-cost figure.

---

## Planning Audit — Does Intelligence Actually Change the Plan?

| Recommendation type | Does it change downstream planning? | Evidence |
|---|---|---|
| Guest count → Food quantities | **Yes, confirmed live.** `eventSizing()` → `resolveQuantity()` recomputes every purchase line's quantity off the resolved guest count. | Real, working cascade — a trust win. |
| Menu/sourcing Decision → Tasks | **Yes, confirmed.** `event.foodChoices` is read directly by `taskSatisfied()`'s catering branch and `hostIsCooking()`, which gate task completion and warnings app-wide. | Real, working cascade. |
| Headcount lock (Decisions panel) → Budget | **Yes, confirmed.** Writes `guestCount`/`guestEstimate`, read by Budget's `plannedGuests` prop. | Real, working cascade. |
| Non-menu Decisions (theme, music, logistics, etc.) → anything | **Weak/unconfirmed.** These fall back to a generic `{tab: 'Planning'}` route with no specific field to act on — "we don't know exactly where to send you." | This is the largest class of Decisions and the one most likely to feel like it went nowhere. |
| Risk warnings → Timeline/Vendors/Budget | **No.** Risks (`WhatCouldGoWrongPanel`, weather contingency) are pure read-only display. There is no acknowledge/dismiss/apply-fix action anywhere — resolving a risk in the host's head never registers in the app. | Confirmed no `onPatchEvent` on any Risk-rendering call site. |
| Vendor status/cost change → Budget | **Yes, confirmed.** `onPatchVendor` writes vendor fields; Budget receives `event.vendors` directly. | Real, working cascade. |
| Budget AI suggestion → Budget | **Yes, but ungated** — writes immediately with no accept/reject step (see Finding #2). | Working, but the *wrong kind* of working. |

**Verdict:** The cascades that exist are real, not decorative — this is good news. But **Risk never closes the loop**, and **most non-food Decisions dead-end into a generic tab**, which means two entire categories of "intelligence" in this app currently qualify as the noise the mission brief warned about.

---

## Host Trust Audit

### Where hosts gain trust
- The intake preview cards ("What I'll set up for a Birthday" with a real milestone checklist) — genuinely specific, not generic, and appears *before* the event is even created.
- Guest-count-driven recompute of food quantities — visible, correct, and immediate.
- The explicit "never invents data" discipline — no surface fabricates a fact anywhere in this audit.
- Weather-driven contingency advice (`weatherLogistics`) — concrete, numeric, event-specific ("Bump ice to ~150 lbs — 98° empties drink coolers fast"). This is the single best-evidenced recommendation in the entire app.

### Where hosts lose trust
- **The food-cost drift** (Finding #1) — the same fact, two different numbers, depending on screen.
- **The ungated AI budget write** (Finding #2) — content appears in a host's budget that they never approved, with no way to know it came from an AI call at all.
- **Silent task false-completion** (`taskSatisfied`'s blunt regex matching) — a task can read "done" because of a loosely related field, with zero indication to the host that this was inferred rather than confirmed.
- **Generic, type-only risk copy** — `playbookRisks` are authored once per event *type*, not computed per event; a host planning a very ordinary version of an event type still gets the same warnings as an elaborate one, with no acknowledgment that the system doesn't actually know their specifics here (contrast with the weather risk, which does).

### Missing explanations
- Budget's AI suggestion (no why/evidence/confidence at all).
- Vendor category suggestions (why not confirmed present).
- Static risk rows (why is type-level, not event-level).

### Generic recommendations
- `playbookRisks` (static, type-authored).
- Decision board's non-menu fallback routing.
- Day-of default safety checklist (verbatim fallback text when no event-type-specific list exists).

### Overwhelming screens / duplicate information
- Guest count shown twice in Host Home (header + food card) — code comments explicitly acknowledge this exact risk without fully resolving it.
- `playbookFoodPlan()` computed independently 6+ times across the app per render pass — same inputs, mostly same outputs, except where `foodPP` is inconsistently passed (the drift bug).
- `WhatCouldGoWrongPanel` possibly double-mounted with identical general content across two Planning-adjacent call sites.
- `isDayOf`/day-of-ness computed independently in two separate places (Host Home and `RunOfShow`) — same drift risk class as the food-cost bug, not yet manifesting as a visible bug but structurally identical to one that already has.
- Day-of safety checklist and weather contingency likely overlap in content on the single highest-stress day of the event.

### Hidden work
- None found that should be visible and isn't — if anything, the opposite problem exists: Reveal's `why`/`status`/`nextDecision` fields are the *right* amount of visible work-shown, and most other surfaces under-show their reasoning by comparison.

### Dead-end workflows
- Instacart "send to store" — explicitly labeled a stub ("one-tap cart coming soon"), honest about its own limitation rather than pretending to be complete. This is a *good* dead-end (transparent) versus a *bad* one (silent).
- Non-menu Decisions routing to a generic Planning tab is the closest thing to a true dead-end found — not labeled as such, unlike Instacart.

### Premature complexity
- Budget showing two distinct "total" concepts (`totalBudgeted` vs. `projectedFinal`) in the same tab without a clear visual distinction is the clearest instance of a screen asking more of a first-time host than the moment requires.

---

## Recommendation Field Completeness — Every Surface, Scored Against What/Why/Evidence/Confidence/Next-Decision

| Surface | What | Why | Evidence | Confidence | Next-Decision |
|---|:---:|:---:|:---:|:---:|:---:|
| Assemble Reveal — Identity | ✅ | ✅ | ✅ | ✅ | ✅ (null only when not compound — correct) |
| Assemble Reveal — Blockers | ✅ | ✅ | ✅ | ✅ (always "Required") | ✅ |
| Assemble Reveal — Domains (timeline/food/shopping/guests/budget/vendors) | ✅ | ✅ | ✅ | ✅ (always "Assembled") | ❌ **Always null — no domain card ever sets a next-decision** |
| Assemble Reveal — Risk | ✅ | ✅ | ✅ | ✅ | ⚠️ Repurposed as mitigation text, not a decision prompt |
| Budget — AI suggestion | ✅ | ❌ | ⚠️ (real inputs, never shown) | ❌ | ❌ (auto-applies, no confirm step at all) |
| Timeline — heads-up nudges | ✅ | ⚠️ (label only) | ✅ | ❌ | ⚠️ (nav, not an action) |
| Food — menu/sourcing choices | ✅ | ✅ (`d.why`, when authored) | ⚠️ (static, not per-event) | ❌ | ✅ (real choice UI) |
| Shopping — bulk recommendation | ✅ | ⚠️ (engine annotation only) | ⚠️ | ❌ | ⚠️ |
| Guests — attendance band | ✅ | ✅ (`because` string) | ✅ | ❌ | ⚠️ (generic "go to Guests tab") |
| Vendors — COI next action | ✅ | ✅ (real consequence line) | ✅ | ❌ | ✅ (single CTA) |
| Tasks | ✅ | ❌ | ⚠️ (invisible regex match) | ❌ | ❌ (binary done/not-done only) |
| Decisions — menu-type | ✅ | ✅ (`because` string) | ✅ | ⚠️ (status tier substitutes) | ✅ (inline options) |
| Decisions — non-menu | ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ (generic Planning-tab fallback) |
| Risks — static playbook | ✅ | ✅ (`mitigation` labeled "The fix:") | ❌ (type-level, not event-level) | ❌ | ⚠️ (informational only, no action) |
| Risks — weather | ✅ | ✅ | ✅ (live numeric data) | ❌ | ✅ (concrete quantities) |
| Day Of — safety checklist | ✅ | ✅ (`detail` field) | ❌ (type-level default) | ❌ | ❌ (check-off only) |

**Pattern:** `Confidence` is present in exactly one place in the entire app — Assemble Reveal. Every other surface omits it entirely. `Why` and `Evidence` are inconsistently present, generally strongest where the underlying engine already had rich authored data (Food, Decisions, weather Risk) and weakest where a recommendation is AI-generated on the fly (Budget) or heuristically inferred (Tasks).

---

## Top 25 Host Issues (ranked by trust impact × reach)

1. **[Critical/Trust] Food-cost dollar drift** — `playbookFoodPlan()` called with/without `foodPP` price factor across different screens produces two different dollar totals for the same event. *(Food, Shopping, Budget, Host Home)*
2. **[Critical/Trust] Ungated AI budget write** — `suggestBudget()` pushes LLM output directly into budget state with zero confirmation, zero visible reasoning, and silent failure handling. *(Budget)*
3. **[Trust] `confidence` field absent everywhere except Assemble Reveal** — the one explainability standard the app has built is not applied consistently. *(All surfaces)*
4. **[Trust] Silent task false-completion** — `taskSatisfied()`'s regex matching can mark an unrelated task "done" with no indication to the host it was inferred, not confirmed. *(Tasks)*
5. **[Planning Quality] Risk never closes the loop** — no acknowledge/dismiss/apply-fix action exists anywhere; resolving a risk in the host's head is invisible to the app. *(Risks)*
6. **[Planning Quality] Non-menu Decisions dead-end into a generic Planning-tab route** — the largest class of Decisions has no specific downstream effect or destination. *(Decisions)*
7. **[Cognitive Load] Guest count shown twice in Host Home** — header and food card, same number, explicitly flagged in code comments as a risk without full resolution. *(Host Home)*
8. **[Cognitive Load] `playbookFoodPlan()` recomputed 6+ times per render pass across the app** — redundant, and the root cause of Finding #1. *(Food, Shopping, Budget, Host Home, Command board)*
9. **[Cognitive Load] Two distinct "budget total" concepts shown in the same tab** (`totalBudgeted` vs `projectedFinal`) without clear visual distinction. *(Budget)*
10. **[Continuity] Assemble Reveal computes real intelligence and hands none of it forward** — Host Home independently re-derives identity/guest count/food plan from scratch using a *different* identity reader than Reveal uses. *(Assemble Reveal → Host Home)*
11. **[Trust] Static, type-level risk copy** — `playbookRisks` are authored once per event type, not computed per event; no per-event evidence or confidence. *(Risks)*
12. **[Structural] `isDayOf`/day-of-ness computed independently in two places** (Host Home, `RunOfShow`) — same architecture pattern that caused Finding #1, not yet manifesting as a visible bug. *(Host Home, Day Of)*
13. **[Cognitive Load] Day-of safety checklist and weather contingency likely overlap in content** on the single highest-stress day of the event. *(Day Of, Risks)*
14. **[Trust] Budget AI suggestion has no why/evidence/confidence shown at all**, despite being the single most "AI" moment in the Host experience. *(Budget)*
15. **[Cognitive Load] `WhatCouldGoWrongPanel` possibly double-mounted with identical general content** across two Planning-adjacent call sites. *(Risks)*
16. **[Decision Support] Timeline heads-up nudges have no confidence and their "next-decision" is just navigation**, not an action. *(Timeline)*
17. **[Decision Support] Vendor category suggestions' "why" not confirmed present** in the render path. *(Vendors)*
18. **[Decision Support] Attendance-band recommendation's next step is generic** ("go to Guests tab") rather than the specific action needed. *(Guests)*
19. **[Copy] Generic empty-state and fallback strings** are fine in true empty states but occasionally read where an event name/type could have been substituted. *(Host Home, Editorial Cover)*
20. **[Transparency, positive] Instacart stub is honestly labeled** ("one-tap cart coming soon") rather than silently incomplete — noted as a model for how *other* gaps should be labeled, not a defect itself. *(Shopping)*
21. **[Consistency] `guestCountResolved()` called twice for the same fact within Host Home alone.** *(Host Home)*
22. **[Consistency] Food bought/total progress duplicated between the checklist item and the Food-plan card.** *(Host Home)*
23. **[Decision Support] Bulk-purchase shopping recommendations carry minimal why beyond engine annotation and no confidence.** *(Shopping)*
24. **[Trust] Decision-memory logging on Budget edits doesn't demonstrably propagate reasoning anywhere** — it's recorded, not acted on. *(Budget)*
25. **[Information Hierarchy] Decisions panel's "locked" facts (headcount/date/venue) intentionally duplicate the Guests-tab hero** — acknowledged by design in code comments, low risk, but adds to the same-fact-shown-twice pattern running through the whole audit. *(Decisions, Guests)*

---

## Prioritized Roadmap

### Quick Wins (<30 minutes)
- Pass `foodPP` consistently to every `playbookFoodPlan()` call site (or default all call sites to the same explicit fallback) — directly fixes Finding #1's most common trigger.
- Add a visible confirm/reject step before `suggestBudget()`'s output writes to budget state.
- Surface the existing `catch` in `suggestBudget()` as a visible error toast instead of silent failure.
- Label Budget's two totals ("Budgeted" vs. "Projected") more distinctly (e.g., separate headers, not just proximity).

### Small Wins (<1 day)
- Add a `confidenceLabel`-equivalent to Budget's AI suggestion, Food's menu defaults, and Decisions' non-menu items — reuse the exact word-based vocabulary already established in `assembleRevealEngines.js` ("High confidence" / "We think so" / "Required") rather than inventing new language.
- Consolidate the duplicate guest-count display in Host Home (header vs. food card) into one canonical location, or make clear they're intentionally the same fact shown twice.
- Memoize `playbookFoodPlan()` per event per render pass instead of recomputing at each of its 6+ call sites.

### Medium Work (<1 sprint)
- Give non-menu Decisions a real next-decision destination instead of the generic `{tab: 'Planning'}` fallback — audit which decision types actually have a specific home and wire them.
- Add a lightweight "mark handled" action to Risk rows so acknowledging a risk registers somewhere, even if it doesn't yet change the plan.
- Add a visible "why" annotation to `taskSatisfied()`'s inferred completions (e.g., "marked done because a vendor was added") so silent false-completion becomes a visible, correctable inference instead of an invisible one.
- Reconcile the two independent `isDayOf` computations (Host Home, `RunOfShow`) into one shared source before this becomes a second version of Finding #1.

### Large Work
- Build a genuine handoff between Assemble Reveal and Host Home (Reveal's computed identity/complexity/risk state persists and Host Home reads it, rather than both independently re-deriving from raw event fields with different readers).
- Extend per-event evidence into `playbookRisks` (currently static/type-level) so risk copy can reference the actual event's specifics the way the weather risk engine already does.

### Architectural Work
- None required. Per IS-2, routing is frozen and correctly so. This entire audit's findings are fixable within the existing architecture — that is itself a finding worth stating plainly: **Host Quality work does not require new engines, new shells, or new frameworks. It requires making the existing engines answer the same five questions consistently.**

### Knowledge Work
- Author real per-event risk reasoning to replace static type-level `playbookRisks` copy (content work, not code work).
- Review whether the Day-of safety checklist and weather contingency should be merged into one authored source to eliminate their content overlap.

### UX Work
- None recommended without further design input — this audit found no case where the *visual design* itself was the problem; every issue found is a data/wiring/copy issue, not a layout or interaction-pattern issue. Per HQ-1's own mandate, no redesign is proposed.

### Copy Work
- Replace generic empty-state/fallback strings with event-personalized versions where an event name/type is already available and simply not being used.
- Standardize the confidence vocabulary (once extended per "Small Wins" above) so the same words mean the same thing everywhere they appear.
- Consider explicitly labeling static (type-level) risk copy as such internally, so future authors know which risk rows are safe to leave generic and which should eventually get event-specific evidence.

---

## Prioritization Rationale

Ranked by the four dimensions requested — **trust gained, planning quality improved, cognitive load reduced, activation improved** — the fastest path to "effortlessly trustworthy" is:

1. **Fix the food-cost drift and the ungated AI write first.** These are the two places a real host could catch the app being wrong or overstepping, and both are Quick Wins. Nothing else matters if trust breaks here.
2. **Extend the confidence vocabulary everywhere**, reusing what Reveal already built — this is the single highest-leverage Small Win, because it's one pattern applied many places, not many different fixes.
3. **Close the Risk loop and give non-menu Decisions a real destination** — these are the two places "intelligence" is currently closest to noise, and fixing them turns passive information into active planning support.
4. **Everything else (duplication, isDayOf drift-risk, Reveal→HostHome handoff) is real but lower-urgency** — worth doing, but none of it is currently visible to a host the way the top three are.

**This roadmap does not require, and does not recommend, any new architecture, any redesign, or any new engine.** Per HQ-1's mandate: refine what exists before expanding intelligence, compound event support, planner personas, or additional shells.
