# Sprint 56B — No Guesswork Intelligence & Intake Architecture Audit

*Code-grounded, audit-only. Thesis: Sprint 55 matured **workflow intelligence** (the runtime now behaves like a planner's *checklist*); the next advantage is **inference intelligence** (behaving like a planner's *judgment*). Goal: find every place NGW asks the user to think like a planner instead of thinking for them. No build, no redesign, no new engine. Date: 2026-06-17.*

## Governance correction (load-bearing — applied throughout, esp. Parts 14–15)
The sprint brief's pattern numbers collide with the canonical Ledger. Corrected:
| Brief says | Reality | This audit uses |
|---|---|---|
| Pattern 011 = "Intake Is Discovery" | **Pattern 011 = One Engine, Multiple Confidence Layers** (POS-P011, Needs Review); "Intake Is Discovery" = **Pattern 012** (created 56A) | **Pattern 012** (existing) |
| Pattern 012 = "Infer Before Asking" | genuinely NEW | **Pattern 013 — Infer Before Asking** |
| AP-002 = "Asking For What Can Be Inferred" | **AP-002 = Persona Fork**; this = **AP-003** (created 56A) | **AP-003** (existing) |
| AP-003 = "Choice Without Guidance" | genuinely NEW | **AP-004 — Choice Without Guidance** |

---

## Core Audit Question — the VFW scenario
Input only: **Graduation Party · Pasadena, MD · VFW Hall · 80 guests.**

| | Detail |
|---|---|
| **What an experienced planner already knows** | VFW = community hall: rental ~$300–800 (often member-discounted), tables/chairs/basic kitchen usually included, **BYO alcohol** typical (cash-bar permit), ample free parking, ground-floor/accessible, indoor → low weather risk, minimal AV, few decor rules (often no open flame). → **venue spend is small; budget shifts to food/drink/decor.** 80-guest grad in the Baltimore exurbs ≈ buffet + beer/wine + DIY decor, ~$3–6k typical. |
| **What NGW *should* already know** | venue **class** → inclusions (don't budget tables/chairs) · cost **profile** (venue line ≈ flat $300–800, not 15–40%/guest) · BYO-alcohol → bar budget shifts · parking/accessibility/weather **assumptions** · **local** price band (Pasadena ≈ Baltimore, not DC) · grad **opportunities** (achievement wall, mentor recognition). |
| **What NGW *currently* knows** | Recognizes "VFW" via `COMMUNITY_VENUE_RE` (`App.js:2323`) → emits a budget-stretch **text hint**. Computes a budget **range** (Graduation per-head × 80 × metro × tier). `playbookCapacity` (Graduation playbook exists) → rentals from 80 guests. `playbookInfraPrompts` → Reality-Check prompts (rain/power/trash/**alcohol & minors**). |
| **What's MISSING** | structured venue inference (inclusions, cost profile, BYO, parking/accessibility/weather **as confirmable assumptions**); **local** market pricing (Pasadena would force "DC/NoVA 1.45×" — overstated — or "Other 1.00"); **opportunity** surfacing; **negotiation** (is the VFW quote fair?); **design**. |

**Verdict:** NGW already *recognizes* the venue and does the *math*; it does not yet *reason about the place*. It knows the checklist, not the judgment.

---

## Part 1 — Intelligence Capability Matrix
| Capability | Current engine | Confidence | Consumer | Grade |
|---|---|---|---|---|
| **Budget** | per-head band by type × tier (good/better/best) × metro × date × time-of-day (`lib/budgetEstimator`); playbook category roll-up for 5 types (`playbookBudgetCategories`) | Med-High (math), Low (locality) | estimator, budget tab | **B** |
| **Venue** | free-text string + unread `venueTags`; only `COMMUNITY_VENUE_RE` hint + outdoor-keyword weather + COI default | Very low | a text hint | **D** (C-seed) |
| **Vendor** | accountability/promises/COI/readiness, roster-by-type, conflict detection | Med-High (ops) | vendor cockpit, readiness | **B** |
| **Market pricing** | ONE national per-head band × ONE coarse metro factor (29 metros incl. "DC/NoVA 1.45", no Baltimore/sub-metro); no per-category local economics | Low | estimator | **C** |
| **Capacity** | `playbookCapacity` → rentals/seating from guest count (5 playbook types) | High *within* playbook types, none outside | Planning Health | **B** |
| **Timeline** | per-type templates + phase/urgency + `deriveEventCompressionSummary` + run-of-show + readiness | High | timeline, spine, compression badge | **A/B** |
| **Risk** | authored `risks`/`contingencies` (5 playbooks) + weather + Reality-Check prompts + readiness | Med (rich for 5 types) | Reality Check, health | **B** |
| **Design** | design *intent* captured as text (`style_vibe…`) → AI vendor briefs; `staging` vendor tag; **no layout/flow/staging generation** (floorplans PARKED) | None (generation) | AI brief text | **D** |
| **Opportunity** | none as engine; scattered authored *tasks* only (`eventSolve.mjs` `an_montage`/`rp_speakers` tribute/montage) | None | — | **D** (C-seed) |
| **Negotiation** | none; estimator range is a **latent** benchmark, never applied to entered quotes | None | — | **D** |

**Pattern:** NGW is **A/B on operational/workflow intelligence** (timeline, capacity, vendor, risk, budget-math) — Sprint 55's harvest — and **C/D on inferential/contextual intelligence** (venue, market, opportunity, design, negotiation). The thesis holds: workflow intelligence is mature; **inference intelligence is the frontier.**

---

## Part 2 — Venue Intelligence Audit (VFW Hall)
| Dimension | Current | Desired | Gap | Commercial impact |
|---|---|---|---|---|
| Venue class | regex match → "community venue" (text hint only) | typed class: `community_hall` | structured class field | foundation for all below |
| Typical rental cost | none | ~$300–800 flat (member-discounted) | flat-cost profile vs %/guest | **budget accuracy** (biggest trust lever) |
| Inclusions (tables/chairs/kitchen) | none | "usually included" | don't double-budget rentals | over-budgeting erodes trust |
| Alcohol | none (Reality-Check asks generically) | BYO + permit typical | bar-budget shift | accuracy |
| Parking | **never inferred** (Never-Infer) | "usually ample" *as prompt* | confirm-prompt, not number | safe inference |
| Accessibility | tags exist, unread | "usually ground-floor" *as prompt* | confirm-prompt | inclusion |
| Weather exposure | outdoor-keyword regex | indoor → low risk | class → exposure | fewer false prompts |
| Power / decor / vendor rules | none | basic power; no open flame; BYO vendors OK | typical-rules prompts | day-of risk reduction |
| Budget profile | flat %/guest model | community-hall profile (low venue, higher food/decor share) | profile-by-class | **accuracy** |

**Boundary:** every venue inference must surface as a **typical assumption to confirm**, never an adequacy number (Pattern 009 / POS-P009-R1). The class → {inclusions, cost-profile, typical-rules} layer is **feasible and doctrine-safe**; capacity/parking/power **adequacy** stays a prompt.

---

## Part 3 — Local Market Intelligence Audit
- **Current:** one **national** per-head band per type × **one** metro multiplier (`METRO_MARKETS`, 29 entries). "Washington DC / NoVA" = 1.45 exists; **Baltimore, Annapolis, Pasadena MD do not** → a Pasadena user must pick DC (overstated) or "Other 1.00". No per-**category** local pricing (no "DJs ≈ $X in Annapolis"), no vendor density, no sub-metro resolution.
- **Missing:** category-level local price bands; metro→sub-region resolution; vendor-supply signal.
- **Recommended architecture (audit-only):** a **lookup layer** (metro/region → per-category band), not a new engine — extends the existing factor table from "one number" to "a vector by category." Reuses `METRO_MARKETS` shape.
- **Trust impact:** high — "the DJ should run $800–1,200 here" is the single most planner-like sentence NGW could say. **Revenue impact:** high — local price truth + quote evaluation (Part 9) is a defensible moat and a natural premium/affiliate surface.

---

## Part 4 — Budget Intelligence Audit
- **Reality check on the brief:** there is **no Shoestring/Classic/Premium/Luxury** selector. Tiers are `good/better/best` = **Classic/Signature/Luxury** (`App.js:2911`), chosen **per category** and **not stored**. Users are **not** asked to classify a venue's cost class.
- **Do users understand them?** No — "Signature" is jargon (Grandmother test). Do planners think this way? Partly, but per-category tier-picking is planner *translation* work pushed onto the user. **Ambiguity:** high (per-category, undefined labels).
- **Should users choose tiers or should tiers be inferred?** → **Inferred from one experience goal.** Replace per-category tier picks with one event-level **Experience Goal** (*Keep costs low · Comfortable & polished · Elevated celebration · Exceptional experience*) → the engine maps goal → the existing good/better/best per category (default + override). Easier, less ambiguous, more No-Guesswork, and a durable signal for future intelligence. **Recommendation: favorable** — an intake-mapping change over the existing tier engine, not new math.

---

## Part 5 — Intake Architecture Audit (Required / Inferable / Recommended)
- **Required user input** (cannot infer): event **type**, **date**, **guest target**, **venue choice** (the place), client contact, the generative **meaning** prompts.
- **Inferable** (engine should determine): venue **class / inclusions / cost-profile / typical-rules**, vendor **needs** (roster-by-type exists), **risk profile** (playbook), **capacity** (exists), **budget profile**, indoor/outdoor, COI need, tables/timeOfDay/date-premium (already).
- **Recommended** (engine should suggest, user confirms): **budget range** (exists, surface earlier), **planning timeline** (exists), **vendor count/staffing**, **experience upgrades** (Part 6), the **experience-goal → tier** default.
- **Remove (AP-003 dead, from 56A):** `vision/priorities/mustHaves/dealBreakers/vipConcerns/commPrefs` (0 readers), unread `venueTags`, duplicate guest-count ask.
- **Goal:** the engine should reason after **type + date + guests + venue** — four answers — and treat everything else as confirm/suggest.

---

## Part 6 — Opportunity Intelligence Audit
- **Current:** none as a capability. A few solve-templates hard-code signature *tasks* (`eventSolve.mjs`: Anniversary `an_montage` "tribute/montage/memory display", Retirement `rp_speakers`). No engine that, given a type, surfaces *opportunities*.
- **Missing:** a per-type **opportunity catalog** (Graduation → achievement wall / mentor recognition; Birthday → memory wall / tribute video; Wedding → first look / welcome dinner; Fundraiser → sponsorship / donor recognition / auction; Corporate → networking / branding).
- **Potential value:** high emotional payoff for low effort; it's the clearest "experienced planner sitting beside you" moment ("for a grad party, have you thought about an achievement wall?"). **It is authored content, not a new engine** — slots into the existing playbook data model alongside `risks`/`contingencies`.

---

## Part 7 — Predictive Intelligence Audit
- **Current:** **weather** (OpenWeather + outdoor regex, `lib/weather.js`), **timeline compression** (`deriveEventCompressionSummary`), **capacity/quantity** prediction (ice ~1.5 lb/guest, seating from guests — `playbookCapacity` + playbook quantities), readiness drift.
- **Missing/limited:** food/staffing shortage prediction (quantities exist but not framed as "you'll be short"), parking/power **stress** (deliberately Never-Infer), vendor-bottleneck prediction.
- **Architecture implication:** most predictive *inputs* already exist (quantities, dates, capacity); the gap is **framing** them as forward predictions, not new modeling. Parking/power stay prompts (doctrine). **Grade B** — real but quantity-driven, not yet "I predict a problem."

---

## Part 8 — Design Intelligence Audit
- **Current:** design **intent** captured as text (`style_vibe, color_palette, floral_direction, lighting_notes`) → AI vendor **briefs**; `staging` exists only as a vendor-question tag. **No** room layout, guest flow, staging plan, or focal-moment generation. Floorplans are PARKED (web app can't do LiDAR; Cvent owns diagramming — per project memory).
- **Missing:** layout/flow/decor-direction/signature-moment generation.
- **Commercial value:** high but **heavy**; the doctrine-aligned slice is **decor *direction* + signature *moments*** (text/inference, reuses the AI-brief path), **not** CAD layout. **Grade D**; recommend the light slice only, the rest stays parked.

---

## Part 9 — Negotiation Intelligence Audit
- **Current:** none. "negotiate" appears only as authored *task* text. Entered vendor `cost` is tracked but never benchmarked.
- **Latent capability:** the budget estimator already produces per-category market ranges — so "Venue quote $5,500 vs typical $300–800 for a VFW → **way high, likely includes catering/bar**" is computable from existing bands + venue class (Part 2) + local pricing (Part 3).
- **Missing:** wire the estimate range to entered quotes → fair / high / low / "what's likely included" / "negotiable." **Potential value:** very high trust + a flagship "planner judgment" moment. **Grade D** (latent capability, unwired). Depends on Parts 2–3.

---

## Part 10 — Persona Intelligence Audit
**Should intelligence change, or presentation?** → **Presentation.** The VFW inference (community hall → BYO, low venue spend) is the *same truth* for a grandmother and an agency; only the **rendering** differs (warm confirm-prompt vs terse data row). This is exactly **Pattern 011 — One Engine, Multiple Confidence Layers** (POS-P011). 56B **strengthens the case** (more inferred truth = more value in rendering it per confidence layer) but adds **no shipped instance**, so POS-P011 **stays Needs Review** — unchanged status, reinforced rationale. Doctrine: persona changes rendering, never logic (AP-002 Persona Fork remains killed).

---

## Part 11 — Grandmother Test
Run through a grandmother planning a family grad party:
- **"Classic budget"** → doesn't know what it means (jargon). **"Capacity"** → "do you mean chairs?" **"Reality Check"** → unclear. **"Planning Health"** → enterprise dashboard language. **"Readiness / Run-of-show / COI / Compression"** → planner/ops vocabulary.
- **Would she know what to do next?** The next-step spine helps; the *labels* intimidate. **Trust?** Mixed — the warmth of the meaning prompts helps; the ops vocabulary signals "this is for professionals."
- **Vocabulary to keep away from beginner persona (host layer):** *Classic/Signature/Luxury, Capacity, Reality Check, Planning Health, Readiness, Run-of-show, COI, Compression, Vendor accountability.* → these are the **presentation-layer translations** Pattern 011 exists to provide. (Evidence list for the host voice.)

---

## Part 12 — No Guesswork Doctrine Audit (where intake violates doctrine)
| Doctrine | Status in intake | Violation? |
|---|---|---|
| Trust Before Intelligence (P003) | budget range shown as estimate; OK | clean |
| Decision First (P001) | respected | clean |
| One Meaning One Label (P004) | "Signature"/"Reality Check"/"Capacity" are jargon to hosts | **violated (presentation)** |
| Reuse Before Reinvention (P006) | venue/market inference should reuse regex + factor table | guidance |
| Inform Without Escalating (P010) | respected (capacity/reality-check are display) | clean |
| Requirements Before Gaps (P009) | respected | clean |
| **Never Infer Venue Adequacy (POS-P009-R1)** | respected today; **the venue/market recommendations must stay confirm-prompts, not adequacy numbers** | guardrail |
| Operational Intelligence Layer (P005) | strong (the Sprint 55 harvest) | clean |
| **Asking For What Can Be Inferred (AP-003)** | dead fields, inert venue, tier self-classification | **violated** |
| **Choice Without Guidance (AP-004, new)** | per-category tier picker; event-type list; budget tiers with undefined labels | **violated** |

---

## Part 13 — Top-10 Intelligence Gaps (scored 1–5; 5 = highest)
| # | Gap | User | Trust | Revenue | Compet. | Reuse | Difficulty | Bucket |
|---|---|---|---|---|---|---|---|---|
| 1 | **Venue class → inclusions/cost-profile/typical-rules** (confirm-prompts) | 5 | 5 | 4 | 5 | 5 | 3 | **TEST** |
| 2 | **Local market pricing by category** (Pasadena≠DC) | 4 | 5 | 5 | 5 | 5 | 4 | **TEST** |
| 3 | **Quote evaluation / negotiation** (fair/high/low) | 4 | 5 | 5 | 5 | 4 | 3 | **TEST** (after 1–2) |
| 4 | **Experience-goal → tier** (replace per-category picks) | 5 | 4 | 2 | 3 | 4 | 2 | **TEST** (first Pattern-012 instance) |
| 5 | **Dead-field removal + de-dupe guest count** (AP-003) | 3 | 4 | 1 | 2 | 2 | 1 | **EXECUTE** |
| 6 | **Opportunity catalog by type** (achievement wall…) | 4 | 3 | 3 | 4 | 4 | 2 | **TEST** (authored content) |
| 7 | **Host-persona vocabulary translation** (Grandmother) | 5 | 4 | 2 | 4 | 5 | 3 | **PARK** (needs Pattern 011 voice — gated) |
| 8 | **Predictive framing** (shortage/bottleneck from existing quantities) | 3 | 4 | 2 | 3 | 3 | 3 | **PARK** |
| 9 | **Capacity/budget for non-playbook types** (extend the 5) | 3 | 3 | 2 | 2 | 3 | 4 | **PARK** (content) |
| 10 | **Design direction + signature moments** (light slice) | 3 | 3 | 4 | 3 | 3 | 4 | **PARK** (CAD stays killed) |

**EXECUTE:** #5 (dead-field hygiene — zero-risk, already the 56A decision).
**TEST:** #1 venue-class inference → #2 local pricing → #3 quote eval (sequenced; each doctrine-safe, reversible); #4 experience-goal tier; #6 opportunity catalog.
**PARK:** #7 host voice (gated on Pattern 011 shipped instance), #8 predictive framing, #9 non-playbook content, #10 design light-slice.
**KILL:** CAD/floorplan generation; any inferred venue **adequacy number**; per-category tier as a user choice; new free-text intake fields.

---

## Part 14 — Product OS Governance (evidence-gated, renumbered)
- **Pattern 012 — Intake Is Discovery, Not Data Entry** — already created (56A), **Draft / POS-P012 Needs Review.** 56B **reinforces** (the whole VFW scenario is discovery-not-collection) but adds no shipped instance → unchanged.
- **Pattern 013 — Infer Before Asking** *(NEW)* — *If the engine can reasonably infer something, infer first and ask only to confirm.* **Evidence:** inference already works (tables/timeOfDay/date-premium/COI/playbookCapacity); the VFW scenario shows where it should but doesn't (venue class, local price). Distinct from 012 (012 = *purpose of intake*; 013 = *order of operations*: infer→confirm). **Recommend → Draft** (it's the operational rule under 012; promote to Canonical with the first confirm-prompt that replaces a question).
- **AP-003 — Asking For What Can Be Inferred** — already **Active** (56A). 56B adds venue/market/quote as further evidence.
- **AP-004 — Choice Without Guidance** *(NEW)* — *Users should never be forced to choose between options they don't understand.* **Evidence:** per-category tier picker (Classic/Signature/Luxury, undefined), event-type list without guidance, budget tiers. **Recommend → Active** (the per-category tier picker is concrete, current evidence).
- **POS-P011 (One Engine, Multiple Confidence Layers):** Part 10 **reinforces**; status unchanged (**Needs Review** — no shipped voice).

---

## Part 15 — Notion Governance Update (existing DBs only, no duplicates)
- **Pattern 013 — Infer Before Asking** → Product Patterns (Draft).
- **AP-004 — Choice Without Guidance** → Product Patterns (Active).
- **Doctrine Ledger:** note 56B reinforcement on **POS-P011** and **POS-P012** (Evidence append; status unchanged).
- **Decisions Log:** extend the existing 56A intake decision with the **inference-intelligence roadmap** (venue-class → local-pricing → quote-eval sequence) rather than duplicate.
- **Product OS:** 56B governance note. *(Renumbering corrected: 013/AP-004, not the brief's 012/AP-003.)*

---

## Deliverable — EXECUTE / TEST / PARK / KILL (consolidated)
- **EXECUTE:** dead-field removal + de-dupe guest count (AP-003; the 56A decision).
- **TEST:** venue-class inference (#1) → local category pricing (#2) → quote evaluation (#3); experience-goal tier (#4); opportunity catalog (#6). Each reuses existing systems (regex, factor table, estimator, playbook data), is confirm-not-assert, and is reversible — and each is a candidate **functioning instance** that promotes Pattern 012/013 toward Canonical.
- **PARK:** host-persona voice (gated on Pattern 011 instance), predictive framing, non-playbook content extension, design light-slice.
- **KILL:** CAD/floorplan generation; inferred venue **adequacy** numbers (POS-P009-R1); per-category tier as a user choice; net-new free-text intake fields.

**Confidence:** High (direct code + 56A double-grep + this pass). **Weakest assumption:** the **B/C/D grades for design/opportunity/negotiation** rest on absence-of-evidence (no consumer found); a hidden surface could raise a grade — but the user-facing absence is what the host experiences, so the grade reflects lived reality. No build; audit only.
