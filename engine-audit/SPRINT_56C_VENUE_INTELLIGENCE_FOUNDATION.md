# Sprint 56C — Venue Intelligence Foundation Audit & Design

*Audit + design only. No build, no runtime change, no new engine, no intake redesign. Question: should a **Venue Intelligence Foundation** become a core Product OS capability — the layer that lets NGW understand **places**, not just events? Builds on 56B (venue = Grade D, the highest-leverage first inference). Date: 2026-06-17.*

## Verdict up front
**Yes — Venue Intelligence is the foundational layer**, and it can be built **doctrine-safe** as *authored data + a classifier over the existing `COMMUNITY_VENUE_RE` seed* — **not** an AI/pricing/quote engine. The dependency map (Part 4) shows budget-profile, quote evaluation, vendor-fit, risk, opportunity-modifier, and design all depend on **venue class**. It is the root. The one hazard — presenting inferred adequacy as fact — is fenced by **Pattern 014 (Show Confidence Boundaries)** + **AP-005 (False Precision)** + the existing **POS-P009-R1 (Never Infer Venue Adequacy)**.

**Numbering confirmed clean:** Patterns reach 013 (56B) → **014/015 free**; anti-patterns reach AP-004 (56B) → **AP-005 free**. The brief's numbers are correct.

**Current state (code):** `event.venue` is a free-text string; `venueTags` collected but unread; the only classifier is `COMMUNITY_VENUE_RE` (`App.js:2323`) → a single budget-stretch **text hint**; `isLikelyOutdoor` keyword regex → weather; COI default when a venue exists. **No `venueClass`, no class model, no confidence tiers.**

---

## Part 1 — Venue Intelligence Taxonomy
The ~32 example venues collapse to **7 canonical classes** (a `venueClass` enum, classified by extending the existing regex). Overlap is handled by a primary class + modifier flags.

| Canonical class | Members | Recognizer seed | Overlap/modifiers |
|---|---|---|---|
| **1. Home / Private** | Home, Backyard, Condo clubhouse | (none yet) | indoor/outdoor; host-owned vs HOA |
| **2. Community / Fraternal Hall** | Community center, Church/Synagogue/Temple hall, VFW, American Legion, Elks, Moose, Fire hall, School gym, Grange, Union hall | **`COMMUNITY_VENUE_RE` (exists)** | faith-based (rules) vs fraternal (BYO bar) |
| **3. Hospitality / F&B-led** | Restaurant private room, Restaurant buyout, Brewery, Winery, Distillery | (none yet) | in-house F&B mandatory; min-spend |
| **4. Hotel / Conference** | Hotel ballroom, Conference center | (none yet) | catering minimum; full-service |
| **5. Club (Member)** | Country club, Yacht club, Golf club | (none yet) | membership/sponsor; premium; in-house F&B |
| **6. Outdoor / Blank-canvas** | Barn, Farm, Beach, Park pavilion, Rooftop | partial (`isLikelyOutdoor`) | weather-exposed; rentals-heavy; permits |
| **7. Cultural / Institutional** | Museum, Art gallery, Historic property, Government facility | (none yet) | restriction-heavy; blank-canvas; premium |

**Canonical taxonomy = `venueClass` (7) + modifier flags** {indoor/outdoor, in-house-F&B, blank-canvas, member-gated, faith-based}. It slots beside the existing `eventTaxonomy.mjs` model (a parallel classifier), keyed by name-regex first, user-confirm second.

---

## Part 2 — Venue Class Model (design only)
Per class: typical **inclusions · restrictions · risks · budget profile**. *Every cell is a "typical assumption to confirm," never a measured fact (Part 3 + AP-005).*

| Class | Common inclusions | Common restrictions | Common risks | Budget profile |
|---|---|---|---|---|
| **Home/Private** | the space (≈$0 rental); residential kitchen/restrooms | neighbors/noise; capacity by space | parking limited; residential restrooms; cleanup on host | venue≈$0 → spend shifts to rentals/food/staff |
| **Community/Fraternal** | tables, chairs, kitchen often, parking often | alcohol permit/BYO rules; decor (no open flame); cleanup | basic AV; dated facilities; member-discount varies | **low flat rental ($300–2,500)**; biggest budget-stretch class |
| **Hospitality (F&B)** | F&B, staff, basic AV, restrooms | **must use in-house catering/bar**; min-spend; limited decor | min-spend overrun; limited time blocks | no rental but **food/bev minimum** dominates |
| **Hotel/Conference** | ballroom, staff, AV, parking (paid), linens | **catering minimum**; corkage; vendor lists | service fees + tax (24–28%); AV markup | high; venue+catering = majority of budget |
| **Club (member)** | grounds, F&B, staff, AV, parking | membership/sponsor; in-house F&B; dress/conduct rules | member sponsor required; premium pricing | premium; in-house F&B + facility fee |
| **Outdoor/Blank-canvas** | the space; sometimes power/water | permits; noise curfew; **bring everything** | **weather**; power/water; restrooms (portable); access | low venue but **high rentals** (tent/power/restrooms) |
| **Cultural/Institutional** | iconic space, sometimes AV | **strict** decor/food/vendor rules; insurance; security | conservation rules; tight load-in; premium | high facility fee + approved-vendor premiums |

This is **authored content** (≈7 classes × 4 dimensions), not an engine — the same shape as the playbook data model.

---

## Part 3 — Confidence Boundary Matrix (Pattern 014)
The rule that makes the whole thing safe. Per attribute, where the inference lives:

| Attribute | Known (from a recognized name) | Likely (reasonable inference) | Estimated (probabilistic, show range) | Unknown (must ask) |
|---|---|---|---|---|
| **Venue class** | ✅ (e.g., "VFW" → Community/Fraternal) | | | (if name unrecognized → Unknown) |
| **Inclusions (tables/chairs/kitchen)** | | ✅ "usually included" | | exact list → confirm |
| **BYO catering / bar** | | ✅ "often allowed" | | the **policy** → confirm |
| **Rental cost** | | | ✅ "$500–2,500 range" | the **quote** → ask |
| **Setup responsibility** | | ✅ "likely host" | | confirm |
| **Indoor/outdoor → weather exposure** | ✅ (class-derived) | | | |
| **Alcohol policy / permit** | | | | ❓ **always confirm** |
| **Kitchen access** | | ✅ "often" | | ❓ confirm |
| **Decor restrictions** | | ✅ "often no open flame" | | ❓ confirm |
| **Insurance / COI requirement** | | ✅ "often required (non-home)" | | ❓ confirm |
| **Parking ADEQUACY (enough for N cars)** | | | | ❓ **NEVER infer — confirm only** |
| **Restroom ADEQUACY** | | | | ❓ **NEVER infer — confirm only** |
| **Power CAPACITY** | | | | ❓ **NEVER infer — confirm only** |
| **Accessibility COMPLIANCE** | | | | ❓ **NEVER infer — confirm only** |

**The doctrinal line:** typical **inclusions/policies** = *Likely* (safe — "VFW halls usually have a kitchen"). **Adequacy for THIS event** (parking/restroom/power/ADA *enough*) = **Unknown/confirm, forever** (POS-P009-R1). The success-condition example is compliant: "parking usually included" (Likely inclusion) ✓, but "parking is adequate" would be AP-005. This matrix is Pattern 014's reference implementation.

---

## Part 4 — Market Intelligence Dependency Map
```
                ┌─────────────────────┐
                │  VENUE CLASS (root) │  ← Sprint 56C foundation
                └─────────┬───────────┘
        ┌─────────────────┼───────────────────┬───────────────┐
        ▼                 ▼                   ▼               ▼
  Budget profile     Risk profile       Vendor-fit       Design context
 (cost share,        (indoor/outdoor,   (BYO vs in-house, (space type,
  what to budget)     restrictions)      needs)            staging)
        │                                   │
        ▼                                   │
  Local market  ◄───────────────────────────┘
 (class cost-profile × metro factor)
        │
        ▼
  Quote evaluation ──► Negotiation
        │
        ▼
  Opportunity (type-led, venue-MODIFIED)
```
**Sequence:** Venue class → {budget-profile, risk, vendor-fit} → local market → quote/negotiation → opportunity/design. **Everything advanced depends on venue.** This is the evidence for **Pattern 015 (Venue Before Budget)**.

---

## Part 5 — Local Market Architecture
- **Current:** national per-head band (by type) × one coarse `METRO_MARKETS` factor (DC/NoVA present, no Baltimore/Pasadena). **Strength:** simple, ships, directionally right. **Weakness:** one number can't express "a *community hall* in *Pasadena* rents flat $500–2,500" vs "a *hotel ballroom* runs $8k+".
- **What venue intelligence unlocks:** the **cost *profile* by class** (flat-rental vs %/guest vs F&B-minimum) — the missing axis. Combined with the metro factor → a *local venue estimate*, not just a per-head guess.
- **Future architecture (design only):** `venueClass → cost-profile (national typical range + model: flat | per-guest | min-spend)` × `metroFactor` = local venue estimate. Reuses the `METRO_MARKETS` shape; adds a per-class cost-profile table. **No build.**

---

## Part 6 — Quote Intelligence Audit (VFW · Pasadena · $4,000)
With venue class + cost-profile + local factor, NGW *could* say: a bare **Community/Fraternal** hall typically rents **$300–2,500** (× ~1.0 Baltimore-area). **$4,000 reads HIGH for the class** → *"That's above typical for a VFW hall — it likely bundles catering, bar, or staff. Ask what's included before comparing."* Conversely **$200 for a Hotel ballroom** → *suspiciously low → likely a deposit/room-only*.
- **Can NGW determine reasonable/expensive/low?** Yes — **once venue class + class cost-profile + local factor exist** (all 56C-dependent).
- **Additional data required:** the per-class cost-profile table (Part 2/5) + the inclusions model (to explain *why* high = "probably includes X"). **Design only — do not build the quote engine yet (it's downstream of venue).**

---

## Part 7 — Opportunity Intelligence Dependency Audit
Opportunity depends, in order: **Event Type (primary)** → Guest Count → Theme → **Venue Class (modifier)** → Budget.
- Type drives the catalog (Graduation → achievement wall, mentor recognition). Venue class **modifies** feasibility (blank-canvas barn enables staging/large displays; restaurant private room doesn't; a community hall's kitchen enables a potluck/dessert table).
- **Buildable before venue intelligence:** the **type-led catalog** (authored, like risks). **Only after venue class:** venue-*conditioned* filtering ("skip the 12-ft memory wall — your restaurant room can't host it"). → opportunity v1 doesn't block on 56C; venue-conditioning is a 56C dependent.

---

## Part 8 — Design Intelligence Dependency Audit (Navy Retirement · Black&Gold · VFW · 120)
- **Requires first:** venue **class** (Community/Fraternal → typically one open rectangular room, stage often present, kitchen at rear) — gives *rough* layout assumptions. **Theme** (Navy/Black&Gold) → decor *direction* (reuses the AI-brief path).
- **Currently missing:** the **space model** — actual **dimensions, shape, fixed features** (stage, bar, entrances). NGW has none of this; venue class gives *typical* shape, not *this* room.
- **Verdict:** **decor direction + signature moments** (theme-led) are feasible *after* venue class. **Room layout / guest flow / staging placement need a space model → PARK.** CAD/floorplan generation stays **KILLED** (floorplans parked; web app can't measure space). Venue class is necessary-but-not-sufficient for layout.

---

## Part 9 — Product OS Governance (evidence-gated)

**Pattern 014 — Show Confidence Boundaries** *(NEW)* — *Separate Known / Likely / Estimated / Unknown; never blend. Trust rises when certainty is visible.*
- **Evidence:** the principle is **already embodied in pockets** — budget shows *ranges* (estimate, not fact), Reality Check shows *prompts* (not facts), capacity shows *requirements* (not deficits, Pattern 010), POS-P009-R1 fences adequacy. So 014 is the *generalization* of patterns NGW already ships — strong evidence it's real and safe. It is also the **safety rail for all of venue intelligence**.
- **Recommend → Draft (Patterns) + POS-P014 Needs Review (Ledger).** Promotes to Canonical with the first shipped surface that renders the 4 tiers explicitly (the venue card). The most important governance output of 56C.

**Pattern 015 — Venue Before Budget** *(NEW; generalize as "Foundation Before Derivation")* — *Establish the foundational context layer (venue) before the dependent intelligence (budget/quote/negotiation/design).*
- **Evidence:** the Part 4 dependency map. Generalized form is platform doctrine (Lighting: fixture/space before exposure; Photography: shoot context before pricing).
- **Recommend → Draft.** It's a **sequencing heuristic** with map-evidence but no shipped proof of necessity; keep at Draft until the venue→budget chain ships. (If the board prefers, this can live as a Decisions-Log sequencing decision rather than a Pattern — flagged for review.)

**AP-005 — False Precision** *(NEW)* — *Presenting estimated/inferred values as known facts (inferred parking counts, restroom/power/ADA adequacy).*
- **Evidence (strong):** this is the exact hazard venue intelligence introduces, and it has **doctrinal precedent** (POS-P009-R1 already forbids inferring adequacy). The confidence matrix (Part 3) is the defense.
- **Recommend → PROMOTE / Active.** It is the named guardrail that makes Venue Intelligence safe to build; the companion to Pattern 014.

---

## Part 10 — Prioritized Intelligence Roadmap
Scored 1–5 (Trust · User · Revenue · Cross-product reuse · *Complexity* where 5 = hardest):
| Initiative | Trust | User | Revenue | Reuse | Complexity | Bucket |
|---|---|---|---|---|---|---|
| **Venue Intelligence Foundation** (taxonomy + class model + confidence tiers) | 5 | 5 | 4 | 5 | 3 | **EXECUTE** (next build) |
| **Confidence-boundary rendering** (Pattern 014 on the venue card) | 5 | 4 | 2 | 5 | 2 | **TEST** (with the foundation) |
| **Local market by class** (cost-profile × metro) | 4 | 4 | 5 | 5 | 3 | **TEST** (after venue) |
| **Quote intelligence** | 4 | 4 | 5 | 4 | 3 | **PARK** → TEST after venue+market |
| **Opportunity (type catalog)** | 4 | 4 | 3 | 4 | 2 | **TEST** (type-led, not venue-blocked) |
| **Negotiation** | 4 | 3 | 5 | 4 | 4 | **PARK** (downstream of quote) |
| **Design (decor direction/signature)** | 3 | 3 | 4 | 3 | 4 | **PARK** |
| **Design (layout/flow)** | 3 | 3 | 4 | 2 | 5 | **KILL** (needs space model; CAD parked) |
| **Inferred adequacy numbers** (parking/restroom/power/ADA) | — | — | — | — | — | **KILL** (POS-P009-R1 / AP-005) |

**EXECUTE:** the **Venue Intelligence Foundation** as *authored data (7-class model) + a name→class classifier extending `COMMUNITY_VENUE_RE` + the confidence-tier shape* — doctrine-safe, no AI, unblocks everything. **TEST:** Pattern-014 render + opportunity type-catalog + local-market-by-class. **PARK:** quote/negotiation/design-direction (sequenced after venue+market). **KILL:** layout/CAD, any inferred adequacy.

---

## Notion Governance Update (existing DBs only, no duplicates)
- **Pattern 014 — Show Confidence Boundaries** → Product Patterns (Draft) + Doctrine Ledger **POS-P014** (Needs Review).
- **Pattern 015 — Venue Before Budget** → Product Patterns (Draft).
- **AP-005 — False Precision** → Product Patterns (Active).
- **Decisions Log** → "Build the Venue Intelligence Foundation (authored class model + classifier + confidence tiers)" (Open — implementation recommended as the next build).
- **Product OS** → 56C governance note. *(Links in the chat report.)*

---

## Deliverables index (this doc): Taxonomy (P1) · Class Model (P2) · Confidence Matrix (P3) · Dependency Map (P4) · Market Arch (P5) · Quote (P6) · Opportunity dep (P7) · Design dep (P8) · Governance (P9) · Roadmap (P10).

**Confidence:** High that Venue Intelligence is the foundational layer (dependency map is unambiguous) and that it is doctrine-safe as authored data + classifier. **Weakest assumption:** the per-class cost ranges (Part 2/5) are domain-typical, not market-measured — they must ship as **Estimated ranges** (Pattern 014), never as Known facts (AP-005), and be tuned against real quotes once collected. No build performed; audit + design only.
