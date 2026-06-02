# Sprint 39A — Checklist Auto-Gen Foundation Audit
## NGW Events — Production Task Architecture Review

**Date:** 2026-05-27
**Status:** Audit complete — implementation plan ready

---

## Executive Finding

The checklist auto-generation system already exists.

`generateChecklist()` is implemented at App.js line 4958 inside `ConsultScriptModal`.
It reads intake answers and produces phase-ordered tasks — Board Meeting and general paths.
It has deduplication against existing timeline tasks.
It has a manual "Generate Checklist" button in the summary view.

Sprint 39 already wired it to auto-fire on first intake save (via `saveToEvent()` call at `!event.intake?.savedAt`).

**What doesn't exist:** a standalone pure function. `generateChecklist()` is coupled to ConsultScriptModal's component state (`answers`, `setEvent`, `event`). It can't be called from elsewhere.

**What this audit recommends:** extract it. Leave the rest alone.

---

## 1. Intake Data Shape

### event.intake object

```js
event.intake = {
  draft:   { [questionId]: answerString, ... },  // live while modal is open
  answers: { [questionId]: answerString, ... },  // committed on save
  savedAt: 'YYYY-MM-DD',                         // today8601() at save time
  notes:   string,                               // formatted summary string
}
```

Draft is written on every keystroke (line 4827). On save, `answers` + `savedAt` + `notes` replace the draft structure (line 5125).

### Intake question IDs by event type

**Wedding** (lines 1606–1638):

| ID | Captures |
|---|---|
| `names` | Couple names + how they met |
| `date` | Target date (firm/flexible) |
| `venue` | Venue status (booked/searching/from scratch) |
| `count` | Estimated guest count |
| `oot` | Out-of-town guest proportion |
| `kids` | Children attending |
| `outdoor` | Indoor vs outdoor preference |
| `vibe` | Wedding described in 3 words |
| `formal` | Formality level (black tie → relaxed) |
| `priority` | Top priority (photo/food/music/floral/guest experience) |
| `range` | Budget range |
| `flex` | Fixed vs flexible budget |
| `contrib` | Funding source |
| `booked` | Vendors already booked |
| `music` | Music preference (band/DJ/acoustic/DIY) |
| `catering` | Catering style (plated/buffet/family/cocktail) |
| `photo` | Photography priority level |
| `timeline` | Decision timeline |
| `concerns` | Biggest worry |
| `others` | Comparing other planners |

**Board Meeting** (20+ fields, lines 1640–1672): `purpose`, `org`, `formal`, `count`, `remote`, `quorum`, `observers`, `date`, `duration`, `venue`, `recording`, `agenda`, `materials`, `av`, `meals`, `style`, `dietary`, `decide`, `concerns`, `approval`

**Corporate** (14 fields): `purpose`, `kpis`, `count`, `date`, `duration`, `location`, `speakers`, `entertain`, `av`, `range`, `approval`, `decide`, `stakes`, `concerns`

**Birthday**: `who`, `milestone`, `surprise`, `vibe`, `count`, `ages`, `date`, `venue`, `theme`, `food`, `entertain`, `range`, `concerns`, `decide`

**Bridal/Baby Shower, Anniversary, Graduation**: similar patterns (~10 fields each)

### IDs that reliably seed checklist tasks

These are the ones `generateChecklist()` currently reads (line 4963–4976):

| ID | Used for |
|---|---|
| `count` | Guest headcount tasks ("Confirm headcount with caterer — target: N guests") |
| `catering` / `style` | Catering-specific tasks |
| `music` | DJ/band booking task |
| `photo` | Photography priority flag → "TOP PRIORITY" annotation |
| `range` | Budget task annotation |
| `entertain` | Entertainment vendor slot |
| `venue` | Venue-specific phrasing |
| `av` | AV booking (Board Meeting) |
| `meals` | Catering booking (Board Meeting) |
| `materials` | Board packet format task |
| `agenda` | Agenda draft task |

**Not yet used** but available: `date`, `formal`, `oot`, `outdoor`, `kids`, `flex`, `booked`, `concerns`

---

## 2. Task System Architecture

### Task object shape

```js
{
  id:    string,   // uid()
  week:  string,   // phase label — "12 Months Out", "Week Of", etc.
  task:  string,   // task description
  done:  boolean,
  owner: string,   // free text
  notes: string,   // free text
}
```

**No dueDate. No priority. No category. No dependency.** Confirmed at line 4961 (mk() helper), line 11923 (TaskRow), and SEED events (lines 1885–1896).

### Phase strings (all valid `week` values)

Defined in `PHASE_OFFSET` at lines 436–441. In phase order:

1. `'12 Months Out'`
2. `'10 Months Out'`
3. `'8 Months Out'`
4. `'6 Months Out'`
5. `'5 Months Out'`
6. `'4 Months Out'`
7. `'3 Months Out'`
8. `'2 Months Out'`
9. `'1 Month Out'`
10. `'2 Weeks Out'`
11. `'Week Of'`
12. `'Custom'` — used by "+ New Phase Task" button (line 12190)

Tasks with unrecognized `week` values are appended after known phases (line 11938).

Special pseudo-phase `'__overdue__'` collects tasks past their computed deadline at render time (line 11956).

### Phase-to-date conversion

`phaseDate(week, eventDate)` at line 458 — converts phase string + event date to absolute date using `PHASE_OFFSET` offsets. This is render-time only; no dates are stored on tasks.

`isTaskOverdue(task, eventDate)` at line 465 — computes overdue status at render time.

---

## 3. Timeline Model: Relative, Not Absolute

**The app uses relative phase strings, not absolute dates, on task objects.**

Tasks store `week: '6 Months Out'`. Absolute dates are computed at render time using `event.date` + `PHASE_OFFSET`.

Implications for checklist generation:
- Generated tasks should use the same phase strings — no new date logic needed
- The existing `PHASE_OFFSET` system handles all deadline computation
- Do NOT add a `dueDate` field to tasks — it would be a parallel system

---

## 4. Persistence Flow

### Storage

```
event.timeline  ← array of task objects, nested inside event
events array    → localStorage 'ngw-events' (line 15671)
             → Supabase sync via saveEvent() from lib/api (line 15679)
```

Tasks have no separate storage key. They are always nested inside events. Reads hydrate the whole event; writes serialize the whole event.

### Write path

1. `setEvent(updater)` → local React state
2. useEffect watching `events` → debounced write to localStorage + Supabase

### Risk

Generating a large checklist (20–30 tasks) writes the whole event on each task toggle. No partial writes. This is the existing pattern — do not change it.

---

## 5. Mobile Task UX

### Timeline component (line 11906)

```js
function Timeline({ timeline, setTimeline, eventDate, openId, eventType })
```

### Grouping

Tasks grouped by `task.week`. Phases displayed as a horizontal scrollable stepper (line 11998) showing abbreviated name, `done/total` count, computed date, and focus label. Tapping a phase node filters the task list.

### Touch targets

- Full task row is clickable → opens TaskModal (line 11890)
- Toggle button: 22×22px circle (line 11888)
- Mobile padding: `'14px 4px'` (line 11885 in TaskRow)

These are adequate. Don't shrink them for density.

### Empty states

| State | UI |
|---|---|
| No tasks at all | "Build your planning checklist" card + "Add first task" button (line 11980) |
| Phase selected, no tasks | "No tasks in this phase yet." + "+ Add one" ghost button (line 12177) |
| Search active, no matches | `No tasks match "…"` (line 12174) |

The empty state at line 11980 is the new-event landing state. Checklist auto-gen fills this — the UX already anticipates it.

### Task density concern

A generated checklist for a Wedding produces ~25–30 tasks across 11 phases. On mobile, the stepper collapses these by phase — users see only the selected phase's tasks, not all 30 at once. This is manageable. Do not reduce task count to solve a density problem that the phase filter already handles.

---

## 6. Reusable Primitives

All from `makeS(C)` factory:

| Primitive | Where to use |
|---|---|
| `s.card` | Container for task groups |
| `s.cardTitle` | Phase section headers |
| `s.btn('primary')` | "Generate Checklist" CTA |
| `s.btn('ghost')` | Quiet "Add task" secondary actions |
| `s.btn('teal')` | Confirmation state (already used for Generate Checklist button) |
| `s.pill(color)` | "Overdue" badge on task rows |
| `s.input` | Task name/owner/notes inputs in modal |
| `tensionCue(level)` | Defined but not used in Timeline — skip |
| `seqNode(state)` | Defined but not used in Timeline — skip |

`tensionCue` and `seqNode` are Sprint 23 orchestration vocabulary defined in `makeS` but have no active callers in component render code. Do not introduce them to the checklist UX.

---

## 7. Orchestration Separation Risk Assessment

### Terms found in App.js

| Term | Location | Verdict |
|---|---|---|
| `escalation` | Line 2431 — vendor comms type | Safe — it's a communication log category, not an R&D concept |
| `pressure` | Line 10955 — copy text in email template | Safe — plain English |
| `tunneling` | Not found | Clean |
| `compression` | Not found | Clean |
| `continuity` | Not found | Clean |
| `hierarchy` | Not found | Clean |
| `ambient` | Not found | Clean |

### Style vocabulary risk

`tensionCue`, `seqNode`, `orchDivider`, `metricRail`, `metricCell` are defined in `makeS` at line 129 with the comment "Orchestration vocabulary (Sprint 23)." They are not called anywhere in component render code. Risk: a developer could pull them into checklist UI thinking they're standard primitives.

**Rule:** Do not use `tensionCue`, `seqNode`, `orchDivider`, `metricRail`, or `metricCell` in checklist generation UI. Use `s.card`, `s.cardTitle`, `s.btn` only.

---

## 8. Current State of generateChecklist()

**What it does (line 4958–5091):**
- Reads `answers` from ConsultScriptModal state
- Reads `event.type` to branch (Board Meeting vs general)
- Reads: `count`, `catering/style`, `music`, `photo`, `budget`, `entertain`, `venue`, `av`, `meals`, `materials`, `agenda`
- Produces phase-tagged tasks using `mk(week, task, notes)` helper
- Deduplicates against existing `event.timeline` (line 5082–5083)
- Calls `setEvent(e => ({ ...e, timeline: [...existing, ...newTasks] }))`
- Sets `checklistCount` and `checklistDone` UI state

**What it doesn't do:**
- It is not a pure function — it can't be called from outside ConsultScriptModal
- It doesn't use `date`, `formal`, `oot`, `kids`, `outdoor`, `flex`, `booked`, `concerns`
- It doesn't generate tasks for: Anniversary, Bridal Shower, Baby Shower, Graduation
- It doesn't generate day-of tasks (vendor arrival times, setup sequences)

---

## 9. Checklist Auto-Gen Readiness

### What exists

- `generateChecklist()` — functional, Wedding + Board Meeting + Corporate paths
- `TIMELINE_TEMPLATES` — generic tasks loaded at event creation (already deduplicated against)
- `PHASE_OFFSET` — phase string → offset days map
- `phaseDate()`, `isTaskOverdue()` — render-time date helpers
- Task deduplication logic
- Empty state UI in Timeline that anticipates a populated checklist
- Auto-fire on first intake save (Sprint 39 addition)

### What can be reused

Everything above. No new architecture needed.

### Missing pieces

1. **Pure function extraction** — `generateChecklist()` needs to be extracted from ConsultScriptModal into a standalone `generateChecklistFromIntake(event, answers)` that returns a task array. This enables calling from multiple places without component coupling.

2. **Additional event type paths** — Anniversary, Bridal Shower, Baby Shower, Graduation currently fall through to the general Wedding path. Each needs a short tailored task sequence.

3. **Unused intake fields** — `formal`, `outdoor`, `oot`, `booked` could enrich specific tasks. Low priority.

### Risk areas

1. **Double-generation** — if the user saves intake twice, the `!event.intake?.savedAt` guard prevents re-running. But if they clear intake and re-save, tasks could duplicate. The existing deduplication catches this by task text, but renamed tasks would re-appear.

2. **Task count overwhelm on mobile** — a wedding generates ~28 tasks. The phase stepper handles this adequately. Do not reduce — planners need complete task coverage.

3. **Scope creep** — `generateChecklist()` already has vendor slot creation (adds vendor rows, not just tasks). This is appropriate. Do not add budget auto-population, priority scoring, or dependency graphs.

---

## 10. Implementation Plan

### Step 1: Extract generateChecklist as a pure function

```js
// New pure function outside any component
function generateChecklistFromIntake(event, answers) {
  const tasks = [];
  const mk = (week, task, notes = '') => tasks.push({ id: uid(), week, task, done: false, owner: '', notes });
  // ... existing logic, reading from answers and event.type ...
  const existing = new Set((event.timeline || []).map(t => t.task.trim().toLowerCase()));
  return tasks.filter(t => !existing.has(t.task.trim().toLowerCase()));
}
```

Then `generateChecklist()` inside ConsultScriptModal becomes:

```js
const generateChecklist = () => {
  const newTasks = generateChecklistFromIntake(event, answers);
  if (setEvent) setEvent(e => ({ ...e, timeline: [...(e.timeline || []), ...newTasks] }));
  setChecklistCount(newTasks.length);
  setChecklistDone(true);
  setTimeout(() => setChecklistDone(false), 6000);
};
```

### Step 2: Add missing event type paths

Anniversary, Bridal Shower, Baby Shower, Graduation each get a 10–15 task sequence using their specific intake answer IDs.

### Step 3: Wire to saveToEvent (already done in Sprint 39)

`saveToEvent()` now calls `generateChecklist()` on first intake save. After Step 1 extraction, this calls the pure function directly and applies result.

### Step 4: Nothing else

No new UI. No priority fields. No dependency graph. No adaptive scheduling.
The phase stepper, task rows, and empty state already handle display.

---

## 11. Separation Rules

### Production checklist generation is allowed to

- Read intake answers to personalize task text
- Produce phase-labelled tasks
- Deduplicate against existing timeline
- Add vendor slots when missing (already does this)

### Production checklist generation is NOT allowed to

- Use `pressure`, `tunneling`, `compression`, `continuity`, `hierarchy`, `escalation` (R&D terms) as code concepts
- Use `tensionCue`, `seqNode`, `orchDivider` style primitives
- Implement adaptive density or behavioral weighting
- Implement task priority scoring based on urgency
- Implement hidden consequence systems
- Import from `/orchestration/` engine files

### The test

If a coordinator reads the generated checklist and thinks "this is a smart planner tool," that's correct.
If they think "there's something invisible happening here," that's contamination.

---

## 12. Brutally Honest Assessment

### What's already good

The production app has a solid task system. Phase-based grouping, stepper navigation, overdue detection, and empty states are well-built. The `generateChecklist()` function is real and functional — not a stub, not a placeholder.

### What's not good

The function is buried in a component. It can only be triggered from the ConsultScriptModal summary view. A coordinator who fills in intake answers and closes the modal without clicking "Review Summary" never sees the Generate Checklist button and never gets the auto-generated tasks.

Sprint 39's auto-fire on save partially fixes this — but only if they use the ConsultScriptModal at all. New events created without ever opening the consultation script get only the generic TIMELINE_TEMPLATES tasks.

### What this sprint should actually deliver

1. Extract `generateChecklistFromIntake()` as a standalone pure function
2. Wire it to fire on first intake save (done)
3. Add event type coverage for the missing types
4. Done

That's it. The hard architectural work is already there. The gap is a function extraction and coverage expansion, not a new system.

### What it should not deliver

Anything that makes the production app "feel intelligent."
The production app is a planning tool. It should feel like a well-organized notebook, not an operational environment.
That distinction is the entire point of the dual-track separation.
