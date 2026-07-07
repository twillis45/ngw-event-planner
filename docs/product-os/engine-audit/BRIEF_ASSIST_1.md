# BRIEF-ASSIST-1 — Vendor Brief missing-detail ask helper (2026-07-07)

## 1 · Executive verdict
The Vendor Brief share panel now closes its own gaps: a **"Still missing from
this brief"** block names exactly what's absent (arrival time · on-site
contact · a note for the day) and **"Ask for missing details"** drafts a
short, editable, vendor-safe ask — category-grounded, ask-only, explicit
Copy, never sent by the app, never in the public payload. One pure export on
the canonical DIFM module + one block in the existing VendorBriefModal.
Direct 10+ support: incomplete briefs were a "missing proof" line in the
proof plan; the app now helps complete them.

## 2 · Vendor Brief Assist Matrix

| Category | Playbook grounding | Ask bullets | Risk | Decision |
|---|---|---|---|---|
| Catering/food | finalCount/cleanup ask style | final count planned for · setup/table/service timing | low (questions only) | shipped |
| Photo/video/media | shotList ask | shot list / timeline / location needs | low | shipped |
| DJ/entertainment/band | arrival/power style | power + setup space · when they want the run of day | low | shipped |
| Venue/logistics | loadIn/vendor_rules/day_of_contact promises | load-in time + entrance · access rules/curfew | low | shipped |
| Rentals/decor | delivery windows | delivery/pickup windows · staging | low | shipped |
| Unknown | generic | arrival · on-site contact · anything you need | low | shipped |
| Basics (all) | brief payload fields | arrival + on-site contact asked ONLY when missing — known values are neither re-asked nor asserted | — | shipped |

## 3 · Files inspected
doItForMe.js · vendorBrief.js whitelist + VendorBriefModal (the only brief
share UI — reachable cockpit → Edit details → Share Brief) ·
vendorAccountability/playbooks (ASKS + commonPromises per category) ·
vendorBriefConfirm actions · all brief/privacy/confirmation suites · all
required doctrine/audit docs (TRUST_CONTRACT_1 absent — noted).

## 4 · Files changed
- `src/lib/doItForMe.js` — `draftVendorBriefAsk(event, vendor)`.
- `src/App.js` — missing-details block + local editable ask box + Copy /
  Discard in VendorBriefModal (state `askDraft`, focused on open).
- `src/lib/__tests__/briefAssist.test.js` — 6 contract tests.

## 5 · Helper behavior
{subject, body}. Greeting degrades to "Hi there" without a name. Bullets =
missing basics (asked only when genuinely missing) + category asks + the
universal "anything you need from us." Pure, deterministic, reads only
event/vendor fields it may reference.

## 6 · UI behavior
Block renders only when the brief is missing basics. Button → local textarea
prefilled + focused, fully editable, explicit "Copy ask" + "Discard", with
the honest footer "the app never sends for you." Button hides while a draft
exists — overwrite impossible. Brief generation/minting untouched.

## 7 · Data used / 8 · Never invented
Used: vendor.name/category and the presence-checks of arrivalTime /
onSiteContactName / onSitePhone / briefNote. Never generated: any time,
staff count, power/equipment fact, load-in claim, payment/insurance/COI
status, "you confirmed…" (assertion regex test-banned across all
categories).

## 9 · Category grounding
Buckets mirror the accountability playbooks' authored question style (ASKS:
arrivalTime/loadIn/finalCount/shotList/parking; venue commonPromises:
load-in, vendor rules, day-of contact) — asks, never claims.

## 10–11 · Audience/privacy + public payload
Draft is host-side copy for a vendor recipient — it cannot leak internal
data because the helper never reads budget/payment/rationale/guest/planner
fields; the leak+assertion ban is swept per category in tests, including a
seeded decision-memory rationale that must never appear. Public payload
pinned free of the ask text. The public brief payload is UNCHANGED.

## 12 · State behavior
No "ask sent" state exists → none faked; the draft is local to the modal and
discards cleanly. Writing the ask into the vendor log was considered and
parked (would need explicit save UI; no silent logging allowed).

## 13–17 · Tests & runs
6 new tests (generic/unknown + nameless degrade · catering · photo/DJ/venue
grounding · missing-basics-only discipline incl. never asserting the known
time · assertion + privacy + rationale ban per category · public-payload
pin). Targeted brief+difm+privacy suites: 129/129. **Frontend 1996/1996 ·
backend 97/97 · build clean.**

## 18–19 · Preview
Desktop: caterer with no arrival/contact/note → block listed all three →
ask opened focused with the exact catering ask (verified verbatim) →
editable. Mobile: textarea 297px on a 375px viewport, no overflow. Zero
console errors both. Disposable event cleaned; protected brief links
untouched.

## 20 · Production smoke
Deployed after suites; bundle verified read-only (see commit).

## 21 · Parked
Vendor-log save of the ask (needs explicit save affordance) · surfacing the
ask outside the share panel (cockpit rows already carry their own actions) ·
any send/notify path.

## 22 · Recommendation
**Accept.** Acceptance bar met. Next in the DIFM order: PAY-COPY-1 — and the
brief trial packet remains ready whenever real vendor links go out.
