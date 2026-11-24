# Cohesion audit: hostv2 host shell (live), 18 rules × 5 viewports

- **Target:** https://twillis45.github.io/ngw-event-planner/hostv2/?noanalytics=1&elegant=1 (live as of November 24, 2026; Settings footer reads `Version 2026.11.24.3 (e2b431f)`).
- **Source for file:line:** `/home/user/wt-board/hostv2/src` plus the shared `/home/user/wt-board/src/lib` (main at `78c1e8c1`). All paths below are relative to `/home/user/wt-board/`.
- **Method:** Playwright (Chromium 1.63, dsf 1). Touch viewports used `hasTouch` and `isMobile`. A route guard aborted every non-GET request; it blocked Sentry envelopes and Cloudflare challenge POSTs and nothing else. `navigator.share`, the clipboard and `window.open` were stubbed. Nothing outward was pressed. The only local presses were: open a section, open a vendor card, "Draft note", "Draft the trip details", the What's counted caret, typing into Create (not submitted), and one "Handled — stop showing this" on a risk, to read its Undo.
- **Seed:** the built-in sample **Wanda's 50th & 30-Year Army Retirement** (`ev-x-wanda`), which has vendors, budget, seating, run of show and lodging. Splash and welcome flags were set as in `e2e/fixtures.mjs`. The trip draft used a made-up custom Group Trip ("Lakeside Weekend", Springfield, VA), seeded like `e2e/tripDetailsFixture.mjs`. The Day used `page.clock.setFixedTime('2027-03-20T17:00')` and After used `2027-03-22T11:00`. The guest-facing pages were rendered from mocked GET responses: family from `e2e/wandaFamilyPlan.json`, and helper and vendor-brief pages from made-up fixtures (42 Elm Ct, Springfield, VA 22150).
- **Viewports:** phone 390×844 · ipad11 834×1194 · ipad13 1024×1366 (tall-iPad rail board) · ipadland 1194×834 · desktop 1440×900.
- **Evidence:** `<screen>__<viewport>.png` in this folder. These are full-length captures, stitched from the scroll container (frames in `frames/`). Measurements are in `data/<screen>__<viewport>.json`; motion data is in `data/motion_*.json`; extra states are in `extra_*.png`. Scripts are in `scripts/` (`run.js`, `lib.js`, `stitch.py`, `probe*.js`, `pix.py`).
- **Captured:** 27 screens × 5 viewports = 135 screenshots. Every listed section was reached at every viewport. Create typed failed on the first pass because of a locator error, and the rerun succeeded at all five viewports.

## In flight: not scored

Skipped by instruction: the Guests sheet's guest row editor and its Share & invite card, the invite page, the "Your invite" panel, the food shopping rows (The spread & shopping), and the invite, nudge, update and details draft sheets. The **RSVP thank-you** page is part of the invite flow, so rule 15 was not checked there. The **Guests & invite** and **The spread & shopping** sheets were not opened.

## Caveats (read before acting)

- **Contrast:** the DOM probe walks computed backgrounds. Where an ancestor has a gradient or image it is marked "unsure". Every "unsure" flag that mattered was **re-measured on screenshot pixels** (`scripts/pix.py`):
  - Board Where you stand labels: 6.48:1 and 7.55:1.
  - The "$220 over" chip: 12.94:1.
  - The Day "final run-through" eyebrow: 6.84:1. Its rows: 7.25:1.
  - All of these **pass**, so they are not listed as findings. The firm failures are the ones listed under rule 9.
- **Tap floor:** uses the hit-area walk from `e2e/everyTapIsFortyFourSquare.spec.mjs`, capped at 121 px, so "121×35" means the 35 px height is the failure. Desktop tap results are informational only (UX_03 scopes the 44 px floor to touch).
- **Event-day landing:** the Wanda sample lands on **Plan** on its event day (`aria-current` = Plan at 5 PM, March 20). `landingStage` (HostShellV2.jsx:1208) applies the "opens on The Day" rule only to a host's *own* plan, so this is expected for a sample. It was **not verified on an own event**.
- **Family page:** it renders the e2e fixture, not a live server projection. Its count mismatches (#35) need confirming against the real `family_projection()`.

---

## 1. Ranked table

P1 = host confusion or a wrong action is likely · P2 = clear inconsistency · P3 = polish. Fix size: S, M or L. "All" = all five viewports.

| # | Screen | Viewport(s) | Rule | What's wrong | Sev | Size | Evidence | file:line |
|---|---|---|---|---|---|---|---|---|
| 1 | The Day | all | 13 | Heading "Still open from planning · not today's job" sits over cards tagged **"due today"**, "5 things need you today" and "Reconfirm 3 vendors · due today". | P1 | S | day__phone.png | hostv2/src/HostShellV2.jsx:13446 |
| 2 | The Day | all | 1 | Day-of screen has **no lit action** (lit=0 measured). It shows six equal-weight "See all N" buttons plus "Run the day", "Open your guest list", "Mark done", "Draft the details" and "Draft a reconfirm for each". | P1 | M | day__phone.png, data/day__*.json | HostShellV2.jsx:13178, 13524 |
| 3 | The Day | all | 4 | Engine copy on the day-of hero: "Planning this as retirement party + birthday (compound event, requires merging)."; "Overdue by 28 days. Open decisions block timeline, vendor, and approval progress downstream."; and a broken template, `Resolve "Set up a shared photo/notes drop (link or email) and ask coworkers + family for ".` | P1 | S | day__phone.png | src/lib/eventIdentityEngine.js:355; src/lib/surfaceRegistry.js:108; the "downstream" sentence matches src/CommandCenter.jsx:3488 (hostv2 source not located) |
| 4 | Board ↔ The Day | all | 12 | Shopping count disagrees: board says "Open the spread (**31** items)" and The Day says "**37** items still to get (17 food + 20 supplies)". | P1 | M | board__phone.png, day__phone.png | HostShellV2.jsx:7903 vs 14612 |
| 5 | Your money | all | 12 | One card shows two different "left" figures: "**$4,380 left to spend**" and "**$3,410** of $5,000 not yet spoken for". moneyFigures.js:37 says headroom is never called "left to spend". | P1 | S | money__phone.png | HostShellV2.jsx:27704; src/lib/moneyFigures.js:37 |
| 6 | Who sits where + board | all | 12 | Claims "17 of 17 · Everyone's in a seat", and the board shows a green "Seating · Everyone has a seat", on a 75-guest plan with 9 named rows. The "handled" claim is not true. | P1 | M | seating__phone.png, board-whatscounted__phone.png | HostShellV2.jsx:20848; src/lib/positiveAttention.js:74 |
| 7 | Vendor detail | all | 3 | **"Remove from this event"** sits mid-card, between the name/phone/email fields and "your contact there". It is not alone at the bottom. Undo comes from patchEvent's toast. | P1 | S | vendor-detail__phone.png | HostShellV2.jsx:26961–26966 |
| 8 | Vendor detail | all | 2 | An opened vendor is an unlabeled pile of about 30 controls with no group labels. It has placeholder-only fields ("email", "your contact there"), status pills, a sign-in box, time and money fields, "Is this a surprise?", three "Mark proof on file" buttons, "Not needed", "Attach file" and four action buttons. | P1 | L | vendor-detail__phone.png | HostShellV2.jsx:26953–27430 |
| 9 | Vendor detail | phone (16 px), all iPads (35 px) | 9 | Status pills "DECIDING / GOT A PRICE / AGREED / DEPOSIT PAID / LOCKED IN" measure **80×16 and 97×16 on phone** and 35 px tall on iPad. They sit side by side, so a wrong status is likely. | P1 | S | data/vendor-detail__phone.json | `.vc-pill` in the vendor card, HostShellV2.jsx:~26900 |
| 10 | Your checklist | all | 1, 2 | 41 steps in **one unlabeled list**, each with 2–3 equal-weight buttons (~90 buttons). The phone capture is 10,119 px tall, with no phase groups and no lit next step. | P1 | L | checklist__phone.png | HostShellV2.jsx:23594–23636 |
| 11 | After | all | 1 | **Three lit primaries** measured: "Save it", "Publish the recap" and "Draft the thank-you". | P1 | S | after__phone.png, data/after__*.json | HostShellV2.jsx:17287, 17299 |
| 12 | After | all | 6, 7 | A per-guest **"thank them"** button only flips a flag and toasts "thanked — the wrap-up meter keeps count". It reads like it sends a thank-you. | P1 | S | after__phone.png | HostShellV2.jsx:17166–17168 |
| 13 | Board | phone | 2 | The "4 of 7 handled · What's counted ›" caret at y=140 opens a panel at y=1,686 and scrolls there; the caret ends at y=−1,358. Nothing opens in place, and there is no close near the panel. | P2 | M | extra_whatscounted-open__phone.png, board-whatscounted__phone.png | HostShellV2.jsx:12859–12862, 15419 |
| 14 | Board | all | 1 | No lit primary at any viewport (lit=0); the hero is a choice card ("Our pick"). | P2 | S | board__*.png | hero block; e2e/oneLitButtonOnTheBoard.spec.mjs allows 0 |
| 15 | Board, Calls, desktop | all; NEXT pill on desktop | 8, 11 | One decision has three names and three doors: hero "Make the food call." / "How is the food handled?", the Calls to make row "How is the food handled?", and the desktop NEXT pill "Decide what you're serving · 1 open". | P2 | S | board__desktop.png, calls__phone.png | src/lib/phaseProgress.js:279 |
| 16 | Board | desktop | layout | "Worth having a plan for" renders in a narrow column that starts mid-stage (x≈675). This leaves a ~400 px empty band on the left, out of line with the hero column (x=273). | P2 | M | extra_board-worth__desktop.png, board__desktop.png | board lower-zone grid (styles.css) |
| 17 | Board | ipadland | layout | The event name is demoted into a single uppercase eyebrow, "116 DAYS · WANDA'S 50TH & 30-YEAR ARMY RETIREMENT — BLACK & GOLD · …", with no title heading. | P2 | S | board__ipadland.png | tablet-land header |
| 18 | Space, seats & helpers | all | 11, 8 | The sheet has its own **date editor** ("Dates · Sat, Mar 20 · Change") and **table-count ± stepper**. These duplicate Date & time and Who sits where (which has its own ±). | P2 | M | space__phone.png, seating__phone.png | HostShellV2.jsx:18138 area |
| 19 | Space, seats & helpers | all | 12 | "Who's helping · **3**" heads a list of **6** helper rows; the board says "Helpers 0 of 6". | P2 | S | space__phone.png | HostShellV2.jsx:18479 |
| 20 | Your money | all | 12 | "**4** vendors are still unpriced". The vendor list shows 2 paid vendors without a price; the other 2 are unpaid helpers. | P2 | S | money__phone.png, vendors__phone.png | src/lib/budgetCopy.js:37 |
| 21 | Vendors / board / Day | all | 12 | Three vendor tallies: "Booked so far 3 of 7", "Vendors 1 of 7 confirmed · 3 booked", and "6 people to lock in · 6 of 9 still need a confirm". | P2 | M | vendors__phone.png, board__phone.png, day__phone.png | src/lib/vendorIntelligence.js, phaseProgress.js |
| 22 | People you're hiring | all | 1 | No lit action on the sheet. An opened card ends in four equal buttons: Draft note / Payment note / Call / Send … the details. | P2 | S | vendor-detail__phone.png | HostShellV2.jsx:27407–27425 |
| 23 | People you're hiring | all | 4 | Engine strings (see the jargon list under §2): "Contact channels available.", "Payment state not tracked yet.", "Closeout activates after the event.", "5 of 6 checks passing · 1 not tracked yet (closeout).", "the vendor's own brief covers the rest", "high-ROI host sanity", "National baseline", "Download the vendor list (CSV)". | P2 | S | vendor-detail__phone.png | src/lib/vendorIntelligence.js:400, 449, 487, 592; HostShellV2.jsx:27181, 27566; src/lib/playbooks/data/retirementParty.js:249 |
| 24 | Vendor send ↔ vendor page | all | 8, 4 | One destination, two names. The host presses "Send Semper Catering Co. the details". The page says "VENDOR BRIEF", "Copy the brief", "Print the brief". The toast says "Your free brief went to your first vendor", and Create says "sharing one vendor brief". | P2 | S | guest-vendorbrief__phone.png, create-typed__phone.png | HostShellV2.jsx:27424, 4875; hostv2/src/VendorBriefV2.jsx |
| 25 | What could go wrong | all | 4 | Consultant copy: "Guest expectations for ceremony vs. celebration formality will diverge if not clarified early." and "Clarity on timing cascades to reduce all downstream friction." | P2 | S | risks__phone.png | not located by grep (composed risk copy) |
| 26 | What could go wrong | all | 1 | Eight cards with two equal buttons each, and the order flips ("Add to my checklist" vs "Plan for this" first). Undo on "Handled" works (toast "Noted — that one stops surfacing. Undo"). | P2 | S | risks__phone.png, extra_risk-handled__phone.png | risks sheet |
| 27 | Messages | all | 6, 14 | "Below is only what this device recorded." with nothing below and no empty-state line. The sheet is a dead end. | P2 | S | messages__phone.png | src/lib/messageTimeline.js:34 |
| 28 | Travel & where everyone stays | all | 6, 1 | Guest names are link-blue bold but have no handler (probe: handler=false). The sheet has no action at all: you cannot add or edit a stay. The address is shown twice. | P2 | M | lodging__phone.png | lodging sheet (HostShellV2.jsx, `sheet.kind === 'lodging'`) |
| 29 | After | all | 8 | Three doors to thank-yous (per-row "thank them", "Draft the thank-you", "Start the thank-you run"), and "Write the recap" sits beside "Publish the recap". | P2 | S | after__phone.png | HostShellV2.jsx:17299–17303 |
| 30 | After | all | 7 | "Publish the recap" puts text on every guest's invite link in one tap, with no preview of what guests will see. The toast is the only record. | P2 | M | after__phone.png | HostShellV2.jsx:17286–17290 |
| 31 | Reconfirm sweep (code) | n/a | 7 | Per vendor, a "Text them" `sms:` link and a "Copy" button come **before** "Read it first", and there is no "Mark it sent" record. Read from code; not pressed. | P2 | S | (code) | HostShellV2.jsx:22380–22382 |
| 32 | Split / settle-up (code) | n/a | 7, 10 | "Copy the settle-up ask" copies silently: no confirm line and no record. | P2 | S | (code) | HostShellV2.jsx:20169 |
| 33 | Your checklist | all | 11 | The host is asked to tell or confirm herself: "Wanda — not told yet" and "Mark Wanda confirmed", where Wanda is the host. | P2 | S | checklist__phone.png | HostShellV2.jsx:23594 |
| 34 | After | all | 4 | "4 foundation facts on record" and "'Thanked' feeds the wrap-up meter up top". No meter is visible on After. | P2 | S | after__phone.png | HostShellV2.jsx:17141, 17205 |
| 35 | Family page (guest-facing) | all | 12, 15 | Says "6 said yes · 1 maybe · 1 haven't answered" and "Checklist · 1 of 4 ticked off". The host board says "7 yes, 1 maybe" and the checklist says "2 of 41". This is fixture data; confirm on the server projection. | P2 | M | guest-family__phone.png | hostv2/src/FamilyViewV2.jsx |
| 36 | People you're hiring | phone | 9, layout | Vendor names are truncated ("Semper Catering…", "VFW Post 1847 —…") by the price and pill. The filter chip "Helping, not hired" runs past the right edge (483 > 390, clipped inside the scroller). | P2 | S | vendors__phone.png | vendor card header |
| 37 | Space, seats & helpers | all | 16 | Rental price ranges ("Rent chairs $150–$300", "Rent tables $80–$120") carry no source tag (est., cited or yours), unlike Money's "Vendor record / Budget entry / Estimated". | P2 | S | space__phone.png | HostShellV2.jsx fstat "What to bring" rows |
| 38 | Board, What's counted pills | all touch | 9 | The "Calls to make / People / Checklist" pills are 35 px tall (121×35). | P2 | S | data/board-whatscounted__phone.json | `.pill` in #whats-counted |
| 39 | You & settings | all touch | 9 | The marketing-email checkbox hit area is **13×14**. | P2 | S | data/settings__phone.json | settings account block, HostShellV2.jsx:~2655 |
| 40 | Board + The Day | phone, desktop | 2, 5 | "Who's confirmed" ends in a 12-item run-on sentence ("Still waiting: Semper Catering Co., Gold Standard …"). iPad 13 shows the same data as a proper list with chevrons. | P2 | M | board__phone.png, board__ipad13.png | Who's-confirmed block |
| 41 | You & settings | all | 2 | Name and area fields are placeholder-only labels, and the name placeholder truncates ("Your name — it signs every note we dra…"). | P2 | S | settings__phone.png | settings "You" block |
| 42 | The Day | all | 9 | Card index numerals measure 3.40:1 (38 px, decorative). | P3 | S | day__phone.png | `.idx` |
| 43 | Venue / After / Meaning / trip board | all | 9 | Disabled CTAs ("Save", "Save it", "Publish the recap") read 2.5–2.7:1 (pixel-measured). WCAG exempts disabled controls, but rule 9 does not. | P3 | S | venue__phone.png, after__phone.png | `.cta[disabled]` opacity .45 |
| 44 | Guest pages | all | 9 | The "No Guesswork Events" wordmark reads 3.55–4.24:1 at 12 px. | P3 | S | guest-*__phone.png | inv2-wordmark |
| 45 | Desktop sheets | desktop | 9 (info) | Pointer-sized controls below 44 px on desktop: money rows 20 px, chips 32 px, table rows 43 px, vendor pills 23 px. Informational only. | P3 | S | data/*__desktop.json | n/a |
| 46 | Rail + sheet header | ipad13, ipadland, desktop | 8 | Three doors to the same list: the ☰ menu and the rail, plus a "‹ Sections" back link on every sheet. | P3 | S | money__desktop.png | sheet header |
| 47 | Rail | ipad13, ipadland, desktop | 4 | The rail's first row reads "Narrow", which is ambiguous; its aria label is "Narrow the menu". | P3 | S | board__ipad13.png | HostShellV2.jsx:11670 |
| 48 | Board right rail | ipadland, desktop | 4 | "Active planning · 4 of 7 handled — Your plan is moving. food and vendors, plus 1 more still need you." uses a status-engine label and a lowercase sentence start. | P3 | S | board__desktop.png | src/lib/eventOrientation.js:28 |
| 49 | Create (typed) | all | 4, 6 | The pricing note says "sharing one vendor brief". The recognized "42 Elm Ct" chip looks pressable but has no handler. There are two worked examples (the placeholder plus "Like …"). | P3 | S | create-typed__phone.png | creation screen |
| 50 | You & settings | all | 4 | "One account, both apps", "On — tap to mute", and a hero "Nothing remembered yet" on a settings screen. | P3 | S | settings__phone.png | HostShellV2.jsx:2661, 22424, 22434 |
| 51 | Your money | all | 4 | "Expected costs — includes allocations and estimates"; "Budget entry". | P3 | S | money__phone.png | src/lib/budgetRecovery.js:284; HostShellV2.jsx:27891 |
| 52 | Make it yours | all | 4 | "The day-before brief, the run of show, and the toast draw from your words." | P3 | S | meaning__phone.png | meaning sheet intro |
| 53 | Date change / restore | n/a | 18 | A native `window.confirm` guards the date change, which says itself "Nothing is deleted" and is undoable via patchEvent. Restore-from-copy also uses a native confirm (unstyled). | P3 | S | (code) | HostShellV2.jsx:10166, 22585 |
| 54 | The Day, board | phone, ipad11, ipad13 | 17 | 2–3 `strataFocus` animations run together (tiles plus the day node). None loop forever. Reduced motion is honored (0 running). | P3 | S | data/motion_*.json | strataFocus keyframes (styles.css) |
| 55 | Vendor brief page | all | 15 | App marketing on a host-sent page: "Hosting something of your own? Plan it free with No Guesswork Events →". | P3 | S | guest-vendorbrief__phone.png | hostv2/src/VendorBriefV2.jsx:256 |
| 56 | Split the costs | all | 3 | The per-person "Remove" also drops what that person paid. The visible label doesn't say so (the aria label and toast do). | P3 | S | split (code) | hostv2/src/CostSplitSheet.jsx:39–42, 95 |
| 57 | Trip board | all | 1, 6 | The venue card has three equal buttons plus Save. "Tip: press and hold the name to rename it" is a hidden gesture. | P3 | S | trip-board__phone.png | HostShellV2.jsx:4119 |
| 58 | Lodging door | all | 8 | The door "Travel & where everyone stays" opens a sheet titled "Where everyone stays". | P3 | S | lodging__phone.png | src/lib/sectionDirectory.js:112 vs HostShellV2.jsx:17351 |
| 59 | Calls to make | all | 4 | "How to recognize the spouse / Family?"; "Pin to top" and "Why this call matters" sit beside the pick. | P3 | S | calls__phone.png | HostShellV2.jsx:17744 |
| 60 | What could go wrong | all | 16 | Quantities with no stated basis: "~1.5 lb ice/guest", "~1–1.25 servings/guest", "~2–3 min". | P3 | S | risks__phone.png | playbook risk data |
| 61 | Vendor detail | all | 13 | "Quoted — needs decision before booking." repeats four times on one card. | P3 | S | vendor-detail__phone.png | src/lib/vendorIntelligence.js |
| 62 | Your money | desktop | layout | The summary card is 820 px wide beside a 1,130 px list, leaving an empty band on the right. | P3 | S | money__desktop.png | money sheet layout |

**Counts:** 62 findings: **P1 12 · P2 29 · P3 21**.

### Rules that passed or had nothing to flag

- **Rule 5:** finished groups fold.
  - Checklist: "1 done — the plan has them ›".
  - Calls to make: "✓ Settled · all 6 decided".
  - Vendors: "2 settled — nothing owed ›".
- **Rule 7:** the vendor and trip draft sheets each have one lit **Share…** and a "Mark it sent — I sent it myself" record.
- **Rule 14:** signing in never blocks.
  - The trip board shows "Not saved yet. Sign in to save" with a ×.
  - The calendar, vendor-log and sign-in boxes are optional.
- **Rule 17:** reduced motion is honored everywhere.
- **Rule 18:** "Handled — stop showing this" offers Undo.
- **Rule 15:** the helper page speaks for the host ("From Casey Morgan … is counting on you for"). The family page says "Guest names, contact details and money aren't shared here", and the surprise singer is absent from its run of show.
- **Rule 9 at 390 px:** no sideways page scroll anywhere; no text under 11 px; no input under 16 px on any screen.

---

## 2. Per-screen summary

- **Board (Plan):**
  - The hero, progress line and Where you stand read cleanly at every viewport, and contrast passes on pixels.
  - There is no lit primary.
  - Phone's "What's counted" jumps 1.5k px away (#13).
  - The food decision has three names (#15).
  - Desktop's lower zone floats in a mid-stage column (#16), and iPad landscape loses the title (#17).
  - Phone and desktop print "Who's confirmed" as a run-on paragraph (#40).
- **The Day:**
  - The worst screen: a header that says "not today's job" over "due today" cards (#1), no lit action among about 10 equal buttons (#2), and engine and broken-template copy on the hero (#3).
  - Shopping is 37 here and 31 on the board (#4).
- **After:**
  - Three lit buttons (#11), "thank them" that only toggles (#12), three doors to thank-yous (#29), one-tap publish to guests (#30), and "foundation facts" / "wrap-up meter" (#34).
- **Create (blank, typed):**
  - Clean, and one field. Recognition chips work. Minor: "vendor brief" and a chip that looks pressable (#49).
- **Venue:**
  - Simple, with one lit Save (disabled-dim, #43). Nothing else flagged.
- **People you're hiring (list):**
  - Good fold for settled vendors.
  - No lit action, names truncated on phone (#36), engine strings (#23), and three vendor tallies that disagree (#21).
- **Vendor detail:**
  - An unlabeled pile of about 30 controls (#8), "Remove" mid-card (#7), and 16 px status pills on phone (#9).
- **Your money:**
  - Good source tags on lines.
  - But two "left" figures on one card (#5), "4 unpriced" doesn't match the vendor list (#20), and "allocations" (#51).
- **Space, seats & helpers:**
  - Duplicate date and table editors (#18), helper count 3 vs 6 (#19), and unsourced rental ranges (#37).
- **Who sits where:**
  - Tidy table list with routing chevrons.
  - Its "17 of 17 · everyone's in a seat" over-claims on a 75-guest plan (#6).
- **Your checklist:**
  - 41 ungrouped steps with about 90 equal buttons (#10).
  - Asks the host to confirm herself (#33).
  - Done steps fold correctly.
- **Calendar:**
  - Clean; week view is honest ("Nothing due"). The sign-in box is optional. No findings.
- **Calls to make:**
  - Good fold of settled calls.
  - Odd copy and side buttons (#59). The food call is duplicated with the board hero (#15).
- **What could go wrong:**
  - Consultant copy (#25), flip-flopping equal buttons (#26), and unsourced quantities (#60). Undo works.
- **Messages:**
  - An empty dead end that promises content "below" (#27).
- **Split the costs:**
  - Plain and correct. Per-person "Remove" understates its effect (#56). The settle-up copy is silent (#32, code).
- **Make it yours:**
  - Rich and well-sourced protocol block ("AR 600-25 …"). It says "brief" (#52).
- **You & settings:**
  - 13×14 checkbox (#39), placeholder-only fields (#41), and developer-ish toggles and copy (#50).
- **Travel & where everyone stays:**
  - Read-only with nothing to do, link-colored names that go nowhere (#28), and a door/title name mismatch (#58).
- **Vendor draft, trip draft:**
  - Model sheets: one lit Share…, voice picker, and "Mark it sent". No findings.
- **Family page:**
  - Private and warm. Counts differ from the host's board (#35, fixture caveat).
- **Helper page:**
  - Clean, with one lit "I've got it". No findings.
- **Vendor brief page:**
  - Clear for the vendor. It carries an app ad (#55) and a different name from the host's button (#24).

### Jargon and developer strings seen (rule 4)

Each line is the string as it appears on screen, then the screen it was seen on.

- "compound event, requires merging" (The Day)
- "Open decisions block timeline, vendor, and approval progress downstream." (The Day)
- `Resolve "… for ".` (The Day)
- "Clarity on timing cascades to reduce all downstream friction." (Risks)
- "Contact channels available." (Vendors)
- "Payment state not tracked yet." (Vendors)
- "Logistics not tracked yet." (Vendors)
- "Closeout activates after the event." (Vendors)
- "5 of 6 checks passing · 1 not tracked yet (closeout)." (Vendors)
- "the vendor's own brief covers the rest" (Vendors)
- "Your free brief went to your first vendor" (toast)
- "sharing one vendor brief" (Create)
- "VENDOR BRIEF / Copy the brief / Print the brief" (vendor page)
- "The day-before brief" (Make it yours)
- "brief each to ~2-3 min" (Checklist)
- "high-ROI host sanity" (Vendors)
- "National baseline" (Vendors)
- "Download the vendor list (CSV)" (Vendors)
- "includes allocations and estimates" (Money)
- "Budget entry" (Money)
- "4 foundation facts on record" (After)
- "feeds the wrap-up meter" (After)
- "Active planning" (rail)
- "Narrow" (rail)
- "One account, both apps" (Settings)
- "On — tap to mute" (Settings)

None of the brief's examples ("tune", "pesc.", "this count reads") appeared on any captured screen.

---

## 3. Rules that can be enforced by tests

| Rule | Test | How |
|---|---|---|
| 1 | Extend `e2e/oneLitButtonPerSheet.spec.mjs` from "≤ 1" to "**exactly 1** where the sheet has an action", and add the **After** and **The Day** stages (`oneLitButtonOnTheDay` exists; add `oneLitButtonOnAfter`). | Reuse its `--cta-grad` probe. Add a sibling assertion: no card has more than 3 equal-weight `.mini` buttons. That would have caught #2, #10, #11 and #22. |
| 1 | Extend `oneLitButtonOnTheDraftSheet` to every draft sheet. | The trip draft already matches; the vendor draft does too. |
| 2 | **Opens in place.** For each `aria-controls` disclosure, tapping it must leave the control on screen and put the panel within one viewport of it. | Read `getBoundingClientRect` before and after the tap. That catches #13. |
| 2 | **Labeled controls.** Every `input`/`textarea` in a sheet has a visible `<label>` or a preceding `.shelf-label`, not only a placeholder. | Catches #8 and #41. |
| 3 | **Destructive last.** In any card, a button matching `/remove\|delete\|skip\|clear\|not for us/i` is the last pressable in DOM order and in visual order. | Catches #7. |
| 4 | **Jargon list.** A vitest over the copy tables (`vendorIntelligence`, `eventIdentityEngine`, `surfaceRegistry`, `budgetCopy`, `eventOrientation`, playbook risk and vendor data) plus an e2e sweep of the `innerText` of every section. | Fail on a banned list: `brief`, `allocation`, `baseline`, `downstream`, `cascade`, `merging`, `compound event`, `not tracked`, `activates`, `channels`, `foundation fact`, `meter`, `ROI`, `CSV`, `tune`, `pesc`, `this count reads`. Also fail on an unclosed template quote such as `for ".`. |
| 5 | `aFinishedGroupCollapses.spec.mjs` exists. | Extend it to vendors ("settled" fold) and risks. |
| 6 | **Tappable-looking means routed.** In each sheet, any element with `cursor:pointer`, a link-blue `color`, or a trailing `›`/`→` must have a handler: `__reactProps*.onClick`, `a[href]` or `button` (probe in `scripts/lib.js`). | Catches #28 and #49. |
| 7 | **Outward inventory.** A static vitest greps `hostv2/src` for `sms:`, `mailto:`, `wa.me`, `navigator.share`, `clipboard.writeText`, `window.open`, and the publish calls. | Each hit must sit in an allow-list of draft-sheet components or carry a `data-record` sibling ("Mark it sent"). New hits fail. That catches #30, #31 and #32. |
| 8 | **One name per door.** A vitest asserts `sectionDirectory` labels equal the sheet titles at HostShellV2.jsx:17351. | Catches #58. An e2e asserts no screen shows two buttons that open the same `sheet.kind` (#29, #46). |
| 9 | **Tap-floor sweep.** Widen `everyTapIsFortyFourSquare.spec.mjs` `SECTIONS` (3 today) to every door row, plus an opened vendor card and the What's counted panel. | Catches #9, #38 and #39. |
| 9 | **Contrast.** Keep the DOM probe, and add a pixel fallback when an ancestor has a `background-image`, as in `scripts/pix.py`. | Avoids false positives. |
| 9 | **Floors.** Inputs ≥ 16 px, no text < 11 px, and `scrollingElement.scrollWidth ≤ clientWidth`, across all 5 viewports. | Already measured clean. Pin it. |
| 11 | **Extend `nothingKnownIsAskedAgain.spec.mjs`** to count editors per fact across sheets: date, start time, guest count, table count, city, address. | Assert one editing door per fact (others link to it). Catches #18. Also: no "not told yet"/"confirm" chip for the host's own name (#33). |
| 12 | **Cross-screen agreement** (new spec). Read the same number from each screen and compare. | See the four checks below the table. |
| 13 | **Moment fit.** No "due today", "past its window" or "needs you today" text inside a section headed "not today's job". `NOW` appears only when the clock is inside the window. | Run with `page.clock` at T−1 day, the day, and T+2. Catches #1. |
| 15 | **Payload allow-list.** For each guest-facing payload (`buildVendorBriefPayload`, the family projection, the helper link), assert its keys ⊆ the allow-list. | Mock the server returning extra fields (money, notes, other guests, the `surprise` vendor) and assert the page renders none of them. `theVendorPageLivesInTheNewApp.spec.mjs` already does this for vendors; copy it to `familySeesThePlanReadOnly` and `aHelperGetsTheirJobByLink`. |
| 16 | **Playbook census.** A vitest walks every `src/lib/playbooks/data/*.js` price or range string and every rendered amount. | Each must carry a source tag (est., cited or yours) or come from a sourced table. Ban "AI", "smart" and "our AI". Catches #37 and #60. |
| 17 | **Single cue / reduced motion.** On each screen, `document.getAnimations()` filtered to running shows ≤ 1 attention animation, and 0 with `reducedMotion:'reduce'`. | Probe in `scripts/run.js` motion mode. Pins #54's pass. |
| 18 | **Undo over confirm.** A static test: no `window.confirm` in a handler whose write goes through `patchEvent` without `{noUndo:true}`. | An e2e asserts every destructive toast has an "Undo" button. Catches #53. |

Rule 12 checks (the cross-screen agreement spec):

1. The board's "Open the spread (N items)", The Day's "N items still to get", and the spread sheet's count must be equal. Catches #4.
2. Money's figures come from one reader (`moneyFigures`), and no screen prints "left to spend". Catches #5.
3. Seating's "everyone has a seat" is green only when the seated count is at least the planned headcount. Catches #6.
4. The helper count is the same on Space, the board and the checklist. Catches #19.

---

## 4. Proposed build batches (by screen family)

| Batch | Screens | Findings | P1 | P2 | P3 |
|---|---|---|---|---|---|
| **A. The Day stage** | The Day | #1, 2, 3, 42, 54 | 3 | 0 | 2 |
| **B. Vendors** | Vendor list, vendor detail, vendor brief page | #7, 8, 9, 21, 22, 23, 24, 36, 55, 61 | 3 | 5 | 2 |
| **C. Numbers that agree** | Board, Money, Seating, Space, family page | #4, 5, 6, 18, 19, 20, 35, 37, 51, 62 | 3 | 5 | 2 |
| **D. Checklist** | Your checklist | #10, 33 | 1 | 1 | 0 |
| **E. After stage** | After | #11, 12, 29, 30, 34 | 2 | 3 | 0 |
| **F. Board, navigation and layout** | Board, What's counted, rail, iPad landscape and desktop | #13, 14, 15, 16, 17, 38, 40, 46, 47, 48 | 0 | 7 | 3 |
| **G. Small sheets and copy** | Messages, Lodging, Risks, Settings, Calls, Split, Make it yours, Create, trip board, outward code paths | #25, 26, 27, 28, 31, 32, 39, 41, 43, 44, 45, 49, 50, 52, 53, 56, 57, 58, 59, 60 | 0 | 8 | 12 |
| **Total** | | 62 | **12** | **29** | **21** |

Suggested order: A, then C, then B, then E. These four hold 11 of the 12 P1s. Then D and F, and G as one copy-and-polish pass. Land the rule-12 agreement spec with batch C, and the jargon list with batch A, so both stay fixed.
