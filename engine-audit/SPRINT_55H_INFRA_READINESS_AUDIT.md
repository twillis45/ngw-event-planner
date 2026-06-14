# Infrastructure Readiness Audit — Host Playbooks

*Audit only. Operational **infrastructure** across the 5 host playbooks — not purchases, vendors, or budgets. Classification: **A** explicitly modeled · **B** partially modeled · **C** implied, not surfaced · **D** absent. Grounded in the playbook data (`src/lib/playbooks/data/*.js`).*

**Two layers matter and they differ:** *modeled* (is it in the data?) vs *surfaced* (does the runtime show it?). Most authored infra is **dark** — only **trash** (B2R day-of board), **seating** (B3A capacity), and **arrival** (B1 run-of-show) currently reach the user. Classifications below are for *modeling*; the surfacing gap is called out per item.

## 1. Coverage matrix (A/B/C/D)

| Infrastructure | Dinner Party | Birthday | Baby Shower | Graduation | Get-Together / BBQ |
|---|---|---|---|---|---|
| **Power (electrical)** | D | D | D | **D** | D *(grill fuel B; electrical D)* |
| **Food holding (hot/cold)** | B (reheat) | C | C (cold dispenser) | **A** (chafers + hold-temp risk) | C (grill-to-order) |
| **Ice storage** | B (ice tub) | B (cooler) | C | C (drinks station) | **A** (coolers ~1/7 guests) |
| **Parking** | D | D | D | **D** | **D** |
| **Restrooms** | D | D | D | **D** | D |
| **Trash** | **A** (bus tub + recycling station) | B | B | B | B (recycling for cans) |
| **Seating flow** | **A** (seating decision + chairs) | B | B | B | B |
| **Weather protection** | C (indoor) | B (canopy + rain plan) | C | B (canopy + rain plan) | **A** (shade decision + canopy) |
| **Guest arrival flow** | B (run-of-show) | B (doors) | C (synthetic only) | B (open-house window) | B (doors) |
| **Accessibility** | D¹ | D¹ | D¹ | D¹ | D¹ |
| **Lighting** | B (candles) | C (cake candles) | D | **D** | **D** |
| **Signage** | C | B (banner) | C | **A** (yard sign + photo display) | C |
| **Child safety** | D | C (kids noted) | D | D | **D** |
| **Alcohol management** | **A** (strategy decision) | B (+ ride-home note) | B (dry-default) | **A** (minors risk + adult area) | B (decision) |

¹ Accessibility is **captured as intake input** (the Sprint-55H accessibility chips — wheelchair / ADA restrooms / designated parking), but **not modeled in any playbook**, and per Pattern 009 its *readiness* must never be inferred.

## 2. Missing-infrastructure matrix (the C/D gaps)

| Item | Where it's a gap | Type |
|---|---|---|
| **Power** | All 5 (electrical) — acute for **Graduation** (slideshow/chafers/string lights) and **evening BBQ** | **D — data + never-infer load** |
| **Parking** | All 5 — acute for **Graduation** (35–75 drop-in) and **BBQ** | **D — data + never-infer adequacy** |
| **Restrooms** | All 5 — acute for **Graduation** (volume + duration) | **D — data + never-infer adequacy** |
| **Lighting** | **Graduation, BBQ** (evening), Baby Shower; thin elsewhere | **D — data** (deterministic-ish: string-light coverage) |
| **Child safety** | Kid **Birthday**, **BBQ** (grill/fire/pool/outlets near children) | **D — data + never-infer adequacy** |
| **Food holding** | Birthday, BBQ, Baby Shower (no hot/cold hold) | **C — partial; Graduation is A** |
| **Ice storage** | Baby Shower, Graduation (no cooler/ice-tub named) | **C** |
| **Signage** | Dinner, Baby Shower, BBQ | **C — event-dependent** |
| **Weather (surfacing)** | Authored in risks/contingencies everywhere but **dark** | **B authored → C surfaced** |
| **Accessibility** | Captured in intake, never modeled/surfaced as readiness | **never-infer** |

## 3. Highest-risk blind spots

1. **Power — D across all, critical for Graduation / evening events.** Slideshow, chafers, string lights, a speaker on one circuit → a tripped breaker mid-event with no plan. (Load must **never** be inferred — Pattern 009 — but the *prompt* is missing.)
2. **Parking — D across all, critical for Graduation (35–75 drop-in) + BBQ.** Neighbor/traffic/safety. (Adequacy never-infer; the *plan prompt* is missing.)
3. **Restrooms — D across all, critical for large/long events.** Queue + plumbing. (Adequacy never-infer.)
4. **Child safety — D for kid Birthday + BBQ.** Grill, fire pit, pool, outlets around children — the highest-liability gap; entirely absent.
5. **Lighting — D for evening Graduation/BBQ.** The event physically ends when it gets dark.
6. **Weather contingency authored but dark.** The rain plan exists in `contingencies` and never surfaces *when it's about to rain* — a back-up the host can't see.

## 4. Findings against the four questions

**What can be surfaced immediately (existing data — Pattern 007):**
- **Weather / rain contingency** — authored in `risks`/`contingencies` (canopy, move-indoors) in all 5; route to a pre-event prompt / day-of recovery line.
- **Alcohol management** — `alcohol` decision everywhere + **Graduation's minors risk** (adults-only area); surface as a planning prompt.
- **Food holding (Graduation)** — chafers already in `rentalsGap`; rides the B3A capacity row.
- **Trash / seating / arrival** — already surfaced (B2R / B3A / B1). No new work.

**What requires new data (authoring — Pattern 006/007):**
- **Lighting** (string-light coverage), **food-holding** for Birthday/BBQ, **ice-storage** for Baby Shower/Graduation — authorable as `rentalsGap`/infra entries; deterministic enough to state as *requirements*.

**What should never be inferred (Pattern 009):**
- **Power/circuit load, parking adequacy, restroom adequacy, accessibility readiness, child-safety adequacy.** These depend on the specific venue/wiring/people. Surface a **prompt to confirm**, never an estimate or a deficit.

**What a professional planner checks before event day:**
Power (what's plugged in, on which circuit, cords run?) · Parking (where do N cars go?) · Restrooms (enough for the crowd + duration?) · Weather (rain plan locked, canopy on site?) · Food holding (chafers + fuel; cold on ice?) · Lighting (will it get dark?) · Trash (bags + a bus/recycling station?) · Arrival (doors, a greeter, a drink in hand?) · Alcohol (cutoff, minors, rides home) · Child safety (grill/fire/pool/outlets supervised?).

## 5. Smallest shippable improvement

**One "Infrastructure check" prompt row in Planning Health — the B3A pattern, reused.** A display-only Planning-Health item (neutral `REVIEW`, like the Capacity `ESTIMATE`) that lists the **authored, currently-dark** infra prompts present in the event's playbook:
> *"Before event day — confirm: rain plan · trash + bus station · [chafers/food holding] · alcohol plan [+ adults-only area]."*

It routes existing `risks`/`contingencies`/`rentalsGap` (Pattern 007) onto the surface that owns readiness (Pattern 008), as **prompts to confirm — never deficits** (Pattern 009), with **zero new data and zero inference**. It does **not** enter `getEventReadiness` (no ladder/spine escalation — same isolation as B3A). ~1 reader (`playbookInfraPrompts`) + 1 health row.

## 6. EXECUTE / TEST / PARK

| Improvement | Rec | Why |
|---|---|---|
| Infrastructure-check prompt row in Planning Health (weather/trash/alcohol/food-holding, from authored data) | **EXECUTE** | Pure routing of dark authored data to the owning surface; prompts only; same proven pattern as B3A. |
| Surface weather `contingencies` as a day-of recovery line when the trigger nears | **EXECUTE** | Authored + dark; the Phase-B B.4 step. |
| Author lighting / food-holding / ice-storage `rentalsGap` entries (Birthday/BBQ/Baby Shower) → fold into the Capacity row | **TEST** | Deterministic requirements; validate the quantities (string-light coverage, chafer counts) before authoring. |
| Add infra **inputs** to intake (power available? parking plan? restroom count?) to enable real readiness | **TEST** | New data + intake touch (B3-B class); validate the UX, keep it prompt-not-deficit. |
| Estimate **power load / parking spots / restroom adequacy / accessibility / child-safety adequacy** | **PARK (never-infer)** | Depends on unknown venue/wiring/people; Pattern 009 forbids asserting these. Only ever prompt. |
| Child-safety authoring (grill/fire/pool/outlet prompts for kid Birthday + BBQ) | **TEST** | Highest-liability gap; author as **prompts** ("supervise the grill/pool"), never an adequacy claim. |

## Verdict
Infrastructure is **mostly authored-but-dark for the routable items** (weather, food-holding, alcohol, trash, seating, arrival — a **routing** problem) and **absent for the physical-venue items** (power, parking, restrooms, lighting, child safety — a **data + never-infer** problem). It is **not a UI problem** — Planning Health already owns it. The smallest win is one Infrastructure-check prompt row that exposes the dark authored prompts; the physical-venue blind spots (esp. **power** and **child safety**) need authoring as **prompts**, never inferred estimates.

*Audit only — nothing built or changed.*
