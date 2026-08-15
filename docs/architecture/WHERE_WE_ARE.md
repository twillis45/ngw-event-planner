# Where We Are -- live status board

**THIS FILE IS THE ANCHOR. Update it at the end of every working session.**
Undated on purpose: there is exactly one of these, and it is always current. Dated
snapshots (`2026-07-17_WHERE_WE_ARE.md`, `2026-07-17_THE_PLAN.md`) are history.

**Last updated:** 2026-08-14 (latest) - grounding started: the census was reporting a FALSE ZERO and is fixed; labelling is complete; the first citation moved a price and exposed a missing wire. Engine 5724 passed, e2e 440 passed / 0 failed.

---

## 1. Branch state

> ### ⚠ A SECOND SESSION IS LIVE IN THIS TREE - AND IT SWEPT MY WORK INTO ITS COMMIT
>
> Still running as of 2026-08-07 (vite preview on :5233, restarted at least once).
> It is building the **persistent section rail** (`VIEWPORT_PORT_RULING` step 3):
> `src/lib/sectionDirectory.js`, `showsRail()`, `hostv2/src/sectionIcons.jsx`, `.srail*` CSS.
>
> **What happened.** `hostv2/src/styles.css` carried that session's rail CSS and this
> session's wide-canvas fixes inside ONE diff hunk, so there was no pathspec that
> committed either alone - the wide-canvas work was deliberately left uncommitted while
> the entanglement lasted. That session then committed the whole tree in `cf0336c0`
> ("The menu existed as an attribute..."), sweeping in `wideSurfaceCss.test.js`,
> `wideCanvas.spec.mjs`, `playwright.config.mjs` and the styles.css fixes.
>
> **Nothing was lost and nothing is broken** - both CSS fixes are present and
> `wideSurfaceCss.test.js` passes as committed. The only damage is attribution: that
> work is described by an unrelated commit message. **History was deliberately NOT
> rewritten** - rebasing shared history while another session is actively committing
> is how work actually gets destroyed. Read `cf0336c0` as two changes, not one.
>
> That session has also already built what the design seat filed as item #7
> ("fill the 356x422 command-rail void"). Do not build it twice.
>
> **Before any `git add` in this tree:** `lsof -nP -iTCP:5233 -sTCP:LISTEN` and
> `git status --porcelain`. Untracked `src/lib/*.js` you did not write is someone's
> in-flight work; its header carries a dated "EXTRACTED <date> from ..." note.

**`origin/main` is `0d5052c2`** - PR #83 merged 2026-08-08 and DEPLOYED, verified in prod at
the chunk level (see 1f). It carries the risk-lane severity fix, the lodging deep link, the
live-mode census, the sign-in upload and event deletion. PR #82 (`208ebbb3`) and #79/#80/#81
are underneath it. Work since then branches off `origin/main`.

> **THE LOCAL `main` REF LIES. Fetch before you read it.** On 2026-08-07 local `main` was
> still at `8093dfa2` (PR #78) while `origin/main` was 175 commits ahead at `208ebbb3`.
> Every `git ls-tree main`, `git merge-base main` and "N ahead of main" answer taken from
> that ref was wrong by 175 commits. `git fetch origin` first, then read `origin/main`.

| Commit | What |
|---|---|
| `d4ab4f5f` | occupancy is the bed count, not the capacity - and amenities were on the page |
| `961a86b8` | the Hotels door carries the trip (dates + party) instead of a sentence about it |
| `0d273115` | the review board killed the URL-capture feature and found six live defects under it |

**`public/hostv2/` IS NOW GITIGNORED** (`.gitignore:62`, zero tracked files). Section 2's
old warning about it being a committed artifact that conflicts across branches is CLOSED -
that was item 3 on this list and it is done.

**Consequence for `npm run gate:hostv2`:** it builds hostv2 and diffs the result against the
**untracked, local** `public/hostv2/`. On a machine whose copy is stale it reports drift that
has nothing to do with your change - baseline it by stashing before you believe it. **CI does
not run this gate at all** (`checks.yml` runs `gate:knowledge` + jest, playwright e2e, pytest,
`gate:cra`, and a build). It is a release-path tool, not a check.

**Handoff hygiene item 1 is closed; item 2 is real.**
`hostv2/test-results/.last-run.json` is NOT tracked on `origin/main` and `.gitignore:67`
covers the directory - the handoff read the stale local `main`, so that one is done.
**`hostv2/review-shots/*.png` DO churn**: a clean tree before `npx playwright test` came back
with six modified baselines (desktop, laptop, large-mobile, large-monitor, narrow-mobile,
tablet-portrait). `git checkout -- hostv2/review-shots` after every matrix run, and check
`git status` before staging - a `git add -A` sweeps six binary diffs into an unrelated commit.

### The Hotels door carried nothing, and said it did

Driven live 2026-08-06: Google reads the PLACE out of `?q=` and **discards the dates and the
party**, falling back to tomorrow / one night / two guests. `checkin=`/`checkout=`/`adults=`
are ignored too. So the door opened on wrong-month, wrong-party prices and
`extractHotelCandidates` would store one as `priceShown`. The code comment above it asserted
the opposite ("Google parses 'Jun 17-Jun 21' perfectly well") and had been wrong since the
door was built.

`ts` is the only parameter that carries a trip - a base64url protobuf, decoded from a real
shared link and re-captured from Google's own picker. Full shape in `src/lib/googleTravelTs.js`.
Three findings that are not obvious and cost real time to establish:

- **Name-only works.** The captured links carry a Knowledge Graph id we never hold for a town
  the host typed; field `3.1.2.7` alone is honoured.
- **The party size IS a repeat count** - one submessage per adult. No integer field holds it.
- **A past check-in is silently ignored** and Google reverts to defaults. Two verification
  attempts were misread as "the mechanism doesn't work" because of this. Emitting a `ts`
  anyway would restore the original bug in a form that LOOKS fixed, so it returns null.

**Do not propose passing a hotel NAME as the place** to get a per-hotel dated door - driven,
returns an empty page (83 chars, no results). That field is a location.

### The same defect in URL form - CLOSED 2026-08-07

The 2026-08-06 guard `looksLikeHotelDetailPage` fires on the **tab strip**
(Overview/Prices/Reviews/...), which is visible TEXT. A pasted **link** carries none, so a
single-property `/travel/hotels/entity/<id>` URL walked straight past it. The handoff listed
this as open; it is now fixed (`lodgingIntel.js:1855`, `HOTEL_ENTITY_URL`).

**The handoff's stated mechanism was wrong, and the correction matters.** It said the URL
"falls into `extractHotelCandidates`" - i.e. the fabricated-provenance bug all over again.
It does not. `extractHotelCandidates` groups on the `<a>` boundary and a bare URL has no
anchors, so it returned **zero** candidates. Measured, not read:

```
/travel/hotels/entity/<id>   looksLikeHotelsResultsPage true
                             looksLikeHotelDetailPage  false     <- the hole
                             extractListingCandidates  0 candidates
```

So the damage was the **wrong instruction**, not a bad row. Zero candidates dropped
`LodgingCockpit` into its `hotelsPage` branch, which told the host *"I couldn't find any
hotels on that page - copy the whole list"* while the host was standing on ONE hotel's page.
That instruction can never succeed there. It is a loop, not a dead end.

Both branches driven live in hostv2 (`?demo=lodging` -> Go look -> paste):

| Pasted | Says |
|---|---|
| `/travel/hotels/entity/<id>` | "That's one hotel's page - go back to the list of hotels and copy that instead." |
| `/travel/hotels/Santa-Fe-NM` | "I couldn't find any hotels on that page - copy the whole list" (unchanged, correct) |

**The clause is anchored `^...$` on purpose** - the whole payload must BE the link. Unanchored,
a results page carrying a single entity href would be refused outright and every hotel on it
thrown away. `hotelsResultsPaste.test.js` holds that down with the results fixture plus an
appended entity anchor. No new copy was written: the existing detail-page sentence is true for
both shapes, and a second string saying the same thing would be a duplicate surface.

---

## 1b. The viewport port landed - 2026-08-07 late session

**HEAD `b60095c4`.** Seven commits, each driven live before it was committed.

| Commit | What |
|---|---|
| `cf0336c0` | the persistent section rail - `data-rail` was computed, written to the DOM, and consumed by NOTHING |
| `25cb4f17` | the two-pane data grid retired - it produced up to **1344px of vertical void** |
| `1c1eb799` | the command hero had a SECOND rail, and it was empty |
| `bf584f86` | guest metadata laid out in aligned tracks |
| `2e60f68b` | the column header, derived from shared track variables |
| `0ba26511` + `56cd97f0` | the reply chip measured to the end - it is not a layout bug |
| `b60095c4` | a full-width primary CTA is a phone affordance (1220px -> 500px) |

**Measured before -> after, driven at 1024/1440/1920 plus real Chrome:**

```
dead space     1440: 4% -> 3%      1920: 33% -> 22%   (18% on data sheets)
legacy sheet   1440: 73% -> 3%     1920: 80% -> 22%
guest tracks   header cells sit at delta 0 over name / kids / meal / dietary
rail           16 doors - icons - 44px rows - no truncation - no h-overflow
```

**The rail is not a new surface.** It renders the same `sectionGroups()` the Sections
sheet renders, through the same `goToSection()`. Adding a door adds it to both, by
construction - `src/lib/sectionDirectory.js`.

**`showsRail()` no longer asks the surface.** It first withheld the rail at desktop on
any sheet still wearing the phone silhouette; driven, that made navigation VANISH when
you used it (open settings at 1920 -> 1500px canvas drops to a 393px phone, 80% dead, no
rail). The fix was not to withhold the rail, it was to stop those surfaces being phones
while a rail is up. Pinned by a test asserting every sheet in a band gives the same
answer, so it can never start blinking again.

### Three defects only DRIVING found

1. **The rail was dead whenever a sheet was open.** `.sheet-scrim` is
   `position:absolute; inset:0` and `.app` is not a positioned ancestor, so it resolved
   against the whole grid. You could open Budget from the rail and then never reach
   Guests. The sheet and its scrim now belong to the CONTENT column.
2. **Rail rows measured 35px** - under the 44px floor, and tablet-land is a touch device.
3. **The measure cap matched nothing, twice** - once as `68ch`, once as `> .app .sheet`
   when `.sheet` is a DIRECT CHILD of `.stagewrap`.

### Still open on wide - all measured, none guessed

- **The command surface is still a stretched mobile column.** Host, in Chrome: "command
  is just a version of the mobile in column 2." `UX_04` wants zones - a command header
  carrying 3-4 stat cards from real data, then the priority lane, then the work. Instead:
  no stat cards (24 guests / $24,000 are buried at the BOTTOM under "WHERE YOU STAND"),
  progress stranded far-right with nothing near it, and the fold handle - a pure phone
  affordance - mid-canvas. **This is a board call**: it would be the third re-zone of the
  same `grid-template-areas` element.
- **Reference rows are uncapped**, arrows ~1200px from their labels (:201 recorded this
  same defect once already). Four selectors written for it matched NOTHING and were
  deleted rather than left as dead CSS.
- **The reply chip is 320px** because the inline RSVP picker lives INSIDE its trigger
  button, so the trigger's min-content is ~320px. Chain measured end to end in
  `56cd97f0`. The real fix moves the picker out of the trigger - a change to the RSVP
  control on every viewport, so it is a board call, not a stylesheet tweak.
- **No on-demand detail pane, no filter/view switcher.** The two remaining leader
  patterns. Note the board already killed a PERMANENT third pane, so detail must be
  on-demand only.

**Honest score vs leaders on wide: ~8.5/10.** Parity on persistent rail, no vertical
void, and aligned tracks with a header. Not parity on the three items above.

---

## 1c. The board sat on the command surface - 2026-08-07 (latest)

**ONE ROOT CAUSE UNDER FOUR SESSIONS OF SYMPTOMS.** `showsRail()` is width-only, and
wider than its own comment claimed: `isWideBp` is `bp === 'desktop' || bp === 'tablet-land'`
(`viewport.js:42`), and tablet-land starts at **1024** (`viewport.js:26`). Every desktop
rule in `styles.css` is `@media (min-width:1280px) and (min-height:700px)`.

So on any canvas >=1280 wide and **under 700 tall** the rail is up and NOT ONE desktop
rule applies. That is not an edge case - **the host's own machine is 1280x800, which is a
1280x654 inner viewport in Chrome.** The headless matrix runs 1440x900 and 1920x1080,
where the height condition passes, so it was structurally blind to the whole class. The
host and the review board were not looking at the same product.

| Commit | What |
|---|---|
| `f8ae0a50` | the other session's tap-target fix, recovered from the tree and committed intact |
| `8a4d4556` | stretched column -> 3-col grid; reference rows found; orphan fold; stranded progress |
| `8d36f6f0` | the four doctrine gaps, written up |
| `60ec507a` | **P0 I shipped** - the 3-col grid was running at 1024 and wrecking tablet-land |
| `7c482d0b` | tablet-land restored to byte-identical; the matrix baselined |
| `32a34b6a` | height stripped off composition/measure rules - the host's laptop finally has a canvas |
| `377515b9` | **the void was a reserved iPhone** |
| `993c46db` | "Sort it out" named no act, and the gate was measuring indentation |
| `89063812` | the Zone 1 header was a pseudo-element, not text |
| `bc0429fd` | the canvas was not empty - the sentences were being swallowed |

**The finding that retired the argument.** `styles.css:931` was
`.hero{ min-height:calc(852px - 64px - 88px) }` = **700px. 852 is an iPhone.** A phone
viewport minus its chrome, hard-reserved in the hero at every width, released only under
`@media (max-height:699px)` - whose own comment already called it "a phantom 700px".
Nobody ever chose a void budget. Released for the responsive command canvas: hero
700 -> 565px at 1440, and the Venue capture - which `assembleRevealEngines.js:127` pushes
as `urgency:'critical'` - moved from y=760 clipped to fully inside the first viewport with
its input and Save. **The engine ranked it critical and the layout was overriding the
engine with a phone.**

Board verdict before this session's fixes: **4/10 at 1280x654, 3/10 at 1728** - and the
direction mattered more than the number: *the surface degraded as the canvas grew.*

**THE VENUE CAPTURE - DONE** (`62fd873b`, `57f48c33`). It was never four copies of one
thing; the copies had DRIFTED, and each difference was a defect:

```
site                        source attribution   validation error
hero wired editor           absent               .because / --warn   (AMBER)
blocker card                absent               .grounding / --danger
"Where is it happening?"    PRESENT              .grounding / --danger
Venue sheet                 absent               .grounding / --danger
```

The address suggestions carried their source line on ONE of four surfaces - a provenance
gap, not a style nit - and the same validation error rendered amber on one and red on
three, which the colour doctrine forbids outright. `renderVenueCapture()` is the single
control now (a plain function returning JSX, NOT a nested component: a component declared
inside a render gets a fresh type each pass, so React would remount the input on every
keystroke and drop focus mid-address).

Then driving it showed the surface still rendered **two at once** - hero editor at y=189,
blocker card at y=734. The blocker now defers to the hero, and the hero is derived as
`queue.filter(show)[0]`, **not `queue[0]`** (an order-preserving filter is not the same
list). Guard also mirrors the editor's own render condition so it can never remove the
LAST venue input.

**TWO SCORES, MEASURING DIFFERENT THINGS — do not conflate them.**

```
HOST, layout specifically, 2026-08-07 .......... 7.5 / 10
BOARD, composite (layout + density + traversal
       + data honesty), 1280x654 ............... 5.0 / 10
BOARD, composite, 1920 ......................... 4.0 / 10
```

Both can be right and probably are. The board's composite is dragged down by things
that are NOT layout — a 1.5% citation rate, no keyboard layer, six rows where leaders
run 8-20. The host is scoring the composition. **When someone quotes a number for this
surface, make them say which one.** The board's own ruling is that 8.5 composite is
reachable on layout/CSS/copy and 9 is not, because the last point is research.

On the host's axis the gap from 7.5 is roughly: nothing fluid above 1440, ink falling as
the canvas grows, no traversal, and the Lodging Cockpit still a 393px phone.

**THE WIDE-SCREEN SLOPE, MEASURED 2026-08-07.** The board's finding was never the
number, it was the direction: *the surface degrades as the canvas grows.* Now quantified
on the command surface (ink = area of leaf text nodes over canvas area):

```
viewport      .app        ink     hero      stat column
1280x654      1010x804    63%     645x461   288x475
1440x900      1170x840    51%     645x437   288x475
1728x1080     1278x900    44%     645x437   288x475
1920x1080     1278x900    44%     645x437   288x475
```

Three facts in that table, and they are the whole problem:
- **`.app` hard-caps at 1278x900**, so 1728 and 1920 render IDENTICALLY. Above 1440 the
  product stops responding to the canvas at all.
- **Nothing is fluid.** Hero 645 and stat column 288 at every width.
- **Ink FALLS as the canvas grows.** More room produces more nothing.

**THE VENUE BLOCKER IS IN THE WRONG PLACE, and it is a symptom.**
`assembleRevealEngines.js:127` pushes it `urgency:'critical'`, `reversibility:'locked'`,
`blocks:['catering']` — the gate on the sequence — and the layout renders it dead last,
below "Worth keeping an eye on", which is explicitly the BACKGROUND lane. A critical item
wearing a footnote's position. Worse, the same question is already on screen as an open
`Venue` chip in the named set ~300px above it: one question, two surfaces, again.
Two builds, materially different, NOT chosen:
  A. the blocker becomes the ask (board wave 2) — an ENGINE ranking change, a critical
     blocker outranking the queue head. The stand-down mechanism already exists
     (`heroCarriesVenue`, 57f48c33); it does not fire because the queue's head is lodging.
  B. the open chip resolves it in the right column — removes a duplicate surface rather
     than relocating it, and earns the empty column (the design seat's standing dissent:
     the stat column and the detail pane are ONE region).

**Board rulings still unbuilt:**

- ~~Blockers marked `urgency:'critical'` render IN the hero, not as siblings after it.~~
  **BUILT + GATED + DRIVEN 2026-08-14** as `_selectEventNextActionInner` **Tier 0.6**.
  Three findings came out of building it, and two of them are worth more than the ruling:

  1. **IT BELONGS IN THE SELECTOR, NOT IN `eventPlan`.** The first build promoted the
     blocker inside `eventPlan`, after the selector had already chosen.
     `hostEngineSelectionParity` caught it — that contract compares the selector's head
     against `eventPlan().nextActions[0]` precisely so the host can never be shown
     something the engine did not select. Ranking it as a TIER makes every derivation
     agree by construction and `eventPlan` needs no special case at all.
  2. **IT MUST NOT FIRE ON A FRESH EVENT.** "No venue" is true of every brand-new event,
     so an unconditional promotion made a critical blocker the first thing every host
     would ever see. `decisionSoundness` fixture A is a written contract against exactly
     that (`unacceptable: ['critical severity', …]`). Tier 0.6 sits BELOW the Tier 0/0.5
     foundation moves — a gate is worth raising when there is work behind it to gate.
     Twelve tests across seven suites said this; none of them were edited.
  3. **THE TWO VENUE READERS DISAGREE — STILL OPEN, AND NOW THE REAL ITEM.** Measured:

     ```
     eventLocationStatus(ev)     "city_only"   -> location essential HANDLED
     deriveDecisionBlockers(ev)  venue-selection, urgency: "critical"
     ```

     One fact, two engines, opposite answers, on any destination event with a town but
     no named venue. It is **pre-existing and visible today**: the stat column's Venue
     chip reads "handled" on the very event whose blocker list calls venue critical.
     Promoting on the blocker alone would have put "Add the location." at display size
     beside a chip saying Venue is done. **So Tier 0.6 promotes only where BOTH readers
     say unresolved**, and where they disagree the surface keeps today's behaviour.
     That is a standoff, not a resolution. **THE BOARD SAT ON IT 2026-08-14 AND RULED —
     full ruling in [`docs/audits/2026-08-14_VENUE_READER_BOARD_RULING.md`](../audits/2026-08-14_VENUE_READER_BOARD_RULING.md).**
     Verdict: **neither reader wins — SPLIT THE FACT IN TWO** (`Where it happens` = town,
     `Venue address` = signed address). Options A and B both died; the event pros
     overrode Rams/Ive's option B as "the status quo, repainted". The address does NOT
     count in the handled numerator (count reads 2 of 6, not 3), `critical` at 310 days
     is sequence mistaken for severity and becomes a countdown ladder, and the real
     injury is the hero sending a host with no address to book 24 non-refundable rooms.

     **AND THE SITTING FOUND SOMETHING THAT OUTRANKS ITS OWN RULING, verified by
     checksum: naming the venue changes NOTHING on screen.** `b-cityonly` and `c-named`
     are byte-identical at mobile-390 and tablet-768; at desktop the only difference in
     the whole frame is one orphan card. The strict reader's verdict reaches the host
     *not at all* — filtered out at `HostShellV2.jsx:8908-8917` while the hero talks
     about hotel rooms. So Tier 0.6 is not a truce over a disagreement, it is a truce
     over **a wire that was never connected**. Fix the wire before the wording.

     **BUILT 2026-08-14.** All six steps. The town and the venue address are now two
     essentials (`location`, `venueaddress` in phaseProgress); the address is priority 3,
     ahead of lodging, and is NOT in the handled numerator. Venue severity is a countdown
     (`assembleRevealEngines`), so Tier 0.6 promotes the venue gate at every stage and
     carries the laddered tone rather than a constant `critical` — gating the tier on
     `critical` made the gate vanish at 310 days and reappear at T-120 while the cue
     ladder ranked it first the whole time, which `hostEngineSelectionParity` caught.
     The agreement guard is deleted: both readers agree by construction now.

     Driven live: `a-nothing` "Add the location." · `b-cityonly` **"Pick the place in
     Santa Fe."** with the chip reading "Venue address — still open" · `c-named` "Sort
     where everyone stays." The b/c captures are no longer byte-identical.

     **Four defects only driving could find**, all fixed: a RAW ID reached host copy
     ("date & time and *venueaddress* still need you" — `DIMENSION_LABELS` had no entry);
     the venue ask was DUPLICATED in the queue (`_topPhaseMatch` used `.find()`, and the
     split put two essentials on `event-venue`); the hero said "Add the location." on a
     town-set event (`heroAsk`'s prose ladder — fixed by authoring `ask`, as that file's
     own header prescribes); and **`ask` was the FIFTH field the `topAction` rebuild has
     silently dropped** (after F1 `level`, F7 `leadDays`, `sourceCategory`, `blockerType`).
     **That whitelist is a standing hazard and wants a gate of its own.**

     **The spend guard is BUILT too**, in the cockpit rather than as an interstitial —
     the ops seat's "the warning belongs where the money leaves". Amber on the exact
     `--warn` token, carrying the hold-vs-booking distinction the product had no words
     for. Gated both directions (`hostv2/e2e/lodgingSpendGuard.spec.mjs`).

     **And the `topAction` whitelist finally has a gate**
     (`topActionCarriesEveryField.test.js`) — it sweeps every field the selector
     produces, so the SIXTH dropped field fails the day it is added. Red-proofed:
     stamping `reversibility` without updating the rebuild fails and NAMES the field.

  Also fixed, and found only by DRIVING: the hero asked "Add the location." while the
  queue's second row said "Add the location". `topDomain` adopted a matched phase
  concern's domain only for `category:'readiness'` heroes, so a `'blocker'` hero never
  deduped against the location cue that resolves through the same `event-venue` field.
  And `blockerType` was the FOURTH field the `topAction` rebuild has silently dropped
  (after F1 `level`, F7 `leadDays`, and `sourceCategory`) — that whitelist is a hazard.
- ~~`.tile-a` is `display:none !important` and the richest computed block on the surface is
  suppressed.~~ **BUILT `1c163c97`, GATED `cb2f1ae7`, DRIVEN 2026-08-14.** The exception is
  scoped to the rail composition only (`.stagewrap--responsive-command[data-rail="1"]
  [data-bp="desktop"]`, `styles.css:4866`); `:909` still stands for the phone, where the
  bento is a 2x2 grid and the tile really is a card. Measured live at 1440x900: 288x228,
  six named routed chips, `.bento-head` deferring, duplicate fraction down, heading above
  the lifecycle sentence. The header collision noted here was resolved in the same commit.

> **THIS LIST WAS STALE, AND IT IS THE THIRD TIME.** Ruling 2a was read as open on
> 2026-08-14 and a session was spent starting work that `1c163c97` had already finished —
> including the follow-on defects un-hiding it caused (the borrowed 215px of escreen
> height, the double fraction, the second header), all already fixed in that commit. Same
> class as the lodging "STILL DARK" entry retired 2026-08-07 and the same as the hero-void
> "fix pending" note the same morning. **A ruling's presence on an unbuilt list is not
> evidence it is unbuilt.** Grep the selector and drive the surface before working an item
> off this section; the doc records what was true when it was written.

---

## 1d. The Santa Fe drive - 2026-08-07, two defects in the RISK lane

The handoff's START HERE. Driven against the seeded `cust-demo-santafe` (Mom's 80th, Santa
Fe, Jun 17-21 **2028** - i.e. **680 days out**, which is what exposed both of these). Both
are live on the birthday playbook, the highest-traffic type there is. Neither is fixed.

### A. The rail stripped the words that made a risk a contingency - FIXED 2026-08-08

`surfaceRegistry.js:123` titles a playbook risk **`Have a plan for: ${r.trigger}`**. That
prefix is the whole honesty of the thing: `trigger` is the CONDITION under which the risk
fires, not a statement about now. `wlabel` (`HostShellV2.jsx:7959`) strips it:

```js
.replace(/^have a plan for:\s*/i, '')
```

so the command-board rail rendered the bare trigger: **"Final headcount still not locked
3 days out"** - on an event 680 days out. A present-tense state claim, and false.

**IT WAS A REGRESSION WITH A WRITTEN CONTRACT, not a design mistake.** The strip was
correct when it shipped. Wave 6 (`502d348a`) headed this lane **"Heads-up - have a plan for
these"**, and its own commit says why the rows can drop the prefix: *"the lane label carries
the ask once, so each row reads as the risk itself, in the registry's own words."* Then
`c02c0dad` replaced that header with "Worth keeping an eye on" **and carried the strip
forward unchanged** - in the same diff. The ask moved out of the header and was still being
deleted from the rows. Neither half is wrong alone.

**Fixed at the HEADER, honouring the original ruling:** both lanes (`ef-sect` :7989 elegant,
`horizon` :8049 non-elegant) now read **"Worth having a plan for"** - the risks sheet's own
words (*"they're the ones worth a plan"*, :12908), so the two surfaces about the same rows
no longer say opposite things. Rows are untouched and stay short; restoring the prefix
per-row would repeat one ask N times, which is the exact anti-pattern the neighbouring
destination-cell comment (:8012) already settles.

Gated by `worryLaneCarriesTheAsk.test.js` - a cross-file contract test, because neither file
is wrong on its own and no single-file review or one-lane screenshot could catch it. It
finds the lane STRUCTURALLY (the header nearest each `wlabel(w)` row), not by class name -
keying on `ef-sect` was the first cut and it wrongly caught "Then, in order". **Proved to
fail on the defect**: reverting only the two header strings turns 2 of its 5 tests red.

Do NOT fix this by editing the playbook `trigger` strings - they are correct as conditions,
and 40+ files carry them.

### A2. `critical` did not exist at runtime - FIXED 2026-08-08 (board finding, not mine)

The board went past B and found this underneath it. **Two defects, one root: the authored
severity vocabulary and the rendered one had drifted and nothing held them together.**

Census of `playbooks/data/*.js`: **`med` 261 · `high` 240 · `low` 75 · `medium` 18 ·
`critical` 4.** The renderer's lookup was `{ high, medium, low }[sev] || 'Worth a look'`,
**duplicated verbatim at both risk render sites**. So:

- **261 `med` records - the largest class - missed the map** and fell to the fallback.
  "Keep an eye on it" was unreachable for 93% of mid-severity risks. Dead code that nobody
  could see was dead, because the fallback looked like a real answer.
- **The 4 `critical` records also missed**, and the colour ternary painted them **AMBER** -
  *quieter than `high`*. A severity inversion on these rows:
  `holidayParty.r_saferides` **"An impaired guest is about to drive home"** (authored with
  social-host liability language), `holidayParty.r_overserve`, `dinnerParty.r_dietary`.
- **And they could never reach the command board at all**: `surfaceRegistry.js:109` filtered
  `=== 'high'` - a string equality against one literal - while its own comment said "only
  high severity raises", meaning high AND ABOVE. `critical` silently failed it.

**Fixed** in `src/lib/riskSeverity.js`, one table, imported by both render sites and the
raiser. `med` collapses into `medium`; `critical` gets its own label and sorts first.
**No fifth colour** - UX_02 caps a viewport at 3 semantic colours and names the vocabulary;
red is already UX_02:25's "critical issue" band, so `critical` and `high` share `--danger`
and separate by LABEL and ORDER. **The 2026-07-14 ruling is untouched**: `medium`/`low` still
never raise and the raised action still carries `severity:'attention'`, so a new outdoor
event does not open with "Have a plan for: rain" as its number one.

There is now **no string fallback at all**. An unknown value normalizes to `medium` and is
reported by `isKnownRiskSeverity`, which `riskSeverityCorpus.test.js` asserts over the whole
authored corpus - the fixture IS the data, because an example-based test would have passed
throughout (nobody would have typed `'med'`). It also asserts no inline lookup survives in
the shell, since a third copy would reintroduce the defect on one list and pass everything else.

**Driven live** on a seeded Holiday Party: both critical rows now render "Safety - plan this
first" in red, sort to the top of the lane, and appear on the command board where they were
previously absent. `med` rows now read "Keep an eye on it". "Worth a look" is gone.

*Found while sweeping for the fallback, unrelated and NOT fixed:* `HostShellV2.jsx:6604`
still renders **"Mostly on course - {slipText}. Worth a look today."** and the comment
directly above it at `:6572` already calls that string *"the vague CTA 04 bans (the
Review-status ...)"*. A self-documented banned CTA still shipping on the timeline-slip
surface. One line, different surface, own slice.

### B. Three of five risks offer only "Handled - stop showing this"

`riskRouteFor` (`HostShellV2.jsx:1463`) is a keyword regex over trigger+mitigation and
returns `null` on no match; `route &&` at `:12933` then drops the **"Plan for this"** button
entirely. Run against the five birthday risks the drive surfaced:

| Risk | Route |
|---|---|
| Final headcount still not locked 3 days out | **none** |
| Kid food allergies not collected | `Planning/food` |
| Cake ordered too late | **none** |
| Outdoor party, no rain plan | `rain-plan` |
| No ice / warm drinks | **none** |

So on three of five the only act the host is offered is **dismissal**. Two holes, both
plain once named: there is **no guests/RSVP/headcount rule at all** (no `guest`, `rsvp`,
`headcount`, `count`), and the food rule (`\bfood\b|portion|allergen|\bdiet\b|\bmeal\b|
\bmenu\b`) misses `cake`, `ice` and `drinks`.

**Do not just append keywords.** A regex that returns a tab is not proof the tab lands
anywhere useful - click each one through first (`feedback_dead_links_click_through`).

### THE BOARD SAT ON B - 2026-08-08. UNANIMOUS NO-SHIP.

Render-first per the roster (`_riskLaneCapture.spec.mjs`, env-guarded, five viewports).
Four design seats, brutal not consensus: **Norman 3/10 · Saarinen 3/10 · Rams 4/10 ·
Zhuo 5/10.** Every claim below was re-verified against the code before being written here -
agreement between four agents is not correctness.

**They found the fix, already authored, sitting in the same file as the risk.**
`birthday.js:101-104` authors `contingencies: [{ id:'c_cake', when:'r_cake', plan:'Grab a
grocery sheet cake + candles same-day; nobody will know.' }]` - an **ID-keyed foreign key
from a risk to its plan**. `experienceComposer.js:161-165` **already implements the join**
(`risks[].id === contingencies[].when`). All 39 playbook files carry a `contingencies` block;
~172 records key to an `r_` risk id. `HostShellV2.jsx` references `contingenc` **exactly
once, in a comment** - it never reads one. So the cake plan is written down, stored, joined
by a working linker one import away, and the host is shown an eraser.

**A regex over English is being used where a lookup on an identifier already exists.** That
is the root, not the missing keywords - adding `headcount|cake|ice` patches five rows and
leaves the mechanism for the other 574.

**And regex three already exists and already disagrees.** `playbooks/index.js:2048` -
`RISK_DOMAIN_RE.guests = /headcount|rsvp|\bcount\b|.../` **matches** `r_headcount`;
`riskRouteFor` returns null for the same string. Two readers of the same prose, opposite
answers, shipped.

**Zhuo's structural read, which reframes the whole item:** the risk record is the **only**
`surfaceRegistry` raiser that emits no `leadDays`/`dueInDays` - milestones (:356), tasks
(:527, :587), vendor payments (:633), COI (:680) all do. No lead time means
`proposedSnoozeDays` can never clamp a risk, so **snooze was never offerable and permanent
dismissal became the only verb by omission, not by decision** - and `snooze.js:1-8` opens by
describing this exact failure in words. A trigger carrying its own lead time in prose
("...3 days out") renders as a T-679 status because nothing can read it.

**Ruling, in order:**
1. **Give the risk record its lead time.** Makes the lane truthful at range, unlocks snooze
   for free, gives the sheet a date to render, and puts risks in the same shape as every
   other raiser.
2. **Read `contingencies[].when` for the route**; `riskRouteFor` demoted to fallback,
   deleted last, with a test asserting nothing depends on it.
3. **Every row gets a constructive act.** Floor: "Add this to my checklist" writes the
   already-authored, already-rendered mitigation as a real task. Dismiss never renders alone.
4. **Relabel and de-weight the dismiss.** UX_07 requires Mark/Record and "subdued"; both
   buttons are `className="mini"`, identical, and the 27-character dismissal is physically
   twice the width of "Plan for this" on every row.

### B - THE FLOOR IS BUILT. Ruling #3 shipped 2026-08-08.

**Every risk row now renders exactly two buttons, one of them constructive.** Where the route
resolves that act is "Plan for this"; where it does not, the authored mitigation becomes a
real checklist step. **The dismiss never renders alone.** That also settles the board's
affordance finding - buttons used to appear on some rows and not others down a uniform list,
teaching the host that a missing button meant "nothing to do here", which was false on three
of five rows. The old playbook-row gate was `(route || r.id)` with each button separately
conditional, and `r.id` is always present, so dismissal was unconditional while planning was
conditional: **the destructive act always, the constructive act sometimes.**

**NO THIRD REGEX WAS ADDED.** The mitigation is already authored and already rendered on the
row; `event.timeline` is a real store that **eight** engines read (`workflowCompression`,
`dayAlerts`, `dayBefore`, `disclosure`, `helperResponsibility`, `decisionMemory`,
`duplicateEvent`, `vendorQuestions`). Writing there turns displayed advice into tracked work,
and the checklist's OWN router then gives the step a destination. Measured over all 246
authored risks:

| Router | Resolves |
|---|---|
| `riskRouteFor` (the risk regex) | **130** / 246 |
| `checklistRouteFor` (existing engine) | **209** / 246 |

Same row shape as `addHelper`, which established the pattern. `week:''` / `leadDays:null` is
an honest unscheduled step - risks carry no lead time (ruling #1, still open) and guessing
one from the trigger's prose would be the parse-the-English mistake this replaces. Adding
twice does not duplicate; it routes to the existing row.

**DRIVEN END TO END** on a seeded Holiday Party: "An impaired guest is about to drive home"
-> **Add to my checklist** -> `event.timeline` gains `risk-r_saferides` (persisted, verified
in localStorage) -> the checklist renders **"Pre-stage a safe-rides plan"** with the detail
beneath it -> the step carries **"Open rides ->"**, a destination the risk regex never
produced. Gated by `riskRowHasAnAct.test.js`, **proved to fail** on the reintroduced defect
(3 of 8 red, including "dismissal never renders without a sibling act").

**A REAL GAP THIS SURFACED - not caused by it, revealed by it.** Clicked "Open rides ->"
through, per the never-test-a-link-from-code rule. It lands, and the Ground sheet says
*"This is a local event - nobody's coordinating travel. If that changes, mark it as a
destination event under Space, seats & helpers."* So on a LOCAL event the safe-rides step
routes to a surface that has nothing for it - and a local holiday party is exactly when a
safe-rides plan matters most. The Ground sheet treats rides as destination-only. Not a dead
tap (it opens, explains itself, names a next step) but not useful either. **Own slice.**

**STILL OPEN from the board:** ruling #1 (give the risk record its lead time - the structural
one Zhuo ranked first), ruling #2 (read `contingencies[].when` for the route and demote
`riskRouteFor` to fallback), ruling #4 (relabel the dismiss per UX_07 Mark/Record and
de-weight it - both buttons are still `className="mini"`, identical, and the 27-character
dismissal is still physically twice the width of the constructive act). Event pros + the
Grandmother seat have NOT sat yet.

### What the drive CONFIRMED working, so nobody re-opens it

- **The ignition reveal** runs and lands on the command board.
- **The selected-decision panel** (PR #70) is live: clicking a "Then, in order" row raises
  `SELECTED / Set the start time / Resolves in Event Details` in the rail with its CTA.
- **The air/ground Sections doors exist** - `Getting here` and `Getting around` are both in
  the nav. The 2026-07-29 "no Sections door" finding stays closed; it was fixed 2026-07-30.
- **Destination nav appears on `isDestination`** - `Travel & where everyone stays` too.
- **Risk dismissal** writes `riskStatus` and the sheet re-derives its count.

### The multi-day hole - MY FIRST WRITE-UP OF THIS WAS WRONG. Corrected 2026-08-08.

I wrote that the per-day programme schema was "confirmed missing" and that there was "no
schedule, programme or run-of-show door in the nav at all". **Both are false**, and I
inherited the first from the handoff instead of checking it. The Triply competitive read
caught it; verified here directly:

- **The schema exists and persists.** `HostShellV2.jsx:10421` -
  `patchEvent({ itinerary: rows })`. Host-accepted rows live on `event.itinerary`; guests
  only ever see accepted rows, never a raw proposal.
- **The arc is SPAN-gated, not type-gated** (`itinerary.js:198-210`). The comment there
  records the fix: it used to read `ev.type === 'Reunion'`, so 38 of 39 playbooks produced
  nothing. Now any event spanning days gets an arc, because "arriving, gathering and leaving
  are properties of a span rather than facts about reunions."
- **There IS a door** - I just could not find it by its name. The weekend plan renders inside
  `sheet.kind === 'space'`, whose label is **"Space, seats & helpers"**
  (`sectionDirectory.js:54`, sub: "Tables, chairs, rentals, who's helping").

**So the real finding is worse than a missing feature and cheaper to fix: a built,
persisted, host-editable multi-day programme is filed under a furniture label.** Nothing in
"Space, seats & helpers / Tables, chairs, rentals" suggests a day-by-day plan, which is why
a full drive of a five-day trip missed it entirely. That is a naming and routing defect on
top of working machinery.

**What IS genuinely missing** (per the Triply read, unverified by me - CHECK BEFORE
BUILDING): TIME - rows carry only `morning/midday/afternoon/evening/night` against one
`event.startTime` for the whole span; and COVERAGE - the arc emits three anchors regardless
of span, so days 2 and 4 of a five-day trip are silent. `itinerary.js:112` reportedly names
this hole in its own provenance.

Still true and still a defect: on a Jun 17-21 event the queue's own row reads **"Set the
start time"**, singular, and resolves in Event Details - one clock for a five-day trip.

*Lesson, and it is the handoff's own: I repeated an inherited "confirmed missing" without
opening the file, then added an absence claim ("no door in the nav") from a single failed
look. Both are the exact error `feedback_absence_claims_need_exhaustion` names.*

---

## 1e. The lodging deep link did not survive the hand-off - FIXED 2026-08-08

Worked because it serves an OWNER-STATED goal rather than a derived one: *"CTAs are
broken again. CTAs should be deep links only"* (`PHASE_HERO_1.md:25`) and *"this may be my
biggest truth function and it has got to work every time"* (`:32`). A goals audit this
session found that the attention system has no open item anywhere in section 5, while the
board's rulings have become the de-facto queue. This is the first item taken off the host's
own words in a while.

**The defect.** Every sheet kind keeps its `focus` because the dispatcher builds
`{kind, focus}` and hands it to `setSheet` - same page, component state. The cockpit is a
PAGE LOAD (`goToLodgingCockpit` assigns `window.location.href`), so anything not in the URL
is gone. It was gone: `HostShellV2.jsx:3829` called `goToLodgingCockpit()` with no argument,
**one line above** the generic path that preserves focus for everything else.

So `surfaceRegistry.js:436` raises the group-rate obligation with
`focusField:'lodging-deadline'`, `routeResolver.js:98` resolves it to
`{kind:'lodging', focus:'deadline'}`, and the host tapped a dated warning about a deadline
and arrived at a screen that never mentioned one. Nothing caught it because the only
consumer of `sheet.focus === 'deadline'` in the shell lives inside the lodging sheet the
file itself calls unreachable.

**Fixed** by carrying focus as a query param (`goToLodgingCockpit(focus)`), read ONCE into
cockpit state and cleared by `patch()` alongside the stage peek - a param re-read every
render would drag the host back to the same row after every write, which is the opposite of
landing. Two anchors: `#lc-rate-ends` for `'deadline'`, the roster row for a guest id
(string-compared, because an id that survives a URL is text and `5 === '5'` is false).

**A focus may not invent a stage.** It moves the host only when the event is already at or
past `picked`/`booked`; otherwise `Picked` renders "Nothing picked yet" and the link would
have claimed progress the host has not made.

Gated twice, because one gate could not hold it: `lodgingDeepLinkLands.test.js` (8 tests) is
a CROSS-FILE source contract - neither file is wrong alone, the defect is in the seam - and
two e2e cases in `lodgingCockpit.spec.mjs` hold the actual landing. 11/11 in that spec, 70
unit tests green across the attention, deep-link and risk suites.

> ### ⚠ THE TRAP THAT MADE THREE MUTATION CHECKS LIE
>
> `playwright.config.mjs:65` runs `vite preview` against the BUILT bundle in `dist/`, never
> the dev server. Editing source and re-running playwright tests **the old build**. Three
> mutation checks in a row "passed with the defect reintroduced" and all three were
> meaningless. `npx vite build` between the edit and the run, every time - the same rule as
> `feedback_deploy_rebuild_hostv2`, one layer earlier.
>
> Second, smaller trap in the same session: the first version of the e2e asserted
> `toBeInViewport()` at the desktop 1440x900 geometry, where the rate field sits **above**
> the fold anyway. The assertion was free. Measured with a throwaway probe: at 420x520 the
> field lands at `top: 613` with `scrollTop: 0` unfocused, and `top: 266` / `scrollTop: 347`
> focused - and the scroller is the inner `.app`, not the document, which is why a
> `window.scrollY` check would also have proved nothing.

**Still open, deliberately not built:** the per-guest chase. `surfaceRegistry.js:437`
comments that the lodging raise carries NO `key` on purpose - "an aggregate raise about one
shared deadline" - so emitting one raise per un-booked guest **amends a wave-6 ruling** and
is the host's call, not a code edit. The routing now survives the hand-off, so that work is
unblocked whenever it is wanted.

`.claude/launch.json` gained a `hostv2` entry (port 5199); it previously offered only the
frozen CRA shell on :3000.

---

## 1f. Live mode - the checklist was stale, and two data gaps are now closed (2026-08-08)

Chosen by a goals audit that separated OWNER-STATED goals from derived ones. The finding
that drove the day: the review board's rulings have become the de-facto roadmap, while two
things the host actually said are unserved - the attention system (*"my biggest truth
function"*) and the **5-10 paying studios in 60 days** target. Section 5 has no auth, cloud
save, onboarding or upload item anywhere.

**`LIVE_MODE_READINESS.md` opens "Nothing on this list is implemented." That is false, and
was partly false when written.** Full census in `docs/release/2026-08-08_LIVE_MODE_CENSUS.md`
(commit `76046673`). Seven of twelve sections are substantially built. Nothing is missing so
much as SWITCHED OFF - auth keys only populate when `pages-from-source.yml` is dispatched
with `release_profile=live` (`:85`), billing behind `REACT_APP_BILLING_LIVE`.

Four findings the checklist does not name:

- **S1 cites an instrument that cannot answer it.** `npm run check:migrations` makes no
  network call - it is a static guard on which folder may create which table. It passes and
  proves nothing about production migrations. No tool in this repo can answer S1.
- **S6 is the opposite of its reputation.** The checklist calls cloud-save honesty *"most
  likely to be wrong today"*; it is a five-state machine (`syncState.js:53`) with 31 tests.
- **`migrateLocalToCloud` was wired only to the FROZEN shell** - sole caller `App.js:45470`.
- **hostv2 could not delete an event**, per the store guard's own words.

**Both data gaps are now closed** (`9d80953b`, `af196c83`):

| Gap | Fixed by |
|---|---|
| Sign-in pulled cloud->local and never pushed local->cloud | Per-event upload via `saveEvent` (NOT `migrateLocalToCloud`, which returns counts only and leaves no honest way to stamp sync state). Idempotent, filtered by `isRealHostEvent`, toast counts what UPLOADED. **NOT DRIVEN LIVE** - needs a real session; stays OPEN. |
| No delete, anywhere | `deleteThisEvent` + tombstone + two-step confirm that names the event. Driven live twice. |

> ### ⚠ THE DELETE CRASHED THE SHELL, AND THE BUG WAS MONTHS OLD
>
> `base` reads `hydratedEvents` as its THIRD operand while the declaration sat AFTER it - a
> temporal dead zone that never fired because operands one and two always answered: `eventId`
> named a custom event or a sample. **Deleting the current event is the first act in this
> shell that can leave `eventId` naming NEITHER**, and the whole screen went to the error
> boundary with *"Cannot access 'hydratedEvents' before initialization"*.
>
> Invisible in source - the throwing operand is unreachable until the state that reaches it
> can exist. Only driving it found it. Declaration now sits above `base`, held by a one-line
> source-order assertion in `deleteEventLandsSomewhere.test.js`. **If you tidy the session
> state declarations back together, you reintroduce the crash.**

**The tombstone is the point, not the `filter()`.** `cloudDeleteEvent` queues when offline or
signed out, and a queued delete means the row is still in the cloud - so the next `hydrate()`
would pull the deleted event back. Ids release only once the cloud confirms.

**Deploy status: SHIPPED AND VERIFIED IN PROD 2026-08-08.** PR #83 merged as `0d5052c2`
(squash); deploy run `31832191023` succeeded on that SHA. `demo` profile - auth stays off,
which is what a push to main floors to.

**Verified at the CHUNK, with a before AND an after** - the only form of this claim worth
anything, because a green Pages run can ship a stale bundle:

| | Pre | Post |
|---|---|---|
| shell chunk | `HostShellV2-85e3a644.js` | **`HostShellV2-315a4e71.js`** |
| `Safety - plan this first` | 0 | **1** |
| `Worth having a plan for` | 0 | **2** |
| `Keep an eye on it` | 3 | 2 (two inline lookups collapsed to one table) |
| `Worth a look today` | 1 | 1 (untouched, different surface) |

> **TWO MEASUREMENT TRAPS, both of which produced a confident wrong number first.**
>
> 1. **`index.html` never names the shell bundle.** It loads `index-<hash>.js`, which
>    LAZY-IMPORTS `HostShellV2-<hash>.js`. Verifying against `index.html` proves nothing
>    about whether the shell changed. Curl the entry chunk and grep it for the shell chunk.
> 2. **`grep -c` on minified JS counts LINES, not occurrences.** This 873KB bundle is 48
>    lines, so the first counts were "does some line contain it". Use `grep -oF | wc -l`.
>
> And a premise error worth more than either: I predicted the bare `Worth a look` fallbacks
> would go 3 -> 0. They went 3 -> 1. The survivor is **not** the risk fallback - it is
> `confidenceGrammar.js:80`, `ATTENTION: { host: 'Worth a look', ... }`, a different
> subsystem's deliberate vocabulary. The pre-deploy 3 was **2 risk fallbacks + 1 confidence
> grammar label**. Both risk fallbacks are gone. Corroborated independently:
> `riskSeverityCorpus.test.js:123` asserts the SHELL carries no `'Worth a look'` and passes,
> because confidenceGrammar is a lib, not the shell. Do not "fix" that remaining string.

**Still unproven in behaviour:** the sign-in upload shipped in the same merge and is inert
until someone signs in - and auth is off in the `demo` profile. It is gated by a source
contract, never driven. Do not count it as verified.

**CI: the matrix used to run TWICE on every branch push** (`push` + `pull_request` both fired;
the concurrency key was `github.ref`, which differs between the two events, so neither
cancelled the other). Fixed - `push` is main-only and the key is now the branch name. e2e is
~19 minutes, so this was ~38 minutes of runner time per commit. Measured after: one run, not
two. **Also: jest is NOT red at baseline any more** - the handoff note saying so is out of
date, the suite is 387 suites / 5699 tests green, so a red jest is now a real signal.

---

## 2. Gates

### GROUNDING — the number is now TRUE, not better (2026-08-07, latest)

```
541 priced items · 0 unlabelled     (was ~360 unlabelled and invisible)
  cited 8 · consensus 40 · researched 64 · synthesized 504 · partial 1

1.5%  cited across all 541          (the honest number)
8.9%  SETTLED = cited + established-consensus, per claimBasis
1%    of 617 labelled items cited
```

**NO ITEM BECAME BETTER GROUNDED. Zero research was done.** What changed is that
the measurement stopped lying. The old "4% cited" was flattering on three counts,
each pulling a different way: the denominator excluded ~360 unlabelled items; the
audit counted 3 of the 5 statuses `claimBasis` declares (missing 98 `researched`,
2 `partial`); and text-matching attributed provenance from risks and timeline
entries to priced items (132 synthesized in text vs 63 in the objects).

**Two NEW gaps, neither known before, both now gated by a ratchet
(`researchPolicyCompliance.test.js`, frozen at 39/43):**

- **39 of 45** research claims cite a SINGLE source. `RESEARCH_POLICIES.pricing`
  says `corroborationRequired: true` — "always corroborate across >=2 sources".
  One of the 39 is labelled `cited`.
- **43 of 45** carry no date. `freshnessDays: 45` means a price is stale after 45
  days, and `isStaleByPolicy()` cannot evaluate an undated item. An undated
  "researched" price is neither fresh nor stale — it is unfalsifiable, which is
  the one thing a grounded claim must never be. **Dates cannot be back-filled
  honestly** — nobody knows when those items were researched.

**THE ADMIN BACKLOG POINTS AWAY FROM THE WORK.** Full write-up in
`docs/architecture/2026-08-07_GROUNDING_PREDICATE_FINDING.md`. `isGroundedItemQty`
(`quantityProvenance.js:104`) is the sole predicate behind `fieldState`:

```
crabFeast.p_crabs       cited      tier: primary     4 sources -> needs-research
crabFeast.p_softdrinks  researched tier: researched  1 source  -> correctable
```

The best-evidenced item in the product is sent back for research; a single-source
price reads as done.

**NEXT, AND IT IS ONE GOVERNED STEP — do it fresh, not at the end of a session.**
Attempted 2026-08-07 and reverted: it broke 19 suites / 59 tests including
`4 — NO TRUST EXPANSION: grounding outcomes are unchanged`, which is a
deliberate freeze on what the corpus may claim. The prerequisite is now landed
(`costco-pork-2026`, `costco-chicken-2026`, `costco-groundbeef-2026` registered
in COST_SOURCES; universe 113 -> 116), so the remaining change is single and
reviewable:

1. point the cited purchases' `sources` at those ids + `dmv-crab-2026`;
2. make `isGroundedItemQty` use `isGroundedTier` (the canonical ladder) plus
   `>=2` corroboration, NOT a literal `tier === 'researched'`;
3. map `primary` in `TIER_ALIASES` — it is unmapped, which is why first-hand
   dated evidence scores ungrounded;
4. re-baseline `NO TRUST EXPANSION` in the SAME commit with the new outcomes
   stated.

**Do NOT loosen source resolution to a length heuristic.** Tried it; it lets any
12-character string ground a price and breaks `a partially-resolving source list
never grounds`. That is trust expansion wearing the costume of a fix.

Instruments: `npm run grounding:audit` (text, per-playbook worklist) ·
`npm run grounding:census` (objects, true counts). They cross-check at 541 — and
they once AGREED while both being wrong, so agreement is not correctness.

---

### THE MATRIX IS FULLY GREEN - `d3493840` (2026-08-07, latest)

```
Playwright   356 passed /  0 failed / 40 skipped   (16.8m)
Jest         5643 passed / 1 skipped - 380 suites
build        hostv2 + check-parity green
```

40 skipped = 34 + 6 board-capture skips (`_boardCapture.spec.mjs`, env-guarded).

**Shipped since the all-green run**, all driven and gated:
- The 2026-08-07 BOARD SITTING (three panels, render-first, 7/6/7 · 6.0/6.5 · 5/6/4).
  Nine findings taken. The sharpest was theirs, not mine: `styles.css:4478` said outright
  "THE REAL FIX is to move the picker out of the trigger... Board call" — I did exactly
  that four commits earlier and never went back to collect, so the reply chip was still
  rendering 258-311px wide. Now 96px, right edge identical on every row.
- The guest editor moved into a RIGHT PANEL at >=1280 (Mobbin: 5 of 5 leaders do this,
  none expands a row). Measured 1728: roster 1318, cols 958+340, list identical open and
  closed.
- Tier gating on that panel. See the trap below — it is the same one twice in one day.

**Read the two audits before touching the roster:**
`docs/audits/2026-08-07_SPACING_DENSITY_LAYOUT_MOBBIN_READ.md` and
`..._TIER_READ_DENSITY_TYPE_COMMIT_MOTION.md` (~80 screens, three parallel reads). The
second CORRECTS the first on row height, and both correct me.

### Traps earned 2026-08-07, late

- **`[data-rail="1"]` IS NOT `desktop`, AND I SHIPPED THAT TWICE IN ONE DAY.** The
  two-column roster gated on rail-up alone ran from 1024 and gave `280px 340px` — the
  detail panel WIDER than the roster it belongs to, on a sheet offering 640px total.
  UX_03:23 documents this exact misreading *because of the earlier P0 the same session*.
  Any composition rule that needs desktop must test `[data-bp="desktop"]`.
- **A STRUCTURAL CAP MUST BE MATCHED BY STRUCTURE, NOT BY DEPTH.** `:3758` caps
  `.sheet > *` at 820px (the prose measure) and `:3760-3771` exempt the wide things with
  `:has(> X)` — a DIRECT-child test. Wrapping the rows in `.roster` made `.grow` a
  GRANDchild, the exemption silently stopped matching, and the table inherited a prose
  measure. The symptom looks exactly like a grid sizing bug and nothing points at a
  max-width two rules away.
- **WALK THE ANCESTOR CHAIN, DO NOT GREP FOR THE CAP.** I eliminated three candidate rules
  by reading, all three wrong, and committed a revert note saying "nobody knows what caps
  it". One probe reading `maxWidth` off each ancestor found it immediately. Third time in
  one session that reading lost to measuring.
- **DO NOT PIPE A BACKGROUND MATRIX THROUGH `tail`.** The output file then holds only the
  tail, so the failure detail you need is gone.
- **`jest` MUST RUN FROM `demo/`, NOT `demo/hostv2/`.** A compound `cd hostv2 && ...`
  silently produced an empty log and a bare exit 1 twice.

The 355 includes the 12 new `guestReplyPicker.spec.mjs` cases (6 projects x 2). That
suite's own first run WAS the only failure in the 355/1 matrix, at `[landscape]` 860x430,
and it was the SPEC that was wrong, not the surface: it asserted absolute
`getBoundingClientRect().top`, which shifts for every row at once the moment a short
sheet becomes scrollable. Re-measured as heights + inter-row gaps (scroll-invariant) it
is 12/12, and the identical heights prove nothing reflowed. **When a geometry assertion
fails only on the SHORT viewport, suspect the scroll container before the layout.**

The all-green run at `20ee56e2` was 344 / 0 / 34 (16.3m).

First all-green matrix on this branch. Progression across the session:

```
321 passed / 21 failed   baseline, before any of this session's work
335 passed / 10 failed   after the wide-screen layout work
344 passed /  0 failed   after 20ee56e2
```

The last 10 closed together, and **they were never pre-existing** - see the trap below,
which corrects three separate claims made earlier in this same document. One test moved
into `skipped` (33 -> 34) because the spec's own `no Calls to make section on this state`
guard finally gets a chance to fire now that the sheet is reachable. 344 + 34 = 378.

**THE "PRE-EXISTING" CLAIM BELOW WAS WRONG, AND THE METHOD THAT PRODUCED IT WAS WRONG.**
The revert test was real - `styles.css` at `f8ae0a50` did reproduce all 10. But
`f8ae0a50` **already contained `cf0336c09`**, the commit that caused them. Reverting to a
point that still includes the cause proves nothing except that the cause was already
there. `git merge-base --is-ancestor <suspect> <revert-target>` takes one second and
would have caught it. Everything from "LATEST (after the fold-handle...)" down to the
18-failure table is retained as the record of a wrong call, not as current state.

---

**At `bc0429fd` (2026-08-07): Jest 5640 passed / 1 skipped - 379 suites.** hostv2 build
+ `check-parity` green.

**Playwright matrix, re-run at `c2fb53b4` after every change: 325 passed / 18 failed /
35 skipped (16.4m).** Baseline earlier the same session was 321 / 21 / 36. So eleven
commits of change produced **zero regressions**, and closed 3. An earlier attempt than
either is not a result at all - its preview server died mid-run under concurrent load and
returned **exit 0 having run nothing**. Never trust a green exit code from this harness
without a pass count.

LATEST (after the fold-handle and venue work): **14 real failures.**

```
tablet-land  boardMatrix:224/254   decisions sheet + checklist CTA   10   PRE-EXISTING
desktop      boardMatrix:292       fold peek                          3   OPEN
wide         boardMatrix:292       fold peek                          1   OPEN
```

Fold peek was **8**; the handle now renders on real overflow so 4 closed. The remaining 4
are NOT understood - `.has-more` is set (the spec's guard passes) and `.efold` exists, yet
it computes hidden. Do not assume it is the same cause as the four that were fixed.

**BEWARE THE CONTENDED RUN.** One matrix took **27.2m against a normal 16.4m** and
returned 15 failures including four names that had never failed: `ignitionBudget:25`
("warm boot took 10305ms"), `responsiveBaseline:24` and `driftCapture:47`
("Test timeout of 30000ms exceeded"), `lodgingCockpit`. Re-run alone: **75 passed, 0
failed.** All four were load artifacts. A wall-clock much above 16-17m invalidates the
run - check it before reading the failures.

The 18-failure baseline was exactly the pre-existing set, by project:

```
desktop      boardMatrix.spec:292  fold peek        4
wide         boardMatrix.spec:292  fold peek        4
tablet-land  boardMatrix.spec:224  decisions sheet  5
tablet-land  boardMatrix.spec:254  checklist CTA    5
```

**All PRE-EXISTING - reproduced, not inferred.** Method: revert
`styles.css` to `f8ae0a50` (before any of this session's work), rebuild, re-run both
clusters. Same 10 and same 8.

- `tablet-land` decisions-sheet + checklist-CTA: 10, unchanged at `f8ae0a50`.
- `desktop` + `wide` **fold peek**: 8, unchanged at `f8ae0a50`. `boardMatrix.spec:292`
  asserts `.efold-grab` sits in the first viewport; `:287` deliberately hides that handle.
  A `display:none` node keeps its DOM node, so `count()` passes the spec's own skip guard
  and `boundingBox()` then returns null. **The spec and shipped doctrine have contradicted
  each other for some time and nobody saw it, because the matrix had no project above 1280
  until 2026-08-06.** NOT silenced - which one is right is a board call.

Historical, at `0d273115` (2026-08-06):

Jest **5430 passed / 1 skipped** - **358 suites** - `gate:cra` GREEN (242 of 245
baselined) - `gate:hostv2` GREEN (no drift, 14 files, after `sync:hostv2`) -
`gate:knowledge` GREEN - hostv2 build + `check-parity` GREEN. CI on PR #82 green on all
five checks.

**NOT run: the lodging e2e.** Its port (5233) was held by an orphaned `vite preview` that
session did not start, and `playwright.config` sets `reuseExistingServer: false` on purpose -
so a reused server would have tested a STALE bundle. Kill the orphan and run it.

Two gates that had been red for weeks were closed this session:

- **`gate:hostv2`** was red since `aab1db7e`: three commits changed hostv2 source
  without regenerating the artifact `public/hostv2/` serves. A deploy would have
  shipped a bundle predating all three. Prove it by the CHUNK HASH, never index.html.
- **`gate:cra`** was red on two dead symbols in `AdminConsole.jsx` left behind when
  Phase 5D moved the merge inside `exportBase`.

**RESOLVED: `public/hostv2/` is gitignored** (`.gitignore:62`, zero tracked files). It used
to be a committed build artifact rewritten by every hostv2 commit, whose minified bundles
could not be hand-resolved across parallel branches -- the mechanism behind the 2026-07-30
sweep. It is still a real artifact on disk that a deploy serves, so **`npm run sync:hostv2`
before trusting `gate:hostv2`** remains true; what changed is that it no longer conflicts.

Commands that matter:

```
CI=true TZ=UTC npx react-scripts test --watchAll=false     # never bare `npm test` - it hangs
cd backend && python3 -m pytest -q                          # backend is pytest, not npm
npm run gate:cra          npm run gate:hostv2
npm run bake:knowledge    npm run gate:knowledge
npm run grounding:audit   # THE number - re-run every sprint
PATH=/usr/local/opt/node@20/bin:$PATH                       # Node 20 required
```

---

## 3. The one number to watch

```
GROUNDING COVERAGE -- 1.7% cited   (9 of 541 priced)   measured 2026-08-14
  9 cited - 40 consensus - 64 researched - 511 synthesized - 1 partial
  labelled 541 of 541.  SETTLED (cited + consensus) 9.1%
```

Mind the denominator: the figure that matters for host trust is `cited / PRICED`, not
`cited / labelled`. Both are printed by `npm run grounding:audit`.

> **THE INSTRUMENT WAS REPORTING ZERO (fixed 2026-08-14, `b3d39154`).** Every one of the
> 39 corpus files threw `Unexpected token 'export'` inside `grounding:census`, each throw
> printed a SKIP line and continued, and the summary printed `priced items 0 / WITHOUT
> (need labelling) 0` — zeroes in the same shape a clean result takes. It bundles through
> esbuild now and **hard-exits** on an unreadable file or a zero denominator. Do not trust
> a grounding number produced before that commit.

**TWO CLAIMS ABOVE THIS LINE WERE FALSE and are corrected here.** "73% of priced items
carry no provenance block at all" — labelling is **complete**, 541 of 541. And `wedding`
did not have "zero provenance on any of its 7 priced items"; it had 8 synthesized blocks
and now has one cited. The remaining gap is CITATION, which is a different and smaller
job than the one this section used to describe.

**It is still a SUPPLY problem, and still the binding constraint.** Perfect delivery of
an absent citation is still "nobody researched this". But two things learned on the first
real citation change what the work looks like:

1. **Citing can move the NUMBER, not just its provenance.** Wedding favors carried
   `[2, 8]`, matching editorial guidance that names no survey; two named surveys put the
   band at `[1, 5]`. Expect the corpus to be wrong, not merely unsourced.
2. **A price citation could not reach the host until 2026-08-14.** `directCitationEligible`
   resolved ids only against the QUANTITY registry, so a price cited to real market
   sources rendered "Needs confirmation". Fixed to (qty OR cost). Before adding citations
   in bulk, confirm the axis you are citing has a render path — this is the Wire the
   Outlet law, and grounding walked straight into it.

---

## 4. What is true about the architecture

Full measurement: [`2026-07-31_INTELLIGENCE_MEASURED_STATE.md`](./2026-07-31_INTELLIGENCE_MEASURED_STATE.md).
Four things to hold in your head:

1. **~230 intelligence-bearing modules**, 131 in the decision path. The system is big and
   mostly connected -- 12 of 15 planning domains reach a recommendation.
2. **Evidence does not travel.** 13 grounded axes computed per decision, zero consumers.
   1 of the 5 provenance registries checked reaches the host UI (15 unverified).
2b. **CORRECTED 2026-08-03 -- the per-day programme schema EXISTS.** The 2026-07-31
   line "No per-day programme schema / a 5-day Santa Fe arc cannot be authored as days"
   is now false. `itinerary.js` carries `{day, slot, time, title, note, anchor}`, a host
   day/slot editor, and a guest projection reaching the invite + the backend RSVP
   whitelist. What was actually missing was the GATE and the CONTENT: the arc was
   `ev.type === 'Reunion'` and nothing else, so 38 of 39 playbooks returned
   `relevant:false`. The gate is now the SPAN. **The content gap is real and remains**:
   1 of 39 playbooks authors "Day N" agenda rows (teamRetreat), and `activities:` schema
   keys across all 39 playbooks = **0**. The structural arc is deliberately contentless
   and says so in its own provenance.
3. **`phaseProgress.js` emits 47% of all actions.** It carries no evidence envelope.
4. **~14,000 lines are stranded in the frozen CRA** (`orchestration/`, `plan/`, `slices/`)
   -- either port to hostv2 or delete; leaving them is the dishonest option.

---

## 5. Next actions, in order

**0. KILL THE OTHER SESSION FIRST.** Two Claude sessions shared this tree on 2026-08-07
and it cost real time - duplicated work on the tap-target fix and vendor-silence, and one
`git add -A` that swept the other session's in-flight files into an unrelated commit.
Check `git log` and `pgrep -x claude` (compare `lsof -a -p <pid> -d cwd`) before editing
`HostShellV2.jsx` or `styles.css`. **Commit single-file in a shared tree.**

**1. DONE 2026-08-07.** The matrix has now run clean; result and baseline in section 2.

**2. Build the board's unbuilt rulings, in this order** (all from section 1c):
   a. **DONE - `1c163c97`, gated `cb2f1ae7`, driven 2026-08-14.** `.tile-a` is un-hidden
      for the rail composition only; the phone rule at `:909` is untouched. See 1c.
   b. **DONE - Tier 0.6 in `_selectEventNextActionInner`, driven 2026-08-14.** Gated by
      `criticalBlockerLeads.test.js`. It promotes only where BOTH venue readers agree the
      venue is unresolved - the reader split is the open item now, see 1c.
   c. **Collapse the four venue-capture cards to one.**

**3. DONE 2026-08-07** (`43287dd3`, `ffd2db9f`). The fold-peek contradiction is settled by
fixing the PRODUCT, not the test. `.efold` is gated on `.app.has-more` - whether the
scroll container actually overflows - instead of on a width breakpoint, so the handle
appears exactly when it is telling the truth and stays hidden when the page fits. It also
needed an explicit grid cell: the moment it could render it auto-placed into the stat
column, the second time that element has found that orphan. The spec's guard used
`count()`, which a `display:none` node passes; it now skips when nothing is below and
asserts visibility when something is - a stronger contract than before.

**4. DONE 2026-08-07** (`5624ae6e`). The four amendments are written into UX_01, UX_03 and
UX_04 in the board's AMENDED wordings. Two places my originals were wrong and would have
shipped a worse rule: the void budget must bound BOTH axes (the worst void measured was
418px WIDE, and my draft said height only), and the wide tier is `WIDESCREEN = 1536`,
already defined at `viewport.js:31` - my proposed 1600 would have re-stranded the
1440/1536 laptops a previous board ruling explicitly rescued.

**5. Two board calls still untouched:** move the RSVP picker out of its trigger; add an
on-demand detail pane (permanent third pane already refused). Note Ive's dissent: the
detail pane and the stat column are the SAME region, so building the pane collapses two
calls into one.

Then the pre-existing queue below - the grounding-coverage supply problem remains the
binding constraint on the product, and none of the viewport work touched it.


1. **Land #82**, then the two commits after it. All gates green locally.
2. **The room-block half of lodging is still dark** - the biggest open item, and it is a
   RECONNECTION not a build. A review board convened 2026-08-06 (8 seats, full ruling in
   `0d273115`) put this above everything else on this surface: three of four `dest_lodging`
   options are room blocks, and `goToLodgingCockpit` (`HostShellV2.jsx:3176`) navigates away
   from the sheet that held them. The file says so itself at `:10233` - "This sheet is
   unreachable now."
   - **Reconnected in `0d273115`:** the booking code (it was written to `lodging.bookingCode`
     while every engine reads `lodging.code`, so `draftLodgingNote` - the guest note that IS
     the group-lodging deliverable - silently omitted it), and **Group rate ends** →
     `lodging.deadline`, which `travelPlan` turns into the dated obligation.
   - **~~STILL DARK: the backups list, and "Who's booked a room"~~ - RETIRED 2026-08-07,
     DRIVEN.** Both are live in `LodgingCockpit.jsx`, the "On the books" stage - the surface
     `goToLodgingCockpit` actually navigates to. This entry was reading
     `HostShellV2.jsx:11565+`, the sheet the file itself calls unreachable, and calling the
     FEATURE dark because the DEAD COPY of it is. Driven at `?demo=lodging`:
     - **IF THE FIRST ONE FILLS** - "Backup place" + "Farther? Cheaper?". That is the backups list.
     - **WHO'S BOOKED A ROOM** - real roster rows (Ada, Ben), each a button. Clicking Ada
       flipped her to `Booked` and the rollup recounted `2 of 2 still need a room` ->
       `1 of 2`. Survived a reload. So it renders, commits, derives its own count and persists.
     - **WHAT THE GROUP GETS TOLD** - `draftLodgingNote` with booking code NGW28 in the body.

     What is genuinely unbuilt is narrower than "the roster": there is **no cutoff-driven
     chase** - nothing turns "1 of 2 still need a room" plus the group-rate deadline into an
     act aimed at the named person who has not booked. That is the real item. Re-scope it
     before working it; the surface underneath is finished.

     *Method note, same class as the handoff's own stale-claim warning: this was found by
     opening the screen, not by grepping. The line number in a doc points at the code that
     was true when it was written.*
3. **Buttons + CTA language, from the 2026-08-04 Mobbin read** (full sequence in that doc):
   name the **7 bare `done`/`View` labels** (file:line listed; read each call site first --
   do not guess the words), amend **UX_06 to sentence case** (shipped labels run 179 sentence
   to 14 Title, so doctrine is the holdout), kill the **180deg** gradient keeping `#4E6877`
   and `--sheen`, then put the number in the label where it is already in scope.
   Deferred to its own audit: classifying the record-only surfaces tap-to-result (only 2 of
   277 labels say `Mark`/`Record`, which is not plausible -- but it is a flag, not a finding).
4. **DONE - labelling is complete** (541 of 541, verified by the repaired census
   2026-08-14). What remains is CITATION: point the research factory at the zero-cited
   playbooks, `wedding` first (1 of 7 cited now). Still the binding constraint.
   Per item the pricing policy demands >=2 corroborating sources, a `claim`, a
   `sufficientWhen`, and a `lastVerified` stamp - and the source ids must resolve in a
   real registry (`COST_SOURCES` for prices, `QTY_SOURCES` for per-guest quantities) or
   the claim fails closed and reads "Needs confirmation" to the host.
5. **Activity content for the 4 destinations** (Santa Fe, Tulum, Deep Creek, one
   DestWed locale). Now the ONLY thing standing between the multi-day arc and a real
   programme -- the machinery is finished and honest about the hole.
6. **Extend the evidence envelope to ladder + phase actions** (`phaseProgress` = 47%).
7. **Prove or retire the 6 silent registry surfaces**.
8. **Human validation** -- one real event professional in front of the fixtures. Still
   the cheapest item here and the only one that cannot be done in code.

---

## 6. Traps -- do not re-derive these

- **TWO GATES FOR ONE CONCEPT IS THE BUG.** `showsRail()` is width-only and starts at
  **1024**, not 1280 (`isWideBp` includes tablet-land). Every desktop rule in `styles.css`
  is `min-width:1280px AND min-height:700px`. A rule keyed on `[data-rail="1"]` therefore
  reaches 1024, and a rule inside that media query never reaches a 654px-tall laptop.
  **Before writing any composition rule, decide which gate it belongs to and say so.**
  Four separate defects came out of this one split.
- **THE HOST'S MACHINE IS 1280x654, AND THE MATRIX CANNOT SEE IT.** 1280x800 display,
  Chrome inner viewport 654. The matrix runs 1440x900 and 1920x1080 - both pass
  `min-height:700px`. Every desktop defect found this session came from driving the host's
  browser, not from CI. **Add 1280x654 and 1024x768 to the matrix.**
- **852 IS AN IPHONE.** `calc(852px - 64px - 88px)` = 700px, and it was hard-reserved in
  `.hero` at every width. Before theorising about "void", grep the literal numbers in the
  min-heights: a phone frame nailed into a desktop composition looks exactly like a design
  choice and is not one.
- **A COMMENT CAN DESTROY THE RULE IT DOCUMENTS.** CSS HAS NO NESTED COMMENTS. An inner
  `slash-star ... star-slash` inside an explanatory block closes it early, the remaining
  prose is parsed as declarations, and the rule below is silently swallowed. Cost one
  full build cycle on 2026-08-07 - the selector was in the file, grep found it, and it was
  inert. Caught only by the computed box.
- **A LENGTH BOUND MUST BE APPLIED AFTER `trim()`.** `ctaNamesTheAct.test.js` scanned JSX
  button text with `([^<{]{2,60})` and so was **measuring indentation**: an 11-character
  label six levels deep captures 67 characters. Every deeply-nested button in the file was
  invisible to the gate, which is why "Sort it out" shipped green. A gate closes a class
  only if it spans it, and a bound written against clean source does not span real files.
- **PROVE A FAILURE IS PRE-EXISTING BY REPRODUCING IT.** When the matrix comes back red
  after your change, revert the file to the last known commit, rebuild, re-run the failing
  cluster. On 2026-08-07 that turned "21 failures" into "13 mine, 8 not" and then into
  "all 21 pre-existing" after the 13 were fixed. Never argue it from reading.
- **...AND THE REVERT TARGET MUST PREDATE THE SUSPECT, WHICH IS NOT THE SAME AS BEING
  OLD.** The corollary that cost the most on 2026-08-07. Ten tablet-land failures were
  called pre-existing three times in this document on the strength of a revert of
  `styles.css` to `f8ae0a50` that reproduced all ten. `f8ae0a50` **already contained**
  `cf0336c09`, the commit that caused them. A revert to a point that still includes the
  cause reproduces the bug perfectly and proves nothing. **Run
  `git merge-base --is-ancestor <suspect> <revert-target>` before believing your own
  revert test** - it is one second, and "reproduced at an earlier commit" is worthless
  until you know what that commit contained. The tell was there the whole time: the
  Playwright log named the intercepting element (`srail-t intercepts pointer events`) in
  every one of the ten, and that was read as noise for hours because the conclusion was
  already filed. **A failure with a named mechanism in the log has never earned the label
  "pre-existing" - it has earned five minutes of measurement.**
- **`left` IS A CENTRE ANCHOR WHEREVER `translate(-50%,-50%)` IS IN PLAY.** Sheets are
  edge-to-edge on the phone and at >=1280, but between 640 and 1279 at >=700 tall they are
  the centred floating panel (`styles.css:3174`). A later rule that sets `left` on `.sheet`
  without knowing which idiom is live will silently move the panel by half its own width:
  `left:220px` rendered at `l:-119` with `w:680`, half off-screen and the rest under the
  rail. **Grep for a `transform` on any element before writing its `left`,** and scope the
  rule to the same media query the idiom uses.
- **A `const` USED ABOVE ITS DECLARATION FAILS SILENTLY AND LOOKS LIKE A LAYOUT BUG.**
  Twice on 2026-08-07. Naming a below-declared const in an effect's dependency array is
  the obvious form; the dangerous form is inside an EXPRESSION, where nothing warns you.
  Two flags placed at ~:987 that read `queue` (:2661), `askMode` (:2741), `show` (:2990)
  and `wiredKind` (:4596) threw at render, took the WHOLE component down, and presented as
  "the probe found zero venue inputs" - indistinguishable from a guard that hid one too
  many. **If a UI element vanishes entirely after a small change, suspect a render throw
  before you suspect your selector.**
- **THE HERO IS `queue.filter(show)[0]`, NEVER `queue[0]`.** `shown = queue.filter(show)`
  is an order-preserving FILTER, so position 0 of the two lists differ whenever the first
  queued action is lensed out. This repo has already shipped one bug from reading position
  0 of the wrong list.
- **A TEST AND THE CODE UNDER TEST MUST NOT BOTH COMPUTE THE SAME BORDERLINE PREDICATE.**
  They will eventually disagree and it will look like flake. The fold-peek spec measured
  `scrollHeight - clientHeight > 24` while the shell measured the same thing a beat
  earlier: run alone the page did not overflow and every case SKIPPED; run under load it
  did, so the spec demanded a control the shell had already declined. One of them has to
  be the authority - the product's own flag is.
- **ISOLATION LIES, AND SO DOES ONE VIEWPORT.** `-g "fold peek"` returned green twice
  while the full matrix failed the same eight. And a fix verified only in the host's
  1280x654 Chrome looked complete while it was broken at 1440 and 1920 - because the
  duplicate rule that was breaking them sits inside a `min-height:700px` media query that
  654 cannot reach. Solo greens and single-viewport drives are evidence, never proof.
- **A CSS RULE THAT MATCHES NOTHING IS INDISTINGUISHABLE FROM ONE THAT WORKS.** Five
  times in one day (2026-08-07): `68ch`, `> .app .sheet` (`.sheet` is a direct child of
  `.stagewrap`, not inside `.app`), a `.ghead` rule with no markup, four uncapped-row
  selectors, and the `.seclist`/`.statcard` names already recorded at :3517. **Read the
  computed box, never the selector.** `getBoundingClientRect()` and `getComputedStyle`
  are the only evidence.
- **INLINE STYLES BEAT THE STYLESHEET, and this shell is full of them.** Three in one
  row: the guest row button's `display:block`, the metadata span's `gap:6`, and the
  reply control's flex. Each needed `!important` and each was found by measuring, not
  reading. If a rule "should" apply and the box disagrees, suspect an inline style first.
- **`min-width:auto` floors a flex item at its MIN-CONTENT.** The reply chip reported
  `flex: 0 0 96px` AND `width: 320px` simultaneously, which looks impossible. It is not:
  the trigger button contains the inline RSVP picker, so its min-content is ~320px and
  the basis was legally overridden. Nothing was fighting the rule; the rule was never
  allowed to win.
- **`--responsive-command` / `--responsive-data` are SURFACE IDENTITY, NOT BREAKPOINTS.**
  Those classes are on the stagewrap at 393px too. A rule written for the data tier and
  left outside a media query WILL hit the phone - it gave a 353px phone row 88px/132px
  fixed metadata tracks. Gate on `[data-rail="1"]` or a media query, always.
- **A percentage cannot be a shared column track.** `24%` of the row button drifted the
  metadata tracks 8px, because the button's width changes per row with the reply chip
  beside it ("Yes" 43px vs "No reply" ~75px). Use `vw` or a fixed length.
- **`E2E_BASE=1` is required for `vite preview`** or the asset base does not match and
  NOTHING mounts - the page renders an empty `#root` and looks like a crashed app. The
  playwright config sets it; a hand-started preview must too.
- **Kill orphaned `vite preview` processes before an e2e run.** Port 5233 with
  `strictPort` + `reuseExistingServer:false` means an orphan blocks the run, and a reused
  one would test a STALE bundle. Two orphans were found on 2026-08-07.
- **Never rebuild `dist` while playwright is running against it** - the preview serves
  that directory, so the run silently tests a half-swapped bundle. One full matrix run
  was invalidated this way and had to be killed.

- **Bare `npm test` HANGS** (watch mode). Always `CI=true`. Backend is **pytest**;
  `demo/backend` has no `package.json`.
- **Node 20 at `/usr/local/opt/node@20/bin`**. `/usr/local/bin/node` v18 has a broken
  esbuild arch.
- **`review-artifacts/` is gitignored** (`.gitignore:26`). Working papers there are
  local-only -- durable findings belong in `docs/architecture/`.
- **Game Night / repast are the HOST'S OWN events** (`gn`, `rp` in `ngw-events` +
  `ngw-hostv2-patch-<id>`), not the `test-*` seeds. `ev-x-repast` has a hardcoded past
  date and renders a recap.
- **Chrome cannot reach 390px by window resize** (~614 min measured 2026-08-03). Use
  **`npm run device -- mobile|tablet|desktop [--dev]`** (hostv2/) -- real device
  profiles, WebKit, touch, safe-area; `--dev` points it at the dev server so it shows
  live source. It also prints WHICH composition the shell chose. Playwright's WebKit is
  a separate download; it was missing on this machine, which is why `npm run device`
  looked broken for weeks.
- **The app picks its SHAPE from the window, not from any demo setting.** At >=1280x700
  `.stagewrap` is a fixed 393x852 phone silhouette -- EXCEPT the command and food
  surfaces, which opt out into a real desktop canvas. So a laptop window can never show
  you the phone. Reported three times as "the demo is not mobile"; nothing was broken.
- **A 1280-wide canvas whose height tracks the viewport goes SQUARE on a tall display**
  (1280x1170 at 1230px tall). Height is capped so it keeps a landscape aspect.
- **A JSX comment directly after `return (` breaks the build** -- put it above the return.
- **hostv2-drift**: rebuild with `npm run sync:hostv2` (Node 20) before trusting the gate.
- **Never claim absent/dead/disconnected from one probe.** Four such claims were wrong or
  imprecise in the 2026-07-31 audit. Close the search space first.
- **A pasted page is not a DOM.** Building a parser against markup (hrefs, `aria-label`,
  anchor counts) assumes the clipboard carried it; a plain-text copy carries none of it.
  Match on VISIBLE TEXT where the discrimination has to hold. Three markup discriminators
  for "is this a results list or one hotel" were measured live and all three failed - `/aclk`
  counts (9 vs 67, both pages have them), "exactly one non-Google anchor" (the detail page
  has 27), and entity hrefs.
- **One field, two meanings, is this repo's recurring defect.** Three instances landed in a
  single day 2026-08-06: `occupancy` (bed count) read as guest capacity, the Hotels door's
  dates read as carried when Google dropped them, and a hotel's NIGHTLY rate stored as a stay
  total then split across the party. Each wore `sources: 'read'`. When a value arrives from a
  platform, establish what the platform MEANS by it before storing it - a field that returns
  a plausible number is not the same as a field that means what you assumed.
- **Choosing is not booking, on every surface.** `lodgingIsHeld` is the one predicate;
  `phaseProgress` had its own looser copy (bare `hotelName`) and marked a mere PICK as a held
  room. Gated by `lodgingHeldNotPicked.test.js` from both ends.
- **Every number ships with its command.** Proof ledger:
  `review-artifacts/2026-07-31-intelligence-audits/12-PROOF-LEDGER.md`. If a figure is not
  in the ledger, it is unproven -- say so.

---

## 7. Session update protocol

At the end of every session, update **this file only** (not a new dated one):
branch/HEAD, gate numbers, the grounding number if it moved, what shipped, and the next
action. If a dated snapshot is genuinely needed for history, write it separately and link
it from section 1 -- but this file stays the single current source.
