# HOST-CHOICE-SUPPRESSION-1 — Hide Irrelevant Panels by Host Planning Choice

Date: 2026-07-07 · Slice type: cognitive-load / trust repair · Status: SHIPPED

## 1. Executive verdict
Confirmed the reported problem: NO reply-pressure surface was gated on the host's guest-mode choice — every nudge/chase/alert keyed off pending-reply counts alone, so a count-only host with a tracking roster got the full RSVP-management treatment. Fixed with ONE shared reader (`lib/guestMode.js`) gating all four pressure surfaces plus the decisions action. The other 12 mismatch classes were audited; most suppressions already exist (receipts in §4).

## 2. Host Choice Suppression Matrix (changes)
| Surface | Site | Was gated on | Now gated on | Count-only host now sees |
|---|---|---|---|---|
| Guests · "Nudge the N who haven't replied" | App.js Invites & replies card | `awaiting > 0` | `+ showsReplyTracking(event)` | nothing — count is the plan |
| Guests · Invites & replies subtitle | same card | live reply math | mode-aware | "Share the invite and send updates" |
| Guests · "N guests haven't responded — Nd to go" alert | App.js non-responder block | `pending && ≤90d` | `+ showsReplyTracking` | nothing |
| HostHome · RSVP reminder hero/row | App.js ready-to-send items | `≤21d && awaiting>0` | `+ showsReplyTracking(ev)` | invite/final-details items only |
| Event-day · "N haven't RSVP'd" alert | App.js eventDayAlerts | `pendingRsvp>0` | `+ showsReplyTracking` | nothing |
| Decisions · guest-count action | lib/decisionConfidence.js | any unresolved → "Chase RSVPs" | reason-aware | "Set the count" when no count; "Chase RSVPs" only for genuinely pending roster replies |

## 3. Guest mode findings
Existing model reused, no new selector: `guestPlanningMode(event)` → `count_only` (guestMode='count' or a locked count — wins even with a roster attached, which stays visible for tracking per the Headcount card's own words), `rsvp_tracking` (guestMode='list' or a roster with no count choice), `unknown` (nothing chosen — count-first, never assumes RSVP mode from empty data). `showsReplyTracking()` is the single gate.

## 4. Other panel suppression findings (audited, already correct)
Vendorless → vendor blocks gated on `hasVendors` (CommandCenter, ROS); at-home → venue prompts fire only for `venueKind==='home'`-appropriate contexts, kind-aware placeholders; pickup/drop-off COI → COI-LOGIC-1 classifier (no "missing"); indoor → WeatherAlert gated on outdoor signals; no budget → recovery card renders only `recovery_available` (needs_more_data hides it; "Set budget" CTA exists separately); no date → buildDayBeforePlan returns not-applicable; far-future → DAY_BEFORE_WINDOW 0–2 days; no shopping list → food/supply cards derive from playbook presence. Parked: headcount-estimate vs vendor-meal-count distinction (no meal-count surface exists yet); planner/admin panels already persona-gated (`!d.isHost`).

## 5–7. Files changed / rules
- `src/lib/guestMode.js` — NEW shared reader (the one suppression source).
- `src/App.js` — 5 gates added (above).
- `src/lib/decisionConfidence.js` — reason-aware guest-count action.
- `src/lib/__tests__/guestMode.test.js` — NEW, 7 tests incl. a source contract asserting the App.js gates reference the shared reader.

## 8–9. Hidden vs kept
Hidden for count-only: nudge button, non-responder alert, HostHome RSVP reminder, day-of RSVP warning, reply-math subtitle, "Chase RSVPs". Kept (not amputated): roster with RSVP pills ("just for tracking" per existing copy), invite share, guest-update drafts (GUEST-UPDATE-1 — verified present after suppression), dietary notes, thank-yous, headcount card + Change the count.

## 10–11. CTAs & state
No dead CTAs introduced (surfaces are removed whole, not disabled); "Set the count" routes through the existing decisions flow; suppression is pure derivation from event fields — flipping guestMode back to 'list' restores every panel (verified live).

## 12. Audience/privacy
Host-only surfaces; no guest/vendor/public payload change.

## 13–17. Tests & suites
7 new tests (mode reader ×4, decisions action ×2, source contract ×1). Full frontend **2072/2072 (123 suites)** · backend **97/97** · build clean.

## 18–20. Preview & prod
Desktop, same 4-person roster with 3 awaiting on both events: count-mode event showed NO nudge/non-responder/reply-math but kept count card + update drafts (expanded card verified); list-mode event showed "Nudge the 3 who haven't replied". Mobile count-only Guests tab: clean, no overflow. Disposable `hcs-*` events removed. Prod smoke after deploy.

## 21. Parked
Vendor meal-count surface (doesn't exist); playbook task TEXTS mentioning RSVPs ("Confirm RSVPs and final headcount") — timeline content, not panels; a mode-switch prompt for `unknown` events (existing hero stepper already IS the count-first default).

## 22. Recommendation
Accept. The host's setup choice now governs the guest surface, enforced by a single tested reader.
