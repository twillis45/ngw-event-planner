# Sprint UX-4 — Disclosure Architecture & Stage-1 Subtraction · Final Report

**Date:** 2026-06-18 · **Branch:** `main` @ `e64c613` · Suite **250/250** · build compiles.

A visibility system, not a planning engine. One small resolver + a large amount of
subtraction. No locks, no gates, no completion thresholds, no new planning logic.

## 1. Files created
- `src/lib/disclosure.js` — `VIS` enum, `eventStage`, `sectionVisibility` (the resolver),
  `isDormant`, `upcomingRail`. Pure functions; no state/persistence/migration.
- `src/lib/__tests__/disclosure.test.js` — 11 guardrail tests.

## 2. Files modified
- `src/CommandCenter.jsx` — replaced ad-hoc `hideEmpties` guards with `!dormant(section)`
  (Needs You / Next Up / Vendors / Documents / Planning Health), added the `UpcomingRail`
  component + rail render in both mobile and desktop layouts. `sig`/`dormant`/`rail`
  computed once and threaded via props.
- `src/App.js` — `HostHome` Upcoming Rail between "What Matters Most" and "View Event Day".

## 3. Resolver implementation (the whole decision, in one place)
```
sectionVisibility(section, event, signals):
  if section.always        → its level (Primary/Standard), escalate to Primary on urgency
  if plannerPersona        → urgent ? PRIMARY : STANDARD     // never Dormant
  if urgent                → PRIMARY
  if hasData               → STANDARD                        // populated never dormant
  if familyRelevant        → STANDARD
  if dateRelevant          → STANDARD
  else                     → DORMANT                         // → Upcoming Rail (reachable)
```
Priority is fixed: **persona > urgency > data > family > date > stage.** Stage is the
weakest signal and is never consulted by the resolver directly — reality overrides it.
Visibility is *never* a function of completion %. The "started" signal for date-relevance
is `guests | named vendors | documents` — kit-seeded timeline/budget are scaffolding, not
host progress, so a freshly-created event stays minimal.

## 4. Deleted / relocated surfaces (the product is the subtraction)
For a brand-new host event these no longer render as empty cards — they become **Dormant**
and relocate to the **Upcoming Rail** (Vendors · Food & drinks · Paperwork), or simply don't
appear until they have data:
- Empty **Decisions / Approvals / Requests** ("Needs You" queue) → gone (no "nothing needs you")
- Empty **Vendors** → rail ("Available when planning begins")
- Empty **Documents / Paperwork** → rail ("Contracts & files land here")
- Empty **Planning Health / Readiness Grid / Capacity / Reality Check** → gone
- **Food & drinks** → rail ("We'll help with this after guests")
No placeholders, no explanatory shells. **Nothing is Hidden/Locked** — every dormant section
is one tap away via the rail or its (still-reachable) route.

## 5. Day-1 interface (Deliverable 6 — verified)
A newly-created host event shows exactly: **Event Summary · Next Step · What Matters Most (if
present) · Upcoming Rail · View Event Day.** Screenshot: `review-artifacts/ux4_hosthome_clean.png`.

## 6. QA evidence (the 8 scenarios)
| # | Scenario | Result |
|---|---|---|
| 1 | Brand-new event | Day-1 interface; empty cards gone; rail = Vendors/Food & drinks/Paperwork ✓ (live, mobile) |
| 2 | Partially planned (has a vendor) | Vendors STANDARD, leaves the rail ✓ (unit test + resolver) |
| 3 | Near-event | date-relevance surfaces vendors once host-started ✓ (resolver) |
| 4 | Completed | `eventStage='complete'` ✓ (unit test) |
| 5 | Host persona | Upcoming Rail present ✓ (live) |
| 6 | Planner persona | no rail, full cockpit unchanged ✓ (live, desktop) |
| 7 | Mobile (390) | Host Home + CC rail render, 0 overflow ✓ (live) |
| 8 | Desktop | CC right-rail + Upcoming Rail render ✓ (live planner) |

Guardrail tests (Deliverable 8) — 11 passing — fail if: populated content goes Dormant,
planner sees Dormant, a Hidden/Locked state appears, visibility keys on completion %, or
stage overrides real data.

## 7. Instrumentation (Deliverable 7)
All target events already fire and are observable on localhost via the dev tap
(`window.__NGW_TRACK__`): `signed_up` (account_created), `event_created`, `intake_committed`,
`first_value`, `host_home_viewed`, `host_next_step_clicked` (next_step_clicked). The funnel is
ready to compare *current vs disclosure* with the first real host cohort — the before/after
activation lift can't be measured in-dev (no real traffic), but the measurement is wired.

## 8. Risks
- **Date thresholds are heuristics** (vendors ≤60d, food ≤14d). May need tuning against real
  usage; they're one-line edits in the section registry.
- **Minor redundancy:** "Food" appears both as a Progress dimension and as a rail section.
  Acceptable (different jobs), flag for polish.
- **Out-of-scope leak (not UX-4):** the post-create *success* modal still offers planner
  options ("send it to the client", "Add client") to a host — a separate front-door fix.
- **Resolver is the single seam:** a future section must be added to the registry to be
  governed; an unregistered section defaults to STANDARD (never hidden) — safe by design.

## Recommendation
**Ship.** The architecture meets every non-negotiable rule, the suite is green, and a
brand-new host event is materially smaller (operational cockpit → Day-1 essentials + a quiet
rail). Validate the activation lift with the first host cohort using the now-wired funnel.

**Stop after UX-4.** No additional intelligence work — the resolver is small, the deletions
are the product.
