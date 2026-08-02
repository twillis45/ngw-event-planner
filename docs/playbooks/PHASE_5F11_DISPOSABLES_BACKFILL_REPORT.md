# Phase 5F.11 - Disposable Supplies Backfill (Batch 2)

**Date:** 2026-08-02. ASCII-only.
**Source under test:** `jollychef-disposables-2026` (commercial_practitioner, disclosed).

---

# Headline

**30 candidates measured. 11 are in scope. 19 are blocked. 1 is published.**

"Approximately 30 lines" was the expected scope. The scope check cut it to 11 - not
because the batch was over-estimated, but because most disposables lines make a claim
this source does not support. Rule 6 says block rather than force, so 19 are classified
and left ungrounded.

The batch was then **halted after the first record on a tool-reliability problem that
produced a corrupted host-facing claim note.** Details in section 5. This is a genuine
integrity risk, not impatience.

---

# 1. What the source actually states

```
dinner plates/bowls   guests x1.3   (buffet 1.3-1.5, plated 1.1, appetizer-only 2.5-3.0)
cups and cutlery      guests x1.5   (non-alc 1.5, beer/wine 2.0, full bar 2.5-3.0, hot 0.75)
napkins               guests x3
worked example        100 guests / 3h -> 130 plates, 150 cups, 150 cutlery, 300 napkins
```

## The eligibility rule applied

**A line is eligible only where its authored value sits at a figure the source states
WITHOUT requiring an assumption about service style.** That baseline is plates 1.3-1.5
and cups+cutlery 1.5.

Anything above 1.5 depends on the source's bar-service tiers (beer/wine 2.0, full bar
2.5-3.0) or its appetizer-only plate tier (2.5-3.0). Selecting one of those means
deciding what kind of service the event has — the same class of event classification
that stopped Batch 1, and which this directive forbids. **So values above 1.5 are
blocked, not classified.**

---

# 2. Candidates and disposition

## `p_tableware` - 18 lines

| Playbook | Authored | Disposition |
|---|---|---|
| **Birthday** | **1.5 sets** | **COMPLETED - published, host-verified** |
| Baby Shower | 1.5 sets | eligible, not executed |
| Get-Together | 1.5 sets | eligible, not executed |
| Graduation | 1.5 sets | eligible, not executed |
| Bridal Shower | 1.5 sets | eligible, not executed |
| Gender Reveal | 1.5 sets | eligible, not executed |
| Fish Fry | 1.5 sets | eligible, not executed |
| Juneteenth Cookout | 1.5 sets | eligible, not executed |
| Crab Feast | 1.5 sets | eligible, not executed |
| Kwanzaa Gathering | 1.5 sets | eligible, not executed |
| Watch Party | 2 sets | **blocked** - authored value requires human review |
| Bachelorette Party | 2 sets | **blocked** - 2.0 is the source's beer/wine tier; assumes service style |
| Pupusa Gathering | 2 sets | **blocked** - authored value requires human review |
| Low Country Boil | 2 sets | **blocked** - source scope mismatch: item is "paper towels, napkins, small bowls, shell buckets", not a place setting |
| Sweet 16 | 2.5 | **blocked** - full-bar / appetizer-only tier; assumes service style |
| Quinceanera | 2.5 | **blocked** - same |
| The Cookout | 3 sets | **blocked** - top of the full-bar range; assumes service style |
| Retirement Party | 6 pieces | **blocked** - unit is "pieces", not sets; no comparable figure |

## `p_napkins` - 8 lines, ZERO eligible

| Playbook | Authored | Disposition |
|---|---|---|
| Dinner Party | 1.5 napkins | **blocked** - "cloth or premium paper"; a disposables source cannot ground cloth, and 1.5 is half the source's 3 |
| Anniversary | 2 napkins | **blocked** - same |
| Vow Renewal | 2 napkins | **blocked** - same |
| Engagement Party | 4 pieces | **blocked** - bundled "napkins + small plates + picks + cups"; mixed claim |
| Game Night | 6 napkins | **blocked** - exceeds the source's 3; includes hand wipes |
| Card Party | 8 napkins | **blocked** - exceeds the source's 3; includes paper towels |
| Sunday Dinner | qtyFlat 1 set | **blocked** - package/kit model not represented |
| Crawfish Boil | qtyFlat 1 kit | **blocked** - cleanup kit, not napkins |

**Every napkin line is blocked, and that is the most useful finding in this batch.** The
source has a clear napkin figure (3/guest) and NOT ONE corpus line matches it: five are
below it or bundled with non-napkin items, two exceed it, one is a flat kit. The napkin
model in the corpus and the napkin model in the source do not describe the same thing.

## `p_cups` - 4 lines, 1 eligible

| Playbook | Authored | Disposition |
|---|---|---|
| Crawfish Boil | 1.5 sets | eligible, not executed |
| Graduation | 4 cups | **blocked** - exceeds even the full-bar 2.5-3.0 range |
| Housewarming | 3 sets | **blocked** - full-bar tier; assumes service style |
| Day Party | 3 sets | **blocked** - same |

---

# 3. Completed

| Event | Field | Old | New | Evidence | Tier | Decision | Result |
|---|---|---|---|---|---|---|---|
| Birthday | `p_tableware.provenance` | none | researched / jollychef-disposables-2026 | 1 citation, url + capture date | researched | provenance-only | **published, baked, host-verified** |

**Value unchanged at 1.5 sets/guest.** Nothing in this batch changed a number.

## Host proof

`wave0HostProof.test.js` extended to 12 tests. For Birthday it asserts against real
`playbookFoodPlan` output that:

- the Sourced line renders, from `jollychef-disposables-2026`
- `isGroundedItemQty` agrees
- the authored 1.5 has not moved
- the **CAVEAT** (commercial interest) reaches the note a host reads
- the **LIMITATION** reaches it too - the source recommends 3 napkins/guest, more than
  one set provides, and the note says so

That second one matters. The corpus bundles napkins into a "set" while the source counts
them separately, so grounding the set to this source is honest only if the shortfall is
disclosed. It is disclosed, in the text a host sees.

---

# 4. Counts

```
Total knowledge lines      537
Grounded                    43     (was 42)
Corpus records               7     -> 6 governed fields
Type A                     127     (was 128)
Type B                     364
Type C                       3
```

Corpus, snapshot and host agree. Every committed record carries citable evidence and
both halves of provenance.

---

# 5. Why the batch stopped after one record

**Not a governance problem. A tool-reliability problem with a governance consequence.**

While composing the Birthday claim note, `Input.dispatchKeyEvent` timed out after 30s
and the browser extension disconnected. The typed text **partially landed with no error
surfaced**. On reconnect I retried, and the retry appended to the surviving fragment,
producing:

```
...sits at that figure; value NOT changed.mmercially interested in a higher multiplier;
other disposables retailers publish materially the same figures... LIMITATION: ...
CAVEAT: vendor-published and commercially interested in a higher multiplier - trade
consensus among sellers, not independent corroboration.
```

A truncated opening, a spliced fragment, and a duplicated caveat. I caught it only
because I screenshotted the composer before submitting. The field was cleared, retyped,
and verified by zoom before the record was created.

**The claim note is host-facing text.** A silent partial write to it is exactly the class
of defect this programme exists to prevent - correct-looking at every automated check,
wrong in the thing a person reads. Ten more records at that risk, each needing a
long note, is not a reasonable trade against ten provenance-only groundings.

The remaining ten are fully specified below and can be executed in a fresh session where
the tooling is stable.

---

# 6. Ready to execute - the remaining ten

All are `p_tableware.provenance`, authored **1.5 sets/guest**, source
`jollychef-disposables-2026`, tier `researched`, confidence `medium`, operation
provenance-only.

```
Baby Shower · Get-Together · Graduation · Bridal Shower · Gender Reveal
Fish Fry · Juneteenth Cookout · Crab Feast · Kwanzaa Gathering
```

plus **Crawfish Boil `p_cups.provenance`** at 1.5 sets/guest.

**Claim note (verbatim, reused - one source, one figure, one reasoning):**

> JollyChef states 1.3-1.5 dinner plates/guest for a buffet and 1.5 cups+cutlery/guest.
> The authored 1.5 sets/guest sits at that figure; value NOT changed. LIMITATION: the
> source recommends 3 napkins/guest, more than one set provides. CAVEAT:
> vendor-published and commercially interested in a higher multiplier - trade consensus
> among sellers, not independent corroboration.

**Reason:**

> Batch 2 provenance-only: p_tableware carries no provenance. Grounding the authored 1.5
> sets/guest to the disposables source that states that figure. No value change.

Reusing one note across ten lines is legitimate here and only here: identical field,
identical source, identical tier, identical authored value, identical reasoning, no value
change. That is the safe-grouping rule from `KNOWLEDGE_OPERATIONS_MODEL.md` satisfied on
all five keys.

---

# 7. Verification

| Gate | Result |
|---|---|
| Full suite | **318 suites / 4877 tests passing**, 1 skipped |
| `gate:knowledge` | `[OK]` |
| `gate:hostv2` | no drift |
| corpus integrity | passing |
| lifecycle reconstruction | passing - every entry carries evidenceIds, `cited` |
| eslint | 0 errors in product source |

No false Sourced lines. No uncorrectable published records. No lineage conflicts. No
value changed by commercial interest.

---

# 8. Source-scope exceptions worth escalating

Two are product questions rather than backfill mechanics:

1. **The napkin model does not match any source.** Eight lines, no match, spanning 1.5 to
   8 per guest against a source that says 3. Either the corpus figures need review or
   napkins need a source that describes them the way the corpus does.

2. **Six lines sit at 2.0-3.0 sets/guest**, which the source supports only under bar
   service. If NGW is willing to state "an event with a bar is 2.0 and a full cocktail
   bar is 2.5-3.0", those six become groundable immediately. That is a product policy
   call, not something to infer per playbook.

Neither blocks anything already committed.
