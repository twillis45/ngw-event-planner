# Phase 5 -- Activation & Behavior Validation Plan

**Date:** 2026-08-01 - **Repo:** `ngw-event-planner` - **Branch:** `product/decision-soundness-p0`
**Method:** source census of every analytics declaration and emission site, deployment-config
review, and live first-run drive of the built shell. No production behaviour changed.

---

# Executive Summary

**NGW cannot currently answer "does this improve host outcomes?", and the blocker is not
missing intelligence or missing instrumentation design. It is that the deployed product has
no accounts, and the activation funnel is wired into the shell that was frozen.**

Three measured facts decide this sprint:

1. **55 analytics events are declared. The live shell emits 6.** Three are the Reasoning
   Continuity events; three are lodging. 21 more are emitted only by `src/App.js` -- the CRA
   shell frozen as donor-only on 2026-07-16 and scheduled for deletion. **28 are emitted by
   neither shell.**
2. **9 of the 12 activation-funnel stages emit from nowhere at all** -- including
   `SIGNED_UP`, `INTAKE_COMMITTED`, `FIRST_VALUE`, `PAGE_VIEW` and `EVENT_OPENED`. The three
   that do emit (`EVENT_CREATED`, `ACCOUNT_TYPE_SELECTED`, `HOST_NEXT_STEP_CLICKED`) fire
   only from the frozen shell.
3. **The deployed build has no authentication.** `pages-from-source.yml:73-74` forces
   `REACT_APP_SUPABASE_URL` and `_ANON_KEY` to empty strings unless
   `release_profile == 'live'`. There is no signup, therefore no account, therefore no
   returning user and no cohort. PostHog itself *is* configured on the public deploy
   (`:78-79`), so the pipe is open -- there is simply nothing upstream of it.

The reasoning funnel (`reason_shown` -> `row_with_reason_clicked` ->
`action_completed_with_reason`) is correctly built and verified end to end. It measures the
**middle** of the journey. Everything before it -- arrival, signup, intake, first
recommendation -- is unmeasured on the shell that ships.

The honest position: NGW has built a decision system whose quality is verifiable by
inspection and whose *usefulness* is entirely unevidenced. No claim of host value can be made
today, in either direction.

**Recommendation: TEST.**

---

# Current Product State

| | |
|---|---|
| Live host shell | `demo/hostv2/` (`HostShellV2.jsx`) |
| Legacy shell | `demo/src/App.js` -- FROZEN donor-only, 2026-07-16, deletion scheduled post-Sprint-2 |
| Deployed at | GitHub Pages, demo profile |
| Auth on deploy | **none** (Supabase values forced empty) |
| Analytics on deploy | PostHog configured and delivering |
| Sample corpus | 26 events, dates rebased to a fixed anchor (2026-07-31) |

---

# Completed Capabilities

Verified this cycle, by test gate and live DOM:

- Deterministic reason generation -- no model in the path; every string is a projection of an
  authored or engine field (`actionReason.js`).
- Explanation ownership -- seven explanation surfaces mapped; six with clean ownership.
- Time-status vocabulary -- one owner (`timeStatusLabel.js`) for four labels previously
  generated in three places.
- Verdict ownership -- the one item-level verdict (V1) suppressed when the hero already
  states the urgency; event-level verdicts (V2-V6) preserved.
- Solemn suppression -- field-blind, at a single exit; verified 0 time-pressure reasons on
  solemn events.
- Completion tracking -- queue-departure diff, with `snoozed` separated from `left_queue`.
- PostHog delivery -- confirmed in the production project by the host.

**All of this is capability evidence. None of it is value evidence.**

---

# Activation Funnel

Confidence = how much the current build can tell us about this stage today.

| Stage | Exists in live shell? | Instrumented | Emitted from | Confidence | Effort to close | Importance |
|---|---|---|---|---|---|---|
| Landing | Yes -- welcome screen | No (`PAGE_VIEW` unwired) | nowhere | **None** | S | High |
| Signup | **No -- no auth on deploy** | `SIGNED_UP` declared | nowhere | **None** | L (needs auth) | **Critical** |
| Create event | Yes | `EVENT_CREATED` | **frozen CRA only** | **None** | S | **Critical** |
| Complete intake | Yes | `INTAKE_COMMITTED` declared | nowhere | **None** | S | High |
| See first recommendation | Yes | `FIRST_VALUE` declared | nowhere | **None** | S | **Critical** |
| Open recommendation | Yes | `row_with_reason_clicked` | **hostv2 LIVE** | **Good** | -- | High |
| Complete first action | Yes | `action_completed_with_reason` | **hostv2 LIVE** | **Good** | -- | **Critical** |
| Return session | Yes (localStorage) | none | nowhere | **None** | M (needs identity) | **Critical** |

## Evidence

```
declared events            : 55
emitted by hostv2  (LIVE)  :  6   reason_shown, row_with_reason_clicked,
                                  action_completed_with_reason,
                                  lodging_paste_attempted, lodging_paste_parsed,
                                  lodging_option_added
emitted by App.js (FROZEN) : 21
emitted by NEITHER         : 28
```

## Gaps

**G1 -- No identity, so no funnel and no retention.** Without auth there is no stable user,
so "return session" is unmeasurable and every other stage is an anonymous count. This is a
prerequisite, not an instrumentation task.

**G2 -- The funnel is instrumented in the wrong shell.** `EVENT_CREATED`,
`ACCOUNT_TYPE_SELECTED` and `HOST_NEXT_STEP_CLICKED` fire from `src/App.js` only. When the
CRA is deleted, the funnel loses three more stages. The events exist; the wiring points at a
corpse.

**G3 -- First-value is undefined in code.** `FIRST_VALUE` and `EVENT_QUALIFIED` are declared
and never emitted, so "the host reached a recommendation" has no operational definition.

## Recommendations

Ordered by dependency, not by appeal. Each is a *proposal*, not an approved change:

1. Decide whether the validation cohort runs on an authenticated build (`release_profile:
   live`) or on the anonymous demo. This decision gates everything else.
2. If authenticated: wire `SIGNED_UP`, then `EVENT_CREATED` and `FIRST_VALUE` **in hostv2**,
   not in the CRA.
3. Define `FIRST_VALUE` operationally -- the most defensible candidate is the existing
   `reason_shown` guard, which already means "the host could see a recommendation".

---

# Existing Analytics

Unchanged, and not to be changed:

```
reason_shown
row_with_reason_clicked
action_completed_with_reason
```

All three carry `event_type`, `days_out`, `is_solemn`, `is_destination`, `runway_bucket`
from one producer (`analyticsContext.js`), with honest nulls. Completion additionally
carries `gate_holder`, `unlocked_count`, `resolution`, `completed_at`.

## The three formulas -- computable, but not yet answerable

| Metric | Formula | Status |
|---|---|---|
| Adoption | `row_with_reason_clicked / reason_shown` | Computable. **No cohort.** |
| Completion | `action_completed_with_reason / reason_shown` | Computable. **No cohort.** |
| Reason effectiveness | segment by `reason_type`, `reason_source`, `reason_confidence`, `event_type`, `runway_bucket`, solemn, destination | Segmentable. **No cohort.** |

**No values are stated here.** The only events in the production project today originate
from instrumentation verification, not from hosts. Reporting a rate from that population
would be inventing a metric.

## Two structural caveats that will bias the first cohort

- **No control arm.** Rows without reasons emit nothing, so a difference in completion
  cannot be attributed to the reason. "Reason-backed rows complete more often" is currently
  untestable, not merely unmeasured.
- **No client timestamp on impression or click.** Only completion carries one, so
  time-to-completion is an approximation against ingestion time.

---

# Missing Measurement

| Missing | Consequence | Effort |
|---|---|---|
| Identity / session continuity | No retention, no funnel, no cohort | L |
| `PAGE_VIEW` in hostv2 | Arrival is invisible | S |
| `EVENT_CREATED` / `FIRST_VALUE` in hostv2 | Cannot tell if a host ever reached a recommendation | S |
| Control arm for unreasoned rows | Reason effect not attributable | M |
| Client timestamp on impression | Time-to-value approximate | S |
| Row position on click | Cannot separate "position 1" from "had a reason" | S |

---

# Behavioral Hypotheses

**None of A, B or C can be distinguished today.** Each requires funnel data that does not
exist. Stating a preference between them now would be assumption presented as analysis.

| | Hypothesis | What would confirm it | Available? |
|---|---|---|---|
| **A** | Workflow -- hosts understand, need execution support | high `reason_shown`, high click, low completion | Partially -- the middle funnel exists; the denominator (did they arrive?) does not |
| **B** | Activation -- value not understood fast enough | signups exist, events created, recommendations rarely viewed | **No** -- no signup, `EVENT_CREATED` unwired in the live shell |
| **C** | Trust -- recommendations seen, not acted on | reasons viewed, low completion | Partially -- same missing denominator as A |
| **D** | Collaboration -- needs stakeholder coordination | repeated user requests, measured friction | **No evidence of any kind.** No user requests recorded, no friction measured |

**Hypothesis D should not be built against.** The rule in the brief is explicit and the
evidence base is empty.

**A structural observation, offered as an assumption and not a finding:** B is the only
hypothesis whose *prerequisite* is provably absent from the deployed product -- a host cannot
fail to activate through a signup that does not exist. That makes B the cheapest to falsify
first, which is a sequencing argument, not evidence for it.

---

# Validation Plan

## Cohort

Not developers. Not anyone who has seen the product.

| Segment | Target n | Why |
|---|---|---|
| Family / milestone organisers | 4-8 | The core persona the playbooks are authored for |
| Retirement / anniversary planners | 3-5 | Longest runway; tests the calm end |
| Wedding planners | 3-5 | Highest complexity, most vendors |
| Repast / solemn organisers | 2-3 | Tests the suppression work under real emotional load |

**Minimum 10. Preferred 25-50.** Below 10, segment-level reason-type analysis is not
meaningful and should not be attempted.

## Protocol

1. **Unmoderated first-run, 10 minutes.** Host arrives cold, no explanation. Screen recorded.
2. **Task:** plan a real event they are actually hosting. Not a scenario.
3. **Moderated follow-up, 20 minutes:** what did you think it was for, why did it recommend
   that, would you have done it anyway, would you come back.
4. **Return trigger at 72 hours** -- no prompt, no email. Whether they return unaided is the
   retention signal.

## What to measure

Behavioural (from PostHog, existing events only):
- reached first recommendation (`reason_shown` fired at least once)
- opened a reason-backed row
- completed a reason-backed action, with `resolution`
- returned in a second session

Qualitative (from the sessions):
- confusion points, timestamped
- stated reason for trusting or ignoring a recommendation
- willingness to use again, and for what

---

# First-Run Experience Audit

Driven live on the built shell. **This is expert heuristic review, not user evidence** -- the
scores are my judgement and must not be reported as validated.

First screen, verbatim:

```
WELCOME TO EVENT BOSS
The whole event, one plan
Tell it what you're hosting. It builds the rest.
[ Start my event ]  [ Explore a sample first ]
The sample's a demo -- yours starts fresh.
```

| Category | Score | Basis |
|---|---|---|
| Clarity | **7** | "The whole event, one plan" states the category; "It builds the rest" states the mechanism. Does not say what it will *do* first. |
| Trust | **4** | Nothing on the first screen explains where recommendations come from. Grounding exists deep in the product and is invisible at entry. |
| Speed to value | **8** | The sample path reaches a fully-populated command board in one tap; a real recommendation with evidence is on screen in seconds. |
| Confidence | **5** | The hero states one act and pre-proposes a fix, which is strong. But the host has given nothing yet, so the recommendation's authority is unexplained. |
| Next-action clarity | **8** | One primary ask, named as an act ("Pay your caterer.", "Ask Fired Up BBQ about insurance."), with a settle control directly beneath. |

**Does the host know why to return?** Weakest answer of the five: nothing on the first run
establishes a reason to come back. There is no commitment, no saved state the host is aware
of, and no next-session hook. This should be an explicit question in the moderated follow-up
rather than a design change made now.

---

# Success Criteria

**Deliberately unnumbered.** There is no baseline, so any target would be invented. These
define *what counts as the outcome*; the thresholds get set after the first cohort.

**Activation**
- The host reaches a first recommendation without assistance.
- The host completes one meaningful action in the first session.

**Trust**
- The host can state, unprompted, why the system recommended what it did.
- The host accepts a recommendation without needing to verify it elsewhere.

**Retention**
- The host returns in a second session without a prompt.

**Anti-criteria -- outcomes that would falsify the current direction**
- Hosts reach recommendations and consistently ignore them -> the reasoning is not the
  bottleneck, and further reasoning work is wasted.
- Hosts cannot say what the product is after 60 seconds -> activation, not intelligence.
- Hosts complete actions but do not return -> the product is a one-shot utility, not an
  operating system.

---

# Decision Framework

| If the first cohort shows | Then the bottleneck is | Next sprint |
|---|---|---|
| Hosts do not reach a first recommendation | Activation (B) | Onboarding and first-value definition |
| Hosts reach it, do not open reasons | Presentation | Explanation surfacing |
| Hosts open reasons, do not complete | Trust (C) | Grounding and provenance surfacing |
| Hosts complete, do not return | Retention | Session hooks, not intelligence |
| Hosts complete and return | The system works | Expand coverage |

---

# Next Sprint Recommendation

## TEST

**Why not EXECUTE:** there is no behavioural evidence for any hypothesis. Building against A,
B, C or D today would be building against a guess. The one hypothesis with a provably absent
prerequisite (B -- there is no signup) is a sequencing observation, not a mandate.

**Why not PARK:** the blocker is cheap and known. Two decisions and a small amount of wiring
stand between here and real data -- and the middle of the funnel is already instrumented and
verified.

**Why not KILL:** the capability work is sound and independently verified. Nothing measured
this cycle suggests the direction is wrong; it suggests it is unproven.

**The smallest step that makes the next decision possible:**

1. **Decide the cohort surface** -- authenticated build, or anonymous demo with a weaker
   retention signal. This is a product decision and gates everything.
2. **Recruit 10.** Not developers, not anyone who has seen it.
3. **Run the protocol above.** Change nothing in the product first -- the point is to measure
   what exists, and every pre-emptive fix destroys the baseline.

**Do not, before that data exists:** expand reason coverage, wire decision memory into the
engine, build a control arm, or act on the 4-of-6 cross-workstream verdict observation. Each
is defensible in isolation and unfounded today.
