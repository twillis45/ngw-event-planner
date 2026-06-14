# Sprint 55H-B3 — Capacity / Rentals-Gap Audit

*Audit only — no build. Determine whether capacity intelligence is a **data**, **routing**, or **UI** problem before building anything, and which existing surface should own it. Code-grounded.*

## Bottom line
Capacity is **two problems at once**, split by item:
- **Routing problem** (the core): seating / tables / place settings / serveware / coolers are **authored in `rentalsGap` and completely dark** — never read by any surface. The data and the surface both exist; nothing connects them.
- **Data + never-infer problem** (the edges): power, parking, restrooms are **absent** from the data, and most of them are values you must **never infer** for a host event.

It is **not** a UI problem — the owning surface already exists (`getEventReadiness` / Command Center Planning Health). No new page needed.

---

## 1. Inventory (what data exists)

| Capacity item | Where it lives | State |
|---|---|---|
| **Tables (count)** | `event.tables`, computed at create as `ceil(guestCount / TABLE_SIZE[type])` (`App.js:7949`, `TABLE_SIZE` `:2663`); editable in the **Seating** tab | **Modeled (live)** — used for seating; not surfaced as a readiness/gap |
| **Seating assignments** | Seating tab (`event.guests` × `event.tables`) | **Modeled (live)** — assignment UI exists |
| **Seats needed** | Intake fields "SEATS NEEDED" / "CEREMONY/RECEPTION SEATS NEEDED" (`ClientIntakeFlow`); intake "attendee count … if venue capacity matters" | **Captured (intake)** — never cross-checked against tables/chairs |
| **Chairs / place settings / serveware / linens** | `playbook.rentalsGap[]` `{item, qtyFlat \| qtyPerGuest, note}` (Birthday/Baby Shower/BBQ/Graduation) | **Authored but DARK** — 0 consumers (verified) |
| **Coolers / canopy / drink dispensers / chafing** | `rentalsGap` (BBQ/Birthday/Graduation) | **Authored but DARK** |
| **Venue capacity** | `vendor.capacity` (a venue vendor's max, `App.js:5820`); sample log "Confirmed capacity of 200" | **Partially modeled** — per-vendor field, not cross-checked vs guest count |
| **ADA restrooms / designated parking** | Accessibility chips (`ACCESSIBILITY_REQ_OPTIONS`, added Sprint 55H dropdowns) | **Captured as accessibility needs**, not capacity planning |
| **Parking (spots/cars)** | — | **Absent** (only prose in graduation/bbq notes) |
| **Restrooms (count/adequacy)** | — | **Absent** |
| **Power / extension cords / circuits / load** | — | **Absent** |

**Readiness:** `getEventReadiness` returns **4 axes** (`decision, vendor, timeline, document` — `CommandCenter.jsx:771`). **No capacity axis.**
**Subset gap:** `dinnerParty.js` is **missing `rentalsGap` entirely** (the same 55C-1 src-subset gap B.1 found for `schedules`) — the canonical data lives in `engine-audit/playbooks/dinner-party.playbook.json`.

---

## 2. Hidden data map (authored → where it could surface)

| Data | Structure | Consumed? | Rendered? | Candidate surface |
|---|---|---|---|---|
| `rentalsGap[]` (chairs/tables/plates/serveware/coolers) | per-item `qtyFlat`/`qtyPerGuest` + `note` | **No** | **No** | Command Center Planning Health (capacity axis) |
| `event.tables` / `TABLE_SIZE` | int | Yes (Seating) | Yes (Seating) | Cross-check vs chairs/place settings |
| Intake "seats needed" | int | No cross-check | Field only | Planning Health input |
| `vendor.capacity` | int | Per-vendor | Vendor detail | Cross-check vs guest count (venue fit) |

**~Everything physical the host needs to *have* is authored (`rentalsGap`) and unread.** That is the routing opportunity.

---

## 3. Recommended surface

**Command Center → Planning Health (`getEventReadiness`), as a 5th axis: `capacity`.**

Why this surface (Pattern 008 — match the need to the surface that owns it):
- Capacity is a **pre-event "are you ready?"** question ("do you have enough chairs/plates/serveware for N?"). That is exactly what Planning Health/`getEventReadiness` already answers (decision/vendor/timeline/document). A 5th axis keeps **one readiness system** (the Phase-B-audit "extend, don't add" recommendation) and renders through the existing `HealthRow`/portfolio with **no new UI**.
- **Not** Event Day Schedule / Day-of Mode — capacity is too late on the day (you can't borrow 12 chairs at 5 PM); it's a planning check, and those surfaces own *execution* (B2R), not readiness.
- **Budget Overview** is a *secondary* surface: `rentalsGap` cost can fold into the existing "Linens & rentals" budget category, but cost ≠ capacity, so Budget shouldn't own the readiness signal.
- **Intake** is the natural place to later capture the **"have" counts** (how many chairs/plates you own) — the missing input for a true gap.

---

## 4. Smallest implementation path

**Phase 1 (routing — EXECUTE candidate):**
1. Complete `dinnerParty.js` `rentalsGap` from the canonical JSON (close the subset gap, like B.1 did for schedules).
2. Add a pure reader `playbookCapacity(event)` → resolves `rentalsGap × guestCount` into a **need list** (e.g. "24 plates, 12 chairs, 4 serving platters, 2 tables").
3. Add a `capacity` axis to `getEventReadiness` that surfaces **one** Planning-Health item: *"Confirm seating & serveware for 12 — ~12 chairs, 24 plates, 4 platters, 2 tables."* Status = `ATTENTION` until acknowledged; it states the **need**, never a fabricated gap.

That's ~1 reader + 1 readiness axis + 1 data backfill — all routing of authored data through an existing surface. No new page/engine.

**Phase 2 (the "have" side — TEST, later):** capture owned counts (a few intake fields or a one-tap "I have enough / need to rent") so the axis can compute a real **gap** ("rent/borrow 4 chairs"). Validate with a host before adding the fields.

---

## 5. Risks

| Item | Risk | Note |
|---|---|---|
| Surfacing the **need** without a "have" count | Low | States a deterministic requirement; the host confirms. Honest (Pattern 003 — never show a fabricated gap as truth). |
| A 5th readiness axis | **Med** | The Phase-B audit flagged duplicate readiness math as a top risk — must **extend** the existing 4-axis structure, not add a parallel computation. |
| Dinner Party `rentalsGap` backfill | Low | Pure data, from the canonical JSON. |
| Inferring **parking / restrooms / power** | **High → don't** | See below. |

**Never infer (Pattern 003 boundary):**
- **Parking spots** — depends on carpooling/transit/venue lot; a fabricated "you need N spots" is worse than silence.
- **Restroom adequacy** — commercial-event ratios don't apply to a home dinner; never assert "you need N restrooms."
- **Power / circuit load** — depends on the building's wiring; never warn "you'll trip a breaker" without real circuit data.
- **Whether the host already owns enough** — the "have" side must be **asked**, never assumed.

**Safe to infer (deterministic):** tables (`ceil(guests / TABLE_SIZE)`), chairs/place settings/serveware/coolers (`qtyPerGuest × guests` or `qtyFlat` from `rentalsGap`).

---

## 6. EXECUTE / TEST / PARK

| Capability | Rec | Why |
|---|---|---|
| Surface `rentalsGap` **need** in Planning Health (capacity axis) + backfill Dinner Party `rentalsGap` | **EXECUTE** | Routing of authored data through the surface that owns readiness; deterministic; smallest path. |
| Fold `rentalsGap` cost into the "Linens & rentals" budget category | **EXECUTE (trivial)** | Cost view; the budget reader already groups a `rental` purchase category. |
| Capture "have" counts → compute a true gap | **TEST** | Adds data + an intake touch; validate the UX with a host first. |
| Venue-capacity vs guest-count fit check (`vendor.capacity`) | **TEST** | Data exists per-vendor; confirm it's reliably populated before asserting "over capacity." |
| Parking spots / restroom adequacy / power-load surfacing | **PARK (never-infer)** | Data absent **and** unsafe to infer for host events; do not build. |

---

## Success criterion — answered
**Capacity is a ROUTING problem for the core** (chairs/tables/place settings/serveware/coolers are authored in `rentalsGap` and dark — expose them via a Planning-Health capacity axis), a **DATA problem at the edges** (parking/restrooms/power are absent), and **largely a NEVER-INFER boundary** for those edges. It is **not a UI problem** — the owning surface (`getEventReadiness` / Planning Health) already exists. Smallest win: backfill Dinner Party `rentalsGap` + one capacity readiness axis that states the need.

*Audit only — nothing built or changed.*
