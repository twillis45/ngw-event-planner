# Decision Engine + Task Coverage — audit

Date: August 21, 2026. Report only; no source file was modified.
HEAD at time of measurement: `76cc7a76` (`main`, local).

Host's question, verbatim: *"do an audit of where we are with decision engine
work and plan task. I want to make sure that all the tasks needed for the day
are being covered."*

Two questions, answered separately below. Part B carries the weight.

Everything numeric here was produced by running the corpus and the engines
against the shipping fixtures through esbuild-bundled imports (the same loader
`scripts/groundingCensus.mjs` uses). Nothing is inherited from the prior scoring
docs except where explicitly marked "unchanged".

---

## VERDICT

**The engine.** It stands at **42/50** and that number is still correct:
Grounding 9, Coverage 8, Prioritization 8, Adaptivity 8, Honesty 9. Nothing has
moved since the 2026-08-18 pass recorded in
`2026-08-17_DECISION_ENGINE_RESCORE.md`; the sessions since have gone into
security, admin, desktop parity, vendors and motion. Two claims in that document
that were flagged "verify per-shell" now verify: the `hostExperience` /
`hostCapacity` intake control is real and reachable
(`hostv2/src/HostShellV2.jsx:14911-14928`), and `vendor-unbooked` genuinely
raises. The single most important remaining gap for the engine is not a
dimension at all: **`playbookMilestones` and `playbookTasks` are finished
engines that hostv2 never imports**, so the ownership axis ("who does what") and
the dated buy-task ladder exist in the corpus and reach no host.

**Task coverage.** Coverage of *the day itself* is the strong part of this
product and should be left alone: every one of the 39 playbooks authors a
five-bucket day (`purchasing | preparation | setup | program | cleanup`, 783
authored rows, average 20.1 per playbook), the run-of-show reader consumes all
five, and the host sees setup, the event, and teardown in one time-sorted spine.
Coverage of the *planning* run is where it breaks, in two specific ways, and the
second is the dangerous one. First: **9 of 48 event types in the taxonomy have
no playbook at all** — a new Town Hall, Product Launch, Award Ceremony, Client
Dinner, Fundraiser/Gala, Networking Event, Training/Workshop, Wellness Retreat
or "Other" produces **zero tasks, zero run-of-show, zero decisions, zero risks,
zero raises**. Second, and this is the single most important gap in the whole
audit: **the host checklist is a snapshot frozen at event creation.**
`event.timeline` is seeded once from `playbookChecklist()` at
`hostv2/src/HostShellV2.jsx:6077` and is never reconciled again. Every gate
inside `playbookChecklist` — the caterer lever, `whenChoice`, `whenKids`,
`isDestination` — exists to make a later decision reshape the task list, and in
the shipping shell none of them can, because the list was written before the
decision was made. The app is silent about the tasks a host's own choices
create.

---

## PART A — the decision engine

### Per-dimension standing

| Dimension | Score | Evidence (measured this pass) | Remaining lever |
|---|---|---|---|
| Grounding | 9 | Unchanged. `classifyClaim()` over both provenance slots: 494/548 purchases host-visible sourced (90.1%). 23 of the 54 remaining are exempt by the cultural-basis ruling in `src/lib/claimBasis.js`, not by omission. | A product ruling on whether a dual-axis, well-cited cultural item may ever read as "sourced". Research budget cannot move it; the rule can. |
| Coverage | 8 | Unchanged. `playbookDecisionBoard` (`src/lib/playbooks/index.js:2563`): floor of 3 open decisions, average 5.3, zero empty boards from T-45 inward (`2026-08-18_COVERAGE_BOARD.md`). Corpus re-measured today: 220 decisions, min 3, max 9 across 39 playbooks. | Authored early-window calls on the small-event playbooks, so T-60 offers the two or three cheap-now/expensive-later calls instead of an honest "comes up closer". |
| Prioritization | 8 | Unchanged. `vendor-unbooked` declares `gateHolder: true, unlocks: 0` in `src/lib/surfaceRegistry.js`; re-verified live today on `ev-dmv-wedding`, which raises 25 items including 10 `vendor-conflicts` and 2 day-of arrival collisions. | `vendor-coi` is the one producing surface still declaring no consequence, correctly left uninvented pending a board ruling on what a missing COI blocks. |
| Adaptivity | 8 | Unchanged, and the July "dead wire" is now genuinely closed: the experience/capacity control renders at `hostv2/src/HostShellV2.jsx:14911-14928` and `playbookDecisionBoard` returns `hostExperience`, `hostCapacity`, `hostAdaptation`, `focus` (verified in the returned object). | Longitudinal momentum across sessions. `computeMomentum` exists (`src/lib/playbooks/index.js:3244`) but there is no session-history store to feed it — a storage/schema/retention decision, not a tuning pass. |
| Honesty | 9 | Unchanged. Seven enforcement gates green. Verified today that the engine still refuses to invent: `playbookRunOfShow` emits `time: null` + a relative label when the host gave only a time-of-day bucket (`src/lib/playbooks/index.js:1562` onward), and the derived default start time is explicitly excluded from `anchorSource: 'exact'`. | The same 11% of purchases that cap Grounding cap this. One label class, one fix. |

**Total: 42/50 — unchanged since 2026-08-18.** No dimension moved. That is an
accurate report of where the work went, not a regression.

### Built and wired vs. built and dormant

Checked against the shell rather than the engine index, because this project has
credited engine work that never reached runtime before.

**Wired and rendering:**

- `effectiveRos` / `playbookDuringCues` — `HostShellV2.jsx:116` imported,
  rendered at `:10182-10184` (full agenda), `:9908-9915` (live NOW card),
  `:10364-10385` ("All through the day"), `:18927-18952` (print sheet).
- `playbookDecisionBoard`, `playbookRisks`, `playbookFoodPlan`,
  `playbookCapacity`, `playbookHeartMoments`, `computeMomentum` — imported at
  `:116` and consumed.
- `raiseCounts` (`src/lib/surfaceRegistry.js:1161`) — `:6346`, badges at
  `:9722-9787`.
- `eventPlan().nextActions` — `:1576` to `:2942`, ask/queue cards `:8228-8296`.
- `computeDayAlerts` — `:6338`, rendered `:9888-9893`.
- `deriveEventPhaseProgress`, `buildDayBeforePlan`, `vendorObligations`,
  `checklistRouteFor`, `taskLeadDays` — all render.
- The experience/capacity profile control — `:14911-14928`.

**Built and dormant in hostv2:**

- `playbookMilestones` (`src/lib/playbooks/index.js:2177`) — **not imported by
  hostv2.** Its single consumer is `playbookAreaNextStep` at `:2218`. This is
  where the corpus's ownership data lives: 382 authored milestones, **52 of them
  owned by someone other than the host** ("grill master", "planner", "couple").
  None of that reaches a host-facing surface.
- `playbookTasks` (`:1135`) — the dated buy ladder. **Not imported by hostv2**;
  zero call sites in the shell.
- `taskSatisfied` (`src/lib/taskEngine.js:35`) — hostv2 imports only
  `effectiveDone` (`HostShellV2.jsx:102`).
- `taskIsOverdue` — imported at `:78`, no call site.
- `playbookDayOfChecklist` (`:2156`) — imported by `src/App.js:39` (the frozen
  CRA donor) and **not by hostv2**.

---

## PART B — the coverage test

### What the corpus actually contains

Authored playbooks. Not generated, not inferred from event type at runtime, not
LLM-produced. Measured over `src/lib/playbooks/data/` (39 files):

| Slot | Total | Avg / playbook | Min | Max |
|---|---|---|---|---|
| `tasks` (planning checklist source) | **488** | 12.5 | 7 | 26 |
| `milestones` | 382 | 9.8 | 6 | 17 |
| `decisions` | 220 | 5.6 | 3 | 9 |
| `vendors` | 197 | 5.1 | 2 | 13 |
| `risks` | 263 | 6.7 | 4 | 12 |
| `purchases` | 544 | 13.9 | 7 | 25 |
| `schedules` rows (all buckets) | **783** | 20.1 | 15 | 30 |
| of those, day-buckets (`setup`+`program`+`cleanup`) | **278** | 7.1 | 4 | 12 |

Bucket shape is near-uniform: 37 of 39 playbooks use exactly
`purchasing | preparation | setup | program | cleanup`; `dinnerParty` swaps
`preparation` for `cooking`; `teamRetreat` adds `agenda` for multi-day.

Two projections turn that corpus into host-facing tasks:

- `playbookChecklist(event, asOf)` — `src/lib/playbooks/index.js:949`. Projects
  the authored `tasks[]` into checklist rows, applying four gates:
  `choiceShown` (`whenChoice`), `modeShown` (`whenMode`), `whenKids`, and the
  caterer lever from `foodApproach`. Adds `DESTINATION_TASKS` when
  `event.isDestination`. **This is the host checklist's only source.**
- `playbookRunOfShow(event)` — `:1562`. Reads `ROS_SCHEDULE_KINDS`
  (`:1412-1427`): `cooking`, `preparation`, `setup`, `program`, `cleanup`, plus
  `agenda` for multi-day. **This is the day-of spine.**

Gate census over all 488 authored tasks: `whenChoice` 7, `whenMode` 0,
`whenKids` 0. So the choice-gating surface is small and concentrated (Reunion x3,
Crab Feast x4) — which matters for the finding below, because it means the
freeze costs specific, nameable rows rather than a diffuse fraction.

Composite-row rate: **156 of 488 (32.0%)** authored labels bundle two or more
acts into one line (two-plus semicolons or four-plus commas). "Sign planner,
photographer, caterer, band/DJ" is one checkbox for four bookings.

### Test 1 — Wanda's retirement party (`ev-x-wanda`, T-210)

Real seeded persona, 75 guests, 9 vendors, $5,000 budget, a named day-of point
person (Vida Haynes) in the roster.

| Surfaced | Count |
|---|---|
| Checklist rows the host actually sees (`event.timeline`) | **7** |
| Rows `playbookChecklist` would produce today | **25** |
| Decision board | 9 open, 3 locked, 6 deferred |
| Run-of-show | 16 rows, 14:30 through 22:30, setup + program + cleanup |
| `playbookDuringCues` | 1 |
| `playbookDayOfChecklist` | 3 items, `isDefault: true` |
| `raiseAll` | 5 (3 risks, 2 vendor-conflicts) |

Missing tasks, named:

| Missing task | Kind |
|---|---|
| Send invite with the dietary + accessibility ask and an RSVP-by | (gating gap) |
| Set up the shared photo/notes drop; ask coworkers and family for material | (gating gap) |
| Lock buffet vs. heavy apps, with a veg + GF option | (gating gap) |
| Source the honoree's actual favorite drink (special order lead time) | (gating gap) |
| Book bartender / caterer / photographer; confirm arrival window + insurance + AV power | (gating gap) |
| Build the career slideshow, 4-6 min | (gating gap) |
| Confirm 3-5 speakers, set the order, brief each to 2-3 min | (gating gap) |
| Book the surprise guest's travel and a quiet hold spot | (gating gap) |
| Confirm a working mic + speaker + screen; reserve extra chairs | (gating gap) |
| Chase non-responders; lock the final headcount + dietary/accessibility list | (gating gap) |
| Print photos, export the slideshow to the device that plays it, charge it | (gating gap) |
| Assign the day to the named point person (Vida Haynes is in the roster as "day-of point person") | (corpus gap) |
| Anyone bringing a first-aid kit / who holds it | (corpus gap) |
| Noise or venue curfew at the VFW post | (corpus gap) |
| Vendor load-in window against venue access | (corpus gap) |

Every (gating gap) row above is authored, correct, and generated by the engine
right now — the host does not see it because the seeded `timeline` has 7 rows
and nothing reconciles it. The four (corpus gap) rows are not authored anywhere
in `retirementParty.js`.

Not a gap: the day itself. The 16-row run-of-show covers ice and bar tubs,
accessible seating, memory display staging, mic test, buffet open, the tribute
program, cake, leftovers, recycling, and sending the honoree home with the card
and gifts. Accessibility is threaded through it (23 accessibility mentions in
the playbook data).

### Test 2 — Crab feast (`my-crab-feast`, T-20)

| Surfaced | Count |
|---|---|
| Checklist rows the host sees | **0 — `event.timeline` is absent** (`hostv2/src/eventPool.js:114`) |
| Rows `playbookChecklist` would produce | **12** |
| Decision board | 5 open, 4 locked |
| Run-of-show | 14 rows |
| `playbookDayOfChecklist` | 3 items, `isDefault: true` |
| `raiseAll` | 2 (crab supply risk, shellfish allergy) |

The checklist sheet renders its empty state (`HostShellV2.jsx:15483-15486`) with
a "draft it" CTA at `:15484`, so this is one tap from full, not permanent
silence — but the shipping sample opens on nothing.

Named missing tasks:

| Missing task | Kind |
|---|---|
| Rent or borrow a rack steamer pot (40+ qt) + propane burner | (gating gap) |
| Steam your own: water + cider vinegar + beer below the rack, heavy Old Bay per layer, 20-30 min | (gating gap) |
| Restroom plan for an outdoor picking table | (corpus gap) |
| Where guests park | (corpus gap) |
| Ride home / over-serving plan for a beer-heavy afternoon | (corpus gap) |
| Neighbor or noise heads-up | (corpus gap) |
| First-aid basics (knives and mallets at every seat) | (corpus gap) |
| Extra hands: who runs the second steam while the host picks | (corpus gap) |

The first two are the cleanest demonstration of the freeze in the whole audit.
Measured directly: with `steam_vs_order` unset, `playbookChecklist` returns 12
rows including "Lock a hot pickup slot" and "Pick up the hot steamed crabs".
Set `steam_vs_order: 'Steam them myself'` and it returns 12 rows with those two
replaced by the steamer-pot rental and the steaming method. The engine swap is
exact and correct. In the shell, the host who makes that call after creating the
event gets neither new row, and keeps two rows telling them to collect crabs
from a crab house they are not using.

### Test 3 — DMV wedding (`ev-dmv-wedding`, T-84, 9 vendors)

| Surfaced | Count |
|---|---|
| Checklist rows | 11 (matches `playbookChecklist`) |
| Of those, event-day rows | **1** |
| Decision board | 9 open, all `status: 'overdue'` (e.g. "Ceremony type + officiant", `daysOut: -214`, "Its easy window closed about 7 months ago") |
| Run-of-show | 14 rows, hair/makeup through send-off |
| `playbookDayOfChecklist` | 3 items, `isDefault: true` |
| `raiseAll` | 25 |

The wedding is the coarsest checklist in the corpus. Its 11 rows are the
composite class: "Sign planner, photographer, caterer, band/DJ (these book a
year out)" is one checkbox for four bookings, and the entire wedding day is one
row — "Hair/makeup -> first look -> ceremony -> cocktail -> reception -> toasts
-> first dance -> cake -> send-off". The day is properly covered by the
run-of-show, so the day is not the gap; the checklist just cannot be used to
track progress at wedding granularity.

Named missing tasks:

| Missing task | Kind |
|---|---|
| Collect dietary restrictions and allergies (the playbook mentions "meal choice" once and never dietary or allergy) | (corpus gap) |
| Guest parking / valet plan (one "shuttle" mention, no parking) | (corpus gap) |
| Accessibility: step-free route, reserved seating for elders, restroom access | (corpus gap) |
| Vendor load-in windows vs. venue access hours | (corpus gap, though `vendor-conflicts` raised two arrival collisions on this event — the engine catches it, the checklist never asks for it) |
| Rental return: who takes what back, and by when | (corpus gap) |
| Leftovers / cake box / floral send-home | (corpus gap) |
| Neighbor, noise, or venue curfew | (corpus gap) |
| Thank-you notes (covered by the After surface, not the checklist — see below) | not a gap |

### Test 4 — day-of specifically: The Cookout (`test-day-of`, T-0)

This is the healthiest event in the test set and the answer to the host's actual
question.

- Checklist: **14 rows**, of which **4 are event-day** (`category:'event-day'`),
  covering canopy/cooler/spades setup and pit lighting, the grill batches with
  elders served first, foil pans and to-go containers, and cool-and-scrape
  teardown.
- Run-of-show: **18 rows** from 5h before through 7h in, including "Fix plates
  for the elders who are already seated and carry them over", the music turnover,
  killing the coals safely, folding canopies, and returning rentals.
- `playbookDayOfChecklist`: **8 items, `isDefault: false`** — heat/rain plan,
  food safety, grill/fire safety, child safety, power and outlets, trash and
  recycling, alcohol plan, emergency basics.
- `raiseAll`: 6, including the day-of raise "3 things still open" and
  "2 confirmed guests still need seats".

The day-of coverage question is answered: **setup, load order, the program, and
teardown are all covered, in time order, on one spine.** The gaps are narrower
than expected:

| Missing on the day | Kind |
|---|---|
| Authored `dayOfChecklist` — **only 7 of 39 playbooks have one** (Dinner Party, Get-Together, The Cookout, Fish Fry, Day Party, Juneteenth Cookout, Low Country Boil). The other 32 fall back to `DEFAULT_DAYOF_CHECKLIST` (`src/lib/playbooks/index.js:2137`): three items, "Food safety / Trash + cleanup ready / Emergency basics". A wedding for 120 gets the same three lines as a game night. | (corpus gap) |
| Cleanup rows are never labeled as cleanup. `ROS_SCHEDULE_KINDS` tags them `segType: 'prep'` and hostv2 prints no kind, so teardown reads as another cue in the list. | (gating gap) |
| Who does what. Every ROS row is generated with `owner: 'Host'` and every checklist row with `owner: ''` (`src/lib/playbooks/index.js:1002`, comment: "a solo host owns everything — no owner chip clutter"). The only writer of a real owner is the Add-a-helper form (`HostShellV2.jsx:4002-4010`). There is no owner editor on a checklist row and no assignment step anywhere in the day-of flow. | (corpus + gating gap) |
| `playbookDayOfChecklist` is imported by `src/App.js:39` and **not by hostv2** — so even the 7 authored day-of safety lists reach only the frozen CRA. | (gating gap) |

### Test 5 — the silent types

The one case where the app says nothing at all. A brand-new event of a type with
no playbook, measured directly:

```
Town Hall   -> ros 0  checklist 0  decisions 0  risks 0  foodPlan null  raises 0
Crab Feast  -> ros 14 checklist 12 decisions 1  risks 7  foodPlan 0     raises 2
```

`getPlaybook()` returns `null` for **9 of the 48 types in `EVENT_TAXONOMY`**
(`src/lib/playbooks/index.js:108`): Product Launch, Town Hall,
Training / Workshop, Award Ceremony, Client Dinner, Fundraiser / Gala,
Networking Event, Wellness Retreat, Other. Every downstream reader early-returns
on that null. The seeded samples for these types look populated only because the
fixture hand-authors `ros` and `timeline` on them — `playbookRunOfShow` returns
`null` for `ev-x-town-hall` while its own `event.ros` carries 12 rows. A real
host picking one of those types from intake, or typing a custom type that
resolves to "Other", gets a completely empty plan.

### Corpus-wide silence census

Regex over each playbook's serialized data (comments excluded, since comments
never reach a host). Counts are playbooks where the topic appears nowhere:

| Topic | Silent in |
|---|---|
| Vendor load-in / load-out | 37 / 39 |
| Noise, curfew, quiet hours, HOA | 35 / 39 |
| First aid / emergency kit | 34 / 39 |
| Permits and licenses | 33 / 39 |
| Neighbors | 33 / 39 |
| Accessibility / mobility | 32 / 39 |
| Pets | 32 / 39 |
| Extra hands: volunteers, point person, crew | 31 / 39 |
| Parking / valet | 29 / 39 |
| Power, generators, extension cords | 29 / 39 |
| Cash and tip envelopes | 29 / 39 |
| Ride home / over-serving | 28 / 39 |
| Rental returns | 28 / 39 |
| Thank-yous | 27 / 39 |
| Restrooms | 24 / 39 |
| Gifts and card box | 23 / 39 |
| Photos | 20 / 39 |
| Dietary and allergies | 19 / 39 |
| Leftovers | 7 / 39 |

Two of these are **not** app gaps and should not be worked:

- **Thank-yous.** hostv2 has a full After/wrap-up surface with a thank-you run
  sheet, per-guest `thankYouSent` tracking, a drafted note, and a counted meter
  (`HostShellV2.jsx:10567-10692`, `:15006-15030`). Playbook silence here is
  correct division of labor.
- **Parking and place-level context.** `derivePlaceIntelligence` is imported and
  used by hostv2 (`:138`), and `eventContextNudges` (`:137`) carries a
  cross-cutting layer. Verify per-type before adding parking rows to a playbook.

The other seventeen are genuinely unspoken by anything, and the top four —
load-in, noise/curfew, first aid, permits — are exactly the class the host is
worried about: needed, cheap to say, and the app never raises them.

---

## RANKED FIXES (max 8, highest host impact first)

### 1. Reconcile `event.timeline` against `playbookChecklist` instead of freezing it

**The problem.** `hostv2/src/HostShellV2.jsx:6077` seeds `event.timeline` once at
creation. `:4642` (`draftTimeline`) is the only other bulk writer and it is an
empty-state CTA. `:4013`, `:4055` add single manual rows; `:4596`, `:5000` toggle
`done`. Nothing ever re-runs `playbookChecklist` against the current event. Every
gate in that function (`src/lib/playbooks/index.js:975-983` — `choiceShown`,
`modeShown`, `whenKids`, and the caterer lever at `:981`) is designed to make a
later decision reshape the list, and all of them are dead after creation.

**The fix.** Derive-plus-merge, not replace. On every read of the checklist
sheet, compute `playbookChecklist(event)` and merge into `event.timeline` by
row id (`pbt-<eventId>-<taskId>`):

- Rows in the derived set with no stored counterpart -> append, `done: false`.
- Stored rows whose id is in the derived set -> keep the stored `done`, `owner`,
  and any host edit; refresh `task`, `leadDays`, `week`, `category` from the
  derived row (the label can change when `copyByAnswer` resolves).
- Stored rows whose id is `pbt-` prefixed but **no longer in the derived set**
  -> the gate removed them (host switched to steaming their own crabs). Do not
  delete: mark `retired: true` and fold them under the existing done-fold at
  `:15466` with the reason, so the host is never surprised by a vanishing row.
  Deleting is how a host loses a row they had already half-done.
- Rows without a `pbt-` prefix (manual adds, helper assignments) -> never touch.

Persist the merge result through the normal `patchEvent` path so the "N of M
done" hero (`:15317-15334`) and the open-task counts (`:8954`, `:9202`) move
together.

**Gate it red-proof.** A test that builds a Crab Feast, asserts the checklist
contains "Lock a hot pickup slot", sets `foodChoices.steam_vs_order = 'Steam
them myself'`, and asserts it now contains "Rent or borrow a rack steamer pot
(40+ qt) + propane burner" and that the pickup row is retired-not-deleted. Then
reintroduce the freeze (revert the merge call) and confirm the test goes red —
the current code would pass a naively written version of this test because the
seeded 12 rows already contain the pickup row.

**Impact.** This is the highest-value change in the document. It converts four
already-built gates from dormant to live and closes 11 of the 15 named gaps in
Test 1 and 2 of 8 in Test 2 with no new authoring.

### 2. Author a playbook (or an honest floor) for the 9 typeless event types

**The problem.** `getPlaybook()` returns `null` for Product Launch, Town Hall,
Training / Workshop, Award Ceremony, Client Dinner, Fundraiser / Gala,
Networking Event, Wellness Retreat, and Other
(`src/lib/playbooks/index.js:108`). Measured: a bare Town Hall yields ros 0,
checklist 0, decisions 0, risks 0, raises 0. These types are offered at intake;
`ev-x-town-hall` and friends only look alive because the fixture hand-authors
`ros` and `timeline`.

**The fix, in two parts.** They are separable and the first is cheap.

- *Floor first.* Give `getPlaybook` a family fallback rather than `null`. The
  taxonomy already carries `intakeFamilyFor` / `solveFamilyFor` /
  `budgetFamilyFor` (`src/lib/eventTaxonomy.mjs`). Six of the nine are the
  corporate/professional family; `boardMeeting`, `conference` and `teamRetreat`
  are authored and in that family. A family-level fallback that returns a
  generic corporate playbook is defensible and honest **only if the surface says
  so** — the same discipline `playbookDayOfChecklist` already uses with
  `isDefault: true` and its `because` string. Do not silently pass a conference
  playbook off as a town hall's own.
- *Then author.* Client Dinner and Fundraiser / Gala are the two most distinct
  from anything in the corpus and should be authored rather than aliased.
  "Other" should stay `null` and get an explicit empty-state that says the app
  has no playbook for this type and offers the manual add — silence with a
  reason is honest; silence without one is the failure mode this audit is about.

**Impact.** Closes the only case of total app silence.

### 3. Give the 32 unauthored types a real `dayOfChecklist`, and import it into hostv2

**The problem.** Two stacked. (a) Only 7 of 39 playbooks author
`dayOfChecklist`; the other 32 fall back to `DEFAULT_DAYOF_CHECKLIST`
(`src/lib/playbooks/index.js:2137`), three lines: "Food safety", "Trash +
cleanup ready", "Emergency basics". A 120-guest wedding and a game night get the
identical three. (b) `playbookDayOfChecklist` is imported by `src/App.js:39`
(frozen donor) and **not by `hostv2/src/HostShellV2.jsx`** — probe both ways:
the symbol is absent from the import list at `:116` and the string "Food safety"
appears nowhere in the shell. So even the 7 authored lists reach no hostv2 host.

**The fix.** Wire it into hostv2's day stage first — that is a one-import,
one-render change and it makes the authoring visible before the authoring is
done. Render it as a distinct tick-off band beside the ROS spine (the
`playbookDuringCues` band at `:10364-10385` is the existing pattern to copy),
carrying the engine's own `because` string so a default list reads as a default.
Then author the missing 32, drawing on each playbook's own `risks[]` — the
material is already there (the cookout's 8-item list maps almost one-to-one onto
its authored risks).

**Impact.** The host's question was about the day. This is the day-of safety
floor and it currently reaches nobody in the shipping shell.

### 4. Surface ownership: import `playbookMilestones` and add an owner control

382 authored milestones, 52 with a non-host owner ("grill master", "planner",
"couple"), reachable by no hostv2 surface. Wanda's roster names a day-of point
person and nothing in the app can assign her anything. Add an owner affordance
on checklist rows (the ROS rows already render owner at `:9915`, `:10183`,
`:10285` — they just never receive one), and seed it from the milestone owner
where the playbook declares one.

### 5. Break up the 156 composite tasks, wedding first

32.0% of authored tasks bundle two-plus acts. The wedding's 11-row checklist is
the extreme: four vendor bookings behind one checkbox and the entire wedding day
behind another. Split by act, keep the `when`. This is corpus authoring with no
engine change and it directly raises the Coverage dimension.

### 6. Author the four universal blind spots into every playbook

Load-in/load-out (silent in 37/39), noise/curfew (35/39), first aid (34/39),
permits (33/39). Each is a one-line task with a real `when`, each is cheap to
say, and each is the kind of thing a host discovers at the worst moment. Do
these as one pass across the corpus rather than per-playbook.

### 7. Label cleanup rows on the day spine

`ROS_SCHEDULE_KINDS` tags cleanup as `segType: 'prep'`
(`src/lib/playbooks/index.js:1426`) and hostv2 prints no kind, so teardown reads
as an ordinary cue. A "Teardown" divider or a kind chip on the agenda rows makes
the shape of the day legible without adding content.

### 8. Author early-window calls on the small-event playbooks

The named Coverage 8->9 lever, unchanged: at T-60 a seasoned planner still
raises the two or three cheap-now calls. The deferred bucket is honest but it is
a floor, not the ceiling.

---

## ALREADY COVERED — leave alone

Do not re-open these. Each was measured this pass and is either correct or
already ruled.

- **The day-of spine.** All five schedule buckets reach the host through
  `effectiveRos`; 783 authored rows, 278 of them on the day. Setup, the program,
  and teardown are all present and time-ordered. This is the strongest part of
  the product.
- **The honest clock.** `playbookRunOfShow` refuses to print a time it was not
  given; a derived default start is explicitly not `exact`
  (`src/lib/playbooks/index.js:1562` onward). Do not "improve" this into
  printing bucket hours.
- **Task satisfaction predicates.** `src/lib/taskEngine.js` is heavily guarded:
  acts are never satisfied by presence facts, money tasks require money, chase
  is not send. Three separate audits have already hardened it.
- **Decision board coverage.** Floor of 3 open, average 5.3, zero empty boards
  from T-45 inward. Two prior "caps" on this dimension were measurement
  artifacts (`2026-08-18_COVERAGE_BOARD.md`). Measure against
  `playbookDecisionBoard`, not `composeExperience` (admin-only) and not the raw
  data files.
- **Decision overdue.** Working correctly. `ev-dmv-wedding` at T-84 returns
  `status: 'overdue'`, `daysOut: -214`, "Its easy window closed about 7 months
  ago." The 2026-08-17 "saturation" finding is retracted in its own document.
- **Thank-yous.** Fully covered by the After surface
  (`hostv2/src/HostShellV2.jsx:10567-10692`, `:15006-15030`). Playbook silence
  is correct.
- **Post-event ordering.** `eventPlan().nextActions` is empty after the event by
  design; the wrap-up ledger owns that phase and it refuses to claim a debt it
  has no amount for.
- **Grounding.** 90.1% host-visible sourced; the residual 4.2% is the deliberate
  cultural-basis floor in `src/lib/claimBasis.js`, a values decision, not a bug.
- **Cost-sharing raises.** Correctly not built. `costSharingSummary` has no
  date, so a lateness threshold would be invented — and inventing a deadline to
  nag a host's friends about money is the worst place to guess.
- **`vendor-coi` consequence.** Correctly left undeclared pending a board ruling
  on what a missing COI blocks.
- **Adaptivity's profile wire.** Shipped and reachable at
  `hostv2/src/HostShellV2.jsx:14911-14928`. The July "dead wire" note is closed.

---

## Method notes and instrument warnings

- Playbook data was loaded by esbuild-bundling each ESM `.js` and importing the
  real object, per `scripts/groundingCensus.mjs`. Reading the source text
  instead over-counts: `crabFeast.js` has 13 occurrences of "allerg" in source
  but 5 in data — the rest are comments, which never reach a host. Any future
  silence census must run against the parsed object.
- A first run of the silence census produced a per-playbook miss list that
  contradicted its own aggregate (it reported Crab Feast silent on
  dietary/allergy while the same corpus showed five matches). The numbers in
  this document come from the second, re-verified run, cross-checked against
  source greps of five playbooks. Do not reuse the first run's output; it is not
  in this file.
- `playbookTasks` returns objects keyed `title`, not `label` or `task`. A
  printer reading `label || task` reports `undefined` and looks exactly like an
  empty engine. That was caught here; it is the shape of a false zero.
- The seeded samples carry hand-authored `ros` and `timeline`. Measuring
  coverage from a sample therefore measures the fixture, not the engine. Every
  "the app is silent" claim in this document was re-run against a bare event
  (`{id, type, date, guestCount}`) before being recorded.
