# Sprint 58E — Outcome Capture v1 (build)

*Closes the learning triple `Decision → Reason → Outcome`. Extends the 58C Decision Memory lib. Governing rule (58D): DERIVE what's observable; CAPTURE only what isn't. No new engine/table/workflow. Reuses `pi.memory`. Date: 2026-06-18. Branch: `sprint-58e-outcome-capture` (stacked on PR #55).*

## What shipped
- **`src/lib/decisionMemory.js`** (extended): `OUTCOME_SIGNALS` (vendor: on_time/late/no_show/great/poor · budget: within/exceeded/underspent · timeline: held/slipped/missed · overall: great/ok/rough) · `OUTCOME_LABEL` · `outcomeTone`.
  - **DERIVE (pure, no persistence):** `outcomeFor(event, record)` derives **budget variance** (`actual` vs `budgeted`) and **timeline slip** (`done`/`snoozedUntil` vs now) — recomputable any time, no user action. Returns `null` when there's no data to judge (never guesses).
  - **CAPTURE (persisted):** `setOverallOutcome` / `setVendorOutcome` write to `event.outcomes` (`{ overall, capturedAt, vendors: {vendorId: status} }`) — immutable, via the existing `setEvent → save` path. `outcomeFor` prefers a captured outcome, else derives.
  - `isEventComplete(event)` (date past / archived) — the natural "how did it go?" moment.
- **`src/App.js`**: `OutcomeCapture` — a 1-tap strip in **Event Details** (overall + per-confirmed-vendor; "best recorded after the event"); `DecisionHistory` now shows each record's **"→ Outcome: …"** (captured or derived, colored by tone). Both gated by `pi.memory`.

## Architecture (per the 58D recommendation)
Derived outcomes are computed live (budget/timeline are recomputable from existing fields — no storage). Captured outcomes (vendor execution, overall) persist in `event.outcomes`. `outcomeFor` unifies them so Decision History shows the complete triple per record. Built to feed Event Memory (aggregate `decisionMemory` + `outcomes` across events) and Vendor Intelligence (vendor reason↔outcome) — neither built here.

## QA (puppeteer · REAL capture, in-session)
| Check | Result |
|---|---|
| Vendor confirm captures the reason (58C) | **PASS** |
| "How did it go?" 1-tap capture strip renders (Event Details, flag on) | **PASS** |
| Tapping overall + a vendor outcome → **full triple** in Decision History ("Because … → Outcome: Ran late") | **PASS** |
| Outcome is **durable** (survives a tab round-trip) | **PASS** |
| Flag OFF ⇒ no capture strip, no Decision History (identity) | **PASS** |
| 0 console/page errors · 164/164 tests (incl. 7 new) · build compiles | **PASS** |
| DERIVE budget variance / timeline slip / tone / completeness | unit-tested |
*Persistence note: localhost is wired to prod Supabase and its events-sync is currently failing (the reported `events` 400), so localStorage reads are confounded — in this session neither the 58C record nor the 58E outcomes appear in the localStorage cache, yet both render durably in the React event state. The write path is the identical `setEvent → debounced save` proven in 58C; reaching the cloud cache depends on the (separate, pre-existing) events-400 being fixed.*

## Success condition — met
NGW now knows, on one durable record: **what decision was made · why · and what happened afterward** — most of it derived for free, the rest captured in a tap. The first complete learning loop exists.

## Remaining (next, deliberately not built)
- **Event Memory** — aggregate these per-event records/outcomes across events (the compounding layer).
- **Vendor Intelligence** — needs vendor↔Vendor-Bank identity linkage + N events of outcomes (58D Deliverable 6).
- **Attendance outcome** — blocked on a missing `attended`/actual field.
- The events-sync **400** should be fixed so captured outcomes reach the cloud reliably (environmental, not this loop's logic).
