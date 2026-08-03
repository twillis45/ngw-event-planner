# Phase 5F.5 - Production Readiness

**Date:** 2026-08-01. ASCII-only.
**Scope:** production integrity audit, divergence protection, release recommendation.
**Method:** every number below was recomputed from the live corpus or driven in the
browser. Where a previously documented figure disagreed, the recomputation wins and the
disagreement is recorded rather than quietly corrected.

---

# 0. Baseline corrections

Three baseline claims carried into this phase did not survive checking. None is a defect
in the product; all three change what a reader would conclude.

| Claim as stated | Measured | Consequence |
|---|---|---|
| 306 suites / 4689 tests | **307 / 4700** at phase start, **308 / 4717** at end | the stated figure predated the 5F.4.1 commits |
| "eslint clean" | **20 errors**, all in test files; **0 in product source** | there is no `lint` script and no CI lint job. "Clean" was never gated |
| Tier 1 backfill = 237 lines | **385** by the documented definition; 237 is a different, narrower set | see section 5 and `TIER1_BACKFILL_READINESS.md` |

The eslint errors are `react-hooks/rules-of-hooks` on a test helper named `useFrozenClock`
and `import/first` on deliberately-late imports for module mocking. They are lint-config
artifacts, not defects. **The honest statement is "no lint gate exists", not "lint is
clean."**

---

# 1. Baseline state (Step 1)

```
branch    product/decision-soundness-p0   (in sync with origin)
HEAD      6629607d  feat(knowledge): detect governance divergence ...
          0d6cea8f  fix(knowledge): add corpus integrity guard ...
tree      clean - 0 uncommitted paths at phase start
```

## 1.1 Corpus and snapshot agree

```
publishedKcrs.json    3 records
  Crab Feast       | p_crabs.provenance  | researched | webstaurant-protein-2026 | parent NONE
  Retirement Party | p_wine.provenance   | researched | bar-provision-2026       | parent NONE
  Retirement Party | p_wine.provenance   | researched | bar-provision-2026       | parent ...-v1

publishedKnowledge.json  2 entries  (the two lineage HEADS)
gate:knowledge           [OK] snapshot is up to date
```

Three records resolving to two entries is the correct shape: Retirement Party is a healthy
`v1 -> v2` chain, and only the head serves.

## 1.2 Browser state is NOT production state - and they disagree

This is the distinction Step 1 asks to confirm, and it does not hold in the direction one
would hope. Measured in the live admin console:

```
admin store (localStorage)   8 published records across 8 fields
baked snapshot (committed)   2 entries
```

**Seven published records exist only in a browser.** (An earlier draft of this line said six; corrected 5F.6 — eight published in the store minus the one already serving.) They are not in the corpus, not in the
snapshot, and no host can see them. The committed artifacts are clean; the working state
is seven records ahead of them. Everything in section 3 follows from this.

---

# 2. Production integrity audit (Step 2)

## 2.1 Source integrity

| Question | Answer | Evidence |
|---|---|---|
| Can an unapproved source publish? | **No** | `groundingHonesty` -> `validateSourcesFor` runs inside `publishKCR`, and again at submit in `doCorrect`. Two independent points, one predicate |
| Can an approved source fail grounding? | **Yes, and it is blocked** | approved source + non-researched tier = `wouldGround` false; the publish gate refuses with the tier named |
| Can a source reach a host without predicate approval? | **No** | ONE render seam, `HostShellV2.jsx:13546`, gated on `it.qtyGrounded`. The CRA renders no provenance at all |

### The gap that was open, and is now closed

Every guard above protects knowledge arriving through GOVERNANCE. The **authored corpus**
- 537 purchase lines across 39 files, the overwhelming majority of what a host reads -
walked through none of them. Measured this phase:

```
  7  authored lines list sources AND fail isGroundedItemQty
 16  authored source strings resolve in NO registry (raw URLs, free-text vendor names)
```

That is the same defect class the publish gate exists to stop, sitting unguarded in the
larger corpus. All seven are engine-owned lines (six channel-priced proteins, plus
`p_crabs`), which is why none of them reaches a host on its own sources.

`authoredCorpusIntegrity.test.js` now guards it as a **ratchet**: the seven are named, and
any new one fails CI. Repairing them means hand-editing playbook data, which this
programme forbids - so the list may shrink through governance and may never grow.

### The ratchet already shrank once, and the proof is instructive

`Crab Feast | p_crabs` authors `tier: 'primary'` with four free-text vendor strings. A
published KCR supersedes that. Measured at runtime:

```
AUTHORED  tier=primary      sources=["Captain White's Seafood (Oxon Hill, MD - LEFT ..."]
RUNTIME   tier=researched   sources=["webstaurant-protein-2026"]
          governedFields=["provenance"]   qtyGrounded=true
```

The first version of that test asserted "none of the seven ever renders" and **failed** -
because the system had already repaired one. The test now asserts the correct property: a
line either renders nothing, or renders through governed provenance that grounds.

## 2.2 Tier integrity

| Question | Answer |
|---|---|
| Can `norm` / `trade-heuristic` claim researched grounding? | **No** - blocked at the publish gate (5F.4), and retrospectively by `corpusIntegrity.test.js` over the committed corpus AND the baked snapshot |
| Can carried tiers silently pass? | **No** - the tier is an explicit control in the composer as of 5F.4; it is chosen, not inherited |
| Can a human understand why something will not ground? | **Yes** - measured: `Blocked: KCR: evidence tier "norm" does not satisfy isGroundedItemQty` |

### A third provenance shape nobody had counted

The corpus carries provenance in **three** shapes, not two:

```
absent    368 lines
STRING     21 lines   13 x 'synthesized', plus 8 full prose sentences in the slot
object    148 lines
```

`isGroundedItemQty` opens with `typeof prov === 'object'`, so a string can never ground -
and `fieldState` classifies it `needs-research`, which is honest. **This is safe by
existing design, not by luck.** It is recorded because a future author reading only the
object shape would be surprised by it.

## 2.3 Lineage integrity

| Question | Answer |
|---|---|
| Can first governance incorrectly supersede? | **No** - `openAuthoredGovernance` sets no `correctionOf`; cross-field lineage was fixed in 5E |
| Can duplicate corrections exist? | **They did, and now they cannot be created** - see section 3 |
| Can archived records return? | **No** - closed statuses are excluded from the store's published set and from the bake |

---

# 3. Divergence protection (Step 3)

## 3.1 The defect, precisely

`doCorrect` chose between first-governance and correction on `if (!prior)`, where `prior`
is derived from the **snapshot alone**. When the store held a published record the
snapshot did not, the snapshot said "ungoverned", the picker offered first governance, and
a second parentless record was created. **Nothing in that path ever read the store.**

Seen live on one screen this phase:

```
composer      Crab Feast . p_oldbay.qtyPerGuest   FROM ACQUISITION - never governed
banner        published-locally-not-serving - Crab Feast | p_oldbay.qtyPerGuest is
              published in the admin store but absent from the baked snapshot
PUBLISHED     Crab Feast . p_oldbay.qtyPerGuest
FIELDS        kcr-kas-crab-feast-p-crabs-provenance-correction-1785597786053-v18
```

The console asserted "never governed" and "published" simultaneously.

## 3.2 The guard

`firstGovernanceGuard(assetId, fieldPath, storeKcrs, snapshotEntries)` - pure, no I/O -
reads **both** sources and blocks in three cases:

| Kind | Trigger |
|---|---|
| `already-published-in-store` | the measured defect |
| `change-already-in-flight` | the same collision one step earlier: two in-flight records on one field become two published heads |
| `already-serving` | the snapshot has it; a guard that trusts its caller to have checked is not a guard |

Closed statuses (`rejected`, `abandoned`, `archived`, `deprecated`) do **not** block - a
rejected attempt must not wedge a field forever.

**It blocks; it never repairs.** Which side is correct is a human judgement, and the store
may legitimately be ahead of a bake. Refusing to start a second lineage is not a judgement
about which value is right - it is a refusal to make that judgement necessary.

## 3.3 Driven live, not just unit-tested

Real pointer events, real composer, the exact trap field:

```
Blocked: Crab Feast | p_oldbay.qtyPerGuest is already published in the admin store
(1 record(s)). Opening a first governance would start a second lineage with no parent,
and a bake would then choose between them by ordering. Correct the existing record
instead.
```

Store verified immediately after: **242 records (unchanged), 8 published (unchanged),
exactly one record on that field, zero new parentless records.** It blocked and wrote
nothing.

The PERMIT path was driven live seven times in 5F.3; the BLOCK path had never been driven
until now. Both are covered, across sessions.

---

# 4. Verified / remaining / unknown

## 4.1 Verified

- **Governance chain** - correction -> review -> approve -> publish -> export -> bake ->
  snapshot -> resolver -> predicate -> host, driven end to end 7 times
- **Source authority** - approved-source enforcement at two independent points
- **Tier honesty** - prospective gate + retrospective corpus test + snapshot test
- **Runtime predicate alignment** - one render seam, one predicate, asserted as a
  biconditional against real `playbookFoodPlan` output
- **Host rendering** - no unresolvable source can become a host claim
- **Lineage** - duplicate first-governance is now blocked at creation and detected if present
- **Authored corpus** - ratcheted; new offenders fail CI

## 4.2 Remaining risks

| Risk | State | Severity |
|---|---|---|
| **Freshness unenforced** | `lastVerified` exists on **1 of 385** Tier 1 lines. Nothing expires, warns, or degrades on age | **High for a claim of currency** - "researched 2026-07" ages silently |
| **The grounding monitor never runs** | `grounding-monitor.yml` sits at `ngw-event-planner/.github/`, one level ABOVE the git root (`demo/`). It is untracked, so its monthly cron has never fired | **Medium** - a working instrument nobody is looking at |
| **The grounding scoreboard miscounts** | `groundingAudit.mjs` counts `cited`/`synthesized`/`established-consensus` and silently drops `researched` (64) and `partial` (1) - **65 of 245 records, 27%**. It reports 4% cited where cited+researched is 29% | **Medium** - decisions were being ordered against a wrong denominator |
| **No lint gate** | 20 lint errors exist and no CI job would notice | **Low** - all in test files |
| **Provider monitoring** | Does not exist by design (5F.1 removed the fabricating layer). NGW does not fetch | **Accepted** - honest-empty beats fake |
| **Evidence workflow** | A human pastes and cites. No acquisition automation exists | **Accepted** - this is the doctrine, not a gap |
| **Scaling mechanics** | ~15 interactions per correction, ~60% mechanical. No queue exists | **Medium** - see `KNOWLEDGE_REVIEW_QUEUE_MODEL.md` |
| **Divergence is detected, not reconciled** | 6 published records live only in a browser | **Medium** - creation is now blocked; existing divergence still needs a human |

## 4.3 Unknown

- **Whether the seven browser-only records should be published.** They were created across
  sessions and never exported. Nothing in the system can decide this.
- **Whether `bar-provision-2026` scope reaches dry events.** Blocks Repast and Game Night.
  Recorded in 5F.3, still open.
- **Crawfish Boil 2.5 lb/guest** exceeds every registered source. Unresolved.
- **Whether the 21 string-provenance lines carry recoverable claims.** Eight are full
  sentences that read like real reasoning; nobody has assessed whether they cite anything.

---

# 5. Readiness scores

Scored against "can this be operated by someone who did not build it, without producing a
false claim to a host."

| Dimension | Score | Basis |
|---|---|---|
| **Foundation** | **88** / 100 | 308 suites / 4717 tests, 5 CI jobs, artifacts pinned by gates. Loses points for no lint gate and a monitor stranded outside the repo |
| **Governance** | **92** / 100 | Chain proven end to end; source, tier and lineage each gated at two independent points. Loses points because the authored corpus is ratcheted rather than clean |
| **Runtime safety** | **95** / 100 | One render seam, one predicate, biconditional asserted against real output. No path exists from an unresolvable source to a host claim |
| **Operations** | **58** / 100 | Divergence creation blocked and existing divergence visible - but seven records live only in a browser, freshness is recorded on 1 of 385 lines and enforced nowhere, and the scoreboard miscounts by 27% |
| **Backfill readiness** | **45** / 100 | The mechanism is proven and repeatable. The SCOPE was wrong by 62%, ~71% of the work is unclassified, and 2 of 5 evidence primitives have no source that reaches them |

---

# 6. Release recommendation

## CONTINUE HARDENING

Not SHIP, and not BACKFILL.

**Why not SHIP.** The knowledge a host actually reads is honest - that part is genuinely
strong, and section 2 says so with output as the witness. But "production" for a knowledge
operations system means someone other than the author can run it, and today three things
would mislead that person:

1. The admin console reports counts from a browser store that is seven records ahead of
   what any host sees. Detection now says so out loud; it does not make the numbers agree.
2. The freshness stamp exists on one line in 385 and expires nothing. A system whose
   selling point is grounded knowledge cannot let "researched 2026-07" age in silence.
3. The scoreboard an operator would naturally consult drops 27% of the corpus from its
   denominator.

None of these can put a false claim in front of a host. All three would put a false claim
in front of an operator, and this phase is explicitly about the operator.

**Why not BACKFILL.** The scope was wrong by 148 lines and the classification does not
exist yet. Starting a 300+ line backfill against a number that just moved 62% would be
scaling an unverified plan - the exact failure mode the doctrine names.

**Why not BUILD REVIEW QUEUE yet.** It is designed (`KNOWLEDGE_REVIEW_QUEUE_MODEL.md`) and
the honest saving is ~165 interactions -> ~90 on the ice work. That is real but small, and
a queue built on top of unreconciled divergence would multiply it. Reconcile first.

## The next three, in order

| # | Work | Why first |
|---|---|---|
| 1 | **Reconcile the seven browser-only records** - human decides each: export or discard | Every count an operator reads is wrong until this is done, and the queue would inherit the error |
| 2 | **Move `grounding-monitor.yml` into the repo and fix the audit's denominator** | Two small changes that convert a stranded script into the freshness instrument section 4.2 says is missing |
| 3 | **Classify the Tier 1 backlog A/B/C/D** (see `TIER1_BACKFILL_READINESS.md`) | Cannot be automated, and nothing downstream is safe to plan without it |

Only after those three does the review queue become worth building, and only then does a
backfill have a scope worth committing to.
