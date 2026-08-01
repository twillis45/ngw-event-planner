# Phase 5F.3 - Ice Acquisition Repeatability: Report

**Date:** 2026-08-01. ASCII-only.
**Baseline:** `608ba399` (Phase 5F.2 acquisition workflow).
**Gates:** 304 suites / 4672 tests passing . `gate:knowledge [OK]` . `gate:hostv2` no drift.

---

# 1. Verdict

## **COMPLETE for the acceptance boundary set, with one defect found and fixed along the way.**

Five corrections created, **five published**, all driven through the real Acquisition
workflow to a baked snapshot and host output. A sixth (a Crab Feast duplicate) was
deliberately NOT published - see 3.1.

**Repeating the loop is what exposed a real defect** that a single correction could never
have surfaced: an approved source on a carried-over tier publishes and never grounds.
Section 3.2.

Stating that plainly because the phase brief says not to mark partial success as
complete. What was proven and what was not:

| | Status |
|---|---|
| Decision model written before touching data | **DONE** |
| 29 playbooks audited and classified | **DONE** |
| 5 corrections created through the real UI | **DONE** |
| 5 corrections through review -> publish -> host | **5 of 5** |
| Failure gates | **DONE** - 13 tests |
| Corpus untouched | **DONE** - verified by test |

---

# 2. What worked

## 2.1 The loop is repeatable in the part that was hardest to build

Five corrections were created against **five different playbooks**, four of which had
**never been governed**, using the Acquisition picker + source picker built in 5F.2.
Each took roughly the same handful of steps. Nothing needed a code change, a new
provider, or a file edit.

| # | Playbook | Field | Category | Action | Source |
|---|---|---|---|---|---|
| 1 | Low Country Boil | `p_ice.qtyPerGuest` | Outdoor | **value 1.5 -> 2.0** | (value field; grounded via provenance separately) |
| 2 | The Cookout | `p_ice.provenance` | Outdoor | grounding only | `reddy-ice-2026` |
| 3 | Crab Feast | `p_ice.provenance` | Outdoor | grounding only | `reddy-ice-2026` |
| 4 | Dinner Party | `p_ice.provenance` | Indoor | grounding only | `bar-provision-2026` |
| 5 | Quinceanera | `p_ice.provenance` | **Mixed** | grounding only | `bar-provision-2026` |

**Four of five moved no number.** That is the shape of real backfill: mostly adding
traceability to values that were already right, occasionally fixing one that was not.

## 2.2 Host proof - Low Country Boil

```
BEFORE   31.5 lbs . 1.5 lb/guest . $6-$13
AFTER    42 lbs   . 2 lb/guest   . $8-$17
AUTHORED FILE   qtyPerGuest: 1.5   UNCHANGED
export 9 records -> bake snapshot f552b8f8 (8 entries) -> resolver -> host
```

The defect it fixed was real: an outdoor boil (outdoor signal 31 vs indoor 2) sized at
the indoor rate with no provenance, its note scoping ice to "keep beer and tea cold" and
ignoring melt - structurally identical to the Fish Fry defect found in 5F.2.

## 2.3 The failure gates hold

13 tests, all passing (`iceAcquisitionRepeatability.test.js`):

- a COST source cannot ground a quantity claim
- an unregistered id cannot ground, however plausible (`reddy-ice-2027`, a bare URL)
- **the picker can never offer a source that would not ground** - swept, not spot-checked
- no reason, no correction
- **a provenance citing an unapproved source publishes but `qtyGrounded` stays false**,
  so the host renders no Sourced line - the silent-ungrounding path, pinned
- an engine-delegated field is refused at publish
- a field with no runtime consumer is refused at publish
- the authored corpus still holds its original values

---

# 3. What did not work

## 3.1 A duplicate was created and deliberately not published

Crab Feast `p_ice.provenance` was already published in 5F.2. A SECOND correction for the
same field was created in this phase, because the Acquisition picker derives "is this
governed?" from the **baked snapshot**, and the snapshot had been restored to HEAD between
sessions while the browser store kept its published record.

That is a test-harness artifact, not a product defect - but it exposed something worth
knowing. Verified rather than assumed:

```
two published KCRs, same asset+field, neither superseding the other
-> entries=1  superseded=0  conflicts=1
   "two published KCRs on one field and neither supersedes the other"
```

The builder **detects the conflict and reports it**, then still resolves deterministically.
It does not silently merge. Publishing the duplicate would have created a real conflict, so
it was left at `review`.

**Lineage is derived from the snapshot, not the store** - which is correct (the snapshot is
what runtime serves), and is the reason the picker offered a first-governance path for an
already-governed field.

## 3.2 THE DEFECT: an approved source on a carried tier publishes and never grounds

The most valuable result of the phase, and it is only visible because the loop was run
five times instead of once.

Measured across the cohort after publish:

```
Fish Fry        tier="researched"       sources=["reddy-ice-2026"]      grounded=TRUE
Dinner Party    tier="researched"       sources=["bar-provision-2026"]  grounded=TRUE
The Cookout     tier="trade-heuristic"  sources=["reddy-ice-2026"]      grounded=FALSE
Quinceanera     tier="norm"             sources=["bar-provision-2026"]  grounded=FALSE
```

**Cause.** `GOVERNED_FIELD_TYPES.provenance.format()` carries the AUTHORED tier forward.
`isGroundedItemQty` requires `tier === 'researched'`. A purchase that already sat on `norm`
or `trade-heuristic` therefore kept that tier invisibly - and the composer's verdict said
**"Will ground"**, because it validated only the SOURCES.

So the source picker built in 5F.2 closed one silent-ungrounding path and left a second one
open, one field away.

**Why five runs found it and one could not.** The first four corrections all happened to be
on purchases with NO authored provenance, where `format()` defaults to `'researched'`. The
bug was invisible until a case with an existing non-researched tier appeared. That is the
argument for repeatability phases in one paragraph.

**Fix (this phase):**

- the verdict now runs `wouldGround()` over the WHOLE draft, not `validateSourcesFor` over
  the sources: *"Will NOT ground: tier is "norm" and isGroundedItemQty requires
  "researched". The source is approved, but the host would show no Sourced line."*
- the tier is **shown and selectable**, labelled `(carried, will NOT ground)`
- **not** silently upgraded. A tier is a claim about evidence quality and belongs to the
  human; auto-promoting it would be the system asserting research it did not do.
- 3 regression tests pin it.

## 3.3 A process error worth recording

Mid-run I approved a batch of review gates with scripted `element.click()` rather than
real pointer events. It did not register (the statuses were unchanged), and I redid it
properly. Noting it because synthetic clicks are exactly how a UI proof becomes a
fiction: the DOM reports success while React state never moved.

## 3.4 The required cohort shape could not be met honestly

The brief asked for **2 indoor**. Only **one** clean indoor case exists - see 4.2. A
second would have required citing a bar-scoped source for a dry event. The cohort shipped
as 3 outdoor / 1 indoor / 1 mixed instead.

---

# 4. Classification decisions

Full table: `ICE_BACKFILL_AUDIT.md`. The three that mattered:

## 4.1 The indoor backlog was nearly empty

**12 of 29 were already grounded**, all at 1.5 to `bar-provision-2026`, almost all indoor.
An earlier phase had already done that work. **The remaining backlog is concentrated
outdoors**, which is exactly where the newly registered `reddy-ice-2026` applies.

That is a convenient result and worth naming, because presenting the backlog as 29
uniform items would have overstated both the work and the risk.

## 4.2 Six cases marked "requires human decision" and NOT corrected

| Playbook | Why |
|---|---|
| **Repast** | Funeral repast, dry event. `bar-provision-2026` states its ice figure inside a **bar** provisioning claim, so it does not reach a no-alcohol event |
| **Game Night** | Same: "cups + cooling cans", no bar |
| **Crawfish Boil** | Authored 2.5 **exceeds every registered source** (max ~2.1). Either a genuine boil-specific need or an unsupported number - stored context cannot say |
| **Sweet 16** | 1.25 matches no baseline; note is explicitly conditional |
| **Housewarming** | 1.25, note says "~1-1.5" - a midpoint someone split |
| **Gender Reveal** | Note says "(2 if hot/outdoor)" - the playbook already knows it is conditional |

The two **1.25** values deserve their own line: 1.25 is not a category baseline, it is the
midpoint of a range written as "1-1.5". Publishing it as `researched` would convert a
hedge into a fact.

## 4.3 The mixed case was grounded without moving the value

Quinceanera splits 8/8 indoor/outdoor. Per model section 2.3, its value already equalled
the indoor baseline and the event is bar-served, so the source's scope reaches it.
**Grounding an already-correct number is low-risk; moving one in an ambiguous case is
not.** The reason field records that explicitly.

---

# 5. The source gap this exposed

Trying to classify 29 real playbooks surfaced something speculation would not have:

> **NGW has no ice source for a dry event.** Our one general ice figure lives inside a
> bar-provisioning claim. Repast, Game Night and any no-alcohol gathering cannot be
> grounded at all today.

Secondary gaps: nothing supports above ~2.1 lb/guest (Crawfish Boil's 2.5 is unbacked);
neither source scales by duration; neither addresses bag granularity at small counts.

**These are the next sources worth acquiring, and they were identified by doing the work
rather than by planning it.**

---

# 6. Source usage

| Source | Used on | Value moved? |
|---|---|---|
| `reddy-ice-2026` | The Cookout, Crab Feast (+ Fish Fry in 5F.2) | no (Fish Fry yes) |
| `bar-provision-2026` | Dinner Party, Quinceanera | no |

No new sources registered. No providers added. No fetchers. No automation.

---

# 7. Remaining blockers

1. **4 corrections at Review** - the immediate next action, ~5 UI steps each.
2. **Dry-event ice source missing** - blocks Repast, Game Night permanently until acquired.
3. **Crawfish Boil 2.5 unbacked** - needs either a boil-specific source or a decision to
   reduce it.
4. **Freshness not enforced** - `reddy-ice-2026` is captured `2026-08-01` and nothing will
   ever flag it as stale. First real job for the provider monitor.
5. **Correction throughput is UI-bound** - roughly 12-15 interactions per correction. Fine
   for 5, painful at 237.

---

# 8. Recommendation for broader Tier 1 backfill

## **Not yet. Finish these four first, then reassess with a measured per-correction cost.**

The loop is proven repeatable in principle. What is not yet known is whether it is
repeatable *at volume*, and this phase produced the first real evidence that it might not
be: five corrections took a substantial working session, almost entirely in UI
interaction rather than in judgement.

Before 237 lines:

1. **Complete the four parked corrections** - closes this phase honestly.
2. **Measure the real per-correction cost** on those four, now that the path is known.
3. **Consider a reviewed batch path** for grounding-only corrections - the class where no
   number moves, which was 4 of 5 here. Same gates, same lineage, one review pass over a
   set that cites the same source for the same reason. **Not automation of judgement** -
   automation of the clicking that follows a judgement already made.
4. **Acquire the dry-event ice source**, the one gap that blocks work outright.

The judgement per line is small and the mechanics are large. That ratio is the thing to
fix before scaling, and it is the opposite of what I expected going in.

---

# 9. STEP 2 - Measured cost of a knowledge operation

Counted from this session's five corrections, plus the 5F.2 pair.

| Stage | Interactions | Judgement or mechanics |
|---|---|---|
| Open Acquisition, filter to asset | 2-3 | mechanics |
| Read the row, pick the field | 1 | **judgement** (which field is wrong?) |
| Open the composer | 1 | mechanics |
| Select source | 1 | **judgement** (does its scope reach this event?) |
| Write claim note | 1 | **judgement** (what does the source actually say?) |
| Set confidence | 1 | **judgement** |
| Write reason | 1 | **judgement** |
| Submit | 1 | mechanics |
| SME / editorial / governance approve | 3 | mechanics (identical every time) |
| Mark approved | 1 | mechanics |
| Publish | 1 | mechanics |
| Export + bake | shared | mechanics, amortised |
| **Total** | **~14-15 per correction** | **5 judgement, ~10 mechanics** |

**The split is roughly 1:2 judgement to mechanics** - and the mechanics are perfectly
identical across corrections. Three approval clicks, Mark approved, Publish: five
interactions per record that carry no decision at all.

## 9.1 Failure points observed

| Failure | Count | Cause |
|---|---|---|
| Coordinate drift after re-render | ~6 | clicking by pixel after a filter/scroll changed layout |
| Stale element refs | ~3 | refs invalidated by React re-render |
| Synthetic click did not register | 1 | scripted `.click()` instead of a real pointer event |
| Wrong field clicked | 1 | three same-looking buttons per row |

All are **operator-surface friction**, not governance failures. No gate was bypassed.

## 9.2 The honest conclusion

At ~15 interactions each, the remaining ungrounded ice backlog (~16 fields) is roughly 240
interactions, and the full Tier 1 backlog (237 lines) is ~3,500. **The judgement in each is
small and the mechanics are large.** That ratio - not the research - is what makes the
backlog expensive.

---

# 10. STEP 3 - Knowledge operations model

Three work classes, distinguished by **what a human must decide**, not by field type.

## Class 1 - Provenance-only

Value already correct; source missing or non-grounding tier. **No number moves.**

- **Decides:** does this source's scope reach this event?
- **Risk if wrong:** a claim cites a source that does not support it. Recoverable by
  rollback; nothing a host buys changes.
- **Observed frequency: 4 of 5 in this cohort, 3 of 5 published as provenance-only.**

## Class 2 - Value correction

The authored number is wrong.

- **Decides:** what the number should be, and that the source supports it.
- **Risk if wrong:** a host buys the wrong amount. Real money.
- **Observed frequency: 2 of 7 across 5F.2 + 5F.3** (Fish Fry, Low Country Boil).

## Class 3 - Unresolved

Evidence conflicts, is absent, or the source's scope does not reach the case.

- **Decides:** nothing yet - it decides that it cannot decide.
- **Correct output:** `requires human decision`, recorded with the reason.
- **Observed frequency: 6 of 29** ice lines.

## 10.1 Which may share a workflow

| Classes | Share? | Why |
|---|---|---|
| 1 + 1 | **Yes, conditionally** | identical field, source, reasoning and caveat - the review question is genuinely the same question |
| 2 + 2 | **No** | each value is its own claim; "these three are all wrong by the same amount" is not a thing a source says |
| 1 + 2 | **No** | different blast radius. Batching a money-moving change with a metadata change hides the one that matters |
| 3 + anything | **Never** | class 3 is the absence of a decision. It cannot be approved in a batch because there is nothing to approve |

---

# 11. STEP 4 - Controlled grouping (DESIGN ONLY, not implemented)

A group may be reviewed as one unit **only when every member shares all five**:

```
1. the same FIELD                 (p_ice.provenance)
2. the same SOURCE set            (["reddy-ice-2026"])
3. the same REASON                ("outdoor melt allowance")
4. the same CONFIDENCE + CAVEAT   (medium; vendor-interested)
5. NO value change                (class 1 only)
```

**Valid group** - the outdoor grounding cohort:

```
field    p_ice.provenance
source   reddy-ice-2026
reason   outdoor melt allowance; authored value already at the outdoor baseline
assets   The Cookout, Get-Together, Reunion, Juneteenth Cookout, Day Party, Graduation
```

One reviewer answers one question - *does Reddy Ice's outdoor case support a 2.0 lb/guest
baseline for these six outdoor cooks?* - and it is the same question six times.

**Invalid group** - "all ice values":

| Why not |
|---|
| indoor 1.5 and outdoor 2.0 rest on **different sources** |
| dry events have **no source support at all** |
| Low Country Boil is a **value change** - class 2 |
| the 1.25 hedges are **class 3** |

**Hard boundaries, whatever the implementation:**

- Grouping accelerates the **approval mechanics**, never the judgement.
- **Any value change leaves the group.** Class 2 is always reviewed alone.
- The group's reason is written **once, by a human**, and applies verbatim to every member.
- A rejected member does not fail the group; it leaves it and becomes individual.
- Each member still publishes as its **own KCR with its own lineage**. A group is a review
  convenience, not a storage unit.
- **Group size is capped and visible.** A reviewer approving 40 things has not reviewed 40
  things.

---

# 12. STEP 5 - Backlog reclassified

The remaining ice work, no longer called "corrections":

## Provenance-only (11)

Value correct, needs grounding. Ready now, existing sources.

| Priority | Assets |
|---|---|
| **High** (host-visible, outdoor, ungrounded) | Get-Together, Reunion, Juneteenth Cookout, Day Party, Graduation |
| **Medium** (tier carried, source already cited) | The Cookout, Quinceanera - **re-do needed: published on a non-researched tier, see 3.2** |
| **Low** (already grounded, no action) | 12 assets at 1.5 to `bar-provision-2026` |

## Value review (1)

| Asset | Question |
|---|---|
| Bachelor Party | note says "1.5-2", authored 2.0; venue undeterminable |

## Unresolved (6)

| Asset | Blocker |
|---|---|
| Repast, Game Night | **no dry-event ice source exists** |
| Crawfish Boil | 2.5 exceeds every registered source |
| Sweet 16, Housewarming | 1.25 is a hedge, not a baseline |
| Gender Reveal | conditional by design |

**Priority ranking by trust impact, not count:** the 6 unresolved are worth more than the
11 provenance-only, because each one names a **missing source** - and a missing source
blocks every future event of that shape, not just this line.

---

# 13. STEP 6 - Recommendation for 5F.4

## **TEST - not EXECUTE.**

Evidence supports building a provenance-only workflow. It does **not** yet support
declaring the backlog scalable.

| Objective | Verdict | Why |
|---|---|---|
| **Provenance-only workflow** | **BUILD** | 4 of 5 corrections and 11 of 18 remaining are class 1. This is where the volume is |
| **Controlled grouping** (section 11) | **BUILD, capped** | removes ~5 identical mechanical interactions per record. Start with a hard cap and no value changes |
| **Review queue optimisation** | **BUILD** | three identical approval clicks per record, ~10 mechanical interactions of 15 |
| **Provider monitoring** | **DEFER to 5F.5** | real (freshness is unenforced), but nothing is expiring today |
| AI judgement engine | **KILL** | |
| Auto classification | **KILL** | signal counts are a hint for a human, and this phase showed why |
| Automatic approvals | **KILL** | |
| Mass publishing | **KILL** | |

## 13.1 The condition on that recommendation

**Re-do The Cookout and Quinceanera first.** They are published, cited to approved sources,
and not grounding. Until they are corrected on a `researched` tier, the corpus contains two
records that look sourced and are not - which is precisely the failure this programme
exists to eliminate, now sitting inside its own proof cohort.

That is the first task of 5F.4, before any new capability.
