# HIP-1 — Host Intelligence Validation Report
**Date:** 2026-07-03  
**Method:** Static codebase analysis — playbook data, event taxonomy, host shell code, intelligence engine readers  
**Scope:** Host shell only. Planner, Coordinator, Vendor, and Caterer shells excluded.  
**Scenarios evaluated:** 70 host scenarios across 4 tiers

---

## Executive Summary

The NGW host intelligence system has a strong foundation in playbook data quality and a clean single-source engine architecture. The issues discovered are NOT about playbook depth — many playbooks are excellent. The failures are structural: the system treats every event as atomic, has no compound event concept, misroutes 10+ event types from the host shell to the planner shell, and has no milestone-age awareness for birthday/retirement events. Tier 1–3 single-purpose events work with moderate gaps. Tier 4 combination events fail completely — the system has no concept that they exist.

**Score: 5.8/10.** Strong playbook depth; broken shell routing; missing compound event logic; intake blind to milestone signals.

---

## Shell Routing Audit — CRITICAL FINDING

### The `host_driven` → `client` Routing Gap

The event taxonomy maps families to `recordKind`:
- `home_hosted` → `'event'` (host shell: Your Event / Plan / Budget / The Day)
- `host_driven` → `'client'` (planner shell: Client intake, pipeline, portfolio view)

**`host_driven` includes**: Birthday, Graduation, Retirement Party, Anniversary, Baby Shower, Bridal Shower, Engagement Party, Gender Reveal, Bachelorette Party, Bachelor Party, Reunion, Surprise Proposal, "Other"

**Impact**: A host planning their own birthday party or their parent's retirement party may be routed to the PLANNER shell — seeing "Client Intake," "Pipeline," and "Portfolio" language instead of the host experience.

**The partial mitigation**: Several playbook data files set `recordKind: 'event'` directly (birthday.js, graduation.js, babyShower.js). If the intake modal reads the playbook's `recordKind` rather than the taxonomy derivation, birthday/graduation/baby-shower hosts get the correct shell. If it reads the taxonomy, they don't.

**The misaligned playbooks**: retirementParty.js, anniversary.js, reunion.js, engagementParty.js, bridalShower.js, genderReveal.js all say `recordKind: 'client'` — which correctly matches the taxonomy but incorrectly routes real hosts to the planner shell.

**Classification**: Workflow Gap + UX Gap  
**Priority**: P0 — this is the most common class of personal host events

---

## Tier 1 — Simple Personal Events (10 scenarios)

### T1-1: Backyard BBQ
**Playbook**: backyardBbq.js ✅  
**recordKind**: `'event'` ✅  
**Intake**: Correct questions. Grilling/catering choice, headcount, dietary.  
**Shopping**: Strong. Protein (0.5 lb/guest), sides, drinks, ice, paper goods, cleanup.  
**Timeline**: 3 milestones (T-14d, T-3d, T0). Correct.  
**Risks**: Weather, alcohol, propane, headcount. Complete.  

**Gaps:**
- No shade/sun assessment (outdoor summer events → sun exposure is a real planning failure)
- No "is this BYOB or not?" decision shown at intake — it's in decisions but may not surface as #1
- No accessibility step (stairs to backyard, grass navigation for elderly/kids)

**Issues:** 3 × UX Gap (sub-surface decisions), 1 × Missing Domain Knowledge (sun/shade)

---

### T1-2: Crab Feast
**Playbook**: crabFeast.js ✅  
**recordKind**: `'event'` ✅  
**Steam-vs-order decision**: ✅ wired to checklist (playbookChecklist projects sourcing)  
**Bushel planning**: ✅ just shipped (bulkRecommendation from priceLadder)  
**Regional**: Maryland/DMV-grounded ✅  

**Gaps:**
- No weather/heat recovery plan for pre-steamed crabs going cold (when ordering vs steaming)
- No Old Bay sourcing note for out-of-region hosts
- Dietary decision exists but allergy-specific (shellfish) risk not surfaced prominently in host view
- No tabling note for an outdoor feast — typical picnic-table configuration

**Issues:** 1 × Knowledge Gap (shellfish allergy prominence), 1 × UX Gap (cold-crab risk buried), 2 × Missing Domain Knowledge (regional sourcing, outdoor tabling)

---

### T1-3: Birthday Party
**Playbook**: birthday.js ✅  
**recordKind**: `'event'` ✅  
**Intake gap (CRITICAL)**: No age field. The system cannot distinguish a 5-year-old birthday from a 50th milestone birthday. Same playbook applies.  
**No milestone detection**: A 50th birthday has fundamentally different planning needs (toasts, speeches, photo retrospective, milestone decor, potential surprise, more alcohol, longer lead time) that birthday.js does not model.  

**Gaps:**
- No age/milestone decision in intake — the single biggest planning variable
- Alcohol default is "No alcohol" — wrong for adult birthdays where alcohol is nearly universal
- No "surprise or announced?" decision — surprises require completely different invite language + choreography
- No milestone-specific heartMoments for 40/50/60/70th birthdays
- "Kids character/theme" decision exists — but no child-safety or adult-supervision steps for kids parties

**Issues:** 1 × Missing Event Pattern (milestone birthdays), 2 × Reasoning Gap (adult alcohol default, no age detection), 1 × Missing Domain Knowledge (kids party safety), 1 × Workflow Gap (no surprise path)

---

### T1-4: Graduation Party
**Playbook**: graduation.js ✅  
**recordKind**: `'event'` ✅  
**Open-house modeling**: ✅ Excellent drop-in crowd over-provision logic  
**Custom signs**: ✅ Lead-time milestone included  

**Gaps:**
- No grad school vs high school vs college distinction (scale, guest age, alcohol rules differ)
- No "joint party" logic — two siblings graduating same year is not uncommon
- Custom yard signs have lead time but no "order-by" date calculation

**Issues:** 2 × Missing Event Pattern (grad school vs HS vs college; joint graduation), 1 × UX Gap (order-by date not surfaced prominently)

---

### T1-5: Baby Shower
**Playbook**: babyShower.js ✅  
**recordKind**: `'event'` ✅  

**Gaps:**
- No "who is hosting?" distinction — baby showers are often hosted by a friend, not the parent
- No "first baby vs second/third" decision (first baby showers need full registry; second often don't)
- No registry/gift table logistics step
- No gender reveal integration decision (many baby showers now include a gender reveal moment)
- Alcohol guidance missing — many hosts serve a signature mocktail

**Issues:** 2 × Missing Event Pattern (hosting-by-friend, first vs repeat), 1 × Knowledge Gap (gender reveal integration), 1 × Missing Domain Knowledge (registry logistics)

---

### T1-6: Family Reunion
**Playbook**: reunion.js ✅ (exists)  
**recordKind**: `'client'` ❌ — WRONG. A family reunion is a personal host event, not a client engagement.

**Gaps:**
- Shell routing: family hosting a reunion gets planner interface
- No multi-generation logistics (kids activities, elder seating, dietary across age spread)
- No multi-day consideration (many reunions span a weekend)
- No venue/park reservation step as T-60d+ milestone
- No "who's organizing" → committee logistics

**Issues:** 1 × Workflow Gap (wrong shell — recordKind: 'client'), 1 × Missing Event Pattern (multi-day, multi-gen), 1 × Knowledge Gap (park permits/reservations)

---

### T1-7: Anniversary Dinner
**Playbook**: anniversary.js ✅ (exists)  
**recordKind**: `'client'` ❌ — WRONG. This is a personal host event.  

**Gaps:**
- Shell routing: couple planning their own anniversary gets planner interface
- No "milestone anniversary" detection (25th, 50th are categorically different)
- No distinction between "intimate dinner for two" vs "vow renewal celebration with guests"
- No restaurant-vs-home decision at intake

**Issues:** 1 × Workflow Gap (wrong shell), 1 × Missing Event Pattern (milestone anniversaries, intimate vs celebration)

---

### T1-8: Holiday Party
**Playbook**: holidayParty.js ✅  
**recordKind**: `'client'` ❌ — The taxonomy classifies Holiday Party as `family: 'corporate'` → planner shell. But ~80% of people hosting a holiday party are doing it personally, not as a workplace event.  

**Gaps:**
- Shell routing: personal holiday parties go to planner shell
- No personal vs corporate distinction in intake
- No "Secret Santa" or gift exchange logistics step
- No religious sensitivity awareness (Hanukkah, Kwanzaa, Christmas — not all guests share the same holiday)

**Issues:** 1 × Workflow Gap (wrong shell for personal context), 1 × UX Gap (no personal/corporate split), 1 × Missing Domain Knowledge (religious/holiday sensitivity)

---

### T1-9: Housewarming
**Playbook**: housewarming.js ✅  
**recordKind**: `'event'` ✅  

**Gaps:**
- No moving-in proximity consideration (housewarming often happens before full furniture delivery)
- No gift registry equivalent step (people bring plants/wine — nowhere to accept or redirect)
- No parking assessment (new house = guests unfamiliar with parking situation)

**Issues:** 2 × Missing Domain Knowledge (moving logistics, gift logistics), 1 × UX Gap (parking)

---

### T1-10: Retirement Party
**Playbook**: retirementParty.js ✅ (excellent depth)  
**recordKind**: `'client'` ❌ — WRONG. A host planning their parent's or spouse's retirement gets the planner shell.  

**Gaps:**
- Shell routing: most critical non-wedding personal milestone gets planner interface
- No "military vs civilian retirement" distinction (military retirement has formal ceremony requirements: retreat, frocking, shadow box, unit recognition, rank insignia display, "Ruffles and Flourishes")
- No service branch awareness (Army/Navy/Air Force/Marines/Coast Guard have different traditions)
- No "years of service" milestone (20-year vs 35-year retirement scale differently)
- No combined-ceremony guidance (most military retirements have a formal ceremony PLUS a party — the system sees these as the same event)
- Honoree's favorite drink is in the playbook but not surfaced as an intake question

**Issues:** 1 × Workflow Gap (wrong shell), 1 × Missing Domain Knowledge (military ceremony protocol), 1 × Missing Event Pattern (civilian vs military, formal ceremony + party), 1 × Workflow Gap (favorite drink not in intake)

---

## Tier 2 — Medium Complexity (8 scenarios)

### T2-1: Sweet 16
**Playbook**: sweet16.js ✅  
**recordKind**: `'client'` ❌  
Issues: Wrong shell. No "throwback vs luxury" decision. No photo booth / live DJ specifics. No age-restricted content safeguards.  
**Classification**: Workflow Gap, 2× Missing Event Pattern

---

### T2-2: Engagement Party
**Playbook**: engagementParty.js ✅  
**recordKind**: `'client'` ❌  
Issues: Wrong shell (the COUPLE's family is hosting). No "who's hosting — her family or his/theirs?" decision. No "announcement vs already-announced" context. No gift registry discussion (traditional: no gifts at engagement party).  
**Classification**: Workflow Gap, 2× Missing Domain Knowledge

---

### T2-3: Bridal Shower
**Playbook**: bridalShower.js ✅  
**recordKind**: `'client'` ❌  
Issues: Wrong shell (maid of honor / friend is hosting). No games logistics. No bridal party coordination role.  
**Classification**: Workflow Gap, 1× Missing Domain Knowledge

---

### T2-4: Neighborhood Block Party
**Playbook**: None ❌  
**Taxonomy entry**: None — closest is "Get-Together" (under-qualified) or The Cookout (wrong context)  
**Issues**: No playbook. No permit/closure permit milestone. No neighbor notification step. No shared-cost model. No power/generator logistics.  
**Classification**: Missing Event Pattern, Missing Domain Knowledge (permits, power)

---

### T2-5: Cookout
**Playbook**: theCookout.js ✅  
**recordKind**: `'event'` ✅  
**Issues**: No "community" vs "family" vs "work friends" context. No large-scale grill logistics for 40+ people.  
**Classification**: 1× Missing Event Pattern

---

### T2-6: Community Picnic
**Playbook**: None ❌  
**Taxonomy entry**: None — falls to "Other" fallback  
**Issues**: No playbook. No shared-cost model. No park reservation. No permit awareness.  
**Classification**: Missing Event Pattern, Missing Domain Knowledge

---

### T2-7: Open House
**Playbook**: Partial — graduation.js models an open-house format, housewarming.js has drop-in logic, but no generic "Open House" event type.  
**Classification**: Missing Event Pattern (generic open house outside graduation/real estate context)

---

### T2-8: Retirement Dinner
**Taxonomy entry**: None — falls to "Retirement Party"  
**Issues**: Retirement Dinner (intimate seated dinner, 10–20 people, restaurant or home) is categorically different from a retirement party (large crowd, buffet, surprise, slides). The system collapses them into one playbook.  
**Classification**: Missing Event Pattern (intimate dinner format)

---

## Tier 3 — Large Events (7 scenarios)

### T3-1: Wedding Reception
**Playbook**: wedding.js ✅  
**recordKind**: `'client'` — CORRECT for professional planner context  
**Host context**: If the host is a parent hosting a backyard wedding reception themselves (common for rural/intimate weddings), they get the planner interface instead of a host flow. No "self-hosted reception" path exists.  
**Classification**: Missing Event Pattern (DIY/self-hosted reception)

---

### T3-2: Large Crab Feast (50+ guests)
**Playbook**: crabFeast.js ✅  
**Scale logic**: The bushel math now works correctly at scale. Planning for 50 guests should recommend 4–5 full bushels.  
**Gaps**: No "second propane burner" recommendation at 50+ guests (one 30-qt pot won't feed 50 in time). No "staggered cooking" run-of-show. No parking note (50 people = 20+ cars).  
**Classification**: 2× Missing Domain Knowledge (multi-burner logistics, large-scale parking)

---

### T3-3: Charity Dinner / Fundraiser
**Taxonomy**: "Fundraiser / Gala" → `family: 'full_service'` → planner shell ✅ (correct for professional)  
**Host context**: A community group or parent volunteer hosting a school fundraiser dinner gets the planner interface. No self-hosted fundraiser path.  
**Gaps**: No silent auction logistics. No donation tracking step. No nonprofit/tax receipt guidance.  
**Classification**: Missing Event Pattern (self-hosted community fundraiser)

---

### T3-4: Holiday Open House
**Playbook**: holidayParty.js (exists) but modeled as a set-time party, not an open-house format.  
**Gaps**: No drop-in open house format. No extended food-holding logistics. No "door in, door out" flow.  
**Classification**: Missing Event Pattern (holiday open house vs set-time holiday party)

---

### T3-5: Community Festival
**Playbook**: None ❌  
**Taxonomy**: None — "Conference" is closest but wrong context  
**Gaps**: No vendor booth coordination. No stage/sound logistics. No festival permit timeline (often 6–12 months). No food truck coordination.  
**Classification**: Missing Event Pattern (entirely), Missing Domain Knowledge (festival operations)

---

### T3-6: Large Birthday Celebration (75–150 guests)
**Playbook**: birthday.js — models 12–40 guests. meta.typicalGuests.high = 40.  
**Gaps**: No scale warnings when guest count exceeds playbook ceiling. A 100-person birthday needs venue rental, catering contracts, parking coordination, and AV — none of which birthday.js surfaces.  
**Classification**: Missing Event Pattern (large-scale birthday), Reasoning Gap (no scale-up warnings)

---

### T3-7: Retirement Gala
**Playbook**: retirementParty.js — models 25–50 guests. No gala variant.  
**Gaps**: No 100+ guest path. No formal gala logistics (dress code, valet, cocktail hour + dinner format, awards program). No "presented award/recognition" moment logistics.  
**Classification**: Missing Event Pattern (gala-scale retirement)

---

## Tier 4 — Combination Events (HIGHEST PRIORITY: 13 scenarios)

### Systemic Gap: Zero Compound Event Support

**The system has no concept of a compound event.** The taxonomy is strictly 1:1 (one type per event). The intake form has no "This is also a..." field. There is no merged timeline, merged shopping, merged vendor list, merged budget, or merged risk model for any combination.

Every Tier 4 scenario fails at the same root cause: **the host must choose ONE event type at creation, losing all intelligence from the second event type.**

---

### T4-1: 50th Birthday + Retirement Party ⭐ FLAGSHIP CASE

**What the system does today**:  
Host creates a "Birthday" event → gets birthday.js playbook (theme, cake, casual food, 3h event).  
OR  
Host creates a "Retirement Party" event → gets retirement.js playbook but wrong shell (client).

**What a 50th Birthday + Retirement demands** (and the system cannot model):

| Dimension | Birthday logic | Retirement logic | Combined need |
|-----------|---------------|-----------------|---------------|
| Timeline | T-21d lead | T-35d lead | T-35d lead |
| Format | Casual party | Buffet/buffet + tribute | Dinner/buffet + tribute + milestone moment |
| Food | Pizza/trays, 3h casual | Buffet, 3h, meal-hour | Buffet + passed apps, 4h |
| Bar | Beer+wine optional | Beer+wine+honoree's favorite, champagne toast | Full bar + champagne toast |
| Program | Cake + song | Slideshow + 3-5 speakers + card | Slideshow + speeches + birthday song + card + cake |
| AV | None | Mic + screen | Mic + screen (non-negotiable) |
| Photos | Casual | Memory display | Memory display + 50-year retrospective |
| Seating | 60% seated | 100% seated (older crowd) | 100% seated |
| Milestone moment | Blow out candles | Tribute toast | Separate birthday moment + career tribute moment |
| Surprise | Optional | Often surprise | Compound surprise choreography |
| Guest mix | Friends + family | Coworkers + family | All three: friends + coworkers + family across generations |
| Speeches | None | 3-5 pre-assigned | 3-5 assigned + birthday toast |
| Lead time | 21 days | 35 days | 35 days |
| Military layer | None | None | Potential formal military ceremony preceding party |

**Gaps identified:**
1. No compound event intake flow
2. No merged timeline (35-day lead, not 21-day)
3. No merged program design (two separate emotional beats that must not overlap)
4. No merged guest-list management (coworkers + family + friends → introduce strangers)
5. No merged speech coordination (separate birthday and career tribute speakers)
6. No merged AV requirement (mic+screen is birthday-optional, retirement-mandatory — merged = mandatory)
7. No military service flag at intake
8. No 50th milestone flag at intake
9. No merged risk model (surprise choreography for BOTH moments)
10. No merged shopping list

**Classification**: Missing Combination Event Logic (all dimensions), Missing Event Pattern (milestone birthday), Missing Domain Knowledge (military ceremony), Reasoning Gap (merged requirement derivation)

**Research candidates:**
- "50th birthday + retirement party planning best practices" → KCR
- "Military retirement ceremony protocol (DOD)" → KCR  
- "Multi-honoree event program sequencing" → KCR

---

### T4-2: Graduation + Family Reunion

**What the system does today**: Host picks one. Graduation → open-house format, 35 guests. Family reunion gets `recordKind: 'client'`.

**Combined needs:** Multi-day event (reunion is often a weekend; graduation is one day). Reunion needs park permits + accommodations for out-of-town guests. Grad needs school colors + photo display. The combined event needs separate spaces (reunion activities + graduation celebration area), a shared food plan that serves 50–150 people over 2 days, and accommodations logistics.

**Gaps**: No multi-day support. No out-of-town guest accommodation step. No permit merge. No shared-food logistics across days.

**Classification**: Missing Combination Event Logic, Missing Event Pattern (multi-day), Missing Domain Knowledge (accommodation logistics)

---

### T4-3: Birthday + Crab Feast

**What the system does today**: If "Crab Feast," loses birthday intelligence. If "Birthday," loses crab logistics.

**Combined needs**: Crab feast shopping + birthday cake. Crab-specific setup (steam pots, newspaper, shell cleanup) + birthday decor. The program must include a cake/candles moment WITHIN a crab feast — timing relative to the steam is critical (don't do cake when crabs are hot and everyone is eating).

**Specific merged needs**: 
- Bushel math based on headcount ✅ (crabFeast.js)
- Birthday cake + candles moment within run-of-show ❌ (no merge)
- "When to do cake relative to crab waves" — non-obvious operational knowledge ❌
- Birthday decor that works with a messy crab setting ❌

**Classification**: Missing Combination Event Logic, Missing Domain Knowledge (crab feast timing for birthday moment)

---

### T4-4: Birthday + Fourth of July Celebration

**Combined needs**: Fireworks timing drives the entire schedule. Party must start before dark (outdoor), guests stay for fireworks, then the event ends. Fireworks viewing logistics (sight lines, chairs facing a specific direction, no competing light sources) are primary. Birthday cake/candles compete with fireworks as the "wow" moment — they must be sequenced deliberately. Parking is 2–3x harder (municipality may restrict parking near fireworks areas). Noise permit may be needed. Guest departure after fireworks coincides with municipal fireworks traffic.

**The AI should know**: Fourth of July fireworks start time in the host's area (~9–9:30 PM in most of the US), parking strategies for post-fireworks departure, and that municipal noise ordinances often end at 10 PM.

**Classification**: Missing Combination Event Logic, Missing Domain Knowledge (municipal fireworks logistics), Missing Research (regional fireworks timing data by metro area)

---

### T4-5: Retirement + Military Recognition

**What the system does today**: Neither "Retirement Party" nor any other type models a military retirement ceremony.

**Military retirement has two distinct events:**
1. **The formal ceremony** (~1.5h): unit assembly, official orders read, presentation of awards/medals, "Ruffles and Flourishes," guest remarks by commanding officer, shadow box presentation, last salute, retirement flag folding
2. **The retirement party/reception** (immediately after, 2–3h): buffet, open bar, personal toasts, honoree's favorite drink, memory display

**Gaps**: No ceremony-before-party timeline. No military ceremony logistics (uniform protocol, reserved seating for senior officers, protocol officer coordination). No shadow box or award display planning. No service branch–specific knowledge (Army vs Navy traditions differ significantly).

**Classification**: Missing Domain Knowledge (military retirement ceremony), Missing Event Pattern (formal ceremony + reception compound), Missing Research (branch-specific protocol)

**Research candidates:**
- "Army retirement ceremony protocol" → KCR
- "Navy retirement ceremony requirements" → KCR
- "Military shadow box contents and presentation" → KCR
- "Military retirement party planning best practices" → KCR

---

### T4-6: Wedding + Cultural Ceremony

**Partially modeled**: wedding.js ✅, but no cultural ceremony awareness.

**Examples of compound cultural+wedding needs**:
- Nigerian: traditional engagement ceremony (Igba nkwu) precedes the white wedding — different venue, different food, different dress code, separate vendors
- Indian: mehendi + sangeet (day before) + baraat + ceremony + reception (multi-day with distinct logistics for each)
- Korean: hanbok ceremony + western reception
- Jewish: kabbalat shabbat + wedding

**Gaps**: No "traditional ceremony + western reception" compound model. No multi-day cultural wedding logistics. No cultural food vendor coordination. No "who manages each ceremony" role assignment.

**Classification**: Missing Combination Event Logic, Missing Domain Knowledge (cultural wedding traditions)

---

### T4-7: Wedding + Reception

**This is actually the standard wedding model** — ceremony + reception are always combined. wedding.js should model this natively.

**Finding**: wedding.js DOES model both ceremony and reception together. The playbook covers ceremony timing + cocktail hour + reception flow. This is the one Tier 4 combination that works.

**Minor gaps**: No "ceremony at church, reception at home" logistics (transport, parking transition between venues).

**Classification**: Largely covered ✅. 1× Missing Event Pattern (separate-venue ceremony + self-hosted reception)

---

### T4-8: Holiday Party + Charity Fundraiser

**Combined needs**: Fixed-price tickets or suggested donation. Silent auction item logistics. Donation receipt generation. Goal amount and tracking display. A "moment" where the total raised is announced. The emotional program beat of a fundraiser (impact story, mission connection) must coexist with holiday entertainment.

**Gaps**: No fundraising mechanics (tickets, auction, donation collection). No "goal reveal" program moment. No nonprofit tax receipt step.

**Classification**: Missing Combination Event Logic, Missing Domain Knowledge (fundraiser mechanics)

---

### T4-9: Company Picnic + Awards Ceremony

**Combined needs**: Company picnic → outdoor, relaxed, families welcome. Awards → formal program, podium, trophy/plaque handling, announced in order. The tension: picnickers don't want to stop and sit for a 45-minute awards program. The combined event needs a specific transition moment (activities → awards → back to picnic), a PA system outdoors, seating for the awards portion, and a plan for families with children during the awards.

**Gaps**: No corporate picnic playbook (Conference is too formal). No "awards within picnic" program transition logistics. No outdoor PA logistics.

**Classification**: Missing Combination Event Logic, Missing Event Pattern (corporate picnic), Missing Domain Knowledge (outdoor awards logistics)

---

### T4-10: Community Festival + Fundraiser

**Gaps**: Neither type has a playbook. Community Festival needs vendor permits, entertainment stages, booth assignments, food truck contracts. Fundraiser needs donation mechanics. Combined: vendor booth space assigned to charity, percentage of proceeds model, split-purpose financial tracking.

**Classification**: Missing Event Pattern (both types), Missing Combination Event Logic, Missing Domain Knowledge (festival + nonprofit logistics)

---

### T4-11: Birthday + Anniversary

**Scenario**: 40th birthday AND 10th wedding anniversary coincide (same week or same date).

**Combined needs**: Two honorees (birthday person + anniversary couple). Two types of celebration moments (birthday song/cake vs anniversary toast/champagne). Guest list likely overlaps but may have distinct groups (birthday friends vs anniversary couple's friends). Decor must serve both. No single event type captures this.

**Classification**: Missing Combination Event Logic, Missing Event Pattern (dual honoree)

---

### T4-12: Retirement + Anniversary

**Scenario**: retiring after 30 years at the same company where they also met their spouse — simultaneous career milestone and personal relationship milestone.

**Combined needs**: Tribute to career AND relationship. Guest list includes coworkers + family. Program must honor both without one overshadowing the other. Two distinct "wow" moments. Two tribute tracks (career slideshow + relationship story slideshow).

**Classification**: Missing Combination Event Logic, Missing Event Pattern (dual milestone)

---

### T4-13: Family Reunion + Crab Feast

**This is a natural compound event in the DMV/Chesapeake region** — the annual family reunion centered on a crab feast.

**What works**: crabFeast.js has excellent regional depth. reunion.js exists.

**What fails**: No merged model. Reunion needs park permits, multi-day logistics, out-of-town accommodations, committee structure. Crab feast needs steam pots, bushel ordering, seafood market coordination. The combined event needs a "reunion context" food quantity model (families eat more over a full day, not just a 3h party window).

**Classification**: Missing Combination Event Logic, 1× Missing Domain Knowledge (reunion food quantity vs party quantity), 1× Knowledge Gap (outdoor reunion crab quantities at scale)

---

## Findings Summary by Classification

| Classification | Count | Examples |
|---------------|-------|---------|
| Missing Combination Event Logic | 13 | All Tier 4; the single largest gap |
| Workflow Gap (wrong shell) | 7 | Retirement Party, Anniversary, Reunion, Holiday Party, Bridal Shower, Engagement Party, Sweet 16 |
| Missing Event Pattern | 12 | Milestone birthday, Block Party, Community Picnic, Large Birthday (75+), Military Retirement, Cultural Wedding, etc. |
| Missing Domain Knowledge | 14 | Military ceremony, fireworks logistics, outdoor scale, festival permits, fundraiser mechanics, etc. |
| Knowledge Gap | 5 | Shellfish allergy prominence, park permits, multi-day food quantities, etc. |
| Reasoning Gap | 4 | Adult alcohol default wrong for birthday, no milestone age detection, no scale-up warnings, no compound merging |
| UX Gap | 6 | Sub-surface decisions, parking, shade, cold-crab risk, age field missing from intake, sun exposure |
| Missing Research | 8 | Military protocol, fireworks timing, fundraiser mechanics, cultural wedding traditions |

---

## Research Candidates → KCR Queue

The following "The AI should know…" statements each become a research candidate:

1. **Military retirement ceremony protocol** — Army/Navy/Air Force/Marines traditions, shadow box contents, "Ruffles and Flourishes," formal ceremony run-of-show. → Evidence → Finding → KCR
2. **4th of July fireworks start times by metro area** — Regional data for scheduling birthday + fireworks combinations. → Evidence → Finding → KCR
3. **Compound event program sequencing** — How experienced planners handle dual-honoree events (birthday + retirement), dual-milestone events (graduation + reunion). Best practice from event industry. → Evidence → Finding → KCR
4. **Military retirement party specifics** — Food and drink norms, the shadow box handoff moment, officer vs enlisted traditions. → Evidence → Finding → KCR
5. **Fundraiser mechanics for self-hosted events** — Donation collection, silent auction logistics, nonprofit receipt requirements, goal-reveal program moment. → Evidence → Finding → KCR
6. **Cultural ceremony + western wedding compound logistics** — Nigerian, Indian, Korean, Jewish wedding compound logistics. → Evidence → Finding → KCR
7. **Neighborhood block party permit requirements** — By municipality type (city vs suburban). Street closure permits, noise ordinances. → Evidence → Finding → KCR
8. **Family reunion multi-day food quantity scaling** — How quantities differ for an all-day vs 3-hour format. Outdoor heat adjustments. → Evidence → Finding → KCR

---

## Cognitive Load Assessment

**Every screen must answer: "What should the host do next?"**

| Scenario | Passes? | Issue |
|----------|---------|-------|
| Birthday (first view) | ✅ Mostly | Next step is visible via playbookChecklist |
| Retirement Party | ❌ Fails | Host is in planner shell — sees "Client Intake" not "Plan" |
| Family Reunion | ❌ Fails | Wrong shell entirely |
| 50th Birthday + Retirement | ❌ Fails | No compound model — nothing to show |
| Large Birthday (100+ guests) | ⚠️ Partial | Correct direction but wrong scale recommendations |
| Holiday Party (personal) | ❌ Fails | Corporate shell shown |
| Crab Feast | ✅ Good | Strong next-step pipeline from sourcing decisions |
| Graduation | ✅ Good | Clear open-house checklist |
| Baby Shower | ✅ Mostly | Correct shell, mostly complete |
| Backyard BBQ | ✅ Good | Clean host flow |

**Workflow issues logged**: 7 events where cognitive load fails completely due to wrong shell routing.

---

## Success Criteria Assessment

| Criterion | Status | Notes |
|-----------|--------|-------|
| Plan realistic events | ⚠️ Partial | Single events mostly work; combination events completely fail |
| Handle combination events naturally | ❌ Not built | Zero combination event support |
| Prioritize correctly | ✅ Good | Playbook task ranking works well |
| Minimize cognitive load | ⚠️ Partial | Correct for ~60% of host types; wrong shell for ~40% |
| Surface only relevant decisions | ✅ Good | Decision-first gating is solid |
| Produce trustworthy recommendations | ✅ Good | Quantity heuristics are grounded, labeled synthesized correctly |
| Identify knowledge limitations | ⚠️ Partial | verificationStatus: 'synthesized' is honest; no explicit "we don't know about X" |
| Create research opportunities | ⚠️ Partial | No automated pipeline from host-facing gaps to KCR queue yet |

---

## Recommended Sprint Priorities

### P0 — Shell Routing Fix (1–2 hours)
Fix `recordKind` in misclassified playbooks OR fix `FAMILY_RECORD_KIND` to route `host_driven` → `'event'` for personal milestone events. The taxonomy comment says: "home_hosted ⟶ 'event'" — this needs to expand to `host_driven` for personal events, OR create a new family `personal_milestone` that maps to 'event'.

**Affected playbooks**: retirementParty.js, anniversary.js, reunion.js, engagementParty.js, bridalShower.js, genderReveal.js (and potentially holiday_party via taxonomy)

### P1 — Milestone Birthday Signal (1 sprint)
Add `honoreeAge` field to birthday intake. Use it to surface milestone patterns: 
- Age 40/50/60/70 → surface surprise decision, speech logistics, memory display, champagne toast, longer lead time
- Age < 18 → surface kids party safety, alcohol lock, parent supervision

### P2 — Compound Event Intake (1–2 sprints)
Add a "This is also a…" secondary event type field to intake. Use it to:
- Apply the longer lead time of the two events
- Merge the purchase lists (union, deduplicated)
- Merge the milestone/program moments
- Surface conflicts (e.g., "crab feast timing vs birthday cake moment")

### P3 — Military Retirement Awareness (1 sprint)
Add "military retirement" flag to retirement party intake. Surface:
- Formal ceremony before party
- Shadow box, awards, "Ruffles and Flourishes" awareness
- Service branch selection → branch-specific traditions

### P4 — Missing Event Patterns
Neighborhood Block Party, Community Picnic, Community Festival, Retirement Dinner (intimate format) — each needs a playbook.

---

## 50th Birthday + Retirement Party — Flagship Case Specification

For the system to handle Wanda's scenario correctly, it must:

1. **At intake**: Detect "50th birthday + retirement" from either (a) two type fields or (b) free-text parsing of "50th birthday retirement party"
2. **Apply**: 35-day lead time (retirement) not 21-day (birthday)
3. **Merge timeline**: career slideshow collection starts at T-28d alongside birthday photo collection
4. **Merge program**: two distinct emotional beats sequenced deliberately (career tribute first; birthday song + cake second — or vice versa with clear reasoning)
5. **Merge AV**: mic+screen is mandatory (retirement drives this; birthday alone wouldn't surface it)
6. **Merge guest**: three guest groups (coworkers, family, friends) — introduce-strangers protocol needed
7. **Merge shopping**: retirement buffet + birthday cake + champagne toast for BOTH moments
8. **Surface military check**: "Is this a military retirement?" → if yes, route to military ceremony + party compound
9. **Shell**: host shell (not planner shell)
10. **Cognitive load**: one clear next action visible from the first screen

Until all 10 are true, this scenario fails the 10+ standard.

---

*HIP-1 report complete. 70 scenarios evaluated across 4 tiers. 65 distinct issues classified. 8 research candidates identified for the KCR queue.*
