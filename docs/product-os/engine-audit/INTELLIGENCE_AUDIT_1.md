# INTELLIGENCE-AUDIT-1 — Engine Scorecards (2026-07-06)

Scoring model: Intelligence Engine Doctrine §6 (15 dimensions, 0–5, fatal-flaw
override, verdict labels). Evidence = file/helper, test suite, or live-verified
surface behavior from shipped slices; **unk** = not enough evidence, excluded
from the average. Regression dimension: 5 = LOW risk.

Column key: Truth · Source · Reuse · Tests · CTA · State · Audience · Applic ·
Clarity · Value · Arch · Regr · Mob/Demo · Heart · Evidence.

## Engine-level scorecards

| Engine (maturity) | T | S | Ru | Te | C | St | Au | Ap | Cl | V | Ar | Rg | M | H | Ev | **Avg** | Verdict |
|---|--|--|--|--|--|--|--|--|--|--|--|--|--|--|--|---|---|
| Event Readiness Core (shipped) | 5 | 5 | 5 | 5 | 4 | 5 | 4 | 5 | 4 | 5 | 5 | 4 | 4 | 2 | 5 | **4.5** | **Build on** |
| Action Router / CTA Core (shipped) | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 4 | 4 | 5 | 5 | 4 | 5 | 2 | 5 | **4.5** | **Build on** |
| Progress Source-of-Truth (shipped) | 5 | 5 | 5 | 5 | unk | 5 | 4 | 5 | 4 | 4 | 5 | 5 | 4 | 1 | 5 | **4.4** | **Build on** |
| Vendor Confirmation Intelligence (shipped) | 5 | 5 | 4 | 5 | 5 | 5 | 5 | 4 | 4 | 4 | 5 | 4 | 4 | 3 | 5 | **4.5** | **Build on** |
| Vendor Brief Intelligence (shipped) | 5 | 5 | 4 | 5 | 4 | 4 | 5 | 4 | 4 | 5 | 5 | 4 | 4 | 3 | 5 | **4.4** | **Build on** |
| Audience / Privacy Filter (shipped-partial) | 5 | 4 | 4 | 5 | unk | 4 | 5 | 5 | 4 | 5 | 4 | 4 | 4 | 3 | 5 | **4.4** | **Build on** |
| Weather / Contingency Core (shipped) | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 4 | 4 | 4 | 5 | 4 | 4 | 3 | 5 | **4.4** | **Build on** |
| Place Intelligence Core (shipped, LOCATION-VENUE-1) | 5 | 5 | 4 | 5 | 5 | 5 | 4 | 5 | 4 | 4 | 5 | 4 | 5 | 2 | 5 | **4.5** | **Build on** |
| Budget / Money Core (shipped) | 5 | 4 | 4 | 5 | 4 | 4 | 4 | 4 | 5 | 5 | 4 | 3 | 4 | 2 | 5 | **4.1** | Tighten |
| Guest Intelligence Core (shipped-partial) | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 5 | 4 | 4 | 4 | 3 | 4 | **4.0** | Tighten |
| Task / Checklist Core (shipped) | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 2 | 4 | **3.9** | Tighten |
| Planning Health / Applicability (shipped) | 5 | 3 | 4 | 4 | 4 | 4 | 4 | 5 | 4 | 4 | 4 | 4 | 4 | 2 | 4 | **3.9** | Tighten |
| Decision Memory Core (partial) | 5 | 4 | 4 | 4 | 3 | 4 | 4 | 4 | 3 | 4 | 4 | 4 | 4 | 4 | 4 | **3.9** | Tighten |
| Vendor Intelligence Core (partial) | 4 | 4 | 4 | 4 | 4 | 4 | 3 | 4 | 3 | 4 | 4 | 3 | 4 | 2 | 4 | **3.7** | Tighten |
| Timeline / Day-Of Ops Core (partial) | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 4 | 3 | 4 | 4 | 3 | 4 | 3 | 4 | **3.7** | Tighten |
| Human / Heart / Moment Core (partial) | 4 | 3 | 3 | 3 | 3 | 3 | 4 | 4 | 3 | 5 | 4 | 4 | 4 | 5 | 3 | **3.7** | Tighten |
| Communication Core (partial, planner-only) | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | **2.9** | Local only |
| Admin / Fleet Core (partial) | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 1 | 3 | **2.8** | Kill/Park (expansion) |

**Fatal-flaw sweep: none open.** The historical fatal flaws (blank-tab CTAs,
duplicate risk engine, wrong Budget render branch, ungated AI budget write,
pricing drift) were fixed and test-locked in CTA-REPAIR-1, PC-2, and HQ-2.

## Per-engine evidence and next slice

- **Event Readiness Core** — `getEventReadiness` + `wholeEventReadinessScore`; progressDoctrine + progressReadiness suites. Heart 2: axes are purely logistical. Next: none required; consumes future Heart signals only by annotation (DL-008).
- **Action Router / CTA Core** — `eventPlan`/`selectEventNextAction` + `resolveShellTab`; shellTabs (10) + ctaDeepLinks (8) + ctaStateTransitions (11) suites; mobile live-verified in CTA-REPAIR-1. Next: keep the maintenance rule (new tab ⇒ tab sets).
- **Progress SoT** — doctrine-as-tests (progressDoctrine.test.js). CTA unk (emits none by design). Heart 1: a bar can't carry meaning. Next: none.
- **Vendor Confirmation** — confirm-back capture, idempotent server rows, `confirmationActionsFor` self-clearing actions; 22 lib tests + live-verified 2B-1. Next: 2B-2 attention chip only if demo feedback demands it (parked).
- **Vendor Brief** — audited whitelist both sides + tokenized resolve; backend 97/97; mint happy-path prod verify pending a signed-in session. Next: close that verification.
- **Audience/Privacy** — whitelists by construction (vendorBrief, RSVP PUBLIC_EVENT_FIELDS, guestRainMessage internal-terms test-ban). Not yet one module (Source 4). Next: only generalize behind a §7 audit.
- **Weather/Contingency** — rainPlanStatus/Gap single rule, computeRainWindow real-forecast-only, suggest/guest split; 17 rainAssist tests, live + prod verified. Next: none.
- **Place Intelligence** — NEW: `derivePlaceIntelligence` one Place Core, 15 contract tests, live-verified home/venue/CTA/state-transition/mobile. Reuse 4: one surface so far. Heart 2: logistics-only copy. Next: consider Command health-row consumption (single source already).
- **Budget/Money** — actuals-only "spent" test-pinned (budgetCopy 8 + BUD-1 heroes). Regr 3: money copy spans many surfaces. Next: unify remaining estimate-vs-actual seams (HQ-2 deferred P1s).
- **Guest** — count/roster/RSVP modes, attendanceBand; D-1C zero-state fix. Next: reply-nudge loop depth (commercial value is already top-tier).
- **Task/Checklist** — `effectiveDone` engine-satisfaction; regression risk lives in playbook authoring. Next: overdue surfacing consistency.
- **Planning Health/Applicability** — suppression correct but lives in two places (health rows + score exclusions). Next slice: unify applicability predicates into one set.
- **Decision Memory** — capture + prompt live-verified; payoff (rationale resurfacing) partially wired (Big Move H). Next slice: visible-payoff loop.
- **Vendor Intelligence** — readiness rollup + cockpit; zero cross-vendor sequencing (flagship audit); military categories missing. Next: ctx into Vendors + seed expansion (already queued).
- **Timeline/Day-Of** — effectiveRos solid; three sibling day-of surfaces await convergence review (parked ticket). Tests 3: thinner than CTA suites.
- **Human/Heart** — heart tier + experienceContext; only 7/11 proposed fields actually supported (ET-1) — Evidence 3. Next: expression-before-expansion annotations (DL-008), no new engine.
- **Communication** — planner-shell only; host shell intentionally has no comms tab (clamp). Tests 2. Verdict Local only until a host-facing comms need is proven.
- **Admin/Fleet** — cross-event attention works at 3 clients; scale unverified (HQ-3), Heart 1, Tests 2. Park expansion pending Planner Pro validation.

## Rollups

**Top by score:** Event Readiness · Action Router/CTA · Vendor Confirmation ·
Place · Progress SoT · Vendor Brief · Audience/Privacy · Weather · Budget ·
Guest.

**Bottom by score:** Admin/Fleet · Communication · Human/Heart · Timeline/
Day-Of · Vendor Intelligence · Decision Memory · Planning Health (source
split) · Task/Checklist · Guest · Budget (regression surface).

**Top commercial value:** Guest (RSVP loop) · Event Readiness · Action
Router · Vendor Brief (share-link wow) · Budget · Human/Heart (differentiator)
· Vendor Confirmation · Place · Weather · Progress SoT.

**Top trust risks (watch, none currently fatal):** Budget copy seams across
surfaces · Timeline day-of surface triplication · Vendor cockpit copy leaking
planner terms to hosts · Decision Memory capture-without-payoff (feels
fake-smart if never resurfaced) · Communication weak tests · Admin scale
claims beyond 3 clients · Human/Heart inventing emotion if extended carelessly
· Audience filtering staying call-site-correct without one module · playbook
authoring drift vs effectiveDone · demo seed drifting from real flows.

**Most reusable foundations:** resolveShellTab route contract ·
getEventReadiness axes · effectiveDone · rainPlanStatus/RAIN_PLAN_TARGET ·
derivePlaceIntelligence · budgetHeroCopy state machine · vendor-brief
whitelist pattern · confirmationActionsFor recompute-per-render pattern ·
experienceContext · decisionMemory records.

**Most fragmented areas:** applicability predicates (2 homes) · audience
filtering (3 pattern instances, no module) · day-of surfaces (3 siblings) ·
estimate-vs-actual money copy · persona mechanisms (3, HQ-3) · vendor
readiness vs accountability playbooks overlap · guest count fields (count/
estimate/roster) · comms drafts vs doItForMe copy builders · identity readers
(fixed at Reveal seam, others unaudited) · venue fields planner-vs-host
branches in Event Details.

**Top missing intelligence:** decision-payoff resurfacing · cross-vendor
sequencing/dependency intelligence (WOW-1) · host-facing communication
intelligence · guest reply-nudge cadence · day-before checklist compression ·
budget what-if (swap-to-save exists; no scenario view) · venue walkthrough
checklist (Place v2) · post-event memory/outcome intelligence · multi-event
host intelligence · planner fleet scale proofs.

**Recommended next slices (ordered):** 1 Decision-payoff loop (DM) ·
2 Applicability predicate unification · 3 Vendor ctx + seed expansion
(queued) · 4 Day-of surface convergence review · 5 Budget seam audit (HQ-2
deferred P1s) · 6 Heart annotations via DL-008 · 7 Place v2 walkthrough
checklist · 8 Guest nudge cadence · 9 Communication host-need validation
(audit-only) · 10 Vendor Brief mint prod verification.
