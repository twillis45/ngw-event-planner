// Crab Feast — Event OS host playbook (data only).
//
// The Maryland / DMV (DC–Maryland–Virginia) crab feast: a long, messy
// summer afternoon around newspaper- or brown-paper-covered tables piled
// with STEAMED blue crabs heavily dusted with Old Bay (or J.O.) seasoning.
// Marylanders STEAM their crabs — over water, apple-cider vinegar, and beer
// in a big rack pot — they do not boil them, and the seasoning is the
// identity of the table. Crabs are bought live by the dozen or the bushel
// and by SIZE (mediums, larges, jumbos) from a crab house or seafood
// market. Everyone gets a wooden mallet and a crab knife, a roll of paper
// towels, and dishes of melted butter and vinegar; the classic sides are
// corn on the cob, steamed shrimp, hush puppies, coleslaw, and potato
// salad, washed down with cold beer (Natty Boh is the local can), soda,
// water, and a lot of ice. Then a real cleanup of shell and paper.
// Quantities are grounded in widely-recognized Maryland crab-feast norms
// (see `knowledge`), authored honestly and labeled `synthesized` until a
// foreground verification pass attaches citations. ESM default export.

import { CRAB_SERVING_GUIDE } from '../../crabServing.js';

const crabFeast = {
  type: 'Crab Feast',
  vegMain: 'Grilled corn + veggie + Old Bay potato skewers',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',
  meta: {
    summary: 'A Maryland crab feast — steamed blue crabs dumped hot on a newspaper-covered table, dusted heavy with Old Bay, picked apart with mallets and crab knives over a long, loud summer afternoon. Corn on the cob, steamed shrimp, hush puppies, slaw and potato salad on the side; cold beer, soda, water and a cooler of ice. Marylanders steam their crabs (not boil) and the seasoning is the whole point. The playbook front-loads the one decision that sets everything — steam-them-yourself or order-them-steamed for pickup — then gets the crab count, the pot, the table, and the cleanup right.',
    typicalGuests: { low: 10, default: 18, high: 30 },
    typicalDurationHours: 4,
    leadTimeDays: 10,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 25, high: 60, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The first hot bushel hits the table and everyone grabs a mallet.',
    'Someone cracks a jumbo and it\'s perfect — the whole table reacts.',
    'The Old Bay smell and the cold Natty Boh and everybody is right here.',
    'The table is a mess of shells and paper and nobody wants it to end.',
    'A first-timer picks their first crab and looks up like they understand now.',
  ],

  // ─── Decision priority tier (DECISION_SCHEMA_SPEC §4.A / §6) ──────────────────
  // Four NULLABLE fields per decision. Absent = "not modelled" and MUST NOT change
  // behavior (the decision scorer treats absent as neutral). Allowed values:
  //   weight:          'low' | 'med' | 'high'          — how consequential the pick is
  //   reversibility:   'reversible' | 'costly' | 'locked' — cost to change after committing
  //   emotionalWeight: 'low' | 'med' | 'high'          — emotional stakes for the host/guests
  //   difmCapable:     'can-derive' | 'needs-host'      — can the app ground a safe default,
  //                                                       or must it ask the host?
  // Rationale for the crab-feast values:
  //   dietary         — allergy safety is the ER-risk gate; a guest sidelined by an unasked
  //                     allergy is an emotional failure; only the guests can answer.
  //   steam_vs_order / crab_size — a pre-order by size + a pickup slot COMMIT (costly to
  //                     change late); the price/effort call is real, so needs-host.
  //   where_buy       — sourcing is changeable up until the order (reversible), but the
  //                     right local pick needs the host to call and compare same-day prices.
  //   sides / drinks  — cheap, late, swappable; the classic default is safe (can-derive).
  //
  // ─── priorityBasis: the PROVENANCE of the importance axis (DECISION_SCHEMA_SPEC §4.A) ──
  // `weight`/`reversibility`/`emotionalWeight` STEER the host's board — so, unlike a raw
  // fact, an editorial judgment must state WHY at least as honestly as a crab price does.
  // `weight` is not empirical, so its honest grounding is a stated RATIONALE, not a source.
  // That same one-line rationale is what a concurrent surface shows the host ("show your
  // work"). Shape:
  //   priorityBasis: {
  //     rationale: string,   // REQUIRED — one line, host-readable, the defensible "why"
  //     tier: 'reasoned' | 'researched' | 'synthesized',  // default 'reasoned'
  //     sources?: string[],  // ONLY for tier:'researched' — real dated sources
  //   }
  // Most values are tier:'reasoned' — a defensible norm with a stated why. 'researched'
  // is reserved for a rationale backed by real `sources`. Every priority-bearing decision
  // below carries one; the gap-detector flags an authored weight with no rationale
  // (PRIORITY_UNSOURCED), not just a missing weight.
  decisions: [
    // THE GATE. A crab feast is the one event type where the allergen IS the menu —
    // this playbook's own risk card (r_seafood, below) rates a shellfish allergy
    // severity:'high' and its mitigation literally opens with "Ask ahead."
    //
    // But crabFeast had no dietary decision at all, and blockingDecision()
    // (playbooks/index.js:463) only gates food purchases when the playbook DECLARES
    // one. So the app warned about the allergy in a risk sheet the host could dismiss,
    // and then happily let them order 21 dozen crabs before a single guest had been
    // asked. dinnerParty.js has carried this gate for exactly this reason:
    // "one unflagged severe allergy can send a guest to the ER."
    //
    // Declaring it here is the whole fix — the engine already knows what to do with it,
    // and the invite now asks the guests outright (InviteV2: "Shellfish allergy?").
    // noCostEffect: collecting an allergy changes the PLATE, not the price ladder —
    // the separate non-shellfish plate is a mitigation the risk card owns, and there
    // is no researched factor for it. The contract's sanctioned marker for "this
    // decision does not drive the cost model" is the honest answer; inventing a cost
    // factor to satisfy a test would be fabricating data.
    { id: 'dietary', label: 'Ask your guests about shellfish allergies', weight: 'high', reversibility: 'costly', emotionalWeight: 'med', difmCapable: 'needs-host', priorityBasis: { rationale: 'An allergy is an ER risk and must be known before the crabs are ordered — the highest-stakes, hardest-to-fix call.', tier: 'reasoned' }, options: ['Shellfish', 'Nut allergy', 'Gluten-free', 'Dairy-free', 'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Alcohol-free'], default: null, when: 'T-10d', blocks: ['food'], noCostEffect: true, why: 'The whole menu is shellfish. One guest with an allergy needs a separate plate kept away from the crab steam and the tools — and you need to know that BEFORE you order the crabs, not while you are steaming them. Your invite asks every guest; this is where their answers land.' },
    { id: 'steam_vs_order', label: 'Steam them yourself or order them steamed (pickup)?', weight: 'med', reversibility: 'costly', emotionalWeight: 'low', difmCapable: 'needs-host', priorityBasis: { rationale: 'This one call sets the pot, the pickup slot, the budget, and the whole afternoon\'s workload — commit it early, because it is costly to reverse late.', tier: 'reasoned' }, options: ['Steam them myself', 'Order steamed for pickup', 'Buy live, steam in batches'], default: 'Order steamed for pickup', when: 'T-7d', blocks: ['food', 'logistics', 'rental'], costFactors: { 'Steam them myself': 0.85, 'Buy live, steam in batches': 0.85 }, costFactorProvenance: { tier: 'synthesized', confidence: 'medium', verificationStatus: 'synthesized', note: 'Heuristic: DIY steaming saves ~15% vs crab-house pickup (propane/pot offset by no steaming markup). Needs verification against crab-house vs live-buy price spread.', claim: 'DIY steaming saves ~15% vs crab-house pickup after accounting for propane and pot cost', sufficientWhen: '≥2 crab-house vs live-buy price quotes in the DMV market agree within 15% on the total cost-per-dozen spread' }, affects: ['p_crabs'], why: 'The biggest lever. A crab house will steam and season the crabs so you just pick up hot bushels — easiest for a crowd. Steaming yourself is cheaper and the real tradition, but needs a big rack pot, propane/burner, and someone minding it. Either way Marylanders STEAM, never boil.' },
    { id: 'crab_size', label: 'Crab size', weight: 'med', reversibility: 'costly', emotionalWeight: 'low', difmCapable: 'needs-host', priorityBasis: { rationale: 'Size sets the count and the bill and locks once the order is placed — a real, priced, commit-once call, but not a safety one.', tier: 'reasoned' }, options: ['Mediums ($32–75/dz)', 'Large Females ($52–75/dz)', 'Large Males ($72–98/dz)', 'Extra Large Males ($109–150/dz)', 'Jumbo Males ($149–188/dz)'], default: 'Large Males ($72–98/dz)', when: 'T-7d', blocks: ['food'], costFactors: { 'Mediums ($32–75/dz)': 0.55, 'Large Females ($52–75/dz)': 0.75, 'Extra Large Males ($109–150/dz)': 1.55, 'Jumbo Males ($149–188/dz)': 2.0 }, ladderKeys: { 'Mediums ($32–75/dz)': 'medium', 'Large Females ($52–75/dz)': 'largeFemale', 'Large Males ($72–98/dz)': 'largeMale', 'Extra Large Males ($109–150/dz)': 'xlMale', 'Jumbo Males ($149–188/dz)': 'jumboMale' }, costFactorProvenance: { tier: 'researched', confidence: 'high', verificationStatus: 'researched', sources: ['dmv-crab-2026'], note: "Large Male per-dozen range across 4 DMV sources July 2026: $72–98. Cost factor ratios use market midpoint (~$85/dz Large Male as 1.0). Medium: $32–75 across sources, ratio ~0.55 — SEE EXCEPTION BELOW. Large Female: $52–75, ratio ~0.75. XL Male: $109–150, ratio ~1.55. Jumbo Male: $149–188, ratio ~2.0. Price labels show market range, not a single vendor price. MEDIUM EXCEPTION (documented 2026-08-01, Phase 5C.1): three of the four ratios reproduce from the stated midpoint method (Large Female 0.747→0.75; XL 1.524→1.55; Jumbo 1.982→2.0) and are also within ~3 points of the single-vendor priceLadder ratio. Medium does NOT: midpoint yields 0.629 and the Captain's White priceLadder yields 0.444 ($32/$72). Medium is the one size where the DMV sources diverge sharply — a $32–75 spread is 2.3x, versus ~1.4x for every other size — because cheap mediums are a loss-leader at some dealers and near-large price at others. The published 0.55 is a deliberate blend of the two methods (mean 0.537), NOT a midpoint result, and is retained because a midpoint here would over-state the cost of the budget option a stretched host is most likely to pick. This ratio is therefore an editorial blend, not a derivation; it is flagged rather than silently presented as sourced.", researchedAt: '2026-07-03', claim: "DMV Large Male blue crab retail July 2026: $72–98/dz across 4 sources. Size cost ratios are market-representative, not vendor-specific.", sufficientWhen: "Four verified DMV retail sources July 2026" }, affects: ['p_crabs'], why: "Blue crabs are bought by the dozen (or bushel) and by size — male vs female matters too: males yield more backfin meat; females are sometimes preferred for the roe. Large Males are the crab-feast standard at $72–98/dz depending on where you buy. Mediums stretch a budget crowd; jumbos are a showpiece. Prices vary by dealer — call two or three before ordering." },
    { id: 'where_buy', label: 'Where to buy?', weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'needs-host', priorityBasis: { rationale: 'Sourcing is swappable right up until you order, so it is lower-stakes — but the right same-day price still needs the host to call around.', tier: 'reasoned' }, options: ['Local crab house', "Jessie Taylor Seafood — Maine Ave Fish Market (DC Wharf)", 'Seafood market', 'Waterman / dock direct'], default: 'Local crab house', when: 'T-10d', blocks: ['food'], costFactors: { "Jessie Taylor Seafood — Maine Ave Fish Market (DC Wharf)": 1.0, 'Seafood market': 1.05, 'Waterman / dock direct': 0.85 }, costFactorProvenance: { tier: 'synthesized', confidence: 'low', verificationStatus: 'synthesized', note: "Captain White's July 2026 prices are one verified DMV reference — used as the cost baseline in priceLadder. NB (researched 2026-07-14): Captain White's LEFT the Maine Ave Fish Market in Nov 2021 (Washingtonian 2021-11-04; DCist 2023-09-12) and now trades from Oxon Hill, MD — this playbook said 'Maine Ave Fish Market, DC Wharf' for both, which sent DC hosts to a barge that had not been there for five years. Jessie Taylor Seafood is the Wharf vendor and steams on site, but publishes NO dated price list (its only dated figures are WTOP, 2018) — so its 1.0 factor is a placeholder, NOT a researched parity claim, and is flagged as such rather than quietly presented as sourced. Local crab houses vary; call and compare. Seafood market ~5% premium and waterman/dock-direct ~15% savings are heuristic estimates — unverified.", claim: "DMV blue crab prices vary by source; Captain White's is one verified reference, not the market ceiling or floor", sufficientWhen: 'Same-day, same-size price comparison across ≥2 DMV sources confirms adjustment ratios' }, affects: ['p_crabs'], why: "Blue crabs are priced live and swing with the catch — your local crab house may be cheaper or more expensive than Captain White's on any given day. Call at least two places the week before: confirm sizes available, today's price by the dozen and bushel, and whether they steam. Captain White's LEFT the Maine Ave Fish Market in November 2021 and is now in Oxon Hill, MD — a drive, not a walk from the Wharf. Jessie Taylor Seafood is the vendor still on the barges at the Wharf, and they steam on site. On holiday weekends, call ahead — popular sizes sell out." },
    { id: 'sides', label: 'The sides', weight: 'low', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'Cheap, decided late, and any classic default is fine — lowest stakes.', tier: 'reasoned' }, options: ['Corn + shrimp + slaw + potato salad', 'Corn + slaw only (keep it crab-forward)', 'Full spread (add hush puppies, mac salad, watermelon)'], default: 'Corn + shrimp + slaw + potato salad', when: 'T-5d', blocks: ['food'], costFactors: { 'Corn + slaw only (keep it crab-forward)': 0.6, 'Full spread (add hush puppies, mac salad, watermelon)': 1.4 }, costFactorProvenance: { tier: 'synthesized', confidence: 'medium', verificationStatus: 'synthesized', note: 'Heuristic: corn+slaw only removes shrimp (large cost item) → ~60% of base; full spread adds hush puppies, mac salad, watermelon → ~40% uplift. Needs grocery price verification.', claim: 'Removing steamed shrimp reduces the sides cost to ~60% of the base; adding hush puppies, mac salad, and watermelon adds ~40% uplift', sufficientWhen: 'Grocery price comparison of shrimp, hush puppy ingredients, mac salad, and watermelon at typical per-guest quantities confirms the stated deltas' }, affects: ['p_sides', 'p_shrimp'], why: 'Corn on the cob is the constant; steamed shrimp (also Old Bay) is the classic add; slaw and potato salad round the plate. Keep sides simple — the crabs are the meal and picking takes all afternoon.' },
    { id: 'drinks', label: 'Drinks', weight: 'low', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'Cheap, swapped at the store, and beer-plus-soda-plus-water is always safe — low stakes.', tier: 'reasoned' }, options: ['Beer + soda + water + tea', 'Add a non-alcoholic spread for kids/non-drinkers', 'Dry / family-friendly'], default: 'Beer + soda + water + tea', when: 'T-5d', blocks: ['beverage'], costFactors: { 'Dry / family-friendly': 0.2 }, costFactorProvenance: { tier: 'synthesized', confidence: 'medium', verificationStatus: 'synthesized', note: 'Heuristic: dry feast eliminates beer entirely, retaining ~20% for soda/water/tea. Alcohol is typically the largest beverage cost driver.', claim: 'Beer accounts for ~80% of crab-feast beverage cost; going dry retains only ~20% (soda, water, tea)', sufficientWhen: 'Itemized beverage cost breakdown at typical per-guest quantities confirms beer\'s ~80% share of the beverage line' }, affects: ['p_beer'], why: 'Cold beer is the crab-feast drink — Natty Boh (National Bohemian) is the DMV can. Add soda, water, and iced tea so everyone\'s covered, and plan a lot of ice.' },
  ],

  milestones: [
    { id: 'cf_setdate', name: 'Set date, headcount & the steam-vs-order call', offsetDays: 10, owner: 'host', category: 'planning', risk: { ifDelayed: 'Crab house books up or sizes sell out on a summer weekend', severity: 'med' } },
    { id: 'cf_source', name: 'Pick the crab house / market and check sizes + price', offsetDays: 10, owner: 'host', dependsOn: ['cf_setdate'], category: 'logistics', risk: { ifDelayed: 'No crabs / wrong size on the day; blue-crab price and supply swing seasonally', severity: 'high' } },
    { id: 'cf_invite', name: 'Invite guests & confirm adult pickers vs kids', offsetDays: 7, owner: 'host', dependsOn: ['cf_setdate'], category: 'guest', risk: { ifDelayed: 'Crab count off — pickers eat far more than kids', severity: 'med' } },
    { id: 'cf_reserve', name: 'Reserve / pre-order the crabs (and a pickup time if steamed)', offsetDays: 5, owner: 'host', dependsOn: ['cf_source', 'cf_invite'], category: 'logistics', risk: { ifDelayed: 'Crab house sells out of your size; hot pickup slot gone', severity: 'high' } },
    { id: 'cf_headcount', name: 'Lock headcount & final crab count', offsetDays: 3, owner: 'host', dependsOn: ['cf_invite'], category: 'guest', risk: { ifDelayed: 'Buy too few crabs (or a wasted bushel)', severity: 'med' } },
    { id: 'cf_shop', name: 'Buy seasoning, sides, drinks, table cover, tools & cleanup', offsetDays: 3, owner: 'host', dependsOn: ['cf_headcount'], category: 'shopping', risk: null },
    { id: 'cf_prep', name: 'Make slaw & potato salad, set the table tools & dishes', offsetDays: 1, owner: 'host', dependsOn: ['cf_shop'], category: 'food', risk: null },
    { id: 'cf_pickup_steam', name: 'Pick up steamed crabs OR steam your own', offsetDays: 0, owner: 'host', dependsOn: ['cf_reserve', 'cf_prep'], category: 'food', risk: { ifDelayed: 'Crabs go cold / table waits', severity: 'med' } },
    { id: 'cf_setup', name: 'Cover tables, lay out mallets/knives/butter/vinegar, ice the drinks', offsetDays: 0, owner: 'host', dependsOn: ['cf_prep'], category: 'setup', risk: { ifDelayed: 'Crabs land before the table is ready', severity: 'low' } },
    { id: 'event', name: 'The crab feast', offsetDays: 0, owner: 'host', dependsOn: ['cf_setup', 'cf_pickup_steam'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_source', milestoneId: 'cf_source', phase: 'logistics', label: 'Call a couple of crab houses/markets; ask the day\'s sizes, live vs steamed price per dozen/bushel, and whether to pre-order', when: 'T-10d' },
    { id: 't_invite', milestoneId: 'cf_invite', phase: 'guest', label: 'Invite guests; note who are serious crab pickers vs kids/light eaters (it drives the count)', when: 'T-7d' },
    { id: 't_reserve', milestoneId: 'cf_reserve', phase: 'logistics', label: 'Pre-order the crabs by size and count', when: 'T-5d' },
    // Sourcing-split tasks — the host's steam-vs-order choice reshapes what's left to do.
    { id: 't_pickup', milestoneId: 'cf_reserve', phase: 'logistics', label: 'Lock a hot pickup slot at the crab house near your start time — they steam & season, you just pick up', when: 'T-5d', whenChoice: { id: 'steam_vs_order', in: ['Order steamed for pickup'] } },
    { id: 't_rentpot', milestoneId: 'cf_reserve', phase: 'logistics', label: 'Rent or borrow a rack steamer pot (40+ qt) + propane burner — you\'re steaming your own', when: 'T-7d', whenChoice: { id: 'steam_vs_order', in: ['Steam them myself', 'Buy live, steam in batches'] } },
    { id: 't_count', milestoneId: 'cf_headcount', phase: 'guest', label: 'Lock headcount; figure ~6–12 crabs per adult picker, ~half a bushel per 4–6 pickers, fewer for kids', when: 'T-3d' },
    { id: 't_shop', milestoneId: 'cf_shop', phase: 'shopping', label: 'Buy Old Bay/J.O., apple-cider vinegar, sides, beer/soda/water/tea, butter, paper table cover, mallets & knives, paper towels, cleanup', when: 'T-3d' },
    { id: 't_prep', milestoneId: 'cf_prep', phase: 'food', label: 'Make coleslaw & potato salad; set out mallets, crab knives, bibs, butter & vinegar dishes, the paper-towel rolls', when: 'T-1d' },
    { id: 't_corn', milestoneId: 'cf_setup', phase: 'food', label: 'Steam/boil the corn and (if doing your own) the shrimp; dust shrimp with Old Bay', when: 'T0 -1:00' },
    { id: 't_steam', milestoneId: 'cf_pickup_steam', phase: 'food', label: 'Pick up the hot steamed crabs at your locked slot and get them to the table fast', when: 'T0', whenChoice: { id: 'steam_vs_order', in: ['Order steamed for pickup'] } },
    { id: 't_steam_self', milestoneId: 'cf_pickup_steam', phase: 'food', label: 'Steam your own: water + apple-cider vinegar + beer below the rack, layer crabs, heavy Old Bay per layer, ~20–30 min until bright red', when: 'T0', whenChoice: { id: 'steam_vs_order', in: ['Steam them myself', 'Buy live, steam in batches'] } },
    { id: 't_setup', milestoneId: 'cf_setup', phase: 'setup', label: 'Cover the tables in newspaper/brown paper, set tools and butter/vinegar, ice the drinks, stage a trash/recycle station and a shell bucket', when: 'T0 -0:30' },
    { id: 't_dump', milestoneId: 'event', phase: 'food', label: 'Dump the hot crabs down the middle of the table, dust with extra Old Bay, and let everyone dig in; refill sides, drinks, and paper towels', when: 'T0' },
    { id: 't_clean', milestoneId: 'event', phase: 'cleanup', label: 'Roll the shell and paper straight off the table into trash bags; bag/double-bag the shell, wash mallets & dishes, store leftovers (pick extra crab meat)', when: 'T0 +4:00' },
  ],

  purchases: [
    { id: 'p_crabs', item: 'Blue crabs — live or steamed (sold by the dozen or bushel)', category: 'food',
      // qtyPerGuest WAS 0.75 dozen — 9 crabs a head, size-blind, kid-blind, and HIGHER than
      // every figure any crab house publishes (the ceiling is 8, for the smallest crabs, when
      // crabs are the only dish). The food row multiplied it and told hosts to buy ~40 crabs
      // more than the crab plan did, on the same screen. The crab count now comes from the
      // crab engine (crabPlan → crabServing), which is size-aware and picker-aware.
      //
      // This fallback only fires where the crab engine cannot: a large crab with sides, per
      // Cameron's, is 4 → 4/12 dozen. Kept honest rather than deleted, because resolveQuantity
      // needs a per-guest factor if it is ever reached.
      qtyPerGuest: 4 / 12, unit: 'dozen', where: ["Captain White's Seafood (Oxon Hill, MD)", 'Local crab house', 'Seafood market', 'Waterman / dock'], unitCostRange: [32, 188], essential: true, buyAt: 'T0',
      priceLadder: {
        source: "Captain White's Seafood (Oxon Hill, MD) — July 2–4 2026",
        note: "Captain White's prices. Crab counts per bushel are approximate — larger crabs yield fewer per bushel. Other DMV dealers priced higher (see marketComps).",
        medium:      { perDz: 32,  per2Dz: 60,  perHalfBushel: 99,  perBushel: 195, approxPerBushel: 84, approxPerHalfBushel: 42, servingKey: 'medium' },
        largeFemale: { perDz: 52,  per2Dz: 100, perHalfBushel: 145, perBushel: 285, approxPerBushel: 72, approxPerHalfBushel: 36, servingKey: 'large' },
        largeMale:   { perDz: 72,  per2Dz: 140, perHalfBushel: 199, perBushel: 345, approxPerBushel: 72, approxPerHalfBushel: 36, servingKey: 'large' },
        xlFemale:    { perDz: 89,  perHalfBushel: 205, perBushel: 399, approxPerBushel: 60, approxPerHalfBushel: 30, servingKey: 'xl' },
        xlMale:      { perDz: 109, perHalfBushel: 245, perBushel: 449, approxPerBushel: 60, approxPerHalfBushel: 30, servingKey: 'xl' },
        jumboMale:   { perDz: 149, approxPerBushel: 48, approxPerHalfBushel: 24, servingKey: 'jumbo' },
      },
      // The serving guide is NOT restated here. It lives in lib/crabServing.js, sourced
      // and per-size, because this object USED to carry its own copy — and the copy was
      // partly fabricated behind a `sources:` array that made it look researched.
      // Research (2026-07-14) found: the Cameron's URL we cited 301-redirects; Crab
      // Dynasty (our other "source") publishes NO per-size figures at all, so the whole
      // size table's provenance was false; large-with-sides was 5 where Cameron's says 4;
      // and the entire "extra large" row was invented — no vendor publishes one.
      servingGuide: CRAB_SERVING_GUIDE,
      buyingUnits: {
        note: "Buy by the dozen for ≤2 adult pickers; half bushel for 4–8; full bushel for 8–15; multiple bushels above 15.",
        // Was "15 adults × 5 crabs" — the 5 is the number Cameron's does not publish
        // (they say 4 for a large crab when there are sides, and a crab feast has sides).
        largeMaleExample: "15 adults × 4 crabs (with sides) = 60 crabs ÷ 72 per bushel = ~1 full bushel of Large Males ($345 at Captain White's vs $450 at Captain Dan's)",
      },
      marketComps: [
        {
          source: "Don's Crabs and Seafood (Maryland)",
          url: "donscrabsandseafood.com/crab-prices/",
          asOf: "2026-07-03",
          perDz: { smallMale: 45, mediumMale: 75, largeMale: 95, xlMale: 135, jumboMale: 175, smallFemale: 35, mediumFemale: 55, largeFemale: 75, xlFemale: 95 },
          specials: "Large Males 2 dozen for $175",
        },
        {
          source: "Blue Crab House (Maryland)",
          url: "bluecrabhouse.com/crabs/",
          asOf: "2026-07-03",
          perDz: { smallMale: 48, mediumMale: 74, largeMale: 98, xlMale: 148, jumboMale: 188 },
          bushels: { "Sm/Med": { half: 225, full: 399 }, "Med/Lg": { half: 249, full: 449 }, "Lg/XL": { half: 289, full: 529 }, "XL/Jumbo": { half: 325, full: 599 } },
          females: { perDz: 28, per3Dz: 69, bushel: 159, note: "Small/Large mix, same price" },
        },
        {
          source: "Cameron's Seafood (online, shipped nationwide)",
          url: "cameronsseafood.com/collections/maryland-blue-crabs",
          asOf: "2026-07-03",
          perDz: { largeMale: 79.99, largeFemale: 59.99, colossalJumboMale: 124.99, standardMale: 69.99, standardFemale: 49.99 },
          note: "Starting prices; includes shipping",
        },
        {
          source: "Captain Dan's Crab House",
          url: "captaindanscrabhouse.com/crabs/",
          asOf: "2026-07-03",
          perDz: { small: 50, medium: 75, medLarge: 100, large: 125, xlarge: 150, jumbo: 175 },
          bushels: { "River Males": { half: 325, full: 595 }, "#1 Males": { half: 250, full: 450 }, "#2 Males": { half: 190, full: 325 } },
          note: "River Males / #1 Males / #2 Males = grade classifications",
        },
      ],
      note: "THE meal. For any real group, buy by the bushel — it is the natural purchase unit, cheaper per crab, and how dealers think. A full bushel of Large Males (~72 crabs) feeds ~12–15 adults with sides; a half bushel (~36 crabs) feeds ~6–8. Quantity depends on crab size: larger crabs = fewer per person AND fewer per bushel. See servingGuide.bySize for per-size counts and buyingUnits for the arithmetic. Adult pickers only — kids need a separate count or an alternative food. Large Male prices vary: Captain White's $72/dz, Don's $95/dz, Blue Crab House $98/dz — call two dealers before ordering.", provenance: { tier: 'primary', confidence: 'high', verificationStatus: 'cited', sources: ["Captain White's Seafood (Oxon Hill, MD — LEFT the Maine Ave Fish Market in Nov 2021) — July 2–4 2026. 202-554-5520", "Don's Crabs and Seafood (Maryland) — donscrabsandseafood.com/crab-prices/, as of 2026-07-03", "Blue Crab House (Maryland) — bluecrabhouse.com/crabs/, as of 2026-07-03", "Cameron's Seafood — cameronsseafood.com/collections/maryland-blue-crabs, as of 2026-07-03"], note: "Large Male per-dozen July 2026: Captain White's $72, Cameron's ~$80, Don's $95, Blue Crab House $98. Captain White's is notably on the lower end — local crab houses and watermen vary widely. unitCostRange [32,188] spans Medium at Captain White's to Jumbo Males at Blue Crab House.", researchedAt: '2026-07-03', claim: "DMV Large Male blue crab retail price range July 2026: $72–98/dz depending on vendor. Full market range from Mediums ($32/dz) to Jumbo Males ($175–188/dz).", sufficientWhen: "Four DMV retail sources confirmed July 2026 — additional waterman or dock-direct quotes would complete the low end" }, alternatives: ['Steamed shrimp — far cheaper per lb, same Old Bay treatment', 'Snow crab clusters (frozen) — available year-round, no live crab sourcing'] },
    { id: 'p_oldbay', item: 'Old Bay (or J.O.) seasoning — buy extra', category: 'food', qtyPerGuest: 0.05, unit: 'lb', where: ['Grocery', 'Crab house', 'Restaurant supply'], unitCostRange: [4, 9], essential: true, buyAt: 'T-3d', note: 'The identity of the table. Heavy on every layer when steaming AND extra to dust on top and on the shrimp/corn. Buy more than you think — people re-season as they pick.' },
    { id: 'p_vinegar', item: 'Apple-cider vinegar (steam liquid + dipping)', category: 'food', qtyFlat: 1, unit: 'gal', where: ['Grocery'], unitCostRange: [3, 7], essential: true, buyAt: 'T-3d', note: 'Half the steam liquid (with water and/or beer) and also poured into dipping dishes. Vinegar softens the shells and cuts the richness.' },
    { id: 'p_butter', item: 'Butter (for melting) + dipping dishes', category: 'food', qtyPerGuest: 0.1, unit: 'lb', where: ['Grocery'], unitCostRange: [1, 2.5], essential: true, buyAt: 'T-1d', note: 'Melted butter is the dip alongside the vinegar — small bowls down the table.' },
    { id: 'p_corn', item: 'Corn on the cob', category: 'food', qtyPerGuest: 1.2, unit: 'ear', where: ['Grocery', 'Farm stand'], unitCostRange: [0.4, 0.9], essential: true, buyAt: 'T-1d', note: 'The constant side. Summer sweet corn, steamed or boiled, then hit with Old Bay and butter.', alternatives: ['Frozen corn on the cob — cheaper out of season, works fine in the pot'] },
    { id: 'p_shrimp', item: 'Steamed shrimp (Old Bay)', category: 'food', qtyPerGuest: 0.25, unit: 'lb', where: ['Seafood market', 'Crab house', 'Grocery'], unitCostRange: [8, 14], essential: false, buyAt: 'T0', note: 'The classic seafood add-on, steamed in Old Bay like the crabs — order with the crabs or steam your own.' },
    { id: 'p_sides', item: 'Coleslaw, potato salad, hush puppies', category: 'food', qtyPerGuest: 0.5, unit: 'lb', where: ['Grocery', 'Deli'], unitCostRange: [1.5, 4], essential: true, buyAt: 'T-3d', note: 'Cabbage/carrot for slaw, potatoes for salad; hush puppies optional. Make slaw and potato salad a day ahead so the crab day is simple.', alternatives: ['Deli coleslaw + potato salad — if time is short', 'Bag of chips — cheapest side if budget is very tight'] },
    { id: 'p_beer', item: 'Cold beer (Natty Boh / local lager)', category: 'beverage', qtyPerGuest: 3, unit: 'beer', where: ['Liquor store', 'Grocery', 'Beer distributor'], unitCostRange: [1, 2.5], essential: false, buyAt: 'T-3d', note: 'The crab-feast drink. National Bohemian ("Natty Boh") is the DMV can; a light lager is right with the seasoning. Skip for a dry feast.' },
    { id: 'p_softdrinks', item: 'Soda, water, iced tea', category: 'beverage', qtyPerGuest: 3, unit: 'drinks', where: ['Grocery', 'Costco/Sam\'s'], unitCostRange: [0.4, 1.2], essential: true, buyAt: 'T-3d', note: 'For kids and non-drinkers and to keep everyone hydrated through a long, salty afternoon.', provenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'researched', sources: ['bar-provision-2026'], note: 'Grounded to bar-provision-2026: ~2–3 non-alcoholic servings/guest (when alcohol is also offered) is the source-stated rate.', claim: 'Guests consume ~3 non-alcoholic drinks each over a 4-hour crab feast afternoon', sufficientWhen: 'Verified against beverage consumption norms for a 4h outdoor summer food event where beer is the primary alcoholic option' } },
    { id: 'p_ice', item: 'Ice (coolers + drinks)', category: 'beverage', qtyPerGuest: 2, unit: 'lb', where: ['Grocery', 'Gas station', 'Ice house'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY UNDER-BOUGHT. A hot afternoon and a lot of cans/bottles — ~2 lb/guest for drinks and coolers.' },
    { id: 'p_paper', item: 'Newspaper / brown kraft paper table cover', category: 'decor', qtyFlat: 1, unit: 'roll', where: ['Hardware store', 'Party store', 'Online'], unitCostRange: [8, 20], essential: true, buyAt: 'T-3d', note: 'The signature table. Cover every table thick — at the end you roll the whole mess (shell, paper, scraps) straight into the trash.' },
    { id: 'p_tools', item: 'Wooden mallets + crab knives', category: 'rental', qtyPerGuest: 1, unit: 'set', where: ['Crab house', 'Hardware store', 'Restaurant supply', 'Online'], unitCostRange: [1, 4], essential: true, buyAt: 'T-3d', note: 'A mallet and a crab knife per picker (and a few spares). Crab houses sell cheap mallets by the bag.' },
    { id: 'p_towels', item: 'Paper towels (rolls) + wet wipes', category: 'cleanup', qtyPerGuest: 0.5, unit: 'roll', where: ['Grocery', 'Costco/Sam\'s'], unitCostRange: [1, 2], essential: true, buyAt: 'T-3d', note: 'A roll stood up on every table is part of the setup — crab picking is gloriously messy. Wet wipes for hands.' },
    { id: 'p_bibs', item: 'Crab/seafood bibs (optional)', category: 'decor', qtyPerGuest: 1, unit: 'bib', where: ['Crab house', 'Party store', 'Online'], unitCostRange: [0.2, 0.6], essential: false, buyAt: 'T-3d', note: 'Fun, not required — keeps butter and Old Bay off shirts.' },
    { id: 'p_tableware', item: 'Disposable plates, bowls, cups, napkins', category: 'rental', qtyPerGuest: 1.5, unit: 'set', where: ['Grocery', 'Costco/Sam\'s', 'Party store'], unitCostRange: [0.3, 1], essential: true, buyAt: 'T-3d', note: 'Sturdy plates for sides; small bowls for butter/vinegar. Most picking happens right on the paper.' },
    { id: 'p_cleanup', item: 'Heavy trash bags (double-bag the shell) + shell bucket', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Hardware store'], unitCostRange: [8, 16], essential: true, buyAt: 'T-3d', note: 'COMMONLY UNDERESTIMATED. Crab shell is heavy, wet, and smells fast — contractor-grade bags, double-bagged, and a shell bucket on the table so scraps don\'t pile.' },
  ],

  rentalsGap: [
    { item: 'Large steam pot (40+ qt) with raised rack/insert', qtyFlat: 1, note: 'only if steaming your own — the rack keeps crabs above the liquid so they STEAM, not boil; borrow if you don\'t own one' },
    { item: 'Propane burner / outdoor cooker + full tank', qtyFlat: 1, note: 'only if steaming your own — a big pot of crabs is an outdoor, high-BTU job' },
    { item: 'Long folding tables', qtyPerGuest: 0.15, note: 'long communal tables are the crab feast — roughly one 8ft table per ~6–8 pickers' },
    { item: 'Coolers', qtyPerGuest: 0.1, note: 'one large cooler per ~10 guests for drinks + ice; a separate cooler keeps steamed crabs hot for pickup transport' },
    { item: 'Folding chairs', qtyPerGuest: 0.9, note: 'people sit and pick for hours — enough seats for everyone, borrow if short' },
  ],

  vendors: [
    { category: 'Crab house (steam & season crabs for pickup)', required: false, altToDIY: 'Buy live and steam your own in a rack pot', when: 'T-5d', costRange: [45, 90], costUnit: 'per dozen' },
    { category: 'Seafood / crab supplier (live by the bushel)', required: false, altToDIY: 'Seafood counter at the grocery', when: 'T-5d', costRange: [150, 400], costUnit: 'per bushel' },
    { category: 'Table & chair rental', required: false, altToDIY: 'Own or borrow folding tables/chairs', when: 'T-7d', costRange: [60, 180], costUnit: 'flat' },
    { category: 'Tent / canopy rental (shade over the table)', required: false, altToDIY: 'Own/borrow a pop-up canopy or use the deck', when: 'T-7d', costRange: [50, 150], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_supply', trigger: 'Crabs sell out, wrong size, or price spikes (seasonal/weather-driven catch)', severity: 'high', mitigation: 'Call crab houses early; pre-order by size and count at 5 days out. Blue-crab supply and price swing with the season and the day\'s catch — stay flexible on size (larges vs mediums) and have a backup source.' },
    { id: 'r_count', trigger: 'Run out of crabs (or waste a bushel)', severity: 'med', mitigation: 'Lock headcount at 3 days out and count by ADULT PICKERS, not heads — plan ~6–12 crabs/picker, fewer for kids. Order a touch over for the serious pickers; leftover crab meat keeps.' },
    { id: 'r_boil', trigger: 'Crabs come out boiled/waterlogged instead of steamed', severity: 'med', mitigation: 'Keep the liquid (water + vinegar + beer) BELOW the rack so the crabs steam in vapor, not submerged. Season heavy per layer and steam ~20–30 min until bright red; don\'t crowd the pot — work in batches.' },
    { id: 'r_cold', trigger: 'Steamed crabs go cold before the table is ready', severity: 'low', mitigation: 'Time pickup/steam to the START of the feast; transport hot in a cooler or insulated box; have the table covered and tools laid out BEFORE the crabs land.' },
    { id: 'r_shell', trigger: 'Shell trash overwhelms the cleanup / starts to smell', severity: 'med', mitigation: 'Keep a shell bucket on the table during; roll the paper-and-shell straight into heavy contractor bags; double-bag and get it out of the house/heat quickly (it sours fast in summer).' },
    { id: 'r_seafood', trigger: 'A guest has a shellfish allergy', severity: 'high', mitigation: 'Ask ahead. Have a clearly separate non-shellfish plate (corn, slaw, potato salad, a grilled item) and keep it away from the crab/shrimp steam and tools.' },
    { id: 'r_weather', trigger: 'Rain or brutal heat on an outdoor afternoon', severity: 'med', mitigation: 'It\'s a summer event — have a canopy/tent or covered deck for shade and rain, plenty of water, and a backup garage/covered patio.' },
  ],

  contingencies: [
    { id: 'c_supply', when: 'r_supply', plan: 'If your size/source is out: switch sizes (larges⇄mediums), split the order across two crab houses, or pivot to a steamed-shrimp-heavy spread and fewer crabs. Tell guests it\'s market-driven — Marylanders get it.' },
    { id: 'c_count', when: 'r_count', plan: 'Stretch with more shrimp, corn, and sides if crabs run low; if you over-bought, pick the extra meat for crab cakes/dip and send guests home with crabs.' },
    { id: 'c_boil', when: 'r_boil', plan: 'Lower the liquid below the rack and re-steam a fresh batch hotter and shorter; if crabs are waterlogged, pat dry and re-dust heavy with Old Bay.' },
    { id: 'c_shell', when: 'r_shell', plan: 'Stage a second shell bucket and extra bags; do an interim roll-and-bag mid-feast so the table resets clean, and move bagged shell straight outside/to the bin.' },
    { id: 'c_weather', when: 'r_weather', plan: 'Move under the canopy, deck cover, or garage; push the steam pot to a sheltered spot; keep the feast going — a little rain never stopped a crab feast.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-5d', what: 'Pre-order the crabs by size and count; lock a steamed pickup time if ordering steamed; reserve tables/canopy if renting' },
      { when: 'T-3d', what: 'Old Bay/J.O., apple-cider vinegar, sides, beer/soda/water/tea, paper table cover, mallets & knives, paper towels, tableware, trash bags & shell bucket' },
      { when: 'T-1d', what: 'Butter, corn, and any fresh side produce' },
      { when: 'T0', what: 'Pick up the hot steamed crabs and steamed shrimp; buy ice last' },
    ],
    preparation: [
      { when: 'T-1d', what: 'Make coleslaw and potato salad; set out mallets, crab knives, bibs, and the butter/vinegar dishes' },
      { when: 'T0 -1:30', what: 'Steam/boil the corn and shrimp; melt butter; pour vinegar into dipping bowls; if steaming your own crabs, get the pot and liquid ready' },
    ],
    setup: [
      { when: 'T0 -5h', what: 'Confirm the pickup slot with the crab house and the count you’re collecting' },
      { when: 'T0 -4h', what: 'Drinks on ice; paper, mallets, knives, shell buckets and rolls of paper towel staged' },
      { when: 'T0 -3h', what: 'Tables papered and the seasoning, vinegar and butter set out' },
      { when: 'T0 -0:30', what: 'Cover the tables thick in newspaper/brown paper, stand a paper-towel roll on each, lay out mallets/knives/butter/vinegar, ice the drinks in coolers' },
      { when: 'T0 -0:10', what: 'Stage the shell bucket(s) and a trash/recycle station within reach of the table; set sides out buffet-style' },
    ],
    program: [
      { when: 'T0 +5m', what: 'Doors: paper down, mallets out, drinks on ice' },
      { when: 'T0 +30m', what: 'First steam hits the table — Old Bay, vinegar, shell bucket' },
      { when: 'T0 +1:15', what: 'Sides out and the second steam goes on' },
      { when: 'T0 +2h', what: 'Second round to the table; refill the seasoning and the paper towels' },
      { when: 'T0 +3h', what: 'Dessert and the last of the picking' },
      { when: 'T0 +4:05', what: 'Wind down: shells bagged, table stripped, to-go containers out' },
    ],
    cleanup: [
      { when: 'during', what: 'Keep a shell bucket on the table; refill Old Bay, paper towels, drinks, and ice; do an interim roll-and-bag if the shell piles up' },
      { when: 'T0 +4:00', what: 'Roll the paper-and-shell straight off the table into heavy bags, double-bag and move it outside (it sours fast in heat); wash mallets/knives/dishes; pick and store any leftover crab meat; break down tables and coolers' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'partial',
    note: "This playbook is grounded in the Maryland / DMV (DC–Maryland–Virginia) crab-feast tradition — a regional summer foodway built around the Chesapeake blue crab. The specifics reflect widely-recognized insider practice: crabs bought live by the dozen or the bushel and by SIZE from a crab house, seafood market, or off the dock, at a price that swings with the season and the catch; crabs STEAMED (the Maryland hallmark — Marylanders do not boil) over water, apple-cider vinegar, and often beer kept below a raised rack, seasoned HEAVY with Old Bay or J.O. on every layer; the table covered in newspaper or brown kraft paper with a wooden mallet, a crab knife, a stood-up roll of paper towels, and small dishes of melted butter and vinegar per picker; classic sides of corn on the cob, steamed (Old Bay) shrimp, hush puppies, coleslaw, and potato salad; cold beer (National Bohemian / 'Natty Boh' is the local can) alongside soda, water, iced tea, and a lot of ice; and a real cleanup of heavy, fast-souring shell rolled straight off the paper into double-bagged trash. Quantities (~9 crabs per adult picker, a bushel of roughly 5–7 dozen feeding ~8–12) are common Maryland crab-feast planning rules of thumb. Crab pricing uses Captain White's July 2–4 2026 as one verified DMV reference — local crab houses and watermen vary. Non-crab quantities and cost factors remain synthesized.",
    sources: [
      "Captain White's Seafood, Maine Ave Fish Market (DC Wharf) — posted price sheet July 2–4 2026. One DMV reference point; prices at local crab houses, seafood markets, and off the dock will vary. Full price ladder (dozen / 2 dozen / half bushel / bushel by size and gender) stored in p_crabs.priceLadder.",
    ],
  },
};

export default crabFeast;
