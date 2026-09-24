# Decision & Playbook Schema Spec — the intelligence a decision must carry

**Status:** design spec (2026-07-15) · **status column re-measured against the corpus
2026-09-18** · **Owner doctrine:** every decision — authored in a
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

> **The status column was stale, and a stale spec is worse than no spec** — it is
> planned against. Five fields it listed as BLANK had shipped, in some cases months
> earlier, and three more shipped during the 2026-09-18 session. Every entry below now
> carries a MEASURED count (`scripts/` audit over the 45 playbook data files), not a
> recollection. Counts are occurrences of the authored key across `src/lib/playbooks/data/`.
>
> **SHIPPED** means the field is authored and a reader consumes it. **BLANK** means zero
> occurrences in the corpus. A field can be authored and still be inert — `blocks` is
> authored 250 times and contributes nothing to the score, which is measured and
> deliberate (see the note on it below); "authored" and "load-bearing" are different
> claims and this catalog now distinguishes them.

### A. Ranking & priority — the missing axis (Shape 3, but cheap; do early)
- `weight` · decision · `'low'|'med'|'high'` · **— → authored+Provenance → decision scorer** · **SHIPPED — 261 across 39 playbooks.** How consequential the decision is (venue vs place cards). Distinct from `risk.severity` (delay-only).
- `reversibility` · decision · `'reversible'|'costly'|'locked'` · **— → authored → urgency + budget** · **SHIPPED — 261 across 39.** A deposit-locked pick ≠ a change-anytime pick.
- `emotionalWeight` · decision · `'low'|'med'|'high'` · **— → authored → scorer + tone** · **SHIPPED — 261 across 39.** Floats the tribute/toast above logistics.
- `blastRadius` · decision · number (DERIVED from `blocks`/`dependsOn`) · **graph → — → scorer** · derivable now. How many downstream things it unblocks.

### A2. Fields the corpus authors that this spec never listed
Measured 2026-09-18. They exist, they are load-bearing, and a catalog that omits them
sends a reader looking for a gap that is already filled.

- `dependsOn` · decision · `decisionId[]` · **— → authored → gateHolder + the board's unlock count** · **SHIPPED — 491 across 35, and 100% name a real decision.** This is the real dependency graph.
- `blocks` · decision · `tag[]` · **— → authored → route + menu/beverage detection** · **AUTHORED 250 across 40 — and contributes ZERO to the score, deliberately.** Measured: only 46 of 471 entries name a real decision (against 67 of 67 for `dependsOn`); it sits on 92% of rows, so it cannot discriminate; giving it the obvious bump moved 8 rows of 249, and would mostly promote rows that gate nothing. It is a DOMAIN-TAG vocabulary, not a dependency graph. Not dead — it drives the Vendors deep link and menu/beverage detection. Do not "fix" this without re-reading `blocks IsNotAScore` first.
- `priorityBasis` · decision · `string` · **— → authored → rankReason** · **SHIPPED — 262 across 39.**
- `defaultWhy` · decision · `string` · **— → authored → why THIS option, not why the decision matters** · **SHIPPED — 135 across 34.** Two readers used to fall back to `why`, which answered a different question 127 times; the fallback is deleted.
- `whenChoice` · decision option · gate · **— → authored → conditional rows** · 119 across 13.
- `costFactors` / `affects` · decision · **— → authored → the money + sync layer** · 51 each, ~20 playbooks. 34 of 51 cost factors are tier `synthesized`, and none of that self-declared weakness reaches a host surface yet.
- `ask` · decision · `string` · **— → authored → `heroAskFor`** · **7 authored explicitly.** The board fills the rest from labels authored with a `?` (`ask: d.ask || authoredQuestion(d.label)`), which is why ~61% of board rows carry one. The 39% that do not fall through to a prose ladder that classifies by domain and title — and misfires whenever a surface's domain is not its job.
- `copyWhen` · decision · `[{when, why?, defaultWhy?, rationale?}]` · **facts → authored → conditional copy** · **SHIPPED 2026-09-18 — 5.** Evaluated by the same `clauseHolds` as `recommendedWhen`, same unknown-refuses contract.

### B. Timing — with provenance + coupling (Shapes 1 & 2)
- `when` · decision · `'T-Nd'` · existing (the deadline). Keep.
- `timingProvenance` · decision · `Provenance` · **— → grounds `when` → compression/taskLead** · **2 of ~260 (0.8%).** Effectively blank: nearly every `T-Nd` deadline is still a guess with no source, and those deadlines drive the urgency ladder and every "good to lock" line the host reads.
- `headsUp` · decision · number days (OPTIONAL override) · **— → authored → approach-window** · BLANK. Default is compression-derived (see `standardRunway`); this overrides per decision.
- `vendorLead` · decision · `{ inheritsFrom: vendorCategory }` · **vendor engine → — → timing** · GAP. A decision that `blocks:['vendors']` inherits how far ahead that vendor books as its real deadline.
- **playbook** `standardRunway` · number days + `Provenance` · **— → grounds compression → workflowCompression** · PARTIAL (lives in generic `STANDARD_LEAD_DAYS` with gaps — no Crab Feast). Move to playbook meta, sourced.

### C. Do-it-for-me / how the host decides (Shape 3 — powers propose-don't-ask)
- `difmCapable` · decision · `'can-derive'|'needs-host'` · **engines → — → auto-propose vs ask** · **SHIPPED — 262 across 39.** The signal that tells the app when to fill a grounded default (sides) vs ask (menu taste, a real quote).
- `defaultConfidence` · decision · `'fallback'|'recommendation'|'strong'` · **— → authored → how assertively we propose** · BLANK.
- `recommendedWhen` · decision · `[{ when: condition, pick: option }]` · **budget/count engines → — → the recommendation** · **MECHANISM SHIPPED 2026-09-18, AUTHORING AT 3.** `playbooks/recommendedPick.js` evaluates it against a fact bag built from the real engines, and an UNKNOWN fact refuses its rule rather than comparing as zero. The engine is live; the corpus has barely started using it. Best pick adapts to context instead of a static default.
- `effort` · decision · `'quick'|'compare'|'research'` · **— → authored → lead-time needed + help offer** · **BLANK, AND MEASURED NOT DERIVABLE 2026-09-24 — do not author it yet.** Two findings. (1) *No authored word settles it.* `impacts` became derivable because a `blocks` target names its own surface; nothing on a decision names how much work answering it is. The nearest signals — `when` (lead time, on all 260), `weight`, `reversibility`, `difmCapable`, option count — spread across **21 populated cells** of their cross-tab, so they do not collapse into three groups, and any rule mapping them to quick/compare/research would be invented rather than read. (2) *Nothing reads `effort`.* 260 authored rows behind no consumer is 260 rows of dead data. Build the reader first, or drop the field.
- `researchActions` · decision · `[{ step, why }]` · **— → authored → a real "help me decide" checklist / DIFM task** · PARTIAL (prose in `why` today).
- `decisionType` · decision · `'pick-one'|'multi'|'count'|'yes-no'|'free'` · **BLANK — 0 occurrences.** Everything is implicitly pick-one, and it bites: the repast headcount is a *count*, surprise/announced is *yes-no*, dietary is *multi*. Forcing a count into chips is why that headcount had to ship as a band-string.
- `relevantWhen` · decision · condition (generalizes `whenChoice`) · **event facts → — → surfacing** · **ALREADY SHIPPING UNDER FOUR NAMES — measured 2026-09-24. This row is NOT authoring work.** "PARTIAL" was being read as "author a condition on 260 decisions". It was measured instead, and the field exists, is authored, is wired, and reaches the host — spelled four ways: `whenChoice {id,in}` (4 decisions, show only while) · `standsDownWhen {id,in}` (9, retire once ANSWERED — a default is an assumption and never stands a real ask down) · `optionGates {option:{…}}` (5, prune one OPTION, and the host's own pick always outranks the gate) · `recommendedWhen [{when,pick}]` (3, move the recommendation). 21 declarations on 18 decisions, because three carry two dialects at once. `playbookDecisionBoard` applies the first three, `recommendedPick` the fourth, and hostv2 calls both. Behaviour pinned and proven non-vacuous in `src/lib/__tests__/relevantWhenAlreadyShips.test.js` (remove the gate, two tests go red). **What is actually left is a NAME, not rows:** four dialects of one condition means a reader must know all four and an author picks one unguided — a `blockVocabulary`-shaped unification, deferred because renaming a live gate is a behaviour change. Childcare-only-if-kids is separately handled by `whenKids`; the fact-condition half (50 vs 8 guests) is `recommendedWhen`, live since 2026-09-18.

### D. Consequence graph — the doctrine's "out" (Shape 2)
- `affects` · decision · existing (cost drivers). Keep.
- `impacts` · decision · `('budget'|'shopping'|'schedule'|'guestComms'|'seating'|'vendors'|'risk')[]` · **— → — → keep those surfaces in sync** · BLANK for non-cost. Alcohol hits shopping + liability + comms, not just cost.
- `causesRisk` · decision · `riskId` · **— → — → risk engine** · **BLANK, AND MEASURED NOT DERIVABLE 2026-09-24 — the only one of these three that is genuine authoring.** The link is not hiding on the risk end: 324 authored risks carry `{id, trigger, severity, mitigation}`, and a `trigger` is an English description of a STATE ("More RSVPs than chairs/place settings", "Outdoor party, no rain plan"), not a reference to a choice. **Exactly 3 of 324 triggers contain an option label verbatim, and 2 of those 3 are word coincidences** (a `Shellfish` dietary option matching "A guest has a shellfish allergy"). Deriving the link from trigger text would be precisely the guessing `decisionImpacts` was built to refuse. Real work, correctly sized: ~324 risks × the option that causes each. Sequence it behind a consumer — nothing reads `causesRisk` today either.
- `guestFacing` · decision · bool · **— → — → the provenance gate** · **SUPERSEDED 2026-09-18, not built as specced.** The spec imagined a decision flag; the measured leak was a TEMPLATE IN A TEXT FIELD — a bracketed draft written straight into `parkingNotes` and printed verbatim on the invite. `lib/guestFacing.js` gates on the text itself (an unfilled `[blank]` is our handwriting, not the host's), which needs no field retrofitted and cannot be forgotten by a new writer. The decision flag would today be a gate with nothing to gate.

### E. Human & emotional (Shape 3 — true blanks)
- `heartMomentDecisionId` · playbook · links a `heartMoment` → the decision that delivers it · **— → — → momentProtect + scorer** · BLANK. So picking a default that kills the moment warns the host.
- `honoreeCentric` · playbook/event · bool + `honoreeId` · **— → — → scorer + seating adjacency** · PARTIAL (honoree is a display string with zero pull).
- `sensitivity` · **event property** · `'celebratory'|'bittersweet'|'somber'|'neutral'` · **— → stored (not the `SOMBRE_RE` regex) → every engine softens** · PARTIAL (regex-inferred in copy only, duplicated).
- `emotionalRisk` · risk item · the emotional failure modes ("surprise leaks", "honoree feels forgotten", "estranged relatives clash") · **— → authored → risk surfacing** · BLANK.

### F. Host state (Shape 3 — true blanks; wire the one that exists)
- `hostExperienceLevel` · event/profile · `'first-time'|'some'|'seasoned'` · **hostIntel → — → DIFM intensity + compression + copy verbosity** · BLANK. App assumes "solo first-timer" universally.
- `hostCapacity` · event · `'solo'|'has-help'|'coordinator'` · **— → — → DIFM load** · **SHIPPED 2026-09-18 — 10 uses across 5 playbooks.** It is now a fact key in `recommendedPick.js` alongside `helperCount`, and nine authored strings that asserted the host was alone stand down on either signal. The rule worth knowing: **`helperCount` is `known` only when positive** — one named helper is evidence of help, zero is silence, so the app can never derive "you're on your own" from nothing.
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
