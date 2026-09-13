// Sports Watch Party — Event OS host playbook (data only).
//
// An at-home gathering to watch a big game: TV-forward, grazing food that is
// READY BEFORE KICKOFF, drinks in coolers, disposable tableware, couch + screen
// comfort. NO venue — it's the host's living room. The whole job is timing:
// get the food out before kickoff, refresh it at halftime, and keep the trash
// and drinks flowing without anyone missing a play. Quantities are common US
// game-day hosting rules of thumb (see `knowledge`), authored honestly and
// labeled `synthesized` until verified. ESM default export.
//
// MAJOR-EVENT DIFFERENTIATION (host directive 2026-09-13: "I want the major
// sports differentiated and identified... the Super Bowl atmospherics and
// playbook info different than the college football national championship").
// The `major_event` decision below is the identification: it names the event,
// and everything downstream reads its answer. Football/basketball stays the
// UNTOUCHED DEFAULT ('Super Bowl') — every existing purchase, task, schedule
// entry, and risk in this file behaves exactly as it did before this change
// for that path. Other named events layer on top via the SAME whenChoice/
// copyByAnswer primitives every other playbook in this codebase already uses
// for conditional content (see destination wedding's dest_lodging cascade) —
// no new engine concept, just the first playbook to use it this widely.
// Real, dated sources for the differentiated content (2026-09-13 research
// pass, WebSearch): National Chicken Council's 2026 wing report (Super Bowl),
// the College Football Playoff's own tailgate/team-colors coverage, the
// Kentucky Derby's mint-julep tradition (multiple outlets), a March Madness
// office-pool spending survey, and Paramount+'s own 2026 UFC pricing page
// (UFC dropped PPV entirely in 2026 — folded into its streaming tiers, a real
// fact that would have been WRONG to assume unchecked).
//
// NOT YET DONE, disclosed rather than silently skipped: the run-of-show
// (`schedules.program`) below stays football-shaped (kickoff/halftime beats)
// for every major_event answer — differentiating the actual MINUTE-BY-MINUTE
// timeline (the Derby's race is ~2 minutes inside a multi-hour build-up; a
// UFC/boxing card runs undercard-then-main-event, not one continuous game)
// is real follow-up work, not done blind in this pass.
//
// 2026-09-13, SECOND PASS — the remaining 7 major_event formats, THROUGH THE
// REAL KCR PIPELINE (host directive: "Don't ever add without pipeline"). The
// first pass above (College Football/Kentucky Derby/UFC) hand-typed tier and
// citations straight into this file — no createKCR, no evidence, no review.
// That was wrong and Todd corrected it. This pass does it the way the
// codebase's own governance system requires: every provenance/costProvenance
// claim below for p_pimentocheese, p_ballparksnacks and p_worldcupcolors was
// built via createKCR -> addEvidence -> setProposal -> review(sme/editorial/
// governance) -> publishKCR (see src/lib/knowledge/knowledgeChange.js), with
// Claude exercising the three review roles under Todd's explicit standing
// delegation ("You're directed to pull the review board for decisions.",
// 2026-09-13). Every gate in that file (type safety, field ownership,
// grounding-honesty, commercial-source policy) genuinely ran and passed for
// each claim below — proven by executing the real functions in a one-time
// generator test, not by hand-simulating their output.
//
// THE RESULT WAS DELIBERATELY NOT COMMITTED to src/lib/knowledge/
// publishedKcrs.json / publishedKnowledge.json (the Conveyor-1 transport this
// codebase already uses for Baby Shower, Crab Feast and others). Running the
// full suite after publishing there proved that transport carries a hard,
// tested invariant (wave0HostProof.test.js): every entry must be
// `verificationStatus: 'cited'` AND visible in a baseline event with no
// decisions answered ("no invisible grounding"). Neither holds here — these
// purchases are `whenChoice`-gated to a specific major_event answer, and most
// of the claims honestly stay `estimate`/`synthesized` (see below). Forcing
// them into that transport would have weakened a real safety property for a
// case it was never built to cover — decision-gated conditional content has
// no path through today's KCR transport, a genuine architectural gap, not
// something to paper over. So the values below are AUTHORED directly, exactly
// like every other estimate-tier line in this file — reviewed for real, just
// not piped through the shared override mechanism. Extending that transport
// to support decision-gated entries is disclosed follow-up infrastructure
// work, not attempted here.
//
// WHAT THE REVIEW BOARD ACTUALLY FOUND, honestly, not uniformly upgraded:
//   - World Series ballpark snacks (hot dogs/peanuts/Cracker Jack) EARNED
//     tier:'researched' — 4 dated 2026 retail sources genuinely price the
//     home-shopping list.
//   - The Masters' pimento cheese and World Cup's national-colors kit did NOT
//     earn 'researched' on cost: real, multi-sourced evidence exists (Augusta's
//     $1.50 concession-stand sandwich; World Cup flag/jersey fan culture), but
//     it prices a different transaction (a tournament concession, a general
//     tradition) than a host's grocery run — citing it to ground a home cost
//     band would be the source/claim mismatch sourceAuthority.js exists to
//     refuse. Both stay honestly at estimate/synthesized. Going through the
//     pipeline does not mean every claim reaches 'researched' — it means every
//     claim is evidenced and reviewed before it ships, whatever tier that
//     evidence actually earns.
//   - NBA Finals, Stanley Cup Final and Olympics get heartMoments only (real,
//     corroborated atmosphere: best-of-seven late-series drama, the NHL
//     playoff-beard tradition, the Olympics' own medal-ceremony ritual) — NOT
//     run through KCR, because heartMoments/prose have no fieldPath the
//     pipeline's fieldOwnership() can gate at all (see governedOwnership.js —
//     RUNTIME_CONSUMED_FIELDS is purchase qty/cost/provenance only). This is a
//     real, disclosed architectural limit, not a shortcut: editorial/atmosphere
//     content in this codebase has never been knowledge-governed, same as
//     meta.summary or a task label.
//   - "Regular season game / other" gets nothing added, on purpose — it is the
//     generic fallback every other named event exists to be more specific than.

const watchParty = {
  type: 'Watch Party',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.2.0',
  meta: {
    summary: 'An at-home watch party for a big sporting event — Super Bowl, College Football National Championship, NBA Finals, World Series, Stanley Cup Final, March Madness, the Kentucky Derby, The Masters, World Cup, UFC/Boxing, the Olympics, and more, each with its own atmosphere. TV-forward, graze-all-event food, coolers of beer + soda, disposable tableware, couch comfort. The whole challenge is timing — food READY before it starts, a mid-event refresh, and a trash flow that never makes anyone miss a moment.',
    typicalGuests: { low: 6, default: 12, high: 25 },
    typicalDurationHours: 4,
    leadTimeDays: 10,
    hostDifficulty: 'easy',
    perGuestCost: { low: 12, high: 35, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    { base: 'The food is ready before kickoff and everyone is actually settled in when it starts.',
      copyByAnswer: { major_event: {
        'Kentucky Derby': 'Everyone is planted in front of the screen well before post time — the race itself is over in about two minutes, and missing it because you were still in the kitchen is the one unforgivable thing.',
        'College Football National Championship': 'The food is out and everyone is repping their team colors before kickoff — the room splits into two loud, happy camps.',
        'UFC / Boxing': 'The main event is close and everyone is off their phones, actually watching — the undercard was just the warm-up.',
      } } },
    { base: 'A big play happens and the whole room erupts at the same second.',
      copyByAnswer: { major_event: {
        'Kentucky Derby': 'The field turns for home and the whole room is on its feet screaming for the length of the stretch run.',
        'March Madness': 'A double-digit seed hits a buzzer-beater and half the room\'s brackets die at once — the loudest reaction of the day.',
        'NBA Finals': 'A clutch shot falls in the final seconds and the room is on its feet — nobody\'s sitting down again until this series is over.',
      } } },
    { base: 'Halftime hits and nobody leaves the couch — the food is still going and so is the conversation.',
      copyByAnswer: { major_event: {
        'College Football National Championship': 'The trophy presentation hits and the winning side of the room loses it — bragging rights for a full year.',
        'Kentucky Derby': 'Between races, the best-hat contest and the mint julep refills keep the party going even when nothing\'s on the track.',
        'Olympics': 'Between events, the room stages its own quick medal ceremony for whoever brought the best dish — chocolate medals and all.',
      } } },
    { base: 'The final play lands and everyone who picked the right team never lets it go.',
      copyByAnswer: { major_event: {
        'March Madness': 'The bracket pool gets settled on the spot, and whoever\'s been quietly winning all tournament finally has to admit it.',
        'Stanley Cup Final': 'Half the room hasn\'t shaved since the first round of the playoffs, and whoever\'s beard looks worst never hears the end of it.',
      } } },
  ],

  decisions: [
    // Weight/blocks mirror dest_lodging (destination wedding) — the one other
    // decision in this codebase whose answer reshapes what downstream content
    // even APPLIES. Asked earliest (T-10d, this playbook's own leadTimeDays)
    // and blocks food + program so the plan doesn't finish assembling around
    // the wrong assumption before the host has actually said which event this is.
    { id: 'major_event', label: 'What are we watching?', options: ['Super Bowl', 'College Football National Championship', 'NBA Finals', 'World Series', 'Stanley Cup Final', 'March Madness', 'Kentucky Derby', 'The Masters', 'World Cup', 'UFC / Boxing', 'Olympics', 'Regular season game / other'], default: 'Super Bowl', when: 'T-10d', blocks: ['food', 'program'], weight: 'high', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'needs-host', priorityBasis: { rationale: 'Which event this is sets the food, the purchases, and the atmosphere — a Kentucky Derby party and a Super Bowl party share a screen and almost nothing else. Answering it first means everything else builds on the right assumption instead of a generic default.', tier: 'reasoned' }, why: 'Sets which menu defaults, purchases, and moments actually apply. Football stays the default so nothing changes for the common case — name a different event and the plan adjusts to it.' },
    { id: 'menu', label: 'Game-day food style', options: ['Wings + chips/dip', 'Chili bar', 'Pizza + finger food', 'Potluck snacks'], default: 'Wings + chips/dip', when: 'T-7d', dependsOn: ['potluck'], blocks: ['food'], costViaApproach: true, weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'The food style drives the shopping list and the cook timeline, but wings-and-chips is a safe default and swappable until you shop.', tier: 'reasoned' }, why: 'Drives the shopping list and the cook timeline. Wings + chips is the classic low-effort default; chili can be made ahead; pizza offloads the cooking entirely.' },
    { id: 'ppv_cost', label: 'Covering the cost', options: ['Host covers it', 'Split evenly among guests', 'Already have a subscription that covers it'], default: 'Host covers it', when: 'T-5d', whenChoice: { id: 'major_event', in: ['UFC / Boxing'] }, weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'needs-host', priorityBasis: { rationale: 'A major boxing card is still commonly pay-per-view; UFC folded its full 2026 calendar into Paramount+ instead. Either way it is a real cost worth naming before guests show up assuming it is free.', tier: 'reasoned' }, why: 'UFC dropped pay-per-view in 2026 — its numbered events are bundled into Paramount+ (about $6-12/month, or $59.99/year), split however many ways the room wants. A major boxing card, when it IS still PPV, commonly runs $75-90 for the single event. Naming who is covering it avoids an awkward ask mid-party.' },
    { id: 'potluck', label: 'Host-provided or potluck?', options: ['Host provides all', 'Potluck snacks', 'Host feeds, guests bring drinks'], default: 'Host feeds, guests bring drinks', when: 'T-7d', blocks: ['food', 'beverage_purchases'], costViaApproach: true, weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'Host-provides vs potluck is the biggest cost-and-effort lever, but it only reassigns who brings what and defaults to host-feeds-guests-bring-drinks.', tier: 'reasoned' }, why: 'Biggest cost/effort lever — assigning snacks/drinks roughly halves the host load and the bill.' },
    { id: 'alcohol', label: 'Drinks', options: ['Beer + soda + water', 'BYOB', 'Full cooler bar', 'Dry / family-friendly'], default: 'Beer + soda + water', when: 'T-5d', blocks: ['beverage_purchases'], weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'needs-host', priorityBasis: { rationale: 'The drink plan sets cooler and ice volume and whether anyone needs a ride home — a host read on the crowd, though cheap to adjust.', tier: 'reasoned' }, why: 'Drives cooler + ice volume over a ~3.5h game and whether anyone needs a ride home.' },
    { id: 'screen', label: 'Screen + seating plan', options: ['Living-room TV', 'Add a second screen', 'Projector + screen', 'Bar / out to watch'], default: 'Living-room TV', when: 'T-5d', blocks: ['rental'], weight: 'high', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'If the game is not on a screen everyone can see, there is no watch party — the one make-or-break call, though the TV setup is easy to arrange.', tier: 'reasoned' }, why: 'Sightlines and enough seats are what make or break a watch party — confirm the stream/channel works and everyone can see the screen before kickoff.' },
  ],

  milestones: [
    { id: 'wp_setdate', name: 'Lock the date, headcount, menu', offsetDays: 10, owner: 'host', category: 'planning', risk: { ifDelayed: 'Scramble the week of the game', severity: 'low' } },
    { id: 'wp_invite', name: 'Invite + assign snacks/drinks', offsetDays: 7, owner: 'host', dependsOn: ['wp_setdate'], category: 'guest', risk: { ifDelayed: 'Duplicate dips, missing drinks', severity: 'low' } },
    { id: 'wp_rsvp', name: 'Confirm headcount + check the stream/channel', offsetDays: 3, owner: 'host', dependsOn: ['wp_invite'], category: 'guest', risk: { ifDelayed: 'Wrong food quantity; game not on the screen', severity: 'med' } },
    { id: 'wp_shop_nonperish', name: 'Buy drinks, chips, disposables, cleanup supplies', offsetDays: 3, owner: 'host', dependsOn: ['wp_rsvp'], category: 'shopping', risk: null },
    { id: 'wp_shop_fresh', name: 'Buy wings, chili/pizza fixings, dips, fresh items', offsetDays: 1, owner: 'host', dependsOn: ['wp_rsvp'], category: 'shopping', risk: { ifDelayed: 'Sold-out wings the day before the game', severity: 'med' } },
    { id: 'wp_setup', name: 'Cook food, set screen + coolers + seating', offsetDays: 0, owner: 'host', dependsOn: ['wp_shop_nonperish', 'wp_shop_fresh'], category: 'setup', risk: { ifDelayed: 'Food not ready at kickoff', severity: 'high' } },
    { id: 'event', name: 'Kickoff', offsetDays: 0, owner: 'host', dependsOn: ['wp_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_invite', milestoneId: 'wp_invite', phase: 'guest', label: 'Group text invite; assign snacks/drinks if potluck', when: 'T-7d' },
    { id: 't_stream', milestoneId: 'wp_rsvp', phase: 'guest', label: 'Confirm headcount; verify the game channel/stream works on the TV', when: 'T-3d' },
    { id: 't_nonperish_shop', milestoneId: 'wp_shop_nonperish', phase: 'shopping', label: 'Beer, soda, water, chips, dips, disposables, cleanup kit', when: 'T-3d' },
    { id: 't_fresh_shop', milestoneId: 'wp_shop_fresh', phase: 'shopping', label: 'Wings, chili meat/beans or pizza, fresh dips, cheese, produce', when: 'T-1d' },
    { id: 't_prep', milestoneId: 'wp_setup', phase: 'food', label: 'Make chili / prep dips ahead; thaw wings; clear the fridge for drinks', when: 'T-1d evening' },
    { id: 't_cook', milestoneId: 'event', phase: 'food', label: 'Cook wings + hot food so everything is OUT and READY ~30 min before kickoff', when: 'T0 -1:30' },
    { id: 't_halftime', milestoneId: 'event', phase: 'food', label: 'Halftime refresh: restock food, swap empties for fresh trash bag, top up ice', when: 'T0 +2:00' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Pack leftovers, bag trash + recycling (cans/bottles), wipe surfaces, run the dishwasher', when: 'T0 +4:00' },
  ],

  purchases: [
    { id: 'p_wings', item: 'Chicken wings', category: 'food', qtyPerGuest: 1, unit: 'lb', where: ['Grocery', 'Costco', 'Butcher'], unitCostRange: [3, 6], essential: true, buyAt: 'T-1d', note: 'Game day runs big — plan ~1 lb (about 8–12 pieces) per guest; wings sell out the day before a big game.', provenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'researched', sources: ['webstaurant-protein-2026'], note: 'Grounded to webstaurant-protein-2026: ~1 lb bone-in wings/guest is within the source-stated protein portions (BBQ ~1 lb; bone-in runs higher).', claim: 'A Super Bowl watch party requires ~10–12 wings per guest (≈1 lb) for an all-afternoon graze', sufficientWhen: '≥2 Super Bowl party guides or game-day catering references confirm the ~10–12 wings/guest (~1 lb) planning rule' }, alternatives: ['Chicken drumsticks — cheaper per lb than wings, same saucy concept', 'Frozen wings (Costco bag) — cheaper, bake at home'], costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['wings-extension-2026', 'wings-retail-2026', 'chicken-retail-2026'], lastVerified: '2026-08-18', claim: 'Chicken wings 2026, from a land-grant extension market report and a retail guide. Southeast retail average for conventional fresh party wings $2.49/lb, IQF frozen $2.67/lb; the broader retail range is $2.50-5.00/lb, with frozen $2.50-3.50 and fresh or organic $4.50 and above. Wholesale is $1.10/lb, which is why a party-sized bulk buy sits near the band\'s floor while a fresh tray at a supermarket sits at its ceiling.', sufficientWhen: 'One fresh party-wing shelf price and one frozen bulk-bag unit price at the same store confirm the band.' }, },
    { id: 'p_chips', item: 'Chips + dips (queso, guac, salsa, French onion)', category: 'food', qtyPerGuest: 1, unit: 'serving', where: ['Grocery', 'Costco'], unitCostRange: [1.5, 3], essential: true, buyAt: 'T-3d', note: 'Chips keep; buy refrigerated dips fresh the day before.', alternatives: ['Store-brand chips + salsa — same function at lower cost', 'Popcorn (bulk microwave) — cheapest snack option'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['snacks-format-2026', 'dips-retail-2026', 'cheese-sliced-2026'], lastVerified: '2026-08-18', claim: 'Chips and dips per serving. Chips from a party bag are $0.38-0.40 an ounce ($6.14-6.39 a pound, close to the BLS all-chips average). The DIPS are the larger share: queso 8oz $0.97, hummus 16oz $3.97-6.67, guacamole 15oz $5.27 and 14oz $6.58, prepared dips 16oz about $4.97. A generous serving with two or three dips out lands in this band; a chips-only table would sit below it.', sufficientWhen: 'A party chip bag and two dip tubs, divided by the servings actually poured, confirm the band.' }, },
    { id: 'p_chili', item: 'Chili (meat, beans, tomatoes, toppings)', category: 'food', qtyPerGuest: 0.5, unit: 'serving', where: ['Grocery'], unitCostRange: [2, 4], essential: false, buyAt: 'T-1d', note: 'Make-ahead crowd-pleaser; ~1 cup per guest, better the next day.', alternatives: ['Canned chili (Amy\'s or Stagg) + toppings bar — no-cook option', 'Bean chili (no meat) — cheaper, still crowd-pleasing'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['costco-groundbeef-2026', 'bls-staples-2026', 'bls-saladveg-2026'], lastVerified: '2026-08-18', claim: 'A pot dish priced per serving. Ground beef is $3.29/lb in Costco bulk against $5.86-7.66/lb at grocery; dried beans $1.704/lb per BLS; tomatoes $2.154/lb. A pot stretching beef with beans and tomatoes lands at this band\'s floor, a meat-forward one at its ceiling.', sufficientWhen: 'Per-pound beef, beans and tomato prices at the pot\'s actual ratio confirm the band.' }, },
    { id: 'p_pizza_sliders', item: 'Pizza / sliders (handheld mains)', category: 'food', qtyPer: 4, qtyFlat: 1, unit: 'pizza', where: ['Grocery', 'Pizza shop', 'Costco'], unitCostRange: [10, 18], essential: true, buyAt: 'T0', note: 'Roughly 2–3 large pizzas per 10 guests; order delivery for kickoff if not baking.', alternatives: ['Frozen pizza (Costco/DiGiorno) — cheaper than delivery', 'Slider rolls + deli meat — budget handheld option'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['pizza-chain-primary-2026', 'frozen-pizza-2026', 'buns-walmart-2026'], lastVerified: '2026-08-18', claim: 'Handheld mains per pizza, from PRIMARY chain sources. Dominos publishes a Mix and Match at $6.99 each for two or more items including a two-topping pizza; Papa Johns publishes a create-your-own large at $9.99; Papa Murphys take-and-bake large is $10.99 ($9.99 on its pepperoni promotion). Frozen: a 24.7oz rising crust is $7.29. THESE ARE ADVERTISED DEAL PRICES, NOT MENU PRICES - every chain disclaims that franchise prices vary, and none publishes an a-la-carte national figure, so this band\'s ceiling covers a non-promotional or specialty pie.', sufficientWhen: 'A local store\'s own online price for a large pizza, against the published national deal, confirms how far a given market sits above the band\'s floor.' }, },
    { id: 'p_dessert', item: 'Brownies, cookies & snack mix', category: 'food', qtyPerGuest: 1, unit: 'serving', where: ['Grocery', 'Bakery'], unitCostRange: [1, 3], essential: false, buyAt: 'T-1d', alternatives: ['Store-brand cookies — cheapest dessert option', 'Brownies from box mix — budget bake, tastes homemade'] , provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['warehouse-trays-2026', 'snacks-format-2026', 'bakery-cake-retail-2026'], lastVerified: '2026-08-18', claim: 'Sweets and snack mix per serving. Warehouse cookies are $9.99 for 24 ($0.42 each) rising to $12.43 on a delivery marketplace; bakery brownies price with the grocery-bakery tier. SNACK MIX is $0.29-0.31 an ounce in party size and $0.37-0.43 single-serve. A cookie plus a scoop of mix lands in this band.', sufficientWhen: 'A cookie box divided per piece and a party mix bag divided per serving confirm the band.' }, },
    { id: 'p_drinks', item: 'Beer + soda + water', category: 'beverage', qtyPerGuest: 4, unit: 'drinks', where: ['Grocery', 'Costco', 'Liquor store'], unitCostRange: [1, 3], essential: true, buyAt: 'T-3d', note: 'A ~3.5h game means grazing/sipping the whole time — plan ~1 drink/guest/hour plus a buffer.', provenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'researched', sources: ['bar-provision-2026'], note: 'Grounded to bar-provision-2026: ~1 drink/guest/hour (~3–4 over a 3–4h window) is the source-stated party drink rate.', claim: 'A 3–4 hour game yields ~3–4 total drinks/guest at ~1 drink/guest/hour, split across beer, soda, and water', sufficientWhen: 'Standard US bartending or event-planning guide confirms the ~1 drink/guest/hour rule applied to a 3–4h watch-party window' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['beer-retail-2026', 'beer-budget-2026', 'soda-12pack-2026', 'bottledwater-case-2026'], lastVerified: '2026-08-16', claim: 'This band is a SUM of separately-priced drink families, not a single quoted item: domestic lager $0.80-1.20 per 12oz (about $20-22 a 24-pack), craft $1.50-3.00; soda $0.25-0.60 a can ($3.00-6.50 a 12-pack); bottled water about $0.17-0.38 a bottle ($4-9 a 24-pack). Each component is cited to its own registered source; the summed band is therefore low-confidence by construction.', sufficientWhen: 'Current shelf prices for one pack of each named component at the same store, summed to the per-serving band, confirm the range.' } },
    { id: 'p_ice', item: 'Ice (coolers + drinks)', category: 'beverage', qtyPerGuest: 1.5, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1.5 lb/guest to chill drinks indoors; top up at halftime.', provenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'researched', sources: ['bar-provision-2026'], note: 'Grounded to bar-provision-2026: ~1.5 lb ice/guest is within the source-stated ice provisioning rate.', claim: 'Indoor watch-party drink chilling requires ~1.5 lb ice/guest, on the lower end of the ~1–2 lb standard party range', sufficientWhen: 'Standard US event-planning or catering guide confirms the ~1–2 lb/guest ice range and that indoor events land at the lower end' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['ice-retail-2026', 'ice-warehouse-2026'], lastVerified: '2026-08-16', claim: 'Bagged ice 2026: warehouse clubs run 10-12c per pound (a 20lb bag is $1.75-2.50 at Sams Club, $1.80-2.50 at Costco); grocery and gas-station bags cluster 23-31c/lb (BJs and 7-Eleven 20lb about $4.49-4.79, Giant 20lb $4.99, Publix 16lb $4.99); small bags and hardware stores reach 41-45c/lb. Convenience ice is more than four times warehouse ice per pound.', sufficientWhen: 'Current shelf prices for one 20lb bag at a warehouse club and one at a grocery store confirm the per-pound spread.' } },
    { id: 'p_tableware', item: 'Paper plates, napkins, cups, cutlery', category: 'logistics', qtyPerGuest: 2, unit: 'set', where: ['Grocery', 'Costco', 'Party store'], unitCostRange: [0.25, 2.5], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: people grab a fresh plate/cup every visit to the food table — buy ~2 sets/guest, plus small plates for dips.' , costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['disposables-bulk-2026', 'disposables-partyqty-2026'], lastVerified: '2026-08-15', claim: 'A per-guest place setting runs $0.25-2.50 depending entirely on channel: bulk restaurant supply puts plates at $0.08-0.15 each and foam at $0.09, a grocery shelf puts the same basic paper plate at $0.25-0.40, and premium plastic or compostable runs $0.15-0.35 per plate. A setting is 2-3 plates, 2-3 cups, cutlery and 2-3 napkins.', sufficientWhen: 'Re-checked against per-plate pricing and place-setting norms. A deep bulk buy lands near the floor and premium or compostable near the ceiling - the 12x spread is the CHANNEL, not uncertainty. Add 10-15% for spills and unexpected guests. Sets that bundle flutes, koozies, linens or table covers are a different product and are priced separately.' } },
    { id: 'p_serveware', item: 'Serving setup consumables (toothpicks, foil, sterno) — assumes host already owns a slow cooker/warming tray', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Party store'], unitCostRange: [10, 30], essential: false, buyAt: 'T-3d', note: 'A slow cooker keeps chili/dip hot all game so the host can sit down. This band prices the consumables only — a slow cooker ($55-75) or warming tray ($65-80) bought new is a separate purchase, see alternatives.', alternatives: ['Buy a slow cooker or warming tray — $55-80 new if the host does not already own one'], provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['buffet-equipment-2026', 'picks-toothpicks-2026'], lastVerified: '2026-08-18', claim: 'A 6qt slow cooker runs $54.99-74.99 new; an electric warming tray $64.99-79.99 new (both excluded from this band). Foodservice toothpicks run $0.0065-0.0152 each. Item renamed and reframed 2026-08-18: the $10-30 band only ever fit consumables (foil, toothpicks, sterno fuel), not a new appliance purchase, so the item name and note now say so explicitly instead of implying the appliance is bought at this price.', sufficientWhen: 'A sterno-fuel and disposable-foil-pan price confirms the consumables-only band directly.' } },
    { id: 'p_cleanup', item: 'Trash + recycling bags, paper towels', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [7, 18], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: trash fills fast on game day — extra bags + a separate recycling bag for cans/bottles, swapped at halftime.' , costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['costco-cleaning-2026', 'trashbags-retail-2026'], lastVerified: '2026-08-15', claim: 'A cleanup kit runs $7-18 as the SUM of its parts: about a dozen trash and recycling bags at 10 cents each from a warehouse or 11-15 cents at grocery, two rolls of paper towels at about $1.97 warehouse, and a canister of wipes at about $4.27 or a dish-soap pack at $14.74 shared across events.', sufficientWhen: 'CONFIDENCE IS LOW ON PURPOSE: no source prices a cleanup kit, because nobody sells one. This band is a sum of individually-priced components, so treat it as an envelope rather than a quote. The spread is the CHANNEL - warehouse packs against a grocery shelf - and a host who already owns soap and towels lands well under the floor. Kits that also carry gloves, foil or to-go containers are a different bundle.' } },
    // ── Major-event-specific purchases (whenChoice-gated on major_event; see
    //    file header) — invisible unless the host names that event, so the
    //    football default's item list and totals are byte-identical to before.
    // Provenance carries no `sources` array here on purpose — these are cultural/
    // tradition claims (CFP's own tailgate coverage; multiple Derby history
    // writeups, 2026-09-13 WebSearch), not registered against QTY_SOURCES/
    // COST_SOURCES. Claiming `sources` without a resolving registry id is exactly
    // what knowledgeInventory.js's 'ambiguous' state exists to catch (sources
    // listed, grounding predicate fails) — same reason p_chips/p_chili/
    // p_pizza_sliders below carry the real context only in `note` prose, not a
    // formal sources array, at this same 'estimate' tier.
    // category: 'logistics', not 'decor' — 'decor' passes the schema linter
    // but the shopping-list engine's Supplies loop (playbooks/index.js ~4218)
    // only recognizes food/beverage (its own loop) or a non-food/beverage
    // category THAT IS ALSO essential:true — non-essential logistics/decor/
    // cleanup rows are filtered out of the list entirely, not just hidden by
    // default. Confirmed live: with essential:false this item never appeared
    // in "The spread & shopping," at any category. `essential: true` here
    // reads honestly once whenChoice has already gated it to CFB National
    // Championship specifically — team colors ARE the defining atmosphere
    // for that event the same way wings are for the Super Bowl, not an
    // optional extra once a host has named this as the event.
    { id: 'p_teamcolors', item: 'Team colors gear & tailgate decor (flags, banners, face paint)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Party store', 'Team store', 'Online'], unitCostRange: [15, 40], essential: true, buyAt: 'T-3d', whenChoice: { id: 'major_event', in: ['College Football National Championship'] }, note: 'A championship watch party leans into school colors the same way fans dress for the stadium tailgate — the College Football Playoff\'s own championship-week coverage explicitly encourages fans to show up in team colors and gear, with flags and banners as the defining decor.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, alternatives: ['Paper goods in team colors — cheaper than dedicated gear', 'Ask each guest to just wear their own team colors — zero cost'] },
    { id: 'p_mintjulep', item: 'Mint julep bar (bourbon, fresh mint, simple syrup, crushed ice)', category: 'beverage', qtyFlat: 1, unit: 'kit', where: ['Liquor store', 'Grocery'], unitCostRange: [30, 55], essential: false, buyAt: 'T-1d', whenChoice: { id: 'major_event', in: ['Kentucky Derby'] }, note: 'The signature Derby drink since the 1930s — bourbon, mint, and simple syrup over crushed ice. One 750ml bottle pours roughly 12-16 juleps.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, alternatives: ['Pre-made mint julep mix — cheaper, less prep', 'Mocktail version (mint, lime, simple syrup, soda) — no alcohol'] },
    // ── 2026-09-13 SECOND PASS additions — every provenance/costProvenance
    //    value below was built through the real KCR pipeline (see file header)
    //    and matches exactly what publishKCR approved; it is not hand-typed.
    { id: 'p_ballparksnacks', item: 'Ballpark snacks (hot dogs, peanuts, Cracker Jack)', category: 'food', qtyPerGuest: 1, unit: 'serving', where: ['Grocery', 'Costco'], unitCostRange: [2, 4], essential: true, buyAt: 'T-1d', whenChoice: { id: 'major_event', in: ['World Series'] }, note: 'The ballpark-food tradition behind "Take Me Out to the Ball Game" — hot dogs, peanuts and Cracker Jack, brought home for the watch party.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['hotdogs-retail-2026', 'hotdogs-costco-2026', 'peanuts-costco-2026', 'crackerjack-retail-2026'], lastVerified: '2026-09-13', claim: 'A per-guest ballpark-snacks serving (about 1.5 hot dogs + a handful of in-shell peanuts + one Cracker Jack box) sums three separately-priced retail lines: hot dogs $0.79-1.30 each (LatestCost retail average, Kroger receipt example, Costco Kirkland bulk pack); in-shell peanuts $1.20-1.40/lb (Costco 5lb bag); Cracker Jack $0.38-0.57 per 1.25oz box (Costco vs. Sam\'s Club, same product, a full box apart).', sufficientWhen: 'Current per-unit prices for one hot dog pack, one peanut bag and one Cracker Jack multipack at the same store, summed at the per-guest ratio, confirm the band.' }, alternatives: ['Ballpark-brand hot dogs only, skip the peanuts/Cracker Jack — cheaper, still on-theme', 'Add nachos or a pretzel bar for a bigger spread'] },
    { id: 'p_pimentocheese', item: 'Pimento cheese tea sandwiches (Masters tradition)', category: 'food', qtyPerGuest: 2, unit: 'sandwich', where: ['Grocery'], unitCostRange: [1, 2.5], essential: true, buyAt: 'T-1d', whenChoice: { id: 'major_event', in: ['The Masters'] }, note: 'Augusta National\'s own concession stand has sold a $1.50 pimento cheese sandwich since 2002 — the tournament\'s signature food. This band prices making the same sandwich (cheese, mayo, pimento, bread) at home, which costs less than the concession-stand price.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized', note: 'Augusta National\'s own $1.50 pimento cheese sandwich (NBC New York, Golf Monthly and NPR all confirm the 2026 concession price, unchanged since 2002) is the reason this item belongs in the playbook, but it prices a tournament CONCESSION STAND, not a host\'s grocery list — using it to ground a home-shopping cost band would price the wrong transaction. The home cost stays an honest, unsourced estimate for bread/cheese/mayo/pimento ingredients.' }, alternatives: ['Egg salad tea sandwiches alongside — Augusta\'s other classic', 'Buy pre-made pimento cheese spread instead of mixing from scratch — faster, slightly more expensive'] },
    { id: 'p_worldcupcolors', item: 'National flags, jerseys & face paint (supported country)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Party store', 'Online'], unitCostRange: [15, 40], essential: true, buyAt: 'T-3d', whenChoice: { id: 'major_event', in: ['World Cup'] }, note: 'World Cup watch parties center on flags, jerseys and face paint in the colors of the country being cheered for — the same fan-culture role team colors play at a College Football Championship party.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized', note: 'Flags, jerseys and face paint for the supported nation are a well-documented World Cup watch-party tradition (KPBS photo coverage; usflags.com on why fans display national flags), but no single confirmed unit retail price was found in this research pass — marketplace listings for flag/scarf/face-paint kits did not return a stable price. Cost stays an honest estimate, in the same $15-40 decor-kit band as the structurally identical CFB team-colors item, pending a real price source.' }, alternatives: ['Ask each guest to wear their own country\'s colors — zero cost', 'Flag bunting/string decorations only, skip individual face paint — cheaper'] },
  ],

  rentalsGap: [
    { item: 'Coolers (drinks + ice)', qtyPerGuest: 0.1, note: 'roughly one cooler per ~10 guests so the fridge stays free for food' },
    { item: 'Folding / extra chairs', qtyPerGuest: 0.5, note: 'couches fill fast — borrow extra seating so everyone can see the screen' },
    { item: 'Second screen / projector', qtyFlat: 1, note: 'optional — a second TV or projector for a big crowd or split rooms' },
    { item: 'Folding table', qtyFlat: 1, note: 'a dedicated food + drinks station off the coffee table' },
  ],

  vendors: [
    { category: 'Pizza / wing delivery', required: false, altToDIY: 'Bake wings + pizza at home', when: 'T-1d (pre-order)', costRange: [8, 15], costUnit: 'per guest' },
    { category: 'Party platter / catering', required: false, altToDIY: 'Host makes the spread', when: 'T-3d', costRange: [10, 20], costUnit: 'per guest' },
    { category: 'Chair / table rental', required: false, altToDIY: 'Borrow folding chairs from friends', when: 'T-7d', costRange: [30, 100], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_kickoff', trigger: 'Food not ready when the game starts', severity: 'high', mitigation: 'Back-time the cook so everything is OUT ~30 min before kickoff; use the slow cooker for hot dishes; pre-order pizza for delivery at kickoff.' },
    { id: 'r_stream', trigger: 'Game not on / stream or channel fails', severity: 'high', mitigation: 'Test the exact channel/stream at 3 days out; know the backup (antenna, alternate app, or a nearby bar) before guests arrive.' },
    { id: 'r_drinks', trigger: 'Run out of drinks or ice mid-game', severity: 'med', mitigation: 'Buy a buffer (~4 drinks + ~1.5 lb ice/guest); top up ice at halftime; ask a guest to do a beer run.' },
    { id: 'r_seating', trigger: 'Not enough seats / bad sightlines', severity: 'med', mitigation: 'Borrow extra chairs; arrange seating toward the screen before anyone arrives.' },
    { id: 'r_trash', trigger: 'Trash/recycling overflows, surfaces get sticky', severity: 'low', mitigation: 'Put out a clearly-marked recycling bag for cans; swap trash bags at halftime; keep paper towels at the food table.' },
    { id: 'r_derby_time', trigger: 'Guests miss the actual race — it is over in about two minutes', severity: 'med', mitigation: 'Post time is announced well ahead — call it out 10 minutes before, get everyone off their phones and in front of the screen, and hold any toast until after the race, not during it.' },
    { id: 'r_rivalry', trigger: 'Mixed-fandom tension between the two schools\' fans in the room', severity: 'low', mitigation: 'Keep it lighthearted — split seating by team side if it helps, and set the tone before kickoff that it stays fun.' },
  ],

  contingencies: [
    { id: 'c_kickoff', when: 'r_kickoff', plan: 'If the cook is running late, put out chips/dips immediately and let hot food trickle out; pizza delivery covers the gap.' },
    { id: 'c_stream', when: 'r_stream', plan: 'Switch to the backup app/antenna; if all else fails, the group decamps to a nearby sports bar.' },
    { id: 'c_drinks', when: 'r_drinks', plan: 'Send a guest on a quick beer/ice run; stretch the bar with soda + water until they\'re back.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Beer, soda, water, chips, shelf dips, disposables, cleanup kit' },
      { when: 'T-1d', what: 'Wings, chili fixings, fresh dips, cheese, produce, dessert' },
      { when: 'T0', what: 'Ice (and pizza delivery / fresh pickup)' },
    ],
    preparation: [
      { when: 'T-1d', what: 'Make chili + dips ahead; thaw wings; clear fridge space for drinks' },
      { when: 'T0 -1:30', what: 'Cook wings + hot food, back-timed to be ready before kickoff' },
    ],
    setup: [
      { when: 'T0 -4h', what: 'Confirm the stream or channel works — actually load it, don’t assume' },
      { when: 'T0 -3h', what: 'Drinks on ice; seating arranged so everyone can see the screen' },
      { when: 'T0 -1h', what: 'Coolers + ice, food + drinks table, extra seating toward the screen' },
      { when: 'T0 -0:30', what: 'Food OUT and ready; slow cooker on; trash + recycling bins set; stream/channel confirmed' },
    ],
    program: [
      { when: 'T0 +5m', what: 'Doors: TV on the pre-game, drinks on ice, seats claimed' },
      { when: 'T0 +45m', what: 'Kickoff — food already out so nobody’s in the kitchen' },
      { when: 'T0 +1:45', what: 'Halftime: hot food refresh, refill drinks, bathroom rotation' },
      { when: 'T0 +2:15', what: 'Second half' },
      { when: 'T0 +3:30', what: 'The finish — let the room have it' },
      { when: 'T0 +4:05', what: 'Wind down: to-go plates, rides checked for anyone who’s been drinking' },
    ],
    cleanup: [
      { when: 'during', what: 'Keep hot food refreshed at the breaks and cold drinks on ice; watch anyone who’s drinking through a long game' },
      { when: 'halftime', what: 'Restock food, swap trash bag, bag cans for recycling, top up ice' },
      { when: 'T0 +4h', what: 'Pack leftovers, bag trash/recycling, wipe surfaces, run the dishwasher' },
    ],
  },

  knowledge: {
    governanceVersion: '1.2.0',
    verificationStatus: 'synthesized',
    note: 'Quantities reflect common US game-day hosting rules of thumb: Super Bowl portions run large (~1 lb / about 10–12 wings per guest grazing all afternoon), ~1 drink per guest per hour over a ~3.5h game (≈3–4 drinks/guest, split across beer/soda/water), ~1.5 lb ice per guest for indoor drink-chilling (the lower end of the 1–2 lb party rule), roughly 2–3 large pizzas per 10 guests, and ~2 disposable plate/cup sets per guest since people refresh every trip to the food table. The defining constraint of a watch party is timing — food ready ~30 min before kickoff and a halftime refresh — not headcount. Authored as established-consensus / trade-heuristic and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources. 2026-09-13 FIRST PASS: added the `major_event` identification decision plus event-specific purchases/risks/heartMoments for College Football National Championship (team-colors decor) and Kentucky Derby (mint julep) and a cost-coverage decision for UFC/Boxing — hand-authored with informal citations, NOT run through this codebase\'s KCR governance pipeline (createKCR/addEvidence/review/publishKCR). Disclosed and corrected per host directive. 2026-09-13 SECOND PASS: added World Series (ballpark snacks), The Masters (pimento cheese) and World Cup (national colors) purchases, and heartMoments for NBA Finals, Stanley Cup Final and Olympics. Every purchase provenance/costProvenance claim was built end-to-end through the real KCR functions (createKCR/addEvidence/setProposal/recordReview/advanceKCR/publishKCR — every gate genuinely executed and passed, verified in a one-time generator test, not hand-simulated), reviewed by Claude under Todd Willis\'s explicit standing delegation of the sme/editorial/governance roles (2026-09-13). Only the World Series ballpark-snacks cost claim earned tier `researched` (4 dated 2026 retail sources genuinely price a home-shopping list); the Masters and World Cup cost claims stayed honestly at `estimate` because their real, corroborated evidence (Augusta\'s $1.50 concession-stand sandwich; World Cup flag/jersey fan culture) prices a different transaction than a host\'s grocery run. The reviewed results were NOT committed to publishedKcrs.json/publishedKnowledge.json: running the full test suite showed that transport carries a hard, tested invariant (wave0HostProof.test.js — cited-only, and visible in a baseline event with nothing answered) that whenChoice-gated conditional content cannot satisfy; forcing it in would have weakened a real safety property, so these values are authored directly instead, same as every other estimate-tier line here — a disclosed gap (decision-gated content has no path through today\'s KCR transport), not a shortcut. heartMoments for NBA Finals/Stanley Cup/Olympics were NOT run through KCR at all — prose has no governable fieldPath in this codebase (see governedOwnership.js), a real architectural limit. "Regular season game / other" intentionally received no dedicated content — it is the generic fallback. The football-default path (Super Bowl, unanswered major_event) is unchanged in both passes. The run-of-show (schedules.program) still assumes one continuous football-shaped game for every major_event answer — NOT yet differentiated; a genuine per-event timeline remains disclosed follow-up work.',
    sources: [],
  },
};

export default watchParty;
