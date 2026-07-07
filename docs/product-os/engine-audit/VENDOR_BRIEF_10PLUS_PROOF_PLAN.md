# TENPLUS-1 — Vendor Brief + Vendor Confirmation: 10+ Real-Usage Proof Plan

Status: **Trial-ready** (2026-07-06). This is a proof slice, not a feature.
The engines are implementation-complete; what's missing for 10+ is evidence
that they change real coordination behavior. This document defines exactly
what to prove, how, and the pass/fail line.

## 1 · Executive verdict

The external coordination loop (brief → vendor response → host action → state
update) is **fully built, fully tested, and production-deployed** — and
**zero real vendors have used it.** No code is required to run the trial: the
app already captures every evidence field this plan needs (server confirmation
rows with timestamps, vendor logs, status/contact writes, self-clearing
actions). The correct next step is to run the trial script below on 3 events /
5+ vendors and fill the evidence table. Both engines move from "Possible" to
**Trial-ready** today; neither may claim 10+ until the table is filled and
passes.

## 2 · Current flow map

| Step | Where it lives |
|---|---|
| 1 Host mints/opens brief | `mintVendorBriefLink` (lib/api/vendorBrief.js) → `POST /api/events/{id}/vendor-brief-links` (planner-auth); share UI in vendor cockpit (VendorPlanningWorkspace) |
| 2 Vendor sees safe info | `GET /api/public/vendor-brief/{code}` → whitelist payload; frontend mirror `buildVendorBriefPayload` + `vendorRosSlice` (lib/vendorBrief.js); legacy long-token fallback via `looksLikeBriefCode` |
| 3 Vendor confirms / reports issue | VendorBriefConfirmBlock → `submitVendorBriefConfirmation` → `POST /api/public/vendor-brief/{code}/confirm`, idempotent on (code, `vendorBriefIdempotencyKey`) |
| 4 Host sees response | `fetchVendorConfirmations` → `GET /api/events/{id}/vendor-confirmations`; `latestConfirmationFor` + `describeConfirmation` → VendorConfirmationNote row in the cockpit |
| 5 Host acts | `confirmationActionsFor(row, vendor)`: Save/Replace on-site contact · Mark confirmed (fires Decision Memory `promptDecision`) · Add issue to vendor log (`contactLogEntry`/`issueLogEntry`/`MARK_CONFIRMED_LOG`) |
| 6 State reflects reality | Actions write vendor.status / onSiteContact / log on the event blob → vendor axis of `getEventReadiness` → `wholeEventReadinessScore` + `eventPlan()` recompute; actions self-clear (recomputed per render, never stored) |
| 7 No leakage | Whitelist by construction both sides (copy named fields, never spread); vendorRosSlice sends only that vendor's cues |
| 8 Reusable across categories | Brief payload is category-agnostic; ROS slice + briefNote carry the specifics |

## 3 · Already production-proven (read-only re-verified 2026-07-06)

- Production frontend serves current bundle `main.cd902788.js`.
- Tokenized resolve path live: mint / reuse / freshness / privacy / legacy
  fallback verified in production during VB2 Phase 1 acceptance (f56753d).
- Garbage codes 404 opaquely (re-checked today, read-only).
- Confirm endpoint + planner read-back verified live in 2A on the local
  preview against the real backend; deployed since.

## 4 · Test-proven only

- Idempotent double-submit (backend test_vendor_brief.py, 16 tests).
- Action clearing after host applies an action (vendorBriefConfirm, 22 tests).
- Privacy whitelist exactness (vendorBrief 9 + backend field assertions).
- Decision Memory prompt on Mark confirmed.
- Legacy long-token fallback (vendorBriefApi 6).

## 5 · Not yet proven with real vendors

- A vendor opening the link cold — no explanation from Todd — and
  understanding what to do.
- Vendor-authored confirmations/issues (all rows so far are self-submitted).
- The loop reducing chasing (texts/calls avoided) rather than adding admin.
- Cross-category reuse in the wild (only catering-shaped runs exercised).
- Vendor-side mobile experience on their own devices.
- QR/share-channel handoff (link is short enough for SMS; QR untested).

## 6 · Privacy proof checklist (verify per trial run)

- [ ] Brief shows: event name/date/venue, this vendor's arrival/ROS cues, briefNote, host contact intent — nothing else.
- [ ] No budget numbers, no other vendors' names/costs, no guest list, no internal notes, no planner AR/fees.
- [ ] Issue/confirm form asks only: state, on-site name/phone, note.
- [ ] Old code 404s after event delete/reseed (demo reset behavior, live-proven).
- [ ] Protected real link (Oxon Hill Manor) never used in trials.

## 7 · Vendor category proof checklist

Run at least one full loop in each available category; the engine claims
category-agnosticism, so prove it:

- [ ] Venue / logistics (VFW Post 3150 shape — COI, load-in)
- [ ] Food / catering (Capital Rotisserie shape — arrival, buffet cues)
- [ ] Entertainment / DJ (Beltway Sound Collective shape)
- [ ] Media / photo-video (Anacostia Frame & Film shape)
- [ ] Rentals / decor / setup (Old Town Tent & Party shape)

## 8 · Host/planner action proof checklist (per response)

- [ ] Response visible in the vendor cockpit row without refresh gymnastics.
- [ ] Save on-site contact writes the vendor fields and the button clears.
- [ ] Mark confirmed updates status, fires the Decision Memory prompt, clears.
- [ ] Add to vendor log appends a dated entry, clears.
- [ ] Vendor axis / Command surface reflects the change afterward.
- [ ] No action required a manual workaround (SQL, localStorage, re-mint).

**Trial packet (TENPLUS-2):** everything needed to run this trial —
messages, tracker CSV, scorecard, review template, 10-minute quick start —
lives in [vendor-brief-trial/](vendor-brief-trial/README.md).

## 9 · Real-usage trial script

1. Seed the flagship demo event (Demo Tools bar → delete+reseed = fresh brief
   codes, zero confirmation rows) plus up to 2 additional disposable events.
2. For each of 5–10 vendors: open the cockpit → mint/copy the brief link.
3. Send the link over the channel the vendor actually uses (SMS/email). Say
   nothing beyond "here's your event brief" — comprehension is being tested.
4. Vendor opens on THEIR device: record open, path (link vs QR), device.
5. Vendor confirms or reports an issue with a real note.
6. Host opens the cockpit, applies the offered action(s).
7. Verify state + readiness/action surfaces updated; record any confusion,
   leakage, or workaround.
8. Fill one evidence-table row per vendor run. Screenshot the vendor's view
   and the cockpit row before/after.
9. Real vendors preferred; a simulated run (colleague/family playing the
   vendor, on their own phone, no coaching) counts at reduced weight — mark
   it in the vendor label.

## 10 · Evidence capture table (one row per vendor run)

| Event | Category | Vendor label | Brief generated | Link opened | Path (link/QR) | Confirmed / issue | Note quality | Host action taken | State updated | Readiness surface updated | Privacy issue? | Confusion point | Manual workaround? | Screenshot/log | Pass/fail |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | | | | |

Evidence sources already available without new code: server confirmation rows
(state, fields, created_at, idempotency key) via the planner read-back
endpoint; vendor log entries (dated); vendor status/contact fields;
Decision Memory records; screenshots.

## 11 · 10+ criteria (doctrine §6)

Canonical source · tests · production verification · mobile/demo quality · no
fatal flaws · audience safety · applicability · commercial value · reuse ·
trust impact · moat · visible "No Guesswork" wow · expansion without rework ·
no fake certainty · **improves user behavior, not just UI copy**. The last
one is the open gate for both engines.

## 12 · What would make Vendor Brief 10+

Trial passes across ≥3 categories: vendors open without explanation,
understand, see only safe data, get latest event truth, respond without
login — AND the host reports fewer chasing texts/calls for those vendors.

## 13 · What would make Vendor Confirmation 10+

Every real vendor response produces a visible host action where expected;
actions complete and self-clear; the issue path leads to a real resolution
step (log → follow-up), not just a stored row; hosts describe the loop as
less work, not more.

## 14 · What would still block 10+

Any privacy leak (instant fail + fatal-flaw review) · a vendor needing
walkthrough help to respond · responses that don't surface or don't convert
to action · any manual workaround · single-category-only success · a broken
vendor-side mobile experience.

## 15 · Recommended trial size and pass/fail threshold

**Size:** 3 events (1 flagship demo + 2 real or disposable), 5–10 vendor runs
across ≥3 categories, ≥2 runs by genuinely external people on their own
devices.

**Pass:** ≥80% of runs pass their row with ZERO privacy issues and ZERO
manual workarounds, covering ≥3 categories and both response states
(confirmed AND issue) at least once each. Privacy or workaround failures are
not averaged away — one privacy leak fails the trial.

**Fail:** below threshold → file each failure as a repair slice; re-run after.

## 16 · Next implementation slice if evidence capture is insufficient

Only if the trial shows the app cannot capture its own evidence: a tiny
`confirmationOutcomeFor(row, vendor)` helper (pure, test-only surface)
reporting whether a confirmation row has had host action applied — derivable
today from `confirmationActionsFor(row, vendor).length === 0` plus log
entries, so build it ONLY if trial bookkeeping proves too manual. Anything
bigger (analytics, notifications, portal) is out of scope by doctrine §11.

---

## Vendor External Coordination Matrix (pre-plan audit)

| Step | File/API | Behavior | Tests | Prod proof | Missing evidence | Risk | Needed | Applied/parked |
|---|---|---|---|---|---|---|---|---|
| Mint | api/vendorBrief.js → POST vendor-brief-links | Planner-auth mint, code reuse | api 6 | VB2 Phase 1 live | none | low | — | n/a |
| Resolve | GET public/vendor-brief/{code} | Whitelist payload, legacy fallback, 404 opaque | backend 16 + lib 9 | live-verified + 404 re-checked today | vendor comprehension | low | trial §9 | docs |
| Confirm | POST …/confirm | Idempotent, state+fields | backend + lib 22 | 2A verified | real vendor-authored rows | med | trial §9 | docs |
| Read-back | GET vendor-confirmations | Planner list | backend | 2A verified | none | low | — | n/a |
| Actions | confirmationActionsFor + cockpit | Save contact / mark confirmed / log; self-clear | lib 22 | 2B-1 live-verified | real-response conversion | med | trial §8 | docs |
| State→intelligence | vendor writes → readiness/eventPlan | recompute from blob | ctaStateTransitions | PROGRESS suites | surface-update evidence per run | low | trial row field | docs |
| Privacy | whitelists both sides | copy-named-fields | vendorBrief 9 + backend | live privacy verify | per-trial re-check | HIGH if wrong | §6 checklist | docs |
| Cross-category | payload category-agnostic | same shape | fixtures catering-heavy | none | multi-category runs | med | §7 checklist | docs |

**Fix applied:** none needed — documentation only. **Parked:** the §16 helper
until proven necessary; QR rendering polish unless the trial flags it.
