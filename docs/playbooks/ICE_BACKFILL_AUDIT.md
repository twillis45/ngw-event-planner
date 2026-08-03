# p_ice Backfill Audit

**Date:** 2026-08-01. ASCII-only. Phase 5F.3 Steps 1-2.
**Status:** audit + classification only. **No values changed by this document.**
**Model:** `ICE_PURCHASE_MODEL.md`.

---

# 1. Method

Measured from `ALL_PLAYBOOKS` and `playbookFoodPlan` at 18 guests. Indoor/outdoor
signals are keyword-density counts over the whole playbook (`outdoor, backyard, patio,
lawn, park, tent, canopy, grill, smoker, propane, fryer, pool, beach, yard` vs
`indoor, banquet, dining room, hotel, ballroom, conference, ...`).

**Signal counts are a hint for a human, not a classifier.** They are shown so a reader
can disagree with a classification, which is the point.

`Grounded` = `isGroundedItemQty` passes: `tier === 'researched'` AND every cited id
resolves in `QTY_SOURCES`. A `norm` or `trade-heuristic` tier does **not** ground, even
when the number is right.

---

# 2. The population

**29 playbooks carry `p_ice`. All 29 render it.** Five authored rates.

| Playbook | Value | Tier | Source | out/in | Category | Reason | Grounded | Needs human |
|---|---|---|---|---|---|---|---|---|
| Get-Together | 2.0 | trade-heuristic | - | 87/5 | **Outdoor** | overwhelming outdoor signal; value already at baseline | no | no |
| The Cookout | 2.0 | trade-heuristic | - | 86/2 | **Outdoor** | all-day outdoor cook | no | no |
| Reunion | 2.0 | norm | - | 68/10 | **Outdoor** | note already says "outdoors" | no | no |
| Fish Fry | 1.5 -> 2.0 | researched | reddy-ice-2026 | 66/2 | **Outdoor** | outdoor propane fryer sized at indoor rate | **DONE 5F.2** | no |
| Juneteenth Cookout | 2.0 | trade-heuristic | - | 48/5 | **Outdoor** | outdoor June cookout | no | no |
| Crawfish Boil | 2.5 | NONE | - | 40/1 | **EXCEPTION** | 2.5 exceeds every registered source (max ~2.1) | no | **YES** |
| Day Party | 2.0 | trade-heuristic | - | 32/3 | **Outdoor** | note says "on the high end" | no | no |
| Low Country Boil | **1.5** | NONE | - | **31/2** | **Outdoor** | **outdoor boil authored at the indoor rate - same defect as Fish Fry** | no | no |
| Graduation | 2.0 | trade-heuristic | - | 31/3 | **Outdoor** | board-corrected to 2.0 already | no | no |
| Crab Feast | 2.0 | NONE | - | 19/2 | **Outdoor** | "hot afternoon", flagged under-bought | no | no |
| Gender Reveal | 1.0 | trade-heuristic | - | 19/6 | **Unknown** | note itself says "(2 if hot/outdoor)" - conditional by design | no | **YES** |
| Vow Renewal | 1.5 | researched | bar-provision-2026 | 19/12 | Mixed | already grounded at indoor baseline | **yes** | no |
| Birthday | 1.5 | researched | bar-provision-2026 | 9/3 | Indoor | already grounded | **yes** | no |
| Sweet 16 | 1.25 | norm | - | 8/2 | **EXCEPTION** | note: "~1 baseline; bump..." - conditional, and 1.25 matches no baseline | no | **YES** |
| Holiday Party | 1.5 | researched | bar-provision-2026 | 8/3 | Indoor | already grounded | **yes** | no |
| Quinceanera | 1.5 | norm | - | 8/8 | **Mixed** | evenly split; value already at indoor baseline and event is bar-served | no | no |
| Bachelor Party | 2.0 | trade-heuristic | - | 7/3 | **Unknown** | note says "1.5-2"; venue not determinable | no | **YES** |
| Bridal Shower | 1.5 | researched | bar-provision-2026 | 6/8 | Indoor | already grounded | **yes** | no |
| Dinner Party | 1.5 | NONE | - | **5/0** | **Indoor** | zero outdoor signal; value already at baseline | no | no |
| Bachelorette Party | 1.5 | researched | bar-provision-2026 | 4/7 | Indoor | already grounded | **yes** | no |
| Housewarming | 1.25 | trade-heuristic | - | 4/1 | **EXCEPTION** | note: "~1-1.5"; 1.25 is a midpoint matching no baseline | no | **YES** |
| Game Night | 1.0 | trade-heuristic | - | 3/5 | **EXCEPTION** | "cups + cooling cans", no bar - indoor source is out of scope | no | **YES** |
| Anniversary | 1.5 | researched | bar-provision-2026 | 12/12 | Mixed | already grounded | **yes** | no |
| Engagement Party | 1.5 | researched | bar-provision-2026 | 12/13 | Mixed | already grounded | **yes** | no |
| Retirement Party | 1.5 | researched | bar-provision-2026 | 11/15 | Indoor | already grounded | **yes** | no |
| Baby Shower | 1.5 | researched | bar-provision-2026 | 1/3 | Indoor | already grounded | **yes** | no |
| Card Party | 1.5 | researched | bar-provision-2026 | 1/0 | Indoor | already grounded | **yes** | no |
| Watch Party | 1.5 | researched | bar-provision-2026 | 0/4 | Indoor | already grounded | **yes** | no |
| Repast | 1.0 | NONE | - | **0/18** | **EXCEPTION** | funeral repast, dry event - `bar-provision-2026` is bar-scoped and does not reach it | no | **YES** |

---

# 3. What the audit actually found

## 3.1 The indoor backlog is nearly empty

**12 of 29 are already grounded**, all at 1.5 to `bar-provision-2026`, and almost all
are indoor or mixed. The indoor category was largely completed by an earlier phase.

**The remaining ungrounded work is concentrated outdoors** - which is exactly where the
newly registered `reddy-ice-2026` applies. That is a convenient result and worth stating
plainly rather than presenting the backlog as uniform.

## 3.2 One genuine value defect

**Low Country Boil: 1.5 lb/guest, outdoor signal 31 vs 2, no provenance.** An outdoor
boil sized at the indoor rate - structurally identical to the Fish Fry defect found in
5F.2, and its note ("to keep beer and tea cold") under-scopes the job the same way.

Every comparable outdoor cook in the corpus is 2.0 or above.

## 3.3 Six cases that must NOT be auto-corrected

| Playbook | Why it resists a category |
|---|---|
| **Repast** | Dry event. Our only indoor ice source is a *bar* provisioning guide. No registered source reaches it |
| **Game Night** | Same: "cups + cooling cans", no bar |
| **Crawfish Boil** | Authored 2.5 exceeds every registered source (max ~2.1). Either a real boil-specific need or an unsupported number - cannot tell from stored context |
| **Sweet 16** | 1.25 matches no baseline; the note is explicitly conditional |
| **Housewarming** | 1.25, note says "~1-1.5" - a midpoint someone split |
| **Gender Reveal** | Note says "(2 if hot/outdoor)" - the playbook already knows it is conditional |
| **Bachelor Party** | Note says "1.5-2"; venue undeterminable |

**These are marked `requires human decision`. None is corrected in this phase.**

The two 1.25 values are worth naming: 1.25 is not a category baseline, it is the
midpoint of a range someone wrote as "1-1.5". Publishing 1.25 as researched would
convert a hedge into a fact.

## 3.4 The source gap this exposes

Trying to classify 29 real playbooks surfaced a gap speculation would not have:

> **NGW has no ice source for a dry event.** `bar-provision-2026` states its ice
> figure inside a bar-provisioning claim. Repast, Game Night, and any no-alcohol
> gathering therefore cannot be grounded at all today.

That is the single most useful acquisition target the audit produced.

---

# 4. Proof cohort selected for Step 3

Required coverage was 2 indoor / 2 outdoor / 1 ambiguous. **Only one clean indoor case
exists** (section 3.1) - the rest are already grounded or are exceptions. Forcing a
second would mean citing a bar-scoped source for a dry event, which the model forbids.

| # | Playbook | Category | Action | Value |
|---|---|---|---|---|
| 1 | **Low Country Boil** | Outdoor | value + source | **1.5 -> 2.0** |
| 2 | **The Cookout** | Outdoor | source only | 2.0 unchanged |
| 3 | **Crab Feast** | Outdoor | source only | 2.0 unchanged |
| 4 | **Dinner Party** | Indoor | source only | 1.5 unchanged |
| 5 | **Quinceanera** | Mixed | source only | 1.5 unchanged |

Four of five are **grounding-only** - traceability added, no number moved. That is the
low-risk majority of real backfill work, and it is what repeatability should look like.

`Quinceanera` is the ambiguous case, handled under model section 2.3: the value already
equals the indoor baseline and the event is bar-served, so grounding is safe while a
value move would not be.
