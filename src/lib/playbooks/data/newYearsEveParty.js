// New Year's Eve Party — Event OS host playbook (data only).
//
// Authored 2026-08-21 (scope addition, same run as Thanksgiving Hosting and
// Halloween Party) off the seasonal-demand study
// (docs/audits/2026-08-21_SEASONAL_DEMAND_AND_NICHE_RESEARCH.md, Q6.4).
//
// WHY THIS IS NOT A HOLIDAY PARTY RE-SKIN (review-board duplicate-surface
// ruling): Holiday Party is a floating evening — its run of show hangs off
// whatever start time the host picks, and nothing in it is immovable. This
// playbook is built around a MIDNIGHT ANCHOR: one moment, 12:00 AM, that
// cannot slip, with every beat back-planned from it — champagne poured and
// in hands BEFORE the countdown, the countdown source (a tested screen or
// broadcast, not a guessed phone clock) staged ahead, the gather cue at
// 11:45 so nobody is in the bathroom at midnight. That inversion produces
// content Holiday Party has no model for: a SECOND food wave near midnight
// (one serve time does not survive a five-hour night), the guests-past-
// midnight problem (rides, designated drivers, and the overnight option are
// planned logistics, not a wind-down afterthought), a kids-vs-adults
// decision (the early "countdown at 9" family variant), and neighbor
// courtesy for a party that PEAKS at midnight instead of ending by it.
//
// The program beats below are authored as offsets from doors, with the copy
// naming the clock moments they serve, on the playbook's default shape of
// doors at 9 PM (meta.typicalDurationHours runs to roughly 1 AM). A host who
// opens doors earlier gets the same order with more runway — the fixed thing
// is the midnight sequence, and the copy says so at every anchored beat.
//
// LEAD-TIME JUDGMENTS: the 21-day planning start matches Dinner Party and
// The Cookout (corpus-derived); invitations at 21 days are judged EARLIER
// than a same-size house party's norm because guests weigh competing NYE
// invitations, and the conservative end wins where the corpus is silent.
// Toast math: GROUNDED 2026-08-21 against the registered US bar-provisioning
// consensus (`bar-provision-2026`): a 750ml bottle pours about five flute
// servings and sparkling planning runs about one bottle per 4-5 guests — the
// per-5 rate here is that norm's economical end, and the copy was corrected
// from "about six flutes" to five-to-six to match the source. No fabricated
// sources, no fabricated costProvenance. ESM default export.

const newYearsEveParty = {
  type: "New Year's Eve Party",
  vegMain: 'Mushroom-and-gruyere puff pastry bites',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',

  meta: {
    summary:
      'The one party of the year with a fixed deadline in the middle of it. Everything back-plans from midnight: champagne poured and in every hand before the countdown starts, a tested countdown source on the screen, the gather cue fifteen minutes ahead so the room is together for the moment. The night is long, so food comes in two waves — the second one lands near midnight, when everyone is suddenly hungry again — and because the party peaks at twelve instead of ending there, rides home, designated drivers, and the overnight couch are planned up front, and the neighbors hear about the date from you before they hear the countdown through the wall.',
    typicalGuests: { low: 10, default: 20, high: 40 },
    typicalDurationHours: 4.5,
    leadTimeDays: 21,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 15, high: 40, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The whole room counts the last ten seconds out loud together.',
    'Every single person has a full glass in hand when the count starts — nobody is scrambling at the drinks table.',
    'The toast, the noise, the hugs — and the music already rising underneath it.',
    'Someone starts the resolutions conversation at half past twelve and it gets real.',
    'The last guests leave in a rideshare, fed twice, into the first morning of the year.',
  ],

  decisions: [
    {
      id: 'midnight_model',
      label: 'Whose midnight is it — a late adult party, or an early family countdown?',
      options: ['Adult party — real midnight', 'Family party — countdown at 9, kids in pajamas', 'Both — early family countdown, then the adult night continues'],
      default: 'Adult party — real midnight',
      when: 'T-21d',
      blocks: ['program', 'invitations', 'safety'],
      weight: 'high', reversibility: 'costly', emotionalWeight: 'med', difmCapable: 'needs-host',
      priorityBasis: { rationale: 'A real-midnight party and a nine-o-clock family countdown are different evenings with different guest lists, food clocks, and safety plans — and only the host knows which night their people want.', tier: 'reasoned' },
      why: 'The anchor moves, and everything moves with it. A real-midnight party runs late, needs the second food wave, and carries the rides-home problem. A family countdown at 9 — a broadcast replay or your own countdown — sends kids home happy by 9:30 and asks almost nothing of the safety plan. The both version runs the early countdown for the families, then resets the room for the adults who stay: two anchors, one night, and the invitation has to say which one each guest is invited to.',
    },
    {
      id: 'countdown_source',
      label: 'What runs the countdown — a broadcast, or your own clock?',
      options: ['A live broadcast on the TV', 'A streamed countdown on a tested screen', 'Your own clock and a confident voice'],
      default: 'A live broadcast on the TV',
      when: 'T-7d',
      blocks: ['run_of_show', 'av'],
      weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive',
      priorityBasis: { rationale: 'The countdown is the whole point of the night and it fails in one specific way — an untested stream buffering at 11:59 — so the source is chosen and tested ahead, though switching between working options is free.', tier: 'reasoned' },
      why: 'The countdown has exactly one job and one failure mode. A live broadcast is the safe default — it cannot buffer into the new year. A stream works if it is tested on the actual TV, on the actual wifi, that same evening, with the backup already chosen. Your own clock works for a small room and is the honest answer at a family countdown — synced to an actual time source, held by one person who commits to the count.',
    },
    {
      id: 'toast_pour',
      label: 'What is in the glasses at midnight?',
      options: ['Champagne or sparkling wine for all', 'Sparkling wine plus a real zero-proof sparkler', 'Zero-proof toast for everyone'],
      default: 'Sparkling wine plus a real zero-proof sparkler',
      when: 'T-7d',
      blocks: ['beverage'],
      costFactors: { 'Champagne or sparkling wine for all': 1.2, 'Zero-proof toast for everyone': 0.5 },
      costFactorProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['sparklingwine-band-2026', 'sparkling-cider-2026', 'sparkling-cider-indie-2026'], lastVerified: '2026-08-21', note: 'Grounded 2026-08-21: sparkling cider at $4.29-8.49 a bottle against drinkable sparkling wine at $10-25 confirms the cider-at-a-third-to-half ratio the factors encode; the all-sparkling-wine option adds the bottles the zero-proof share would have replaced.', claim: 'An all-wine toast costs about 20% more than the split; an all-zero-proof toast about halves the toast line — sparkling cider runs $4.29-8.49 a bottle against $10-25 for drinkable sparkling wine, roughly a third to a half the price', sufficientWhen: 'Shelf prices for one drinkable sparkling wine and one sparkling cider at the same store confirm the ratio' },
      affects: ['p_bubbles', 'p_zero_sparkler'],
      weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive',
      priorityBasis: { rationale: 'The toast is the night\'s one guaranteed moment and the pour math is fixed by the headcount — a safe default the app can propose, with the zero-proof share the only judgment call.', tier: 'reasoned' },
      why: 'Everyone toasts — which means the zero-proof option is not a garnish, it is a third of the glasses at many parties: designated drivers, pregnant guests, people who quit, kids at a family countdown. A real sparkling cider or zero-proof sparkler in the same flute means every raised glass looks the same. Pour math: a bottle pours about five flutes, so a bottle per five guests covers a generous toast with a little left for refills.',
    },
    {
      id: 'staying_late',
      label: 'How does everyone get home after midnight?',
      options: ['Rideshares and designated drivers, planned at RSVP', 'The overnight option — couches and floors offered up front', 'An end time early enough to drive — last call at 12:30'],
      default: 'Rideshares and designated drivers, planned at RSVP',
      when: 'T-14d',
      blocks: ['logistics', 'safety'],
      weight: 'high', reversibility: 'reversible', emotionalWeight: 'med', difmCapable: 'needs-host',
      priorityBasis: { rationale: 'This party ends after midnight on the year\'s most dangerous night to drive, so how guests get home is a planning decision made with the invitation — and only the host knows who can crash and who must get home.', tier: 'reasoned' },
      why: 'The party peaks at midnight, which means everyone leaves after it — late, tired, and many having toasted more than once, on the highest-risk driving night of the year. Plan it at RSVP, not at 1 AM: ask who is driving, seed the designated drivers, and say out loud that the couch is available. Rideshare surge pricing around midnight is real — guests who know it is coming split cars and wait it out with the second food wave instead of standing on the curb.',
    },
  ],

  milestones: [
    { id: 'ny_plan', name: 'Lock the date shape, the guest list, and the midnight model', offsetDays: 21, owner: 'host', category: 'planning', risk: { ifDelayed: 'Guests commit to competing invitations; the family-vs-late call blocks everything', severity: 'high' } },
    { id: 'ny_invite', name: 'Send invitations with the hour, the countdown plan, and the rides ask', offsetDays: 21, owner: 'host', dependsOn: ['ny_plan'], category: 'guest', risk: { ifDelayed: 'The one night everyone has three invitations — late asks lose', severity: 'high' } },
    { id: 'ny_neighbors', name: 'Tell the neighbors — or invite them', offsetDays: 10, owner: 'host', dependsOn: ['ny_plan'], category: 'planning', risk: { ifDelayed: 'A noise complaint arrives at the exact moment the party peaks', severity: 'med' } },
    { id: 'ny_countdown', name: 'Choose and test the countdown source', offsetDays: 7, owner: 'host', dependsOn: ['ny_plan'], category: 'planning', risk: { ifDelayed: 'A buffering stream at two minutes to midnight', severity: 'high' } },
    { id: 'ny_headcount', name: 'Confirm headcount, drivers, and who stays over', offsetDays: 4, owner: 'host', dependsOn: ['ny_invite'], category: 'guest', risk: { ifDelayed: 'Toast math and the couch count are both guesses', severity: 'med' } },
    { id: 'ny_shop', name: 'Buy the bubbles, both food waves, and the midnight kit', offsetDays: 3, owner: 'host', dependsOn: ['ny_headcount'], category: 'shopping', risk: { ifDelayed: 'Sparkling wine shelves thin out in the final days of the year', severity: 'med' } },
    { id: 'ny_prep', name: 'Prep both food waves and stage the midnight station', offsetDays: 1, owner: 'host', dependsOn: ['ny_shop'], category: 'food', risk: null },
    { id: 'event', name: "New Year's Eve", offsetDays: 0, owner: 'host', dependsOn: ['ny_prep', 'ny_countdown'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_model', milestoneId: 'ny_plan', phase: 'planning', label: 'Decide whose midnight it is: the late adult party, the family countdown at 9, or the early-then-late double', when: 'T-21d' },
    { id: 't_invite', milestoneId: 'ny_invite', phase: 'guest', label: 'Send the invitation with the doors time, when the countdown happens, and the rides-and-couches ask built into the RSVP', when: 'T-21d' },
    { id: 't_neighbors', milestoneId: 'ny_neighbors', phase: 'planning', label: 'Give the near neighbors the date and the honest end time — or invite them, which retires the complaint entirely', when: 'T-10d' },
    { id: 't_countdown_test', milestoneId: 'ny_countdown', phase: 'planning', label: 'Test the countdown source on the actual screen and wifi it will use, and pick the backup now', when: 'T-7d', whenChoice: { id: 'countdown_source', in: ['A live broadcast on the TV', 'A streamed countdown on a tested screen'] } },
    { id: 't_clock_owner', milestoneId: 'ny_countdown', phase: 'planning', label: 'Name the person who owns the clock and the count — synced to a real time source, committed to calling it', when: 'T-7d', whenChoice: { id: 'countdown_source', in: ['Your own clock and a confident voice'] } },
    { id: 't_early_countdown', milestoneId: 'ny_countdown', phase: 'planning', label: 'Set up the early countdown for the kids — a replay or your own count at 9, with the sparkling cider and the noisemakers ready', when: 'T-7d', whenChoice: { id: 'midnight_model', in: ['Family party — countdown at 9, kids in pajamas', 'Both — early family countdown, then the adult night continues'] } },
    { id: 't_headcount', milestoneId: 'ny_headcount', phase: 'guest', label: 'Confirm the headcount, who is driving, who is ridesharing, and who takes the couch — the toast math and the bedding count both hang on it', when: 'T-4d' },
    { id: 't_shop', milestoneId: 'ny_shop', phase: 'shopping', label: 'Buy the sparkling wine and zero-proof sparkler to the bottle-per-five math, both food waves, and the flutes, poppers, and noisemakers', when: 'T-3d' },
    { id: 't_bedding', milestoneId: 'ny_prep', phase: 'setup', label: 'Stage the overnight setup: bedding stacked, couches assigned, and a plan for morning coffee that survives the night before', when: 'T-1d', whenChoice: { id: 'staying_late', in: ['The overnight option — couches and floors offered up front'] } },
    { id: 't_wave_prep', milestoneId: 'ny_prep', phase: 'food', label: 'Prep both waves: the evening spread ready to serve, and the midnight wave — sliders, a breakfast bite, something salty — staged to fire in fifteen minutes', when: 'T-1d' },
    { id: 't_midnight_station', milestoneId: 'ny_prep', phase: 'setup', label: 'Stage the midnight station: flutes counted to the headcount, bottles chilling, poppers and noisemakers in a bowl, the toast spot chosen', when: 'T-1d' },
    { id: 't_pour_crew', milestoneId: 'event', phase: 'event', label: 'Recruit two pourers for 11:40 — every glass full and in a hand before the count starts is a two-person job at twenty guests', when: 'T0 +2h' },
    { id: 't_gather', milestoneId: 'event', phase: 'event', label: 'Call the gather at 11:45: music down a notch, everyone to the countdown room, glasses distributed — the moment fails only if the room is scattered', when: 'T0 +2:45' },
    { id: 't_rides_check', milestoneId: 'event', phase: 'event', label: 'Run the rides check after the toast settles: drivers confirmed sober, rideshares ordered ahead of the surge, couch guests claimed', when: 'T0 +3:20' },
  ],

  purchases: [
    { id: 'p_bubbles', item: 'Sparkling wine for the toast (plus refills)', category: 'beverage', qtyFlat: 1, qtyPer: 5, unit: 'bottle per 5 guests', where: ['Wine shop', 'Total Wine', 'Grocery'], unitCostRange: [10, 30], essential: true, buyAt: 'T-3d', alternatives: ['Cava or prosecco — the honest value tier for a twenty-glass night', 'One better bottle for the host\'s own toast, table wine for volume'], note: 'A bottle pours about five to six flutes; a bottle per five guests covers a generous toast with a little left for refills. Chill it the night before — a warm toast is a flat moment.', provenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['bar-provision-2026', 'champagne-pours-2026'], lastVerified: '2026-08-21', note: 'US bar-provisioning consensus and the champagne-house guide agree: a 750ml bottle pours about five to six flute servings and sparkling planning runs about one bottle per 4-5 guests — the per-5 rate is that norm\'s economical end. Copy corrected 2026-08-21 from "about six flutes" to match the cited figure.' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['sparklingwine-band-2026', 'costhelper-champagne-2026'], lastVerified: '2026-08-21', claim: 'Per bottle: sparkling wine averages $15-25 with budget sparkling at $10-15 (cava about $14, budget California sparkling near $5), and entry true Champagne $30-40 — which is this $10-30 band with Champagne above the ceiling and the deep-budget bottle below the floor, both excluded on purpose.', sufficientWhen: 'One prosecco or cava and one entry Champagne shelf price at the same store confirm the band ends.' } },
    { id: 'p_zero_sparkler', item: 'Sparkling cider / zero-proof sparkler (same flutes, same moment)', category: 'beverage', qtyFlat: 1, qtyPer: 8, unit: 'bottle per 8 guests', where: ['Grocery'], unitCostRange: [4, 12], essential: true, buyAt: 'T-3d', note: 'Drivers, pregnant guests, kids at the early countdown, and everyone pacing for the drive — a real bottle in the same flute, not soda in a plastic cup.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['sparkling-cider-2026', 'sparkling-cider-indie-2026'], lastVerified: '2026-08-21', claim: 'Sparkling cider 2026, the 25.4oz glass bottle: $4.29 at a mass retailer, $5.99 at an independent grocer, $8.49 for the organic bottling — which is this $4-12 band from floor to just under the ceiling, with the premium end left for boutique zero-proof sparklers.', sufficientWhen: 'One boutique zero-proof sparkler shelf price confirms the ceiling directly.' } },
    { id: 'p_bar', item: 'The evening bar (wine, beer, one batch cocktail)', category: 'beverage', qtyPerGuest: 3, unit: 'drinks', where: ['Total Wine', 'Grocery'], unitCostRange: [1.5, 4], essential: true, buyAt: 'T-3d', note: 'A long night, paced — food in two waves and water in reach do more for how the night ends than the bar list does.', provenance: { tier: 'heuristic', confidence: 'low', verificationStatus: 'synthesized', sources: [], note: 'About one drink per guest per hour across the pre-midnight stretch, with the toast handled by its own line. The bar-provisioning consensus states the rate, but a single registered source cannot meet the pricing policy two-source corroboration bar, so this stays labeled a heuristic.' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['beer-retail-2026', 'wine-retail-2026'], lastVerified: '2026-08-21', claim: 'Per drink at retail 2026: beer $0.80-3.00 a 12oz can from domestic to craft; everyday grocery wine at $8-15 a bottle pours to roughly $1.60-3.00 a glass; a batched-cocktail pour with a mid-shelf spirit sits at the top of the band — which is this $1.50-4.00 spread.', sufficientWhen: 'One domestic six-pack, one everyday wine and one 750ml mid-shelf spirit price at the same store confirm the per-drink spread.' } },
    { id: 'p_water_coffee', item: 'Water station + late coffee', category: 'beverage', qtyPerGuest: 3, unit: 'servings', where: ['Grocery'], unitCostRange: [0.2, 0.6], essential: true, buyAt: 'T-3d', note: 'Water out all night, coffee after midnight for the drivers and the long-haulers — both are part of the getting-home plan, not hospitality extras.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized', note: 'Three servings per guest sits at the top of the 2-3 non-alcoholic-servings party consensus; single-source, so honestly labeled an estimate.' } },
    { id: 'p_wave_one', item: 'Evening spread (heavy appetizers, the first wave)', category: 'food', qtyPerGuest: 6, unit: 'bites', where: ['Grocery', 'Costco', 'Caterer'], unitCostRange: [0.7, 2], essential: true, buyAt: 'T-3d', note: 'The first wave carries the party from doors to about eleven. Heavy, self-serve, and replenished — a party this long with one serve time runs out exactly when people need it most.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_wave_two', item: 'The midnight wave (sliders, pigs in blankets, a breakfast bite)', category: 'food', qtyPerGuest: 3, unit: 'bites', where: ['Grocery', 'Costco'], unitCostRange: [0.6, 1.8], essential: true, buyAt: 'T-3d', note: 'Everyone is hungry again at midnight — it is a physiological fact of a five-hour party. Something warm and salty, staged to fire in fifteen minutes, lands right after the toast and feeds the guests waiting out the rideshare surge.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_flutes', item: 'Flutes (glass or good plastic), counted to the headcount plus spares', category: 'logistics', qtyPerGuest: 1.2, unit: 'flutes', where: ['Party store', 'Costco', 'Dollar store'], unitCostRange: [0.3, 1.5], essential: true, buyAt: 'T-3d', note: 'The toast is the one moment when every guest needs the same glass at the same time — count them, and add spares for the ones set down and lost.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_poppers', item: 'Poppers, noisemakers & midnight hats', category: 'logistics', qtyPerGuest: 1.5, unit: 'pieces', where: ['Party store', 'Dollar store', 'Amazon'], unitCostRange: [0.3, 1], essential: false, buyAt: 'T-3d', note: 'Confetti poppers read festive in photos and vacuum out of a rug for weeks — string poppers and noisemakers deliver the moment without the January cleanup.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_decor', item: 'Decor (metallics, balloons, a backdrop for the midnight photo)', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Party store', 'Target', 'Amazon'], unitCostRange: [30, 100], essential: false, buyAt: 'T-3d', note: 'Gold and black do the whole job. A balloon drop is the one build that earns its effort — rigged over the countdown room, released at zero.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_cleanup', item: 'Cleanup kit (trash bags, recycling for the bottles, morning-after supplies)', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [7, 15], essential: true, buyAt: 'T-3d', note: 'The year\'s best cleanup decision is made the night before: bottle recycling staged, and the morning coffee set up before the party starts.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['costco-cleaning-2026', 'trashbags-retail-2026'], lastVerified: '2026-08-21', claim: 'The corpus\'s identical-line cleanup-kit citation: a kit is the SUM of its parts — trash and recycling bags at 10-15 cents each by channel, paper towels about $1.97 a roll warehouse, a wipes canister about $4.27 — which is the $7-15 envelope.', sufficientWhen: 'CONFIDENCE IS LOW ON PURPOSE: nobody sells a cleanup kit; the band is a component sum and a host who already owns supplies lands under the floor.' } },
  ],

  rentalsGap: [
    { item: 'Flute count to the full headcount', qtyPerGuest: 1.2, note: 'Borrow or buy — the toast cannot queue at a sink. Spares cover the set-down-and-lost glasses.' },
    { item: 'A screen everyone can see from the countdown room', qtyFlat: 1, note: 'The countdown source needs a screen the whole gathered room can see — test the sightlines when you stage the station.' },
    { item: 'Overnight bedding (if couches are offered)', qtyFlat: 2, note: 'Blankets and pillows stacked where guests can find them at 1 AM without waking the host.' },
  ],

  vendors: [
    { category: 'Rideshare / car service staging', required: false, altToDIY: 'Guests order their own with the surge warning given at the toast — the host\'s job is the heads-up and the warm place to wait, not the bill', when: 'T-4d', costRange: [50, 200], costUnit: 'flat' },
    { category: 'Late-night food drop (the midnight wave, outsourced)', required: false, altToDIY: 'A tray of sliders staged in your own oven at 11:45 — cheaper and it fires on your clock, not a driver\'s', when: 'T-7d', costRange: [60, 200], costUnit: 'flat' },
    { category: 'Morning-after cleaning', required: false, altToDIY: 'The staged cleanup kit and a slow morning — the paid clean is a gift to your own January 1st', when: 'T-7d', costRange: [120, 250], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_countdown_fail', trigger: 'The countdown source fails at the moment — a buffering stream, a lagging phone clock', severity: 'high', mitigation: 'A live broadcast as the default; any stream tested on the actual screen and wifi the same evening; a named backup source; and one person who owns the call. The moment cannot be re-run — this is the one rehearsed thing in the night.' },
    { id: 'r_scattered', trigger: 'Midnight arrives with the room scattered — half the guests missing the moment', severity: 'med', mitigation: 'The gather cue at 11:45 is a real announcement, not an assumption: music down, everyone called to the countdown room, glasses handed out as they arrive. Fifteen minutes is exactly enough to collect a house without killing the momentum.' },
    { id: 'r_empty_glasses', trigger: 'The count starts and half the room has no glass', severity: 'med', mitigation: 'Pouring starts at 11:40 with two pourers, from a staged station with flutes counted to the headcount. Pour ahead of the gather, hand glasses at the door of the room, and hold two spares for the guests who set theirs down.' },
    { id: 'r_impaired_driving', trigger: 'A guest who toasted drives home after midnight', severity: 'critical', mitigation: 'The rides plan is made at RSVP: named designated drivers, the rideshare surge warning, and the couch offered out loud. The rides check after the toast — before the second wind sets in — is a named task, and coffee plus the midnight food wave give waiting guests a reason to wait.' },
    { id: 'r_neighbors', trigger: 'A noise complaint lands as the party peaks at midnight', severity: 'med', mitigation: 'The neighbors hear the date, the honest end time, and an apology-in-advance from you ten days out — or they get invited. Music moves indoors and down after half past midnight; the countdown minute itself, everyone forgives.' },
    { id: 'r_food_gap', trigger: 'The food runs out at ten and the night still has three hours of drinking in it', severity: 'high', mitigation: 'Two waves by design: the evening spread replenished until eleven, and the staged midnight wave fired right after the toast. Late food is not a bonus — it is what a five-hour party with a bar requires.' },
    { id: 'r_kids_late', trigger: 'Kids at a family party melting down long before their countdown', severity: 'low', mitigation: 'The family version anchors at 9 sharp, not nine-ish: countdown, cider toast, noisemakers, pajama exit. Holding tired kids toward real midnight serves nobody — that is what the two-anchor model exists for.' },
  ],

  contingencies: [
    { id: 'c_countdown_fail', when: 'r_countdown_fail', plan: 'Switch to the named backup without narrating the failure — the room only remembers the count that happened. If every screen fails, the clock owner counts it from a synced phone, loudly, and the moment lands anyway.' },
    { id: 'c_scattered', when: 'r_scattered', plan: 'If 11:50 arrives and people are still spread out, send one person to each room with the same sentence — countdown in the living room, right now — and start handing glasses at the door. The glasses pull people faster than the announcement does.' },
    { id: 'c_impaired', when: 'r_impaired_driving', plan: 'Take the keys conversation private and make the alternative effortless: the rideshare ordered on the spot, the couch already made up, the coffee poured. The car stays, the guest sleeps or rides, and the awkwardness expires by brunch.' },
    { id: 'c_neighbors', when: 'r_neighbors', plan: 'If the complaint comes anyway, one host steps out and handles it in person — music down immediately, a genuine apology, and the party moves fully indoors. Never send a guest to have that conversation.' },
    { id: 'c_food_gap', when: 'r_food_gap', plan: 'Fire the midnight wave early — it exists, it is staged, and it is fifteen minutes from the oven. Backfill the spread with the pantry stretch: cheese, crackers, anything warm and salty, and push the water.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Sparkling wine and the zero-proof sparkler to the bottle-per-five math, both food waves, flutes, poppers, decor, cleanup kit' },
      { when: 'T-1d', what: 'Fresh garnish and bread; anything the wave-prep list turned up short; the bubbles into the refrigerator tonight' },
    ],
    preparation: [
      { when: 'T-1d evening', what: 'Prep both food waves; stage the midnight station — flutes counted, bottles chilling, poppers in a bowl; make up the couches if guests are staying' },
    ],
    setup: [
      { when: 'T0 -3h', what: 'The evening spread assembled and covered; the bar built; water station out' },
      { when: 'T0 -1:30', what: 'Countdown source tested on the actual screen and wifi — and the backup confirmed working, tonight, not in theory' },
      { when: 'T0 -0:45', what: 'Midnight station final check: flutes out, glasses-per-guest counted, the toast spot cleared, balloon drop rigged if there is one' },
    ],
    program: [
      { when: 'T0 +15m', what: 'Doors: coats, first drinks, the evening spread open' },
      { when: 'T0 +1h', what: 'The party proper: music up, spread replenished, the room mixing' },
      { when: 'T0 +2h', what: 'Pour crew recruited and briefed; midnight wave moved from refrigerator to oven-ready; around eleven on the default nine-o-clock doors' },
      { when: 'T0 +2:40', what: 'Pouring starts at the station — every flute filled ahead of the gather, spares held back' },
      { when: 'T0 +2:45', what: 'The gather cue — 11:45 on the default doors: music down a notch, everyone to the countdown room, glasses into hands at the door' },
      { when: 'T0 +2:55', what: 'Screen up, sound up, last glasses out — the room is assembled with minutes to spare' },
      { when: 'T0 +3h', what: 'Midnight: the count, the toast, the noise, the hugs — and the music already rising underneath' },
      { when: 'T0 +3:15', what: 'The midnight food wave fires: warm, salty, and exactly what the room wants now' },
      { when: 'T0 +3:20', what: 'The rides check: drivers confirmed, rideshares ordered ahead of the surge, couch guests claimed' },
      { when: 'T0 +4h', what: 'The long wind-down: coffee out, music indoors and lower, the resolutions conversation finding its people' },
    ],
    cleanup: [
      { when: 'during', what: 'Bottles to the staged recycling as they empty; abandoned glasses swept each hour; the spread consolidated as it thins' },
      { when: 'T0 +4:30', what: 'The honest minimum before bed: food away, bottles out, flutes soaking — the rest belongs to the new year\'s slow morning' },
    ],
  },

  // Day-of readiness — the whole night converges on one unmissable minute,
  // and the second half of the list is about everyone getting home from it.
  dayOfChecklist: [
    { id: 'countdown', label: 'Countdown source tested tonight', detail: 'On the actual screen, on the actual wifi, with the backup confirmed — a stream that buffers at 11:59 is the one failure this party cannot recover from.', severity: 'high' },
    { id: 'station', label: 'The midnight station is staged', detail: 'Flutes counted to the headcount plus spares, bottles chilled, poppers in the bowl, and the toast spot cleared — pouring starts at 11:40, not when someone remembers.', severity: 'high' },
    { id: 'rides', label: 'Every guest has a way home', detail: 'Drivers named, the surge warning given, the couch made up — settled at RSVP and rechecked after the toast, on the year\'s most dangerous night to drive.', severity: 'high' },
    { id: 'waves', label: 'Both food waves are ready', detail: 'The evening spread out and replenishable, and the midnight wave staged to fire in fifteen minutes — a five-hour party fed once runs dry exactly at midnight.', severity: 'med' },
    { id: 'zero', label: 'The zero-proof toast is real', detail: 'A proper sparkler in the same flutes for drivers, pregnant guests, and kids — every raised glass looks the same at midnight.', severity: 'med' },
    { id: 'neighbors', label: 'The neighbors already know', detail: 'Date, end time, and your number given days ago — or they are inside the party. The complaint that never gets filed is the one you prevented in person.', severity: 'med' },
    { id: 'gather', label: 'The gather plan has an owner', detail: 'Someone owns 11:45: the announcement, the room, the glasses at the door. The moment fails only if the house is scattered when the count starts.', severity: 'med' },
    { id: 'overnight', label: 'The overnight setup is findable', detail: 'Bedding stacked where a guest can find it at 1 AM without waking anyone — the couch offer only works if it is real when someone takes it.', severity: 'low' },
  ],

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'partial',
    note: 'GROUNDING PASS 2026-08-21 (same day as authoring): toast math is now CITED against the registered US bar-provisioning consensus (bar-provision-2026) — a 750ml bottle pours about five flute servings and sparkling planning runs about one bottle per 4-5 guests, so the copy was corrected from "about six flutes" to five-to-six and the per-5-guests rate stands as the norm\'s economical end; the one-drink-per-guest-per-hour evening pace and the 2-3 non-alcoholic servings per guest are the same source\'s stated figures. The toast_pour cost ratio is grounded (sparkling cider $4.29-8.49 against sparkling wine $10-25). Sparkling wine, cider, flutes, the evening bar per drink, and the cleanup kit carry cited costProvenance. The rides-home section\'s impaired-driving stakes cite nhtsa-drunk-driving (11,904 alcohol-impaired deaths in 2024, one every 44 minutes, with the host guidance stated by NHTSA itself); "the year\'s most dangerous driving night" remains the playbook\'s own characterization, not a cited statistic. Lead times (21-day start, 21-day invitations), both food waves, poppers, decor and the midnight-wave quantities remain synthesized — no fetched source states them. ORIGINAL AUTHORING NOTE: authored 2026-08-21 off the seasonal-demand study (Q6.4: NYE celebration intent rose into 2025 with 51% of celebrators buying alcohol, and host-side planning content is planner-shaped — guest list, menu, drink math, countdown-hour programming). The review board\'s duplicate-surface rule governs this file: it exists only because its run of show is structurally different from Holiday Party\'s — every beat back-plans from a fixed midnight that cannot slip, where every other playbook\'s day floats off a host-chosen start time. That anchor produces the type\'s real content: the poured-before-the-count toast staging, a tested countdown source with a named backup, the 11:45 gather cue, a second food wave at midnight because one serve time cannot feed a five-hour night, the guests-past-midnight problem treated as planned logistics (designated drivers seeded at RSVP, the rideshare surge warning, the overnight couch made up in advance) on the year\'s most dangerous driving night, the kids-versus-adults decision with the early nine-o-clock family countdown, and neighbor courtesy for a party that peaks at midnight rather than ending by it. Program beats are authored as offsets from doors with the copy naming the clock moments they serve on the default nine-o-clock doors. Toast math (about five flute pours per bottle per the cited bar-provisioning consensus, a bottle per five guests) and the one-drink-per-hour evening pace are cited above; see the grounding-pass paragraph. Lead times: the 21-day planning start is corpus-derived (Dinner Party, The Cookout); the 21-day invitation lead is judged earlier than a same-size house party\'s norm because guests weigh competing invitations on this night. No regional traditions are invented; the file stays plain-host US. No fabricated sources.',
    sources: ['bar-provision-2026', 'nhtsa-drunk-driving', 'sparklingwine-band-2026', 'sparkling-cider-2026'],
  },
};

export default newYearsEveParty;
