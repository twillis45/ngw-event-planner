# HOST-DIFM-AUDIT-1 — Host-level DIFM + Magic Moment opportunity audit (2026-07-07)

Audited at commit 18ea29c (clean main, post PAY-COPY-1). Audit-only — zero
runtime code changed. All eight required doctrine/audit docs read
(TRUST_CONTRACT_1 absent — noted). Scoring per doctrine §6 (0–10, 10+
proof-gated).

## 1 · Executive verdict

The audit prevented exactly the mistake it was designed for: **of the 18
required candidates, ELEVEN already exist wholly or mostly.** The three
genuinely open, high-value host opportunities are (a) a **day-before plan**
that composes five existing sources into one calm sheet, (b) the **parked
WhatCouldGoWrongPanel per-risk routing** — a repair, not a feature, and the
last imprecise CTA class blocking CTA Core's 10+ candidacy, and (c) **thin
moment-protection annotations** (DL-008: annotate, never compute).
Everything else is exists / park / kill. Recommended order:
**DAYBEFORE-DIFM-1 → WCGW-ROUTE-1 → MOMENT-PROTECT-1.**

## 2 · Matrix 1 — Existing Host DIFM inventory

(Shared columns: all edit-before-send, none overwrite, all on the canonical
module or playbook engine unless noted.)

| Helper | Surface | Creates / completes | Clears state | Tests | Score | 10+ | Verdict |
|---|---|---|---|---|---|---|---|
| effectiveRos (playbook ROS) | The Day | full run-of-show until edited | empty-timeline | yes | 9 | yes | build on |
| playbookChecklist / DayOf / FoodPlan / Capacity | Plan + Day | sized checklists, quantities, $ | task/shopping states | yes | 9 | yes | build on |
| draftShoppingList / buildShoppingPlan | Plan + Home | sized handoff list | shopping handoff | yes | 9 | yes | build on |
| draftInvite / draftGuestBrief / draftRsvpChase | Home + Guests | guest comms w/ RSVP link | invite/reply pressure | yes | 9 | yes/possible | build on |
| draftGuestUpdate (GUEST-UPDATE-1) | Guests | change updates ×6 types | local-only (honest) | yes | 8 | possible | build on |
| suggestRainPlan / guestRainMessage | Event Details + weather | rain plan starter + guest msg | rain gap | yes | 9 | possible | build on |
| draftParkingInstructions (PLACE-DIFM-1) | Place card | parking field starter | Place parking gap | yes | 8 | possible | build on |
| draftVendorBriefAsk (BRIEF-ASSIST-1) | Brief share panel | missing-detail ask | brief completeness | yes | 8 | possible | build on |
| draftVendorPaymentReminder (PAY-COPY-1) | PaymentFlow | explicit-data payment note | local-only (honest) | yes | 8 | possible | build on |
| Budget swap-to-save | Budget hero | one-tap overage fix | over state | yes | 8 | possible | build on |
| HostTaskFocusCard + do-now list | Plan | promised task landing + Done | task done → hero advances | yes | 8 | no | build on |
| Settle-in-place (all optioned decisions) | What to settle | inline decision resolution | decision → locked | yes | 9 | possible | build on |
| draftDayBeforeDetails | T-1 | guest final-details msg | guest comms | yes | 8 | possible | build on |
| draftThankYou / draftRecap / draftHelperBrief / draftDietaryNote / draftToast | various | follow-ups, helper brief, toast | thanked tracker / none | yes | 6–8 | possible | tighten (discoverability) |
| ChecklistGenerator | legacy Plan branch only | generated checklist | — | partial | 5 | no | **local only — not planv2-reachable; do not resurrect without cause** |

## 3 · Matrix 2 — Host Magic Moment inventory

| Feature | Surface | Signal | Tied to action | Invents emotion | Score | 10+ | Verdict |
|---|---|---|---|---|---|---|---|
| "What matters most — name the moment" | HostHome | must_have_moment (asked) | yes → ROS musthave block | no | 8 | possible | build on |
| Must-have moment in run-of-show (data-deeplink musthave) | The Day | moment protection | yes (day placement) | no | 8 | possible | build on |
| playbookHeartMoments | Plan | event-type moments (3–5, pickable) | yes | no | 8 | possible | build on |
| draftToast (honoree story/feeling/why) | day-of | honoree, memory | yes | no (gated on real fields) | 7 | possible | tighten — buried |
| Honoree touches (song/drink/theme) | Event Details | honoree | weak — barely resurfaces | no | 6 | possible | **tighten: capture > payoff (same disease DM-PAYOFF-1 cured for vendors)** |
| "Why this vendor" payoff (DM-PAYOFF-1) | vendor detail | decision rationale | yes (reads at act-time) | no | 8 | possible | build on |
| Somber-event register (SOMBRE_RE gating in drafts) | guest copy | dignity | yes (tone) | no | 8 | no | build on |
| Event identity reveal / experienceContext | Reveal→surfaces | identity, compound | partially | no (ET-1 honest) | 7 | possible | tighten per DL-008 |
| Day-of FOCUS "THE ONE THING TODAY" | day-of home | host stress | yes | no | 8 | possible | build on |

## 4 · What already works
The playbook starter stack (a host gets a plan, a schedule, a shopping list,
and quantities for free), the DIFM sheet grammar (draft → edit → explicit
share), settle-in-place, calm checklist advance, the moment→ROS chain.

## 5 · Weak or fake-smart
Nothing lying. Weak: honoree song/drink captured then unused; toast/helper-
brief/recap underdiscovered; ChecklistGenerator stranded in the legacy
branch; WhatCouldGoWrongPanel routes imprecisely (the one standing CTA-
doctrine violation, parked since CTA-REPAIR).

## 6 · Duplicates / overlaps
None found. Boundary to hold: day-before GUEST message (draftDayBeforeDetails)
vs a day-before HOST plan (missing) — related, must not merge; the host plan
should LINK to the guest draft, not contain it.

## 7 · Canonical host DIFM
Already settled: doItForMe.js (voice) + playbooks (structure). No change.

## 8 · Remain local
Demo tools · seating energy copy · day-of FOCUS internals.

## 9 · Kill/park (existing)
ChecklistGenerator (park in legacy branch) · recap upgrades (park until a
learning loop consumes them).

## 10 · Matrix 3 — Host opportunity ranking (all 18 required candidates)

| # | Candidate | Exists? | Data | Clears/advances | Reuses | Invented-fact risk | Clutter risk | Size | Verdict · slice |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Day-before plan / final prep compression | **NO (host-side)** — pieces exist: compression do-now, unbought shopping, unconfirmed vendors, tomorrow's first cues, rain plan, guest T-1 draft | all existing | compresses 5 surfaces into 1 sheet at T-1/T-2 | deriveEventCompressionSummary, plan.list, effectiveRos, vendor states, DraftSheet | LOW (pure composition) | LOW (time-gated card) | S–M | **EXECUTE · DAYBEFORE-DIFM-1** |
| 2 | Host checklist starter | YES (playbookChecklist/DayOf per type) | — | — | — | — | — | — | park — exists |
| 3 | Run-of-show review | mostly (effectiveRos + RealityCheck + day hero) | — | weak new state | — | low | med (another review pass) | M | test — only if trial feedback asks |
| 4 | Setup walkthrough home/venue | partial (playbookSetupPreview authored; surfaced at intake only) | authored per type | setup confidence | playbookSetupPreview | low | med | S | test — resurface preview on The Day (T-1) rather than new content |
| 5 | Final guest reminder | YES (draftDayBeforeDetails) | — | — | — | — | — | — | exists; LINK from #1 |
| 6 | What-could-go-wrong prevention plan | panel EXISTS; per-risk routing PARKED = imprecise CTAs | risks + mitigations authored | risk→action precision; unblocks CTA Core 10+ | WhatCouldGoWrongPanel + CTA contract | none (repair) | none | S | **EXECUTE · WCGW-ROUTE-1 (repair)** |
| 7 | Shopping/supplies list | YES (9/10) | — | — | — | — | — | — | exists |
| 8 | Food/menu checklist | YES | — | — | — | — | — | — | exists |
| 9 | Family/VIP moment plan | NO — no VIP data model | absent | — | — | HIGH (emotional inference) | med | L | **PARK** (needs a host-entered VIP field first) |
| 10 | Moment protection annotations | partial (ROS block only) | must_have_moment, honoree | moment visibility at decision/day pressure points | DL-008 annotation seam | low if annotate-only | med — max 2 placements | S | **EXECUTE · MOMENT-PROTECT-1** (thin: day-before plan + compressed-tasks context line) |
| 11 | Day-of host command list | YES (FOCUS + NOW cue + helpers roster + day checklist) | — | — | — | — | — | — | exists; tighten only on demo feedback |
| 12 | "What should I outsource?" | NO | weak (no cost-of-time model) | none real | — | HIGH — vague-assistant behavior | high | M | **KILL** (fatal: doesn't clear anything truthful) |
| 13 | Host confidence/readiness summary | readiness exists; a "confidence" wrapper adds language risk | — | none | — | med (% / overclaim) | med | S | park — PROGRESS doctrine already draws this line |
| 14 | Thank-you / follow-up starter | YES | — | — | — | — | — | — | exists; discoverability tighten later |
| 15 | Post-event learning prompt | partial (recap + OutcomeCapture, no consumer) | — | — | — | med | low | M | park until learning loop |
| 16 | Doc/payment/deposit review | payment DONE (PAY-COPY-1); doc checklist absent | vendor categories + coi | doc axis | playbook promises | med | med | M | test — needs the doc-model audit first |
| 17 | Vendor confirmation follow-up plan | partial (issue → log; fix-plan unwritten) | issue note + category | issue-open state | confirmationActionsFor + DIFM ask pattern | med | low | S | test — after real trial rows show the need |
| 18 | Rain/guest-comfort readiness | YES (rain stack + Place card + guest updates) | — | — | — | — | — | — | exists |

## 11 · Top execute candidates
1 DAYBEFORE-DIFM-1 · 2 WCGW-ROUTE-1 · 3 MOMENT-PROTECT-1 — then stop and
let the vendor trial + demo feedback re-rank.

## 12 · Top test candidates
Setup-preview resurfacing at T-1 (#4) · vendor issue fix-plan (#17) ·
document checklist (#16, audit-first) · ROS review pass (#3) · toast/helper-
brief discoverability · honoree-touches payoff (fold into MOMENT-PROTECT-1).

## 13 · Top park/kill
KILL: "what should I outsource" (vague-assistant fatal) · confidence
summary as %-flavored wrapper. PARK: VIP plan (no data model) · post-event
learning (no consumer) · ChecklistGenerator resurrection · any second DIFM
surface/system · any auto-send.

## 14 · Top 10+ potential
effectiveRos · playbook sizing stack · shopping handoff · RSVP chase ·
settle-in-place · **day-before plan (post-build — composes five proven
engines, the strongest new candidate)** · moment→ROS chain · rain pair ·
swap-to-save · day-of FOCUS.

## 15–16 · Recommended order / next 3 thin slices
1. **DAYBEFORE-DIFM-1** — a "Your day-before plan" card/sheet, time-gated
   (T-2→T-0), composing: do-now tasks · unbought items count + shopping
   handoff link · unconfirmed-vendor asks (link to BRIEF-ASSIST) · tomorrow's
   first 3 cues · rain plan presence · "send the final details" (links
   draftDayBeforeDetails). Pure composition; DraftSheet for the shareable
   half; no new state faked.
2. **WCGW-ROUTE-1** — repair: every WhatCouldGoWrongPanel risk mitigation
   gets a first-undone deep link per CTA doctrine §8 (rain→rain-plan,
   count→guests-entry, vendor→row, supply→caprow). Closes the last imprecise
   CTA class; unblocks CTA Core's 10+ candidacy.
3. **MOMENT-PROTECT-1** — DL-008 annotations only: the named moment appears
   as a context line in the day-before plan and the compressed do-now list
   ("protecting: {moment}"), plus honoree song/drink surfacing on the day
   view. Annotate, never compute; asks when absent, never assumes.

## 17 · Doctrine updates
None required now. After DAYBEFORE-DIFM-1 ships, add it to the DIFM Voice
Module entry's surface list.
