# Sprint 58G — Event Memory v1 (build)

*The smallest Event Memory that compounds — a pure READER over signals already captured, surfaced at the decision, not a dashboard. No new engine, no new store (beyond one `event.lessons` field). Gated by `pi.memory` (default OFF). Date: 2026-06-18. Branch: `sprint-58g-event-memory`.*

## What shipped
- **`src/lib/eventMemory.js`** (new): `vendorMemoryFor(allEvents, name, excludeEventId)` aggregates the **already-captured** `event.outcomes` (vendor outcome) + `decisionMemory` (vendor_selection reason) **across events**, keyed by normalized vendor name → `{ timesUsed, on_time, late, no_show, great, poor, rehired, reasons }`. `summarizeVendorMemory` → one private line ("Used 3× · 2 on-time, 1 late · rehired"). `eventMemory(allEvents)` → full map (for future Vendor Intelligence). `setLesson`/`getLesson` → `event.lessons`. Reuses `decisionMemory` readers + `vendorOutcome` — **no duplicated logic, no new engine.**
- **Vendor Memory at the pick** (`VendorPlanningWorkspace.jsx`): the `VendorRow` shows a **"Memory:"** line from `vendorMemoryFor(allEvents, vendor.name, currentEventId)` — the vendor's **past** track record (current event excluded), right where the planner chooses. `allEvents` threaded `EventVendorsTab → VPW → VendorList → VendorRow`.
- **Event Lesson Memory** (`App.js`, in the 58E `OutcomeCapture` strip): a single optional **"Biggest lesson"** one-line input → `setLesson` via `setEvent`. No form, no AI, no summarization.

## Part 1 — Vendor Memory Reader
**Derivable today (built):** per-vendor `timesUsed`, outcome tally (on-time/late/no-show/great/poor), `rehired`, captured reasons — all from `decisionMemory` + `event.outcomes` across `allEvents`. **Requires new data (deferred to Vendor Intelligence 58J):** a robust **vendor identity** (v1 keys on **normalized name** — fragile to renames/typos; a Vendor-Bank-id link is the real fix) and the **write-back** into the Bank's `onTimeRate`/`incidentCount`/`rehireCount` fields (App.js:1741) — Event Memory *reads*; Vendor Intelligence will *fill* those.

## Part 2 — Lessons Audit (ranked)
| Lesson | Repeatable | Actionable | Compounding | Verdict |
|---|---|---|---|---|
| Vendor arrived late | High | High | **High** | already captured (outcome) |
| Budget over/under | High | High | High | already **derived** (58E) |
| Timeline ran long | High | High | Med | already **derived** |
| Guest estimate wrong | High | Med | Med | derivable (final vs estimate) |
| Parking/food bottleneck | Med (venue-specific) | High | Low | **the `event.lessons` line** — the only one not already structured |
The one-line lesson is the *single* unstructured capture worth adding; everything higher-value is already structured/derived.

## Part 3 — UI Audit (contextual, no memory center)
Memory appears **at the decision**: the vendor track record on the vendor row (highest leverage — where the pick happens), and the lesson at completion. **No memory dashboard, no memory page** — per the rule. Budget/timeline baselines are derivable and can surface at those decisions later (not built; would be the same reader pattern). The principle: memory **influences planning in place**, it is not a destination.

## Part 4 — Stakeholder Dependency (documented, not implemented)
Future Event-Memory capabilities that **require Stakeholder Intelligence** (a person/role model): **Relationship Memory** (this client's history/preferences across events), **approval-pattern memory** (who signs off, how long they take), **preference memory tied to a specific stakeholder** ("this honoree always wants X"). **Vendor Memory and Lesson Memory do NOT depend on Stakeholder** — they key on vendors and events, not people. So Event Memory v1 ships independent of 58H; the *relationship* slice of memory is gated on it.

## Part 5 — Readiness
- **58H Stakeholder Intelligence:** **READY to start** — independent of Event Memory; a parallel reader over `guests`/`clientId`/approvals + one role/VIP capture. Not blocked.
- **58I Outcome Intelligence:** **LARGELY DONE** — outcomes are captured (58E) and now aggregated (58G); Outcome Intelligence is the aggregate read, mostly in hand.
- **58J Vendor Intelligence:** **READY (data-gated)** — `eventMemory` is its foundation; needs the Vendor-Bank-id identity link + the Bank write-back + N events before recommendations are honest.

## QA
| Check | Result |
|---|---|
| Vendor-memory aggregation (across events, used-only, exclude-current, reasons, rehired, summary) | **unit-tested 9/9** |
| Vendors tab renders with memory wired (no crash) | **PASS** |
| Lesson capture present (flag on) + **durable** across a tab round-trip | **PASS** ("Parking filled early") |
| Flag OFF ⇒ no Memory line, no lesson input (identity) | **PASS** |
| 0 console/page errors · full suite 176/176 · build compiles | **PASS** |
*The cross-event "Memory:" line renders only when ≥2 events share a confirmed vendor with outcomes; that aggregation is unit-proven (deterministic) — the QA env can't reliably seed multi-event shared-vendor data (cloud-sync override), so the live line is verified by the reader's unit tests + the surface rendering without error.*

## Final Question — the smallest implementation that compounds without a subsystem
**`vendorMemoryFor(allEvents)` surfaced at the vendor pick, plus a one-line `event.lessons`.** That's it. It compounds (the private vendor track record — worthless at 1 event, a moat at 100), reuses every existing signal (no new engine, no parallel store, one new field), and stays **contextual** (a line on the vendor row, not a memory center). Remember vendor performance extremely well; derive budget/timeline for free; capture one lesson; defer relationship/preference/process memory to when Stakeholder Intelligence exists.

## Merge recommendation
**Merge-ready, held for review.** Flag-gated default-OFF (production-identical), reader-only, reuses the 58C/58E signals (now in main). Pairs naturally with enabling the memory cohort. Next: 58J Vendor Intelligence (the write-back + identity link that turns this read into recommendations).

*Confidence: High — reader logic unit-tested 9/9; surfaces wired + smoke-verified; lesson loop durable; flag-off identity. Weakest point: v1 vendor identity keys on normalized name (rename/typo-fragile) — the Vendor-Bank-id link is the real fix and belongs to 58J.*
