# Sprint 55B — Event Operating System: Architecture & Engine Foundation

*Intelligence architecture only. No UI, no dashboards, no navigation, no redesign. Builds on the Sprint 55A audit. Reference implementation: `engine-audit/playbooks/dinner-party.{playbook,eos}.json`.*

## The thesis
NGW knows **WHEN** (Solve), roughly **HOW MUCH / WHO** (Budget, Vendor) — but not the operational **HOW** (purchases, quantities, choreography) nor the human layer (readiness, what-goes-wrong, what-to-focus-on). Four new deterministic engines, layered on the existing stack, turn "event planning software" into an **Event Operating System** that answers, continuously, one question:

> **"What would an experienced planner do next?"**

```
Event Taxonomy → Solve → Budget → Vendor → [Playbook] → [Readiness] → [Experience] → [Host Mindset]
                              (existing)            ← new, this sprint →
```

Each new engine is a **pure, deterministic function** `f(eventType, eventState, playbookData) → guidance`. No AI yet — AI generation comes later, *against* these schemas.

---

## Deliverables 1–4 (confirmed from Sprint 55A)

The full coverage matrix, ranking, and Phase-1 set were produced and source-verified in **`SPRINT_55A_PLAYBOOK_AUDIT.md`**. Re-confirmed here:

- **D1/D2 — Audit & Matrix.** Solve 🟢 for 29/33 types; Budget 🟢/🟡; Vendor 🟢 (host) / 🟡 (corporate-specialist gap); **Operational Playbook 🔴 for every type.** Missing decisions/purchases/milestones catalogued per cluster (at-home, host-celebration, wedding, corporate, fundraising).
- **D3 — Ranking.** Highest-leverage = high-demand × low-effort = **host events**.
- **D4 — Phase 1: VALIDATED, unchanged →** Dinner Party · Birthday · Baby Shower · Backyard BBQ/Get-Together · Graduation. They share one operational spine (food/beverage/setup/guest/cleanup), so #1 makes #2–#5 ~60–70% cheaper, and they serve the segment with *no professional planner* — where the OS is the entire value. Wedding / Gala / Corporate are Phase 2 (higher revenue, but Solve+Vendor already strong and a pro backfills the gap).

---

## Deliverable 5 — Playbook Engine — *"What do I do?"*

**Purpose.** Generate the concrete plan: timeline, checklist, purchases, and the day-of schedules (purchasing / setup / cooking / execution / cleanup).

| | |
|---|---|
| **Inputs** | `eventType`, `guestCount`, `eventDate`, `family`, `recordKind`, `eventState` (decisions/milestones/purchases done) |
| **Process** | load the per-type `Playbook` data → **scale** quantities by guestCount → **schedule** every task/purchase relative to `eventDate` → **reconcile** milestones with the existing Solve graph (Solve stays source-of-truth for *timing*; Playbook adds finer operational steps under each milestone) |
| **Outputs** | dated `timeline`, `checklist` (tasks grouped by phase), `shoppingList` (purchases with scaled qty + cost), and `schedules{purchasing, cooking, setup, cleanup}` |
| **Dependency model** | `decisions` block `milestones`; `tasks` belong to a `milestone`; `purchases` belong to a `task`/`milestone`. A blocked decision suppresses its downstream tasks until resolved. |
| **Scaling model** | `qtyPerGuest × guestCount` (with rounding rules), or `qtyFlat`, or `qtyPer` (1 unit per N guests). Buffers (+10% food) applied at the engine, not hand-baked per item. |
| **Cost model** | **bottom-up**: Σ(`qty × midpoint(unitCostRange)`) per category → an itemized estimate, **cross-checked** against the Budget engine's **top-down** per-head band. Divergence > threshold → a confidence flag. |

Schema = `EventTypePlaybook` (Deliverable 9). Reference: `dinner-party.playbook.json`.

---

## Deliverable 6 — Readiness Engine — *"Am I actually ready?"*

**Purpose.** Score true readiness across four dimensions, time-aware, and name the specific gaps — not a vanity %.

| Dimension | Question | Example checks |
|---|---|---|
| **Mental** | What must the host *understand*? | menu finalized · headcount stable · budget realistic · kitchen capacity known |
| **Physical** | What must physically *exist*? | seating ≥ guests · place settings · serving utensils · refrigeration · ice · parking |
| **Emotional** | What *stressors* are likely? | first-timer nerves · menu-ambition · perfectionism spiral · decision fatigue |
| **Social** | What *conversations* must happen? | **dietary/allergy collected** · arrival expectations · alcohol clarity · seating conflicts |

| | |
|---|---|
| **Inputs** | `eventState` (decisions/milestones/purchases/guest data), `daysUntil`, the type's readiness rules |
| **Process** | each **check** is a deterministic `predicate` over state (`{field, op, value\|ref}` — e.g. `seating.capacity ≥ guests`). Unknown field → "unmet/unknown", never a false "ready". |
| **Scoring** | per-dimension score = Σ(passing-weight) / Σ(weight), weights = severity; **time-aware** — an unmet check far from the date is fine, the same check near the date escalates. Overall = weighted blend, but the engine reports the **biggest single gap**, not just a number. |
| **Risk model** | each unmet check carries `severity` (low→**critical**) + a `fix`; `critical` social/safety gaps (allergy) outrank all dimensions at every stage. |
| **Outputs** | per-dimension score · the unmet checks (ranked) · the one "biggest gap right now". |

Reference: `dinner-party.eos.json → readiness` (5 mental · 6 physical · 5 emotional · 4 social checks).

---

## Deliverable 7 — Experience Engine — *"What usually goes wrong?"*

**Purpose.** Surface the failure modes a 20-year planner sees coming — before they happen.

| | |
|---|---|
| **Inputs** | `eventType`, `eventState` (e.g. menu has an untested recipe scheduled day-of), the type's experience library |
| **Process** | a library of typed **experience flags**, each with a `trigger` predicate over state; a flag fires only when its trigger matches *this* event's reality (so it's contextual, not a generic warning wall) |
| **Schema** | `ExperienceFlag { id, category, trigger, severity, what, why, fix }` |
| **Risk categories** | `common-mistake` · `hidden-risk` · `sequencing` · `forgotten-purchase` · `first-timer` |
| **Severity system** | `low` (cosmetic) · `med` (noticeable) · `high` (host regret) · `critical` (can harm a guest / ruins the event, e.g. unflagged severe allergy) |
| **Outputs** | the firing flags, ranked by severity, each with what/why/fix |

Reference: `dinner-party.eos.json → experience` (9 flags: new-recipe-day-of, ≥2 à-la-minute courses, no ice, no serving utensils, capacity < guests, oven-temp clash, fresh-bought-early, solo-host-for-8+, late-setup).

---

## Deliverable 8 — Host Mindset Engine — *"What should I focus on this week?"*

**Purpose.** Not more tasks — **confidence**. Surface the ONE thing that matters this week, normalize the feeling, and redirect energy from pleasant busywork to the real lever. Deterministic; AI later.

| | |
|---|---|
| **Inputs** | `eventState`, Readiness scores, Experience flags, `daysUntil`, the Solve next-action |
| **Process / coaching rules** | (1) rank open concerns by **severity × time-pressure**; coach the single highest. (2) if the host is spending time on a low-severity item while a higher-severity readiness check is unmet, **name the swap explicitly**. (3) always pair a redirect with **reassurance** (what's normal at this stage). (4) critical safety gaps (allergy) outrank everything, always. |
| **Outputs** | per-phase coaching across mental / emotional / social / physical, plus the single **"focus this week"** and a `redirectFrom` (the busywork to stop) |

**Flagship behavior:** *"You're comparing centerpieces, but you haven't collected dietary from 14 guests and your menu locks this week. Send the allergy ask today; the table can wait."* — encoded as a deterministic rule (redirect from decor when a higher-severity readiness gap is open).

Reference: `dinner-party.eos.json → mindset` (4 phase windows: Decide / Plan / Acquire & Prep / Execute, each with mental·emotional·social·physical guidance + reassurance + redirect).

---

## Success-condition additions (from the expanded brief)

Two more dimensions and one scaling model, baked into the model + reference:

### Contingency layer — *"What's the backup?"*
A pro always has a Plan B. `contingencies[] { trigger, plan, severity }` — fires on day-of reality (dish flops, surprise +1, running behind, appliance fails, unknown allergy revealed, drinks low, breakage). Reference: `dinner-party.eos.json → contingencies` (8 plans). This is what lets a first-timer *recover* like a veteran, not just plan like one.

### Planner Lens — *"What would a senior planner be thinking?"*
The meta-layer the checklist never shows: `plannerLens { successDeterminants[], alwaysBuffers[], thinkingByPhase[], theOneThing, nextActionContract }`. It hands the user a pro's **judgment** — the 3 things that actually determine success, the buffers a pro always keeps, what they weigh each phase, and the single unifying contract:

> **`nextActionContract`** — at any moment, the OS answers *"what would an experienced planner do next?"* by taking the **single highest-severity OPEN item across all four engines** (Solve = timing, Readiness = gaps, Experience = likely failure, Mindset = focus), **time-weighted**, and stating it with the WHY and the reassurance. Never a flat list — always the one next move. *This is the engine's top-level output and the thing that makes the user feel guided, not managed.*

### Persona scaling — one OS, four sophistication tiers
The **same** EventOS data renders at different depth/ownership per user, so it guides a first-time host through a Dinner Party *and* a junior coordinator through a Wedding:

| Persona | `recordKind` | How the OS adapts |
|---|---|---|
| **First-time host** | event | Maximum hand-holding: every why + reassurance + contingency shown; DIY framing; coaching leads. |
| **First-time / junior coordinator** | client | Same data, less reassurance, more proof-requirements + vendor accountability surfaced; "owner" shifts from host→vendor. |
| **Professional planner** | client | Terse: Planner Lens + exceptions only; assumes the fundamentals; surfaces buffers/contingencies + the divergence flags. |
| **Studio team member** | client | Delegated view: tasks filtered by `owner`/assignee; the senior planner's lens shared as the standard. |

Mechanism: every task/check/flag carries `owner`, `severity`, and a `why`+`reassurance`; the renderer (future, not this sprint) gates verbosity and ownership by persona. No data is forked — depth is a *view* over one model.

---

## Deliverable 9 — Unified Data Model

One `EventOS` object per event type. Joins to (never forks) the existing Taxonomy / Solve / Budget / Vendor systems.

```
EventOS {
  type, solveFamily, family, recordKind, version, meta

  // ── Playbook layer (Sprint 55A) ──────────────────────────────
  decisions[]   { id, label, options[], default, when, dependsOn[], blocks[], why }
  milestones[]  { id, name, offsetDays, owner, dependsOn[], category, risk }
  tasks[]       { id, milestoneId, phase, label, when, owner, optional }
  purchases[]   { id, item, category, qtyPerGuest|qtyFlat|qtyPer, unit,
                  where[], unitCostRange[lo,hi], essential, buyAt, substitutes[],
                  dependsOnDecision }
  rentalsGap[]  { item, qtyPerGuest|qtyFlat, note, altToBuy }
  vendors[]     { category, required, altToDIY, when, proofRequired[], costRange, costUnit }
  risks[]       { id, trigger, severity, mitigation }
  schedules     { purchasing[], cooking[], setup[], cleanup[] }
  guestManagement { rsvpStrategy, communications[], seatingPlan, conflictHandling[] }

  // ── New engines (Sprint 55B) ─────────────────────────────────
  readiness     { mental[], physical[], emotional[], social[] }
                  // check { id, label, predicate{field,op,value|ref}, severity, window, fix,
                  //         normalAt?, reassurance?, redirectTo? }
  experience[]  { id, category, trigger{predicate}, severity, what, why, fix }
  mindset       { philosophy, rules[], phases[]{ window,title,focus,
                  mental,emotional,social,physical,reassurance,redirectFrom },
                  flagshipExample }

  // ── Success-condition layer ──────────────────────────────────
  contingencies[] { id, trigger, plan, severity }
  plannerLens   { successDeterminants[], alwaysBuffers[], thinkingByPhase[],
                  theOneThing, nextActionContract }
}
```

**Why this shape**
- **Joins, doesn't fork.** `type`/`solveFamily` key into existing systems; `milestones` reconcile with the Solve graph (engine owns timing); `vendors[].category` joins the roster + accountability playbooks; `purchases` cross-check the Budget per-head.
- **Deterministic + AI-ready.** All logic is declarative `predicate`/`trigger` objects + enum-constrained fields (`phase`, `category`, `severity`) — evaluable today, and a clean target for AI to generate a new type against and *validate*.
- **Host → planner.** `owner` + `recordKind` + `altToDIY` + `why`/`reassurance` let one object render across all four personas.
- **Shopping/retailer ready.** Every purchase carries `where[]` + a guest-scaling quantity + a `unitCostRange` — enough to build a cart and a cost later.
- **No premature architecture.** It is data files + thin reader functions. No UI, services, or schema migrations are implied by this sprint.

---

## Deliverable 10 — Complete Dinner Party Event OS

`engine-audit/playbooks/dinner-party.eos.json` (+ `dinner-party.playbook.json` for the Playbook layer) — authored to professional standard, covering every section the brief requires:

- **Timeline / Decisions / Shopping / Quantities / Purchase, Cooking, Setup, Cleanup schedules / Vendor options** → playbook file (6 decisions · 10 milestones · 15 tasks · 16 purchases · 4 vendor options · 4 day-of schedules).
- **Guest management** → RSVP strategy, 4 timed guest comms, seating rule (assign at 8+), conflict handling.
- **Readiness** → 5 mental · 6 physical · 5 emotional · 4 social checks, each with predicate + severity + fix.
- **Experience** → 9 failure-mode flags (new-recipe-day-of, ≥2 à-la-minute, no ice, no serving utensils, under-capacity, oven clash, fresh-too-early, solo-host, late-setup).
- **Host coaching (Mindset)** → 4 phase windows with mental/emotional/social/physical guidance + reassurance + redirect, and the centerpieces-vs-dietary flagship.
- **Contingencies** → 8 day-of recovery plans.
- **Planner Lens** → the 3 success determinants, the always-buffers, what a pro weighs each phase, and the `nextActionContract`.

**Success test it's built against:** a first-time host with zero experience can run this dinner party and be told not just *what to do*, but *what matters, what they forgot, what's risky, what's normal, what usually goes wrong, and what to focus on next* — i.e. it reads like a senior planner is sitting beside them.

---

## What the engine knows today vs. what this unlocks

| | Today | With the Event OS |
|---|---|---|
| When | 🟢 Solve graphs | 🟢 (Solve stays source-of-truth) |
| How much money | 🟢/🟡 Budget | 🟢 + bottom-up purchase cross-check |
| Who (vendors) | 🟢/🟡 + accountability | 🟢 + DIY-vs-hire ROI |
| **What to buy / how much / where** | 🔴 | 🟢 (Playbook purchases) |
| **What to prepare / sequence** | 🔴 | 🟢 (tasks + day-of schedules) |
| **Am I ready** | 🔴 | 🟢 (Readiness, 4 dimensions) |
| **What goes wrong** | 🔴 | 🟢 (Experience flags) |
| **What to focus on / what's normal** | 🔴 | 🟢 (Host Mindset) |
| **What's the backup** | 🔴 | 🟢 (Contingencies) |
| **What a pro is thinking** | 🔴 | 🟢 (Planner Lens) |

**Fastest path to "smarter than traditional planning software":** ship the unified data model + a thin deterministic reader, author the five Phase-1 host playbooks against it (Dinner Party done as the reference), wire the `nextActionContract` into the *existing* Command Center next-action (no new UI), then extend to Wedding/Gala/Corporate in Phase 2. The differentiator isn't a prettier checklist — it's an engine that tells you *what matters and what you forgot*, in a voice that makes a first-timer feel guided, not managed.
