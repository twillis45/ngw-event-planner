# Sprint 55C — Runtime Consolidation + Playbook Integration (design)

*No new runtime, engine, or planner brain. The job: connect operational playbook data into the runtime that already exists, and collapse the two next-action systems into one. Grounded in the verified contracts of `selectEventNextAction`, `selectStudioCommand`, `eventSolve.solve`, `getEventReadiness`, `EngineNextStep`, `EventDayMode`.*

---

## Part 1 — Runtime Consolidation Audit

### The four systems

| System | Role | Input → Output | Nature |
|---|---|---|---|
| `selectEventNextAction(event)` | **per-event** next action | event → `{ level, category, title, consequence, primaryCta, primaryRoute, owner }` via a **priority cascade** (awaiting→decision→vendor→readiness→comm→upcoming→calendar, first match wins) | **Reactive** — what open item exists *now* |
| `selectStudioCommand(events)` | **cross-event** command | events → top-event command `{ level, category, title, consequence }` | **Wrapper/router** — picks the highest event, mostly delegates to the per-event logic + the attention stream |
| `eventSolve.solve` → `binding` | **proactive** next milestone | event → `{ binding, readiness%, flag, dateAtRisk, criticalChain }` from the dependency graph | **Predictive** — the binding constraint by lead-time + deps, even before it's "overdue" |
| `EngineNextStep.jsx` | **shadow comparator** | runs `selectEventNextAction` vs `enginePreview.binding`, logs agreement | **Harness** — gated behind `?enginePreview=1`, built to inform a promote decision |

### Overlap analysis
- `selectStudioCommand` and `selectEventNextAction` are **not duplicates** — the studio one is a cross-event router over the per-event one + the attention stream. Keep both; they're one system at two scopes.
- `selectEventNextAction` (reactive) and `eventSolve.binding` (proactive) are **two genuinely different next-action computations** that *can name different actions* — which is exactly why `EngineNextStep` exists to compare them. This is the real duplication.
- `EngineNextStep` is **not** a system to keep — it's a measurement harness whose decision was never taken.

### Recommendation: **MERGE the engine binding into `selectEventNextAction`; REMOVE the `EngineNextStep` shadow.**

One authoritative function, `selectEventNextAction`, gains the engine `binding` as a **proactive candidate inside its existing cascade**:

```
selectEventNextAction(event):
   1. reactive blockers   (overdue decisions, awaiting approvals, vendor issues)   ← existing, highest
   2. engine binding      (eventSolve.binding — the proactive milestone)           ← MERGED IN here
   3. playbook task       (the operational next step in window)                    ← Part 3
   4. readiness / comm / upcoming / calendar                                       ← existing fallbacks
```

- The engine isn't deleted — it becomes the **proactive layer** *inside* the one selector (it already feeds the spine via `selectStudioCommand`; this formalizes it as a ranked candidate instead of a parallel shadow).
- `EngineNextStep.jsx` and the `ngw_engine_shadow_v1` log are **removed** — the promote decision is now made.
- **Success condition met:** one next-action system, not two. Reactive-now overrides proactive-soon overrides operational-this-window — a single deterministic ladder.

---

## Part 2 — Operational Playbook Integration (trace)

```
DINNER PARTY playbook.json
      │  (read once, scaled by guestCount, dated by event.date + solve offsets)
      ▼
playbookTasks(event, asOf)  ──►  operational task candidates  (Part 3)
      │
      ▼
selectEventNextAction(event)   ← candidates enter the EXISTING cascade (Part 1)
      │
      ├─► selectStudioCommand(events) ─► HOME SPINE           "Buy 18 lbs of ice today."
      ├─► deriveCommandCenterData(event) ─► COMMAND CENTER     operational tasks fold into the existing
      │                                                        Decisions/Timeline groups (a "This week" set)
      ├─► engineNextAction(ev) ─► CLIENT EVENT DETAIL row      next operational step per event
      └─► (tasks with when=T0) ─► DAY-OF MODE                  setup/ice/plate/cleanup tasks land on the
                                                                day-of board, severity-ranked
```

Every surface is **existing**. No new tab, panel, or page. A playbook task is just another item the spine / command / day-of already know how to render (`title`, `level`, `primaryCta`, `primaryRoute`).

| Surface | What it shows from the playbook | Mechanism (existing) |
|---|---|---|
| **Home Spine** | the single top operational action across events | `selectStudioCommand` → `selectEventNextAction` |
| **Command Center** (event tab) | this-window operational tasks alongside decisions/timeline | `deriveCommandCenterData` groups |
| **Client Event Detail** (portfolio row) | per-event next operational step | `engineNextAction` |
| **Day-of Mode** | T0 setup / ice / plate / cleanup tasks | `EventDayMode` + `severity` |

---

## Part 3 — Playbook Reader Design (minimal, deterministic, NOT a task engine)

```
// lib/playbooks/index.js  (data + a pure reader; no state, no ranking)
getPlaybook(eventType)               → playbook JSON | null         // simple registry lookup
playbookTasks(event, asOf = today)   → OperationalTask[]            // pure function

OperationalTask = {
  id,                       // `pb-${event.id}-${task.id}`
  kind: 'operational',
  category: 'operational',  // NEW branch in the selectEventNextAction cascade
  phase,                    // setup|shopping|food|beverage|...|cleanup
  title,                    // e.g. "Buy ice — 18 lbs"   ← quantity resolved here
  detail,                   // "(~1.5 lb/guest × 12)"
  eventId, owner,
  dueDate,                  // event.date + offset(token)  ← from buyAt/when "T-3d"|"T0"
  milestoneId,              // the SOLVE milestone this sits under
  level,                    // essential & due-today → 'attention'; else 'neutral'
  primaryCta: 'Open checklist',
  primaryRoute: { eventId, tab: 'Planning Tasks' }   // EXISTING surface
}
```

The reader is a **producer of candidates**, not a ranker. It honors the four runtime invariants:
- **Solve timing** — each task's `when`/`buyAt` token (`T-3d`, `T0`) resolves to a date via `event.date`; a task is *eligible* only inside its window (never surfaced early). The solve offsets are the timing backbone.
- **Dependencies** — a task whose `dependsOnDecision`/milestone is unmet is **suppressed** (can't surface "shop fresh" before headcount locks; surface "lock the menu" first). Mirrors the solve `deps[]` semantics.
- **Readiness** — gating reads current event state (menu locked? headcount stable?) — the same state `getEventReadiness` already reads.
- **Existing prioritization** — the reader returns candidates; **`selectEventNextAction` does the ranking** in its existing cascade. No second priority system.

**Quantity resolution (the success condition):** `qtyPerGuest 1.5 × guestCount 12 = 18 lbs`, `buyAt: T0 → dueDate = today`, `essential → level attention` → it wins the cascade on the day → Home Spine renders **"Buy ice — 18 lbs today."**

---

## Part 4 — Runtime Signal Expansion (where each enters)

No duplicate priority systems — every signal becomes a **dated candidate** in the one cascade / the day-of board.

| Signal | Where it enters | How |
|---|---|---|
| **Purchases** | `selectEventNextAction` cascade (category `operational`) + Command Center group | one "buy X" task per purchase, dued at `buyAt` |
| **Quantities** | *inside the task title/detail* — not a signal of its own | reader computes `qtyPerGuest × guestCount` |
| **Shopping schedule** | dated tasks (T-3d pantry → T-1d fresh → T0 ice) | the purchasing schedule maps purchases to dates |
| **Preparation/cooking schedule** | dated tasks; T0 cooking → **Day-of Mode** timeline | `when` tokens → dates; T0 → EventDayMode |
| **Setup schedule** | **Day-of Mode** (and the spine on the day) | T0 tasks |
| **Cleanup schedule** | **Day-of Mode** (post-event) | T0+ tasks |

All gated by solve timing; all ranked by the existing cascade; all rendered on existing surfaces.

---

## Part 5 — Operational Readiness: **A — extend `getEventReadiness()`**

`getEventReadiness` already returns 4 axes (`decision`, `vendor`, `timeline`, `document`), each `{ status: ON_TRACK|ATTENTION|AT_RISK }`. Add a **fifth axis, `operational`**, derived from the playbook's physical/logistical readiness checks (seating ≥ guests, serveware complete, essential purchases acquired, menu locked, headcount stable):

```
getEventReadiness(event):  { decision, vendor, timeline, document, operational }   // +1 axis
```

**Why A, not B (separate):** the audit flagged duplicate readiness math as a top risk. A separate operational-readiness engine would be a *third* readiness computation. Extending the existing 4-axis structure keeps **one readiness system**, renders through the same `HealthRow`/portfolio surfaces with zero new UI, and makes operational health a first-class axis in `selectEventNextAction`'s `readiness` branch.

*(The 55B emotional/social "readiness" is coaching content, not a health axis — it rides the command's `consequence`/reassurance text, not `getEventReadiness`.)*

---

## Part 6 — Contingencies: extend existing outputs, no engine

The smallest surface reuses two things that already exist:
1. **`severity.js` already has a `recovery` state** in `SEVERITY_ORDER` (nominal→escalated→critical→emergency→**recovery**). Attach the playbook `contingencies[].plan` as the **recovery text on the matching Day-of Mode issue** — when an issue fires, its backup plan is the recovery copy. Zero new structure.
2. **The next-action `consequence` line** — when a risk/experience flag is detected (e.g., "≥2 à-la-minute courses"), append the contingency `plan` to the existing `consequence` field the spine already renders.

So contingencies = **data attached to existing risk outputs**, surfaced in the Day-of recovery slot and the command consequence. No Contingency Engine; `contingencies[]` is just another field the reader maps onto existing structures.

---

## Part 7 — Final Recommendation: **EXECUTE**

Make the runtime smarter, not larger. Smallest implementation path, in order (each independently valuable):

1. **Reader + data (the success condition).** Add `lib/playbooks/` with `getPlaybook` + pure `playbookTasks(event, asOf)`, and import the **Dinner Party** playbook JSON (move it from `engine-audit/` into `src/lib/playbooks/data/`). ~1 file + 1 data file.
2. **One cascade branch.** Add a `category: 'operational'` candidate to `_selectEventNextActionInner` that takes the top eligible `playbookTasks` item. This is where **"Buy ice — 18 lbs today"** reaches the Home Spine — through the existing `selectStudioCommand → selectEventNextAction → NextStepSpine` path. **No new UI.**
3. **Collapse the dual next-action.** Fold the engine `binding` into the same cascade as the proactive candidate; delete `EngineNextStep.jsx` + the shadow log. One authoritative system.
4. **+1 readiness axis.** Add `operational` to `getEventReadiness` (Part 5).
5. **Contingencies as data** on the Day-of recovery slot + consequence line (Part 6).

**Ship gate:** steps 1–2 alone satisfy the success condition (Home Spine surfaces "Buy 18 lbs of ice today" via the existing runtime + Dinner Party data) and are the smallest shippable unit. 3–5 are fast follow-ons. Author the other four Phase-1 playbooks as data only after step 2 proves the wiring.

**What this is NOT:** no new dashboard, command center, planner brain, or parallel priority system. The playbook becomes *data the existing runtime ranks and renders.*
