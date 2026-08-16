# Triply vs NGW Event Boss -- competitive read

Date: 2026-08-08 - Companion to
[`2026-07-29_MOBBIN_COMPETITIVE_READ.md`](2026-07-29_MOBBIN_COMPETITIVE_READ.md) and
[`2026-08-01_BLINK_AND_CONFIRMATION_PATTERNS.md`](2026-08-01_BLINK_AND_CONFIRMATION_PATTERNS.md).

Question driving this read: **is "Triply" a competitor, and if not, who in that
neighbourhood actually is?**

---

## Evidence limits -- read before citing anything

Three tiers, not equal:

| Source | What it proves | What it cannot show |
|---|---|---|
| Apple `itunes.apple.com/lookup` + `/search` | version, release + update dates, rating count, binary size, min iOS, seller -- authoritative metadata | nothing about what the app does |
| App Store description + Version History notes | what the developer *claims*, and *when they claimed shipping it* | whether the feature works |
| Vendor marketing sites (`triply.us`, `trip-linq.com`, `usetripi.com`) | positioning, pricing, sometimes JS-bundle strings that reveal implemented functions | shipped quality |

**Nothing below was driven live.** No competitor claim here meets the
[Check the Surface](../../CLAUDE.md) bar. Screenshot captions were not retrievable
(they are baked into image files). Reddit was unreachable to the fetcher.

Claims about **us** are `file:line` from this repo, read this session.

---

## 1. Which Triply, and is it a real competitor

### Verdict: NO. "Triply" is a dead brand slot, not a rival.

There are **at least 11 live US App Store apps named some form of "Triply"**, plus
three web products. Across all of them the **highest rating count is 13**. Not 13
thousand -- thirteen.

Metadata for the briefed candidates (Apple lookup API, retrieved 2026-08-08):

| App | ID | Seller | Version | Updated | Ratings | Read |
|---|---|---|---|---|---|---|
| [Triply](https://apps.apple.com/us/app/triply/id1437191544) | 1437191544 | Trip.ly LLC | **1.0** | **2018-09-29** | 0 | **Corpse.** One build ever, 1.0 MB binary, `iOS 8.1` deployment target, two-sided traveller-to-agent marketplace. Dead ~8 years. |
| [Triply - Trip Tracker](https://apps.apple.com/us/app/triply-trip-tracker/id6743663855) | 6743663855 | Mind Vacation Inc. | 1.02 | **2025-04-14** | 6 (5.0) | Solo trip tracker. Three builds in one week (Apr 7/11/14 2025), then silence for ~16 months. Buy-Me-A-Coffee tip jar on [triplyapp.com](https://triplyapp.com/), no pricing, no IAP. Hobby project. |
| [Triply Travel](https://apps.apple.com/us/app/triply-travel/id6450981552) | 6450981552 | Tripitaca Inc | 3.1.3 | 2026-07-16 | **0** | Not a planner. The traveller-side client of a **travel-agency back office** -- "view travel quotations, approve itineraries, make secure payments." Ships alongside [Triply for Business](https://apps.apple.com/us/app/id6472039747) ("Manage bookings, CRM, Payments"). ~2.8 years live, zero ratings. |
| [triply.us](https://triply.us/) | -- | -- | -- | -- | -- | **Already renamed.** See below. |

### The `triply.us` "Ventro" anomaly, resolved

The brief flagged that `triply.us` rendered a title from a different brand. **It is
neither a template artifact nor a different product -- it is a completed rebrand,
and the correct spelling is Venturo, not Ventro.**

Evidence from the live page ([triply.us](https://triply.us/)):
- `<title>` is `Venturo - Plan Together, Travel Safer`; `author` meta is `Venturo`.
- Its 394 KB JS bundle still carries **leftover localStorage keys**
  `triply-onboarding-dismissed` and `triply-pending-invite-redirect` -- the product
  was Triply, and got renamed to Venturo while keeping the old domain.
- The bundle contains **zero App Store and zero Google Play links**. It registers a
  service worker (`registerSW.js`, `manifest.webmanifest`) whose update string reads
  *"A newer version of Venturo has been deployed."* **It is a web PWA with no mobile
  app at all.**
- Its `Safety` chunk defines real functions -- `createScheduledCheckIn`,
  `getScheduledCheckIns`, `updateScheduledCheckIn`, `deleteScheduledCheckIn` -- so
  scheduled safety check-ins are implemented in code, not merely claimed.

So the single most plausible Triply, the one whose positioning came closest to group
coordination, **has abandoned the name and shipped no app.**

### What that means for us

Do not manufacture a rival. But do not file the whole neighbourhood as empty either:
the *search* for "Triply" was a bad probe, and it surfaced two products that are
genuinely worth reading.

| Product | Why it matters |
|---|---|
| **[TripLinq: Group Trip Planner](https://apps.apple.com/us/app/triplinq/id6751021075)** | The real one. 20+ builds since 2025-09-21, current 3.2.1 (2026-07-30), **iOS + Android**, free-forever, **zero ratings**. Subtitle: *"Plan, Split Expenses, Travel"*. Its dated release notes corroborate nearly every description claim -- rare, and it makes the evidence usable. |
| **[Triplly](https://apps.apple.com/us/app/triplly/id6759879426)** | 20+ builds in ~3 months, current 1.9.122 (2026-08-04), 4 languages, and **the only app in the set that monetizes**: one IAP, `Pro Traveler -- $9.99`. 1 rating. |

Two more, filed and dismissed:
[tripi](https://apps.apple.com/us/app/tripi/id6752923251) shipped one build on
2026-04-28 and its own site `usetripi.com` **is still a waitlist page** -- and the app
does not appear in the top 8 App Store results for its own name.
[triply.now](https://www.triply.now/) is a web AI planner at **EUR 8.99/mo** that
differentiates on traveller identity ("Solo female / Family with children / Business
traveller / Portuguese passport" produce different Bangkok plans) -- interesting as a
positioning idea, irrelevant as a competitor.

**The signal in the ratings.** Eleven apps, near-zero adoption between them, one
monetizing at $9.99. This is not a contested market -- it is a market where nobody has
found a wedge. That is a warning about the *category*, not a green light.

---

## 2. What Triply's neighbourhood does that we do NOT

Sourced from TripLinq and Triplly, since the Triplys proper have nothing to take.
Ruthless on the last column.

| # | Their feature | Evidence | What it would cost us | Worth having? |
|---|---|---|---|---|
| 1 | **Multi-currency expense splitting with a per-payee ledger and settlement** -- "Track who paid for what in any currency, with PaidBy on every item... Clean, fair settlements before you board" | [TripLinq listing](https://apps.apple.com/us/app/triplinq/id6751021075); release note 2.1.0 (2026-05-30) *"New Expense Ledger Screen by Payee... No more confusion who paid for what"* | **L.** We have no split engine. `costSharing.js` deliberately refuses to total: *"we NEVER total the pool -- that would require knowing how many people sit in each tier"* (`src/lib/costSharing.js:19`). Building settlement means a per-person ledger, a payer field on every spend row, and a debt-simplification pass. | **NO -- not as splitting.** Splitwise owns this and is free. But see #2: the *destination* slice of it is a real hole. |
| 2 | **Trip budget vs. actual expense rollup** | TripLinq release note 3.2.0 (2026-07-22) *"Set Trip Budget / See Budget vs Expense overview"* | **S-M.** We already own budget-vs-spend on the host side (`src/lib/budgetRecovery.js`, `src/lib/vendorMoney.js`, `moneyDates.js:81 settleUpDraft`). The gap is that **guest-borne destination costs -- flights, rooms, rides -- sit outside the host's budget entirely**. `buildTravelPlan` tracks lodging *status* per guest but no amount (`src/lib/travelPlan.js:266-289`). | **YES, narrowly.** Not "split the bill" -- "what is this trip costing each guest, and does the host know." |
| 3 | **Booking-voucher import (PDF/email/image extraction)** -- "Drop your flight, hotel, train, or activity vouchers into TripLinq and it extracts every detail -- dates, times, confirmation numbers, addresses -- automatically" | [TripLinq listing](https://apps.apple.com/us/app/triplinq/id6751021075); release note 2.4.2 (2026-07-01) *"Import multiple booking vouchers at once - Add expenses using images/screenshots of bills"*; 2.0.0 (2026-05-27) *"Import itineraries from PDF or text"* | **M.** We have the intake half already -- `lodgingIntel.js` runs a full paste-to-extract pipeline (`extractListingMeta:695`, `extractListingCandidates:836`, `rankCandidates:1113`) and the P0 vendor-reply parser does the same for vendor emails. Extending paste-to-extract to flight/hotel confirmations reuses that spine. | **YES.** This is the highest-value copy on the board, because we already own the mechanism and it is our own doctrine (*paste, do not retype*). |
| 4 | **Real-time collaborative editing with per-user view/edit permissions** -- "Everyone collaborates in real-time... like Google Docs, built for travel" | [TripLinq listing](https://apps.apple.com/us/app/triplinq/id6751021075) | **XL.** We are single-operator. Supabase is wired for auth and comms only (`src/lib/commApi.js:10-51`, `src/lib/apiAuth.js:16`); there is no realtime channel, no CRDT, no presence. | **NO.** Co-editing contradicts the product. A command board has one commander. Our answer to "everyone can see it" is the invite projection, not shared cursors. |
| 5 | **Trip chat attached to the plan** | [Triplly listing](https://apps.apple.com/us/app/triplly/id6759879426) *"Trip chat -- Discuss ideas, make decisions, and keep important travel conversations connected to your trip"*; TripLinq ships polls/voting *"Vote on plans and watch your itinerary build itself"* | **L.** No chat surface, no poll primitive anywhere in `src/lib` or `hostv2/src`. | **NO.** Group chat already exists and is called iMessage. Our whole premise (`COMPETITIVE_AUTOMATION.md`) is that the plan is *derived*, not debated into being. A poll is authored automation -- the kind we already ruled non-defensible. |
| 6 | **Offline access to the full plan** -- "Access your full trip -- itinerary, bookings, maps, checklists -- without WiFi" | [TripLinq listing](https://apps.apple.com/us/app/triplinq/id6751021075) | **S-M.** hostv2 already ships a real PWA manifest scoped to itself (`hostv2/index.html:18`, `/hostv2-manifest.json`) and persists to localStorage, so the shell is most of the way there. What is missing is a service worker and an offline read path for the invite. | **YES.** Day-of, in a rented house, on bad signal, is precisely our moment. This is cheap relative to its value. |
| 7 | **Shared trip map with routes between stops** -- "Add walking, driving, or transit routes between activities, distance, time, and the actual path show right on your map" | [Triplly](https://apps.apple.com/us/app/triplly/id6759879426) release note 1.9.86 (2026-05-11) | **L.** We have place intelligence and airports (`src/lib/placeIntelligence.js`, `src/lib/airports.js`) but no map canvas and no routing. | **NO.** Google Maps does this. Our doctrine is to open the right door with the trip already loaded (`googleTravelTs.js`), not to rebuild the map. |
| 8 | **Per-day clock-level scheduling** -- "Open a day and Triplly reads your stops: what to book ahead, what is worth knowing before you arrive, what is a short walk away" | [Triplly](https://apps.apple.com/us/app/triplly/id6759879426) What's New for 1.9.122 (2026-08-04) | **M.** See the correction in section 3 -- our per-day gap is narrower than the brief assumed, but it is real. | **YES.** Ranked #1 below. |
| 9 | **Group safety: scheduled check-ins, emergency contacts, safety advisories** | [triply.us / Venturo](https://triply.us/) meta description; `createScheduledCheckIn` et al. in its JS bundle | **M-L.** Nothing analogous exists. | **NO -- but note the vacancy.** The one product that tried it renamed itself off the name and never shipped a phone app. If the idea had pull, somebody would be winning with it. |

**Two claims in this table are marketing-only.** TripLinq's headline "Settlement Groups"
(family-based splits) and "Private activities inside shared trips" have **no matching
release note** anywhere in its 20+ version history, while nearly every other claim does.
Treat those two as unshipped until proven.

---

## 3. What we do that they do not

The gap here is not incremental. It is categorical.

### 3.1 A grounded, authored corpus with risks and contingencies

**39 event playbooks. All 39 carry both `risks` and `contingencies`.**

```
ls src/lib/playbooks/data/*.js | wc -l      -> 39
grep -ln "risks:"       .../data/*.js | wc  -> 39
grep -ln "contingenc"   .../data/*.js | wc  -> 39
```

These are not tags. A single risk row (`src/lib/playbooks/data/crabFeast.js:239`):

> `trigger: 'Run out of crabs (or waste a bushel)'`, `severity: 'med'`,
> `mitigation: 'Lock headcount at 3 days out and count by ADULT PICKERS, not heads
> -- plan ~6-12 crabs/picker, fewer for kids.'`

Each risk has a matching contingency keyed to it (`crabFeast.js:247-253`,
`{ id: 'c_count', when: 'r_count', plan: ... }`), and the playbook carries its own
provenance and sources (`crabFeast.js:285-293`), including a named, dated price
reference. **No app in the Triply neighbourhood contains a single sentence about what
can go wrong.** Not one of the six descriptions read contains the word "risk."

### 3.2 A five-phase authored timeline per event type

`crabFeast.js:255-283` ships `purchasing`, `preparation`, `setup`, `program`,
`cleanup`, each with T-offset rows (`T-5d`, `T0 -1:30`, `T0 +4:05`). TripLinq and
Triplly both model an itinerary as *places you will be*. We model an event as *work
that has to happen before anyone arrives*. Those are different objects.

### 3.3 Vendor operations

`src/lib/vendorIntelligence.js`, `src/lib/vendorMoney.js`, `src/lib/vendorBrief.js`,
`src/lib/vendorQuestions.js`, `src/lib/procurement.js`, `src/lib/sourcing.js`,
`src/lib/workstreams.js`. A worked example of the depth
(`src/lib/workstreams.js:103`):

> "It used to fire on BOOKED, so a Deposit-Paid vendor -- who still owes a confirm --"

That is a distinction between two kinds of not-done, exactly the axis the Blink audit
identified as the state of the art. Payment rails are classified digital-vs-offline
with deep links built per method (`src/lib/payLinks.js:24-27`, `buildPayLink:32`).
**Zero vendor concept exists in any Triply-neighbourhood app.** A caterer is not a
"stop on the map."

### 3.4 A destination and lodging engine that is not a link list

`src/lib/lodgingIntel.js` is 2,462 lines and includes a full paste-to-extract-to-rank
pipeline (`extractListingMeta:695`, `extractListingCandidates:836`,
`candidatesFromGroups:1004`, `rankCandidates:1113`), a five-state lodging stage machine
(`LODGING_STAGES:2118` -- `no-town / looking / weighing / picked / booked`), explicit
provenance per option (`lodgingProvenance:2002`), rank-basis disclosure
(`lodgingRankBasis:2026`), and price history (`lodgingPriceHistory:2066`).

`src/lib/travelPlan.js:225` builds a per-guest travel plan carrying a **who-has-a-room
roster** with per-guest check-in/out, roommate, accessibility, and a resolved
**elder-plus-caregiver pairing** with an adjacent-room flag
(`travelPlan.js:250-289`) -- rendered live at
`hostv2/src/LodgingCockpit.jsx:1704-1760` as tappable status rows
(*"N of M still need a room before the rate ends"*, `LodgingCockpit.jsx:1745`).
`arrivalClusters` (`travelPlan.js:449`) groups arriving guests by day so pickups can be
batched.

Nothing in the competitive set models *who among your guests has actually booked*.
They model *where the group is going*.

### 3.5 A funding model that is culturally specific and refuses to invent numbers

`src/lib/costSharing.js` makes pooled dues first-class -- explicitly in the
susu / sou-sou and family-reunion-dues tradition (`costSharing.js:5-10`), with
sliding-scale tiers ("Working adults $50, Students $20, Elders covered") -- and then
refuses to total the pool because the per-tier headcount is unknown
(`costSharing.js:19`). That restraint is the product. TripLinq's answer to the same
situation is auto-currency conversion.

### 3.6 Grounding infrastructure as a first-class layer

`src/lib/decisionConfidence.js`, `decisionEvidence.js`, `decisionMemory.js`,
`decisionND.js`, `readinessHistory.js`, `riskSeverity.js`, plus per-playbook
`knowledge.verificationStatus` and `sources` (`crabFeast.js:286-292`). No competitor in
this set discloses where a claim came from. `triply.now` markets *"No fake reviews. No
inflated numbers"* ([triply.now](https://www.triply.now/)) -- which is the honesty
*posture* without the machinery.

### 3.7 Shipped guest intake

The self-RSVP invite page is live, not spec: `hostv2/src/InviteV2.jsx:1` -- *"the
PUBLIC self-RSVP invite page (?rsvp=CODE)"* -- with idempotency keys and an offline
outbox (`InviteV2.jsx:5, 16`) and a whitelisted-field backend
(`backend/app/routers/rsvp.py`, referenced `InviteV2.jsx:198`). Note that
`docs/ecosystem/INVITE_RSVP_MODEL.md:2` still reads `Status: Spec` -- **that doc is
stale relative to the code.**

### 3.8 CORRECTION to the brief's premise on per-day programme

The brief stated we have "no per-day programme schema yet (`itinerary.js:201`)" and
that "a 5-day trip still asks for one start time." **Half right, and the wrong half
matters.**

What actually exists:
- `guestItinerary` (`src/lib/itinerary.js:173`) returns per-day rows from three tiers:
  host-set, playbook-authored, or a **proposed structural arc**.
- The span gate was already fixed. `itinerary.js:198-206`: *"This used to read
  `ev.type === 'Reunion'` and nothing else, so 38 of 39 playbooks produced no
  programme at all... The gate is now the SPAN, not the type."*
- Rows **persist**: `writeRows` at `hostv2/src/HostShellV2.jsx:10421` patches
  `event.itinerary`, and the host can edit day, slot, and title inline
  (`HostShellV2.jsx:10446-10460`).
- The arc is weekday-aware (`itinerary.js:47-53`) -- a Wed-Fri reunion is never handed
  a Sunday service.
- The engine **names its own hole in provenance rather than padding**
  (`itinerary.js:112-121`): *"THE DAYS THE ARC DOES NOT COVER ARE THE POINT... a 5-day
  trip came back as a 3-row plan and the two unplanned days simply were not
  mentioned."*

So a per-day schema exists and persists. **What does not exist is time.** Rows carry a
coarse `slot` only -- `['', 'morning', 'midday', 'afternoon', 'evening', 'night']`
(`HostShellV2.jsx:10423`) -- while the event still carries exactly one clock field,
`event.startTime` (`HostShellV2.jsx:4985`), for the whole span. And the structural arc
still emits only three anchors regardless of span (`itinerary.js:89-111`: arrive, main
event, depart), so days 2 and 4 of a 5-day trip get nothing.

**The honest gap is: no per-day clock, and no per-day content beyond three anchors.**
That is materially smaller and more tractable than "no schema," and it changes what
should be built.

---

## 4. Where we are positionally different

They plan TRIPS. We run EVENTS. The difference is not scope -- it is **who owes what
to whom.**

| | Trip planners (TripLinq, Triplly, Venturo) | Event Boss |
|---|---|---|
| Central object | a place you will be | a thing that must happen |
| Actor model | **peers** -- everyone edits, votes, splits | **one operator** with obligations to guests and vendors |
| Failure mode addressed | "we couldn't agree / the math was messy" | "the crabs didn't arrive / the caterer never confirmed / it rained" |
| Time model | days on a map | T-offsets from an anchor across five phases |
| Success | everyone settles up | the event happens |
| Money | who owes whom | what is committed, what is at risk, who is paid |

### Is that a moat or a blind spot? Both, and the split is clean.

**Moat where the event has obligations.** Vendors, deposits, contingencies, headcount
sizing, the phase timeline. Nobody in this set is within a mile of it, and the reason
is structural: a peer-editing model has no place to put *"the caterer has taken a
deposit but has not confirmed."* There is no operator to owe it to. `COMPETITIVE_AUTOMATION.md`
already named this correctly -- authored and scheduled automation are commodities,
derived automation is the candidate moat -- and this read confirms the trip-planner
arena is entirely *authored* (you build the itinerary, the app stores it).

**Blind spot where the event is also a trip.** The moment a host runs a five-day
destination reunion, guests genuinely do have peer-shaped problems: what did the house
cost each family, who is on which flight, what is happening Tuesday. We already carry
the *hard* half of that -- the room roster, the arrival clusters, the caregiver
pairings -- and stop exactly where it would start paying off. `COMPETITIVE_AUTOMATION.md`
made the same admission about guest comms versus Partiful: *"on the one automation
hosts viscerally notice, a free app currently looks more automated."* The destination
case is the second instance of that pattern.

**The correct read: it is a moat with one open flank, not a blind spot.** Do not
become a trip planner. Close the flank where the event *is* a trip -- which is
recommendations 1, 2 and 3 below, all of which extend existing engines rather than
opening a new arena.

**And the ratings are the real finding.** Eleven Triply apps, zero traction, one
monetizing at $9.99. TripLinq ships weekly across two platforms, free forever, and has
**zero ratings after ten months** ([App Store](https://apps.apple.com/us/app/triplinq/id6751021075)).
Whatever the group-trip category is, it is not a market anyone has cracked. Every
recommendation below is therefore framed as *strengthen the destination flank of an
event product* -- never as *enter the trip-planning market.*

---

## 5. Ranked recommendations

Max five. Each extends something that already exists.

| # | Recommendation | Why | Size |
|---|---|---|---|
| 1 | **Give the multi-day programme a clock and real days.** Add a per-row time to `event.itinerary` alongside the existing `slot`, and extend `structuralArc` past its three anchors so days 2 and 4 of a five-day span are not silent. | The schema, persistence and inline editor already exist (`itinerary.js:173`, `HostShellV2.jsx:10421-10460`); the engine already names this exact hole in its own provenance (`itinerary.js:112-121`). It is our loudest destination gap and the cheapest to close. | **M** |
| 2 | **Extend paste-to-extract from lodging to flight and hotel confirmations.** Reuse the `lodgingIntel` spine to fill `guests[].travel` from a pasted confirmation instead of hand-typed rows. | TripLinq's most-corroborated feature (release note 2.4.2, 2026-07-01) and we already own the mechanism (`lodgingIntel.js:695, 836, 1113`) and the roster it would fill (`travelPlan.js:250-289`). Straight reuse, our own doctrine, no new arena. | **M** |
| 3 | **Surface guest-borne trip cost -- what this trip costs each guest -- without building a splitter.** Attach an amount to the existing per-guest lodging/air rows and roll it up beside the host budget, in the style `costSharing.js` already uses: show only what the host entered, never total what we cannot know. | Closes the one genuinely useful half of expense splitting while refusing the half Splitwise owns for free. Extends `travelPlan.js:225` and sits beside `costSharingSummary` (`costSharing.js:77`). | **M** |
| 4 | **Ship a service worker so hostv2 works offline.** The manifest and localStorage persistence are already in place (`hostv2/index.html:18`); add offline read for the plan and the invite. | Day-of, in a rented house, on bad signal is our defining moment, and offline is the only feature TripLinq ships that is unambiguously right for us. Small relative to value. | **S-M** |
| 5 | **Correct `INVITE_RSVP_MODEL.md`, which says `Status: Spec` for something already shipped.** | `hostv2/src/InviteV2.jsx:1` is the live public self-RSVP page with idempotency and an outbox; the doc at `docs/ecosystem/INVITE_RSVP_MODEL.md:2` will cause somebody to rebuild it. Documentation-only, so pair it with any of the above rather than doing it alone. | **S** |

### Explicitly NOT recommended

- **Real-time co-editing.** Contradicts the operator model. XL cost, negative product value.
- **Trip chat and polls.** iMessage exists; and a poll is authored automation, which
  `COMPETITIVE_AUTOMATION.md:3` already ruled non-defensible.
- **A map canvas with routing.** Google Maps does it. Keep opening the right door with
  the trip loaded (`src/lib/googleTravelTs.js`).
- **Group safety check-ins.** The only product that tried it renamed off the name and
  never shipped an app.
- **Expense splitting as a settlement ledger.** Free incumbents own it. Take
  recommendation 3 instead.

---

## Appendix -- unverified and unresolved

| Item | Status |
|---|---|
| Whether TripLinq's "Settlement Groups" and "Private activities" are shipped | **UNVERIFIED.** No matching release note in 20+ versions, while nearly every other claim has one. |
| Whether any competitor's claimed feature actually works | **UNVERIFIED.** Nothing was driven live. All competitor claims are store copy or release notes. |
| `Triply - AI Trip Planner` id6763152290 rating count | **UNRESOLVED.** Apple's lookup endpoint returned 6 ratings / 4.83; the search endpoint returned 13 / 5.0. Two cache snapshots, unreconciled. |
| Whether `r/triply` has any activity | **UNVERIFIED.** Reddit unreachable to the fetcher; the subreddit link exists in triplyapp.com's bundle. |
| Any formal discontinuation announcement for any Triply | **NONE FOUND.** The abandonment calls in section 1 are inferences from store metadata only -- version count, update dates, binary size, deployment target. No app store notice, blog post, or press item was located. |
| Screenshot captions / promotional text for all six apps | **NOT RETRIEVABLE.** Baked into screenshot images; no OCR performed. |
| Claim that triply.now was built by a solo Dutch developer with Flutter/Supabase | **UNVERIFIED -- likely confabulation.** Surfaced only in a search-result summary; the cited Product Hunt page 404s and a targeted follow-up found nothing. Do not cite. |
