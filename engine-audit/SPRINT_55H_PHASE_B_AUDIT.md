# Sprint 55H — Phase B Audit: Execution Visibility

*Intelligence gathering + architecture discipline. No build, no PR, no runtime change. Goal: find the smallest change that makes the Event Planner feel significantly more like an experienced planner — by routing authored-but-dark intelligence through surfaces that already exist (Pattern 006). Every claim is code-anchored.*

---

## Part 2 — Runtime audit (what already exists)

| Capability | Where it lives | State |
|---|---|---|
| **Execution intelligence** | `event.ros` — a live run-of-show array `{id, time, segment, location, type, owner, confirmed, notes}`, seeded by a *generic* "Event Day Schedule starter" (`App.js:~2170`, anchored on time-of-day: load-in / doors / etc.), rendered in the **Event Day Schedule tab** + the **Brief** (`brief.ros`, `App.js:6649`). | **Surface is LIVE; playbook content is dark.** The starter is generic — it never reads playbook `schedules`/`tasks`. |
| **Capacity intelligence** | `playbook.rentalsGap[]` (chairs/tables/plates/serveware w/ `qtyPerGuest`). The **Seating tab** manages guest seating. | **Authored but dark.** `getEventReadiness` has **4 axes** (decision/vendor/timeline/document — `CommandCenter.jsx:771`), **no capacity axis**. rentalsGap is never rendered. Parking/restroom not modeled at all. |
| **Infrastructure intelligence** | — | **Completely absent (DATA gap).** Extension cords, sterno fuel, thermometer, grill tools, etc. appear in **0** playbooks (per 55E). This is *not* a visibility problem — there is nothing to surface. |
| **Contingency intelligence** | `playbook.contingencies[]` + `playbook.risks[]`. `lib/severity.js` defines a canonical **`recovery`** tier (`SEVERITY_ORDER` ends in `recovery`). The cascade command already renders a `consequence` line. | **Authored but dark.** The recovery *render slot* exists (severity model + the gated `EventDayMode` graft), but nothing wires playbook contingencies to it. |
| **Day-of surface** | **Event Day Schedule tab** (live, `event.ros`). `components/EventDayMode.jsx` is a **gated Sprint-18B graft** ("the existing flow is untouched if the URL param is absent" — `EventDayMode.jsx:25`) — a design study, **not** the live day-of surface. | Use the **tab**, not the graft. |

**Outputs authored but invisible** (the dark set): playbook `decisions` (partially lit since 55G), `milestones`, day-of `tasks`, `schedules.{purchasing,preparation,setup,cleanup}`, `rentalsGap`, `risks`, `contingencies`, `knowledge`/`provenance`. The reader still consumes only `purchases` (+ the 55G decision gate).

---

## Part 3 — The darkest data (classification)

| Domain | Item | Status | Note |
|---|---|---|---|
| **Run-of-Show** | setup windows | **authored but dark** | `schedules.setup` (`T0 -3h` …) — not seeding `event.ros` |
| | cooking/prep windows | **authored but dark** | `schedules.preparation` + `tasks` w/ `when` |
| | guest arrival window | **partially modeled** | generic starter seeds "Doors / guest arrival"; not event-type-aware |
| | vendor arrival | **modeled (live)** | `vendor.arrivalTime` + `loadInOrder` feed the day-of view |
| | teardown / cleanup | **authored but dark** | `schedules.cleanup` (`T0 +4h` …); generic starter has no teardown |
| **Capacity** | chairs / tables / place settings | **authored but dark** | `rentalsGap[]` w/ `qtyPerGuest` — never rendered, no readiness axis |
| | parking | **completely absent** | only prose in graduation/bbq notes; no field, no signal |
| | restroom assumptions | **completely absent** | — |
| | venue limits | **partially modeled** | `event.venue` exists; no capacity ceiling field |
| **Infrastructure** | extension cords / power | **completely absent** | DATA gap (0 playbooks) |
| | propane / fuel | **partially** | BBQ only (`p_fuel`); absent elsewhere |
| | serving utensils | **partially** | rentalsGap notes; not a surfaced line; absent in Birthday |
| | coolers | **authored but dark** | rentalsGap (BBQ/Birthday) |
| | food thermometer / sterno / signage / trash systems | **completely absent** | DATA gap |
| **Contingencies** | weather / rain | **authored but dark** | `risks`/`contingencies` (all 5 playbooks model it) |
| | missing vendor | **partially modeled** | `vendor.backup` field exists (live data); not surfaced as a recovery |
| | equipment failure | **partially** | BBQ fuel only |
| | late guests / food shortage / alcohol shortage | **authored but dark / partial** | contingencies exist for some; no surfacing |

**Take-away:** Run-of-Show and Capacity are overwhelmingly **authored-but-dark** (a *routing* problem — Phase B). Infrastructure is overwhelmingly **completely absent** (a *data* problem — a later authoring sprint, explicitly **not** Phase B). Contingencies are authored-but-dark with a live render slot already present.

---

## Part 4 — Surface reuse analysis (no new pages/dashboards/command systems)

| Missing experience | Route through (existing) | Mechanism |
|---|---|---|
| **Run-of-show** (setup → cook → arrival → teardown → cleanup) | **Event Day Schedule tab** (`event.ros`) | Enrich the *existing* ROS starter so a playbook seeds real `event.ros` segments from `schedules`/`tasks` (`when` tokens → times). Same array, same tab, same renderer. |
| **"This-week" execution tasks** (prep/cook on T-1) | **Command Center** + **Client Event next action** + **Home Spine** | A new low-priority cascade tier (below the 55G decision/purchase tiers) surfaces the nearest dated execution task from `schedules`/`tasks` — same command shape, same surfaces. |
| **Capacity check** ("seating for 12 — chairs/plates/serveware?") | **Client Event next action / Command Center** (a candidate) **+ optional 5th readiness axis** | A single pre-event "confirm capacity" candidate derived from `rentalsGap` vs guest count. If promoted further, add `operational`/`capacity` as a 5th `getEventReadiness` axis (one readiness system, not two) — renders through the same HealthRow. |
| **Contingency / recovery** (rain plan, vendor backup) | **Home Spine / Command Center `consequence` line** (live) **+ Day-of recovery slot** (`severity.recovery`) | Attach the matching `contingencies[].plan` / `vendor.backup` to the existing `consequence` field when the risk's trigger window nears. Zero new structure. |

**Explicitly not recommended:** no new page, no new dashboard, no new command system, and **not** the gated `EventDayMode` graft (it's a design study, not the live surface).

---

## Part 5 — Phase B design (smallest implementation)

The single highest-leverage, lowest-risk move:

### Phase B.1 — Playbook-seeded run-of-show (the one that makes it *feel* like a planner)
Enrich the existing `event.ros` starter so that, for a playbook event, the ROS is seeded from the playbook's `schedules.{setup,preparation,cleanup}` + day-of `tasks` (`when` tokens → times anchored on the event's time-of-day). **Same field, same Event Day Schedule tab, same renderer** — the host opens a real, event-specific run-of-show (chill whites 3h out, plate appetizers at +0:15, post-party reset at +4:00) instead of a generic skeleton. Pure data → existing surface (Pattern 006). *No new UI.*

### Phase B.2 — Nearest execution task as a cascade candidate
Add a low-priority `category:'execution'` candidate (below the 55G decision tier and the purchase tier, above the generic calendar tier) that surfaces the nearest dated prep/cook/setup task from the playbook. Reuses the exact `selectEventNextAction` shape → reaches Home Spine + Command Center + Client Event identically (the 55G wiring already supports new categories via the delegate). *No new system.*

### Phase B.3 — Capacity candidate
A single pre-event "Confirm seating & serveware for N" candidate derived from `rentalsGap × guestCount`, surfaced as a Tier-5 operational-decision candidate. Optional later promotion to a 5th readiness axis. *No new readiness engine — extend the existing 4-axis structure if promoted.*

### Phase B.4 — Contingency on the consequence line
When a modeled risk's trigger window nears (e.g. outdoor event within 2 days), append the matching `contingencies[].plan` to the command's existing `consequence` text. *Data attach only.*

**Ship gate:** **B.1 alone** is the success condition — a first-time host begins seeing real execution/setup guidance through an existing surface. B.2–B.4 are independent follow-ons. **Smallest viable Phase B = B.1.**

**Success condition met (design):** execution + setup + capacity + contingency guidance all reach the host through the Event Day Schedule tab, the cascade, and the consequence line — no new complexity, no new surface.

---

## Part 6 — Dietary acknowledgement test

**1. How is dietary considered complete today?** (55G, `lib/playbooks/index.js` `dietaryResolved`) Resolved iff there's a guest list AND ≥1 guest has a recorded `needs` or a non-standard `meal`. Empty guest list → treated as resolved (nothing to collect from).

**2. Can "no restrictions" be distinguished from "not collected"?** **No — this is the flaw.** A party where the host asked and *everyone* is unrestricted looks identical to a party where the host never asked: zero recorded needs. The gate would nag "Collect dietary restrictions" forever on a legitimately allergy-free event.

**3. Smallest acknowledgement model possible?** One per-event signal: `dietaryConfirmedAt` (timestamp) — set by an existing Guests-tab action ("Dietary collected — none / recorded"). One field, no new surface, no new engine.

**4. Can it be inferred?** **Partially, with no new data:** tie dietary-collected to the *same* signal as final headcount — RSVPs reconciled (no pending Maybes). Rationale: a host who has closed RSVPs has, in practice, asked dietary. This reuses the 55G `guestCountResolved` signal and eliminates the false-positive at zero data cost — but it's an *inference* (a host could close RSVPs without asking dietary).

**5. Does it require data?** The robust version requires **one boolean/timestamp** field. The inferable version requires **none** (reuse RSVP-reconciled state).

**Recommendation: TEST.** Build the smallest acknowledgement — a single `dietaryConfirmedAt` set from the existing Guests tab — but validate the trigger with a real host before committing, because the choice between *explicit toggle* and *infer-from-RSVP-close* is a genuine UX judgment. **Interim, ship-safe mitigation (no new data):** soften the gate to also treat "RSVPs reconciled" as dietary-collected, so an allergy-free event stops nagging immediately. The current gate already degrades safely (soft, food-only, playbooks that model dietary), so this is not urgent — but the false-positive is real and TEST is the right call.

---

*Audit only — nothing built or changed.*
