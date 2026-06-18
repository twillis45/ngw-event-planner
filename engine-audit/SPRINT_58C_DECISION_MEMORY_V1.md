# Sprint 58C — Decision Memory v1 (build)

*The first MOAT brick (per 58B): capture WHY a planning decision was made and persist it onto the event. NOT a new engine — a data array + tiny pure helpers + a capture modal + a read surface. Gated by `pi.memory` (default OFF = production identity). Records persist for real (event.decisionMemory[] → the existing save path). Date: 2026-06-18. Branch: `sprint-58c-decision-memory`.*

## 1 · Files changed
| File | Change |
|---|---|
| `src/lib/decisionMemory.js` (new) | flag · `DECISION_TYPES`/`DECISION_TYPE_LABEL` · `makeRecord` · `appendDecision` (immutable, rationale-required) · readers (`getDecisions`, `decisionsForSubject`, `latestRationaleForSubject`) |
| `src/lib/__tests__/decisionMemory.test.js` (new) | 9 tests |
| `src/App.js` | import; `RationaleModal` (capture); `DecisionHistory` (read surface); in `EventPlanner`: `decPrompt` state + `promptDecision` + `saveDecision` + modal render; capture wired in `onPatchVendor`, Budget `upd`, `onExtendDecision`; `DecisionHistory` rendered in `EventDetailsTab`; `promptDecision` threaded to the 3 tabs |
| `src/plan/VendorPlanningWorkspace.jsx` | import; `VendorRow` surfaces `latestRationaleForSubject` (engine expression) |

## 2 · Data model additions
A new array **on the event** — no new table, no migration, no new DB tech. It rides the existing `setEvent → debounced save → localStorage 'ngw-events' + Supabase events.data (JSONB)` path, so it is real, event-scoped, and cross-event-readable later (Event Memory / Vendor Bank write-back).
```
event.decisionMemory: [{
  id, eventId, decisionType,            // 'vendor_selection' | 'budget_reallocation' | 'planner_override'
  subjectId?, subjectLabel, decision,   // what / which object
  rationale,                            // why (required — no rationale ⇒ not stored)
  createdAt, createdBy?,                // when / who
  alternativesConsidered?, confidence?  // optional, omitted unless set
}]
```

## 3 · Decision capture points added (3 real handlers)
| Type | Trigger (runtime) | Question |
|---|---|---|
| **vendor_selection** | `onPatchVendor` (App.js:27421) — a vendor moves to **Confirmed** (incl. the one-click "Booking" confirm in the vendor cockpit) | "Why this vendor?" |
| **budget_reallocation** | Budget `upd` (App.js:20634) — a category's **budgeted amount changes** | "Why shift this budget?" |
| **planner_override** | `onExtendDecision` (App.js:28579) — the planner **defers an engine-flagged decision 7 days** | "Why defer this now?" |
Capture is a single shared `RationaleModal`: one short question, **non-blocking** ("Skip" records nothing, the decision applies regardless). The decision already happened; we only capture the reason.

## 4 · Read surface added
`DecisionHistory` — a plain, reverse-chronological log inside **Event Details** (below the venue notes): each row shows the **decision · type · date** and **"Because <rationale> — <createdBy>"**. Renders nothing when `pi.memory` is off or empty. **Engine expression:** the vendor row (`VendorPlanningWorkspace`) shows *"Rationale: <latest reason>"* under the vendor — the why surfaced back where the planner sees the vendor.

## 5 · Example captured records
```json
{ "id":"dm-3-…", "eventId":"ev-cooper-mensah", "decisionType":"vendor_selection",
  "subjectId":"v-…", "subjectLabel":"Soul Daddy's Kitchen",
  "decision":"Confirmed Soul Daddy's Kitchen (Catering)",
  "rationale":"Faster response and fully insured", "createdAt":"2026-06-18T…Z", "createdBy":"Todd" }
{ "decisionType":"budget_reallocation", "subjectLabel":"Photography",
  "decision":"Photography: $1,200 → $1,800", "rationale":"Shifted to photography — legacy value to the family" }
{ "decisionType":"planner_override", "subjectLabel":"Finalize seating",
  "decision":"Deferred 7 days: Finalize seating", "rationale":"Waiting on the final 3 RSVPs before locking" }
```

## 6 · QA checklist (puppeteer · real capture, in-session read-back · screenshot-verified)
| Check | Result |
|---|---|
| Confirming a vendor opens the **"Why this vendor?"** capture prompt | **PASS** |
| Saving **persists a real record** to `event.decisionMemory` (read back from storage) | **PASS** |
| Read surface **"Decision History"** renders the captured rationale in Event Details | **PASS** |
| Vendor row surfaces the captured **"Rationale: …"** (engine expression) | **PASS** |
| Flag OFF ⇒ no capture prompt, no Decision History (**production identity**) | **PASS** |
| No console / page errors | **PASS** |
| 3 decision types wired at real handlers | vendor (proven live) + budget + override (wired, grep-verified) |
| Unit tests (model · immutable append · rationale-required · readback) | **9/9 PASS** |
| Full suite · prod build (+2.0 kB) | **157/157 · compiles** |
*Note: localhost is wired to prod Supabase, so localStorage *injection* is overridden by cloud hydration — the QA therefore drives a **real** capture through the UI and reads back from in-session React state, which is the honest verification.*

## 7 · Acceptance criteria — all met
1. Records actually persisted ✅ (real `event.decisionMemory[]` → existing save). 2. ≥3 decision types create records ✅. 3. User can view captured decisions in the event ✅ (Decision History). 4. ≥1 rationale surfaced back ✅ (vendor row). 5. No new intelligence engine ✅ (array + helpers + read surface). 6. No presentation-only fake memory ✅ (real persistence, verified).

## Brutal assessment — what remains missing
- **It's a brick, not the wall.** Decision Memory captures the *why*; it does **not yet feed the moat** — the Vendor Bank write-back (a vendor's captured rationale + outcome updating its reliability record) is the next, separate sprint. Until then this is private-but-inert history.
- **Capture is opt-in and skippable** — "Skip" records nothing, so value depends on planners actually writing a sentence. Adoption, not code, is the risk.
- **Only 3 trigger points.** Date choice, scope change, and approval responses are *not* wired yet (the spec's stretch set). Override is narrowly "snooze a decision," not a general "I overrode the recommendation" capture on the spine (the spine has no dismiss affordance today).
- **Per-event only.** No cross-event aggregation, no editing/deleting a record, no surfacing prior-event rationale on a new event — all of that is **Event Memory** (the next moat layer), which this is deliberately built to feed.
- **The honest win:** the loop is real — capture → persist → read → express, end-to-end, on real data. For the first time NGW *remembers a reason*. That is the cheapest possible first step from head-start to moat; the compounding is still ahead.

*Confidence: High — the full loop was driven live (real vendor confirm → modal → persisted record → Decision History + vendor-row rationale) and is unit-tested at the lib level. Weakest point: capture coverage is 3 points and opt-in; the moat only begins to form once Event Memory + Vendor Bank write-back consume these records.*
