# PLACE-DIFM-1 — Arrival/parking draft for Place Intelligence (2026-07-07)

## 1 · Executive verdict
The Place card's "Parking & access · Needs info" is no longer only a routed
gap: a **"Draft parking note"** action inserts a conservative, editable
starter into the existing `parkingNotes` field, focuses it, and — because the
Place card re-derives from the same field — the section flips to Handled the
moment the text lands. One pure export on the canonical DIFM module, one
button on the existing card. No new engine, no new field, no sending.

## 2 · Place DIFM Matrix

| Section | Field | Anchor | CTA today | Draft helper | Data available | Invented-fact risk | Decision |
|---|---|---|---|---|---|---|---|
| Parking & access | parkingNotes | parking-notes | Add parking notes (kept) | **draftParkingInstructions — SHIPPED** | venueKind/venue/venueCity/rainPlan | mitigated: unknowns are bracketed [fill-in / confirm] prompts, never assertions | applied + 7 tests |
| Guest arrival | no dedicated field (address lives in venue block) | event-venue | Add the address (kept) | none possible without inventing a field | — | — | **parked per spec** ("if there is no separate arrival field, do not invent one") |
| Rain backup | rainPlan | rain-plan | Add rain backup | already exists (suggestRainPlan, RAIN-2) | — | — | none needed |
| Vendor setup | loadInNotes | loadin-notes | Add load-in notes | candidate (BRIEF-ASSIST-1 territory) | vendor categories/playbook asks | med | parked → next slice |
| Venue contact / rules | venueContact/houseRules | venue-contact / house-rules | Add … | drafting a contact/rules would BE inventing facts | — | high | parked permanently |

## 3 · Files inspected
placeIntelligence.js (+15 tests) · doItForMe.js (+52 tests) · Event Details
fields/anchors (all six) · Place card render · vendorBrief.js whitelist
(parkingNotes NOT whitelisted — confirmed by grep, now pinned) · CTA
deep-link suites · all four required doctrine/audit docs (TRUST_CONTRACT_1
absent — noted).

## 4 · Files changed
- `src/lib/doItForMe.js` — `draftParkingInstructions(event)` (pure,
  deterministic, ~20 lines).
- `src/App.js` — "Draft parking note" button on the Place card's parking row
  (import + one block; shown only while `parkingNotes` is empty).
- `src/lib/__tests__/placeIntelligence.test.js` — 7 new contract tests.

## 5 · Helper behavior
At-home → "Guests can park [street / driveway / nearby lot — pick what
fits]. Come to [front door / side gate / backyard — pick one]." Venue →
"Parking at {venue} in {city}: [lot / street / garage — confirm with the
venue]. Enter through [main entrance / event entrance — confirm with the
venue]." No location at all → a fill-in-once-set starter. If a rain plan
exists, appends "If weather turns: {the host's plan verbatim}". Every branch
carries at least one bracketed prompt — the draft is scaffolding, never a
claim.

## 6 · UI behavior
Button renders ONLY while the field is empty (silent overwrite is
structurally impossible); click inserts the draft via the field's normal
`upd` path (same save/persistence as typing), focuses `parking-notes` via
the standard anchor scroll, the section flips Needs info → Handled on
re-derive, and the button self-clears. The existing "Add parking notes" CTA
is kept beside it (route-only remains available).

## 7 · Data used / 8 · Deliberately not invented
Used: venueKind, venue, venueCity/city, rainPlan. Never generated: free
parking, valet, shuttle, accessible parking, entrances-as-fact, staff,
security, coat check, elevators, garages-as-fact (test-banned as a regex).

## 9 · Audience safety
Host/planner field content only; nothing sends. `parkingNotes` is NOT in the
vendor brief whitelist — now pinned (serialized payload must not contain the
draft's marker phrase or the field name). Guest brief already includes
host-authored parking BY DESIGN (guests need parking info) and only after
the host edits/saves — unchanged.

## 10–14 · Tests & runs
7 new tests (conservative at-home / venue name+city / never-invents ban /
insufficient-data starter / rain verbatim + only-when-present / saved draft
clears the Place gap / brief-payload privacy). Targeted place+difm+cta:
87/87. **Frontend 1984/1984 · backend 97/97 · build clean.**

## 15 · Desktop preview
Venue event, empty parking, rain plan set: button visible → click → draft
with venue+city+bracketed prompts+rain tail inserted, field focused in view,
card flipped to "Parking & access · Handled", button gone. At-home and
has-text cases covered by tests (button structurally absent when text
exists).

## 16 · Mobile preview (375px)
Same loop: draft inserted, field in view, no overflow (wrap ≤375px), card
Handled, zero console errors. Disposable event cleaned.

## 17 · Production smoke
Deployed after suites; bundle + chunk presence verified read-only (see
commit). No real data touched.

## 18 · Parked
Arrival draft (no dedicated field — per spec) · load-in draft (belongs to
BRIEF-ASSIST-1 with vendor-category asks) · venue contact/rules drafts
(would be invention by definition) · any guest-sending (GUEST-UPDATE-1).

## 19 · Recommendation
**Accept.** Acceptance bar met: the Place card now helps the host CREATE
truthful, editable details and the gap clears on save. Next per the DIFM
order: GUEST-UPDATE-1 or BRIEF-ASSIST-1.
