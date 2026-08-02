# Tier 1 Backfill - Readiness Assessment

**Date:** 2026-08-01. ASCII-only. Phase 5F.5 Step 6.
**Status:** ASSESSMENT ONLY. No line is corrected here.
**Method:** recomputed from the live playbook objects (not a text scan, not the prior
docs). The live admin console independently reports the same totals.

---

# 1. The scope was wrong

`SAFE_RESEARCH_BACKFILL_QUEUE.md` defines Tier 1 as *"essential AND costed AND quantified
AND not engine-delegated"* and states that **237 lines** qualify. Computing that
definition against the corpus gives **385**.

The 237 is reproducible, but from a different rule:

```
248   purchase lines carrying NO provenance object at all
- 11  delegated / never-rendering
= 237
```

**237 counts lines with no provenance object. It omits 97 lines that carry a provenance
object with a declared tier and ZERO sources.** Those 97 are the more dangerous half of
the two: they look governed at a glance, they declare `trade-heuristic` or `norm` or
`cultural-tradition`, and they cite nothing.

```
TIER 1 eligible (documented definition)          385
  no provenance object at all                    248   <- the documented 237 lives here
  provenance object, ZERO sources                 97   <- uncounted until now
  provenance object WITH sources                  40
UNGROUNDED POOL                                  345
```

**The real backfill is 345 lines, not 237 - 46% larger.**

A third shape also exists and is counted in the 97: **21 lines carry provenance as a bare
STRING** (13 are the word `'synthesized'`; 8 are full prose sentences sitting in the
provenance slot). `isGroundedItemQty` requires an object, so none of them can ground -
safe, but nobody had counted them.

Freshness across the whole of Tier 1: **1 line of 385 carries a `lastVerified` stamp.**

---

# 2. The blocker is not effort. It is source coverage.

There are **4 registered quantity sources** and **3 cost sources**. That is the entire
evidence base.

| Source | Reaches |
|---|---|
| `webstaurant-protein-2026` | protein per person, plated vs buffet vs barbecue |
| `webstaurant-portions-2026` | starch / vegetable / salad side portions |
| `bar-provision-2026` | drinks per guest per hour |
| `reddy-ice-2026` | ice per person - its worked example is OUTDOOR |

Mapped against the 345 ungrounded lines by category:

| Category | Lines | Registered source that reaches it |
|---|---|---|
| FOOD | 121 | **partial** - protein and side-dish lines only. Cake (9), dessert (5), condiments (3) and most of the 66 distinct ids are uncovered |
| BEVERAGE | 82 | **partial** - `bar-provision` covers drink lines; `reddy-ice` covers OUTDOOR ice only |
| LOGISTICS | 57 | **none** |
| CLEANUP | 37 | **none** |
| RENTAL | 26 | **none** |
| DECOR | 22 | **none** |

> **142 of 345 ungrounded lines - 41% - sit in categories with no registered source at
> all.** No amount of workflow speed touches them. They are not slow work; they are
> not-yet-possible work.

This reframes the whole exercise. The prior planning treated the backfill as a throughput
problem (237 lines x 15 interactions = ~3,500). It is primarily an **evidence acquisition**
problem, and the throughput question only applies to the 203 lines that have a source to
cite at all.

---

# 3. Classification A / B / C / D

## 3.1 What can be classified mechanically, and what cannot

**A vs B cannot be determined by a machine**, and this is not a tooling gap. Deciding
whether an authored number is already correct (A) or wrong (B) means reading the value
against the source's stated scope. That is the judgement the whole programme protects.

So this section reports what was measured, and marks the rest as unclassified work -
rather than presenting an estimate as a finding.

## 3.2 Measured

| Class | Definition | Count | Confidence |
|---|---|---|---|
| **C** | needs new source research - no registered source reaches the category | **142** | **Measured.** Category has zero source coverage |
| **D** | cannot currently ground - the field has no runtime consumer | **10** | **Measured.** Channel-priced proteins: `sourcingPrices` wins over `unitCostRange`, so a governed range is read by nothing. Quantity on those lines is still governable |
| **A or B** | has a plausible source; needs per-line human review | **203** | **Unclassified.** See below |
| | of which known C already | 6 | dry events (Repast, Game Night) - `reddy-ice`'s scope does not reach them; Crawfish Boil's 2.5 lb exceeds every registered source |

## 3.3 What the A/B split probably looks like, stated as an estimate

Across 7 driven corrections the split was **5 Type A / 2 Type B (71% / 29%)**. Applied to
203 that would suggest ~144 A and ~59 B.

**Treat that as a hypothesis, not a plan.** The sample is 7, drawn almost entirely from
ice and protein lines, and the 5F.3 ice audit found 6 of 29 lines in a *covered* category
turned out to be Type C on inspection. The honest position is that classifying the 203 is
itself the next unit of work, and it is the one thing here that cannot be delegated,
batched, or inferred.

---

# 4. Effort

At the measured **~15 interactions per correction**:

| Scope | Lines | Interactions |
|---|---|---|
| Documented plan (237) | 237 | ~3,500 |
| **Actual ungrounded pool** | **345** | **~5,175** |
| Reachable with today's sources (203) | 203 | ~3,045 |
| Blocked on new sources (142) | 142 | **not costable** - the research is the work |
| Classification pass over the 203 | 203 | ~1-2 min/line, ~4-7 h, one human, no publishing |

A review queue (`KNOWLEDGE_REVIEW_QUEUE_MODEL.md`) saves ~5 of ~15 interactions on Type A
work that groups. Against the reachable 203, if ~70% is Type A and most of that groups,
the ceiling is roughly **3,045 -> ~2,400**. Real; not decisive.

---

# 5. Blockers

| # | Blocker | Effect | Resolvable by |
|---|---|---|---|
| 1 | **No source covers logistics, cleanup, rental or decor** | 142 lines cannot be grounded at all | research: one disposables/place-settings source and one cleanup-supplies source |
| 2 | **No dry-event ice source** | Repast, Game Night blocked; every indoor ice line uncertain | research: an ice source whose scope states indoor / no-alcohol rates |
| 3 | **The 203 are unclassified** | cannot size, order or group the work | a human classification pass. Not automatable |
| 4 | **Store/snapshot divergence** | 6 published records live only in a browser; inventory counts are wrong | reconcile first - a backfill against a wrong inventory re-governs fields that are already governed |
| 5 | **Freshness unenforced** | 1 stamp across 385 lines; new work will age silently too | fix the audit denominator and land the monitor in-repo (see readiness doc) |

---

# 6. Recommended order

**Not by playbook. By evidence primitive** - one verified primitive grounds many lines at
once, and a per-line sweep would re-research the same fact thirty times.

| # | Primitive | Grounds | Why this position |
|---|---|---|---|
| 0 | **Reconcile divergence** | - | not research. Every count below is unreliable until it is done |
| 1 | **Disposable place settings per guest** | `p_tableware` 17, `p_paper` 11, `p_napkins` 7, `p_cups` 3 - **~38 lines from one source** | highest line-count-per-source in the corpus, cheap to verify, zero money risk. Currently ZERO coverage |
| 2 | **Cleanup supplies per guest** | `p_cleanup` 26, `p_trash` 2, `p_clean` 2 - **~30 lines** | second highest. Also zero coverage. Together with #1 this converts ~68 lines from C to A/B |
| 3 | **Ice per guest, INDOOR and dry** | completes `p_ice` (18) | the known scope gap; partially covered already, so the marginal research is small |
| 4 | **Non-alcoholic servings per guest per hour** | soft drinks, water, coffee - `p_water` 8, `p_coffee` 7, `p_nonalc` 4 | extends `bar-provision-2026`, already partly grounded |
| 5 | **Sides lb per guest, buffet vs plated** | `p_sides` 9 and much of FOOD's long tail | extends `webstaurant-portions-2026` |
| 6 | Cake and dessert per guest | `p_cake` 9, `p_dessert` 5 | common, uncovered, low risk |

**Rule:** a primitive is registered ONCE and the lines cite it. Do not publish thirty
corrections carrying thirty copies of the same claim.

Steps 1 and 2 are deliberately first even though ice and protein feel more important:
they are the two largest uncovered blocks, they carry the least money risk, and each is a
single source that moves ~30 lines from "cannot ground" to "reviewable."

---

# 7. Verdict

**NOT READY to begin a bulk backfill.** The mechanism is proven and repeatable - that was
settled in 5F.3. What is not ready is the plan:

- the scope was understated by 46%
- 41% of it has no source to cite
- the remaining 59% is unclassified
- the inventory it would run against currently disagrees with itself

**Ready to begin:** the divergence reconciliation, the two missing source registrations
(#1 and #2 above), and the classification pass over the 203. Those three make a real
backfill plan possible; nothing before them does.
