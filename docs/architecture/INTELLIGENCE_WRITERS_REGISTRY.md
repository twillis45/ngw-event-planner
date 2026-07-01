# Intelligence Writers Registry — Canonical Contract

**Status:** Canonical, living. Part of the [Intelligence OS](./INTELLIGENCE_OPERATING_SYSTEM.md) (governs the write side of #3 Host Intelligence, and every later domain the reconciliation loop fills).
**Owner:** Todd. **Established:** 2026-07-02.
**Pairs with:** the read-side twin, [Intelligence Readers Registry](./INTELLIGENCE_READERS_REGISTRY.md).

> **The rule (hard):** **No code may write an observation into `profile.hostIntelligence` unless it is registered here.** A pull request that appends memory without a registry entry is incomplete. This is the exact mirror of the readers' rule — where the readers registry stops the *consuming* side from spreading inconsistently, this registry stops the *producing* side. Every write declares, in one place, exactly what it stores, how it dedupes, and that it holds no guest PII.

---

## 0. Why a registry (not scattered writes)

Reads that drift are how a product loses coherence; writes that drift are how it loses *trust in its own data*. If N surfaces append observations N different ways — different dedupe keys, different confidence impact, a silent harvest here, a double-count there — the store beneath every reader is quietly corrupt, and no amount of careful reading can recover it. A single writers registry means: one place to see everything that produces intelligence, one guarantee that every observation is `{eventId, date, estimate, actual}` (+ host-typed lesson text) and nothing more, one guarantee that re-running a capture edits in place rather than inflating the count. It is the contract layer *feeding* the stores that the [readers registry](./INTELLIGENCE_READERS_REGISTRY.md) contract layer *drains*.

Every stored number is a **reconciled estimate-vs-reality fact** the host confirmed (INTEL-1 §0.1). A writer's only job is to turn a confirmation into a fact and dedupe it — never to fabricate a multiplier, never to guess a delta ([INTEL-1 §3](./INTEL_1_HOST_INTELLIGENCE_PROFILE.md)).

---

## 1. The entry contract — every writer answers all nine

Each registered writer MUST specify:

1. **Writer** — the surface/function that writes (name + `file:line`).
2. **Which event** — the event the observation is keyed to (always `eventId`; a write without a real event key is a no-op, `hostIntel.js:189`).
3. **Which domains/fields** — which memory domains it writes (`attendance` / `food.items` / `budget` / `weather` / `cooking` / `guests` / `shopping` / `equipment` / `lessons`).
4. **Overwrite vs append** — does re-running overwrite this event's prior observation or append a new one? (Today, universally: **dedupe-by-`eventId` = overwrite-in-place** — `pushObs` drops any existing observation with the same `eventId` before pushing, `hostIntel.js:136–140`. Never a blind append.)
5. **Confidence impact** — how the write moves the domain's confidence: it adds **one** observation toward that domain's own count (Low 1–2 / Medium 3–4 / High 5+, [INTEL-1 §5a](./INTEL_1_HOST_INTELLIGENCE_PROFILE.md)). It **never fabricates confidence** — confidence is computed from observation count/recency at read time, so a writer can only *contribute a fact*, not assert a level.
6. **Dedupe strategy** — the key (`eventId`) + cap (last **8** per rollup, `MAX_OBS`, `hostIntel.js:15`) + recency (observations older than 18 months stop counting toward confidence, `STALE_MONTHS`, `hostIntel.js:16`).
7. **Analytics event** — what is tracked when it writes.
8. **User-visible?** — does the host see/confirm this write (an explicit "Save" tap) or is it a silent harvest of a number the host already entered?
9. **PII guard** — confirm it stores ONLY `{eventId, date, estimate, actual}` (+ host-typed `lesson` text for the `lessons` list), never a guest name, address, or per-guest datum ([INTEL-1 §6.2](./INTEL_1_HOST_INTELLIGENCE_PROFILE.md); `hostIntel.js:136–137` clean-projects every observation to exactly those four keys).

A writer that can't fill all nine is not ready to ship.

**All writes go through the pure helpers.** No surface mutates `profile.hostIntelligence` directly — every write is a call to `applyReconciliation` (or, lower level, `appendObservation` / `appendFoodObservation` / `markEventObserved`) in `src/lib/hostIntel.js`, each of which returns a NEW immutable object, dedupes by `eventId`, caps at `MAX_OBS`, and projects to the no-PII shape. That single choke-point is what makes this registry enforceable.

---

## 2. Registered writers

### Status legend: 🟢 live · 🟡 approved-unbuilt · ⚪ proposed

### W1 · Post-Event Reconciliation → attendance / food / budget / weather / lessons  🟢 live (INTEL-1 P2, shipped 2026-07-02)
| Field | Value |
|---|---|
| **Writer** | `applyReconciliation(hostIntelligence, entry)` (`hostIntel.js:185`), driven by TWO capture sites inside `PostEventRecap` (`App.js:21322`): (a) the **"How'd it go?"** card `HowdItGoCard.save` (`App.js:21245`, via `onPatchProfile` at `:21254`) — per-item leftovers, ice/drinks, one lesson; (b) **"the final numbers"** harvest `harvestToMemory` (`App.js:21344`) fired on blur of the actual-guests input (`:21453`) and actual-spend input (`:21456`) |
| **Which event** | `ev.id` — every observation keyed to it; `applyReconciliation` returns unchanged if `eventId` is falsy (`hostIntel.js:189`) |
| **Which domains/fields** | `attendance` (planned vs actual came), `food.items[itemId]` (per-item planned × consumedRatio, top 3 priced items), `budget` (estimate × ratio), `weather` (ice ratio, `estimate:1`), `lessons` (host free-text). Cooking / guests / shopping / equipment are NOT written by W1 — no live capture feeds them yet |
| **Overwrite vs append** | **Overwrite-in-place, dedupe by `eventId`.** Re-opening the recap and re-saving edits the same event's observation in every domain (`pushObs` filters out the prior same-`eventId` entry, `hostIntel.js:138`). Reconciling the same event twice does NOT double-count — `eventsObserved` is `Object.keys(reconciled).length`, a set keyed by `eventId` (`hostIntel.js:219–220`) |
| **Confidence impact** | Adds one observation per answered domain toward that domain's independent count; increments `eventsObserved` once per newly-reconciled event. Skipped fields write **nothing** (`wrote` stays false ⇒ store returned unchanged, `hostIntel.js:217`) — no fabricated observation, therefore no fabricated confidence |
| **Dedupe strategy** | key `eventId`; cap last 8 per rollup (`MAX_OBS`); lessons capped at last 20 (`hostIntel.js:213`); reads decay past 18 months (`STALE_MONTHS`) |
| **Analytics event** | `outcome_captured` (`EVENTS.OUTCOME_CAPTURED`) fired on both the "How'd it go?" save (`App.js:21256`, `{kind:'reconciliation'}`) and the outcome Segs; `event_completed` fired once per event via `trackOnce` (`App.js:21335`). *(No dedicated `intel_*_written` event today — the applied/reverted analytics live on the READ side, R1.)* |
| **User-visible?** | **Yes, host-confirmed.** The "How'd it go?" card requires an explicit **"Save what we learned"** tap (disabled until an answer exists, `App.js:21310`) and collapses to a "Saved — this makes next time's plan sharper" confirmation (`:21278–21287`). The numbers harvest is **semi-silent**: it fires on blur of fields the host *already* typed (actual guests / actual spend) — single-source, so the card never re-asks them; the host sees the field, not a second confirmation step |
| **PII guard** | ✅ Stores ONLY `{eventId, date, estimate, actual}` per observation + `{eventId, date, text}` for lessons. `consumedRatio` / budget `ratio` / ice `ratio` are converted to an `actual` at write time (`hostIntel.js:199, 204, 208`) — no roster, no guest name, no address ever enters. `mailingAddress`/RSVP PII is structurally excluded ([INTEL-1 §6.2, §6.4](./INTEL_1_HOST_INTELLIGENCE_PROFILE.md)) |

*Scope note: W1 is the **one live writer today**. It is single-source by design — attendance and spend are captured exactly once (in "the final numbers"), and the "How'd it go?" card deliberately owns only what nothing else captures (leftovers, ice, lesson) so no domain is double-asked (`App.js:21232–21234`).*

---

### Proposed writers (⚪ — specced, NONE built)

Each mirrors the W1 discipline: one observation per event per domain, dedupe by `eventId`, cap 8, no PII, through the pure helpers only. They are listed so the write side is planned as deliberately as the read side. **None of these exist in code yet.**

### W2 · RSVP reconciliation → attendance  ⚪ proposed
| Field | Value |
|---|---|
| **Writer** | a close-out reader over final RSVP states (accepted/declined/no-response) → the host confirms an actual headcount; would call `appendObservation(hi, 'attendance', …)` |
| **Which domains/fields** | `attendance` (planned vs actual came) — same domain W1 already writes |
| **Overwrite vs append** | overwrite-in-place by `eventId`; **must coexist with W1** — one attendance observation per event, so W2 and W1's attendance path are the SAME row and may not both write the same event (single-source: RSVP-derived OR host-entered, not both) |
| **Confidence impact** | +1 attendance observation; never fabricates a spread — writes only when the host confirms a real number ([INTEL-1 §7.1](./INTEL_1_HOST_INTELLIGENCE_PROFILE.md)) |
| **Dedupe / analytics / user-visible / PII** | key `eventId`, cap 8; new `intel_attendance_written` event; host-confirmed at close; stores `{eventId,date,estimate,actual}` only — **an aggregate count, never the RSVP roster** |

### W3 · Shopping completion → food / shopping  ⚪ proposed
| Field | Value |
|---|---|
| **Writer** | a "what did you actually buy / have left over?" capture at close → `appendFoodObservation` per item + frequency bump on `shopping.stores[]` |
| **Which domains/fields** | `food.items[itemId]` (actual bought/leftover per canonical item id, via the FOOD-2C `displayName`/`rawCategory` seam) + `shopping.stores` (which store, frequency count) |
| **Overwrite vs append** | food: overwrite-in-place by `eventId` per item; stores: a frequency list (append-with-count, not per-event dedupe — it's a tally, not a ratio) |
| **Confidence / dedupe / analytics / user-visible / PII** | +1 food observation per item, cap 8; store names are non-PII operational strings (Costco/Butcher), never a guest datum; host-confirmed; new `intel_shopping_written` |

### W4 · Weather observation → weather / ice  ⚪ proposed
| Field | Value |
|---|---|
| **Writer** | at close of an **outdoor/at-home** event (`isAtHome`), capture observed conditions vs plan → `appendObservation(hi, 'weather', …)`; W1 already writes the ice ratio, this would broaden to observed temp/shade deltas |
| **Which domains/fields** | `weather` (ice/shade/water delta) |
| **Overwrite vs append** | overwrite-in-place by `eventId`; coexists with W1's ice write (single weather row per event) |
| **Confidence / dedupe / analytics / user-visible / PII** | +1 weather observation, cap 8, only for outdoor/at-home; new `intel_weather_written`; host-confirmed; stores the delta as `{estimate,actual}` only |

### W5 · Vendor completion → (future `vendor` domain)  ⚪ proposed
| Field | Value |
|---|---|
| **Writer** | the recap's existing vendor-outcome Segs (`setOutcome('vendor_…')`, `App.js:21330`) would feed a NEW `vendor` domain (showed / quality) — **requires a new domain be added to `DOMAINS`** (`hostIntel.js:23`) first |
| **Which domains/fields** | `vendor` (per-vendor showed/on-time/quality) — does not exist today |
| **Overwrite vs append** | overwrite-in-place by `eventId` (+ vendor id); one observation per vendor per event |
| **Confidence / dedupe / analytics / user-visible / PII** | +1 per vendor, cap 8; host-confirmed (the outcome Seg is already visible); PII guard: store a vendor id/name + operational rating, **never guest data**; new `intel_vendor_written`. *Blocked on: defining the `vendor` domain shape + a registered reader before any read-forward.* |

### W6 · Budget completion → budget  ⚪ proposed
| Field | Value |
|---|---|
| **Writer** | a final-actuals sweep (`event.budget` actuals + `foodLocked` totals) vs plan roll-up → `appendObservation(hi, 'budget', …)`. W1 already harvests a single budget ratio from "the final numbers"; W6 would reconcile the full itemized actuals |
| **Which domains/fields** | `budget` (drift ratio) |
| **Overwrite vs append** | overwrite-in-place by `eventId`; **same budget row as W1** — must be single-source (one budget observation per event) |
| **Confidence / dedupe / analytics / user-visible / PII** | +1 budget observation, cap 8; host-confirmed; stores `{estimate,actual}` dollar totals only, no line-item PII; new `intel_budget_written` |

### W7 · Timeline completion → cooking  ⚪ proposed
| Field | Value |
|---|---|
| **Writer** | at close, compare planned prep-start (`parseRosStartMin` / ROS anchor) with actual first-cue-done (`rosDone` timestamps) or a "we started ~45 late" capture → `appendObservation(hi, 'cooking', …)` |
| **Which domains/fields** | `cooking` (start-time drift in minutes, stored as an estimate/actual pair) |
| **Overwrite vs append** | overwrite-in-place by `eventId`; one cooking observation per event |
| **Confidence / dedupe / analytics / user-visible / PII** | +1 cooking observation, cap 8; host-confirmed or derived from the host's own `rosDone` marks; new `intel_cooking_written`; time deltas only, no PII |

---

### Domains with no writer yet (accrue nothing until one lands)
`guests` (kids ratio) and `equipment` (owns/borrows) are defined in `DOMAINS` and in [INTEL-1 §2e/§2h](./INTEL_1_HOST_INTELLIGENCE_PROFILE.md) but **have no registered writer** — so they store zero observations today. They become live only when a capture surface is specced, registered here (W-something), and shipped through the pure helpers. The `cooking` / `shopping` / `budget` / `weather` / `vendor` fields likewise accrue only what W1 writes (budget ratio + ice ratio + food leftovers) until W3–W7 land.

---

## 3. Governance — adding a writer

1. Fill the nine-field entry (§1) in the PR that adds the writer.
2. The writer appends memory **only** through the pure `hostIntel.js` helpers — `applyReconciliation` (or `appendObservation` / `appendFoodObservation` / `markEventObserved`) — **never** an ad-hoc mutation of `profile.hostIntelligence`. Every helper returns a new immutable object.
3. It must **dedupe by `eventId`** (overwrite-in-place) and honor the cap (`MAX_OBS = 8` per rollup). Re-running a capture may not double-count `eventsObserved`.
4. It must **honor PII** — an observation is exactly `{eventId, date, estimate, actual}` (+ host-typed `lesson` text). No guest name, address, roster, or per-guest datum. Ratios/qualities are converted to an `actual` at write time; a kids figure is stored as an aggregate, never a list ([INTEL-1 §6](./INTEL_1_HOST_INTELLIGENCE_PROFILE.md)).
5. It must be **host-confirmed or single-source-silent**: either an explicit save/confirm, or a harvest of a number the host already entered — never a dark inference of behavior the host didn't reconcile ([INTEL-1 §6.5](./INTEL_1_HOST_INTELLIGENCE_PROFILE.md)).
6. It must emit its declared **analytics** so the write is measurable (Intelligence-debt gate, [OS §0](./INTELLIGENCE_OPERATING_SYSTEM.md)).
7. If it needs a domain that isn't in `DOMAINS` (`hostIntel.js:23`), the domain shape must be added FIRST (with its INTEL-1 §2 spec).
8. Flip status ⚪→🟡 on approval, 🟡→🟢 when live + verified.

**One writer, one row — but one domain, one observation per event.** Two surfaces may not both write the same event's `attendance` (or `budget`, `weather`) observation; that's the single-source discipline W1 already enforces (attendance/spend captured once). If two capture paths could touch the same domain, they must be reconciled into one write, not two competing appends.

---

## 4. The Reader / Writer relationship

Writers and readers are two halves of one contract, gated by the same OS:

- **Writers produce observations** — reconciled `{eventId, date, estimate, actual}` facts, appended here (this registry).
- **Readers consume rollups** — recency-weighted ratios + per-domain confidence/stability, drained in the [readers registry](./INTELLIGENCE_READERS_REGISTRY.md).
- The store between them (`profile.hostIntelligence`) never holds a conclusion — only facts a writer wrote and a reader rolls up at read time. Confidence and stability are **computed on read** (`rollupFrom`, `hostIntel.js:78`), so a writer contributes a fact and a reader decides whether there's enough to act.
- **A domain only becomes read-forward-eligible once a registered writer has fed it enough stable observations.** No reader may act until its domain reaches Confidence ≥ Medium AND Stability ≥ Medium (readers §1.3–1.4, [INTEL-1 §5c](./INTEL_1_HOST_INTELLIGENCE_PROFILE.md)) — which is impossible until a writer here has appended ≥3 consistent observations. Today only **W1** feeds anything, and only **R1 (attendance)** reads forward; food/weather readers (R2/R3) stay proposed precisely because their writers' data hasn't matured. Prediction (L5) stays gated on `eventsObserved` being real — the write side is where activation and intelligence meet.

Registering a writer without a plan for who reads it is fine (a domain may accrue store-only). Registering a reader for a domain no writer feeds is not — it would honest-empty forever.

---

## 5. Pairing

This registry is the **write-side twin** of [INTELLIGENCE_READERS_REGISTRY.md](./INTELLIGENCE_READERS_REGISTRY.md). Together they are the complete contract for `profile.hostIntelligence`: this file governs everything that *writes* a fact in, that file governs everything that *reads* a rollup out. Change one, check the other.
