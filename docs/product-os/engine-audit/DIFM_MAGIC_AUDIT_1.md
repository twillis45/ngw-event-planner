# DIFM-MAGIC-AUDIT-1 — Do-It-For-Me + Magic Moment Inventory (2026-07-07)

Audited at commit 80cb9af (clean main, post HOST-AUDIT-1). Audit-only — zero
runtime code changed. Scoring per doctrine §6 (0–10, 10+ proof-gated).
Docs read: INTELLIGENCE_ENGINE_DOCTRINE.md, INTELLIGENCE_AUDIT_1.md,
VENDOR_BRIEF_10PLUS_PROOF_PLAN.md (TRUST_CONTRACT_1.md does not exist —
TRUST-CONTRACT-1 has not started).

## 1 · Executive verdict

The suspicion was right — and the reality is better than feared. The app does
NOT have three competing magic helpers: it has **one canonical DIFM voice
module (`lib/doItForMe.js`: 12 draft generators, 52 tests, 19 render sites)**
plus a small set of domain starters (rain plan, run-of-show, shopping/supply
plans) that are correctly engine-derived, editable-before-send, and never
overwrite user content. The weak spots are not duplication but (a) three
capture-without-payoff features (Decision Memory rationale, post-event recap
learning, heart-moment protection that never reaches the vendor/guest layer),
and (b) missing helpers exactly where CTAs currently only ROUTE to a gap
instead of helping CLOSE it (arrival/parking note, guest update after a
change, vendor missing-detail ask). **Recommendation: execute the top 5
gaps as thin extensions of doItForMe.js — build NO new engine.**

## 2 · Matrix 1 — Do-It-For-Me inventory

Columns: Surface · Generates · Audience · Event-data-only · Invents facts ·
Editable · Overwrites · Clears state · Tests · Tier · Score · 10+ · Verdict.
All 12 `doItForMe.js` drafts share: event-data-only YES · invents NO (hedged
templates, host-authored fields only) · editable YES (sheet before share) ·
overwrites NO · covered by the 52-test suite · tier = canonical voice module.

| Feature | File | Surface | Generates | Audience | Clears state | Score | 10+ | Verdict |
|---|---|---|---|---|---|---|---|---|
| draftInvite | lib/doItForMe.js | Home "Your invite" + Guests | Full invite w/ RSVP link | guest | invite-sent signal | 9 | possible | **build on** |
| draftGuestBrief | doItForMe | Home/Guests "The guest brief" | when/where/bring/parking/dress | guest | guest-info gap | 9 | possible | **build on** |
| draftRsvpChase | doItForMe | "Nudge the no-replies" | reminder to pending guests | guest | pending-RSVP pressure | 9 | **yes** | **build on** |
| draftShoppingList + buildShoppingPlan | doItForMe | Plan "Ready to send" + Home | full sized list w/ amounts | host/helper | shopping handoff | 9 | **yes** | **build on** |
| draftThankYou | doItForMe | Guests "Thank-yous" | thank-you note | guest | thanked tracker | 8 | possible | build on |
| draftVendorOutreach / draftVendorReconfirm | doItForMe | vendor cockpit | first-contact + reconfirm messages | vendor | vendor comms gap | 8 | possible | build on |
| draftHelperBrief | doItForMe | day-of helpers | helper assignment brief | helper | day-of handoff | 7 | possible | tighten (low discoverability) |
| draftDietaryNote | doItForMe | food plan | dietary ask | guest | dietary gap | 7 | no | build on |
| draftDayBeforeDetails | doItForMe | T-1 | final details message | guest | day-before comms | 8 | possible | build on |
| draftToast | doItForMe | day-of | toast from honoree/meaning fields | host | none (heart) | 7 | possible | tighten — see Matrix 2 |
| draftRecap | doItForMe | post-event | recap/memory note | host | none | 6 | no | tighten (no learning loop) |
| suggestRainPlan | lib/weather.js | Event Details rain field | deterministic starter plan (3 shapes) | host | rain-plan gap + weather warning | 9 | possible | **build on** (RAIN-2, never overwrites — hidden when field has text) |
| guestRainMessage | lib/weather.js | weather surface | guest weather update w/ real window | guest | guest-inform gap | 9 | possible | **build on** (term-ban tested) |
| effectiveRos (playbook ROS) | lib/playbooks | The Day | full run-of-show until host edits | host | empty-timeline gap | 9 | **yes** | **build on** — the biggest silent DIFM in the app |
| playbookChecklist / DayOfChecklist / Capacity / FoodPlan | lib/playbooks | Plan + The Day | sized checklists, quantities, $ ranges | host | task/shopping states | 9 | **yes** | **build on** |
| Budget swap-to-save | App pickDroppableBudgetRow | Budget hero | one-tap overage fix naming the row | host | over-budget state | 8 | possible | build on |
| Confirmation actions (2B-1) | lib/vendorBriefConfirm | vendor cockpit | one-tap contact save / confirm / log | host | confirmation row | 9 | **yes** | **build on** |
| Demo seed/reset | lib/demoSeed | dev toolbar | staged demo event | internal | n/a | 8 | no | local only (correctly dev-gated) |
| HostTaskFocusCard / do-now list | App | Plan | renders the promised task w/ Mark done | host | task done + hero advance | 8 | no | build on (landing surface, not generator) |

**No silent overwrites found anywhere.** All senders route through the edit
sheet; suggestRainPlan hides once the field has any text. **No invented
facts found**: parking/bring/contact lines render only from host-authored
fields (doItForMe.js:617 comment is enforced in code and tests).

## 3 · Matrix 2 — Magic Moment / Heart WOW inventory

| Feature | File/Surface | Human signal | User sees | Tied to action | Invents emotion | Tests | Score | 10+ | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| "What matters most — name the moment" | HostHome card | must_have_moment capture | prompt → protected-moment card | yes → ROS musthave anchor | no (asks, never assumes) | partial | 8 | possible | **build on** — the heart capture that works |
| must-have moment in run-of-show | RunOfShow `meaning` props + data-deeplink="musthave" | moment protection | the moment as a first-class ROS block | yes (day-of placement) | no | partial | 8 | possible | build on |
| playbookHeartMoments | lib/playbooks | event-type moment suggestions (3–5) | suggested must-have moments | yes (pickable) | no (authored per type) | yes | 8 | possible | build on |
| Honoree personal touches | Event Details (honoree/theme/song/drink) | honoree | captured touches | weak — song/drink barely resurface | no | no | 6 | possible | **tighten: capture > payoff** |
| draftToast | doItForMe | honoree_story/feeling_words/meaning_why | a toast written from THEIR words | yes (day-of) | no — hasToastMaterial gates on real fields | yes | 7 | possible | build on; underdiscovered |
| Assemble Reveal (identity + explainability) | reveal engines + experienceContext | event identity, compound understanding | "it understands my event" reveal | yes (blockers route) | no (IS-1 verified) | yes | 8 | possible | build on |
| experienceContext.human | lib/experienceContext | 7/11 supported fields | continuity Reveal→surfaces | indirectly | no (ET-1 honesty) | yes | 7 | possible | tighten per DL-008 |
| Event glyph artwork (crab/catfish) | lib/artworkMarks | event identity | real PD artwork identity mark | no (identity) | no | yes | 7 | no | local/park (program parked) |
| Guest brief warmth (culturalMeta, host voice) | doItForMe eventCulturalMeta | event type meaning | human copy in guest messages | yes (messages) | no | yes | 8 | possible | build on |
| Decision Memory rationale | lib/decisionMemory | decision "why" | capture prompt; rationale rarely resurfaces | **no — the payoff is missing** | no | yes | 6 | possible | **tighten — top gap** |
| Seating "energy" hint | seating copy | guest comfort | assigned-seating rationale copy | yes | no | partial | 7 | no | local only |

**Fatal-flaw sweep: none.** No feature invents emotional facts (every heart
feature gates on host-entered fields or asks). No audience leaks found in
generated copy (guest/vendor drafts tested against internal terms).

## 4 · What works well
The doItForMe sheet pattern (draft → edit → share, never auto-send), the
playbook starters (a host gets a full sized plan for free), rain assist,
RSVP chase, shopping handoff, confirmation one-taps, must-have-moment→ROS.

## 5 · What is fake-smart or weak
Nothing found that lies. Weak: draftRecap (no learning loop consumes it),
honoree song/drink (captured, barely used), draftHelperBrief and draftToast
(good output, buried discoverability), Decision Memory (asks "why" then
almost never pays it back — the closest thing to fake-smart the app has,
because capture without payoff READS as fake over time).

## 6 · Duplicates / competing helpers
**None competing.** One boundary to hold: planner-side comms drafts (compose
surfaces) vs doItForMe host drafts serve different shells; do not merge, do
not let a third grow. suggestRainPlan (host) vs guestRainMessage (guest) are
correctly split by audience, not duplicates.

## 7 · Should become canonical
`doItForMe.js` should be NAMED the canonical DIFM voice module in the
doctrine engine list (it already behaves like one: single file, tested,
audience-aware). New DIFM output = new export here, not a new file.

## 8 · Should remain local
Demo seed/reset (dev-only) · seating energy copy · glyph artwork registry.

## 9 · Kill / park
Nothing to kill. Park: artwork program (already parked) · draftRecap
upgrades until a learning loop exists to consume them.

## 10 · Matrix 3 — Missing opportunity map (all 16 candidates)

| # | Candidate | Exists today? | Pain | Data available | Could clear | Overreach risk | Priority | Rec |
|---|---|---|---|---|---|---|---|---|
| 1 | Timeline/ROS starter | **YES — effectiveRos** | — | — | — | — | — | execute nothing; surface "written for you" framing |
| 2 | Day-of checklist starter | **YES — playbookDayOfChecklist** | — | — | — | — | — | none |
| 3 | Place/arrival instructions draft | **NO** | Place card says "needs info", host must compose from nothing | venue/kind/city/parking fields, guest count | parking + arrival needs-info states | low (deterministic like suggestRainPlan) | **P1** | **execute** |
| 4 | Guest update draft (something changed) | partial (day-before, rain only) | venue/time change → host improvises the message | old vs new field values | guest-inform gap | med (don't auto-send) | **P1** | **execute** |
| 5 | Vendor brief missing-detail assist | **NO** | brief has empty load-in/arrival; host doesn't know what to ask | brief payload gaps + vendor category asks (playbooks) | vendor brief completeness | low | **P1** | **execute** |
| 6 | Vendor issue fix plan | partial (issue → log entry) | issue captured, next move unwritten | issue note + vendor + category | issue-open state | med | P2 | test |
| 7 | Budget starter / what-if | partial (typical-setup categories, swap-to-save) | what-if scenarios absent | hostSpending | over/near states | med | P3 | park (BUD scope) |
| 8 | Food/menu checklist | **YES — FoodPlan** | — | — | — | — | — | none |
| 9 | Supplies/rentals checklist | **YES — CapacityPanel** | — | — | — | — | — | none |
| 10 | Decision Memory payoff note | **NO — the known #1 gap** | "why" captured, never resurfaces | decision records + subjects | re-litigation; trust in capture | low | **P1** | **execute** (already audit's top slice) |
| 11 | Heart/moment protection annotations | partial (ROS musthave only) | moment not visible in vendor brief / day pressure | must_have_moment + ROS | moment-at-risk awareness | med (DL-008: annotate, never compute) | **P2** | **execute thin** |
| 12 | VIP/family key-guest moments | **NO** | no VIP concept beyond honoree | roster exists; no VIP flag | — | HIGH (new data field + emotional inference) | P4 | park |
| 13 | Post-event learning prompt | partial (draftRecap, OutcomeCapture) | outcomes captured, nothing learns | decision records + outcomes | next-event intelligence | med | P3 | test |
| 14 | Day-before compression | **YES — do-now list + T-1 draft** | — | — | — | — | — | none |
| 15 | Payment/deposit reminder copy | **NO** | payment CTA routes, message unwritten | vendor, amount, due date | payment-due chase | low | **P2** | **execute** |
| 16 | Document checklist helper | **NO** | docs tab is storage, no "what you need" list | vendor categories + COI states | doc readiness axis | med | P3 | test |

## 11 · Top 10 execute candidates (ordered)
1 Decision Memory payoff (resurfacing rationale at decision-relevant moments)
· 2 Place/arrival instructions draft (extends Place card CTAs from route→close)
· 3 Guest update draft on change · 4 Vendor brief missing-detail assist ·
5 Payment reminder copy · 6 Heart annotation in vendor brief/day view (thin,
DL-008) · 7 Vendor issue fix plan · 8 Surface draftToast + helperBrief
discoverability · 9 Document checklist (audit first) · 10 Post-event learning
loop (consumes existing recap + outcomes).

## 12 · Top 10 park/kill
VIP flags (park — new data + inference risk) · budget what-if (park) ·
artwork program (parked) · recap upgrades (park until #10 consumes) · any new
comms channel (park) · any auto-SEND anything (never — edit-sheet doctrine) ·
a second drafts file (kill on sight) · AI-generated vendor messages (park,
hard rule) · emotional-tone inference from guest lists (kill) · magic that
doesn't clear a state (kill on proposal).

## 13 · Top 10 10+ potential
RSVP chase · shopping handoff · effectiveRos starter · playbook sizing ·
confirmation one-taps (all "yes" — already candidates via TENPLUS trial) ·
rain pair · invite+brief pair · must-have-moment→ROS · Decision Memory
(post-payoff) · place/arrival draft (post-build).

## 14 · Recommended implementation order
DM-PAYOFF-1 → PLACE-DIFM-1 → GUEST-UPDATE-1 → BRIEF-ASSIST-1 → PAY-COPY-1,
each a thin doItForMe.js export + one surface hook, each with the edit-sheet
pattern and never-overwrite rule. No new engines.

## 15 · Required doctrine updates
Add to §4 engine list: **"DIFM Voice Module — lib/doItForMe.js (canonical):
all generated host/guest/vendor copy lives here; edit-before-send sheet
mandatory; event-data-only; never overwrites; never auto-sends."** Add kill
rule: "a second drafts module is a competing engine."
