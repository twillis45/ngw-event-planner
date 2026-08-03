# Phase 5F.11 - Disposable Supplies Backfill (Batch 2)

**Date:** 2026-08-02. ASCII-only.
**Source:** `jollychef-disposables-2026` (commercial_practitioner, disclosed).

---

# Status

## PARTIAL - 4 of 11 eligible completed. 19 blocked and classified. Two defects fixed.

Nothing is blocked by a decision. The remaining 7 are mechanically identical to the 4
that are done and are fully specified below.

---

# 1. Defects fixed

## 1.1 Governed claim text could be silently corrupted

`Input.dispatchKeyEvent` timed out mid-write, the extension disconnected, the text
PARTIALLY LANDED with no error, and the retry appended to the surviving fragment -
producing a note with a truncated opening, a spliced middle and a duplicated caveat.

Every automated check would have passed: evidence present, source resolvable, tier
researched, note non-empty, `canReachCited` true, suite green. It was caught only by
looking at the screen.

**Fixed** (`fd19df81`):

- `verifyGovernedText` names six failure shapes - `empty`, `truncated`, `appended`,
  `duplicated`, `spliced`, `mismatched` - because the correct recovery differs by shape.
  The truncated message explicitly warns against typing again, which is what caused the
  corruption.
- Writes now use a React-safe programmatic fill that **clears before setting**, followed
  by byte-for-byte readback, and the record is re-verified against the intended string
  after storage.
- 14 tests, every case reconstructed from the real corrupted value.

**Contract now enforced end to end and measured on all four records:**

```
intended text == input value before submit == stored record == host-rendered text
```

**Scope note on method.** Governed TEXT is written programmatically, because determinism
is the requirement and a keystroke stream is not deterministic under a flaky transport.
Every BUTTON - source selection, submit, all three approvals, publish - was a real
pointer click. The distinction is deliberate: clicks prove the UI works, text entry
transfers data.

## 1.2 The console understated its own grounding

The Acquisition workspace read **"grounded 38 · reviewed 8"** while the committed corpus
measured **46 and 0**.

Not a stale bundle. `AdminConsole` builds `liveIdx` by mapping each snapshot entry down
to `{assetId, fieldPath}` for the picker, then reused that stripped list for
`knowledgeInventory` - which needs `entry.value` to decide whether a GOVERNED provenance
grounds. The lookup returned `undefined`, so every governed line fell back to its
authored provenance and was counted `reviewed`.

The same measurement-disagrees-with-runtime shape this programme keeps finding, this
time caused by a convenience mapping two lines earlier. Fixed, and the dependency is now
pinned by a test that shows stripped entries producing `grounded 0 / reviewed 1` where
full entries produce `grounded 1`.

**Live after the fix:** `KNOWLEDGE INVENTORY - 537 authored lines. 8.6% grounded.
grounded 46 · reviewed 0`. Console and corpus agree.

---

# 2. Canonical note

Ten near-identical governed notes composed by hand is how a caveat goes missing from the
ninth - and a dropped caveat is a host reading an undisclosed vendor figure.

`buildDisposablesClaimNote` is **not new wording**. It is the Birthday note - reviewed,
approved, published, host-verified - reduced to its parameters. The anchor test
regenerates that committed note and reason **byte-for-byte**; if it ever cannot, the
builder has drifted from wording a human signed off.

The CAVEAT is unconditional. The LIMITATION is conditional: a cups-only line carries no
napkins, so asserting a napkin shortfall there would be a caveat about something the host
is not buying.

A test asserts all four published disposables notes are **byte-identical**.

---

# 3. Executed

| Event | Field | Old | New | Source | Tier | Decision | Result |
|---|---|---|---|---|---|---|---|
| Birthday | `p_tableware.provenance` | none | researched | jollychef-disposables-2026 | researched | provenance-only | published, host-verified |
| Baby Shower | `p_tableware.provenance` | none | researched | jollychef-disposables-2026 | researched | provenance-only | published, host-verified |
| Get-Together | `p_tableware.provenance` | none | researched | jollychef-disposables-2026 | researched | provenance-only | published, host-verified |
| Graduation | `p_tableware.provenance` | none | researched | jollychef-disposables-2026 | researched | provenance-only | published, host-verified |

**Values changed: 0.** All four remain at the authored 1.5 sets/guest.

Every record verified after publish: `evidenceIds` survive the bake, entry provenance
reads `cited`, `canReachCited` true, predicate grounds, note byte-exact.

## Remaining eligible - 7, mechanically identical

```
Bridal Shower · Gender Reveal · Fish Fry · Juneteenth Cookout · Crab Feast ·
Kwanzaa Gathering          -> p_tableware @ 1.5 sets/guest
Crawfish Boil              -> p_cups      @ 1.5 sets/guest  (no LIMITATION sentence)
```

Same source, tier, authored value and canonical note. No new decisions.

---

# 4. Blocked - 19, classified

## Bucket A - `blocked — explicit service-style signal required` (8)

The source's higher tiers exist (beer/wine 2.0, full cocktail 2.5-3.0, appetizer-only
plates 2.5-3.0) but selecting one means asserting what service the event has.

| Playbook | Field | Authored | Eligible under |
|---|---|---|---|
| Watch Party | p_tableware | 2 | beer/wine service |
| Bachelorette Party | p_tableware | 2 | beer/wine service |
| Pupusa Gathering | p_tableware | 2 | beer/wine service |
| Sweet 16 | p_tableware | 2.5 | full bar or appetizer-only |
| Quinceanera | p_tableware | 2.5 | full bar or appetizer-only |
| The Cookout | p_tableware | 3 | full bar |
| Housewarming | p_cups | 3 | full bar |
| Day Party | p_cups | 3 | full bar |

Missing signal: **an explicit service-style fact on the event.** No value changed.

Not inferred, and deliberately: Birthday is not "beer/wine", Quinceanera is not "no bar".
Those are stereotypes dressed as product logic.

## Bucket B - `blocked — claim model mismatch` (8 napkins)

| Playbook | Authored | Apparent meaning |
|---|---|---|
| Dinner Party | 1.5 napkins | cloth/premium-paper service decision |
| Anniversary | 2 napkins | cloth/premium-paper service decision |
| Vow Renewal | 2 napkins | cloth/premium-paper service decision |
| Engagement Party | 4 pieces | bundled: napkins + small plates + picks + cups |
| Game Night | 6 napkins | cocktail napkins + hand wipes |
| Card Party | 8 napkins | cocktail napkins + paper towels + wipes |
| Sunday Dinner | flat 1 set | napkins + serving spoons |
| Crawfish Boil | flat 1 kit | cleanup bundle |

The source has a clear figure - 3 napkins/guest - and **not one line matches it.** The
corpus mixes dinner napkins, cocktail napkins, bundled sets, cleanup materials and a
cloth-vs-paper service choice under one id. These are different procurement concepts.

## Bucket C - `blocked — package/kit model not represented` (2)

Sunday Dinner `flat 1 set`, Crawfish Boil `flat 1 kit`. A per-item usage source cannot
ground "1 kit" without the kit's contents and scaling defined. Not converted to a
per-guest quantity.

## Bucket D - `blocked — source subject does not match governed field` (1)

Low Country Boil `p_tableware` @ 2: the item is *"Paper towels, napkins, small bowls,
shell buckets"* - not a place setting, whatever the number.

---

# 5. Product decisions

## 5.1 Napkin model - `PARK — scoped model migration required`

The mismatch is a **corpus modelling problem, not a provider gap.** Looking for a source
whose number happens to match 1.5, 6 or 8 would be fitting evidence to values, which this
programme forbids.

Provisional concepts, to be checked against the live taxonomy before any migration:

| Current | Value | Apparent meaning | Proposed concept | Risk |
|---|---|---|---|---|
| `p_napkins` (Dinner Party, Anniversary, Vow Renewal) | 1.5-2 | cloth vs premium paper | service-material decision, not a disposable count | needs host input; changes a choice, not a quantity |
| `p_napkins` (Game Night, Card Party) | 6-8 | cocktail napkins + wipes | `p_cocktail_napkins` + separate wipes | splitting a line changes cost roll-up |
| `p_napkins` (Engagement Party) | 4 pieces | bundled place setting | fold into `p_tableware` | double-counting if both exist |
| `p_napkins` (Sunday Dinner, Crawfish Boil) | flat | kit | `p_cleanup_kits` | flat-vs-per-guest is a schema change |

**Runtime/user input needed:** yes, for the cloth-vs-paper cases. Not done here.

## 5.2 Service style - `PARK — runtime signal required`

I inspected the data model for an existing fact that truthfully expresses service style.
`foodApproach()` and the beverage decisions exist, and playbooks carry drink `options`
and `costFactors` including "Dry / family-friendly" - but these are **decision OPTIONS a
host may or may not have answered**, not a settled event-level fact, and nothing
guarantees one is present.

**No explicit, always-present signal exists.**

- Missing fact: whether the event serves no alcohol / beer+wine / a full bar.
- Why playbook classification is insufficient: measured in 5F.6 - signal counts put
  Anniversary at 12/12 and Quinceanera at 8/8. No threshold resolves those honestly.
- Minimum input: one event-level enum, captured where the host already answers drink
  questions.
- **Unknown must remain ungrounded**, and does today.

No intake feature built. The 8 Bucket A lines stay blocked.

---

# 6. Effective inventory

Measured from effective runtime provenance, cross-checked against corpus, baked snapshot
and the live admin console.

```
Total knowledge lines            537
Grounded                          46      8.6%
Ungrounded                       491
Published governed records        10
Governed fields                    9
Archived governance records       13

Blocked - service style            8
Blocked - claim model mismatch     8
Blocked - package/kit model        2
Blocked - source mismatch          1

Remaining Type A                 124
Remaining Type B                 364
Remaining Type C                   3
Remaining Type D                   0
```

Console, corpus and snapshot agree at 46 / 0 after the fix in 1.2.

---

# 7. Next category - measured

Type A composition, with authored-value spread (a wide spread means per-line judgement):

| Category | Lines | Values | Source states | Verdict |
|---|---|---|---|---|
| **Disposables (remaining)** | 26 | 7 at 1.5 eligible; rest blocked | plates 1.3-1.5, cups 1.5 | **EXECUTE** - proven path, no new decisions |
| Protein | 11 | 0.5×4, 0.4×3, 0.25×2, 4×1 | "~0.5 lb raw protein/guest" stated explicitly | **RESEARCH** - the four at 0.5 match a stated figure with no service-style assumption, but 6 of 11 are the ratcheted channel-priced lines whose authored sources do not resolve |
| Sides | 29 | 0.2-0.75 lb, 5 flat kits | 4-6 oz (0.25-0.375 lb) starch/veg | **RESEARCH** - unit semantics differ (lb vs oz vs cups); some in range, some above |
| Drinks | 46 | 0.06 to 4, plus flat kits | ~1 drink/guest/hour, tiers by service | **PARK** - largest but the widest spread, and rate depends on duration AND service style: the same blocker as Bucket A |
| Ice | 12 | 2×7, 1.25×2, 1.5×2, 1×1 | 1-2 lb, outdoor example 2.1 | **PARK** - indoor/outdoor classification, unresolved |

**Recommendation: finish the 7 remaining disposables first.** They need no decision, no
new source and no new capability, and the path is proven four times. Protein at 0.5 is
the next genuine candidate and needs a scope check on the ratcheted lines first.

Drinks is the largest number and the worst next move - its values span two orders of
magnitude and its rate depends on the same service-style fact that is parked.

---

# 8. Verification

| Gate | Result |
|---|---|
| Full suite | **320 suites / 4911 tests passing**, 1 skipped |
| `gate:knowledge` | `[OK]` |
| `gate:hostv2` | no drift |
| corpus integrity | passing |
| commercial-source policy | passing |
| lifecycle reconstruction | passing - all 9 entries carry evidenceIds, `cited` |
| eslint | 0 errors in product source |

**Live proof**

- 4 tableware records published through real pointer clicks at every gate
- byte-for-byte readback verified before submit and after storage on all 4
- admin console reads `grounded 46 · reviewed 0 · 8.6%`, matching the corpus
- Dinner Party `p_ice` shows `provenance · published` in the picker
- store: 8 published, 13 archived, **no stranded researching/review records from this run**
  (the 227 drafts and 2 review / 1 researching / 1 approved records all predate it)

---

# 9. Remaining risks

| Risk | Severity |
|---|---|
| 7 eligible disposables not yet executed | **Low** - specified, proven path |
| Service-style signal missing | **Medium** - blocks 8 lines and most of drinks |
| Napkin model mismatch | **Medium** - 8 lines, needs a scoped migration |
| 364 Type B lines have no source | **High for coverage**, zero for host truth |
| 103 of 113 sources undeclared class | **Medium** - undeclared cannot lift the commercial restriction, so it fails safe |
