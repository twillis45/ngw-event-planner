# 04 — Decision System (current state, 2026-07-30)

Branch `grounded-decision-surface` · commit `097ce84e` · working tree includes 2 uncommitted files
(`hostv2/src/HostShellV2.jsx`, `src/lib/__tests__/heroComposition.test.js`) — both audited as-is.

Every count in this document was recomputed against current code. The derivation is in
`evidence/05_measurements.md` (script: `evidence/05_measure_decisions.mjs`). No figure is carried
over from a prior audit.

Labels used: **[FACT]** verified by execution or direct read · **[INFER]** code-supported inference ·
**[OPEN]** unresolved · **[DEFECT]** known defect.

---

## 0. Where the system actually lives

| Layer | File | Runs on a host surface? |
|---|---|---|
| Authored corpus | `src/lib/playbooks/data/*.js` (39 files) | yes — via the board |
| Board builder / real scorer | `src/lib/playbooks/index.js:2268` `playbookDecisionBoard` | **yes — this is the engine** |
| Scoring primitives | `index.js:2074-2254` | yes |
| Injected overlays | `index.js:652-672` `DESTINATION_DECISIONS`, `src/lib/knowledge/militaryRetirement.js:221` `militaryDecisionsFor` | yes, event-conditional |
| Grounding resolvers | `src/lib/knowledge/*Context.js` (14 files) + `timingProvenance.js` | yes — attached to every row |
| "Decision Intelligence" scorer | `src/lib/experience/decisionIntelligence.js` | **no** — only reachable via `experienceComposer` → `experienceView`, whose sole non-test caller is `src/admin/AdminConsole.jsx:6584` **[FACT]** |
| Playbook merge / registry health | `src/lib/knowledge/playbookMerge.js`, `src/lib/playbooks/playbookRegistry.js` | **no** — admin console only **[FACT]** |
| Orchestration | `src/CommandCenter.jsx:1662` `eventPlan`, tier 7.8 at `:2861-2886`; `src/lib/surfaceRegistry.js:558-597` `decisions` surface | yes |
| Hero copy | `src/lib/planHeroCopy.js`, `src/lib/heroAsk.js`, `src/lib/solemn.js` | yes |
| Route enforcement | `src/lib/routeResolver.js:52` `resolveRoute` | yes |
| Renderers | `hostv2/src/HostShellV2.jsx:1182-1210, 8786-8870`; `src/App.js:42970` (frozen CRA) | yes |

**The single most consequential structural fact [FACT]:** the file named "decisionIntelligence" is not
the decision engine. The decision engine is a 520-line block inside
`src/lib/playbooks/index.js` (`playbookDecisionBoard`, 2268–2787). `decisionIntelligence.js` — the
role/phase/situation scorer with `BLOCK_ROLE_MAP`, `priorityBoost`, `resolveDecisions`,
`rankDecisions`, `unresolvedDecisions` — has **zero host-facing callers**. It is an admin demo.

---

## 1. Field table

Counts are over the 215 decisions in `data/*.js` unless stated.

| Field | Defined where | Authored where | Transformed where | Consumed where | Runtime effect | Tests | Current finding |
|---|---|---|---|---|---|---|---|
| `when` | No schema type; the string grammar is defined by its parsers — `index.js:114 buyOffsetDays` (`/^T(-?\d+)d?$/`), `timingProvenance.js:199 parseLeadDays`, `lib/taskLead.js` | 215/215 (100%) in `data/*.js`; also every injected overlay decision | `index.js:2449-2451` → `offset` → `daysOut = daysToEvent + offset` → `dueDate` | `index.js:2573` (overdue test), `:2634` (`because` copy), `:2656` (time-critical), `:2682` (defer), `:2717` (tiebreak sort); `surfaceRegistry.js:594-596` (`dueInDays`/`leadDays` → snooze cap); `decisionIntelligence.js:73` (admin only) | **The dominant runtime signal.** Status band (overdue/ready/waiting), horizon partition, aging, snooze eligibility all derive from it | `decisionBoard.test.js`, `decisionBoardWave2b.test.js`, `overTimePlaybookLeads.test.js` | **[DEFECT]** No cross-playbook consistency: `venue` is authored T-18d…T-365d across 9 playbooks (347-day spread); `ceremony` 265d; `music` 230d. Same id, same job, no shared source. Three regexes parse the same grammar in three files |
| `weight` | Value set implied by two lookup tables: `index.js:2088 WEIGHT_SCORE {high,med,low}`, `decisionIntelligence.js:54` | **215/215 (100%)** in `data/*.js` — high:89 med:87 low:39. Injected overlays: sparse (4 in `militaryRetirement.js`, 1 in `DESTINATION_DECISIONS`) | `index.js:2243` passthrough; `:2503-2508` derives a substitute when absent | `index.js:2154` (importance), `:2178` (urgent-overdue tier), `:2679` (defer anchor), `:2766` (hand-held ease rank), `:2217/:2220` (rank reason), `HostShellV2.jsx:45-48` | Only field that can promote a row to `TIER_URGENT_OVERDUE` (300) | `decisionBoard.test.js`, `decisionBoardWave2b.test.js`, `playbookSchema.test.js` | **[FACT]** Fully hand-authored, 100% coverage. **The in-code doctrine is stale**: `index.js:2093` still says *"Only 2 of 39 playbooks author `weight`"* and `playbookSchema.js:99` says *"BLANK on every decision today"*. Both false as of this tree. Consequence: `derivedImportanceOf` (`index.js:2133`) is **dead for every authored decision** (0 fall through) and now fires only on injected overlay rows |
| `reversibility` | `index.js:2090 REV_SCORE {locked:2, costly:1, reversible:0}`; `decisionIntelligence.js:56` | **215/215 (100%)** — reversible:110 costly:96 locked:9 | `index.js:2244` passthrough | `index.js:2159` (importance), `:2172` (cross-eligible float), `:2219` (rank reason), `:2615` (**assurance copy branch**), `:2766` (ease rank), `HostShellV2.jsx:46` | Floats a READY row into the overdue crossing zone when `locked`; selects the harsher assurance sentence when `costly` | `decisionBoard.test.js`, `decisionBoardWave2b.test.js`, `xip1.test.js` | **[FACT]** Static per authored decision. **[DEFECT]** Never reads commitment state — a vendor with a signed contract and a paid deposit does not make the corresponding decision `locked`. `index.js:2677` explicitly declines to anchor on it |
| `emotionalWeight` | `index.js:2089 EMO_SCORE {high:2, med:1, low:0}` | **215/215 (100%)** — low:135 med:46 high:34 | `index.js:2245` passthrough | `index.js:2158` (importance only), `HostShellV2.jsx:50` (fallback reason string, unreachable — see finding) | **Ranking only.** ≤2 points inside a tier | `decisionBoard.test.js`, `xip1.test.js`, `heroComposition.test.js` (modified in working tree) | **[DEFECT]** Does not affect tone, suppression, escalation or copy anywhere. Tone gentling is done by `solemn.js:29` — a hardcoded **event-type-name regex**, not this field. `solemn.js:20-22` states the problem in its own header |
| `dependsOn` | No type; array of decision-id strings | 42/215 (20%); 53 edges | `index.js:2570-2571` (`unmet`), `:2407-2426` (`_directDependentsOf`, transitive closure) | `index.js:2571` → `status:'waiting'`, `:2628` (`Waiting on X.` copy), `:2518 _dependedOnCount` → `:2700-2708` gate-holder bump, `:2194` tiebreak, `:2139` derived `gates` signal | Blocks a row (`TIER_WAITING` = 0) and, inversely, promotes its prerequisite by +1.5…+2.5 | `gateHolder.test.js`, `decisionBoardWave2b.test.js` | **[FACT]** 0 dangling targets, 0 cycles. **[DEFECT]** 2 timing-order violations (child window opens *before* its prerequisite) — `Quinceañera dress` T-240d depends on `theme_colors` T-210d; `Sweet 16 food_menu` T-30d depends on `food_style` T-21d. **[DEFECT]** No validator: nothing prevents a dangling target from being added |
| `blocks` | No type; free-text array | 205/215 non-empty, 2 empty, 8 absent. 380 values, 109 distinct tokens | `index.js:2461` joined+lowercased into `_blocks`; `:2479` into `_hay` | `index.js:2046` (`isMenuDecision`), `:2488` (vendor deep-link regex), `:2491` (food regex), `:2138` (derived `gates`), `decisionIntelligence.js:83-96` (admin only), `playbookContract.test.js:11` (`isCostAffecting`) | Selects the deep-link route and classifies a decision as a menu choice — **nothing else** | `playbookContract.test.js`, `reader.test.js`, `foodAdd.test.js` | **[DEFECT]** **52% of all `blocks` values (196/380, 86 distinct tokens) are inert** — no consumer matches them (`rentals`×24, `decor`×8, `transport`×6, `seating`×5, `license`×4…). Only 33% of values even name a decision id; only 38 name a sibling in the same playbook, and 20 of those 38 lack the reciprocal `dependsOn`. `blocks` is a category tag masquerading as a graph edge |
| `priorityBasis` | Shape `{rationale, tier, sources?}` — `index.js:2248-2252`; gap rules `playbookSchema.js:120-128` | **215/215 (100%)**, all with a non-empty `rationale` | `index.js:2252` passthrough | `index.js:2214` — **preferred over every derived reason**; `HostShellV2.jsx:41-42`; `planHeroCopy.js:47` | Supplies the host-facing "why is this here?" line on the board row and the Plan hero | `decisionBoardWave2b.test.js`, `playbookSchema.test.js` | **[DEFECT]** Because coverage is 100%, `decisionRankReason` **always** returns the authored rationale (except the `horizon:'later'` override at `:2212`). The rationale is a static property of the decision, not a function of the score — so the explanation is causally decoupled from the ranking. See Q21 |
| `timingProvenance` | `src/lib/knowledge/timingProvenance.js:23 TIMING_SOURCES`, `:84 TIMING_CATEGORIES`, `:246 isGroundedTiming` | **0/215 hand-authored** | `index.js:2513` `effectiveTimingProvenance(d)` — authored-if-grounded, else category resolver (text pattern + anti-pattern + lead-window consistency) | `index.js:2513-2514` attaches `timingProvenance` + `timingGrounded` to every row; `playbookSchema.js` gap detector | **Zero.** Attached to the row; **no consumer reads `row.timingProvenance` or `row.timingGrounded` in any renderer** (grep of `src/`+`hostv2/src/` finds readers only in `index.js`, `groundingSources.js`, `playbookSchema.js`, `timingProvenance.js` itself) | `timingProvenance.test.js`, `playbookSchema.test.js` | **[FACT]** 24/215 (11%) resolve to a grounded provenance; 191 (89%) are honestly ungrounded. 3 declared categories (`save_the_date`, `catering_vendor`, `rentals`) match **zero** decisions. **[DEFECT]** Producer with no consumer — the grounding is computed on every board build and rendered nowhere |
| `deliversHeartMoment` | `index.js:2247` (coerced to strict boolean) | 19/215 (9%) | `index.js:2247` | `index.js:2160` (+2 importance), `:2174` (cross-float), `:2216` (rank reason, unreachable — `priorityBasis` wins), `:2680` (defer anchor), `:2697` (safety floor), `:2724` (`heartAtRisk`), `HostShellV2.jsx:8828` (visual accent) | Floats a READY row into the crossing zone; exempts it from deferral; clamps the gate-holder bump below it | `decisionBoardWave2b.test.js`, `hostAdaptation.test.js` | **[FACT]** Genuinely load-bearing — the one emotional field with real mechanical effect |
| `difmCapable` | `'can-derive' \| 'needs-host'` — `doItForMe.js:1108 decisionApproach` | **215/215 (100%)** — can-derive:109, needs-host:106. Injected overlays: **0** | `index.js:2246` passthrough | `HostShellV2.jsx:8826` → `decisionApproach(r, opts)` → propose-vs-ask note + the "Sounds good" accept button (`:8852`); `App.js` HostDecisionsPanel | Decides whether the row pre-proposes a pick (one-tap settle) or asks | `decisionBoard.test.js`, `doItForMe.test.js`, `playbookSchema.test.js` | **[FACT]** Real behavioural effect. **[DEFECT]** Injected overlay decisions carry none, so `HostShellV2.jsx:1598` has a special-case fallback to the authored `default` — two propose paths |
| `assurance` | **Not authored** — computed at `index.js:2614-2618` | n/a (derived) | Derived from `d.default` + `d.reversibility` inside the overdue branch | `HostShellV2.jsx:5678` (hero join), `:6140` (card), `:7332`, `:8710` (overdue-count filter), `:8819-8822` (row chip colour) | **Changes the row's severity colour**: `assurance` present ⇒ warn-tinted "past its window"; absent ⇒ danger-tinted "overdue" | `heroComposition.test.js` (working-tree modified) | **[FACT]** The newest field and the only one that softens copy from *state* rather than from authorship. Null exactly when the decision has no `default` (11/215) |
| `ask` | **Not authored on decisions.** Read at `heroAsk.js:29` from a surface raise | Only `HostShellV2.jsx:1170` (blocker adapter) authors it today | — | `heroAsk.js:29` (first branch, wins over all classification) | Lets a surface name its own hero ask instead of being regex-classified | `heroAskDedup.test.js` (referenced in `heroAsk.js:7`) | **[DEFECT, documented in-source]** `heroAsk.js:57-77` records an unfixed defect: a decision authored as a question >26 chars renders the placeholder "Your next step."; ≤26 chars is promoted. The comment states that adding `ask: d.label` to the board's `open.push` **did not reach the hero** — the queue entry is built by an unidentified other path. **[OPEN]** which path |
| `rankReason` (derived) | `index.js:2207` | derived | `index.js:2686` (set after horizon) | `HostShellV2.jsx:40`, `planHeroCopy.js:47` | The row's "why" line | `decisionBoardWave2b.test.js` | See `priorityBasis` finding |
| `horizon` / `gateHolder` / `timeCritical` / `priorityScore` (derived) | `index.js:2657, 2684, 2701, 2652` | derived | — | `index.js:2714-2719` partition + sort; `HostShellV2.jsx:1183` | Partition into `open` vs `deferred`; final order | `decisionBoardWave2b.test.js`, `gateHolder.test.js` | **[FACT]** Working as documented |
| `importanceBasis` / `_derivedWeight` / `_derivedReason` | `index.js:2500-2508` | derived | — | `index.js:2156, 2224-2229, 2681, 2697` | Substitute importance when `weight` is absent | `decisionBoardWave2b.test.js` | **[FACT]** Now unreachable for authored decisions (§ `weight` row) |
| `whenChoice` / `standsDownWhen` / `whenKids` | `index.js:2441-2448` | 1 / 9 / **0** decisions in `data/*.js`; `whenKids` only on `DESTINATION_DECISIONS` `dest_childcare` (`index.js:656`) | — | `index.js:2441-2448` (`continue` = suppress) | Suppresses a decision from the board entirely | `foodApproach.test.js`, `destinationModifier.test.js` | **[FACT]** The only authored suppression vocabulary. `standsDownWhen` reads **answered picks only**, never defaults (`:2443`) — deliberate |
| `noCostEffect` | `playbookContract.test.js:31` | 6 decisions | — | **contract test only** | None at runtime | `playbookContract.test.js` | **[FACT]** Zero runtime readers (verified by full-tree grep excluding tests). It exists to silence a lint |
| `decisionPins` (event field, not a decision field) | `HostShellV2.jsx:1203-1210`, `:1686` | host-set at runtime | `callsOrdered` re-sort | `HostShellV2.jsx:1203` | **Overrides the entire engine order** — a pinned row leads regardless of tier, including above urgent-overdue | none found | **[DEFECT]** See Q19 |

---

## 2. The 25 questions

### 1 · Are the 39 event playbooks still independent?

**Verdict: yes, fully independent — architecturally and materially. [FACT]**

`index.js:87` lists 39 imported objects; `:88-89` builds a flat `REGISTRY` keyed on the normalized
`type`. There is no base playbook, no mixin, no `extends`. Every one of the 215 decisions is a
literal inside one file.

Materially: 29 decision ids recur across playbooks (112 instances), and **28 of those 29 disagree**
on at least one of `{when, weight, reversibility, emotionalWeight, difmCapable, label}`. Only
`games` (2 playbooks) is identical. `when` disagrees on 90% of recurring ids; `label` on 90%;
`weight` on 45%.

### 2 · Is there a canonical capability spine?

**Verdict: no. [FACT]**

Nothing in the runtime path defines a decision independently of a playbook. The nearest candidates
are all admin-only or non-decision:
- `playbookRegistry.js` — observability over the corpus, admin console only.
- `playbookMerge.js` — evidence-merge tooling, imported only by `src/admin/*`.
- `playbookSchema.js` — a *gap detector*, not a definition source; it names fields but authors none.

The two **cross-playbook shared decision sets** that do exist are overlays, not a spine:
`DESTINATION_DECISIONS` (`index.js:652-662`, 6 decisions) and `militaryDecisionsFor`
(`militaryRetirement.js:221`, per-branch sets). Both are **additive by event modifier**, gated on
`event.isDestination` / branch detection — they never replace or normalize a playbook's own decisions,
except one collision suppression at `index.js:671` (`dest_lodging` vs `lodging`/`room_block`).

What *is* centralized is the **context/grounding layer**: 14 `*Context.js` resolvers plus
`timingProvenance.js`, all applied uniformly at `index.js:2513-2563`. That is a spine for *annotation*,
not for *capability*.

### 3 · Are capabilities inherited, composed, copied, or overridden?

**Verdict: copied, with two additive composition points. [FACT]**

- **Copied** — the dominant mode. 132 unique ids across 215 decisions; the 83 duplicate instances are
  independent hand-authored literals that drift (Q1).
- **Composed** — `index.js:2373-2377` spreads three sources into one array: playbook decisions +
  destination overlay + military overlay. This is array concatenation, not merge.
- **Overridden** — only in the renderer, not the model: `HostShellV2.jsx:1189-1191` deletes the
  `venue` decision from the board when a venue is on file. **[DEFECT]** That override is invisible to
  every other consumer (`eventPlan`, `surfaceRegistry`, `planHeroCopy`) — see Q19/Q24.
- **Inherited** — nowhere.

### 4 · Are IDs normalized?

**Verdict: no, at the decision level. Yes, at the event-type level. [FACT]**

Decision ids: three conventions coexist across 132 unique ids — flat lowercase (77), snake_case (47),
kebab-case (8). Kebab and snake collide semantically: `food_model` and `food-model` are two ids for
`How is the food handled?` / `How is food handled?`. 10 stem families split across distinct ids
(`format` ↔ `materials_format` ↔ `game_format` ↔ `food_format` ↔ `meal_format`;
`style` ↔ `food_style` ↔ `celebration_style` ↔ `ceremony_style` ↔ `catering_style`).

Event types: normalized twice — `index.js:86 norm()` (trim + lowercase) then
`eventTaxonomy.mjs:227 resolveCanonicalType` (exact → alias → case-insensitive → keyword).

### 5 · Are aliases explicit and tested?

**Verdict: split. [FACT]**

- **Event-type aliases: explicit and tested.** `eventTaxonomy.mjs:112 TYPE_ALIASES` is an explicit
  map with a documented resolution order (`:223-235`). `getPlaybook` (`index.js:96`) consults it.
- **Decision-id aliases: do not exist.** There is no alias table, no rename map, no deprecation path
  for a decision id. `food_model`/`food-model` are simply two ids. A renamed id silently orphans any
  persisted `event.foodChoices[oldId]`.

### 6 · Can unknown IDs enter the system?

**Verdict: yes, on three paths. [FACT]**

1. **`blocks` values** — free text, never validated. 86 of 109 distinct tokens resolve to nothing (§Q8).
2. **`whenChoice.id` / `standsDownWhen.id`** — referenced ids are never checked to exist.
   `choiceShown` (`index.js:521`) returns `true` on a null pick, so an unknown reference silently
   fails **open** (the decision shows) rather than closed.
3. **Persisted `event.foodChoices`** — a free-form map written by `HostShellV2.jsx:1471`,
   `App.js:10588/22681/43749/…`. Keys are decision ids at write time, but nothing prunes a key whose
   decision was renamed or removed. `choicePickFor` (`index.js:505`) returns the stale pick for any
   key present, before consulting the playbook at all.

`playbookContract.test.js` validates uniqueness of decision ids *within* a playbook, `costFactors`
key⊆options, and `affects` → real purchase ids. It validates **none** of `dependsOn`, `blocks`,
`whenChoice`, `standsDownWhen`.

### 7 · Are `dependsOn` targets validated?

**Verdict: not by any validator, but currently clean by accident. [FACT]**

53 edges, **0 dangling** (every target resolves to a decision in the same playbook). The board's
`depMet` (`index.js:2387-2392`) additionally accepts three ids that are *not* decisions — `headcount`,
`count`, `dietary` — resolving them from event state; **no playbook currently uses that escape hatch
in `dependsOn`** (0 edges hit it).

**[DEFECT]** There is no test and no runtime assertion. A dangling target would not throw: `depMet`
returns `false`, `unmet` is non-empty, and the row is pinned to `status:'waiting'`
(`index.js:2626-2629`) **forever** — a permanently un-settleable row with the copy "Waiting on
&lt;the id&gt;." (`decisionDepNoun` at `:1998` falls back to the raw id).

### 8 · Are `blocks` targets typed and validated?

**Verdict: neither typed nor validated. [FACT]**

380 values, 109 distinct tokens, zero schema. The consumer vocabulary (cited in
`evidence/05_measurements.md` §8) is:

| Consumer | Location | Accepts |
|---|---|---|
| `BLOCK_ROLE_MAP` | `decisionIntelligence.js:10-19` | 8 tokens — **admin-only path** |
| `ROLES[].decisionBlocks` | `experienceContext.js:14,22,30,38,46,54,62` | same 8 — **admin-only path** |
| situation boosts | `decisionIntelligence.js:91-96` | 5 tokens — **admin-only path** |
| `isMenuDecision` | `index.js:2043-2048` | regex over food/drink terms — **live** |
| board vendor deep-link | `index.js:2488` | `/vendor\|team\|hire\|staff/` — **live** |

Result: **23 distinct tokens / 184 instances resolvable; 86 distinct tokens / 196 instances (52%)
inert.** Restricting to the two *live* consumers, the inert share is higher still.

Only 33% of `blocks` values are also a decision id anywhere in the corpus; only 38/380 name a sibling
in the same playbook; and of those 38, **20 lack the reciprocal `dependsOn`**. `blocks` and `dependsOn`
are not maintained as inverse relations.

### 9 · Does `blocks` influence runtime behaviour?

**Verdict: yes, but only as route/classification input — never as a dependency. [FACT]**

Live effects, both in `playbookDecisionBoard`:
- `index.js:2486` — if the decision is in `playbookFoodPlan().choices` (gated by `isMenuDecision`,
  which reads `blocks`), it gets a `foodFocus` route.
- `index.js:2488` — if `blocks` matches `/vendor|team|hire|staff/`, it routes to the first
  un-booked vendor.
- `index.js:2138` — a non-empty `blocks` contributes the derived `gates` signal (+1 importance) —
  **but only for decisions without an authored `weight`, i.e. none of the 215** (Q13/Q14).

`blocks` **never** puts a downstream decision into `waiting`. Only `dependsOn` does that
(`index.js:2570-2571`). The `index.js:2675-2677` comment states this explicitly: the `gates` signal
*"fires on any `blocks:['food']` CATEGORY tag, not a real downstream-decision dependency."*

### 10 · Are dependency cycles tested?

**Verdict: no test exists; the graph is currently acyclic. [FACT]**

Independently verified by DFS over all 53 authored intra-playbook edges: **0 cycles**.

Runtime defence exists but is silent: `_transitiveDependentCount` (`index.js:2416-2426`) carries a
`seen`/self guard with the comment *"authored graph is a DAG, but be safe."* A cycle would therefore
not hang, but both members would sit in `waiting` permanently with no diagnostic. No test in
`src/lib/playbooks/__tests__/` (27 files) asserts acyclicity.

### 11 · Are timing-order violations tested?

**Verdict: no, and 2 exist. [DEFECT]**

| Playbook | Decision | its `when` | depends on | prerequisite `when` | child opens earlier by |
|---|---|---|---|---|---|
| Quinceañera | `dress` | T-240d | `theme_colors` | T-210d | 30 days |
| Sweet 16 | `food_menu` | T-30d | `food_style` | T-21d | 9 days |

Runtime consequence **[INFER]**: at T-235d the Quinceañera `dress` row is inside its window and would
be `ready`, but `theme_colors` is unmet, so the row renders `waiting` — "Waiting on the colours." —
for 30 days *after* its own deadline passed. When `theme_colors` finally settles, `dress` flips
straight to `overdue`. The host is blocked from a decision the corpus says is already late.

A further 11 edges have child and prerequisite on the **same** `when`, so the sequencing exists only
in the graph, never on the calendar.

### 12 · Is timing provenance required?

**Verdict: no. It is optional, computed, and unrendered. [FACT]**

- 0/215 decisions author `timingProvenance`.
- `effectiveTimingProvenance` (`timingProvenance.js:254`) grounds **24/215 (11%)** via the category
  resolver. The resolver is deliberately conservative (`:76-83`: text pattern + anti-pattern + a
  lead-window consistency gate), which is honest design — but 89% of the deadlines that drive the
  entire sequencing engine remain ungrounded.
- 3 declared categories (`save_the_date`, `catering_vendor`, `rentals`) fire on zero decisions.
- **[DEFECT]** `row.timingProvenance` / `row.timingGrounded` are attached to every board row at
  `index.js:2513-2514` and **read by no renderer**. The `playbookSchema.js` gap detector
  (`TIMING_PROVENANCE`) reports it to the admin console only.

### 13 · Is raw `weight` still hand-authored?

**Verdict: yes — and now at 100% coverage for authored playbooks. [FACT]**

215/215 in `data/*.js`. This inverts the situation the code still describes: `index.js:2093` and
`playbookSchema.js:99` both assert weight is essentially unauthored. **The in-code doctrine is stale.**

Injected overlays are the exception: `DESTINATION_DECISIONS` authors `weight` on 1 of 6;
`militaryRetirement.js` on 4 decisions. Those rows are the only remaining consumers of the derived path.

### 14 · Is `weight` derived from consequence or runtime state?

**Verdict: no. It is a literal. [FACT]**

`derivedImportanceOf` (`index.js:2133-2147`) *is* a genuine consequence derivation — dietary/safety
text → 3.5, gates downstream → +1, carries money → +0.75, aesthetic leaf → 0.75 — and it reads real
structure (`blocks`, sibling `dependsOn`, `costFactors`, id+label text). But `index.js:2503` gates it
on `d.weight == null`, and no authored decision satisfies that. **It is dead code for the corpus.**

Runtime state never touches `weight`. The only runtime-state modulations of rank are:
`decisionAging` (`:2167`, ≤6 pts), `TIME_CRITICAL_BUMP` (`:2309`, +1.5 on a compressed runway),
`GATE_HOLDER_BUMP` (`:2706`, +1.5…+2.5), and `decisionStructuralTiebreak` (`:2191`, ≤0.2).

### 15 · Is `reversibility` static or commitment-state-driven?

**Verdict: entirely static. [FACT]**

Authored once per decision; `index.js:2244` passes it through unchanged. Nothing reads
`vendor.depositPaid`, `vendor.contractSigned`, `balancePaid`, or any booking state to promote a
decision to `locked`. `index.js:2677` explicitly declines to use it as a defer anchor
(*"hard-to-undo ≠ decide-early"*), which is a considered call — but it means an actually-committed
decision and an uncommitted one score identically.

Distribution: reversible 110, costly 96, **locked only 9** — so the `TIER_CROSS_ZONE` float
(`:2172`) is driven overwhelmingly by `deliversHeartMoment`, not by irreversibility.

### 16 · Does emotional context affect only ranking, or also tone/suppression/escalation/copy?

**Verdict: `emotionalWeight` affects ranking only. Tone/suppression are driven by a separate,
hardcoded event-type regex. [FACT/DEFECT]**

- **Ranking**: `index.js:2158`, ≤2 points inside a tier. That is its whole effect.
- **Copy**: `HostShellV2.jsx:50` has an `emotionalWeight === 'high'` fallback string — but it sits
  *after* `row.rankReason` and `row.priorityBasis.rationale`, both of which are 100% populated, so it
  is **unreachable for every authored decision**.
- **Tone / suppression**: done by `isSolemnEvent` (`solemn.js:31`), which tests
  `/repast|memorial|funeral|celebration of life|homegoing|in memoriam/i` against `event.type` and
  `event.name`. It gates `planHeroCopy.js:68` (a whole alternate hero) and, in the working-tree
  diff, `HostShellV2.jsx:5650` (suppresses the overdue slip).

`solemn.js:20-22` names the gap in its own header: *"There is no `when`, `weight`, or
`emotionalWeight` that reaches a global copy string."* **[FACT]** That remains true in this tree.

### 17 · Can a context prohibit generic overdue language?

**Verdict: only via the hardcoded solemn regex, applied site-by-site. Two sites today. [DEFECT]**

- `planHeroCopy.js:68-82` — solemn events get a forward-anchored hero ("Still to sort — 4 days to
  go") instead of "past its easy window".
- `HostShellV2.jsx:5650` (**uncommitted**) — suppresses the overdue *slip count* on a solemn event.

Everywhere else the generic language survives on a solemn event:
- `index.js:2593-2595` — the row's `because` is still *"Its easy window closed about 5 months ago."* /
  *"Was due 54 days ago."*
- `HostShellV2.jsx:8819-8821` — a solemn overdue row with no `default` still gets a `--danger` "overdue" chip.
- `surfaceRegistry.js:576` — the raise title is still `Resolve "…"` with `bundleTitle`
  *"Resolve N decisions — they're past their easy window."*
- `CommandCenter.jsx:2874-2876` — tier 7.8's `consequence` is still *"N decisions are past their
  easy window."*

No playbook field can request this. `repast.js` cannot suppress it. Each site is patched by hand;
the working-tree diff is the second such patch in one day.

### 18 · Where does responsibility ownership live?

**Verdict: split across four unconnected vocabularies. [FACT]**

| Vocabulary | Location | Values | Reaches the host? |
|---|---|---|---|
| `difmCapable` (app-vs-host) | decision field, 215/215 | `can-derive` / `needs-host` | yes — `doItForMe.js:1108` → propose/ask note + "Sounds good" accept |
| `owner` (milestone) | `milestones[].owner` | `couple`, `planner`, `host`, … | milestone surfaces only; **not on decisions** |
| helper responsibilities | `src/lib/helperResponsibility.js` → `HostShellV2.jsx:1233` | per-person assignment | separate surface |
| vendor ownership | `workstreams.js` / vendor records | — | separate surface |

There is **no `owner` field on any decision**. A decision is implicitly the host's; `difmCapable`
only says whether the app will pre-fill it. **[DEFECT]** Injected overlay decisions author no
`difmCapable`, so `HostShellV2.jsx:1598-1603` special-cases them into the authored `default` — a
second propose path with different provenance.

### 19 · Can the renderer override or damage authored playbook meaning?

**Verdict: yes, in two ways, one of which defeats the entire scoring lattice. [DEFECT]**

1. **Suppression the model never sees.** `HostShellV2.jsx:1189-1192` filters `venue`-class decisions
   out of `board.open` when `venueFor(event).name` is set. The rationale (a set venue is the source of
   truth) is sound; the placement is not. `eventPlan` (`CommandCenter.jsx:2861`), `surfaceRegistry`
   (`:569`) and `planHeroCopy` (`:31`) each call `playbookDecisionBoard` **directly and unfiltered**,
   so the hero and the "Calls to make" sheet can disagree about whether the venue decision exists.

2. **`decisionPins` outranks the engine unconditionally.** `HostShellV2.jsx:1203-1210` re-sorts
   `board.open` so pinned ids lead, *before* any tier is considered. A pinned low-weight aesthetic
   READY row therefore leads an urgent-overdue safety row — defeating the 100-point tier gap that
   `index.js:2067-2070` documents as uncrossable. The pin is a legitimate host affordance; it is
   applied outside the scorer with no floor.

Additionally, `rankReasonForV2` (`HostShellV2.jsx:39-52`) is a **second** rank-reason ladder beside
`decisionRankReason` (`index.js:2207`). It is currently harmless (its first branch delegates), but
it is a duplicate derivation of the kind this file's own comment at `:54-61` says was already deleted
once for `hostDiffBand`.

### 20 · Does the scorer meaningfully respond to authored metadata?

**Verdict: yes — this is the strongest part of the system. [FACT]**

`decisionPriorityScore` (`index.js:2198`) = tier + importance + aging + tiebreak, then adjusted by
gate-holder and time-critical bumps, then optionally re-sorted by host adaptation. Each term reads
real authored data:

| Term | Range | Reads |
|---|---|---|
| tier | 0 / 100 / 200 / 300 | `status` × `weight` × `deliversHeartMoment` × `reversibility` |
| importance | 1–9 | `weight` + `emotionalWeight` + `reversibility` + heart |
| aging | 0–6 | days overdue |
| structural tiebreak | 0–0.2 | `affects`, transitive `_dependedOnCount`, `costFactors` |
| gate-holder | +1.5…+2.5, clamped below the safety floor | `dependsOn` transitive closure |
| time-critical | +1.5 | `workflowCompression` level × `daysOut` |

The bounds are deliberate and documented (`:2059-2073`, `:2078-2086`, `:2688-2694`), and the safety
clamp at `:2698-2707` is a real invariant.

**Caveat [INFER]:** with `weight`/`reversibility`/`emotionalWeight` at 100% coverage and only 9
`locked` values, the lattice compresses. Importance is effectively `weight + emotionalWeight` for most
rows — an integer in 1..5 — which is why the ≤0.2 structural tiebreak at `:2191` was needed at all.

### 21 · Are ranking explanations causally accurate?

**Verdict: no. The explanation is authored prose, not a read-out of the score. [DEFECT]**

`decisionRankReason` (`index.js:2207-2235`) checks `horizon === 'later'` first, then
**returns `priorityBasis.rationale` if present**. Since `priorityBasis.rationale` is populated on
**215/215** decisions, every derived branch below it (`:2215-2233`) — the overdue count, the
`locked` line, the heart line, all the `importanceBasis === 'derived'` lines — is **unreachable for
authored decisions**.

Consequences:
- The rationale is a fixed property of the decision. Two rows with the same rationale can sit at
  rank 1 and rank 8 on the same board with identical "why" text.
- Nothing in the reason reflects the terms that actually decided the position: aging, the gate-holder
  bump, `timeCritical`, the structural tiebreak, or `decisionPins`.
- **Most sharply:** when `hostAdaptation.proposeDerivable` is true, `index.js:2759-2769` re-sorts the
  active board by `easeRank` — *lowest*-consequence first. The lead row's rationale then still reads
  e.g. *"The first gate… every other choice back-solves from this number"* while the row leads
  precisely because it is **low**-stakes. The stated cause is the inverse of the operative one.

The rationale text is high quality and useful. It is a *justification of the decision*, mislabelled
as an *explanation of the rank* — `index.js:2203-2206` calls it *"the host-facing 'why is this
here?' line."*

### 22 · Are recommendation routes and deep links valid?

**Verdict: all resolve (no dead CTAs), but 3 of 12 land at a surface top rather than a row, and 35%
of decisions can never carry a route at all. [FACT]**

Executed against the real `resolveRoute` (full table in `evidence/05_measurements.md` §14):

| Emitter | Result | Row-level? |
|---|---|---|
| board food-choice (`index.js:2486`) | `{kind:'food', focus:'menu'}` | yes |
| board dietary (`:2487`) | `{kind:'food', focus:'diet'}` | yes |
| board vendor, vendor exists (`:2476`) | `{kind:'vendors', focus:'v1'}` | yes |
| **board vendor, no vendor yet (`:2477`)** | `{kind:'vendors', focus:null}` | **no — `focusField:'vendor-add'` is silently dropped** |
| **board free-form food (`:2491`)** | `{kind:'food', focus:null}` | **no** |
| foundation date / venue / headcount | anchored / focused | yes |
| surfaceRegistry `decisions` raise (`:578`) | `{kind:'decisions', focus:'venue'}` | yes |
| **eventPlan tier 7.8 (`CommandCenter.jsx:2877`)** | `{kind:'decisions', focus:null}` | **no — board top** |
| **planHeroCopy (`:78,90,105`)** | `{kind:'decisions', focus:null}` | **no — board top** |

**[DEFECT]** `resolveRoute` has no branch for `focusField:'vendor-add'` (`routeResolver.js:62-68`
matches `tab:'Vendors'` first and returns `focus:null`), so the "add your first vendor" promise
lands at the sheet top.

**[DEFECT]** The same overdue decision routes **row-level** when the `surfaceRegistry` raiser wins
and **board-top** when the tier-7.8 ladder wins — two different landings for one record, decided by
which producer survives dedup.

**[FACT]** 76/215 decisions (35%) match none of the four route branches at `index.js:2486-2492` and
can never receive a route (`honor`, `slideshow`, `registry`, `games`, `theme`, `cake`, `seating`,
`dresscode`, `license_jurisdiction`, `sponsor_model`, `tracks`, `minutes_owner`…). By design these
render as chevron-less prompts (`:2454-2466`) and settle inline when they carry options — but 9
decisions carry **no options either**, so they have neither a route nor an inline settle control.

### 23 · Can completed work remain active incorrectly?

**Verdict: yes — the inverse case is the live one, and it is systemic. [DEFECT]**

Completion is a single predicate: `isLocked` (`index.js:2382`) = `!!picks[d.id]` OR (dietary AND
`di.resolved`). `picks` is `event.foodChoices`. There is no separate "completed", "dismissed",
"n/a", or "skipped" state for a decision.

Three failure shapes:

1. **The engine acts on a decision the board still shows as unmade.** `choicePickFor`
   (`index.js:505-509`) returns `picks[id] || dec.default`. So the food plan, quantities, costs and
   visibility gates have been running on the authored default from the moment the event was created —
   while the board shows the row `open`, then `overdue`. This is *acknowledged in-source* at
   `:2604-2609` and mitigated by `assurance` at `:2614`, which softens the copy. **The state itself is
   unchanged**: the row stays active, is counted in "N past their easy window", and raises through
   `surfaceRegistry`. The mitigation is copy-level only.

2. **Decisions with no options can never be completed in hostv2.**
   `playbookDecisionND` (`HostShellV2.jsx:1594`) returns `null` without options, and the row renderer
   (`:8864`) only offers chips when `opts.options.length`. 9 decisions have no options. If such a
   decision also fails all four route branches, there is **no affordance anywhere** to move it to
   `locked`.

3. **Timing-order violations pin rows in `waiting` past their own deadline** (Q11).

Conversely, real completion elsewhere does not clear a decision: booking every vendor does not
settle `vendor_team`; a signed venue contract does not settle `venue` in the model (only the hostv2
renderer hides it, Q19).

### 24 · Can recommendations conflict across surfaces?

**Verdict: yes. Three producers read the same board and reach different conclusions. [DEFECT]**

The producers, all calling `playbookDecisionBoard` independently:

| Producer | Location | Output |
|---|---|---|
| ladder tier 7.8 | `CommandCenter.jsx:2861-2886` | ONE overdue decision, route → board top |
| `surfaceRegistry` `decisions` surface | `surfaceRegistry.js:558-597` | ALL overdue decisions, route → row |
| lifecycle projection | `CommandCenter.jsx:1578-1584` | each overdue → a `Blocked` lifecycle item |
| Plan hero | `planHeroCopy.js:31` | `open[0]` of the overdue-then-ready band |
| hostv2 board | `HostShellV2.jsx:1183` | the board **minus venue**, **plus pin reorder** |

Real reconciliation machinery exists and is well-built: a canonical cross-producer id
`decision:<recordId>` (`CommandCenter.jsx:1625-1634`), `titleKey` normalization
(`CommandCenter.jsx:1806`), and verbatim-title matching enforced by comment discipline
(`surfaceRegistry.js:552`). `lifecycleVerdictAgreement.test.js` pins the hero↔lifecycle agreement.

What it does **not** reconcile:
- **Route divergence** — same record, board-top vs row-level (Q22).
- **The hostv2 venue filter** — hostv2 removes `venue` from its board; `eventPlan` and
  `planHeroCopy`, both consumed by the same shell (`HostShellV2.jsx:1155`, `:4831`), do not. A hero
  can name a decision the board below it does not list. **[INFER, high confidence — the filter is
  local to one `useMemo` and the other calls are separate, unfiltered invocations.]**
- **Pin reorder** — the shell's row order and the engine's `open[0]` (which the hero uses) can name
  different lead decisions.

### 25 · What architecture is actually present today?

**A flat, fully-copied decision corpus with a sophisticated centralized *scoring and annotation*
layer bolted on top, and a rendering layer that partially re-decides. [FACT]**

- **Model**: 39 independent files, 215 hand-authored decision literals, 132 unique ids, no spine, no
  inheritance, no validation beyond intra-playbook id uniqueness and `costFactors` well-formedness.
- **Graph**: a real but thin DAG — 53 `dependsOn` edges over 215 nodes (20% of decisions), acyclic,
  with 2 timing-order violations. `blocks` (380 values) looks like a second graph but is a
  category tag: 52% of its values reach no consumer, and it never gates anything.
- **Scoring**: genuinely good and centralized — a documented 4-band tier lattice with bounded aging,
  a transitive gate-holder bump, a safety clamp, runway compression, and per-host adaptation.
  It is the strongest asset in the system.
- **Annotation**: 15 centralized grounding resolvers attach 14 context axes plus timing provenance to
  every row on every build. **Almost none of it is rendered.**
- **Explanation**: decoupled from the score by a 100%-populated authored rationale that always wins.
- **Orchestration**: 5 independent consumers of one board function, reconciled by id and title but
  not by route or by suppression.
- **Renderer**: applies two overrides (venue suppression, pin reorder) that the model does not know
  about.

The recurring shape, visible at every layer: **capability is built, then not wired to a consumer.**
`derivedImportanceOf` (dead — weight is now 100% authored), `timingProvenance` (computed, unrendered),
`emotionalWeight` (ranks only), `blocks` (52% inert), `decisionIntelligence.js` (admin only),
`playbookRegistry`/`playbookMerge` (admin only), `noCostEffect` (test-only), `heroAsk`'s authored `ask`
(producer path unidentified). The system's problem is not missing intelligence; it is intelligence
that terminates before the host.

---

## 3. On the "per-playbook vs per-capability spine" ruling

**Verdict: the current implementation CONFIRMS the *diagnosis* the framing rests on, and
PARTIALLY IMPLEMENTS the remedy — but the framing is the wrong lens for the largest current defects.**

**What confirms it [FACT]:**
- 39 playbooks are fully independent; there is no spine (Q1, Q2).
- 29 ids recur across 112 instances and 28 of 29 drift on structural metadata. `venue` spans
  T-18d…T-365d. Same id, same job, no shared definition.
- The corpus author cannot reach global behaviour. `solemn.js:20-22` states this in the codebase's own
  words: *"There is no `when`, `weight`, or `emotionalWeight` that reaches a global copy string. That
  is the argument for a shared capability rather than 39 independent authors, made by the codebase
  itself."* The 2026-07-30 repast incident is the concrete cost.

**What partially implements it [FACT]:** a per-capability layer already exists and already spans all
39 playbooks — 14 `*Context.js` resolvers + `timingProvenance.js`, applied uniformly at
`index.js:2513-2563`; `DESTINATION_DECISIONS` and `militaryDecisionsFor` as cross-type overlays;
`derivedImportanceOf` as a corpus-wide fallback. The architecture for a spine is present. It is used
for *annotation*, not for *definition* — and its output is largely unrendered.

**Why the framing is not sufficient — and would mislead if adopted as the priority [INFER]:**

A capability spine addresses **authoring drift**. It does not touch the defects that are currently
costing the most:

1. **Explanation decoupled from ranking (Q21).** Consolidating `venue` into one canonical capability
   would give it *one* rationale — and that rationale would still not explain why the row sits at
   rank 3 today. This defect is in the scorer's explanation contract, not in the corpus shape.
2. **Renderer overrides (Q19) and route divergence (Q22, Q24).** These live above the model entirely.
   A spine changes nothing about `decisionPins` outranking the tier lattice or the hostv2 venue filter
   being invisible to `eventPlan`.
3. **Unrendered grounding (Q12) and inert `blocks` (Q8).** These are wiring defects. Centralizing the
   authoring of a field that no consumer reads improves consistency and changes no host outcome.
4. **The completion lifecycle (Q23).** A single `foodChoices[id]` predicate, no completed/skipped/n-a
   states, and 9 decisions with neither a route nor an inline control — orthogonal to per-playbook
   vs per-capability.
5. **Doctrine drift.** The in-code doctrine (`index.js:2093`, `playbookSchema.js:99`) still describes a
   world where 2 of 39 playbooks author `weight`. That world ended; `derivedImportanceOf` is now dead
   code. A spine debate conducted against the stale doctrine would optimize for a problem already solved
   by brute-force authoring.

**Recommended re-framing.** The live question is not *where decisions are defined* but *what is
allowed to reach the host*. Concretely: (a) make the rank reason a function of the score, or rename
it; (b) move renderer-level suppression and pin ordering into the board so all five consumers see one
board; (c) render the grounding that is already computed, or stop computing it; (d) give `blocks` a
typed vocabulary or delete the 52% that resolves to nothing; (e) give a playbook a way to declare tone
so `solemn.js` stops being a growing list of hand-patched call sites. A capability spine is a
reasonable *later* consolidation for the drift in Q1 — it is not the current bottleneck.

---

## Method and limits

- **Method.** Every structural count was recomputed by evaluating the real playbook objects
  (`evidence/05_measure_decisions.mjs` stages `.mjs` copies and `import()`s them, so V8 parses the
  multi-line literals — no regex parsing of source text). `effectiveTimingProvenance`,
  `isGroundedTiming` and `resolveRoute` were **executed**, not reimplemented. All other claims come
  from direct reads of the cited `file:line`; every citation in this document was opened.
- **Read-only.** No application file was modified. Only `docs/current-state-review/2026-07-30/` was
  written. No jest probe files were created, so none needed deletion. No git state was changed.
- **Limits.**
  - Static analysis only — nothing was driven in a live browser. Claims about what a host *sees* are
    marked **[INFER]** where they depend on runtime composition (notably Q24's hostv2 venue-filter
    divergence and Q11's blocked-row narrative).
  - `src/App.js` (frozen CRA host) was read for consumer identification but not audited as a surface.
  - "Reader" counts in the field table exclude `__tests__/` and `*.test.js`; a field read only by a
    contract test therefore shows as unread at runtime (called out explicitly for `noCostEffect`).
  - The 215-decision base excludes event-conditional overlay decisions
    (`DESTINATION_DECISIONS`: 6; `militaryDecisionsFor`: per-branch), which are described qualitatively.
  - **[OPEN]** `heroAsk.js:69-71` states that adding `ask` to the board's `open.push` did not reach the
    hero, implying a second queue-construction path. This audit did not identify that path.
  - **[OPEN]** Whether the hostv2 venue filter actually produces a visible hero/board disagreement was
    not confirmed by driving the app; it is inferred from the unfiltered call sites.
