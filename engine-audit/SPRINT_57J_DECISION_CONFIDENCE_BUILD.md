# Sprint 57J — Decision Confidence Reader (build)

*Judgment Intelligence, NOT a new engine. Pure reader over EXISTING resolvers — no new readiness math, no persisted field, no inferred state. Feature flag `pi.decisions`, default OFF = production identity. Date: 2026-06-18. Branch: `sprint-57j-decision-confidence`.*

## Core principle
Decision Confidence answers ONE question per decision: **"do we have enough information to LOCK this?"** — never "is it the perfect / correct / successful decision." It moves NGW from task guidance to **planner judgment**.

## Deliverable 1 · `decisionConfidence` reader (`src/lib/decisionConfidence.js`)
`decisionConfidence(event, readiness) → [{ key, label, state, confidence, reason, blockers, primaryAction }]`. States: `ready_to_lock · gathering · blocked · overdue · locked · unknown`. `readiness` = the existing `getEventReadiness(event)`, passed in (lib stays free of the CommandCenter module). Reuses **existing resolvers only**:
| Decision | Resolver reused | States produced |
|---|---|---|
| **Guest Count** | `guestCountResolved()` (now exported, behavior unchanged) | resolved → `ready_to_lock`; pending → `gathering` ("Waiting on N RSVPs") |
| **Seating** | `g.table` over confirmed guests + guest-count prereq | unresolved count → **`blocked`** ("Seating depends on the final guest count"); all seated → `ready_to_lock`; else `gathering` |
| **Vendors** | `getEventReadiness().vendor` | `ON_TRACK` → `ready_to_lock`; else `gathering` (no fabricated overdue) |
| **Timeline** | `getEventReadiness().timeline` | `ON_TRACK` → `ready_to_lock`; note contains "overdue" → `overdue`; else `gathering` |
| **Staffing** | `summarizeCrew()` | all confirmed → `ready_to_lock`; else `gathering`; **skipped entirely when unstaffed** (host events) |
No parallel readiness math; no new vendor/timeline logic.

## Deliverable 2 · Placement implementation
A **"Decisions" block in the Overview action column, directly under Needs You** (and after "You're Set On"), in **both** `MobileCommandCenter` and `DesktopCommandCenter`. **Judgment, not a checklist:** the render shows only decisions you can act on — `ready_to_lock`, `blocked`, `overdue` — plus **Guest Count always** (the headline). Pure in-progress `gathering` rows for the others are suppressed. **Because it lives in the action column (not the desktop-only rail), it reaches mobile** — directly narrowing the 57I mobile-parity gap.

## Deliverable 3 · Persona copy (reuses `audiencePersona`)
Only the "ready" line + lock verb change by persona; reasons/blockers are factual and shared:
| | Host | Operator | Planner |
|---|---|---|---|
| Ready line | "You have enough to decide." | "Ready for sign-off." | "Decision ready." |
| Lock verb | "Lock it" | "Confirm" | "Lock" |
*Host + planner are live today; **operator activates when `organization → operator` lands (PR #52)** — its copy is authored + unit-tested now.*

## Deliverable 4 · Deferred decision handling
`DEFERRED_DECISIONS = ['budgetApproval', 'venue', 'menu']` are **intentionally NOT emitted** — their state (budget *adequacy*, venue *lock*, menu *finalization*) is not persisted/observable, so claiming "ready" would invent certainty (**AP-005**). The reader omits them entirely (absent ≠ ready); a unit test asserts none ever appear, even on an event with `venue`/`budgetApproved`/etc. set. No inference, no new fields.

## Deliverable 5 · QA report (puppeteer, dev runtime · screenshot-verified)
| # | Check | Result |
|---|---|---|
| 1 | Flag OFF = no Decisions block (production identity) | **PASS** |
| 2 | **Guest count unresolved** ⇒ "Still gathering… Waiting on N RSVPs" | **PASS** |
| 3 | **Seating blocked by guest count** ("depends on the final guest count") | **PASS** |
| 4 | **Guest count resolved** ⇒ "You have enough to decide" (host); seating no longer blocked | **PASS** |
| 5 | Planner copy ⇒ "Decision ready" | **PASS** |
| 6 | **Mobile 390** ⇒ block renders (reaches mobile) | **PASS** |
| 7 | Operator copy | authored + unit-tested; runtime activates with PR #52 |
| 8 | Vendor readiness / Timeline overdue / Staffing scenarios | unit-tested (deterministic) |
| 9 | Deferred (budget/venue/menu) never shown as ready | unit-tested |
| 10 | No console / page errors | **PASS** |
| 11 | Desktop 1440 | **PASS** |
| 12 | Tests | **162/162 PASS** (incl. 13 new) |
| — | Build compiles (+577 B); `guestCountResolved` logic 0-diff (export only); engine/playbook 0-diff | **PASS** |

## Deliverable 6 · Screenshots (`demo/review-artifacts/`)
`57j_flagOFF_1440.png` (no block) · `57j_host_natural_1440.png` (**Guest count = Gathering "Waiting on 1 RSVP" · Seating = Blocked**) · `57j_host_ready_1440.png` ("You have enough to decide") · `57j_planner_ready_1440.png` ("Decision ready") · `57j_host_ready_390.png` (mobile).

## Deliverable 7 · Test report
`decisionConfidence.test.js` — 13 tests: flag gate · guest-count resolved/unresolved · seating blocked-by-prereq / ready / gathering · vendor ON_TRACK vs gathering · timeline overdue · staffing skip-when-unstaffed / confirmed / needs-confirmation · deferred-never-emitted · per-persona copy · null-safety. Plus `guestCountResolved` export — full suite **162/162**.

## Deliverable 8 · Merge recommendation
**APPROVE — merge-ready, hold for review.** A small, flag-gated (default-OFF) judgment reader that reuses the existing resolvers verbatim (engine/readiness/playbook/route/quantity 0-diff; `guestCountResolved` export-only). It honestly degrades to "gathering/blocked" where state isn't observable and **never** emits the deferred decisions (AP-005). It answers the success condition — *"You have enough information. Lock the guest count."* / *"Still gathering responses — wait on 1 RSVP."* — without a new engine or invented certainty, and **it reaches mobile**. Ship with the PI stack, flags OFF; enable for staged cohorts.

## Success condition — met
NGW now says, in the host's own words and on mobile too: **"Still gathering responses. Waiting on 1 RSVP."** and (once RSVPs are in) **"You have enough to decide."** — with Seating correctly **blocked on the guest-count prereq**. The product moved from task guidance to planner judgment, on the same engine, with no invented certainty. *Expression over expansion.*

*Confidence: High — every state traced to an existing resolver (`guestCountResolved` playbooks/index.js, `getEventReadiness` CommandCenter.jsx, `summarizeCrew` studioTeam.js, seating `g.table`) and screenshot-verified. The deferred set is structurally excluded. Weakest point: operator runtime copy is gated on PR #52's organization→operator remap (authored + unit-tested here; conflict-free).*
