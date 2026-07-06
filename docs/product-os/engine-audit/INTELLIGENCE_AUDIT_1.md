# INTELLIGENCE-AUDIT-1 — Engine Scorecards (2026-07-06)

Scoring model: Intelligence Engine Doctrine §6 — the 10+ world-class model
(15 dimensions 0–10, fatal-flaw override, verdict labels, 10+ Potential
column). 9 = production-grade; 10 = world-class baseline for the current
stage; 10+ = moat-level, awarded only on proof (§6) — never by average. Evidence = file/helper, test suite, or live-verified
surface behavior from shipped slices; **unk** = not enough evidence, excluded
from the average. Regression dimension: 10 = LOW risk.

Column key: Truth · Source · Reuse · Tests · CTA · State · Audience · Applic ·
Clarity · Value · Arch · Regr · Mob/Demo · Heart · Evidence.

## Engine-level scorecards

| Engine (maturity) | T | S | Ru | Te | C | St | Au | Ap | Cl | V | Ar | Rg | M | H | Ev | **Avg** | Verdict | 10+ Potential |
|---|--|--|--|--|--|--|--|--|--|--|--|--|--|--|--|---|---|---|
| Event Readiness Core (shipped) | 10 | 10 | 10 | 10 | 8 | 10 | 8 | 10 | 8 | 10 | 10 | 8 | 8 | 4 | 10 | **9.0** | **Build on** | Possible |
| Action Router / CTA Core (shipped) | 10 | 10 | 10 | 10 | 10 | 10 | 8 | 8 | 8 | 10 | 10 | 8 | 10 | 4 | 10 | **9.0** | **Build on** | Possible |
| Progress Source-of-Truth (shipped) | 10 | 10 | 10 | 10 | unk | 10 | 8 | 10 | 8 | 8 | 10 | 10 | 8 | 2 | 10 | **8.8** | **Build on** | No |
| Vendor Confirmation Intelligence (shipped) | 10 | 10 | 8 | 10 | 10 | 10 | 10 | 8 | 8 | 8 | 10 | 8 | 8 | 6 | 10 | **9.0** | **Build on** | Yes |
| Vendor Brief Intelligence (shipped) | 10 | 10 | 8 | 10 | 8 | 8 | 10 | 8 | 8 | 10 | 10 | 8 | 8 | 6 | 10 | **8.8** | **Build on** | Yes |
| Audience / Privacy Filter (shipped-partial) | 10 | 8 | 8 | 10 | unk | 8 | 10 | 10 | 8 | 10 | 8 | 8 | 8 | 6 | 10 | **8.8** | **Build on** | Possible |
| Weather / Contingency Core (shipped) | 10 | 10 | 8 | 10 | 10 | 8 | 10 | 8 | 8 | 8 | 10 | 8 | 8 | 6 | 10 | **8.8** | **Build on** | Possible |
| Place Intelligence Core (shipped, LOCATION-VENUE-1) | 10 | 10 | 8 | 10 | 10 | 10 | 8 | 10 | 8 | 8 | 10 | 8 | 10 | 4 | 10 | **9.0** | **Build on** | Possible |
| Budget / Money Core (shipped) | 10 | 8 | 8 | 10 | 8 | 8 | 8 | 8 | 10 | 10 | 8 | 6 | 8 | 4 | 10 | **8.2** | Tighten | Possible |
| Guest Intelligence Core (shipped-partial) | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 10 | 8 | 8 | 8 | 6 | 8 | **8.0** | Tighten | Possible |
| Task / Checklist Core (shipped) | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 4 | 8 | **7.8** | Tighten | No |
| Planning Health / Applicability (shipped) | 10 | 6 | 8 | 8 | 8 | 8 | 8 | 10 | 8 | 8 | 8 | 8 | 8 | 4 | 8 | **7.8** | Tighten | No |
| Decision Memory Core (partial) | 10 | 8 | 8 | 8 | 6 | 8 | 8 | 8 | 6 | 8 | 8 | 8 | 8 | 8 | 8 | **7.8** | Tighten | Possible |
| Vendor Intelligence Core (partial) | 8 | 8 | 8 | 8 | 8 | 8 | 6 | 8 | 6 | 8 | 8 | 6 | 8 | 4 | 8 | **7.4** | Tighten | No |
| Timeline / Day-Of Ops Core (partial) | 8 | 8 | 8 | 6 | 8 | 8 | 6 | 8 | 6 | 8 | 8 | 6 | 8 | 6 | 8 | **7.4** | Tighten | No |
| Human / Heart / Moment Core (partial) | 8 | 6 | 6 | 6 | 6 | 6 | 8 | 8 | 6 | 10 | 8 | 8 | 8 | 10 | 6 | **7.4** | Tighten | Possible |
| Communication Core (partial, planner-only) | 6 | 6 | 6 | 4 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | **5.8** | Local only | No |
| Admin / Fleet Core (partial) | 6 | 6 | 6 | 4 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 2 | 6 | **5.6** | Kill/Park (expansion) | No |

**Fatal-flaw sweep: none open.** The historical fatal flaws (blank-tab CTAs,
duplicate risk engine, wrong Budget render branch, ungated AI budget write,
pricing drift) were fixed and test-locked in CTA-REPAIR-1, PC-2, and HQ-2.

## Per-engine evidence and next slice

- **Event Readiness Core** — `getEventReadiness` + `wholeEventReadinessScore`; progressDoctrine + progressReadiness suites. Heart 4: axes are purely logistical. Next: none required; consumes future Heart signals only by annotation (DL-008).
- **Action Router / CTA Core** — `eventPlan`/`selectEventNextAction` + `resolveShellTab`; shellTabs (10) + ctaDeepLinks (8) + ctaStateTransitions (11) suites; mobile live-verified in CTA-REPAIR-1. Next: keep the maintenance rule (new tab ⇒ tab sets).
- **Progress SoT** — doctrine-as-tests (progressDoctrine.test.js). CTA unk (emits none by design). Heart 2: a bar can't carry meaning. Next: none.
- **Vendor Confirmation** — confirm-back capture, idempotent server rows, `confirmationActionsFor` self-clearing actions; 22 lib tests + live-verified 2B-1. Next: 2B-2 attention chip only if demo feedback demands it (parked).
- **Vendor Brief** — audited whitelist both sides + tokenized resolve; backend 97/97; prod live-verified mint/reuse/freshness/privacy/legacy (VB2 Phase 1, f56753d). Next: real-vendor usage + share-channel proof (the 10+ path).
- **Audience/Privacy** — whitelists by construction (vendorBrief, RSVP PUBLIC_EVENT_FIELDS, guestRainMessage internal-terms test-ban). Not yet one module (Source 8). Next: only generalize behind a §7 audit.
- **Weather/Contingency** — rainPlanStatus/Gap single rule, computeRainWindow real-forecast-only, suggest/guest split; 17 rainAssist tests, live + prod verified. Next: none.
- **Place Intelligence** — NEW: `derivePlaceIntelligence` one Place Core, 15 contract tests, live-verified home/venue/CTA/state-transition/mobile. Reuse 8: one surface so far. Heart 4: logistics-only copy. Next: consider Command health-row consumption (single source already).
- **Budget/Money** — actuals-only "spent" test-pinned (budgetCopy 8 + BUD-1 heroes). Regr 6: money copy spans many surfaces. Next: unify remaining estimate-vs-actual seams (HQ-2 deferred P1s).
- **Guest** — count/roster/RSVP modes, attendanceBand; D-1C zero-state fix. Next: reply-nudge loop depth (commercial value is already top-tier).
- **Task/Checklist** — `effectiveDone` engine-satisfaction; regression risk lives in playbook authoring. Next: overdue surfacing consistency.
- **Planning Health/Applicability** — suppression correct but lives in two places (health rows + score exclusions). Next slice: unify applicability predicates into one set.
- **Decision Memory** — capture + prompt live-verified; payoff (rationale resurfacing) partially wired (Big Move H). Next slice: visible-payoff loop.
- **Vendor Intelligence** — readiness rollup + cockpit; zero cross-vendor sequencing (flagship audit); military categories missing. Next: ctx into Vendors + seed expansion (already queued).
- **Timeline/Day-Of** — effectiveRos solid; three sibling day-of surfaces await convergence review (parked ticket). Tests 6: thinner than CTA suites.
- **Human/Heart** — heart tier + experienceContext; only 7/11 proposed fields actually supported (ET-1) — Evidence 6. Next: expression-before-expansion annotations (DL-008), no new engine.
- **Communication** — planner-shell only; host shell intentionally has no comms tab (clamp). Tests 4. Verdict Local only until a host-facing comms need is proven.
- **Admin/Fleet** — cross-event attention works at 3 clients; scale unverified (HQ-3), Heart 2, Tests 4. Park expansion pending Planner Pro validation.

## 10+ Candidates (required review)

**Verdict today: NO engine has earned 10+.** Two are at "Yes" potential, six
at "Possible." 10+ is proof-gated, not average-gated — three engines average
9.0 and still do not qualify.

| Engine | Why it may be 10+ | Evidence | Missing proof | What makes it truly 10+ | Verdict |
|---|---|---|---|---|---|
| Vendor Brief Intelligence | Tokenized live brief with privacy-by-whitelist is genuinely differentiated — vendors see live truth without an account; hard to copy well | Prod live-verified mint/reuse/freshness/privacy/legacy (2026-07-06, f56753d); backend 97/97; whitelist audited both sides | Sustained real-vendor usage; share-channel/QR paths unverified; confirm-back adoption | Real vendors using briefs across several real events with zero privacy incidents and visible host time saved | **Possible — closest to proven** |
| Vendor Confirmation Intelligence | Closes the external loop: vendor replies become explicit host actions that self-clear — behavior change, not copy | 2A/2B-1 live-verified; idempotent rows; 22 lib tests; recompute-per-render self-clearing | The loop proven with REAL external vendors, consistently producing host action; attention surfacing (2B-2) parked | Evidence the loop reliably converts vendor replies into completed host actions in the wild | **Possible** |
| Event Readiness Core | Canonical, doctrine-tested, honest N/A handling | progressDoctrine/progressReadiness suites; PROGRESS-1/2 | Readiness scores are commodity SaaS; no evidence it changes host behavior; Heart 4 | Proof hosts act on it (readiness-to-action conversion) plus meaning-aware annotation (DL-008) | **Not yet** |
| Action Router / CTA Core | Every CTA lands exactly right — the "No Guesswork" spine | 29 route-contract tests; CTA-REPAIR-1 hard mode; live mobile verify | WhatCouldGoWrongPanel per-risk routing still parked = a visible imprecise CTA class remains; §6 anchor: any stale/broad CTA blocks 10+ | Zero imprecise visible CTAs anywhere + contract coverage for every emitter | **Not yet** |
| Place Intelligence Core | Clean one-core implementation, honest suppression, real CTAs | 15 contract tests; live-verified day one | One surface only (§6 anchor: single-surface engines are not 10+); no usage evidence | Consumed by Command/vendor briefs/guest comms from the same source, with behavior evidence | **Not yet** |
| Weather / Contingency Core | Real forecast to rain window to host plan to guest message is an unusually complete chain | 17 tests; prod-verified; real-forecast-only rules | Weather features are common; differentiation is the chain, unproven with real hosts; single-region evidence | Proof the chain changes outcomes (plans made earlier, guests informed) across event types | **Not yet** |
| Human / Heart / Moment Core | The genuine moat candidate — no competitor protects why the event matters | Heart tier + experienceContext; ET-1 honesty (7/11 fields) | §6 anchor: not 10+ until it VISIBLY changes experience; today it is mostly doctrine + one tier | Heart signals visibly reshaping actions/copy across surfaces (DL-008 annotations) that users notice | **Not yet** |
| Decision Memory Core | Remembered-why is rare in consumer planning tools | Capture + prompt live-verified | Payoff loop unbuilt — capture without resurfacing reads fake-smart, the opposite of moat | Rationales resurfacing at decision-relevant moments, visibly saving re-litigation | **Not yet** |

**Push toward 10+ next (ordered):** 1 Vendor Brief (close real-usage +
share-channel proof) · 2 Vendor Confirmation (real-vendor loop evidence) ·
3 Decision Memory payoff loop · 4 Heart visible annotations (DL-008) ·
5 Place multi-surface consumption. CTA Core joins the list the moment the
parked WhatCouldGoWrongPanel routing ships.

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
