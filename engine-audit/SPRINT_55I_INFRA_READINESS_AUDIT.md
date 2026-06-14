# Sprint 55I — Infrastructure Readiness Audit (Host Playbooks)

*Code-grounded. Scope: Dinner Party, Birthday, Baby Shower, Get-Together/BBQ, Graduation. The question: if a complete beginner hosted one of these using **only** NGW guidance, would they succeed — and what would a professional planner immediately notice is missing? Operational reality, not feature ideas. Supersedes the lighter 55H infra audit.*

**Classification:** **A** = modeled **and surfaced** · **B** = modeled but **hidden** · **C** = **implied / derivable** from existing data · **D** = **missing**.

**The headline (Pattern 003/007/008 lens):** NGW now surfaces the *soft* planning layer well — decisions (55G), run-of-show (B1/B2R), capacity (B3A). It is **dark or absent on the physical-infrastructure layer** — power, parking, restrooms, food-safety enforcement, injury/emergency, lighting. A beginner would cook a good meal on time and **trip a breaker, run out of parking, leave food in the danger zone, and have no plan when someone burns a hand.**

---

## Part 1 — Infrastructure coverage matrix

*Default cell = the classification common to all 5; **bold** notes per-playbook exceptions. "Surfaced" means a runtime surface shows it today.*

### Venue & Flow
| Item | Class | Notes |
|---|---|---|
| Guest arrival flow | **A** | run-of-show "Guests arrive"/doors (B1/B2R) — surfaced |
| Parking | **D** | absent from all 5 (only an intake accessibility chip) |
| Wayfinding | **D** | none |
| Entry experience / greeting | **C** | implied (arrival segment); no "greet with a drink" beat |
| Coat management | **D** | none (indoor Dinner/Shower need it) |
| Queue management | **C** | implied for buffets (Graduation/Shower "line/flow"), not modeled |
| Traffic flow | **C** | buffet flow implied (Graduation r_flow); else none |
| Indoor/outdoor transition | **B** | rain→indoors in contingencies (BBQ/Birthday/Grad), hidden |

### Power & Equipment
| Item | Class | Notes |
|---|---|---|
| Extension cords | **D** | none |
| Power strips | **D** | none |
| Generator | **D** | none |
| Outlet access | **D** | none |
| Charging | **D** | **Birthday C** (speaker/playlist implied) |
| Lighting power | **D** | none |
| Audio power | **D** | **Birthday C** (speaker) |
| Cooking fuel (grill) | **A/B** | **BBQ A** (charcoal/propane is a purchase + check); not "power" |

### Food Service
| Item | Class | Notes |
|---|---|---|
| Food holding (general) | **B** | reheat/hold steps in run-of-show (Dinner surfaced) |
| Hot holding (chafers) | **B** | **Graduation A** (chafers in rentalsGap→Capacity); **Birthday/BBQ D** |
| Cold holding | **C** | ice tub/cooler implied (Dinner/BBQ); not a "hold cold" step |
| Serving utensils | **A** | in rentalsGap → B3A Capacity row — surfaced |
| Replenishment | **B** | **Graduation A/B** (resupply runner authored); others C/D |
| Beverage stations | **B** | run-of-show setup "drinks station + ice" — surfaced (Dinner) |
| Backup ice | **C** | ice is a buy; "backup cooler" only in BBQ contingency (hidden) |
| Food safety | **B** | **Baby Shower / BBQ B** (pregnancy-safe / internal-temp in risks, hidden); **Graduation D** |

### Guest Comfort
| Item | Class | Notes |
|---|---|---|
| Seating | **A** | seating decision (Dinner) + chairs via B3A Capacity — surfaced |
| Tables | **A** | Capacity row (Birthday/Grad/BBQ) — surfaced |
| Shade | **B** | **BBQ A** (shade decision); Birthday/Grad B (canopy hidden) |
| Weather protection | **B** | rain plan in contingencies — **hidden** (all) |
| Climate control | **D** | none |
| Restroom readiness | **D** | none (only ADA chip in intake) |
| Accessibility | **D¹** | captured as intake input; never modeled/surfaced; **never-infer** readiness |
| Children accommodations | **D** | **Birthday C** (kids noted); no safety |

### Operations
| Item | Class | Notes |
|---|---|---|
| Trash | **A** | cleanup run-of-show "bag trash/recycling" — surfaced |
| Recycling | **A** | same |
| Cleanup workflow | **A** | cleanup schedule (B2R day-of board) — surfaced |
| Staging areas | **B** | "stage bus tub" in setup run-of-show — surfaced (Dinner) |
| Storage | **C** | leftover containers (buy); no storage plan |
| Deliveries | **B** | drop-off catering option (vendor), hidden |
| Vendor access / load-in | **C** | minimal (host events have few vendors); COI "proof" only |
| Emergency supplies | **D** | none |

### Risk Management
| Item | Class | Notes |
|---|---|---|
| Rain / weather plan | **B** | authored in risks+contingencies, **hidden** (all) |
| Food-failure plan | **B** | **Birthday** "grocery cake backup"; Dinner make-ahead; hidden |
| No-show / headcount | **A** | decision-first "Confirm final guest count" (55G) — surfaced |
| Over-capacity plan | **B** | **Dinner B** (r_capacity "chairs if short"); others D |
| Injury response / first aid | **D** | **none anywhere** — incl. BBQ (grill/fire) |
| Allergy response | **A/B** | dietary decision surfaced (55G); response (not just avoid) hidden |
| Alcohol management | **B** | decision + **Graduation minors risk**; hidden as readiness |

¹ Accessibility: captured by the intake chips; per **Pattern 009** its *readiness* must never be inferred.

---

## Part 2 — Missing-infrastructure matrix (every D)

| Item | Existing surface can show it? | Lacks data? | Never infer? |
|---|---|---|---|
| Power / cords / strips / outlets / generator | Yes (Planning Health prompt) | **Yes** (no power data) | **Load/circuit: NEVER** — prompt only |
| Lighting power / audio power | Yes (prompt) | Yes | Prompt only |
| Parking | Yes (prompt) | Yes | **Adequacy: NEVER** |
| Wayfinding | Yes (prompt) | Yes | No (a prompt is safe) |
| Coat management | Yes (prompt) | Minor | No |
| Climate control | Yes (prompt) | Yes | Comfort target: prompt only |
| Restroom readiness | Yes (prompt) | Yes | **Adequacy: NEVER** |
| Children accommodations / safety | Yes (prompt) | Yes | **Adequacy: NEVER** — prompt ("supervise grill/pool") |
| Emergency supplies / first aid / injury | Yes (prompt) | Yes | No (a "have a first-aid kit + know 911" prompt is safe) |
| Food safety (Graduation) | Yes (Planning Health) | Authored elsewhere | No — it's a rule, surface it |

**Pattern:** almost every D can be **surfaced as a prompt today** through Planning Health. The split is *data* (we don't have power/parking/restroom facts) vs *never-infer* (we must not fabricate load/adequacy). The honest move (Pattern 009): **prompt to confirm, never estimate.**

---

## Part 3 — Top 20 first-time-host failure points (ranked)

**CRITICAL**
1. **Power overload, no plan** — slideshow + chafers + string lights + speaker on one circuit trips a breaker mid-event (Graduation / evening). [D]
2. **Food left in the danger zone / undercooked** — BBQ internal temps + perishables out >2h; pregnancy-unsafe foods at a shower. Authored but **hidden**; never enforced. [B]
3. **No injury / emergency plan** — grill burn, fire, a fall; no first-aid kit, no "who calls 911." [D — absent even for BBQ]
4. **Allergy reaches a plate** — only safe if guests + dietary were actually entered (55G surfaces it, but the data must exist). [A-gated]
5. **Not enough seating** — now mitigated by the B3A Capacity row, but only on desktop Planning Health. [A, partial reach]

**HIGH**
6. **Rain hits, no surfaced plan** — the contingency is authored and **dark** when it matters. [B]
7. **Parking chaos** — Graduation drop-in (35–75) / BBQ; neighbors, traffic, safety. [D]
8. **Restroom queue** — large/long events; no readiness. [D]
9. **Ice runs out / warm drinks** — bought, but storage/backup is thin/hidden. [C]
10. **Cold food / no hot-holding** — Birthday/BBQ have no chafers or hold step. [B/D]
11. **Headcount not locked → over/under-buy** — mitigated by 55G "Confirm final guest count." [A]
12. **More RSVPs than chairs/plates (over-capacity)** — only Dinner models it; hidden. [B]
13. **Evening event gets dark** — Graduation/BBQ have no lighting. [D]
14. **No serving utensils / sternos** — partly mitigated by Capacity; sterno fuel still absent. [B/D]
15. **Trash overflow / no bus station** — surfaced for some via run-of-show; thin for Birthday/BBQ. [A/B]

**MEDIUM**
16. **Child safety near grill/pool/outlets** — Birthday/BBQ; no prompt. [D]
17. **No coat / bag plan** — indoor Dinner/Shower. [D]
18. **No greeting / arrival experience** — guests arrive to no drink, no direction. [C]
19. **Delivery / vendor-access timing** — drop-off catering window unmanaged. [B/C]
20. **No replenishment runner** — Graduation crowd outpaces the buffet. [B]

**LOW:** wayfinding/signage (most home events small), climate control, audio.

---

## Part 4 — Surfaceable **now**, no new UI (existing data → existing surface)

| Need | Surface that owns it | Mechanism (exists) |
|---|---|---|
| Weather / rain plan | **Event Day Schedule + Planning Health** | route authored `contingencies` to a day-of recovery line + a pre-event prompt |
| Food safety (BBQ temp, pregnancy-safe) | **Planning Health** | surface the authored `risks` as a confirm-prompt |
| Alcohol management (+ Graduation minors) | **Planning Health** | authored decision/risk → prompt |
| Over-capacity / replenishment | **Planning Health / Capacity row** | authored `risks` (Dinner r_capacity, Grad resupply) → prompt |
| Food holding / serving (Graduation chafers) | **Capacity row (B3A)** | already rides rentalsGap |
| Headcount / allergy | **Next-Action Spine / Command Center** | already surfaced (55G) |
| Arrival / trash / staging / cleanup | **Event Day Schedule** | already surfaced (B1/B2R) |

Everything above is **routing authored-but-dark data** — Pattern 007 — onto the surface that owns it (Pattern 008), as **prompts** (Pattern 009).

## Part 5 — Requires new data / fields / workflows (before it can exist honestly)

- **Power:** an authored "what plugs in" list per playbook (slideshow, chafers, lights, speaker) → a *prompt* ("plan outlets + cords for these; don't overload one circuit"). Load itself = **never infer**.
- **Parking / restrooms / climate:** require **intake inputs** (venue lot? restroom count?) to say anything beyond a prompt. Adequacy = **never infer**.
- **Injury / emergency:** authored *prompt* ("first-aid kit on site; know the nearest ER; for BBQ, a fire extinguisher near the grill"). Safe to author; no inference.
- **Child safety:** authored *prompts* for kid Birthday / BBQ ("supervise grill, pool, outlets"). No adequacy claim.
- **Lighting / food-holding / ice-storage:** authorable `rentalsGap` entries (string lights, chafers+fuel, coolers) → fold into the Capacity row as requirements.

## Part 6 — Smallest Shippable Improvement

**One "Infrastructure check" prompt row in Planning Health** — `Data → Existing Runtime → Existing Surface`, no new engine/dashboard:
- **Data:** the authored-but-dark infra signals already in each playbook — `risks` (weather, food-safety, over-capacity), `contingencies` (rain), the `alcohol`/minors decision — plus a short authored **prompt set** (power, emergency/first-aid, child-safety) added to the playbook data as plain strings.
- **Runtime:** a pure `playbookInfraPrompts(event)` reader (same shape as `playbookCapacity`).
- **Surface:** a display-only Planning-Health row (neutral `REVIEW`, like Capacity's `ESTIMATE`) — *"Before event day — confirm: rain plan · food safety · power/outlets · trash station · [grill: fire extinguisher + supervise kids]."*

It does **not** enter `getEventReadiness` (no ladder/spine escalation — same isolation as B3A), states **prompts not deficits** (Pattern 009), and reuses the exact B3A wiring (Pattern 006). ~1 reader + 1 row + a small authored prompt set.

## Part 7 — EXECUTE / TEST / PARK

| Item | Rec | Why |
|---|---|---|
| Infrastructure-check prompt row (weather/food-safety/alcohol/over-capacity from authored data) | **EXECUTE** | Pure routing of dark data; prompts only; proven B3A pattern. |
| Author + surface **power**, **emergency/first-aid**, **child-safety** prompts (plain strings, no inference) | **EXECUTE** | Highest-risk blind spots; safe as prompts; no fabricated load/adequacy. |
| Surface weather `contingencies` on the Day-of recovery line at the trigger | **EXECUTE** | Authored + dark (Phase-B B.4). |
| Author lighting / food-holding / ice-storage `rentalsGap` → Capacity row | **TEST** | Deterministic; validate quantities first. |
| Intake inputs for parking / restrooms / climate to enable real checks | **TEST** | New data + UX; keep prompt-not-deficit. |
| Estimate **power load / parking adequacy / restroom adequacy / accessibility / child-safety adequacy** | **PARK (never-infer)** | Pattern 009 — depends on unknown venue/wiring/people. |

---

## Professional planner review

**Mindy Weiss** *(experience · feeling · flow)* — **Concern:** guests arrive to no greeting, no drink-in-hand, nowhere for coats; the *feeling* layer is thin. **Compliment:** the make-ahead + run-of-show genuinely protect the host's presence. **First fix:** a surfaced rain plan + an arrival/greeting beat.

**Bryan Rafanelli** *(logistics · infrastructure · operational discipline)* — **Concern:** the operational backbone is **absent** — no power, parking, restroom, or load-in plan; this is where events actually fail. **Compliment:** the day-of NOW/NEXT run-of-show + the capacity requirements are real operational discipline. **First fix:** a power + load-in + restroom **check** before event day.

**Preston Bailey** *(environment · focal points · transformation)* — **Concern:** no lighting design (and the event literally goes dark), décor is a line item with no focal moment. **Compliment:** theme/decor decisions exist to build on. **First fix:** a lighting plan + one focal installation.

**David Tutera** *(guest experience · signature moments)* — **Concern:** no signature moment, no personalization beat surfaced. **Compliment:** the honoree/meaning fields are captured. **First fix:** a "one moment they'll remember" prompt.

**Sarah Haywood** *(luxury ops · risk · redundancy · execution rigor)* — **Concern:** **zero redundancy surfaced** and **no injury/emergency plan** — unacceptable for any event with a grill, kids, or alcohol. **Compliment:** the buffer/make-ahead thinking shows risk awareness. **First fix:** surface the contingencies + add an emergency/first-aid prompt.

---

## Success condition — answered
**A beginner would succeed on the *soft* layer and fail on the *physical* one.** NGW now makes them decide first, see a real run-of-show, and size capacity — genuinely planner-like. But the highest-value blind spots a pro checks first are **dark or absent**: **power, food-safety enforcement, injury/emergency, weather-plan surfacing, parking/restrooms, lighting.** These are not feature ideas — they're the operational reality that separates "nice party" from "executed event." The smallest honest win is **one Infrastructure-check prompt row** that exposes the authored-but-dark risks and adds power/emergency/child-safety as **prompts** — making the beginner *check what a pro checks*, without pretending to know their venue.

*Audit only — nothing built or changed.*
