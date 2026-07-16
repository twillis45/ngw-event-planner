# Decision & Playbook Schema Spec — the intelligence a decision must carry

**Status:** design spec (2026-07-15) · **Owner doctrine:** every decision — authored in a
playbook or made by the app for the host — must declare what it **reads** from the engines
(in), how it is **grounded** (intelligence + provenance), and what it **impacts** (out). No
standalone picks. A decision missing any of the three is incomplete and should be flagged by
the gap-detector. See `feedback-decisions-wire-to-engines` and `feedback-propose-dont-ask`.

This spec converges the decision-intelligence brainstorm (timing, weight, reversibility,
human, cultural, accessibility, environmental, legal) into one field catalog, each field
tagged with its doctrine wiring and the engine it plugs into.

---

## 1. What a decision carries TODAY (baseline)

Decision object (in `src/lib/playbooks/data/*.js`):
`id, label, options[], default, when ('T-Nd' deadline), blocks[], dependsOn[], whenChoice
(conditional relevance), why (prose), costFactors, costFactorProvenance, affects[]
(cost drivers), ladderKeys, noCostEffect, risk {ifDelayed, severity}, owner`.

Playbook meta: `typicalGuests, typicalDurationHours, leadTimeDays, perGuestCost, scaleBy,
hostDifficulty (authored on all 40 — READ BY NOTHING), heartMoments[]`.

The board derives `status (ready|waiting|overdue|locked), dueDate, daysOut, route`.

**The honest state (from the engine-wiring audit):** money is the *only* sourced field;
timing is a bare deadline; and the meaning/human/context dimensions are prose, regex, or a
tone palette — no field an engine can reason over.

---

## 2. The canonical Provenance shape (reused everywhere)

The cost data already carries this; the spec generalizes it to timing, advice, and any
researched field:

```
Provenance = {
  tier: 'researched' | 'synthesized' | 'norm',   // researched = real dated sources
  confidence: 'high' | 'medium' | 'low',
  verificationStatus: 'researched' | 'synthesized',
  sources: string[],          // dated, named — e.g. "The Knot venue-lead survey 2025"
  claim: string,              // the exact claim being made
  sufficientWhen: string,     // what would make this researched-grade
  note: string,
  researchedAt: string,       // ISO date
}
```

Rule: any field marked `needsResearch` by the gap-detector must eventually carry a
`Provenance` with `tier: 'researched'`. Until then it ships `synthesized` and is honestly
labelled — never presented as fact.

---

## 3. Build order — the three shapes the gaps collapse into

The ~20 gaps are three structural problems, not twenty. Ship in this order:

1. **Extend provenance beyond cost.** Timing and advice are unsourced. (Fields: `timingProvenance`,
   `recommendationProvenance`, playbook `standardRunway` + provenance.)
2. **Couple engines through the decision.** Vendor-lead ✕ timing, weather ✕ food/decisions,
   place ✕ decisions never meet. (Fields: `vendorLead`, `weatherDependent`, `venueConstraint`,
   `impacts`, `causesRisk`.)
3. **Give the human layer its first structured fields.** Emotional weight, host capacity,
   culture, access, relationships have neither field nor engine. (Fields in §4.E–H.)

Everything is **nullable and additive** — no existing playbook breaks; an unset field means
"not yet modelled," which the gap-detector surfaces rather than the engine assuming.

---

## 4. The field catalog

Format: `field` · *level* · type · **reads → grounds → impacts (engine)** · status today.

### A. Ranking & priority — the missing axis (Shape 3, but cheap; do early)
- `weight` · decision · `'low'|'med'|'high'` · **— → authored+Provenance → decision scorer** · BLANK. How consequential the decision is (venue vs place cards). Distinct from `risk.severity` (delay-only).
- `reversibility` · decision · `'reversible'|'costly'|'locked'` · **— → authored → urgency + budget** · BLANK. A deposit-locked pick ≠ a change-anytime pick.
- `emotionalWeight` · decision · `'low'|'med'|'high'` · **— → authored → scorer + tone** · BLANK. Floats the tribute/toast above logistics.
- `blastRadius` · decision · number (DERIVED from `blocks`/`dependsOn`) · **graph → — → scorer** · derivable now. How many downstream things it unblocks.

### B. Timing — with provenance + coupling (Shapes 1 & 2)
- `when` · decision · `'T-Nd'` · existing (the deadline). Keep.
- `timingProvenance` · decision · `Provenance` · **— → grounds `when` → compression/taskLead** · BLANK. `T-7d` is currently a guess with no source.
- `headsUp` · decision · number days (OPTIONAL override) · **— → authored → approach-window** · BLANK. Default is compression-derived (see `standardRunway`); this overrides per decision.
- `vendorLead` · decision · `{ inheritsFrom: vendorCategory }` · **vendor engine → — → timing** · GAP. A decision that `blocks:['vendors']` inherits how far ahead that vendor books as its real deadline.
- **playbook** `standardRunway` · number days + `Provenance` · **— → grounds compression → workflowCompression** · PARTIAL (lives in generic `STANDARD_LEAD_DAYS` with gaps — no Crab Feast). Move to playbook meta, sourced.

### C. Do-it-for-me / how the host decides (Shape 3 — powers propose-don't-ask)
- `difmCapable` · decision · `'can-derive'|'needs-host'` · **engines → — → auto-propose vs ask** · BLANK. The signal that tells the app when to fill a grounded default (sides) vs ask (menu taste, a real quote).
- `defaultConfidence` · decision · `'fallback'|'recommendation'|'strong'` · **— → authored → how assertively we propose** · BLANK.
- `recommendedWhen` · decision · `[{ when: condition, pick: option }]` · **budget/count engines → — → the recommendation** · BLANK. Best pick adapts to context instead of a static default.
- `effort` · decision · `'quick'|'compare'|'research'` · **— → authored → lead-time needed + help offer** · BLANK.
- `researchActions` · decision · `[{ step, why }]` · **— → authored → a real "help me decide" checklist / DIFM task** · PARTIAL (prose in `why` today).
- `decisionType` · decision · `'pick-one'|'multi'|'count'|'yes-no'|'free'` · **— → — → UI render + validation** · BLANK (`options` implies pick-one).
- `relevantWhen` · decision · condition (generalizes `whenChoice`) · **event facts → — → surfacing** · PARTIAL. Childcare only if kids; alcohol only adult events; buffet-vs-plated matters more at 50 than 8.

### D. Consequence graph — the doctrine's "out" (Shape 2)
- `affects` · decision · existing (cost drivers). Keep.
- `impacts` · decision · `('budget'|'shopping'|'schedule'|'guestComms'|'seating'|'vendors'|'risk')[]` · **— → — → keep those surfaces in sync** · BLANK for non-cost. Alcohol hits shopping + liability + comms, not just cost.
- `causesRisk` · decision · `riskId` · **— → — → risk engine** · BLANK. "DIY the food" raises a day-of-overwhelm risk; today risk is a separate authored list, unlinked to the choice that causes it.
- `guestFacing` · decision · bool · **— → — → the provenance gate** · BLANK. Does this produce something guests must be told (start time yes, DIY-vs-cater no)? Gates derived values out of invites until confirmed.

### E. Human & emotional (Shape 3 — true blanks)
- `heartMomentDecisionId` · playbook · links a `heartMoment` → the decision that delivers it · **— → — → momentProtect + scorer** · BLANK. So picking a default that kills the moment warns the host.
- `honoreeCentric` · playbook/event · bool + `honoreeId` · **— → — → scorer + seating adjacency** · PARTIAL (honoree is a display string with zero pull).
- `sensitivity` · **event property** · `'celebratory'|'bittersweet'|'somber'|'neutral'` · **— → stored (not the `SOMBRE_RE` regex) → every engine softens** · PARTIAL (regex-inferred in copy only, duplicated).
- `emotionalRisk` · risk item · the emotional failure modes ("surprise leaks", "honoree feels forgotten", "estranged relatives clash") · **— → authored → risk surfacing** · BLANK.

### F. Host state (Shape 3 — true blanks; wire the one that exists)
- `hostExperienceLevel` · event/profile · `'first-time'|'some'|'seasoned'` · **hostIntel → — → DIFM intensity + compression + copy verbosity** · BLANK. App assumes "solo first-timer" universally.
- `hostCapacity` · event · `'solo'|'has-help'|'coordinator'` · **— → — → DIFM load** · BLANK. Retirement's own `why` admits "one host can't run a buffet, tend bar, AND run the program" — no field captures whether they have help.
- `hostConfidenceNeeded` · decision · `'low'|'high'` · **— → authored → hand-holding intensity** · BLANK.
- `hostDifficulty` · playbook meta · existing — **CONSUME IT.** Authored on all 40, read by nothing. Wire → DIFM intensity + reassurance pacing.
- `hostWorry` · captured event input · free/enum · **host → — → reassurance voice** · BLANK. Reassurance is computed from objective readiness only; capture what they fear.

### G. Cultural & religious (Shape 3 — near-blanks)
- **playbook** `region` / `regionSpecific` · string[] · **— → — → regional vendor/pricing/culinary adaptation** · BLANK (hard-coded in comments — "Maryland", "Gullah-Geechee").
- **playbook** `culturalContext` · `{ tradition, diasporaVariants[], sourceNote, familyChoiceLeads: true }` · **— → grounds → UI honors "family's choice leads"** · PARTIAL (prose in `knowledge.note`).
- `religiousConstraint` · event/decision · `{ alcohol: 'dry-belief'|'served'|'na', dietaryLaw: 'halal'|'kosher'|'none', observanceDates: [] }` · **— → — → procurement + vendor + menu** · BLANK. Distinguishes dry-for-belief from dry-for-budget; halal/kosher become constraints, not a menu-text regex hit.
- `dietaryKind` · on the `dietary` decision · `'allergy'|'belief'|'both'` · **— → — → menu + procurement** · BLANK. `dietaryResolved` collapses safety and belief into one binary.

### H. Accessibility & inclusion (Shape 3 — near-blanks)
- **playbook** `accessibility` / `accessibilityNotes` · structured · **— → — → the `accessibilityDimension()` check that already looks for it and never finds it** · BLANK. Populating it turns a perpetual warning into real guidance.
- `accessibilityImpact` · decision (venue/menu/timeline) · `{ mobility, hearing, vision, sensory, foodTexture }` · **— → — → seatingPlan + timeline + menu prompts** · BLANK (one wheelchair seat-regex today).
- `ageAppropriate` / `minorSafety` · decision (alcohol/activity) · **— → — → alcohol + activity gating** · PARTIAL (graduation/sweet-16 prose).
- `childcare` · **general decision** (today only `dest_childcare` exists) + kid dims `kidMenu`, `kidTiming`, `kidSafety`, `kidEntertainment` · **kidCount → — → provisioning** · BLANK outside destination. Kids are a food multiplier, not a planning dimension.
- `languageSupport` · event · `{ primaryLanguage, interpreter, translatedMaterials }` · **— → — → guest comms** · BLANK (no foothold anywhere).
- `neurodiversitySupport` / `sensoryFriendly` · event/decision · **— → — → venue + schedule** · BLANK (one prose sentence in `teamRetreat`).

### I. Environmental / external (Shape 2 — engines exist, unwired)
- `weatherDependent` · decision · `{ mode: 'outdoor-exposed'|'heat'|'cold'|'none' }` · **weather engine → — → re-surface on forecast turn + contingency** · GAP. Dependence is inferred from event *type* (a regex), not per decision.
- `venueConstraint` · decision · `{ needs: ('kitchen'|'power'|'space'|'noise-ok'|'parking'|'accessible')[] }` · **placeIntelligence → — → gate (waiting)** · GAP. Catering needs kitchen access; amplified music needs a noise-OK venue.
- `regulatory` / `permitNeeded` · decision/event · `{ type: 'liquor-license'|'park-permit'|'noise-curfew'|'fire-code'|'fireworks', byLocation: true }` · **location → — → a real gating task + risk** · GAP. Alcohol is a taste choice today, never a law; permits live in risk prose.
- `seasonal` · decision/option · `{ supplyWindow, priceSwing, availabilityRisk }` · **date+market → — → cost + timing + risk** · GAP. Crab season, flowers, a July-4 crab house slammed — prose in a risk trigger today.

---

## 5. Backward-compat, gap-detection, admin

- **Additive & nullable.** Every field defaults null/absent → "not modelled," which the
  gap-detector surfaces; the engine never assumes.
- **Gap-detector.** Extend `playbookSchema.GAP_CRITERIA` (cost-only today, with a literal
  `// TODO`) with one criterion per researchable field: a decision touching money must feed
  the budget engine; one with `blocks:['vendors']` must declare `vendorLead`; `when` must
  carry `timingProvenance`; etc. A decision with no engine connection, no provenance, or no
  declared impact is a review red flag.
- **Admin Command Center.** The read-only Playbook OS surfaces coverage; add the new
  dimensions: timing-provenance coverage, standard-runway coverage, a per-playbook decision
  timeline (spot a `blocks` decision due *after* the thing it gates), dependency-graph health,
  and the human/cultural/access coverage — so a maintainer can *see* what's missing and drive
  research to it.

---

## 6. What ships first (priority tier)

Four fields turn the board from "a list sorted by deadline" into a priority engine, and they
double as the inputs the frictionless work needs:

1. `weight` + `reversibility` — the missing importance axis for the scorer.
2. `difmCapable` — the propose-vs-ask signal for the frictionless doctrine.
3. `hostExperienceLevel` (+ wire the existing `hostDifficulty`) — adapt DIFM intensity to the host.
4. `heartMomentDecisionId` — connect the app's emotional vocabulary to the decisions that deliver it.

Then Shape 1 (timing/advice provenance), Shape 2 (engine coupling), and the rest of Shape 3
(cultural, access, environmental, legal), each fed by research that now has a
provenance-carrying field to land in.
