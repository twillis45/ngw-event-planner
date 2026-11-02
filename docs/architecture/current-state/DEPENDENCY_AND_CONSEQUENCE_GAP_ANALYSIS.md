# Dependency & consequence gap analysis

**Status: evidence complete.** Written after the venue trace and its positive
control, per the owner's instruction to inventory existing mechanisms before
proposing a dependency graph.

---

## 1. The repo's actual consequence model

**Pull-based recomputation from a single event blob, aggregated at named hub
functions.** There is no event bus, no invalidation, no dependency graph, and —
critically — **nothing is cached**, so there is nothing to invalidate.

```
event blob (one object, persisted)
   │
   ├── domain authority modules — pure (event) → derived value
   │      venueFor · budgetFor · vendorMoney · guestCountFor · attendanceModel
   │      playbookFoodPlan · lodgingIntel · weather · startTime · taskEngine …
   │
   ├── HUBS — import several authorities, encode cross-domain rules
   │      hostSpending(event)        money ← vendors + guests + lodging + food
   │      raiseAll(event)            attention ← 18 surfaces
   │      eventPlan(event, ctx)      the single ranked next action
   │
   └── surfaces render from hubs; writes patch the blob; next read recomputes
```

**Consequence of this design:** any value that is *derived* propagates
perfectly and for free. The failure modes are therefore **not** "propagation is
broken." They are:

- **(a) stored-not-derived facts** that can go stale,
- **(b) facts nobody produces attention from**,
- **(c) transitions that should create a new open question** — unrepresentable.

---

## 2. Inventory of existing dependency mechanisms

| Mechanism | Where | What it actually is |
|---|---|---|
| Raises | `surfaceRegistry.js` `SURFACES` (18) + `raiseAll` (:1114) | Attention production, normalized to one shape with a route |
| Final ranking | `CommandCenter.jsx:2042 eventPlan` | The single prioritizer |
| Next-action selection | `CommandCenter.jsx:2890 selectEventNextAction`, `:3047 _selectEventNextActionInner` | Hero action |
| Consequence annotation | `CommandCenter.jsx:1899 actionConsequence` | *Why this matters* text — explanation, not propagation |
| Lateness weighting | `CommandCenter.jsx:1952 latenessBoost`, `:2029 RISK_REACH_DAYS`, `:2031 _datedRiskNotYetInReach` | Time-based ranking |
| Route resolution | `routeResolver.js:53 resolveRoute`, `:157 ROUTESHEET_TABS` | Canonical route authority |
| Surface discovery | `sectionDirectory.js` | Which surfaces exist/are reachable |
| Task generation | `taskEngine.js`, `taskLead.js`, `taskRoute.js` | Derived checklist |
| Money aggregation | `hostSpending.js:90` | Cross-domain money hub |
| Decision state | `decisionEvidence.js`, `decisionConfidence.js` | Decision soundness |
| Readiness | `CommandCenter.jsx:1018 getEventReadiness`, `:1106 applicableReadinessAxes` | Scored completeness |

### What `surfaceRegistry` actually is

The brief asked me to classify it rather than assume. From its consumers:

| Consumer | Uses it for |
|---|---|
| `CommandCenter.jsx` (`eventPlan`) | **orchestration input** |
| `heroAsk.js`, `actionReason.js` | **attention production** |
| `sectionDirectory.js` | **surface discovery** |
| `routeResolver.js` | **route authority** |
| `lodgingIntel.js`, `vendorContact.js`, `vendorReplyParse.js`, `decisionEvidence.js` | domain reads |

**Verdict: it is a mixture, and primarily an attention-production registry that
also carries routing and discovery metadata.** It is *not* a consequence-
propagation layer and was never built as one. Treating the vendors-7/travel-5
concentration as "architectural imbalance" is therefore **wrong** — it is a
coverage statement about *where attention is produced*, and vendors/travel are
genuinely the domains with the most time-sensitive, externally-blocked work.

**However**, the absence of raisers for venue, food, money, schedule, tasks,
weather and experience does mean those domains **cannot surface a next action
of their own** through `eventPlan`. That is a real, additive gap.

---

## 3. What already propagates correctly

- Every derived value, across every domain — because nothing is cached.
- Cross-domain money: vendors + guests + lodging + food → `hostSpending`, with
  measured deltas recorded in source.
- Attention → ranking → route, for the 6 domains with raisers.
- Provenance: `typeBasis`, `destinationBasis`, `overnightBasis`,
  `startTimeBasis`, `guestEstimateSource`, `PRICE_LAYERS` rank. The repo is
  unusually disciplined about *how do we know this*.

## 4. What is domain-specific but sufficient

- Vendor status vocabulary (`workstreams.isVendorBooked`) — one list, consumed
  by `vendorMoney`. Previously two lists; the divergence silently dropped money
  (documented, `vendorMoney.js` header). Now sufficient.
- Kitchen gate → food → budget. Specific, measured, correct.
- Task generation from event state.

## 5. What genuinely needs new connective tissue

### (a) Attention coverage — ADDITIVE, LOW RISK

No raiser for: **venue, food, shopping, money/budget, schedule/run-of-show,
tasks, weather/rain, experience/meaning, files, after**. Adding raisers uses a
proven mechanism and changes no existing behaviour.

### (b) The derived open question — THE ONE REAL PRIMITIVE GAP

No `openQuestion` / `needToAsk` / `mustAsk` / `pendingQuestion` anywhere in
`src/lib`. The repo can say *a thing is wrong* (raise) and *a thing must be
done* (task) but not **"a fact you just established means there is now
something we must ask you."**

This is the §6 alcohol-policy case and it generalises:

| Transition | Newly-consequential unknown |
|---|---|
| venue selected | alcohol policy, capacity, load-in window, parking, accessibility |
| destination confirmed | lodging basis, ground transport, arrival spread |
| guest count becomes real | seating plan, food scale, rentals |
| vendor committed | deposit terms, COI, arrival time |

Several of these *are* already covered by domain raisers (COI, arrival times,
vendor payments) — which is evidence the pattern is right and merely uneven.

### (c) Stored-not-derived facts — AUDIT NEEDED, NOT ARCHITECTURE

`guestEstimate` is the known case: **38 non-test modules read it raw** against
**3** that use `guestCountFor`, and `guestEstimateSource` exists in exactly one
file (`guestCountFor.js` itself). The authority and the provenance field were
built and **not adopted**. This is the clearest live violation of the brief's
"no second guest-count authority" rule — and it already exists.

---

## 6. Smallest viable consequence contract — recommended

The brief's candidate vocabulary is **larger than the evidence supports**:

| Proposed verb | Verdict |
|---|---|
| RECALCULATE | **Already implicit.** Derive-on-read. Adding it would be ceremony. |
| BLOCK | **Already exists** — raise severity + `criticalBlockerLeads` ranking. |
| UNLOCK | **Already exists** — gates read current state (`addressSettled`, `hasRealCount`). |
| REVIEW | **Already exists** — raises with `why`. |
| RESOLVE | **Already exists** — the fact changes, the raise stops firing. |
| CREATE | **This is the only one missing**, and only in its *question* form. |

**Recommendation: do not build a generalized consequence layer.** Extend the
existing raise shape with a question-kind item that carries the fact which
created it, and add raisers to the uncovered domains. This:

- reuses `raiseAll` → `eventPlan` → route end-to-end,
- adds no second prioritizer (`eventPlan` still ranks),
- is incrementally testable per domain,
- and cannot strand the existing six domains.

**Not decided here — evidence only, per instruction.**
