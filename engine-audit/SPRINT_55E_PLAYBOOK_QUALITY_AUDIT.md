# Sprint 55E — Playbook Quality Audit

*Audit only. No code, no new content, no fixes. The question is not "does a checklist exist" — it is "would a reasonably intelligent first-time host, with no event/planning/catering background, execute an event that feels professionally planned?" Scope: the five host playbooks (Dinner Party, Birthday, Baby Shower, Backyard BBQ / Get-Together, Graduation).*

## Methodology & honesty note

- **Evaluation lens.** The planner panel (Weiss, Rafanelli, Bailey, Tutera, Cowie, Garten) and hospitality/catering operators are used as a **standard of practice**, drawing on their widely-documented methodologies (run-of-show discipline, make-ahead/never-serve-untested, transform-the-space, the signature moment, guest-flow + comfort, food-safety/portioning). **No citations are fabricated.** Where a specific practice was already source-verified, it lives in `dinner-party.knowledge.json` (Garten's four-dish rule + never-untested-recipe; Weiss greet-with-a-drink / set-table-the-night-before / don't-over-buy-decor). Everything else here is labeled **[documented general practice]** or **[NGW synthesis]**.
- **One structural fact frames the entire audit** (verified in `src/lib/playbooks/index.js`): the reader surfaces **`purchases` only**. `decisions`, `milestones`, `tasks`, `rentalsGap`, `schedules`, `risks`, and `contingencies` are **authored but never surfaced**, and the reader **never reads `dependsOnDecision`** or checks whether a prerequisite milestone is complete. So a host driving by the runtime is handed *what to buy*, never *what to decide or do next*, and can be told to buy before the decision that sizes the purchase is made. This is the spine of every major finding below. Findings are tagged **[DATA]** (the playbook content is wrong/missing) or **[SURFACING]** (the content exists but the engine doesn't show it) so the fix owner is unambiguous.

---

## Executive summary — the three failure classes

1. **The Decision Engine inversion [SURFACING, critical].** The playbooks *contain* a correct decision spine (guest count → dietary → menu/format → shop fresh) with dependencies, but the runtime emits purchase tasks gated only by a date window. Result: "Buy fresh produce today" can fire before the headcount is locked; "Buy wine" before dietary/alcohol is decided. The system teaches *what to buy next* instead of *what to do next* — the exact defect Section 8 names.
2. **The invisible run-of-show [SURFACING, high].** Every professional outcome the panel cares about — the day-of timeline, capacity (chairs/plates/serveware in `rentalsGap`), make-ahead sequencing, and contingencies — is authored as data the host never sees. A first-timer following only surfaced buys ends up with food but maybe not enough chairs, no cooking timeline, and no rain plan at the moment it rains.
3. **Missing host infrastructure [DATA, high].** A consistent class of "pros never forget, first-timers always do" items is absent across the board: **extension cords / power, sterno-chafing fuel, a food thermometer, grill tools, name tags, parking, and guest-bathroom prep** appear in *zero to one* playbooks. These are cheap, unglamorous, and the difference between "served" and "couldn't serve."

**Verdict preview:** the *data* is a strong B; the *executed experience* is a C. The host playbooks have earned the right to become the Event OS foundation **only after** the decision-first surfacing and the infrastructure/run-of-show gaps are closed — details and EXECUTE/TEST/PARK/KILL calls below.

---

## Per-playbook scorecards

Scale 1–10 against the "host succeeds, professionally" bar (10 = inevitable; an experienced planner would sign their name to it). Scores reflect the *executed* experience (data **and** what the runtime surfaces), since that is what reaches the host.

### Dinner Party — strongest (and the only source-verified book)
| Category | Score | Notes |
|---|---|---|
| Decision Quality | 8 | Correct spine (format→dietary→menu→seating); dietary blocks menu. Missing: music, kids?, arrival window. |
| Purchase Quality | 8 | Thorough; ice/leftover-containers/cleanup flagged. Missing as *purchases*: serving utensils (only in rentalsGap), guest-bathroom kit, lighter (setup text only). |
| Timeline Quality | 8 | Real purchasing/cooking/setup/cleanup schedules + make-ahead doctrine. **Not surfaced.** |
| Host Success | 6 | The make-ahead/run-of-show that makes a host calm is invisible at execution. |
| Planner Credibility | 7 | Garten/Weiss practices are genuinely encoded; missing the "signature moment" + a budget guardrail. |
| Contingencies | 7 | Dietary/headcount/overcook/ice/capacity/cleanup. Missing: a dish fails, oven fails, the over-served guest. **Not surfaced.** |
| Operational Readiness | 6 | Capacity + timeline + contingencies all authored-but-dark; decisions not enforced before buys. |

### Birthday — broadest event type, thinnest coverage
| Category | Score | Notes |
|---|---|---|
| Decision Quality | 6 | **Kids-vs-adults and venue/indoor-outdoor are not first-class decisions** though they drive everything (supervision, entertainment, rain plan, power). Weather is a risk, not a decision. |
| Purchase Quality | 6 | No serving utensils, no entertainment/activity supplies as a line, no extension cords for music/lights/bounce house, cake server/board missing. Alcohol 2/guest likely low for a 3–4h adult party. |
| Timeline Quality | 6 | Schedules exist but thin on the entertainment/activity beat; not surfaced. |
| Host Success | 5 | Widest variance (toddler party vs 40th) under one generic book → a first-timer gets generic guidance. |
| Planner Credibility | 6 | No signature-moment/personalization beat (Tutera), no décor cohesion through-line (Bailey). |
| Contingencies | 5 | Rain + cake only. Missing: entertainment falls through, not enough food, an upset/hurt kid, a meltdown. |
| Operational Readiness | 5 | Power, serving, and entertainment infrastructure gaps compound. |

### Baby Shower — strong on safety, light on logistics
| Category | Score | Notes |
|---|---|---|
| Decision Quality | 7 | Pregnancy-safe food is a genuine standout (food-safety doctrine). Missing: venue, gift-opening yes/no, co-host roles. |
| Purchase Quality | 6 | Has serving + dispenser (rentalsGap). Missing: gift log + pen (risk names tracking, no item), name tags (two families meeting), corsage for the guest of honor, sterno if hot food. No over-provision buffer. |
| Timeline Quality | 6 | Reasonable; games beat under-specified; not surfaced. |
| Host Success | 6 | Calmer event; the seated, daytime format is forgiving. |
| Planner Credibility | 6 | Solid; lacks the "moment" (a toast, a reveal) and a guest-comfort layer. |
| Contingencies | 5 | Food/weather only. Missing: guest of honor runs late/unwell, gift duplication, no-shows shrinking a games-heavy plan. |
| Operational Readiness | 5 | Gift-flow + thank-you pipeline named but no supporting items. |

### Backyard BBQ / Get-Together — simplest event, most physical-failure exposure
| Category | Score | Notes |
|---|---|---|
| Decision Quality | 6 | Menu/potluck/alcohol/shade are the right four. Missing: timing-vs-heat, parking, kids/pets. |
| Purchase Quality | 6 | Fuel + ice (2 lb, correctly heat-adjusted) + bug/sun are good. **No grill tools (tongs/spatula/brush), no food thermometer, no extension cords, no fire-safety water/extinguisher.** |
| Timeline Quality | 6 | Grill batching present; light on the "fire up 45 min early / rest meat" detail in surfaced form. |
| Host Success | 6 | Lower formality lowers the bar; weather/fuel are the real killers and are well-flagged. |
| Planner Credibility | 5 | Least "designed" — fine for the format, but no ambiance/flow layer. |
| Contingencies | 7 | Best of the set: rain, out-of-fuel, heat/food-safety all covered. **Not surfaced.** |
| Operational Readiness | 6 | Grill-tool + thermometer + power gaps are exactly where a cookout physically stalls. |

### Graduation — largest crowd, highest operational load
| Category | Score | Notes |
|---|---|---|
| Decision Quality | 6 | Open-house format + buffer is smart. Missing: **parking** (35–75 drop-in guests), venue, restroom load. |
| Purchase Quality | 6 | Sheet cake + buffet logic good. Missing: **sterno fuel** for the chafers it names, serving utensils as a line, extension cords (slideshow/lights/chafers), an actual guest book, name tags. Ice 1.5 lb likely low for a summer outdoor open house. |
| Timeline Quality | 6 | Buffet-flow + resupply thinking is good; not surfaced. |
| Host Success | 5 | Hardest first-timer event (volume + churn); the invisible run-of-show hurts most here. |
| Planner Credibility | 6 | Photo/memory display is a nice personalization beat (Tutera-adjacent). |
| Contingencies | 6 | Resupply/signs/rain. Missing: parking overflow, restroom queue, buffet runs cold/out at peak. |
| Operational Readiness | 5 | Volume exposes every surfacing gap (capacity, power, parking, restrooms). |

---

## Audit framework findings

### 1. Decision Quality

**Missing Decisions** [DATA]
- **Kids-vs-adults** (Birthday, BBQ, Graduation) — drives food, supervision, entertainment, timing, alcohol control. Currently buried inside a headcount note.
- **Venue / indoor-outdoor + rain plan as a decision** (Birthday, Baby Shower, Graduation) — it exists only as a *risk*; it should *block* setup/rental choices.
- **Parking & arrival** (Graduation, BBQ) — absent; a 50-person drop-in with no parking plan is an early, visible failure.
- **Timing / time-of-day vs heat** (BBQ, Graduation) — absent; afternoon August cookouts fail on heat and food-safety.
- **The signature moment / personalization** (all) — Tutera/Weiss "one thing they'll remember"; no prompt exists.
- **Guest-comfort layer** (all) — restrooms, coats/bags, temperature, seating-for-elderly — Cowie's hospitality baseline; absent.
- **Co-host / helper roles** (Baby Shower, Graduation) — who runs the door, the grill, the gift log; absent.

**Poorly Sequenced Decisions** [DATA/SURFACING]
- Across all books, **dietary/allergy is correctly placed before menu in the data**, but because the runtime ignores `dependsOnDecision`, the *enforcement* is lost — a host can be sent shopping before allergies are collected. Sequencing is right on paper, dark in practice.
- Cake decisions (Birthday/Graduation) depend on theme + headcount but the lead-time pressure (3–5 days) isn't surfaced as an *early* prompt.

**Blocking Decisions Missing** [SURFACING, critical]
- The data marks blockers (`blocks: [...]`, `dependsOn`) but **nothing in the runtime blocks**. Guest count, dietary, menu-lock, and (where relevant) alcohol/venue should hard-gate downstream buys. Today none of them do.

### 2. Purchase Quality

**Missing Purchases** [DATA] — confirmed absent across the named books:
- **Extension cords / power strips** — *zero* playbooks. Needed for music, string lights, slow cookers, chafers, bounce house, slideshow.
- **Sterno / chafing fuel** — *zero* as a purchase (graduation names chafers in rentalsGap but buys no fuel). Any buffet that must hold hot food needs it.
- **Food thermometer** — *zero*. BBQ/Graduation grill + hold food safety depends on it.
- **Grill tools (tongs, spatula, grill brush)** — absent from the **BBQ** itself.
- **Name tags** — *zero*. Baby Shower (two families) and Graduation (family/friends/teachers) genuinely benefit.
- **Guest-bathroom kit** (TP, hand soap, hand towels, plunger) — *zero*. A guest-facing failure pros never allow.
- **Serving utensils as a surfaced line** — only in rentalsGap (which is dark); Birthday has none at all.
- **Music/speaker** — only Birthday. Ambiance is universal.
- **Cake server + board/stand** (Birthday/Graduation), **corsage** (Baby Shower), **gift log + pen** (Baby Shower/Graduation), **fire-safety water/extinguisher** (BBQ).

**Quantity Errors** [DATA]
- **Alcohol underestimated** at parties: Birthday 2 drinks/guest and Graduation 1.5/guest for multi-hour adult events vs the **~1 drink/guest/hour** operator heuristic [documented general practice]. Likely low.
- **Ice possibly low for summer/outdoor**: Graduation 1.5 lb/guest for a hot open house; BBQ's 2 lb is the correct heat-adjusted figure and should be the template.
- **No over-provision buffer** in **Baby Shower** and **BBQ** (Birthday/Dinner/Graduation have it). Caterers plan +10–15% [documented general practice].

**Timing Errors** [DATA] — minor. `buyAt` tokens are sensible (T-3d non-perishables, T-1d fresh, T0 ice). The real timing failure is **surfacing**, not the tokens (see §8).

**Forgotten Purchases** [DATA] — the universal first-timer set: ice timing, serving utensils, sterno, extension cords, trash+recycling (mostly present), a lighter/matches, leftover containers (present in Dinner), bags to carry the gift/leftover haul.

### 3. Timeline Quality

**Timeline Gaps** [SURFACING, high] — the **entire day-of run-of-show is invisible**. `schedules.{purchasing,preparation,setup,cleanup}` exist and are good; the host never sees them. Pros run the day off this document; first-timers have nothing.
**Timeline Gaps** [DATA] — Birthday's entertainment/activity beat and Graduation's restroom/parking load have no timeline entries.
**Timeline Conflicts** [DATA] — light. The main latent conflict is the host trying to cook/plate *and* greet/host simultaneously (Garten's "be a guest at your own party") — make-ahead mitigates it in Dinner but is thin in Birthday/BBQ.
**Dependency Problems** [SURFACING, critical] — dependencies are authored (`dependsOn`, `dependsOnDecision`) and **unenforced** at runtime.

### 4. Host Experience

**Stress Points** — buying before the count is locked (fear of wrong quantities); discovering day-of there aren't enough chairs/plates (capacity is dark); no cooking timeline so everything lands cold or late; rain with no surfaced plan.
**Overload Points** — all decisions presented as a flat authored list with no "one next decision" sequencing (violates the house **Attention System** doctrine: one hero per screen). The host sees a wall, not a path.
**Decision Bottlenecks** — dietary/allergy collection (needs guest follow-up, not a purchase) and final headcount are the two true bottlenecks; neither is surfaced as the next action, so the host stalls or skips them and pays later.

### 5. Contingency Quality

**Missing Contingencies** [DATA]
- A **dish/main fails or burns** (Dinner, Birthday, Graduation) — no backup-protein/order-pizza fallback.
- **No-shows / surprise +1s** — only loosely implied; no "buy to a confirmed count, cook to +1 buffer" rule surfaced.
- **Power outage / breaker trip** — none (ties to the missing power-load planning).
- **Restroom/parking overload** (Graduation) — none.
- **An over-served guest / ride home** (Birthday, Graduation, Dinner) — none.
- **Equipment failure** (grill won't light beyond fuel; oven dies) — partial (BBQ fuel only).

**Weak Contingencies** [SURFACING] — even the *good* contingencies (BBQ's rain/fuel/heat are genuinely strong) are **never shown to the host at execution time**. A backup plan the host can't see is not a backup plan.

### 6. Professional Planner Test

**Planner Critique** [evaluation lens — documented methodologies, not quotations]
- **Mindy Weiss** — "Where's the run-of-show? Where's the timeline I can hand someone?" Would praise the make-ahead and dietary discipline; would flag no surfaced timeline, no signature moment, no décor-budget guardrail.
- **Bryan Rafanelli** — logistics/production first: would flag the absent power/load plan, guest-flow/arrival plan, and that capacity (chairs/serveware) is invisible. Would consider "buy before count locks" amateur.
- **Preston Bailey** — design/transform-the-space: décor is a single line item with no focal moment, lighting is candles-only; no environmental through-line. Would consider the events under-designed (acceptable for the format, but not "wow").
- **David Tutera** — personalization + a reveal: no "one moment they'll remember," no personalization prompt; budget-to-wow guidance thin.
- **Colin Cowie** — hospitality standards: restrooms/coats/parking/temperature/seating-for-elders missing; would consider guest-comfort omissions the clearest amateur tell.
- **Ina Garten** — make-ahead + never-serve-untested + be-a-guest-at-your-party: would *praise* Dinner Party, push the same make-ahead rigor into Birthday/BBQ, and insist the host not be trapped cooking during the party.

**Planner Improvements** (what they'd do immediately): surface the run-of-show; enforce decision-before-purchase; add the guest-comfort + power infrastructure; add one signature-moment prompt per event; show contingencies at execution time.

### 7. Operational Execution Test (first-timer, zero background)

**Failure Points** — *where they fail, in order:*
1. Buys to an unlocked headcount / before collecting allergies → wrong quantities, a safety miss.
2. Has food but not enough chairs/plates/serveware (capacity dark) → visible day-of failure.
3. No cooking/setup timeline → cold or late food, host stuck in the kitchen.
4. Can't physically serve: no serving utensils / sterno / grill tools / power → buffet sits cold, nothing to plug in.
5. Reality deviates (rain, a no-show, runs short) → panic, because the authored contingency is invisible.
6. Guest comfort gaps (restroom unstocked, nowhere for coats, no parking) → "amateur" feel even if the food is great.

**Root Causes** — (a) runtime surfaces purchases only; (b) decisions/timeline/capacity/contingencies authored-but-dark; (c) a missing infrastructure class in the data.
**Required Additions** — see the recommendation table; the high-leverage three are decision-first surfacing, run-of-show + capacity surfacing, and the infrastructure purchase set.

### 8. Decision Engine Audit *(most important)*

**Decision Sequencing Defects** [SURFACING, critical]
- The reader iterates `purchases` and gates on a date window only. It **never** checks `dependsOnDecision` (verified: 0 references in `index.js`) or whether the prerequisite milestone (`dp_rsvp_close`, `bs_rsvp_close`, menu-lock) is complete. So the operational candidate is *always a purchase*, and can precede the decision that sizes or qualifies it.
- Concretely: a Dinner Party in the T-1d window surfaces "Buy main protein — X lbs today" even if the headcount isn't locked and dietary isn't collected — the very inversion the mission names.

**Recommended Ordering** (the spine the engine should walk, per event — this is the *target*, authored content already largely supports it):
1. **Decisions that block** (guest count, dietary/allergy, menu/format, alcohol, venue/rain) → surface as "decide/confirm" actions.
2. **Guest follow-ups** (chase the N non-RSVPs; collect dietary from the 2 unknown) → surface as people-actions, not purchases.
3. **Capacity check** (enough chairs/plates/serveware? rent/borrow the gap) → from `rentalsGap`.
4. **Then purchases**, in `buyAt` order, *gated* on the blocking decisions being complete.
5. **Day-of run-of-show** (setup → execution → cleanup) from `schedules`.
6. **Contingencies** surfaced as the relevant risk approaches (rain plan at T-2 if outdoor).

The data already encodes ~80% of this; the defect is that only step 4 reaches the host, ungated.

---

## Top-10 lists

### Top 10 Missing Decisions
1. Guest count as an enforced *blocker* before any fresh purchase. [SURFACING]
2. Dietary/allergy collection enforced before menu-lock/shop. [SURFACING]
3. Indoor/outdoor + rain plan as a *decision* (Birthday, Baby Shower, Graduation). [DATA]
4. Kids-vs-adults (Birthday, BBQ, Graduation). [DATA]
5. Parking & arrival plan (Graduation, BBQ). [DATA]
6. Time-of-day vs heat (BBQ, Graduation). [DATA]
7. The signature moment / personalization (all). [DATA]
8. Guest-comfort plan: restrooms, coats, seating-for-elders (all). [DATA]
9. Co-host/helper role assignment (Baby Shower, Graduation, big Birthdays). [DATA]
10. Alcohol service plan + ride-home/cutoff (adult Birthday, Graduation). [DATA]

### Top 10 Missing Purchases
1. Extension cords / power strips (all). 2. Sterno / chafing fuel (buffet events). 3. Food thermometer (BBQ, Graduation). 4. Grill tools — tongs/spatula/brush (BBQ). 5. Serving utensils as a surfaced line (Birthday; surface from rentalsGap elsewhere). 6. Guest-bathroom kit — TP/soap/towels (all). 7. Name tags (Baby Shower, Graduation). 8. Music/speaker (all but Birthday). 9. Gift log + pen / guest book (Baby Shower, Graduation). 10. Lighter/matches + cake server/board (Birthday); fire-safety water (BBQ).

### Top 10 Missing Contingencies
1. A main dish fails/burns → fast fallback (Dinner, Birthday, Graduation). 2. Buy-to-count, cook-to-+1 for no-shows/surprise guests (all). 3. Power outage / tripped breaker (all). 4. Restroom + parking overload (Graduation, BBQ). 5. Buffet runs cold/out at peak (Graduation). 6. Over-served guest + ride home (Birthday, Graduation, Dinner). 7. Equipment failure beyond grill fuel — oven/fridge (Dinner, Birthday). 8. Guest of honor late/unwell (Baby Shower, Birthday). 9. Food shortage mid-event → resupply runner (all but Graduation). 10. Severe-allergy exposure response, not just avoidance (all).

### Top 10 Planner Improvements
1. Surface the run-of-show (`schedules`) as the day-of spine. 2. Enforce decision-before-purchase (read `dependsOnDecision` + milestone state). 3. Surface capacity (`rentalsGap`) as a pre-event check. 4. Add the infrastructure purchase set (power/sterno/thermometer/serving/bathroom). 5. Add one signature-moment prompt per event. 6. Add a guest-comfort layer (restroom/coats/parking). 7. Surface contingencies as their trigger window approaches. 8. Apply one-next-decision sequencing (Attention System) to decisions. 9. Right-size alcohol (~1/guest/hour) and add a +10–15% buffer everywhere. 10. Add a host "command station" concept (trash+bus+resupply staging) to setup.

### Top 10 First-Time Host Failure Points
1. Buying before the count/dietary is settled. 2. Not enough chairs/plates/serveware. 3. No cooking/setup timeline → cold/late food, host trapped in kitchen. 4. Nothing to serve *with* (utensils/sterno/grill tools). 5. Nothing to plug in (no power planning). 6. No surfaced rain/no-show/shortage plan when it happens. 7. Unstocked guest bathroom / nowhere for coats / no parking. 8. Ice forgotten or under-bought (mostly mitigated; verify quantities). 9. Cake/photo-display/custom-print ordered too late. 10. Decision overload → host freezes or skips the blocking decision.

---

## Recommendations — EXECUTE / TEST / PARK / KILL (every identified improvement)

*EXECUTE = clear win, do it. TEST = plausible, validate with a host/beta before committing. PARK = real but lower priority / behind a prerequisite. KILL = out of scope for host playbooks.*

| # | Improvement | Type | Rec | Rationale |
|---|---|---|---|---|
| 1 | Read `dependsOnDecision` + milestone state; gate purchases on blocking decisions | SURFACING (runtime) | **EXECUTE** | The #1 defect; data already supports it. Smallest change with the largest credibility gain. |
| 2 | Surface decisions/follow-ups as operational candidates (decide before buy) | SURFACING (runtime) | **EXECUTE** | Turns "what to buy" into "what to do next." Core to the Event-OS promise. |
| 3 | Surface the run-of-show (`schedules`) at execution / day-of | SURFACING (runtime) | **EXECUTE** | The professional through-line; already authored. |
| 4 | Surface capacity (`rentalsGap`) as a pre-event check | SURFACING (runtime) | **EXECUTE** | Prevents the most visible day-of failure (not enough chairs/plates). |
| 5 | Add infrastructure purchases: power, sterno, thermometer, grill tools, serving utensils, bathroom kit | DATA | **EXECUTE** | Cheap, universal, decisive. Author in the next data sprint. |
| 6 | Surface contingencies as their trigger window nears | SURFACING (runtime) | **EXECUTE** | A backup the host can't see isn't a backup. |
| 7 | Right-size alcohol (~1/guest/hr) + add +10–15% buffer to Baby Shower & BBQ | DATA | **EXECUTE** | Quantity correctness; trivial edit. |
| 8 | Add indoor/outdoor + rain-plan as a *decision* (3 books) | DATA | **EXECUTE** | Promotes a known risk to a blocking decision. |
| 9 | Add kids-vs-adults decision (Birthday/BBQ/Graduation) | DATA | **EXECUTE** | Drives food/supervision/entertainment/alcohol. |
| 10 | Add parking & arrival plan (Graduation/BBQ) | DATA | **EXECUTE** | Big-crowd failure point; pure data. |
| 11 | One-next-decision sequencing for decisions (Attention System) | SURFACING (runtime) | **TEST** | Right direction; validate the ordering UX with a real host first. |
| 12 | Signature-moment / personalization prompt per event | DATA | **TEST** | High planner-credibility upside; confirm it doesn't add overwhelm. |
| 13 | Guest-comfort layer (restroom/coats/temperature) | DATA | **TEST** | Clear Cowie-standard gap; validate it reads as helpful, not fussy. |
| 14 | Name tags / gift log / guest book lines | DATA | **TEST** | Event-dependent value; confirm per type. |
| 15 | Power-load / circuit planning guidance | DATA | **TEST** | Valuable for big/outdoor events; verify it's not over-engineering for a backyard. |
| 16 | Co-host / helper role assignment | DATA | **TEST** | Real for big events; validate it fits the solo-host default. |
| 17 | Foreground verification pass to lift 55D books from `synthesized` → `cited` | PROCESS | **PARK** | Important for trust, but behind closing the execution gaps; run after EXECUTE items land. |
| 18 | Décor cohesion / lighting "moment" (Bailey-grade design layer) | DATA | **PARK** | Genuine upside; lower priority than execution correctness for first-timers. |
| 19 | Expand to Wedding / Corporate / Gala / Fundraiser / Conference | SCOPE | **PARK** | Gated on host books passing this audit (the explicit precondition). |
| 20 | Full vendor/BEO production module (load-in orders, staffing ratios) | SCOPE | **KILL (for host playbooks)** | Belongs to the pro/vendor track, not the first-time-host host-playbook tier. |

---

## Final verdict

**Have the host playbooks earned the right to become the Event-OS foundation? — Not yet; close to it.**

The **data** is a credible B: the decision spine, dependencies, dietary/food-safety discipline, make-ahead doctrine, and contingencies are real and largely correct. The **executed experience** is a C, for one structural reason and one content reason:

- **Structural:** the runtime surfaces purchases only and ignores the authored decision/dependency/timeline/contingency layer — so the system teaches *what to buy*, not *what to do next*, and can put buying ahead of the decision that justifies it.
- **Content:** a consistent host-infrastructure class (power, sterno, thermometer, serving/grill tools, bathroom, parking) is missing, and a few quantities (alcohol, hot-weather ice, buffers) need correction.

Closing recommendation table items **#1–#10 (all EXECUTE)** — six runtime-surfacing fixes and four data fixes — would move the executed experience from C to a defensible A-minus and let a true first-timer host a professionally-felt event. **Only then** should the system expand into Wedding/Corporate/Gala/Fundraiser/Conference. The host books should earn the foundation by passing this bar first — which, with the EXECUTE set, they can.

*Audit only — nothing in this document has been built, authored, or changed.*
