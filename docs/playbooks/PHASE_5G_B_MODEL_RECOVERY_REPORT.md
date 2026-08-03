# Phase B - Model Recovery and Host Labels

Program: NGW Knowledge Strategy Reset.
Ruling executed: "The product already contains more knowledge structure than the
governance runtime recognizes. Recover it before adding anything new."

Phase A audit: `PHASE_5G_A_STRATEGY_MODEL_AUDIT.md`.

---

## 1. What was built

### `src/lib/knowledge/claimBasis.js` - the one shared classifier

`classifyClaim(provenance)` returns the five things the ruling required, kept
apart because one predicate must not serve every purpose:

```
  basis                   what kind of knowing        (authored vocabulary, verbatim)
  verification            how settled it is
  hostLabel               what a host is told
  directCitationEligible  === isGroundedItemQty       (narrow, provable, unchanged)
  recommendationEligible  may the app lead with this
```

**No parallel taxonomy was introduced.** The basis keys ARE the strings authors
already write - `cultural-tradition`, `matriarch`, `trade-heuristic`,
`host-coaching`, `primary` and the rest. A test asserts every key in the table is
a tier some author actually authored, so the vocabulary cannot drift into
invention.

**The doctrine disagreement is resolved by construction.** The classifier CALLS
`isGroundedItemQty` rather than reimplementing it, so the two modules that
disagreed in Phase A can no longer diverge. Asserted line by line across the
whole corpus, not by inspection.

**`grounded` is gone as a field name.** A test forbids it. That word is what
silently excluded established consensus, cultural tradition and primary
evidence.

### Two dimensions, recovered rather than added

`tier` (basis) and `verificationStatus` (settlement) are now read separately, as
authors have been writing them all along. `cultural-tradition /
established-consensus` survives classification with both halves intact.

### Metric renamed

`INVENTORY_STATES` state `grounded` -> `directly-cited`;
`groundedShare()` -> `directlyCitedShare()`. The admin console now reads:

```
  KNOWLEDGE INVENTORY - 537 authored lines. 9.7% directly cited to a registered source
  (NOT the share with an intellectual basis - see the basis distribution below).
```

### Host labels - the silence fix

`HostShellV2.jsx` render seam rewritten. It was:

```jsx
{it.qtyGrounded && it.provenance && it.provenance.note && (  "Sourced — " + note  )}
```

52 lines labelled, 485 silent. Now every row is classified at render time from
the governed provenance it already carries - presentation only, the same contract
`confidenceGrammar.js` works under.

---

## 2. What a host now sees (measured, all 537 lines)

```
  Planning baseline        406   75.6%
  Practitioner guidance     53    9.9%
  Directly sourced          52    9.7%
  Cultural tradition        23    4.3%
  Established consensus      3    0.6%
  Needs confirmation         0    0.0%
```

**The citation count did not move: 52 before, 52 after.** Relabelling promoted
nothing. This is asserted directly - `Directly sourced` appears on exactly the
rows `isGroundedItemQty` passes, no wider.

`Needs confirmation` reads zero because it is reserved for two real defect
classes that the corpus currently has none of at the food-plan level: an
unclassified tier, and a line claiming research it cannot back. It is a live
tripwire, not dead vocabulary.

### The detail text is never synthesised

The host renders `${label} — ${detail}` where detail is the authored note or the
authored prose rationale, or nothing. A test asserts every rendered detail string
is one an author actually wrote. A label with no recorded reasoning stands alone
rather than inventing some.

---

## 3. Honesty decisions taken, and why

**Lines with no recorded provenance (368) read `Planning baseline`, not
`Needs confirmation`.** Grounded in the host's own Part 1 ruling that existing
playbooks are a `board_approved_authored_baseline`. It is the weakest of the
informative labels: it claims no source and no research, only that the board
authored the figure as a starting point. `basisRecorded` stays false and `basis`
stays null, so the model still records that no basis VOCABULARY was declared -
the classifier never asserts the line has no basis.

**Bare-string provenance was measured, not assumed.** The inventory's comment
implied these were tier names. They are not: zero of the 21 is a tier. 13 are the
single word `synthesized` (a verification word); 8 are free prose such as
`"US bar-stocking norm: 40/30/30 beer/wine/spirits split."` Prose is preserved as
`rationale` and is never read as a basis - inferring one from prose is the false
precision this program exists to prevent. The 13/8 split is pinned by test so a
third string shape fails rather than falling silently into the baseline bucket.

**Recency remains unassertable.** `verified_current` and `corroborated` are
deliberately absent from `CLAIM_VERIFICATION`, and a test forbids any label
matching /current|verified|corroborat/. No claim-level verification date exists
anywhere in the corpus; `sourceFreshness` dates SOURCES only.

**`researched` that cannot be backed asks for confirmation, not guidance.** A
tier claiming research whose sources do not resolve is the looks-sourced-but-is-
not class. Reading it as guidance would repeat the exact defect being removed.

**Settled-among-practitioners is not sold as independent consensus.** The 23
`trade-heuristic / established-consensus` lines read `Practitioner guidance`.

---

## 4. A defect this work introduced, and how it surfaced

The state rename broke `backfillClassification.js`, which still tested for the
literal `'grounded'`. All 52 settled lines silently re-entered the backlog and
were reported as a **bigger backlog** rather than as an error - a failure that
looks like data, not like a bug.

Caught by the needsWork/inventory reconciliation test, which is exactly the guard
that class of drift needs. The test now reconciles against
`inv.counts['directly-cited']` and the reason is recorded in both files.

---

## 5. Verification

```
FULL SUITE       322 suites / 4956 passed, 1 skipped        (was 320 / 4925)
gate:knowledge   [OK] snapshot up to date, 16 records / 15 entries
gate:hostv2      matches source, 12 files, no drift          (after sync:hostv2)
hostv2 parity    3 kit atoms locked, 11 hero selectors token-clean
lint             0 new errors in lib/admin; HostShellV2 inherits its pre-existing
                 `import/first` condition (106 -> 107), no new error class, no CI gate
```

New tests: `claimBasis.test.js` (22), `claimLabelHostProof.test.js` (9).

### Driven live, not inferred

Built hostv2 (`HostShellV2-0d48f7d0.js`), served at the repo's own e2e base
(`E2E_BASE=1 vite preview`, port 5233), driven with real pointer clicks:
Birthday -> Open the spread -> The list -> Drinks.

Confirmed on screen:

```
  Soft drinks, juice, water   2/guest x 11 guests · typical
                              Planning baseline                    <- previously SILENT

  Ice                         1.5 lb/guest x 11 guests · typical · often forgotten
                              Directly sourced — Grounded to bar-provision-2026:
                              ~1.5 lb ice/guest is the source-stated ice
                              provisioning rate.                   <- previously "Sourced —"
```

Every row in the list carried a label. None was silent.

All six labels are present in the served chunk; the old `Sourced —` string is
absent from it.

---

## 6. State

```
Files added:    src/lib/knowledge/claimBasis.js
                src/lib/knowledge/claimBasis.test.js
                src/lib/knowledge/claimLabelHostProof.test.js
                docs/playbooks/PHASE_5G_A_STRATEGY_MODEL_AUDIT.md
                docs/playbooks/PHASE_5G_B_MODEL_RECOVERY_REPORT.md
Files changed:  hostv2/src/HostShellV2.jsx          (render seam + import)
                src/admin/AdminConsole.jsx          (renamed metric + honest caption)
                src/lib/knowledge/knowledgeInventory.js       (state + metric rename)
                src/lib/knowledge/backfillClassification.js   (stale literal fix)
                + two test files, public/hostv2/ artifact re-synced
```

No playbook data, no corpus record, no published snapshot entry was modified.
Nothing was backfilled. No value moved.

---

## 7. What Phase B did NOT do

- Did not touch claim families. `p_ice` and `p_tableware` are unchanged.
- Did not represent baselines vs adjustments. The recovered ice logic is still
  prose in item strings.
- Did not add the five-question host card or the "Where Are We?" surface.
- Did not add a flag/off-switch for the label change, unlike `confidenceGrammar`.
  This was treated as a correctness fix rather than an experiment; it is
  reversible in one edit at the render seam. Flag it if that judgment is wrong.

---

## 8. Next

Per the approved execution order, steps 1-4 are complete. Next is **Phase C1 -
the ice canonical family**, which the host ruled unblocked:

- 29 `p_ice` lines, one unit (`lb`), one meaning, one use case.
- Values 1 / 1.25 / 1.5 / 2 / 2.5 lb per guest.
- The adjustment logic already exists as board decision, written in prose:
  every 2 lb event is outdoor, warm-weather or high-volume, and Juneteenth says
  so out loud - `"Ice (coolers + drinks, heat-adjusted)"`.

That recovery needs a human ruling on the trigger definition before it can be
represented, because reading a trigger out of a display string is a lead, not a
fact - the honesty boundary from Phase A section 10.

**Phase C2** (classify the 18 `p_tableware` lines into semantic families, then
pilot only the clean place-setting cohort) follows, with Low Country Boil
excluded per the host's ruling.
