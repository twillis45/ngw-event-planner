# Phase 5B-4 - Evidence Acquisition Strategy

**Date:** 2026-08-01 - **READ-ONLY.** No KCR created, no code modified, no playbook edited,
no tier upgraded, no source added.

> **CORRECTION 2026-08-01 - see `docs/playbooks/PHASE_5C_2_ADMIN_FULL_BROWSER_AUDIT.md` SS'Reconciliation'.**
> This report recommended building a research acquisition workflow. **It already exists.**
> Admin's Studio > Campaign Research provides live per-playbook gap detection and 8 campaign
> templates - including `Government Data Pull` ("USDA prices, NOAA") and `Cross-Vendor Price
> Check` ("2+ commercial sources"), which are items 2 and 3 of this report's own research
> list. Items 1-3 of SS9 are **WITHDRAWN as new work**; they are dispatchable today.
> SS0's "the constraint is evidence availability" is **REVISED**: acquisition is not the
> constraint, the publish wire is. The source-concentration and DIY/potluck findings stand.


---

## 0. The finding that reframes the question

The brief asks which missing evidence primitives would create the most trust. Measuring the
registry first changes the answer, so it goes before the domains.

```
COST_SOURCES     :  3 entries
QTY_SOURCES      :  3 entries
TIMING_SOURCES   : 10 entries
unified catalogue: 111 sources / 20 axes
                   byTier -> unspecified 87 | established-consensus 18 | researched 2 | cited 4
```

**NGW's entire budget-trust surface rests on three cost sources.** And they are not evenly
loaded:

```
source ids cited by the 16 grounded costFactor decisions:
  catering-perperson-2026 : 14      <- 87.5%
  usda-meat-2026          :  1
  dmv-crab-2026           :  1
```

**One source carries 14 of 16 governed cost claims.** That is the single largest trust
liability in the knowledge layer, and no amount of new domain coverage reduces it.

It gets sharper. Phase 5B-3 established that `catering-perperson-2026` prices four *catering*
tiers and says of the DIY tier only *"host-cooked/DIY is cheaper still"* - direction, no
magnitude. Measured against that:

```
of the 16 GROUNDED costFactor decisions:
  carry a DIY/potluck option with a MULTIPLIER : 11
  use a DIY/potluck option as the BASELINE     :  9
```

**11 of 16 already-grounded cost decisions turn on a number their cited source does not
supply.** They are marked `researched` and pass `isGroundedCost` because the predicate checks
that the source id resolves - not that the source contains the quantity being claimed.

So the highest-value evidence primitive is not in a new domain. **It is the one that repairs
the grounding NGW already ships.**

---

# Domain 1 - DIY / Host-Prepared Food Economics

## Evidence Assessment

**Does NGW need this? Yes - more than any other primitive, and not primarily for new claims.**

| | Count |
|---|---|
| Grounded decisions whose DIY multiplier is currently underivable | **11 of 16** |
| Ungrounded costFactor decisions in this domain | 9 |
| Priced purchase instances touching host-prepared food | 25 (21 distinct ids) |
| **Total claims that would eventually benefit** | **~45** |

**Product decisions unlocked:** the host-cooks / potluck / caterer choice is the largest
single lever on an event budget, and it appears in nearly every playbook family - showers,
graduations, game nights, cookouts, vow renewals. It is also the choice NGW's hosts are most
likely to actually make, because most NGW events are not catered at all.

**Source problem or modeling problem?** **Modeling problem wearing a source problem's
clothes.** No publisher issues "what it costs a host to cook for 20." That number does not
exist to be cited. What exists is *inputs*: retail ingredient prices, portion quantities,
waste factors. A DIY cost band is therefore a **derived artifact** - a model with cited
inputs - not a quotable fact.

**That distinction is the crux of this whole phase**, and it is addressed under Governance Fit.

**When is this realistically governable?** When NGW accepts that the governed object is a
*derivation* and can express it honestly: inputs cited, method stated, output labelled as
modelled rather than observed. Governing a derived number as though it were an observed one
would be the exact trust failure this programme exists to prevent.

**Labor and preparation overhead: do NOT attempt to price these.** A host's own hours are not
a cost NGW can assign a dollar value to without making a claim about the host's time that it
has no standing to make. The honest model prices *ingredients and consumables only*, and says
so. Preparation overhead belongs in the **timing** axis (where `TIMING_SOURCES` already has 10
entries), not the cost axis.

## Source Candidates

All four are already named in `SOURCE_CATALOG` with the authority and freshness values shown -
those fields are read from the repo. What each publisher contains in the real world is my
assessment, not a verified NGW fact.

| Source | Authority | Freshness | Can prove | Cannot prove |
|---|---|---|---|---|
| `usda-ers` | **official** | monthly | Retail price series for food-at-home categories; the food-at-home vs food-away-from-home spread | Any per-event or per-guest figure; anything about a specific menu |
| `bls-cpi` | **official** | monthly | Price *movement* over time; lets a 2026 band be re-based later instead of expiring | Absolute per-person cost; category granularity below CPI item level |
| `usda-fdc` | official | annual | Portion and composition data to convert recipes into quantities | Any price at all |
| `costco-business` / `restaurant-depot` / `gfs` / `sysco-pricing` | **trade** | monthly | Actual bulk unit prices at the scale a host buying for 30 would pay | Neutrality - the catalog carries a `commercialBias` field precisely for this tier; single-vendor pricing is not a market rate |

**The credible construction is `usda-ers` (official, for the price level) anchored to
`bls-cpi` (official, for re-basing), with a trade source used only to sanity-check bulk
scale - never as the citation of record.**

## Governance Fit

- **Can this become a KCR?** Yes, but as a **derived claim**, not an observed one.
- **Would it require a new provenance model?** **Yes - this is the one real engineering
  finding in this report.** The current model asserts *"this value came from this source."*
  A DIY band asserts *"this value was computed from these sources by this method."* Nothing in
  `costProvenance` expresses a method, and `derivedProvenance` (5A-1.5) grades confidence - it
  does not record a derivation.
- **Would it require a new knowledge axis?** No. It is a cost claim.
- **Would it fit existing costFactor grounding?** Yes, once published - `isGroundedCost` would
  accept it unchanged. The gap is upstream, in how the artifact describes itself.

## Verdict: **EXECUTE**

Highest trust impact by a wide margin, because it is the only primitive that **repairs
existing published grounding** rather than only extending coverage.

---

# Domain 2 - Beverage Economics

## Evidence Assessment

**Does NGW need this? Yes - highest raw volume of any domain.**

| | Count |
|---|---|
| Ungrounded costFactor decisions | **11** |
| Priced purchase instances | **193** (81 distinct ids) |
| Existing beverage COST sources | **0** |
| Existing beverage QUANTITY sources | **1** (`bar-provision-2026`, resolves) |

**Source problem or modeling problem? Half of each - and that is what makes it interesting.**

`bar-provision-2026` already governs the quantity half: *~1 drink/guest/hour, ~2 in the first
hour.* Beverage cost is `quantity x unit price`. **NGW already owns, and already resolves, one
of the two factors.** No other domain is half-solved.

**Relationship to the existing bar quantity source - and the trap.** Phase 5B-2 correctly
rejected citing `bar-provision-2026` for a cost claim: it lives in `QTY_SOURCES`, is read by
`isGroundedItemQty`, and the 5A-4.1 invariant forbids cross-axis citation. That ruling stands.
**But it points at a capability gap rather than a dead end** - the composition is legitimate;
the provenance model just cannot express it.

**What is genuinely modelling, not sourcing:** BYOB vs hosted vs cash bar is a *liability and
social* structure, not a price. And alcohol retail pricing varies by state control regime
enough that a single national band would be wrong in a meaningful share of states.

**The clean split:**
- **Sourceable:** non-alcoholic per-person cost (soft drinks, water, coffee, juice) - a
  commodity retail basket with no regulatory variance.
- **Sourceable with regional caveat:** beer/wine per-person at retail.
- **Not sourceable as a national number:** spirits, and anything downstream of state control
  regimes.
- **Not a cost claim at all:** BYOB vs hosted.

## Source Candidates

| Source | Authority | Freshness | Can prove | Cannot prove |
|---|---|---|---|---|
| `bls-cpi` | **official** | monthly | Alcoholic-beverage and nonalcoholic-beverage price levels and movement; treats them as separate series | Per-person event cost; anything about serving size |
| `usda-ers` | **official** | monthly | Nonalcoholic beverage retail pricing within food-at-home | Alcohol (outside its remit) |
| `bar-provision-2026` | in-registry, resolves | - | **The quantity half, already governed** | Nothing about price - and it is axis-locked to quantity |
| `costco-business` | trade | monthly | Bulk beverage unit pricing at party scale | Neutral market rate; state-by-state alcohol variance |

## Governance Fit

- **Can this become a KCR?** For **non-alcoholic**, yes, cleanly and today. For alcohol, only
  with an explicit regional scope - and `SOURCE_CATALOG` already carries a `regionalScope`
  field to express that.
- **Would it require a new provenance model?** **Only if NGW wants the composed claim.** A
  standalone unit-price cost source needs nothing new. A *derived* per-person beverage cost
  citing both a price source and `bar-provision-2026` needs the same derived-provenance
  capability Domain 1 needs. **The two domains share one engineering unlock.**
- **New knowledge axis?** No.
- **Fit existing costFactor grounding?** Yes.

## Verdict: **EXECUTE - narrowly, non-alcoholic first**

Second priority. The non-alcoholic band is the cheapest genuinely-new cost source NGW can
acquire, and it is the natural proving ground for derived provenance because the partner
factor already exists and already resolves.

**Alcohol: PARK** pending a regional-scope decision. A national spirits number would be
confidently wrong.

---

# Domain 3 - Seafood Economics

## Evidence Assessment

**Does NGW need this? Yes, but it is narrower than its decision count suggests.**

| | Count |
|---|---|
| Ungrounded costFactor decisions touching seafood | **13** |
| Priced purchase instances | 38 (**31 distinct ids** - near-zero reuse) |
| Existing seafood cost sources | **1** (`dmv-crab-2026`, DMV-only, July 2026) |

The 31-ids-for-38-instances ratio is the key number: **seafood claims are almost entirely
single-use.** Each governed artifact would land in roughly one place. That is the opposite of
the leverage profile Domain 1 and 2 have - and it is consistent with 5A-6's finding that the
two artifacts which *did* publish successfully were both single-playbook and domain-specific.

**Source problem or modeling problem? Cleanly a source problem** - the only one of the four.
Seafood prices are real, published, and purchasable. Nothing needs modelling.

**Seasonality is the complication, and it is an engineering complication - but a smaller one
than it first appears.** `dmv-crab-2026` is stamped July 2026, and blue crab pricing moves
substantially across a season. `SOURCE_CATALOG` carries both `seasonal` and `freshnessPolicy`
on all 22 entries.

**Verified this session, and it corrects a claim I carried forward from 5B-2:** those fields
are not inert - `AdminConsole.jsx` renders `freshnessPolicy` in two places. What is true is
narrower and more useful: **they are displayed, never enforced.** No predicate, gate or runtime
path reads them.

Better still, **a Freshness dimension already exists** (`dimensions.js`) with a review trigger
and a research-queue route. It keys off `governance.lastReviewed` on **playbooks** - the
machinery is built, just pointed at a different object. Extending it to sources is a smaller
lift than building freshness enforcement from nothing.

Publishing seasonal seafood claims without that extension would manufacture stale governed
knowledge, which is worse than ungoverned knowledge because it carries a `researched` tier.

**Retail vs prepared/vendor is the actually-valuable axis** - and it is the cheapest thing on
this entire list. `dmv-crab-2026` already surveys four DMV vendors' *retail steamed* prices.
It has **no live-buy column**, which is the single missing datum blocking Crab Feast
`steam_vs_order` (5B-3, item 1).

## Source Candidates

| Source | Authority | Freshness | Can prove | Cannot prove |
|---|---|---|---|---|
| **NOAA Fisheries** *(not in catalogue)* | official | annual/seasonal | Landings volumes and ex-vessel prices; the authoritative US finfish/shellfish series | Retail prices a host would pay; regional retail spread |
| `bls-cpi` | **official** | monthly | A "fish and seafood" price index - movement, not level | Species-level or preparation-level pricing |
| `dmv-crab-2026` | in-registry, resolves | seasonal | **Retail steamed blue crab, 4 DMV vendors, July 2026** | Live-buy price; any region outside DMV; any other species |
| `restaurant-depot` | trade | monthly | Bulk frozen/prepared seafood unit pricing | Live/fresh local pricing; regional market variance |

**Honest note:** NOAA is the right authority and is **not currently in `SOURCE_CATALOG`** -
adding it is a catalogue entry, not research. But ex-vessel prices are not retail prices, so
NOAA proves less about a host's actual cost than its authority level suggests.

## Governance Fit

- **Can this become a KCR?** Yes - `dmv-crab-2026` already proved the exact pattern.
- **New provenance model?** No. **New knowledge axis?** No. **Fits costFactor grounding?** Yes.
- **But:** broad seafood governance is gated on **freshness enforcement**, which does not exist.

## Verdict: **EXECUTE narrowly (the live-buy column) / PARK the domain**

Extending `dmv-crab-2026` by one column is the highest-certainty, lowest-effort item in this
report. Governing seafood *broadly* is PARK until freshness enforcement exists.

---

# Domain 4 - Specialty & Cultural Ingredient Economics

## Evidence Assessment

**Does NGW need this? No - and it should say so deliberately.**

| | Count |
|---|---|
| Ungrounded costFactor decisions | 8 |
| Priced purchase instances | 29 (**28 distinct ids**) |
| Reuse ratio | **1.04 instances per id - effectively none** |
| Authoritative US price series for teff, loroco, ayote, masa at retail | **none known** |

**Source problem or modeling problem? Neither - it is a legitimacy problem.**

There is no authority to cite. The candidate sources are immigrant-market retail prices that
vary by metro, by store, and by season, published by nobody. Governing them would mean
elevating one shop's price, or one author's guess, to `researched` status.

**And the cultural dimension makes it worse, not merely neutral.** Phase 5B-2 flagged
Ethiopian `fasting_spread` at **0.15** - the most extreme multiplier in the corpus, entirely
unsourced. Stamping a number like that `researched` would tell a host that NGW *knows* an
Ethiopian fasting spread costs 15% of a standard spread. NGW does not know that. Publishing it
would be a confident claim about someone's cultural practice built on nothing, and the fact
that it is cheap to publish is exactly why it is dangerous.

**This is the domain where the correct move is to govern less, visibly.**

## Source Candidates

| Source | Authority | Freshness | Can prove | Cannot prove |
|---|---|---|---|---|
| `usda-ers` | official | monthly | Mainstream commodity categories only | Anything about teff, loroco, ayote, injera |
| `sme-network` | **expert** | on_demand | Practitioner judgement, attributable to a named person | Market price. An SME estimate is testimony, not a price series |
| Regional immigrant-market surveys *(do not exist)* | - | - | - | - |

**`sme-network` is the honest instrument here** - but note what it produces. An SME saying
"teff runs about triple wheat flour" is *expert testimony*, and NGW's grounding ladder already
distinguishes that from a researched price. If these claims are ever grounded, they should be
grounded **as testimony at the tier testimony earns**, not promoted to `researched`.

## Governance Fit

- **Can this become a KCR?** Technically yes. **Should it? No.**
- **New provenance model?** It would need an *attribution* model (named expert, date, scope)
  that the current shape does not carry.
- **Fits costFactor grounding?** It would pass the predicate - which is the problem, not the
  reassurance. **The predicate cannot tell a sourced price from a well-formed guess.**

## Verdict: **KILL** - as a cost-governance target.

Not "defer." NGW should record a standing decision not to govern specialty ingredient pricing,
so this does not resurface every audit as an unexplained gap.

---

# Priority Ranking

Scored as **trust impact x product visibility x research effort**. Trust impact weighs
*repairing existing grounding* above *adding new grounding*, per the brief's instruction to
optimise for trust per primitive rather than count of grounded claims.

| Rank | Evidence primitive | Trust impact | Visibility | Effort | Verdict |
|---|---|---|---|---|---|
| **1** | **DIY / host-prepared per-person cost band** | **Very high** - repairs the DIY multiplier in **11 of 16** grounded decisions and unblocks 9 more | **Highest** - the biggest lever on every event budget | Medium - derived model, official inputs | **EXECUTE** |
| **2** | **Live-buy crab column** (extend `dmv-crab-2026`) | Moderate - unblocks 1 rejected decision | Moderate | **Smallest on the list** - 4 vendors already surveyed | **EXECUTE** |
| **3** | **Non-alcoholic per-person beverage cost** | High - 0 sources today, 193 purchase instances in domain | High | Low-medium - commodity retail basket | **EXECUTE** |
| **4** | Derived/composed provenance capability | High (enables 1 and 3 properly) | Invisible to users | Medium - engineering | **PARK** until 1 or 3 needs it |
| **5** | Freshness enforcement | High - protects all 16 grounded claims from silent staleness | Invisible until it fails | Medium | **PARK** - unpark on first seasonal publish |
| **6** | Alcohol per-person cost | Moderate | High | High - state control regimes | **PARK** |
| **7** | Broad seafood pricing (NOAA + regional retail) | Low - 31 ids / 38 instances, no reuse | Low | High | **PARK** |
| **8** | Specialty / cultural ingredient pricing | **Negative** - manufactures false authority | Low | High | **KILL** |
| **9** | Second-sourcing `catering-perperson-2026` | **Very high** - 14 of 16 claims depend on one source | Invisible | Low-medium | **EXECUTE** (see below) |

## The ranking's uncomfortable result

**Item 9 scores near the top on trust and is the cheapest of the high-trust items, and no prior
phase proposed it** - because every phase, including mine, has been looking for *new* claims to
ground rather than at the concentration of the grounding already shipped.

One source carrying 87.5% of governed cost knowledge is a bigger liability than any of the four
domains the brief asked about. Corroborating it with a second independent per-person catering
source would raise the confidence of 14 published claims at once, and it needs no new model, no
new axis, and no new capability.

---

# 1. Recommended Phase 5B-5 Roadmap

**Theme: repair and corroborate before extending.**

| Step | Work | Type | Gate |
|---|---|---|---|
| **5B-5.1** | **Acquire the live-buy crab column.** Four DMV vendors, already surveyed. Publish as a KCR. | Research | Proves acquisition -> KCR -> runtime end-to-end on a claim 5B-3 *rejected*. If this does not produce visible runtime change, stop the programme and reassess. |
| **5B-5.2** | **Second-source `catering-perperson-2026`.** One independent per-person catering survey. | Research | If the two disagree materially, **that is the most important finding available** and 14 published claims need review. |
| **5B-5.3** | **Design the derived-provenance shape.** Read-only design doc: how does an artifact say "computed from A and B by method M"? | Design | No code. Output is a spec, reviewed before build. |
| **5B-5.4** | **Acquire the non-alcoholic beverage cost band.** | Research | First genuinely new cost source. Tests 5B-5.3's design against a real composed claim. |
| **5B-5.5** | **Build the DIY cost band** on the shape from 5B-5.3. | Research + build | The payoff step. Re-derive the 11 existing DIY multipliers against it and report which survive. |

**5B-5.5 will probably invalidate some currently-grounded values.** That is the point, and it
should be framed as the deliverable rather than as a regression.

# 2. Engineering Work Required

**For 5B-5.1 and 5B-5.2: none.** Both are research plus an existing KCR flow.

Two capabilities surface later, both currently **PARK**:

1. **Derived provenance** - express "computed from sources A + B by method M." Needed by the
   DIY band (Domain 1) and by any composed beverage cost (Domain 2). *Unpark trigger:*
   5B-5.3 design approved.
2. **Freshness enforcement for sources** - `freshnessPolicy` and `seasonal` exist on all 22
   `SOURCE_CATALOG` entries and are **rendered in `AdminConsole.jsx` but read by no gate,
   predicate or runtime path.** A Freshness dimension already exists in `dimensions.js` with a
   review trigger and research-queue route, keyed to playbook `governance.lastReviewed` -
   so this is **extending an existing mechanism to a second object type**, not building one.
   *Unpark trigger:* the first seasonal publish, i.e. 5B-5.1.

**Still parked, unchanged:** resolver migration, registry consolidation, the 219-item purchase
backfill, `unitCostRange` runtime wiring.

**One observation worth a decision, outside this phase's scope:** `isGroundedCost` verifies
that a source id *resolves*, not that the source *contains the claimed quantity*. That is how
11 DIY multipliers passed the gate citing a source with no DIY number. No predicate can fully
close this - but it means **the predicate is a wiring check, not a truth check**, and it should
be described that way in the doctrine so future audits do not read a green gate as verification.

# 3. Research Work Required

Ordered as sequenced above:

| # | Acquisition | Effort | Unblocks |
|---|---|---|---|
| 1 | Live blue crab $/dozen, 4 DMV vendors already surveyed | **Hours** | Crab Feast `steam_vs_order` |
| 2 | An independent 2026 per-person catering survey | Days | Corroborates **14** published claims |
| 3 | Non-alcoholic beverage retail basket, per-person | Days | 11 beverage decisions, 193 purchase instances |
| 4 | Retail ingredient basket + portion model for host-cooked meals | **Weeks** | **11 grounded + 9 ungrounded decisions** |
| 5 | Live vs boiled crawfish $/lb, one market | Hours | Crawfish `cookmethod` |

**Items 1 and 5 are hours of work each and were both already identified in 5B-3.** They should
not wait on the strategy.

# 4. What NGW Should Deliberately NOT Govern

Recorded as decisions so they stop resurfacing as gaps:

| Do not govern | Why |
|---|---|
| **Specialty / cultural ingredient pricing** (teff, loroco, ayote, masa) | No authority exists. Publishing would elevate a guess to `researched` and make a confident claim about someone's cultural practice on no evidence. |
| **Host labor / preparation time as a cost** | NGW has no standing to price a host's hours. Preparation belongs in the timing axis. |
| **BYOB vs hosted vs cash bar** | A liability and social structure, not a price. |
| **National spirits pricing** | State control regimes make a single national number wrong in a meaningful share of states. |
| **Milestones, contingencies, risks, format/activity/scope decisions** | Unchanged from 5A-5 and 5B-2 - planning judgement, not citable fact. |
| **Any coverage-percentage target** | Unchanged from 5A-5. 66% of the corpus cannot have sources; the metric cannot approach 100 and chasing it spends effort where it buys no trust. |

# 5. The Next Smallest Experiment That Can Prove Value

> **Acquire one column: live blue crab price per dozen, from the four DMV vendors
> `dmv-crab-2026` already surveys. Publish it as a KCR. Verify Crab Feast
> `steam_vs_order` flips to grounded in the live product.**

Why this one, over the higher-value DIY band:

- **It is hours, not weeks.** The vendors are identified and the source already exists and
  already resolves.
- **It closes a loop nothing has closed yet.** Every phase so far has either published from
  evidence that already existed (5A-2, 5A-3) or declined to publish (5A-6, 5B-3). **No phase
  has yet gone acquire -> publish -> runtime.** Until one does, the acquisition strategy is
  untested.
- **It tests a claim that was rejected.** 5B-3 rejected `steam_vs_order` for one missing
  datum. Acquiring exactly that datum and watching the verdict flip is the cleanest possible
  proof that the verification gate is *productive* rather than merely obstructive.
- **It exercises the seasonal path first, at low stakes** - which is how the freshness gap
  gets discovered on a one-playbook claim instead of on the DIY band that 11 decisions depend
  on.

**Kill criterion, stated in advance:** if the column is acquired, published, and
`steam_vs_order` does not visibly change in hostv2, the constraint is not evidence
availability after all, and Phase 5B's central conclusion is wrong.

---

## FACTS / ASSUMPTIONS / RISKS

### FACTS (measured this session)
- F1. `COST_SOURCES` has **3** entries; `QTY_SOURCES` **3**; `TIMING_SOURCES` **10**. Unified
  catalogue: 111 sources / 20 axes, of which 87 are tier `unspecified`.
- F2. Source ids cited by the 16 grounded costFactor decisions:
  `catering-perperson-2026` **14**, `usda-meat-2026` 1, `dmv-crab-2026` 1.
- F3. Of those 16, **11** carry a DIY/potluck option with a multiplier and **9** use one as the
  baseline.
- F4. Ungrounded costFactor decisions by domain (overlapping): seafood 13, beverage 11, DIY 9,
  specialty 8, none-of-these 3.
- F5. Priced purchase instances by domain: beverage **193** (81 ids), seafood 38 (31 ids),
  specialty 29 (**28** ids), DIY 25 (21 ids).
- F6. `SOURCE_CATALOG` has 22 publisher families carrying `authority`, `freshnessPolicy`,
  `seasonal`, `regionalScope`, `commercialBias`. It already names `usda-ers`, `bls-cpi`,
  `usda-fdc`, `sysco-pricing`, `restaurant-depot`, `costco-business`, `gfs`, `sme-network`.
- F7. No source in the registries is scoped to beverages-cost.

### ASSUMPTIONS (not verified this session)
- A1. What `usda-ers`, `bls-cpi`, `usda-fdc` and NOAA actually publish. The catalogue's
  `authority`/`freshness` values are read from the repo; the **content** assessments are mine.
- A2. That no authoritative US retail price series exists for teff, loroco or ayote. I did not
  exhaustively search; I searched the registries and reasoned about the market.
- A3. Domain sizing used regex over full decision JSON, so a decision can count in more than
  one domain. The totals are indicative, not disjoint.

### CORRECTION to a prior report
Phase 5B-2 (R4) recorded that `SOURCE_CATALOG.freshnessPolicy` **"exists and is unused."**
Verified and corrected this session: it **is** used - `AdminConsole.jsx` renders it in two
places. The accurate statement is **"displayed, never enforced"**: no gate, predicate or
runtime path reads it. Separately, a **Freshness dimension does exist** in `dimensions.js`
(review trigger + research-queue route), keyed to playbook `governance.lastReviewed` rather
than to source freshness. This makes the seafood recommendation *cheaper* than 5B-2 implied,
not more expensive.

### RISKS
- **R1.** The concentration in F2 is the top risk in the knowledge layer. If
  `catering-perperson-2026` is wrong or goes stale, **14 published claims are wrong
  simultaneously**, and nothing currently detects it.
- **R2.** F3 means NGW currently ships 11 grounded claims whose key number its source does not
  contain. They are not *false* - they may well be right - but they are **not verified**, and
  they are marked as though they were.
- **R3.** A derived-provenance model, done carelessly, becomes a laundering mechanism: cite two
  real sources, apply an unexamined method, emit a `researched` number. The method must be
  part of the reviewed artifact, or this capability makes trust worse.
- **R4.** The Freshness dimension exists but is scoped to playbooks. Extending it to sources is
  cheap; leaving it unextended while publishing seasonal claims is the actual risk.
