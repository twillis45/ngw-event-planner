# Lodging -> Food knowledge audit

**Date:** 2026-08-03 - **Repo:** `ngw-event-planner` - **Scope:** does the backend
pull/add the knowledge needed to make food decisions depend on lodging type?

**One-line answer:** the transport is built end to end and the question is already
asked, but there is nothing to transport. The published corpus contains ZERO entries
about lodging, kitchens, resorts or rentals, and the food plan does not branch on
lodging at all. This is a SUPPLY problem sitting on a working pipeline.

Every claim below was verified by inspection at this commit. File:line included so
each can be re-checked.

---

## 1. The product question

A resort/hotel stay and a whole-home rental (VRBO/Airbnb) produce nearly disjoint
food plans:

| | Resort / hotel | House rental |
|---|---|---|
| Kitchen | none | full |
| The plan | reservations, private dining, banquet minimums | grocery run, cook-in |
| Shopping list | meaningless | the main artifact |
| Day-of labour | almost none | real, needs helpers |
| Multi-day | staff feed everyone | ~3 meals x N days on the host |

For a 5-day destination event with 10 guests this is not a nuance. It is two
different products.

---

## 2. What already exists (verified)

### 2a. The question IS asked

`src/lib/playbooks/index.js:705`

    { id: 'dest_lodging', label: 'How are guests staying?',
      options: ['A room block, no commitment',
                'A room block I guarantee fills',
                'Guests book on their own',
                'A host-arranged Airbnb'],
      blocks: ['vendors', 'food'] }

The option set already distinguishes hotel from rental. The answer is stored in
`event.foodChoices.dest_lodging` (`src/lib/vendorPlan.js:45-48`).

`blocks: ['food']` was added 2026-08-03 (this session). Before that it was
`blocks: ['vendors']` only - the lodging answer reached the vendor list and nothing
else.

### 2b. The platform IS derived, not guessed

`src/lib/lodgingIntel.js:49-53` - `lodgingPlatformFor(url)` derives the platform from
the URL host: `airbnb.com -> 'airbnb'`, `vrbo.com -> 'vrbo'`. The header states the
never-build rule this respects: no live rental APIs, no price scraping, host pastes
the link and types the facts.

### 2c. A kitchen fact now exists

`src/lib/lodgingIntel.js` - `lodgingKitchen(event) -> true | false | null`
(added 2026-08-03, 10 tests in `src/lib/__tests__/lodgingKitchen.test.js`).

- pasted VRBO/Airbnb listing -> `true`
- "A room block ..." -> `false` (a block IS a hotel)
- "Guests book on their own" -> `null` (NOT TOLD - the host genuinely does not know)
- nothing asked -> `null`

The third state is deliberate: a surface can ask rather than assume a hotel.

### 2d. The knowledge pipeline is COMPLETE and reaches runtime

Chain verified end to end:

    Admin console (KCR authoring)
      -> src/lib/knowledge/publishedKcrs.json          (committed corpus)
      -> scripts/bake-published-knowledge.mjs:35,103   (bake)
      -> src/lib/knowledge/publishedKnowledge.json     (baked snapshot)
      -> src/lib/knowledge/publishedSnapshot.js:18     (imports the JSON)
      -> src/lib/knowledge/knowledgeOverride.js:8      (publishedEntry)
      -> effectiveValue()
      -> src/lib/playbooks/index.js:70,1011,1051       (playbook fields)

`effectiveValue` degrades to the authored value when no published entry exists, so a
missing entry is a no-op rather than a break (`playbooks/index.js:1027-1032`).

Gates: `npm run bake:knowledge` / `npm run gate:knowledge` (green).

### 2e. The backend research pipeline is keyed on the right shape

`backend/app/routers/research.py:63-64,118-124` - a research run is created against:

    playbook_type: str
    field_path:    str

That is exactly the addressing a food-vs-lodging KCR would need. Endpoints exist for
runs, observations, evidence and findings (`research.py:105-560`). KCR read/write is
`backend/app/routers/kcr.py:60,79`; the knowledge-asset store is
`backend/app/routers/kas.py:51,74`.

---

## 3. What is MISSING (the finding)

### 3a. The corpus contains nothing about lodging or food

Measured against `src/lib/knowledge/publishedKcrs.json`:

    published KCRs                      16
    entries touching lodging/kitchen     0
    entries touching food/menu/catering  0

All 16 are `provenance` on purchase lines only:

    p_tableware.provenance   (Baby Shower, Birthday, Bridal Shower, ...)
    p_crabs.provenance       (Crab Feast)
    p_ice.provenance         (Crab Feast)

Assets covered: Baby Shower, Birthday, Bridal Shower, Crab Feast, Dinner Party,
Fish Fry, Gender Reveal, Get-Together, Graduation, Juneteenth Cookout, Kwanzaa
Gathering, Retirement Party.

**Nothing in the published corpus has ever been about how people eat where they
sleep.**

### 3b. The food plan does not branch on lodging

`playbookFoodPlan()` and the food decision set do not read `dest_lodging`,
`lodgingKitchen()`, or any kitchen fact. As of this commit `dest_lodging` declares
`blocks: ['food']`, which makes the food plan RE-DERIVE when the answer changes -
but it re-derives to the same thing, because no food content varies by lodging.

Consequence today, reproduced on a live drive (mobile, `?stage=phone`, Santa Fe 80th,
10 guests, 5 days): the plan produces "4 items for 10 guests" and a shopping list
regardless of whether the host booked a resort with no kitchen.

### 3c. Multi-day compounds it

The multi-day arc exists (`src/lib/itinerary.js`, structural arc) and names the days
it does not cover. Food is still sized as ONE event. A 5-day rental is ~15 meals; a
5-day resort stay is close to zero host-cooked meals. Neither is modelled.

---

## 4. What to ask the research board

The pipeline can carry answers as soon as answers exist. Each item below is a real
`playbook_type` + `field_path` target.

1. **Resort / hotel food model.** What does a host actually DO for food on a group
   resort stay? Private dining vs restaurant reservations vs banquet minimum. What
   lead time does a group dinner reservation need at 10, 20, 40 people? What is a
   typical F&B minimum, and when does it apply? What does the host owe the venue vs
   the guests?

2. **Whole-home rental food model.** Grocery-run sizing for N guests x D days. Which
   meals are realistically host-cooked vs eaten out. Kitchen-inventory questions worth
   asking before arrival (pans, oven size, fridge capacity, coffee). Who cooks which
   night, and how that is delegated.

3. **The "book on their own" case.** When lodging is split across hotels and rentals,
   what is the honest food plan? This is the `null` state and it is common.

4. **Per-day meal structure across a span.** Arrival dinner, the main event meal,
   departure breakfast - what is the documented arc, and how does it differ between
   resort and rental?

5. **Cost split.** Group grocery vs restaurant tabs - who pays, and what is the
   observed norm at a milestone celebration (this touches the group-money wing).

**Grounding bar:** these must land as `verificationStatus` + real `sources`. Do NOT
accept synthesized restaurant guidance. If a claim cannot be sourced, it should be
labelled and left unpublished rather than shipped as knowledge.

---

## 5. Answer to the original question

**Is the backend pulling/adding the data?** The backend CAN: the research pipeline,
the KCR store and the bake all work, and the runtime reads the baked snapshot. But
for lodging-dependent food, there is currently nothing to pull, because nobody has
authored or researched it. Zero entries, zero coverage.

The engineering half of this feature is done (the question is asked, the answer is
stored, the kitchen fact is derivable, food re-derives on change). The knowledge half
does not exist. Adding it is a research task with a ready delivery path, not a code
task.

---

## 6. Reproduce every number here

    # published corpus size + coverage
    node -e "const d=require('./src/lib/knowledge/publishedKcrs.json');const r=Array.isArray(d)?d:(d.records||d.kcrs||[]);console.log('kcrs',r.length)"

    # the decision and its blocks
    grep -n "id: 'dest_lodging'" src/lib/playbooks/index.js

    # the kitchen fact + its tests
    CI=true npx react-scripts test --watchAll=false --testPathPattern lodgingKitchen

    # the bake chain
    grep -n "publishedKnowledge.json" src/lib/knowledge/publishedSnapshot.js
    npm run gate:knowledge

    # backend research addressing
    grep -n "playbook_type\|field_path" backend/app/routers/research.py | head
