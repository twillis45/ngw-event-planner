# Sprint 55F — Decision-First Runtime + Hidden Planner Surfacing (design)

*Architecture validation only. No build, no runtime/UI change, no PR. The goal: prove we can make the runtime behave like an experienced planner — "Confirm final headcount" before "Buy protein" — by **routing and re-ordering intelligence the system already computes**, not by adding an engine, dashboard, or layer. Every claim is anchored to a real file/line.*

---

## Part 1 — Audit committed
`engine-audit/SPRINT_55E_PLAYBOOK_QUALITY_AUDIT.md` is preserved verbatim as a permanent decision artifact (committed alongside this doc). No modifications.

---

## Part 2 — Current priority cascade (traced)

There are **two** live next-action computations plus a gated shadow. This is the duplication the 55C audit named.

### A. `selectStudioCommand(events)` — Home Spine, cross-event (`CommandCenter.jsx:802`)
Walks `getCrossEventAttentionItems` + per-event readiness; first match wins.
- **Inputs:** all active events; the attention stream (decisions/approvals/vendors/requests); `getEventReadiness` per event; `daysFrom`; `selectEventNextAction` (only for the operational tier).
- **Output:** one `{ level, category, title, consequence, primaryCta, primaryRoute, secondary* }`.
- **Render destinations:** `NextStepSpine` (App.js ~29804) and `dashboardCommand` (App.js ~17170).
- **Tiers (top→bottom):** 1 today+critical (`today-act`) → 2 today clean (`today`) → 3 critical blocker (overdue/at-risk attention item) → 4 awaiting approval → 5 pending approval → 6 vendor → 7 readiness ("needs follow-up", ≥2 attention axes) → 8 inbound request → **9 operational playbook (Tier 6.7, delegates to `selectEventNextAction`)** → 10 multiple-upcoming → 11 single-upcoming (calendar) → 12 all-clear.

### B. `selectEventNextAction(event)` → `_selectEventNextActionInner` — per-event (`CommandCenter.jsx:1063 / 1113`)
- **Inputs:** one event; `deriveCommandCenterData`; `getEventReadiness`; `deriveEventCompressionSummary`; vendor COI/pay state; `topPlaybookTask`.
- **Output:** same command shape (+ compression sub-badge).
- **Render destinations:** `NextBestActionPanel` (Event Command Center L3); also the source the Spine's operational tier delegates to.
- **Tiers:** 1 caterer drift → 2 urgent/critical decision (from `deriveCommandCenterData.decisions`, i.e. overdue *tasks*) → 3 drafted approval (send) → 4 awaiting approval (nudge) → 5 overdue vendor payment → 6 COI critical → 7 unconfirmed vendor → 8 compression (tight timeline) → 9 timeline risk (`readiness.timeline === AT_RISK`) → 10 inbound comm → **11 operational playbook (Tier 6.5, `topPlaybookTask`)** → 12 nearest upcoming milestone → 13 neutral.

### C. `eventSolve` binding — proactive milestone (`lib/eventSolve.mjs` via `eventSolveAdapter`)
- **Inputs:** event → dependency graph. **Output:** `{ binding, readiness%, flag, dateAtRisk, criticalChain }`.
- **Currently used?** Yes, **live but in parallel:** rendered as a per-event "next milestone" label in portfolio/dashboard rows (`App.js:2093` `enginePreview`, rendered `App.js:15135`, `16678`), and shadow-compared by `EngineNextStep` gated behind `?enginePreview=1` (`components/EngineNextStep.jsx:59`). **It is NOT the spine's authority** — the spine uses the cascade. So a row can show one "next milestone" while the spine shows a different next-step.

### D. The playbook reader (`lib/playbooks/index.js`)
- **Inputs:** event → `playbook.purchases` **only**. **Output:** `OperationalTask[]` gated on the shopping window. **Never reads** `dependsOnDecision`, `milestones`, `decisions`, `schedules`, `rentalsGap`, `contingencies`, `risks`. Consumed in exactly two places: `topPlaybookTask` (cascade Tier 6.5/6.7) + `playbookBudgetCategories` (intake budget).

### Current priority ladder (effective, what the host actually experiences)
```
today/live → critical attention item → approvals → vendor (pay/COI/unconfirmed)
→ readiness "needs follow-up" → inbound request → PURCHASE (playbook, ungated)
→ upcoming/calendar → all-clear
```
**The defect, precisely:** the only *playbook* intelligence in the ladder is the purchase tier, and it is **ungated** — a purchase fires whenever its date window opens, regardless of whether the decision that sizes/qualifies it is done. Decisions/run-of-show/capacity/contingencies authored in the playbooks never enter the ladder at all.

---

## Part 3 — Proposed decision-first ladder (design only)

### Target canonical ladder
| Tier | Signal | Already exists? | What it needs |
|---|---|---|---|
| 1 | **Critical solve issue** (`dateAtRisk`, `flag`, `criticalChain`) | **Computed** (`eventSolve`), rendered as a row label, **not prioritized in the spine** | **Routing** — promote the solve flag into the cascade as the top tier; retire the shadow |
| 2 | **Blocking decision** (guest count, dietary, menu/format, alcohol, venue/rain) | **Partial** — cascade has a "decision" tier but fed by overdue *tasks*, not playbook `decisions[]` with `blocks`/`dependsOn` | **Routing + small add** — adapter from `playbook.decisions` (where `blocks`/`dependsOn` set) → candidate; a done-state check (see §6 risk) |
| 3 | **Vendor blocker** (overdue pay, COI, unconfirmed) | **Yes, fully** (cascade tiers 5–7 inner / 6 studio) | None |
| 4 | **Readiness blocker** (`getEventReadiness` AT_RISK) | **Yes** (readiness tier + compression) | None |
| 5 | **Operational decision** (non-blocking host choices: seating, help, theme) | **Authored** (`playbook.decisions` without `blocks`), **not surfaced** | **Routing** — same adapter as Tier 2, lower precedence |
| 6 | **Purchase** (playbook `purchases`) | **Yes** (Tier 6.5/6.7), but **ungated** | **Small add** — gate on Tier 2 decisions being satisfied (read `dependsOnDecision` + milestone state) |
| 7 | **Execution task / run-of-show** (`schedules`, day-of `tasks`) | **Authored**, **not surfaced** | **Routing** — adapter from `schedules`/`tasks` → dated candidates / Day-of board |
| 8 | **Contingency / recovery** (`contingencies`, `risks`, `severity.recovery`) | **Authored**; `severity.js` already has a `recovery` state | **Routing** — attach contingency text to the matching risk/Day-of issue |

### Answers to the Part-3 questions
1. **What systems already provide these signals?** Tier 1 = `eventSolve`; Tiers 3–4 = the cascade + `getEventReadiness`/COI/pay/compression; Tier 6 = the playbook reader. Tiers 2/5/7/8 = the playbook data files (authored, dark).
2. **Which tiers already exist (surfaced)?** 3 (vendor), 4 (readiness), 6 (purchase). Tier 1 exists but is mis-routed (row label, not spine authority).
3. **Which need only routing?** 1 (promote solve flag), 5, 7, 8 (adapters from already-authored data to candidates the spine/Day-of already render). No new logic.
4. **Which need small additions?** 2 (decision adapter **+** a done-state check) and 6 (the gate that reads `dependsOnDecision`/milestone state). These are the only places new *logic* (not just routing) is required, and it is small.
5. **What conflicts exist?**
   - **Two authorities** (cascade vs `eventSolve` binding) can name different next-steps. Decision-first requires ONE authority — recommend the cascade absorbs the solve `flag`/`dateAtRisk` as Tier 1 and the binding becomes a *candidate inside* the cascade, retiring the shadow (the 55C recommendation, now actionable).
   - **The decision tier is fed by the wrong source** today (overdue tasks, not playbook `decisions`). Routing playbook decisions in is additive but must not double-count with the existing task-derived decision tier.
   - **The purchase tier is currently independent**; making it subordinate-and-gated is the core reorder and the main regression surface.

---

## Part 4 — Hidden Planner Intelligence Inventory

All five host data files: `src/lib/playbooks/data/{dinnerParty,birthday,babyShower,backyardBbq,graduation}.js`.

| Intelligence | Structure | Currently used? | Currently rendered? | Candidate surface (existing) |
|---|---|---|---|---|
| **Blocking decisions** | `decisions[]` w/ `when`, `blocks[]`, `dependsOn[]`, `why` | No | No | NextStepSpine / NextBestActionPanel (Tier 2) |
| **Operational decisions** | `decisions[]` w/o `blocks` (seating, help, theme) | No | No | Same, Tier 5 |
| **Milestones** | `milestones[]` w/ `offsetDays`, `dependsOn`, `risk` | No (playbook copy); `eventSolve` has its own graph | Partial (solve binding label) | Cascade Tier 1/timeline |
| **Tasks (day-of)** | `tasks[]` w/ `milestoneId`, `phase`, `when` | No | No | Day-of Mode / Timeline |
| **Purchase dependencies** | `purchases[].dependsOnDecision`, `buyAt` | **Ignored** (reader reads window only) | Purchases yes; deps no | Purchase gate (Tier 6) |
| **Capacity / rentalsGap** | `rentalsGap[]` w/ `qtyPerGuest`/`qtyFlat`, `note` | No | No | Pre-event "capacity check" candidate; HealthRow |
| **Run-of-show schedules** | `schedules.{purchasing,preparation,setup,cleanup}` | No | No | Day-of Mode timeline; cascade Tier 7 |
| **Make-ahead guidance** | encoded in `tasks`/`schedules.preparation` notes | No | No | Tier 7 / consequence line |
| **Risks** | `risks[]` w/ `trigger`, `severity`, `mitigation` | No | No | Tier 8 / readiness note |
| **Contingencies** | `contingencies[]` w/ `when`, `plan` | No | No | Day-of recovery slot (`severity.recovery`) + consequence line |
| **Knowledge / provenance** | `knowledge{}` + per-purchase `provenance` | No | No | Consequence one-clause ("standard catering rule") |

**Headline:** ~70% of "feels like a planner" is authored and dark. Tier-3/4/6 are the only lit pieces.

---

## Part 5 — Execution gap matrix (authored but never reaches the user)

| Playbook | Hidden Decisions | Hidden Timeline | Hidden Capacity | Hidden Contingencies | Hidden Run-of-Show |
|---|---|---|---|---|---|
| **Dinner Party** | format, menu, dietary, alcohol, seating, help (6) | 10 milestones + 15 tasks | rentalsGap: plates, glasses, flatware, chairs, platters | dietary, headcount, overcook, ice, capacity, cleanup (6 risks) | purchasing/cooking/setup/cleanup (4 schedules) |
| **Birthday** | theme, headcount, food_style, alcohol, cake (5) | 8 milestones + 8 tasks | rentalsGap: tables, chairs, coolers | rain, cake (2) | purchasing/preparation/setup/cleanup |
| **Baby Shower** | style, guestlist, registry, dietary, games (5) | 8 milestones + 7 tasks | rentalsGap: tables, chairs, dispenser | food, weather (2) | purchasing/preparation/setup/cleanup |
| **Get-Together / BBQ** | menu, potluck, alcohol, shade (4) | 7 milestones + 7 tasks | rentalsGap: coolers, chairs, canopy, tables | rain, fuel, heat (3 — best of set) | purchasing/preparation/setup/cleanup |
| **Graduation** | format, headcount, food_style, alcohol, display (5) | 9 milestones + 7 tasks | rentalsGap: tables, chairs, canopy, chafers | resupply, signs, rain (3) | purchasing/preparation/setup/cleanup |

Every cell is authored data the runtime does not read.

---

## Part 6 — Lowest-risk implementation plan (routing/ordering/visibility over new logic)

### Phase A — Decision-first gate (the smallest change that flips "buy" → "decide")
Two edits, both in `_selectEventNextActionInner` + the reader; no new files, no UI.
1. **Gate the purchase tier.** In `playbookTasks`, when a purchase has `dependsOnDecision: X`, suppress it unless X is satisfiable from event state; the cascade's purchase tier already takes the top non-suppressed task. (Reader already iterates purchases — this is a filter, not new structure.)
2. **Surface blocking decisions above purchases.** Add a `category:'decision'` candidate sourced from `playbook.decisions` where `blocks[]` is non-empty and the decision is not yet satisfied, inserted **above** the operational/purchase tier (Tier 6.5) and below the existing reactive tiers. Reuse the existing command shape + `primaryRoute:{tab:'Decisions'|'Guests'}`.
   - **Done-state check (the one real addition):** map each blocking decision to an inferable event signal where one exists — *guest count locked* ← `event.guestCount > 0` (+ RSVP reconciliation if present); *menu/format chosen* ← a stored field if present; *dietary collected* ← (no field today → treat as a soft prompt, not a hard block). Where no signal exists, surface the decision as a **prompt** ("Confirm dietary restrictions") rather than a hard gate — informative, never wrong.
- **Result:** a Dinner Party in the T-1d window now surfaces "Confirm final headcount" / "Lock the menu" before "Buy protein," and a purchase with an unmet `dependsOnDecision` waits. **~80% routing, ~20% a small gate.**

### Phase B — Visibility of run-of-show + capacity
3. **Surface the run-of-show** (`schedules` → dated candidates / Day-of Mode timeline) — adapter only; Day-of Mode already renders dated items.
4. **Surface capacity** (`rentalsGap` → a single pre-event "capacity check" candidate, e.g. "Confirm seating for 12 — chairs/plates/serveware") at Tier 5 — adapter only.

### Phase C — Contingencies + one authority
5. **Attach contingencies** to the matching risk/Day-of issue using the existing `severity.recovery` slot + the command `consequence` line — data attach, no new structure.
6. **Collapse the two authorities:** fold `eventSolve.flag/dateAtRisk` into the cascade as Tier 1 and retire the `EngineNextStep` shadow + `?enginePreview` path — one next-action system (the 55C recommendation).

**Ship gate:** Phase A alone satisfies the success condition (the runtime sequences decisions before purchases). B and C are independent follow-ons.

---

## Part 7 — Risk review

| # | Change | Product risk | Runtime risk | Regression risk | Complexity | What can break / must be tested |
|---|---|---|---|---|---|---|
| A1 | Gate purchases on `dependsOnDecision` | Low | Low | **Med** | Low | A previously-surfaced purchase now hides → the operational tier could fall through to calendar. Test: in-window purchase with unmet dep → decision shows, not the buy; with met dep → buy still shows. Verify no event type regresses to "all-clear" wrongly. |
| A2 | Surface blocking decisions above purchases | **Med** (could feel naggy / wrong if done-state misfires) | Low | Med | Med | Done-state inference. Test: decision with an inferable signal disappears once satisfied; non-inferable decision renders as a soft prompt, never a hard block; no double-count with the existing task-derived decision tier. |
| B3 | Surface run-of-show (`schedules`) | Low | Low | Low | Low | Day-of Mode date mapping; ensure tokens (`T0 -3h`) parse. Test rendering only — additive surface. |
| B4 | Surface capacity (`rentalsGap`) | Low | Low | Low | Low | Quantity math (qtyPerGuest × guests); additive candidate. |
| C5 | Contingencies → recovery slot | Low | Low | Low | Low | Attach-only; verify the `severity.recovery` state renders the text. |
| C6 | Collapse solve binding into cascade, retire shadow | **Med** | **Med** | **Med** | Med | The biggest reorder — two authorities becoming one can change the surfaced next-step app-wide. Test: parity across many events; ensure no row/spine contradiction; keep behind a flag until verified. |

**Highest-leverage / lowest-risk:** A1 + A2 (Phase A). **Highest-risk:** C6 (do last, behind a flag, with broad parity testing — exactly what the retired `EngineNextStep` shadow was built to measure).

---

## Recommendation

**EXECUTE Phase A next** (decision-first gate) — it is mostly routing of authored data plus one small, well-bounded gate, and it is the entire difference between "Buy protein" and "Confirm final headcount." **TEST** the done-state inference with a real host before widening Tier-2 sources. **PARK** Phase C's authority-merge behind a flag until A/B prove out. **Do not** add an engine, dashboard, brain, or layer — every tier above maps to a system that already computes the signal; the work is making the existing intelligence visible and correctly ordered.

**Success condition met (design):** we can see, concretely and per-file, how to make the runtime behave like an experienced planner by re-ordering and routing what already exists — no new system required.

*Design only — nothing in this document has been built or changed.*
