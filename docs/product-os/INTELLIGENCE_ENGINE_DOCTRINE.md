# Intelligence Engine Doctrine — NGW Event Platform

Status: canonical (DOCTRINE-INTEL-1, 2026-07-06). This document is the
source-of-truth for identifying, auditing, and extending intelligence engines.
When asked "what engines exist," "what intelligence exists," "what should we
build next," or "is this safe to build on" — **inspect this doctrine AND the
current code before answering. Do not rely on memory alone.**

---

## 1 · Executive rule

No Guesswork intelligence must **interpret event facts, explain why they
matter, produce truthful next actions, route users correctly, respect audience
boundaries, suppress not-applicable work, and avoid fake certainty.**

Every rule below is a consequence of that sentence.

## 2 · What counts as "intelligence"

Any logic that does one or more of the following:

- interprets event data
- determines readiness
- creates a risk/warning
- creates or prioritizes a CTA
- changes copy based on state
- filters copy/data by audience
- suppresses not-applicable categories
- remembers a decision
- suggests a plan/message
- affects progress/readiness
- claims something is handled, missing, risky, confirmed, or not applicable

If code does any of these, this doctrine applies to it — including "just copy"
helpers, because copy that claims state IS a truth claim.

## 3 · What counts as an "engine"

**Engine** = a canonical, reusable source-of-truth module that multiple
surfaces build on. Everything else is subordinate:

| Tier | Meaning | Example |
|---|---|---|
| Canonical engine | THE answer for its domain; surfaces may not re-derive it | `eventPlan()` |
| Derived helper | composes canonical outputs, adds no new truth | `wholeEventReadinessScore` |
| UI copy helper | pure state→words; claims nothing the engine didn't | `budgetHeroCopy` |
| Local tracker | named, display-only, never enters readiness | capacity checklist, thank-you tracker |
| One-off component logic | lives and dies in one component | a card's expand state |
| Experimental/prototype | dev-gated, fabricated data allowed, never production-reachable | `EventDayMode` demo harness |

Promotion path: one-off → helper → engine happens only through the §7 audit.

## 4 · Current engines (grounded in code as of 2026-07-06)

Maturity: **shipped / partial / planned / unknown**. Verdict: **build / tighten / local only / audit / park.**

### Event Readiness Core — `getEventReadiness` + `wholeEventReadinessScore` (CommandCenter.jsx)
- Answers: "how ready is this whole event?" via 4 axes (decisions, vendors, timeline, documents); foundations flow in via `effectiveDone` task satisfaction.
- Source pattern: pure functions of the event blob; not-applicable axes EXCLUDED for hosts (PROGRESS-1).
- Must not duplicate: any per-surface re-derivation of "ready".
- Maturity: **shipped** (PROGRESS-1/2, doctrine-tested). Verdict: **build**.

### Action Router / CTA Core — `eventPlan()`, `selectEventNextAction`, `_eventFoundationActions` (CommandCenter.jsx) + `resolveShellTab` (lib/shellTabs.js)
- Answers: "what should the user do next, and where exactly does that live?"
- Source pattern: single next-action ladder; every route resolves through `resolveShellTab` — host remaps, alias normalization, unknown-tab clamp to Command (CTA-REPAIR-1). Deep links carry `focusField`/`vendorId`/`vendorSection`/`foodFocus` (D-1B) and clear/advance on resolution (D-1C).
- Must not duplicate: no surface may invent its own next-action ranking or navigation table.
- Maturity: **shipped** (64-suite contract coverage). Verdict: **build**.

### Planning Health / Applicability Core — `deriveCommandCenterData` health rows + host suppression flags (`_isHost`/`_hasVendors`/`_hasDocs`)
- Answers: "which domains apply to this event, and how is each doing?"
- Rule embodied: not-applicable categories are suppressed, never scored as failing.
- Maturity: **shipped**, but suppression logic lives in two places (health rows + whole-event score). Verdict: **tighten** — a future slice could unify applicability into one predicate set.

### Progress Source-of-Truth Core — `wholeEventReadinessScore` + progressDoctrine tests
- Answers: "is this indicator whole-event or local?" Exactly one whole-event source; all others scoped and labeled (PROGRESS-2, executable doctrine).
- Maturity: **shipped**. Verdict: **build**.

### Audience / Privacy Filter Core — `audiencePersona`, `labelFor`/HOST_LABELS (lib/presentationLabels), vendor-brief whitelist (lib/vendorBrief.js + backend mirror), guest RSVP `PUBLIC_EVENT_FIELDS`
- Answers: "who is reading this, and what may they see?"
- Source pattern: whitelists by construction (copy named fields, never spread); audience-specific copy helpers split per audience (e.g. `guestRainMessage` vs `suggestRainPlan`).
- Must not duplicate: no ad-hoc field filtering at call sites.
- Maturity: **shipped** for vendor-brief/RSVP/rain; **partial** as a general framework (no single "filter core" module). Verdict: **build** on the shipped whitelists; **audit** before generalizing.

### Vendor Intelligence Core — vendor readiness rollup (`workstreamsFor`, vendor axes in `getEventReadiness`, `getVendorReadiness`), cockpit next-action logic (VendorPlanningWorkspace)
- Answers: "which vendors are handled, which need the host, what's the next vendor action?"
- Maturity: **shipped**. Verdict: **build**; do NOT add a second vendor scorer.

### Vendor Brief Intelligence — `buildVendorBriefPayload`/`vendorRosSlice` (lib/vendorBrief.js) + backend tokenized resolve
- Answers: "what may THIS vendor see, live?" Audited whitelist both sides, tokenized live resolve, legacy fallback.
- Maturity: **shipped** (Phase 1 accepted, prod-verified). Verdict: **build**.

### Vendor Confirmation Intelligence — confirm-back capture + `confirmationActionsFor`/log builders (lib/vendorBriefConfirm.js)
- Answers: "what did the vendor say, and what explicit host actions follow?" Vendor clicks never mutate event state; host actions recompute per render (self-clearing).
- Maturity: **shipped** (2A + 2B-1). Planned: 2B-2 attention surfacing (display-only chip approach — `eventPlan` is sync-from-blob, so server rows must NOT be plumbed into it). Verdict: **build**, chip **park** until demo feedback.

### Budget / Money Intelligence Core — `hostSpending` (lib/hostSpending.js) + `budgetCopy` (lib/budgetCopy.js) + swap-to-save (`pickDroppableBudgetRow`)
- Answers: "what's likely spent, what's left, what's unpriced, act or not?"
- Truth rules (test-pinned): "spent" = actuals only; quotes never "paid"; estimates demote once the host acts (heroes show the host's numbers).
- Maturity: **shipped** (BUD-1 + card heroes). Verdict: **build**.

### Guest Intelligence Core — `guestCountResolved`, `attendanceBand`, `guestsHeroContent`, RSVP loop (lib/api/rsvp.js + backend)
- Answers: "how many are coming, how solid is that number, what's outstanding?"
- Maturity: **shipped** (count/roster/RSVP modes; D-1C fixed the zero-state hero). Verdict: **build**.

### Location + Venue / Place Intelligence Core — `derivePlaceIntelligence` (lib/placeIntelligence.js) + venue blockers (lib/assembleRevealEngines `venueResolved`)
- One **Place Core**, two questions (see §10), shipped in LOCATION-VENUE-1: per-section handled/needs/risk/na states, real in-tab focus CTAs (PLACE_TARGETS), at-home and vendorless suppression, rain target shared with lib/weather. Renders as the Event Details "Location check" card.
- Must not duplicate: no second place/venue scorer; new location logic extends `derivePlaceIntelligence`.
- Maturity: **shipped** (15 contract tests, live-verified). Verdict: **build**.

### Weather / Contingency Core — lib/weather.js (`getEventWeatherRisk`, `weatherLogistics`, `rainPlanStatus/Gap`, `computeRainWindow`, `suggestRainPlan`, `guestRainMessage`)
- Answers: "what does the forecast change, is there a plan, what do guests need to hear?"
- Truth rules: real forecast only, hedged voice, no invented times, host/guest copy split.
- Maturity: **shipped**. Verdict: **build**.

### Timeline / Day-Of Operations Core — `effectiveRos`, day-of NOW hero, `rosDone` per-cue completion, day-of feedback (`fireIfDayJustCompleted`)
- Answers: "what happens when on the day, what's now, what's done?"
- Maturity: **shipped**; day-of surface convergence review is a PARKED product ticket. Verdict: **build** carefully; no second run-of-show deriver.

### Task / Checklist Core — `effectiveDone`, `taskTiming`, `isTaskOverdue`, compression (`topPlaybookTask`, playbooks)
- Answers: "which authored work is genuinely done (engine-satisfied OR ticked), what's overdue, what compresses?"
- Key rule: rich state satisfies tasks (`effectiveDone`) — never double-count a satisfied task as open.
- Maturity: **shipped**. Verdict: **build**.

### Communication Intelligence Core — comms readiness (`getUnansweredMessages`, `approvalIsSent`, `isInboundMessage`), compose drafts (lib/doItForMe.js)
- Answers: "what messages need the planner, what should a draft say?"
- Maturity: **partial** — planner-shell surface only; host shell has NO Communication tab (routes clamp to Command by contract). Verdict: **audit** before host-facing comms work.

### Decision Memory Core — `decisionMemoryOn`, `makeDecisionRecord`/`appendDecision`, `promptDecision`, `latestRationaleForSubject` (lib/decisionMemory)
- Answers: "what was decided, and why?" Prompt fires on vendor confirmation (live-verified).
- Maturity: **partial** — capture is solid; the *payoff* (rationale resurfacing at the right moment) is only partially wired. Verdict: **tighten** — close the visible-payoff loop before expanding capture.

### Human / Heart / Moment Intelligence Core — `must_have_moment` ("Protect the heart" tier), `eventIdentity`/`buildExperienceContext` (lib/experienceContext), host-voice copy system
- Answers: "why does this event matter, and is that protected?" See §9.
- Maturity: **partial** (heart tier + identity/compound context shipped; broader WOW concepts planned). Verdict: **build** within §9's rules; **audit** any expansion.

### Admin / Fleet Intelligence Core — `getCrossEventAttention`, studio command (`selectStudioCommand`), admin console (src/admin)
- Answers: "across all events/clients, what needs the studio?"
- Maturity: **partial**; planner scale beyond ~3 clients is explicitly unverified (HQ-3). Verdict: **park** for expansion until Planner Pro validation.

## 5 · Source-of-truth rules (hard)

1. Whole-event readiness has ONE canonical source (`wholeEventReadinessScore`).
2. Progress indicators state their scope — whole-event or named-local. No generic "progress"/"ready".
3. Every CTA routes/focuses precisely, or is honestly broad, or is disabled/hidden. No blank surfaces (`resolveShellTab` clamp), no dead buttons, no stale CTAs after resolution.
4. Audience-specific copy uses audience-safe helpers; vendor/guest/host/planner copy never shares unsafe internal text (whitelists by construction).
5. Not-applicable axes are suppressed/excluded — never scored as failures.
6. New intelligence work inspects existing engines FIRST (§7 audit) before adding helpers.
7. No arbitrary scoring, no fake percentages, no unexplained weights.
8. No invented venue, parking, weather, payment, document, or vendor facts. Missing data reads as honestly missing.
9. No new engine unless the §7 audit proves the existing engine cannot support the job.

## 6 · Intelligence scoring standard (INTELLIGENCE-AUDIT-1 model)

Do not grade A/B/C. Every intelligence piece and every proposed engine gets a
**15-dimension scorecard**, an overall score, a fatal-flaw check, and a
verdict. Do not invent scores — every score carries a one-line rationale with
evidence (file/helper reference, test reference, visible surface behavior, or
an explicit "unknown").

**Scale (0–5):** 0 absent · 1 broken/misleading/unsafe · 2 partial/fragile/
local only · 3 functional, needs tightening · 4 strong, mostly safe to build
on · 5 canonical, tested, trustworthy, reusable, product-grade.

**Dimensions:** 1 Truthfulness · 2 Source-of-truth clarity · 3 Reusability/
engine quality · 4 Test coverage · 5 CTA/action reliability · 6 State-
transition reliability · 7 Audience safety · 8 Applicability handling ·
9 User clarity · 10 Commercial/product value · 11 Architecture fit ·
12 Regression risk (5 = low risk) · 13 Mobile/demo quality · 14 Human/Heart
quality · 15 Evidence depth (concrete event data vs hardcoded copy).

**Overall:** simple average across scored dimensions — but the average never
hides a fatal flaw.

**Fatal-flaw override — cap the verdict at Repair (Hold/Fix) regardless of
average if any of:** broken/no-op CTA · wrong-screen routing · internal copy
leaking to guest/vendor · fake confirmed state · fake payment/spent state ·
fake weather/location/venue fact · not-applicable work counted as failure ·
local progress shown as whole-event readiness · untested canonical engine
affecting major surfaces.

**Verdicts:** Build on (avg ≥ 4.2, no fatal flaw) · Tighten (3.4–4.1 or minor
architecture/test gaps) · Local only (useful, not engine-grade) · Repair
(trust issue, broken CTA, misleading source, weak tests) · Kill/Park (low
value, duplicate, fake-smart, not commercially useful now).

**Required rollups for any full audit:** top/bottom 10 by score · top 10 by
commercial value · top 10 trust risks · top 10 reusable foundations · top 10
fragmented areas · top 10 missing intelligence pieces · top 10 recommended
next slices. Current scorecards live in
[engine-audit/INTELLIGENCE_AUDIT_1.md](engine-audit/INTELLIGENCE_AUDIT_1.md).

## 7 · Required pre-coding audit for intelligence work

Before implementing ANY new intelligence slice, produce this matrix:

| Field | Answer required |
|---|---|
| Intelligence being touched | |
| Existing files/helpers | |
| Inputs | |
| Outputs | |
| Surfaces affected | |
| Existing tests | |
| Creates CTAs? | |
| Affects readiness/progress? | |
| Filters by audience? | |
| Duplicates another helper? | |
| Proposed extension point | |
| Why this is NOT a competing engine | |

No matrix, no code.

## 8 · CTA contract rule

Every intelligence-produced CTA defines: **label · destination/action · route
target (must resolve via `resolveShellTab`) · focus/anchor/row if applicable ·
stale-state behavior (clears/advances on resolution) · disabled/hidden rule ·
broad-label fallback when precise focus is impossible · test coverage** (route
payload pinned in the CTA contract suites).

## 9 · Human / Heart WOW rule

Human Intelligence is not decorative copy. **It protects why the event
matters.** It should consider: honoree · milestone · VIPs/family/stakeholders ·
emotional moments · guest comfort · host stress · memory value · tone and
dignity · moment protection.

It must never invent emotional facts. It may use known event facts
(`must_have_moment`, honoree, identity/compound context) to make actions more
human and meaningful. Somber events keep the quiet register (the sacred/quiet
mark rules are the visual arm of this same doctrine).

## 10 · Location / Venue rule — one Place Core

Location Intelligence and Venue Intelligence are **one Place Core**, not two
competing engines.

- Location Intelligence answers: *"what does this place change about the event plan?"*
- Venue Intelligence answers: *"what must be confirmed with this venue before event day?"*

Rules: no maps/geocoding beyond what already exists (weather geocode) unless
explicitly approved later · existing data only unless a later API slice is
approved · at-home events are never punished for venue-only fields (the
`venueKind === 'home'` carve-out is precedent) · vendorless events are never
punished for vendor load-in gaps · no invented parking, access, backup rooms,
or venue rules.

## 11 · Kill / park rules

Kill or park intelligence that: duplicates a canonical engine · creates fake
certainty · creates dead CTAs · leaks internal copy to guests/vendors · scores
not-applicable work as failure · uses local progress as whole-event readiness ·
adds complexity without improving trust, conversion, retention, or workflow
value.

Precedents already enforced: `resolvePersona`/`resolveShell` parked (IS-2,
vocabulary without UI) · duplicate risk-engine defect killed (PC-2) ·
red-engraving glyphs withdrawn on tone (guests must never be scared) ·
attention chip parked pending demo evidence.

## 12 · Future audit instruction

When asked "what engines exist," "what intelligence exists," "what should we
build next," or "is this safe to build on": **read this doctrine, then verify
against current code** (the file/function names above are the entry points).
Engines drift; the doctrine names where truth lives, the code says what it
currently is. Update this file whenever an engine ships, is promoted, or is
parked — a doctrine that lags the code is itself a §11 violation.
