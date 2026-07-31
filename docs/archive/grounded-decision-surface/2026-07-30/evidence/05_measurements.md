# 05 — Decision-system measurements (independently recomputed 2026-07-30)

Source of truth: evaluated JS objects from `src/lib/playbooks/data/*.js`.

## 1. Corpus size

- Data modules in `src/lib/playbooks/data/`: **39**
- Modules with a truthy default export carrying `type`: **39**
- Identifiers listed in `ALL_PLAYBOOKS` (index.js:87): **39**
- Distinct `pb.type` values: **39**
- Playbooks with **zero** authored decisions: none

## 2. Decision counts

- Total authored decision objects (data/*.js only): **215**
- Decisions carrying an `id`: **215**
- **Unique** decision ids across the corpus: **132**
- Duplicate-id instances (total − unique): **83**
- Decisions per playbook — min 3 (Game Night), max 9 (Retirement Party), mean 5.5
- Duplicate ids **within a single playbook**: none

## 3. Decision-id naming conventions

| Convention | Unique ids | Examples |
|---|---:|---|
| flat lowercase (`venue`) | 77 | format, venue, honor, guestlist, menu, beverage |
| snake_case (`catering_style`) | 47 | food_style, materials_format, minutes_owner, catering_level, game_format, food_model |
| kebab-case | 8 | food-model, potluck-coordination, venue-setting, group-photo, kids-plan, the-main |

Namespace prefixes used ≥2×: `food_`(5), `catering_`(2), `game_`(2)

## 4. Ids recurring across playbooks + metadata agreement

- Ids appearing in **>1** playbook: **29** (covering 112 decision instances)
- Ids appearing in exactly one playbook: **103**

| Decision id | Playbooks | `when` distinct | `weight` distinct | `reversibility` distinct | `emotionalWeight` distinct | `difmCapable` distinct | label distinct | fully identical? |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| `food_style` | 11 | 5 | 3 | 2 | 1 | 1 | 3 | **no** |
| `drinks` | 10 | 3 | 2 | 1 | 1 | 1 | 6 | **no** |
| `venue` | 9 | 6 | 2 | 2 | 2 | 1 | 9 | **no** |
| `format` | 8 | 4 | 2 | 2 | 1 | 2 | 8 | **no** |
| `menu` | 6 | 5 | 2 | 1 | 2 | 2 | 6 | **no** |
| `guestlist` | 5 | 4 | 1 | 1 | 2 | 1 | 5 | **no** |
| `help` | 5 | 4 | 1 | 2 | 1 | 1 | 1 | **no** |
| `dietary` | 5 | 3 | 2 | 2 | 2 | 1 | 5 | **no** |
| `bar` | 5 | 4 | 2 | 1 | 2 | 2 | 5 | **no** |
| `alcohol` | 5 | 4 | 3 | 2 | 1 | 2 | 4 | **no** |
| `headcount` | 4 | 3 | 2 | 2 | 1 | 2 | 4 | **no** |
| `music` | 4 | 4 | 3 | 2 | 2 | 2 | 4 | **no** |
| `beverage` | 3 | 3 | 2 | 1 | 2 | 1 | 2 | **no** |
| `style` | 2 | 2 | 1 | 1 | 1 | 1 | 1 | **no** |
| `registry` | 2 | 2 | 1 | 1 | 1 | 1 | 2 | **no** |
| `games` | 2 | 1 | 1 | 1 | 1 | 1 | 1 | yes |
| `activity` | 2 | 2 | 2 | 2 | 2 | 2 | 2 | **no** |
| `costsplit` | 2 | 2 | 1 | 1 | 1 | 1 | 2 | **no** |
| `potluck` | 2 | 2 | 1 | 1 | 1 | 1 | 2 | **no** |
| `shade` | 2 | 2 | 1 | 1 | 1 | 1 | 2 | **no** |
| `theme` | 2 | 2 | 2 | 1 | 2 | 2 | 2 | **no** |
| `food_model` | 2 | 2 | 1 | 1 | 1 | 1 | 2 | **no** |
| `sides` | 2 | 2 | 1 | 1 | 1 | 1 | 2 | **no** |
| `food` | 2 | 2 | 1 | 1 | 1 | 1 | 2 | **no** |
| `location` | 2 | 1 | 1 | 1 | 2 | 1 | 2 | **no** |
| `invite` | 2 | 1 | 1 | 1 | 1 | 1 | 2 | **no** |
| `food_menu` | 2 | 2 | 1 | 1 | 1 | 1 | 2 | **no** |
| `gifts` | 2 | 2 | 1 | 1 | 2 | 1 | 2 | **no** |
| `ceremony` | 2 | 2 | 1 | 1 | 1 | 1 | 2 | **no** |

**1 of 29** recurring ids are byte-identical across every playbook that declares them on {when, weight, reversibility, emotionalWeight, difmCapable, label}. **28** deviate.

Per-field deviation rate across recurring ids:
- `when`: 26/29 recurring ids disagree (90%)
- `weight`: 13/29 recurring ids disagree (45%)
- `reversibility`: 9/29 recurring ids disagree (31%)
- `emotionalWeight`: 11/29 recurring ids disagree (38%)
- `difmCapable`: 8/29 recurring ids disagree (28%)
- `deliversHeartMoment`: 3/29 recurring ids disagree (10%)
- `label`: 26/29 recurring ids disagree (90%)

Widest `when` spreads on a recurring id:
- `venue` (9 playbooks): T-18d … T-365d — spread 347 days
- `ceremony` (2 playbooks): T-35d … T-300d — spread 265 days
- `music` (4 playbooks): T-10d … T-240d — spread 230 days
- `bar` (5 playbooks): T-14d … T-180d — spread 166 days
- `format` (8 playbooks): T-21d … T-180d — spread 159 days
- `theme` (2 playbooks): T-21d … T-75d — spread 54 days
- `activity` (2 playbooks): T-21d … T-60d — spread 39 days
- `guestlist` (5 playbooks): T-14d … T-49d — spread 35 days
- `food_style` (11 playbooks): T-7d … T-30d — spread 23 days
- `menu` (6 playbooks): T-7d … T-28d — spread 21 days

## 5. Near-duplicate capabilities (different id, same job)

- Distinct-id pairs whose labels overlap ≥0.6 Jaccard on content words: **2**

| id A (n playbooks) | id B (n) | overlap | label A | label B |
|---|---|---:|---|---|
| `food_style` (11) | `food-model` (1) | 1.00 | How is the food handled? | How is food handled? |
| `heat` (1) | `seasoning` (1) | 0.67 | Seasoning heat level | Seasoning level |

- Distinct ids sharing a stem after stripping a namespace prefix: **10** — format:{format|materials_format|game_format|food_format|meal_format}, menu:{menu|food_menu}, style:{food_style|style|celebration_style|ceremony_style|catering_style}, model:{food_model|sponsor_model|cooking_model}, vsorder:{steam_vs_order|make_vs_order}, size:{crab_size|court_size}, seating:{seating|shade_seating}, location:{location|roast_location}, source:{injera_source|food_source|music_source}, type:{game_type|venue_type}

## 6. Timing provenance

- Decisions with a **hand-authored** `timingProvenance` field: **0** / 215
- Decisions that resolve to a GROUNDED provenance via `effectiveTimingProvenance()` (the runtime path): **24** / 215 (11%)
- Decisions with **no** grounded timing provenance: **191** / 215 (89%)
- Decisions with no `when` at all: **0**
- Grounded categories hit: headcount_rsvp(8), menu_finalize(3), dietary_collection(3), invitation(3), venue(3), cake(1), photography(1), attire(1), entertainment(1)
- Declared timing categories that fire on ZERO decisions: save_the_date, catering_vendor, rentals

## 7. `dependsOn` graph

- Decisions declaring `dependsOn`: **42** / 215 (20%)
- Total `dependsOn` edges: **53**
- Edges whose target id does NOT exist in the same playbook: **0**
  - …of which the target is in the board's external `depMet` vocabulary (`headcount`/`count`/`dietary`, index.js:2387-2392): **0**
  - …**genuinely dangling** (no decision, no depMet branch — permanently unmet ⇒ row pinned to `waiting` forever): **0**

- Dependency **cycles** detected (DFS over authored intra-playbook edges): **0** (graph is a DAG)

- **Timing-order violations** (a decision's `when` is EARLIER than a prerequisite it `dependsOn`): **2** of 53 resolvable edges

| Playbook | Child | child `when` | depends on | prereq `when` | child earlier by |
|---|---|---|---|---|---:|
| Quinceañera | `dress` | T-240d | `theme_colors` | T-210d | 30d |
| Sweet 16 | `food_menu` | T-30d | `food_style` | T-21d | 9d |

- Edges where child and prerequisite share the SAME `when` (simultaneous, so the sequence exists only in the graph, not the calendar): **11**

## 8. `blocks` values

- Decisions declaring a non-empty `blocks`: **205** / 215
- Decisions declaring `blocks: []` (present but empty): **2**
- Total `blocks` values: **380**; distinct tokens: **109**

**Consumer vocabulary** (the only code that reads a `blocks` token — cited):

| Consumer | file:line | Accepted tokens |
|---|---|---|
| `BLOCK_ROLE_MAP` role relevance | `src/lib/experience/decisionIntelligence.js:10-19` | food, logistics, vendor, budget, compliance, staffing, guests, timeline |
| `ROLES[].decisionBlocks` role filter | `src/lib/experience/experienceContext.js:14,22,30,38,46,54,62` | same 8 tokens (planner = null ⇒ sees all) |
| situation urgency boosts | `src/lib/experience/decisionIntelligence.js:91-96` | budget, logistics, vendor, food, compliance |
| `isMenuDecision` (board route + FoodPlan gate) | `src/lib/playbooks/index.js:2043-2048` | any token matching `/food\|menu\|drink\|beverage\|potluck\|cater\|spread\|bar\|dish\|fish\|fillings?\|meat\|protein\|reveal/` |
| board vendor deep-link | `src/lib/playbooks/index.js:2488` | any token matching `/vendor\|team\|hire\|staff/` |

- **Resolvable** `blocks` tokens (matched by ≥1 consumer above): **23** distinct / **184** instances
- **Inert** `blocks` tokens (matched by NO consumer — authored, stored on the row, read by nothing): **86** distinct / **196** instances (52% of all values)

Top resolvable tokens: `food`(58 via BLOCK_ROLE_MAP+situation-scoring+isMenuDecision), `vendors`(28 via board vendor-route), `beverage_purchases`(26 via isMenuDecision), `logistics`(16 via BLOCK_ROLE_MAP+situation-scoring), `menu`(13 via isMenuDecision), `beverage`(6 via isMenuDecision), `catering_style`(6 via isMenuDecision), `catering`(5 via isMenuDecision), `staffing`(5 via BLOCK_ROLE_MAP+board vendor-route), `vendor_team`(3 via board vendor-route), `reveal_purchases`(2 via isMenuDecision), `reveal_handoff`(2 via isMenuDecision), `food_purchases`(2 via isMenuDecision), `budget`(2 via BLOCK_ROLE_MAP+situation-scoring), `potluck-signup`(2 via isMenuDecision)

Top inert tokens: `rentals`(24), `decor`(8), `transport`(6), `seating`(5), `purchasing`(5), `setup`(5), `tableware`(5), `favors`(4), `lodging`(4), `rental`(4), `license`(4), `run_of_show`(4), `itinerary`(3), `fuel`(3), `cake`(3), `agenda`(3), `photographer`(3), `runofshow`(3), `venue`(3), `purchases`(3), `program`(3), `attire`(3), `shopping`(3), `celebration`(3), `activity_supplies`(2)

- `blocks` values that are ALSO a decision id somewhere in the corpus: **127** / 380 (33%) — i.e. `blocks` is mostly a free-text CATEGORY tag, not a typed decision reference.
- `blocks` values naming a decision id **in the same playbook**: **38** / 380

- `blocks` edges that point at a real sibling decision: **38**; of these the sibling declares the reciprocal `dependsOn`: **18**, does NOT: **20** (`blocks` and `dependsOn` are not kept symmetric).

## 9. Priority-axis authoring coverage

- `weight`: **215** / 215 (100%)
- `reversibility`: **215** / 215 (100%)
- `emotionalWeight`: **215** / 215 (100%)
- `difmCapable`: **215** / 215 (100%)
- `priorityBasis`: **215** / 215 (100%)
- `priorityBasis.rationale (non-empty)`: **215** / 215 (100%)
- `deliversHeartMoment === true`: **19** / 215 (9%)
- `dependsOn (non-empty)`: **42** / 215 (20%)
- `blocks (non-empty)`: **205** / 215 (95%)
- `options (non-empty)`: **206** / 215 (96%)
- `default`: **204** / 215 (95%)
- `why`: **215** / 215 (100%)

- `weight` values: high:89 · med:87 · low:39
- `reversibility` values: reversible:110 · costly:96 · locked:9
- `emotionalWeight` values: low:135 · med:46 · high:34
- `difmCapable` values: can-derive:109 · needs-host:106

- Decisions that would fall through to `derivedImportanceOf()` (no authored `weight`): **0**

## 10. Every authored decision field, and whether anything reads it

| Field | Decisions carrying it | Runtime (non-test, non-data) files referencing it | Verdict |
|---|---:|---:|---|
| `id` | 215 | 143 | 143 |
| `label` | 215 | 80 | 80 |
| `options` | 215 | 9 | 9 |
| `default` | 215 | 35 | 35 |
| `when` | 215 | 19 | 19 |
| `weight` | 215 | 19 | 19 |
| `reversibility` | 215 | 5 | 5 |
| `emotionalWeight` | 215 | 7 | 7 |
| `difmCapable` | 215 | 5 | 5 |
| `priorityBasis` | 215 | 4 | 4 |
| `why` | 215 | 20 | 20 |
| `blocks` | 207 | 2 | 2 |
| `costFactors` | 46 | 11 | 11 |
| `costFactorProvenance` | 46 | 9 | 9 |
| `affects` | 46 | 7 | 7 |
| `dependsOn` | 42 | 4 | 4 |
| `deliversHeartMoment` | 19 | 3 | 3 |
| `culturalContext` | 11 | 4 | 4 |
| `standsDownWhen` | 9 | 1 | 1 (src/lib/playbooks/index.js) |
| `noCostEffect` | 6 | 0 | **NO READER** |
| `costViaApproach` | 6 | 1 | 1 (src/lib/playbooks/index.js) |
| `optionGates` | 5 | 1 | 1 (src/lib/playbooks/index.js) |
| `ladderKeys` | 1 | 1 | 1 (src/lib/playbooks/index.js) |
| `whenChoice` | 1 | 2 | 2 |
| `optionNotes` | 1 | 2 | 2 |
| `defaultWhy` | 1 | 2 | 2 |

Fields authored on decisions with **zero** runtime readers: `noCostEffect`

_(Caveat: a name-based grep over-counts — a field name that collides with an unrelated property elsewhere counts as a "reader". Treat a non-zero count as "possibly read", and a ZERO as a hard fact: nothing anywhere names it.)_

## 11. Overrides, context gates, and exception density

Per-decision conditional/override fields (these are the "exceptions" authored inline rather than as a shared policy):

- `costFactors`: **46** decisions
- `costFactorProvenance`: **46** decisions
- `affects`: **46** decisions
- `culturalContext`: **11** decisions
- `standsDownWhen`: **9** decisions
- `whenChoice`: **1** decisions
- `optionNotes`: **1** decisions
- `defaultWhy`: **1** decisions
- `whenKids`: **0** decisions
- `copyByAnswer`: **0** decisions
- `militaryContext`: **0** decisions

**Reusable (centralized) context policies** in `src/lib/knowledge/`: **14** — accessibilityContext.js, bookingRiskContext.js, budgetContext.js, childcareContext.js, culturalContext.js, destinationContext.js, dietaryContext.js, fireSafetyContext.js, foodSafetyContext.js, humanContext.js, incidentContext.js, legalContext.js, venueContext.js, weatherContext.js

Event types with the highest per-decision exception density (top 10):

| Event type | decisions | inline exception fields | per decision |
|---|---:|---:|---:|
| Crab Feast | 6 | 15 | 2.50 |
| Ethiopian Coffee Ceremony | 4 | 10 | 2.50 |
| Pupusa Gathering | 4 | 10 | 2.50 |
| Low Country Boil | 5 | 12 | 2.40 |
| Crawfish Boil | 6 | 13 | 2.17 |
| Juneteenth Cookout | 6 | 11 | 1.83 |
| Fish Fry | 5 | 9 | 1.80 |
| Kwanzaa Gathering | 5 | 9 | 1.80 |
| The Cookout | 5 | 9 | 1.80 |
| Graduation | 6 | 10 | 1.67 |

Event types with ZERO inline exception fields: Bachelorette Party, Birthday, Board Meeting, Conference, Dinner Party, Elopement, Housewarming, Sunday Dinner, Surprise Proposal, Sweet 16, Team Retreat, Watch Party

## 12. Aliases

- Lines mentioning "alias" in the playbook resolution path: **9**
  - src/lib/playbooks/index.js:92: // first, then falls back to the canonical taxonomy so aliases and free-text
  - src/lib/eventTaxonomy.mjs:23: // Off-taxonomy + alias names resolve through TYPE_ALIASES then the single ordered
  - src/lib/eventTaxonomy.mjs:108: // Explicit alias map — exact-string normalisation of the app's OTHER vocabularies
  - src/lib/eventTaxonomy.mjs:112: const TYPE_ALIASES = {
  - src/lib/eventTaxonomy.mjs:223: * nothing matches. Order: exact canonical → exact alias → case-insensitive
  - src/lib/eventTaxonomy.mjs:231: if (TYPE_ALIASES[s]) return TYPE_ALIASES[s];
  - src/lib/eventTaxonomy.mjs:234: for (const k in TYPE_ALIASES)   { if (k.toLowerCase() === t) return TYPE_ALIASES[k]; }
  - src/lib/eventTaxonomy.mjs:247: // Alias kept for the budget lib's historical name; SAME axis as intake by construction.
  - src/lib/eventTaxonomy.mjs:291: TYPE_ALIASES,

`getPlaybook` (index.js:96) verbatim:

```js
export function getPlaybook(eventType) {
  if (!eventType) return null;
  const direct = REGISTRY[norm(eventType)];
  if (direct) return direct;
  try {
    const canon = resolveCanonicalType(eventType);
    if (canon && REGISTRY[norm(canon)]) return REGISTRY[norm(canon)];
  } catch (_e) { /* taxonomy resolve is best-effort */ }
  return null;
}
```

## 13. Can an unknown id enter the system?

- Runtime validator on a decision object inside `playbooks/index.js`: **absent**
- `playbookContract.test.js` length: 88 lines; asserts on `decisions`: yes
- Playbook test files: 27 — decisionBoard.test.js, decisionBoardWave2b.test.js, decisionTiebreak.test.js, destinationModifier.test.js, destinationPacing.test.js, dietFlags.test.js, foodAdd.test.js, foodApproach.test.js, foodCostBand.test.js, foodSourcingTasks.test.js, gateHolder.test.js, headcountMemory.test.js, hostAdaptation.test.js, militaryBoard.test.js, overwhelm.test.js, parity.test.js, playbookDayOfChecklist.test.js, playbookMilestones.test.js, playbookRisks.test.js, portionSkew.test.js, reactivity.test.js, reader.test.js, retirementSurprise.test.js, rosterKids.test.js, supplies.test.js, supplySkip.test.js, vegDoubleBuy.test.js

## 14. Routes and deep links (executed against the real `resolveRoute`)

| Emitter | file:line | route emitted | `resolveRoute` result | lands row-level? |
|---|---|---|---|---|
| board: menu/food-choice decision | `index.js:2486` | `{"eventId":"e","tab":"Planning","foodFocus":"menu"}` | `{"kind":"food","focus":"menu"}` | yes |
| board: dietary decision | `index.js:2487` | `{"eventId":"e","tab":"Planning","focusField":"fp-diet-e"}` | `{"kind":"food","focus":"diet"}` | yes |
| board: vendor decision (a vendor exists) | `index.js:2476` | `{"eventId":"e","tab":"Vendors","vendorId":"v1"}` | `{"kind":"vendors","focus":"v1","vendorSection":null}` | yes |
| board: vendor decision (NO vendor yet) | `index.js:2477` | `{"eventId":"e","tab":"Vendors","focusField":"vendor-add"}` | `{"kind":"vendors","focus":null,"vendorSection":null}` | **no — surface top** |
| board: free-form food decision | `index.js:2491` | `{"eventId":"e","tab":"Planning","focusField":"food-plan"}` | `{"kind":"food","focus":null}` | **no — surface top** |
| board foundation: lock the date | `index.js:2329` | `{"eventId":"e","tab":"Event Details","focusField":"event-date"}` | `{"kind":"stage:plan","focus":null,"anchor":"Event date"}` | yes |
| board foundation: venue (locked row) | `index.js:2335` | `{"eventId":"e","tab":"Event Details"}` | `{"kind":"stage:plan","focus":null,"anchor":"Venue"}` | yes |
| board foundation: lock guest count | `index.js:2365` | `{"eventId":"e","tab":"Guests","focusField":"guests-entry"}` | `{"kind":"guests","focus":"entry"}` | yes |
| surfaceRegistry `decisions` raise | `surfaceRegistry.js:578` | `{"tab":"Decisions","decisionId":"venue"}` | `{"kind":"decisions","focus":"venue"}` | yes |
| eventPlan ladder tier 7.8 | `CommandCenter.jsx:2877` | `{"tab":"Planning","focusField":"host-decisions"}` | `{"kind":"decisions","focus":null}` | **no — surface top** |
| planHeroCopy settle_overdue / settle_ready | `planHeroCopy.js:78,90,105` | `{"tab":"Planning","focusField":"host-decisions"}` | `{"kind":"decisions","focus":null}` | **no — surface top** |
| planHeroCopy shopping | `planHeroCopy.js:125` | `{"tab":"Planning","foodFocus":"p_ice"}` | `{"kind":"food","focus":"p_ice"}` | yes |

- Authored decisions that can NEVER receive a route under the board's four route branches (index.js:2486-2492) — they render as a chevron-less prompt: **76** / 215 (35%)

  Examples: Anniversary:honor, Anniversary:slideshow, Baby Shower:registry, Baby Shower:games, Bachelor Party:base, Bachelorette Party:costsplit, Bachelorette Party:vibe, Get-Together:shade, Birthday:theme, Birthday:cake, Board Meeting:materials_format, Board Meeting:minutes_owner, Bridal Shower:registry, Bridal Shower:games, Card Party:game_format, Conference:tracks, Conference:ticketing, Conference:sponsor_model, Conference:room_block, Crawfish Boil:potsize, Day Party:dresscode, Day Party:venue, Dinner Party:seating, Elopement:location, Elopement:license_jurisdiction

## Method and limits

- **Method**: every number above is derived from *evaluated JavaScript objects*, obtained by staging byte-identical `.mjs` copies of `src/lib/playbooks/data/*.js` into a temp dir and `import()`-ing them. Multi-line object literals, nested objects, escaped quotes and trailing commas are parsed by V8, not by a regex — this is the specific failure mode a line-based parser has, and it is structurally excluded here. Verification that staging is faithful: the count of modules with a `type` field equals the file count, and the `ALL_PLAYBOOKS` identifier count in index.js is reported alongside for cross-check.
- `effectiveTimingProvenance` / `isGroundedTiming` are the **real runtime functions**, imported from a staged copy of `src/lib/knowledge/timingProvenance.js` — not reimplemented.
- **Limits**:
  - Only `data/*.js` decisions are counted. Decisions injected at board-build time (`destinationDecisionsFor`, `militaryDecisionsFor`) are event-conditional and are counted separately in the prose report, not here.
  - The `blocks` resolvable/inert split uses the consumer vocabularies cited in §8. If a consumer exists that this audit did not find, an "inert" token could be mis-labelled. The cited consumers were located by grepping every `.js`/`.jsx` under `src/` and `hostv2/src/` for `blocks`.
  - §10 readership is a *name* grep, so it over-counts (a `blocks` property on an unrelated object counts). A **zero** is reliable; a non-zero is only "possibly read".
  - Near-duplicate detection (§5) is lexical (Jaccard over content words). It finds label-level twins; it cannot find two capabilities that do the same job under unrelated wording.
  - The cycle/timing-order checks only traverse edges whose target resolves inside the same playbook; dangling edges are reported separately in §7 and are excluded from those two checks by construction.
