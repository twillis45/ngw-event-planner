# Sprint 56D — Event Pattern Intelligence Audit & Design

*Audit + dependency + design only. No build, no runtime change, no new engine, no doctrine modification. Question: "what usually happens?" — can NGW anticipate common failures, recoveries, successes, and opportunities, and can it do so with **existing architecture** (Pattern 006: Reuse Before Reinvention)? Burden of proof is on any new engine/dashboard/priority/governance layer. Date: 2026-06-17.*

## Verdict up front
**Event Pattern Intelligence is ~70% already authored — and mostly dark.** Failure patterns (`risks`) and recovery patterns (`contingencies`) are **live but narrowly surfaced**; the rich success/coaching/failure-mode layers (`plannerLens`, `mindset`, `experience`, `guestManagement`) are **fully authored in `*.eos.json` but have 0 src consumers and aren't even bundled** (they live in `engine-audit/`, not `src/`). The governance model (`knowledge.json`: source/confidence/verification/counterPractice/openAssumptions) **already exists**. **No new engine is required.** Recommendation: **Architecture C — Pattern Data + Playbook Reader Extensions**, surfaced on existing surfaces, governed by the existing Knowledge Governance, rendered via Pattern 011. The work is *wiring + opportunity content*, not architecture.

---

## Part 1 — Existing Pattern Intelligence Inventory
| System | File / function | Data source | Surface | Active or **DARK** |
|---|---|---|---|---|
| **Failure patterns** | `playbookInfraPrompts`, playbook `risks` | `src/lib/playbooks/data/*.js` `risks[]` | Reality Check | **Active** (narrow) |
| **Recovery patterns** | playbook `contingencies` | `data/*.js` `contingencies[]` | (authored; surfaced only as text) | **Partly dark** |
| **Failure-mode detectors** | `experience` (9 per type) | `engine-audit/*.eos.json` | — | **DARK** (not bundled) |
| **Success patterns** | `plannerLens.successDeterminants`, `mindset` | `*.eos.json` | — | **DARK** (0 src reads) |
| **Guest/host patterns** | `guestManagement` | `*.eos.json` | — | **DARK** (0 src reads) |
| **Capacity pattern** | `playbookCapacity` | `data/*.js` `rentalsGap` | Planning Health | **Active** |
| **Timeline pattern** | `deriveEventCompressionSummary` | `lib/workflowCompression.js` | compression badge | **Active** |
| **Readiness pattern** | `getEventReadiness` (4 axes) | event state | health/cascade | **Active** |
| **Vendor patterns** | accountability tiers, promise model | `lib/vendorAccountability/*` | Vendor view | **Active** |
| **Operational sequence** | `eventSolve.mjs` solve templates (incl. 15 signature/tribute/welcome/farewell tasks) | `lib/eventSolve.mjs` | timeline | **Active** (success-pattern seed) |
| **Governance model** | knowledge block | `*.knowledge.json` (`source/confidence/verification/counterPractice/openAssumptions`) | — | **Reusable** (Part 6) |

**How much already exists?** The *failure* and *recovery* halves are authored and live (if narrowly); the *success/coaching/failure-mode* halves are authored and **dark**; the *opportunity* half is the only genuinely thin area (scattered tribute tasks, 56B Grade D). The premise of this sprint — "operationalize planner pattern knowledge" — is **70% a wiring problem, 30% a content problem, 0% an engine problem.**

---

## Part 2 — Pattern Taxonomy (smallest complete)
Four canonical pattern types — three already have authored homes:
| Pattern type | "What usually…" | Existing home | Status |
|---|---|---|---|
| **Failure** (incl. *hidden-risk* as a tag, not a 5th type) | …goes wrong | `risks` + dark `experience` | live + dark |
| **Recovery** | …you do when it does | `contingencies` | authored |
| **Success** | …makes it work | dark `plannerLens.successDeterminants` + `mindset` | dark |
| **Opportunity** | …adds value/delight | scattered `eventSolve` tasks | thin |
**Smallest complete set = 4 types.** Hidden-risk = a `hidden:true` tag on a Failure pattern (non-obvious: alcohol+minors, weather, accessibility, family conflict), not a separate category — keeps the taxonomy minimal and maps to the existing `risks` shape (which already carries severity).

---

## Part 3 — Event-Type Dependency Map (shared vs type-specific)
Across Dinner Party / Birthday / Baby Shower / BBQ / Graduation / Wedding / Corporate / Conference / Fundraiser / Gala, the failure/success patterns cluster into:

**Universal (shared library — ~10 patterns, belong in a base set):**
- Failure: headcount drift; runs-late / timeline compression; food/drink shortage; weather (if outdoor); setup falls to host; cleanup unplanned; late/no-show vendor; over-ambitious menu/scope.
- Success: a signature moment; a warm welcome; guests feel taken care of; host is present (not working).

**Type-specific (require event-type data — overlays):**
- Wedding: vendor coordination, first-look, family dynamics, timeline handoffs.
- Corporate/Conference: AV failure, registration flow, networking design, speaker buffers.
- Fundraiser/Gala: donor/sponsor recognition, auction flow, seating politics, program pacing.
- Graduation: multi-grad scheduling, achievement display, mentor recognition.
- Baby/Birthday: kid supervision, gift/activity flow, nap/timing windows.

**Conclusion:** a **shared base pattern set + per-type overlays** — *exactly the playbook model* (shared readers over per-type data). This is structural evidence for Architecture C. ~70% of patterns are shared (author once); ~30% are type-specific (overlay).

---

## Part 4 — Runtime Integration Audit (where patterns surface)
| Surface | Appropriate? | Why |
|---|---|---|
| **Home Spine** | **NO** | The Spine is the *single next action* (Pattern 002). Patterns are *anticipatory context*, not THE action — putting them here dilutes the one-hero rule. |
| **Reality Check** | **YES — primary** | Already surfaces failure/hidden-risk prompts (`playbookInfraPrompts`); failure + hidden-risk patterns extend it with the same neutral, Inform-Without-Escalating (Pattern 010) treatment. |
| **Planning Health** | **YES** | A display-only "what usually happens" / success-pattern row, like Capacity/Reality Check (Pattern 010). Success + opportunity patterns belong here. |
| **Event Day Schedule** | **YES** | Day-of timing patterns ("things run late") attach to the run-of-show / NOW-NEXT board. |
| **Vendor View** | **YES** | Vendor patterns (no-show, COI, late) attach to vendor accountability. |
| **Command Center cascade** | **Only if blocking** | A pattern becomes a *next action* only when it's an open blocker; otherwise it informs, it doesn't escalate (Pattern 010). |

**Where a planner expects pattern guidance:** in the **pre-event review** (Reality Check / Planning Health — "here's what usually trips people up") and in **day-of timing** (the schedule) — **not** in the single next-action. This is Pattern 008 (Right Surface) applied: each pattern type renders on the surface that owns its moment.

---

## Part 5 — Architecture Decision
| Approach | Complexity | Risk | Doctrine alignment | Reuse | Verdict |
|---|---|---|---|---|---|
| **A · New Pattern Engine** | High | High | **Violates 006** (burden of proof unmet — patterns are *data*, not computation) | 1/5 | **KILL** |
| **B · Pattern Data + Existing Runtime** | Med | Med | OK | 3/5 | folds into C |
| **C · Pattern Data + Playbook Reader Extensions** | **Low** | **Low** | **001/005/006/008/010/011 aligned** | **5/5** | **EXECUTE** |

**C in concrete terms:** (1) extend the playbook data model with `success[]` + `opportunity[]` (and a `hidden` tag on risks), and **wire the dark `*.eos.json` layers into `src`** (port `plannerLens`/`mindset`/`experience` into the bundled `data/*.js`); (2) add pure **readers** (e.g. `playbookPatterns(event, type)`) in the same shape as `playbookInfraPrompts`/`playbookCapacity`; (3) surface on the existing surfaces (Part 4); (4) govern via knowledge governance (Part 6); (5) render via Pattern 011 (Part 7). **No new engine, dashboard, priority system, readiness system, or governance layer** — the data→existing-runtime→existing-surface path holds end to end.

---

## Part 6 — Pattern Governance (reuse, not reinvent)
The required fields — **Source · Confidence · Verification status · Counter-practice · Event applicability** — **already exist** in `*.knowledge.json` (`sources`, `sourceTiers`, `confidence`, `verificationStatus`/`verificationRun`, `counterPracticeFound`, `openAssumptions`). 
**Answer: YES — Pattern Intelligence governance is a *specialization* of the existing Knowledge Governance, not a new system.** Each pattern carries the same provenance block (add `appliesTo: [eventTypes]` if not implicit from the playbook it lives in). No new governance layer — burden of proof unmet for one.

---

## Part 7 — Grandmother Test (render via Pattern 011)
The pattern **data** is single; the **rendering** varies by persona — this is exactly **Pattern 011 (One Engine, Multiple Confidence Layers)**, and the dark `mindset.reassurance` language is *already the host-voice source*.
| Pattern (engine truth) | First-time host (warm) | Coordinator (plain) | Pro planner (terse) |
|---|---|---|---|
| timeline compression | "Everything tends to run late — leave extra time between the big moments." | "Build buffer between major activities." | "Compression risk: pad transitions." |
| parking overflow | "More guests usually arrive than expected — have a backup parking plan." | "Plan overflow parking." | "Parking overflow risk." |
| over-ambitious menu | "Pick dishes you can make ahead so you're not cooking when guests arrive." | "Favor make-ahead courses." | "À-la-minute load risk." |
**One intelligence layer, many presentations — via the existing (parked) 55M renderer seam.** No separate pattern intelligence per persona; the host voice ships first because its source text (`mindset`) is already written.

---

## Part 8 — Product OS Governance (apply standards, don't auto-promote)
| Candidate | Recommendation | Evidence / reasoning |
|---|---|---|
| **Events Follow Predictable Patterns** | **Needs Review → Draft (Pattern 016)** | Strong embodiment (risks/contingencies/experience/eventSolve all encode it). *Distinct from Pattern 005 (Operational Intelligence Layer):* 005 = *track* the operational layer; 016 = *anticipate* predictable outcomes **before** mistakes. Genuinely new framing; promote to Active when pattern intelligence ships. |
| **Reveal Expertise Gradually** | **Reject as standalone → fold into Pattern 011** | Heavy overlap with Pattern 011 (confidence layers) + existing progressive disclosure. A refinement note on 011, not a new pattern — avoids doctrine bloat. |
| **One Intelligence Layer, Many Presentations** | **Reject (duplicate)** | This is **Pattern 011 (One Engine, Multiple Confidence Layers)** restated verbatim. Reuse, don't re-create. |
No new **anti-pattern** needed: the "parallel pattern engine / new dashboard" hazard is already covered by **Pattern 006** + the burden-of-proof rule.

---

## Notion Governance Recommendations (existing DBs only, no duplicates)
- **Pattern 016 — Events Follow Predictable Patterns** → Product Patterns (Draft). *(Not Pattern 011/012 — those are taken.)*
- **Reject/fold:** "Reveal Expertise Gradually" → note on POS-P011; "One Intelligence Layer, Many Presentations" → = Pattern 011 (no entry).
- **Decisions Log:** "Build Event Pattern Intelligence via Architecture C (wire dark eos.json + extend playbook data with success/opportunity + readers + existing surfaces + knowledge governance + Pattern 011 render)" — Open.
- **Doctrine Ledger:** note on POS-P011 — pattern intelligence is its second strong use case (more reason to render one layer many ways); status unchanged (no shipped voice).
- **Product OS** — 56D governance note.

---

## EXECUTE / TEST / PARK / KILL
- **EXECUTE:** **Wire the dark `*.eos.json` pattern layers into `src`** (port `plannerLens`/`mindset`/`experience` into bundled `data/*.js`) — the single highest-leverage, lowest-risk move: it lights up already-authored, already-governed intelligence with **zero new architecture**. Add a `playbookPatterns` reader (shape of `playbookInfraPrompts`).
- **TEST:** surface failure/success patterns on **Reality Check + Planning Health** (Pattern 010 neutral treatment); the host-voice render of one pattern via the 55M seam (Pattern 011 functioning instance).
- **PARK:** the **Opportunity** pattern catalog (authored content; type-led, after the wiring); day-of pattern timing on the schedule.
- **KILL:** a new Pattern Engine; a patterns dashboard; routing patterns into the next-action cascade as if they were blockers (Pattern 010 violation); a separate pattern-governance system (reuse knowledge governance).

**Capability matrix → dependency map → integration → governance → roadmap:** all point one way — **Architecture C, reuse over reinvention.** The intelligence is largely written; Sprint 56D's finding is that NGW should **turn on the lights it already has** (wire the dark eos.json) before authoring anything new.

**Confidence:** High — the dark-data inventory + the knowledge-governance field match + the shared/type-specific split are all code-verified. **Weakest assumption:** the dark `*.eos.json` layers exist in full only for **Dinner Party**; the other 4 playbooks have partial/none, so "wire the dark data" is a **per-type authoring** effort, not a one-time switch — the wiring is cheap, the per-type pattern content is the real (bounded) work. No build performed; audit + design only.
