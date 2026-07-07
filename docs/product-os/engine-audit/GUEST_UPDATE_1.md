# GUEST-UPDATE-1 — Guest-safe "something changed" update drafts (2026-07-07)

## 1 · Executive verdict
Hosts can now draft guest-safe updates in one tap: a **"Something changed?"**
row on the Guests tab's Invites & replies card offers **Draft guest update /
Parking update / Rain update** (rain only when a rain story exists). Each
opens the existing DraftSheet — editable first, explicit Copy / Share-Send,
never sent by the app. One pure export on the canonical DIFM module
(`draftGuestUpdate`), structurally leak-free, PLACE-DIFM-1 pattern exactly.

## 2 · Guest Update DIFM Matrix

| Surface | Existing helper | Audience | Inputs | Output | Save/send | Risk | Decision |
|---|---|---|---|---|---|---|---|
| Guests · Invites & replies card | DraftSheet handoff (RSVP chase, dietary, thank-you precedents) | guest | name/venue/city/date/timeOfDay/parkingNotes/rainPlan | {subject, body} editable draft | edit → explicit Copy/Share (existing) | leak of internal logistics → structurally impossible (helper never reads vendor/budget/planner fields) + test ban | **applied** |
| Weather surface rain update | guestRainMessage (GUEST-RAIN-2) already exists w/ real forecast window | guest | forecast + rainPlan | SMS-shaped | share | — | not duplicated — draftGuestUpdate(rain) is the forecast-FREE variant ("We're still on" + plan verbatim); guestRainMessage stays the forecast-aware one |
| Place card | parking draft (PLACE-DIFM-1) writes the FIELD; this drafts the MESSAGE | — | — | — | — | confusion between the two | kept separate on purpose: field content vs guest message |
| Readiness/CTA state | none exists for "guests informed" | — | — | — | — | fake state-clearing | **local-only DIFM, documented — no state faked** |

## 3 · Files inspected
doItForMe.js (all drafts + sheet contract {subject, body}) · weather.js
(guestRainMessage — not duplicated) · Guests tab card + DraftSheet render
(32596) · vendorBrief whitelist + tests · guestUpdate/rainAssist suites ·
all required doctrine/audit docs (TRUST_CONTRACT_1 absent — noted).

## 4 · Files changed
- `src/lib/doItForMe.js` — `draftGuestUpdate(event, {type})`, six types
  (general / parking / rain / time / location / arrival).
- `src/App.js` — "Something changed?" row with the three buttons (+import).
- `src/lib/__tests__/guestUpdate.test.js` — 6 contract tests.

## 5 · Helper behavior
Deterministic templates per type. Known facts render (event name, venue+city,
parkingNotes verbatim, rainPlan verbatim, date/time phrase); every unknown is
a bracketed [add … here] prompt. Rain says "We're still on." and never claims
rain is confirmed (that stays with the forecast-aware guestRainMessage).

## 6 · UI behavior
Buttons open the DraftSheet with intro copy telling the host the brackets are
theirs to fill; the sheet's textarea is editable (verified live: appended
text applied); sending is the sheet's existing explicit Share/Copy. No
overwrite is possible — every tap builds a fresh draft into the sheet, never
into a stored field.

## 7 · Data used / 8 · Never invented
Used: name, venue, venueCity/city, date, timeOfDay, parkingNotes, rainPlan.
Banned by test across all 6 types × shapes: load-in, power, catering setup,
COI, insurance, payment, deposit, budget, planner, internal, private,
invoice, contract, valet, shuttle, staff, entrances-as-fact, vendor
names/emails/phones, weather certainty.

## 9 · Audience/privacy safety
The helper cannot read vendor contacts, money fields, or planner notes — the
leak ban is structural plus a regex sweep over every type. Vendor brief
payload pinned free of draft content ("Hi everyone", bracket markers).

## 10 · State/CTA behavior
No "guests informed" readiness state exists in the data model → none faked.
Documented local-only DIFM. Existing CTAs untouched.

## 11 · Local-only
The whole feature is deliberately local-only DIFM until a real
guest-communication state exists to clear.

## 12–16 · Tests & runs
6 new tests (event-name use/degrade · parkingNotes-only-when-present +
bracket fallback · rainPlan verbatim + no-confirmed-rain · venue/city gating
· structural leak ban across all types/shapes · brief-payload privacy).
Targeted difm+guest+rain+place+payoff: 103/103. **Frontend 1990/1990 ·
backend 97/97 · build clean.**

## 17 · Desktop preview
All three buttons render on the card; parking sheet carried the real notes
("Lot behind the post; overflow on Fayette St."), was editable, showed
explicit Copy + Share/Send; rain sheet carried the plan verbatim with
"We're still on."; zero console errors.

## 18 · Mobile preview
Sheet renders at 333px on a 375px viewport, editable, no overflow, zero
console errors. Disposable event cleaned.

## 19 · Production smoke
Deployed after suites; bundle verified read-only (see commit). No real data
touched.

## 20 · Parked
time/location/arrival buttons (helper + tests exist; UI shows the three
highest-value types to avoid button spam — add on demand) · any send
infrastructure · "guests informed" readiness state (needs a data-model
decision first).

## 21 · Recommendation
**Accept.** Acceptance bar met: truthful, guest-safe, editable, leak-tested,
and it never pretends to have sent anything. Next: BRIEF-ASSIST-1.
