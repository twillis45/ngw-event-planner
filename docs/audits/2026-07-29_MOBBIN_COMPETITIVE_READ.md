# Mobbin Competitive Read — Event Boss Gap Board

> **Ported from published artifact** — this research was authored as a Claude artifact and lives at
> https://claude.ai/code/artifact/0582ce14-5d19-4c0e-8034-911aa637bcb9. Ported into the repo 2026-08-01
> so it is searchable, diffable, and versioned. **The artifact remains the editable original; if you
> change one, change the other.**
>
> **Port note (2026-08-01):** a first port of this doc was made from a compressed memory entry and was
> wrong — it listed 8 apps / 770 flows and omitted Wanderlog, Tripsy, ChatGPT, Booking.com and the
> entire Blink section. This version is ported from the artifact HTML itself.

Date: 2026-07-29 (pass 1) · 2026-07-30 (pass 2) · Source: artifact `0582ce14`

**Thesis.** The headline finding is not a gap. It is that nothing in this library guides a host through
an event — the invite apps hold a date and collect RSVPs, and the one genuine guidance leader is a
road-trip planner. What Event Boss lacks is not intelligence. **It is the ability to run that
intelligence more than once, across a span.**

| | |
|---|---|
| Source | Mobbin (iOS + Web + Animations) |
| Access tier | Pro — unlocked mid-pass |
| Harvested | 10 flow taxonomies, **922 flows** |
| Our side | `demo/hostv2/` at HEAD |

---

## What has been built since this board — 2026-07-30

The findings below are unchanged; this section records only what the read *caused*. Four
recommendations shipped within two days on branch `grounded-decision-surface`. The keystone did not.

| Finding | What changed | Status |
|---|---|---|
| Live defect — `air`/`ground` had no door | Both sheets existed, titled, raised through `surfaceRegistry` — reachable only from a transient worry row, so on a calm event a host could not get to them. Both rows now render with counts from the real travel plan, gated on the plan having that leg, and both click through. | **Closed** |
| Duplication — every comparator ships it, we shipped none | "Run it again" built on one distinction: a plan is what you decided, state is what happened. Guests, vendors and settled picks carry; RSVPs, deposits, done-flags and the date do not. | **Closed** |
| Blink's amber "now" row — flagged here as a trap | We were in it. The day-of phase spine painted its current segment `--warn`, which under UX_02 means "needs attention", about the phase the host is simply standing in. Repointed to `--progress`. | **Closed** |
| Progress — most-animated category in the library, 2 hits our side | Partly answered, not with animation. The money bar was built as a real chart. Charts remain thin; skeletons and coach marks still near-zero. | **Partly** |
| Finding #1 — state promoted to a named surface | Unbuilt. The two worth naming both protect money: a vendor who never replied, and a stay that fell through. | **Next** |
| ⭐ **Keystone — per-day programme schema** | **Unbuilt.** `dayPhases()` still anchors to one `anchorMin`, and the phase bar bails on `phases.length < 2` — the spine is finished for a one-day event and structurally unable to span a multi-day one. | **Open — heads the queue** |
| Flow census — the first recommendation | Not started. Until it exists the 37-sheet-kinds bar cannot be compared to anyone. | **Open** |

**Correction earned along the way:** the money bar shipped with its pledged segment drawn in
`--steel-tint` — a chip *background* token — invisible at 16% alpha over the `#25262A` track.
**Alpha is not a value scale.** Separately `--danger-solid` resolved to the literal string
`"undefined"` because the token was declared and never bundled; CSS drops an invalid value silently,
so the over-budget segment painted nothing and read as a design choice rather than a bug.

---

## Read this first: what the research could and could not see

Two passes. The IA pass ran on a free account, where Mobbin locks every screen outside the four most
recently added apps — Airbnb's library holds 363 screens and two were visible. Pro was enabled partway
through, which opened the screens and the Animations library.

**Sourced and used:** full flow taxonomies (every flow named, nested, with screen counts) · rendered
screens read at zoom for type, density, colour and state handling · the animation taxonomy · rank
ordering from the curated "Most popular" list.

**Not claimed anywhere on this page:**

- **Sound and haptics — at all.** Mobbin is a visual library; animation clips carry no audio, and
  haptics are invisible by definition.
- **Motion quality.** Taxonomy-level plus sampled stills. Easing, duration and choreography were not
  systematically watched.
- **Exact type sizes.** Screens re-render at roughly a third of native width. Hierarchy is reported;
  pixel values are not.
- **Full screen census** per app — screens were sampled at the flows that matter to us.
- **Any usage or revenue data.** Mobbin has none.

**Not in this library at all:** The Knot · Zola · Joy · TripIt · Whova · Cvent · Honeybook ·
**Blink**. The wedding-checklist and conference-agenda categories — the two places "what to do and
when" is most developed commercially — are absent. That is a real ceiling; closing it needs trial
accounts or teardowns.

**On the stars:** Mobbin ratings are community *design* votes, not adoption, and samples are too small
to rank on — Eventbrite shows 5.0 from one rating, Partiful 4.33 from two. Never cite them. The
defensible signal is the curated rank order.

---

## The comparator set, and why each app is in it

Mobbin's top-popular list is dominated by fintech and social. Ranking Event Boss against Revolut
because Revolut is popular would produce nothing. This set was chosen for **structural relevance**.

| App | Why in the set | Flows | Onboarding | Rating |
|---|---|---:|---:|---|
| Wise | Depth benchmark. Money is where dishonest state costs the user cash, so its state design is the strictest in the set. | 168 | 7 | 4.82 (n=35) |
| Linear | Triage benchmark. Closest structural analogue to a Command Center: inbox, defer, rollup, saved views. | 131 | 18 | 4.81 (n=31) |
| ChatGPT | AI-surface ceiling — what a chat surface looks like when chat *is* the product. | 120 | 16 | 4.46 (n=32) |
| **Wanderlog** | **The real guidance leader.** Multi-day, multi-activity, group-cost itinerary planning. | 111 | 16 | no ratings |
| Booking.com | The lodging/transport question. The trip-spine model two incumbents converge on. | 87 | 14 | 4.5 (n=2) |
| Airbnb | Host/guest duality benchmark, most-rated app in the set. Also our lodging domain. | 82 | 16 | 4.63 (n=116) |
| Luma | Direct competitor. Splits event detail three ways by viewer role. | 71 | 15 | 4.88 (n=27) |
| Partiful | Direct competitor; sharpest frictionless event creation in the library. | 70 | 14 | 4.33 (n=2) |
| Eventbrite | Incumbent. A floor, not a target — attendee-side, thinnest library, heaviest onboarding. | 41 | 21 | 5.0 (n=1) |
| Tripsy | Second itinerary organiser, to check whether Wanderlog's depth is the category norm. It is not. | 41 | 7 | 4.5 (n=2) |

Worth a later pass, also on Mobbin: Mozi, Locals, SeatGeek, StubHub, Notion, Airtable, Craft, Toggl Track.

---

## Depth calibration — and a unit warning

Event-domain apps cluster at 41–71 flows. Operations-grade apps run 111–168. **Event Boss is trying to
be an operations system inside the event category**, which puts its depth target with Wise and Linear
rather than Luma and Partiful.

```
Wise         ████████████████████████  168
Linear       ███████████████████       131
ChatGPT      █████████████████         120
Wanderlog    ████████████████          111
Booking.com  ████████████               87
Airbnb       ███████████                82
Luma         ██████████                 71
Partiful     ██████████                 70
Eventbrite   █████                      41
Tripsy       █████                      41
Event Boss   █████                      37   ← DIFFERENT UNIT
```

The last figure is **not a score**. 37 is the count of distinct `kind:` values in `HostShellV2.jsx` —
surfaces, not journeys. One Event Boss sheet can contain what Partiful names as six flows. The honest
conclusion is not "we are behind Eventbrite"; it is that **we do not yet have a flow census and cannot
make this comparison until we do.**

---

## Five mechanisms worth taking

### 1 · State is promoted to a named surface — *we do it, one level down*

Wise ships `Transaction detail (canceled)`, `Conversion detail (pending)`, `Conversion detail
(canceled)`. Luma ships `Event detail (invited)` / `(hosting)` / `(guest)`. The awkward state is a
designed, named artifact — not a conditional branch inside a happy-path screen.

- **Our side** — we carry state as a *parameter*: `{ kind:'lodging', focus:'deadline' }`,
  `{ kind:'rain', risk:'high' }` — plus per-field honesty copy at 40+ sites ("no cost yet",
  "No helpers yet", "no reply yet", "no delta yet").
- **Verdict** — our field-level honesty is *finer-grained* than Wise's. What we lack is surface-level
  promotion: a pending or fallen-through state with its own deliberately composed sheet.
- **Do next** — two named sheet variants: a vendor who never replied, and a deposit sent but
  unconfirmed.

### 2 · Creation is a tiny spine plus twenty optional add-ons — *we are ahead*

Partiful has no event-creation form. It has ~20 individually named micro-flows: Adding a date, Adding
a location, Adding a cost per person, Adding an RSVP deadline, Adding a custom field, Enabling a
waitlist, Enabling auto reminders, Turning on guest approval, Setting an event password, Editing event
theme.

**Verdict** — Partiful still *asks*, just in smaller pieces. Proposing is strictly less friction than
asking in pieces. Hold this line; do not regress toward Partiful's model because it looks tidier in a
flow list.

### 3 · The triage surface can defer — *we are ahead of the event cohort*

Linear ships *Snoozing a notification* alongside Inbox, My issues and Pulse. Ours: `SnoozeUntil`,
`snoozePick`, `snoozeProposed`, `deferredN` — 66 references.

**Verdict** — **none** of Luma, Partiful, Eventbrite, Wanderlog or Tripsy names a defer primitive
anywhere in its taxonomy. Five event and itinerary apps, zero defer. We are at Linear's level and the
direct competitors are not in the conversation. Worth saying out loud in positioning.

### 4 · AI is one narrow named act, never ambient — *aligned*

Luma's entire generative surface is one flow: *Generating an event description*. Linear's is bounded
and inspectable. Neither sprinkles "AI insights" across the product. The market's best-regarded apps
have converged on exactly the discipline skill 06 already mandates.

### 5 · Depth does not have to cost onboarding — *calibration*

Wise: 168 flows, 7-screen onboarding. Eventbrite: 41 flows, 21-screen onboarding — the thinnest
product with the heaviest front door. **Depth and friction are independent variables.** The
frictionless value does not cap how much Event Boss can do; it caps what it may demand *before* the
host sees value.

---

## Interface craft — six moves read off Luma's screens

| Move | Mechanism | Read |
|---|---|---|
| **Empty state occupies the same slot as a populated row** | "No Upcoming Events" renders as a *card in the list* — same icon tile, padding, position as a real row. Not a centred illustration. | Adopt. A centred splash reads "this feature is off"; an empty row reads "this list works and has nothing in it." |
| **State rides the artwork, not the text column** | "Going"/"Invited" chips overlay the bottom-left of the 44px thumbnail. Text column holds title + two meta lines. | Adopt. Buys a status signal without spending a chip slot — exactly the pressure our 3-chips-per-row rule manages. |
| **Section header states where data came from** | "Nearby Events" carries a muted second line: "From Your Subscriptions". | We do this well. Our provenance doctrine as typography rather than per-row annotation — and cheaper. |
| **Second timezone rendered as a warning** | "Today, 3:00 PM · 6:00 PM GMT-4" — second time in amber. | Converges with our work. Luma uses amber for suggested price, green for confirmed — amber consistently means "not settled yet", precisely our warn semantics. |
| **Date group headers split weight, not size** | "12 July / Saturday" — date in full ink, weekday muted, same size. | Adopt. Two tiers at one type size; keeps the grouping header from competing with row titles. |
| **Illustration carries personality; chrome stays quiet** | Circular constellation of hand-made avatars over a radial bloom; controls beneath are plain black pills. | Adopt the principle. Character is entirely in artwork and light. Not one control is decorated. |

---

## Motion, illumination and attention systems

Mobbin catalogs animation by category, which turns "what should we animate?" into an answerable
question. Our 59 keyframes, counted from `hostv2/src/styles.css` (categories overlap, so they do not
sum to 59):

| Group | Count | What |
|---|---:|---|
| Ceremonial | 36 | splash `sp-*` + reveal `rv-*` |
| Operational | 19 | rows, sheets, toasts |
| Illumination | 15 | glow, halo, ring, sheen |

| Animated category | Cited in | Our coverage | Read |
|---|---|---|---|
| Splash Screen | Hulu, Tubi | full `sp-*` choreography | **We lead** |
| Acknowledgement & Success | Instacart, Apple Watch | `donehalo`, `okring`, `glowonce` | **We lead** |
| Welcome & Get Started | Phantom, Cosmos | `welcomein`, `revealin`, full `rv-*` | **We lead** |
| Dashboard | Life Reset | `cardin`, `cardexhale`, `panelrise`, `rowin`, `strataFocus` | Covered |
| Chat Bot | Wabi, Cleo AI | `askin`, `askrise` | Covered |
| **Progress** | Grab, Quizlet, Instacart — **most-cited in the library** | 2 hits, both CSS-only. No progress keyframe exists. | **Gap** |
| Coach Marks | Grab | 6 hits total | **Gap** |
| Charts | Quizlet, Tide Guide | 1 hit | Thin |
| Loading / skeleton | standard across the set | 2 hits — our own UX_01 names shimmer-on-skeleton as the standard and it is largely unbuilt | Thin |

**The motion finding, stated plainly:** Event Boss animates *arrival* beautifully and *work* barely at
all. 61% of the budget sits in two moments. This is not an argument for more animation — it is an
argument about distribution. The illumination vocabulary (`spotlamp`, `spotring`, `glow-follow`,
`glow-settle`, `rvsheen`, the `--sheen` token) already exists and simply has not been pointed at
progress or settling rows. 31 `prefers-reduced-motion` sites = strong.

**Attention systems.** Across the set, attention is *earned per item and dismissible* — Linear snoozes,
Partiful mutes, Wise hides. We are strong (66 snooze/defer sites). The gap is the **indicator layer**,
not the logic: no progress indicator and near-zero coach marks means the system knows what deserves
attention and has few instruments to say so besides colour and copy.

**What creates the non-SaaS feel.** Reading across Luma, Partiful, Cosmos and Wabi: never the
controls. Three things — real artwork doing the emotional work, light as a material rather than
gradient decoration, and plain undecorated controls underneath both. Partiful's whole differentiation
is that the flyer is expressive and the form is boring. **The non-SaaS question is a discipline
problem for us, not an invention problem.**

---

## Lodging and transportation

**None of the three event apps handles lodging or transportation at all.** Across 182 combined flows:
Luma offers Cities and Map, Partiful offers "Adding a location", Eventbrite offers "Copying location".
No stay, no ride, no arrival, no traveller.

| App | Travel surface | Model |
|---|---|---|
| Airbnb | Trips → Trip detail → Reservation detail; insurance; cancelling; past trips | One trip object; reservations hang off it |
| Booking.com | Bookings → Trip detail → Booking detail (stay)/(car)/(attraction)/(canceled); taxis; alerts; Adding a traveler | Same trip spine, four modality-named detail surfaces plus a canceled variant |
| Event Boss | Three parallel sheets — Where everyone stays, Getting here, Getting around | Unified engine, split surface |

**Our engine is deeper than the category and correctly scoped.** 1,952 lines across `lodgingIntel.js`,
`travelPlan.js`, `airports.js`, `lodgingBookmarklet.js`: status ladders for stays and rides
(`LODGING_STATUSES`, `RIDE_STATUSES`, `nextRideStatus`), `transportDecision`, `arrivalClusters`,
`CARE_UNIT_STATUSES`, listing unfurl with explicit `failureReason`, must-have derivation carrying
`mustHaveBasis`, ranked candidates, committed pick with `backupFromRunnerUp`.

**The scoping call:** we do not search inventory — `lodgingSearchLinks` hands off to the platforms.
Right call, worth defending. Competing with Booking.com's 332 screens of search is unwinnable and it is
not the host's problem. The host's problem is **the return trip** — they already found a house and now
need it to become a decision, a cost, and a backup. Nothing in the event category does that.

**Pattern worth taking: one trip object, modality-named details.** `buildTravelPlan(event)` already
returns one object holding `.lodging`, `.ground`, `.air`, `.rosterMode` — the engine is already a trip;
only the surface is split three ways. **Do not build a fourth travel hub sheet** — guardrails forbid
another dashboard. The unification belongs in Command Center's travel zone, with the three specialist
sheets kept as the L4 destinations they are.

Out of scope by decision: Booking.com's price alerts watch inventory it holds. We hold none. Our
deadline work (44 sites) is the honest equivalent — watching a date we know rather than claiming to
watch a market we cannot see.

---

## What to do and when — prepare, day-of, after

**Comparator correction:** the invite apps do not guide at all. Not one of Luma, Partiful and
Eventbrite's 182 combined flows sequences work, states a deadline, or tells a host what to do next.
They are not the competition on this axis — they are not in it. The real leader is **Wanderlog**
(111 flows), with **Tripsy** (41) behind.

| Phase | Wanderlog | Invite apps | Event Boss |
|---|---|---|---|
| Prepare | Questionnaire intake · checklists · Auto-filling a day · Expert tips · Connect to a mailbox · AI assistant · reservations & attachments | Nothing. RSVP collection only. | 15 raise engines in `surfaceRegistry.js` · `phaseProgress.js` (344 ln) routed cues · `taskEngine.js` · `dayBefore.js` T-2 plan |
| Day-of | Itinerary · Optimizing routes · transportation mode · location detail | Luma: check-in, Live Activities, Dynamic Island. Otherwise nothing. | 4-phase run of show · `dayAlerts.js` · `dayOfCopy.js` · 47 cue refs · honest-time wire |
| After | Creating a guide — the trip becomes a publishable artifact · travel stats · past trips | Partiful: photo album. Eventbrite: refunds. | `draftThankYou` · `draftRecap` · `draftToast` · `PhotoStrip` · 68 "after" refs · 26 recap/wrap |

### ⭐ The differentiator nobody in the set has: we write the thing

`doItForMe.js` — 1,145 lines, **26 draft generators**: draftInvite · draftGuestBrief ·
draftVendorOutreach · draftRsvpChase · draftHelperBrief · draftHelperConfirm · draftDietaryNote ·
draftDayBeforeDetails · draftVendorReconfirm · draftVendorPaymentReminder · draftVendorBriefAsk ·
draftGuestUpdate · draftParkingInstructions · draftLodgingNote · draftRidesNote ·
draftGettingHereNote · draftShoppingList · draftToast · draftThankYou · draftRecap.

Partiful gives a host an empty text-blast box. Wanderlog gives a checklist row. **Nothing in the set —
including the 168-flow and 131-flow apps — drafts the user's outbound communication from the plan's own
state.** Largest capability gap in our favour anywhere in this research.

It also sharpens the comms gap: **we can already write every message a host needs and cannot send any
of them.** The draft engine is built; the outlet is not.

### Two intake tricks worth stealing

1. **Connect to a mailbox.** Wanderlog ingests reservations straight from email. We already unfurl a
   pasted listing and parse vendor replies — a mailbox connection is the same trick with the paste
   removed. Highest-leverage friction removal in this document.
2. **Auto-filling a day.** The system proposes a day's plan, host edits. Propose-don't-ask applied to a
   span rather than a field.

### Day-of: strong, and hard-capped at one day

`dayPhases(rows, anchorMin, doneMap)` buckets run-of-show rows into four phases against a **single**
`anchorMin` and marks the first unfinished phase "now". Clean, honest, and structurally one day.

- **Exists** — `spanNights`, `spanEnd`, `dayIndexOf`, `isDuringEvent`, `daysUntilEnd`; "Day N of M"
  renders.
- **Doesn't** — no per-day activity schema. `multi-day` returns 2 hits, both code comments naming the
  gap. `reunion` returns 5 — one seating comment, one food regex. No add-a-day, no reorder, no per-day
  phase set.
- **Wanderlog's model** — Adding a day after · Deleting a day · Auto-filling a day · Reordering plans ·
  Adding a section · Adding a subheading · Changing a section colour · Collapsing all sections · Table
  of contents · Optimizing routes · Changing transportation mode.

---

## Multi-day, multi-activity, destination, reunion

Four capabilities, not one, and we are in a different place on each.

| Dimension | Our state | Best in library | Read |
|---|---|---|---|
| Destination | 57 refs. Intake flag, travel engine, lodging unfurl, arrival clusters, airports, money-safe date chain. | Booking.com search; Wanderlog itinerary | **Strong** |
| Multi-day span | Primitives built — `spanNights`, `dayIndexOf`, `isDuringEvent`, "Day N of M" renders. | Wanderlog: full day CRUD | Half-built |
| Multi-activity programme | No per-day schema. Run of show single-anchor; 2 comments acknowledge the gap. | Wanderlog: sections, subheadings, reorder, auto-fill, TOC | **Gap** |
| Reunion | Recognised as a type, not modelled. 5 hits. No cohort, household, or travelling-party model. | Wanderlog: tripmates, group balances, expense simplification | **Gap** |

The research adds three things to the existing plan of record: **Wanderlog's day-CRUD vocabulary as the
editing model**, **Blink's unified agenda as the reading model**, and the argument that auto-filling a
day is where propose-don't-ask earns most — because a blank three-day grid is the most intimidating
empty state we could show.

**Reunion, concretely.** Wanderlog's group model: tripmates with privacy settings, **group balances**,
and **expense simplification** — netting the debt graph so eleven people owe two payments instead of
thirty. Our money engine tracks owed at 103 sites but has two cost-sharing modes and no netting. A
reunion breaks a two-mode model: households pay differently from individuals, some travel and some
don't, and somebody fronted the house deposit six months ago.

---

## Event creation

| App | Model | Shape |
|---|---|---|
| Partiful | Tiny spine + ~20 named optional add-ons, each its own flow | Progressive. Asks little, reveals more later. |
| Wanderlog | Questionnaire (7 screens) → trip plan → destination → dates → invite tripmates → Auto-filling a day | Interview, then system proposes. |
| Tripsy | Creating a trip — 9 screens | Linear wizard. |
| Luma | Creating an event · Generating a description · Choose a calendar | Short form + one generative assist. |
| Linear | Creating issue/project/initiative/team/view + templates | Templates as first-class objects. |
| **Event Boss** | 4-field intake + venue, per-field correction editors, then the reveal | **Proposes, then invites correction.** |

**We are ahead.** Partiful's twenty micro-flows are still twenty questions, well packaged. Tripsy is a
nine-screen wizard. We ask four things and propose the rest with provenance and accept-or-change. On
raw intake cost we are the cheapest creation model in the set.

**Three improvements:** duplicate/template an event (Partiful and Linear ship it; we have zero real
hits — the repeat host starts from nothing every time) · auto-fill a day (blocked on the schema) ·
**a named intake for date certainty** — Airbnb captures it with Dates / Months / Flexible and ± 1–2 day
chips. A host choosing between two weekends is in a different state from one with a locked date, and
that difference should be data, not a guess.

---

## Type, styling and layout

Exact pixel sizes are **not extractable** from Mobbin — screens re-render at roughly a third of native
width, so measuring a font size off them would be invention. What is readable is *hierarchy structure*.

- **The scale is compressed, not dramatic.** Linear's welcome headline runs ~2× body, not 4×. Luma's
  section heads sit barely above row titles. Ours tops out at 22–26px against 15.5–16px body — about
  1.5×, tighter than Linear, and the right direction for an operations board.
- **Weight and colour do the work at one size.** Three reference apps get two information tiers out of
  one type size by varying weight and ink alone. Cheaper than a scale step. Our rule already says
  weight signals scannability — the observation is that they lean on it harder than we do.
- **Void is the layout, and the input is the hero.** Linear's AI home gives the hero a third of the
  width with 40%+ empty. The largest object on the page is the text field. Note *what* they make loud:
  the ask.
- **Colour restraint is near-total.** Linear's AI home is greyscale plus one green presence dot. Luma
  uses exactly three signal colours. Booking.com is one brand blue and otherwise grey. Our 3-colour
  budget is precisely where they land. **The risk for us has never been too few colours.**

**Layout devices worth taking:** segmented panels over floating cards (Linear's three example cards
share one container divided by hairline rules — three objects become one) · three-tier sidebar at small
sizes · status overlaid on artwork · section head plus provenance sub-line · terms directly beneath the
CTA, never beside it.

Could not be sourced: line-heights, letter-spacing, grid columns, typeface identification.

---

## Travel intake

Booking.com nests intake as Search → five modality verticals. Worth reading even though we will never
build the search.

| Vertical | Named intake flows | Transferable? |
|---|---|---|
| Stays | Selecting a destination · dates · Changing rooms & guests · Searching for a property · Searching rooms (AI) · Chatting with AI | Party composition yes; property search no |
| Flights | Searching · Filtering · Turning on alerts · Book | Alerts need inventory we don't hold |
| Car rental | Searching cars | Thin even for them |
| Taxis | Searching taxis · Book a taxi | Point-to-point only — no group model |
| Attractions | Searching · detail · photos | Closest thing to a multi-day programme |

**Ground transport: nobody models the group.** Booking.com's taxi flow is one rider, one trip. Uber is
the same. No app in the set models "eleven people arriving across two days from three airports and
needing to reach one house." We already do — `arrivalClusters`, `rideStatusOf`, `nextRideStatus`,
`rideFieldsFor`, `transportDecision`, `airports.js`, 430 combined refs. **The single largest capability
in Event Boss with no analogue anywhere in the set** — and it was reachable only from a raised worry
until the door defect was fixed.

---

## Money

Wise is the reference, and its vocabulary is richer than any event app's. What separates it: money
always carries a **requester, payer, purpose, state**, and for teams an **approval**.

| Capability | Best in set | Event Boss | Read |
|---|---|---|---|
| Spend ladder | Wise: balances, transactions, spending | planned (53) → committed (36) → spent (18), plus promises (38) | **We lead** |
| Who owes what | Wise: bill splits | 103 owe/owed refs, `guestSplit.js`, `costSharing.js` | Covered |
| Collecting money | Wise: payment requests, links, Wisetag | `buildPayLink`, `PAY_METHODS`, `OFFLINE_PAY_METHODS`, `getOfflinePayInstruction` | Covered, incl. cash |
| Purpose vocabulary | Partiful: cost per person. Wise: jars, group spending, dues | Two modes only — `self-pay`, `pooled-dues` | **Thin** |
| Approval before spend | Wise: team members and payment approval | None. Zero co-host hits, so there is nobody to approve. | **Gap** |
| Money in a failed state | Wise/Booking.com `(canceled)`; Eventbrite refunds | `refund` — 6 hits. No named canceled-money surface. | **Gap** |
| Paper trail | Wise statements; Booking.com invoices | 47 invoice/receipt refs, 56 export/print sites | Covered |

**The purpose gap, concretely.** Real events distribute cost in more than two ways: host absorbs
everything; split evenly; split by household rather than by head; per-person cover charge up front
(Partiful ships this); ongoing pool; gift or registry; and in-kind — "you bring the ice." Our promises
engine handles the last well and self-pay/pooled-dues covers two more. **The middle band — even split,
household split, cover charge — is where hosts actually argue,** and it is the thinnest part of our
model.

Keep the defensive design: `normalizeCostSharingMode` resolves anything unrecognised to `self-pay`,
documented in-code as "the safe, no-claims default — never to the pooled mode." Adding modes must not
weaken it.

---

## Chatting with AI

Five apps ship an AI surface, splitting cleanly into two groups.

**AI-native (ChatGPT 120, Linear 131):** the mode is a named surface, not a hidden setting — ChatGPT
ships eight variants of one verb (`Asking ChatGPT` plus photo / file / thinking / deep research /
quizzes / voice chat / apps / Codex / documents) · reasoning is inspectable (Thought, Summary, Sources
as three separate flows) · the answer is correctable (branching, regenerating, feedback) · capability
is configurable (Linear: Changing AI skills, Creating a skill, Enabling an agent) · an ephemeral mode
exists (Temporary Chat).

**Domain apps (Luma, Booking.com):** Luma spends its entire AI budget on one flow. Booking.com threads
it into search rather than bolting on a chatbot. **Memory is visible and switchable** — AI memories and
Turning on AI memories as two flows. Neither has ambient "AI insights."

**Where Ask the Boss stands — strong, with two additions.** One named surface with its own motion and
locked parity atoms in `parity/askKit.jsx`. 70 sources/grounded refs and one grounding ladder in
`groundingDoctrine.js` — **materially stronger than ChatGPT's separate Sources screen, because
provenance rides the claim instead of living one tap away.** 8 regenerate-class and 16 feedback-class
refs mean the answer is already correctable.

- **Worth adding — memory.** 21 memory refs exist, but Booking.com's move is stronger: a surface where
  the host reads what the system believes about them and can switch it off. For a product whose pitch
  is honesty about what it knows, a visible editable memory is close to an obligation.
- **Worth adding — a temporary ask.** `temporary|ephemeral` returns 0.

---

## Blink ExperienceOS — the enterprise mirror

> **Source warning.** Blink is not on Mobbin. This section came from their marketing site and published
> product screenshots — no trial, no hands-on, no flow taxonomy, **and therefore no flow-count
> comparison.** Marketing screenshots are idealised. One phase (post-event) came from a homepage
> summary and is marked as reported.
>
> **Extended 2026-08-01** by a knowledge-base read — see
> [`2026-08-01_BLINK_AND_CONFIRMATION_PATTERNS.md`](2026-08-01_BLINK_AND_CONFIRMATION_PATTERNS.md).

Three products carry the name. This is **blink.global**, "the ExperienceOS for events" — the only one
that is an event platform. The others are joinblink.com (frontline-employee comms) and blink.new (an AI
app builder).

**What it is.** Orchestration for 50 to 50,000 attendees — governments, sports bodies, corporates,
luxury and VIP hosts. Sales-led, no public pricing. Admin sidebar: Event Dashboard · Event Config ·
Badges · Content · Planning · Registration (Attendees, Invitees, Point of Contact, Staff, Chat Groups,
Applications) · Transportation · Accommodation · Reports · Settings. **It uses our exact phrase:**
*"Before guests arrive, Blink becomes your command center."* Same claim, opposite end of the market.

### The unified agenda — this is the multi-day model we are missing

Their attendee app's "Today's Agenda" is one chronological stack with modalities mixed: Flight CDG→JFK
10:30AM–01:00PM (current, tinted) → Ride to Hotel 02:00PM–02:15PM → Match USA vs Ecuador 05:00PM–07:00PM
→ Conference `[Attending]`.

That single view resolves two things this document treated separately: **the per-day programme schema
and Booking.com's trip spine.** Travel and activity are not different surfaces — they are typed rows on
one timeline, each carrying a time range and a status chip. We hold three parallel travel sheets plus a
run of show anchored to a single start time. **Blink's merged version is simpler than what we have, not
more complex.**

### Status is two dimensions, not one

Their attendee table carries **Application Status** and **Invitation Status** as separate columns, with
chips for `Approved` · `Updated` · `Pending Review` · `Denied` · `Not Sent` · `Pending` · `Send Failed`.

Directly relevant to our comms gap: **when sending ships, `Send Failed` has to be a designed state
distinct from `Not Sent` and `Pending` — a boolean will not do.** This is the Wise state-naming
discipline applied to communication.

### Their UI decisions, and what each costs us to copy

| Their decision | Why it works | Verdict |
|---|---|---|
| The current item is tinted, not badged | The Flight row changes ground colour. No "NOW" label, no marker. Cheapest possible you-are-here. | **Take — but not their colour** |
| A faint modality watermark per row | Aircraft silhouette ghosted into the Flight row. Type identification without spending an icon slot. | Take |
| Times are a right-aligned tabular pair | "10:30AM 01:00PM" — no dash. Position carries the relationship; the column scans vertically. | Take |
| Exactly two text tiers per row | Bold title, muted subtitle, one line each. | Already our rule |
| Chips are earned, not decorative | Flight, Ride and Match carry no chip. Only Conference has one, because only it has a status worth stating. | Already our rule |
| Two independent status columns | One object, two lifecycles, never collapsed into a single field. | **Take for comms** |
| Content carousel above the agenda | Explore sits above Today's Agenda. Engagement before operations. | **Reject** |

### ⚠ The one that would break us if copied directly

**Blink tints the current row amber.** In our semantic map amber is `--warn` — "needs attention, not
settled, approaching deadline." Tinting the current segment amber would say *this is a problem* at the
exact moment the host most needs calm.

The mechanism is right and the colour is wrong. Adopt tint-the-now with `--steel-tint` — already the
selection and identity token, already meaning "this is the one you're on" — and amber stays free.
**This is exactly the kind of borrowing that looks harmless in a screenshot and quietly costs a colour
its meaning.**

### Why rejecting the carousel matters

Explore-above-agenda is coherent for an attendee at a 50,000-person event who has spare attention. A
host running their own event has neither. Our doctrine — one loud thing per screen, operations first —
is **not a smaller version of Blink's layout; it is the correct layout for a different reader.** Worth
being confident about, because their page is handsome and the pull to copy it is real.

### What their rows do not carry

No reason, no risk, no next action. The agenda states *what* and *when*, never *why* or *what happens
if it slips*. Our cue engine emits routed sentences like "Add the event date to time the plan" — a
reason attached to a destination. **Blink is a beautiful presentation of state; we are a guide.** When
borrowing their row anatomy, keep the third thing they left out.

### Where we are not behind — and it is structural

- **Different posture.** It configures — "manage configuration, guest logic, venues, and permissions
  through a centralized control dashboard." That is an admin console. Nothing observed tells the
  organiser what to do next: no readiness engine, no raised risk, no proposed action.
- **It sends, it does not write.** "Real-time communications and notifications" is a delivery
  mechanism. Our 26 draft generators remain unmatched — now against an enterprise platform too.
- **It assumes staff.** Staff is a sidebar item and "onsite teams" a named user group. Our entire
  premise is that the host has none. **That is the market split, not a gap** — and almost every
  capability Blink has assumes someone is paid to operate it.

Their after-phase includes **template reuse for future events** — the third independent source for the
duplication gap, after Partiful and Linear.

---

## Infographics, light/dark, and sound

**Infographics.** Data-viz in this library is concentrated in finance, fitness and health; the event
category is ≈ zero. Ours: `sparkline|chart` = **1 hit**. Six places the data already exists:
planned/committed/spent stacked bar · `dayPhases()` segmented bar (already returns `{total, done,
state}`) · `raiseCounts` across the 15 engines · `arrivalClusters` density · multi-day Gantt ·
`VENDOR_LIFECYCLE_STAGES` funnel. **Rule:** one chart per surface, only where a number moves, every bar
carries its number. Figma ruling exists — `788:60`, bar = data, colour = state.

**Light vs dark.** Five of eight comparators ship a named appearance flow; most default light; Partiful
is dark-native. Ours: `palette.js` has a **full light mode** — all 18 tokens carry `light:`, properly
recalibrated (successGreen #4FAE7A → #298c52) — but `prefers-color-scheme` / `data-theme` / "light
mode" = **0 hits** in hostv2. `ACTIVE_MODE` is a build-time constant. **Doctrine conflict to resolve
first:** `carbonPanel.light = '#ffffff'` violates UX_01's "no white backgrounds anywhere."

**Sound and haptics — unmatched, and unverifiable elsewhere.** `src/lib/feedback.js` (141 ln) exposes
**17 named verbs**: tap · select · advance · settle · commit · seal · reveal · lock · success ·
received · exhale · budget · alert · dayStart · heart. `notificationSound.js` (93 ln) synthesises the
chime in Web Audio — two sine frequencies through an oscillator and gain envelope, no audio file, no
payload.

- **Haptic vocabulary** — three patterns by intent: celebration `[12,70,12]`, error `[40,30,40]`,
  commit `10`.
- **Decoupled channels** — a prior audit found muting sound killed all vibration. Fixed; muting sound
  still gets haptics. Very few products get this right.
- **Earned, not constant** — per-resolve is deliberately haptic-only ("a chime on every tap would chirp
  through a 9-item pile"). The chime fires once, on a whole bundle going quiet, ref-guarded so a first
  read or event switch never fires it.
- **Honest payoff** — peak bundle size is tracked so the celebration reports the total that cleared,
  not the final 1→0 step.
- **Correct iOS handling** — `primeMessageSound` unlocks the audio context on first gesture.

**The read: do not go looking for sound features to add. Go looking for places the existing 17 verbs
are not yet wired.**

**Micro-motion.** 83 `transition:` sites, 45 `:hover`, 24 `:active`, 31 `prefers-reduced-motion`.
Durations tokenised end to end — `--ms-micro` 100 · `--ms-fast` 140 · `--ms-base` 200 · `--ms-enter`
240 · `--ms-reveal` 420 — three named easings, no bounce. **Two defects worth fixing:** 45 hover rules
with **0** `@media (hover: hover)` guards (on touch, a hover style applies on tap and sticks — the most
likely source of "it feels slightly broken"); and 45 hover against **5** `:focus-visible` (keyboard and
switch users get roughly a ninth of the feedback). Both stylesheet-level, both cheap, neither needs a
design decision.

---

## Verified gaps

Every row grep-checked against `HostShellV2.jsx`, `InviteV2.jsx`, `PhotoStrip.jsx`. **Only zero-hit
results are listed.** Three initial candidates — defer, designed empty states, photo album — were
already built and were removed.

| Gap | Evidence in our code | Who ships it | Severity |
|---|---|---|---|
| **Per-day programme schema** | `dayPhases()` anchors to a single `anchorMin`. `multi-day` = 2 hits, both code comments naming the gap. Span primitives exist; the activity schema does not. | Wanderlog (day CRUD, sections, reorder, auto-fill) · Blink (one agenda, travel + activity as typed rows) | **Keystone** |
| Reunion / cohort model | Type only — 5 hits, a seating comment and a food regex. No household, travelling-party or debt-netting model. | Wanderlog (tripmates, group balances, expense simplification) | High |
| Co-hosts | `cohost`/`co-host` — **0 hits** across all three files. Architecturally single-host. | Partiful, Luma (Members), Wise (team members, payment approval) | High |
| Outbound guest comms | `blast`/`broadcast` — 0 hits; `reminder` — 3. `routeResolver.js` comments that `Communication` is deliberately unroutable. | Partiful (blasts, auto reminders), Luma (Chat), Eventbrite | High |
| Event duplication / templates | 0 real hits. All 10 `duplicat` matches are comments about duplicate surfaces. | Partiful · Linear · **Blink** — three independent sources | High |
| Guest self-report | `questionnaire` — 0 hits. We hold a diet route, so the data exists — but the host types it. | Partiful (Questionnaire, custom fields) | Medium |
| Waitlist / capacity overflow | `waitlist` — 0 hits. RSVP handling otherwise deep (197 refs). | Partiful | Medium |

### Two through-lines

**One: work that could be pushed off the host.** A co-host absorbs decisions. A blast absorbs chasing.
A questionnaire absorbs data entry. A duplicate absorbs setup. Event Boss is excellent at telling one
host what to do next and honest about what it does not know — **and it has no way to let that host
share the load.** The largest remaining friction is not in any screen; it is that one person carries
all of it.

**Two: intelligence that only runs once.** The programme and reunion gaps are a different shape. They
are not missing features — they are a **missing dimension**. Every engine assumes one day, one anchor,
one cohort. That is why the schema sits above the discrete gaps: it is the multiplier on work already
done.

---

## Where we already lead — the honest scoreboard

Two of these have no counterpart anywhere in the library.

- **We write the host's messages** — 26 draft generators across all three phases. No app in the set
  does this, not the 168-flow one, not the 131-flow one.
- **A 17-verb feedback vocabulary** — three haptic patterns by intent, a synthesised chime with no
  payload, sound and haptics decoupled, the chime reserved for an earned N→0. Not benchmarkable
  against this library, but the discipline is exceptional.
- **Group travel nobody else models** — `arrivalClusters`, `transportDecision`, ride state machines,
  airports, 430 refs. Booking.com and Uber both model one rider on one trip.
- **Readiness surfacing at 15 engines** — Wanderlog's prepare model is a manual checklist and some
  articles.
- **Defer as a first-class primitive** — 66 sites. No event or itinerary app in the set names one.
- **Field-level honesty** — Wise names honest states per surface; we name them per *field*, plus 70
  sources/grounded refs and one grounding ladder. Finer resolution than the strictest app in the set.

---

## How to improve the ask

Six lessons, each of which changed what the research could return:

1. **"Best, most widely used and respected" is three different metrics**, and Mobbin supports none well.
   Name the comparators yourself, or name the reason one qualifies.
2. **Settle the paywall before the ask.** "Look at the interfaces" is unbuyable on a free account — 361
   of Airbnb's 363 screens were locked. Roughly half the brief was unsatisfiable and neither of us knew
   until the page loaded.
3. **Ask for gaps proven against our code, not inferred from theirs.** Three of the first five "gaps"
   were already shipped. A competitor having a feature is not evidence that we lack it.
4. **The three values need testable definitions.** Converted to metrics: taps to first value; fields the
   host types versus fields the system proposes; share of data states with a designed named surface;
   share of grounded claims carrying provenance.
5. **Name the axis, not the category.** "Best event apps" produced Luma, Partiful and Eventbrite — and
   on the axis that matters, all three score zero. Had the brief opened with "who guides a host through
   a multi-day event", the set would have been right on the first pass instead of the third.
6. **State the medium's ceiling before trusting the medium.** Four of the questions asked were partly or
   wholly unanswerable from this source.

---

## Recommended sequence

Ordered by evidence strength and host-labour absorbed, not build cost.

1. **Doors for Getting here and Getting around.** The only live *defect* rather than an absence. ✅ *done*
2. **Guard the 45 hover rules** with `@media (hover: hover)`, and close the 45-hover-to-5-focus-visible
   ratio. Stylesheet only.
3. **Flow census of `demo/hostv2/`** in Mobbin's unit. Every claim about our depth is currently
   unmakeable, including the reassuring ones.
4. ⭐ **The per-day programme schema.** The keystone. Every day-of strength anchors to a single start
   time, so none of it works twice.
5. **Co-hosts.** Highest labour absorbed of the discrete gaps; three comparators ship it; unblocks
   approval-before-spend. Architectural — scope first.
6. **Reopen Communication.** We can write 26 kinds of message and cannot send one. Per *Wire the
   Outlet*, prove an engine consumes a send first — and design `Not Sent` / `Pending` / `Send Failed` as
   three distinct states from the outset, per Blink's two-column model.
7. **Duplicate an event.** Cheapest of the high-severity gaps. ✅ *done*
8. **The money bar and the phase bar.** Two infographics whose data is already computed.
9. **Redistribute motion toward the working surfaces** — progress and loading skeletons, using the
   illumination vocabulary that already exists. Not more animation; different animation.
10. **Tint-the-now on the run of show**, using `--steel-tint` and not amber. ✅ *done*
11. **Rule on light mode.** Wire it with a contrast sweep, or close it and declare dark the identity.
    Resolve the `#ffffff`-versus-"no white surfaces" contradiction either way.
12. **Mailbox connection.** Largest single friction removal available.
13. **Two named state surfaces** — vendor never replied, stay fallen through.

Steps 4, 5 and 6 touch architecture and should not start without a scoping pass. **If only one thing on
this list gets built, it is step 4** — it converts existing intelligence from working once to working
across a span.

---

## Sources

Mobbin app pages for Wise, Linear, ChatGPT, Wanderlog, Booking.com, Airbnb, Luma, Partiful, Eventbrite
and Tripsy (**922 flows**), plus the iOS "Most popular" ranking, the Animations library, and the
Subscription & Paywall collection (1,854 screens) — read 2026-07-29/30, the first pass on a free
account and the rest on Pro. Our-side claims come from grep over `demo/hostv2/src/`, `demo/src/lib/`
and `demo/src/theme/palette.js` at HEAD.

**No figure on this page is estimated:** where a number could not be sourced it is absent, where a unit
differs it is marked, and where the medium could not show something it is listed as not claimed.

Non-Mobbin source, stated separately because it is weaker: the Blink ExperienceOS section draws on
blink.global's marketing site and published product screenshots, read 2026-07-30. No trial, no
hands-on, no flow taxonomy; claims are reported rather than verified and no count comparison is drawn
from it.
