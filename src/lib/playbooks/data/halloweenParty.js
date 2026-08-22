// Halloween Party — Event OS host playbook (data only).
//
// Authored 2026-08-21 off the seasonal-demand study
// (docs/audits/2026-08-21_SEASONAL_DEMAND_AND_NICHE_RESEARCH.md, Q6.1):
// Halloween is the largest US fall event by spending — a record $13.1 billion
// in 2025 (NRF/Prosper Insights) — and 29% of hosts host a Halloween
// gathering, yet it was absent from all 41 authored playbooks. The shape of
// the type is the AUDIENCE decision: an adults-only costume party, a kids
// party, a family all-ages party, and a trunk-or-treat are four genuinely
// different events wearing the same decorations, so the audience choice
// whenChoice-gates the task list. The costume contest is the one program beat
// nearly every version shares.
//
// Safety here is honest, not ornamental — these are the documented Halloween
// failure modes: dark walkways and trip hazards for guests arriving in
// costume at night, open flames near costumes and crepe decor (billowy
// costumes are the classic ignition case — LED lights near anything that
// moves), allergy-aware treats (the Teal Pumpkin norm: non-food treats
// offered alongside candy), and driveway/street visibility for kids' events
// held on the one night of the year with the most children on foot in the
// dark. First aid and an accessibility check are covered where they honestly
// apply, per the coverage audit's universal blind spots.
//
// LEAD-TIME JUDGMENTS: the 42-day planning start follows the study's
// host-guide finding (party planning starts six to eight weeks out); the
// 28-day invitation lead follows the same guides (three to four weeks,
// because late-October weekends fill fast). Both are the conservative end of
// a published range, not corpus-derived — no existing playbook models a
// date-competitive holiday weekend. Candy and food quantities are
// synthesized per-guest heuristics. No fabricated sources, no fabricated
// costProvenance. ESM default export.

const halloweenParty = {
  type: 'Halloween Party',
  vegMain: 'Stuffed jack-o-lantern bell peppers',
  solveFamily: 'home_gathering',
  family: 'home_hosted',
  recordKind: 'event',
  version: '1.0.0',

  meta: {
    summary:
      'The biggest fall party in America, and really four different parties: an adults-only costume night, a kids party, an all-ages family gathering, or a trunk-or-treat in the driveway and street. Who it is for decides everything — the hour, the food, the scare level, and the safety work. What every version shares: costumes with a contest moment, a treat table with candy math behind it, decor that reads spooky without becoming a trip hazard, and the one night of the year when walkway lighting, flame-free candles, and allergy-aware treats are not fine print.',
    typicalGuests: { low: 10, default: 25, high: 50 },
    typicalDurationHours: 4,
    leadTimeDays: 42,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 8, high: 25, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'Someone walks in and the whole room turns to figure out the costume.',
    'The costume contest gets genuinely competitive and everyone picks a side.',
    'A little kid in a dinosaur suit works up the courage for the spooky room.',
    'The photo corner line never quite empties all night.',
    'The last guests leave still wearing their costumes, carrying candy.',
  ],

  decisions: [
    {
      id: 'audience',
      label: 'Who is this party for — adults, kids, or the whole neighborhood?',
      options: ['Adults-only costume party', 'Kids party', 'Family party — all ages', 'Trunk-or-treat — driveway and street'],
      default: 'Family party — all ages',
      when: 'T-42d',
      timingProvenance: { tier: 'researched', verificationStatus: 'researched', sources: ['partychecklist-timeline-2026'], claim: 'Party-planning guides put the planning start at 4-8 weeks out, 8 weeks ideal, with popular holiday weekends booking earliest — the six-week (T-42d) start sits in that window at its conservative end for a date-competitive late-October weekend.', rationale: 'The 42-day start is the sourced 4-8-week planning window taken at the conservative end because late-October weekends fill with competing parties.' },
      blocks: ['program', 'menu', 'safety', 'invitations'],
      weight: 'high', reversibility: 'costly', emotionalWeight: 'med', difmCapable: 'needs-host',
      priorityBasis: { rationale: 'Adults, kids, family, and trunk-or-treat are four different events wearing the same decorations — the hour, the food, the scare level, and the whole safety plan follow from this, and only the host knows their crowd.', tier: 'reasoned' },
      why: 'Everything gates off this. An adults party runs late with a bar and can lean genuinely scary. A kids party runs early, keeps the scares gentle, and lives on activities. A family party splits the difference and needs a spooky zone the little ones can opt out of. A trunk-or-treat moves the event outdoors into the driveway and street — which makes cars, visibility, and neighbor coordination the actual work.',
    },
    {
      id: 'costume_contest',
      label: 'Costume contest — judged categories, or one applause winner?',
      options: ['Judged — categories and prizes', 'Applause vote — one winner', 'No contest — costumes for their own sake'],
      default: 'Judged — categories and prizes',
      when: 'T-21d',
      blocks: ['run_of_show', 'prizes'],
      weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive',
      priorityBasis: { rationale: 'The contest is the program beat nearly every Halloween party shares, and it needs prizes bought and a moment scheduled — but any format works and switching is cheap.', tier: 'reasoned' },
      why: 'The contest is the party\'s one scheduled moment — the thing that gathers everyone in a room at the same time. Categories (scariest, funniest, best duo, best kid, best effort) spread the wins so the same elaborate costume does not take everything. Run it mid-party while everyone is still there and still in costume; announce the categories in the invitation so people come to compete.',
    },
    {
      id: 'food_model',
      label: 'What is the food — a party spread, or treats and candy?',
      options: ['Party spread plus the candy table', 'Treats and candy only', 'Potluck — guests bring a dish'],
      default: 'Party spread plus the candy table',
      when: 'T-14d',
      blocks: ['food'],
      costFactors: { 'Treats and candy only': 0.5, 'Potluck — guests bring a dish': 0.6 },
      costFactorProvenance: { tier: 'synthesized', confidence: 'low', verificationStatus: 'synthesized', note: 'Ratios are judged against the corpus\'s host-cooks versus potluck spreads; a treats-only table drops the savory spread entirely, which is most of the food line.', claim: 'Treats-and-candy-only roughly halves the host\'s food cost versus a full spread; a potluck saves about 40%', sufficientWhen: 'An ingredient basket for the full spread versus the treats-only list at the same headcount confirms both ratios' },
      affects: ['p_spread', 'p_treats'],
      weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive',
      priorityBasis: { rationale: 'A party crossing a mealtime needs real food, not just sugar — but this is a cheap, swappable call the app can default from the party\'s hour.', tier: 'reasoned' },
      why: 'Decide from the clock: a party crossing dinner hours needs real savory food or the room runs on sugar and regrets it. Themed bites earn their keep here more than at any other party — mummy dogs and a charcuterie skull cost the same as their plain versions. A treats-only table is honest for a short evening party; a potluck spread with assigned dishes suits the family version.',
    },
    {
      id: 'drinks',
      label: 'Is there a bar for the grown-ups?',
      options: ['Themed batch cocktail plus beer and wine', 'Beer and wine only', 'Zero-proof only'],
      default: 'Beer and wine only',
      when: 'T-14d',
      blocks: ['beverage'],
      costFactors: { 'Themed batch cocktail plus beer and wine': 1.3, 'Zero-proof only': 0.4 },
      costFactorProvenance: { tier: 'synthesized', confidence: 'low', verificationStatus: 'synthesized', note: 'Ratios judged against the corpus\'s bar-tier spreads (The Cookout drinks decision); the batch cocktail adds a spirits line, zero-proof drops alcohol entirely.', claim: 'Adding a batch cocktail raises the drinks line about 30%; a zero-proof table cuts it by more than half', sufficientWhen: 'Retail pricing for one spirits batch plus beer and wine versus the zero-proof list at the same headcount confirms both ratios' },
      affects: ['p_batch_cocktail', 'p_beer_wine'],
      weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive',
      priorityBasis: { rationale: 'The kids-party and trunk-or-treat versions barely need this decision, and the adult version defaults safely to beer and wine — a call the app can propose from the audience answer.', tier: 'reasoned' },
      why: 'One black-or-orange batch cocktail reads as effort far beyond its cost — batched ahead so nobody plays bartender in a costume with sleeves. For family parties keep the adult drinks clearly separate from the kids\' table, and remember the night this party lives on: guests drive home through streets full of trick-or-treaters, so the zero-proof option and the rides plan carry more weight than at any other party.',
    },
  ],

  milestones: [
    { id: 'hw_plan', name: 'Lock the date, the audience, and the headcount', offsetDays: 42, owner: 'host', category: 'planning', risk: { ifDelayed: 'Late-October weekends fill with competing parties; your date loses its guests', severity: 'high' } },
    { id: 'hw_invite', name: 'Send invitations with the costume ask', offsetDays: 28, owner: 'host', dependsOn: ['hw_plan'], category: 'guest', risk: { ifDelayed: 'Guests commit to the other party; costumes need lead time too', severity: 'high' } },
    { id: 'hw_neighbors', name: 'Coordinate the street (trunk-or-treat) or notify the neighbors', offsetDays: 21, owner: 'host', dependsOn: ['hw_plan'], category: 'planning', risk: { ifDelayed: 'No cars signed up, or a noise complaint mid-party', severity: 'med' } },
    { id: 'hw_program', name: 'Plan the contest, activities, and the spooky zone', offsetDays: 14, owner: 'host', dependsOn: ['hw_invite'], category: 'planning', risk: { ifDelayed: 'A party with decorations but nothing to do', severity: 'med' } },
    { id: 'hw_shop_decor', name: 'Buy decor, lights, prizes, and non-food treats', offsetDays: 10, owner: 'host', dependsOn: ['hw_program'], category: 'shopping', risk: { ifDelayed: 'Halloween shelves strip bare in the final week', severity: 'med' } },
    { id: 'hw_headcount', name: 'Confirm final headcount and kid count', offsetDays: 4, owner: 'host', dependsOn: ['hw_invite'], category: 'guest', risk: { ifDelayed: 'Candy, food, and prize counts are all guesses', severity: 'med' } },
    { id: 'hw_shop_food', name: 'Buy candy, food, and drinks', offsetDays: 3, owner: 'host', dependsOn: ['hw_headcount'], category: 'shopping', risk: null },
    { id: 'hw_build', name: 'Decorate and build the party', offsetDays: 1, owner: 'host', dependsOn: ['hw_shop_decor'], category: 'setup', risk: null },
    { id: 'event', name: 'The Halloween party', offsetDays: 0, owner: 'host', dependsOn: ['hw_build', 'hw_shop_food'], category: 'event', risk: null },

    // ── AFTER THE NIGHT ──────────────────────────────────────────────────────
    // NEGATIVE offsetDays = days AFTER the event.
    //
    // Halloween is the one event whose decor has a hard expiration date: the
    // same yard that read as a decorated house on October 31 reads as a
    // neglected one by mid-November, and the pumpkins on the porch collapse
    // into a mess if they sit. Add the promises made during the party --
    // prizes announced, photos taken -- which only count if they are actually
    // delivered while people still care.
    { id: 'hw_pumpkins', name: 'Deal with the pumpkins and the leftover candy', offsetDays: -2, owner: 'host', dependsOn: ['event'], category: 'cleanup', risk: { ifDelayed: 'Carved pumpkins soften and collapse on the porch within days of being cut', severity: 'med' } },
    { id: 'hw_payoff', name: 'Deliver the prizes and share the photos', offsetDays: -3, owner: 'host', dependsOn: ['event'], category: 'guest', risk: { ifDelayed: 'A promised prize never arrives, and the costume photos land after nobody cares', severity: 'med' } },
    { id: 'hw_teardown', name: 'Take the yard decor and lights down', offsetDays: -7, owner: 'host', dependsOn: ['event'], category: 'decor', risk: { ifDelayed: 'Decor left up past its season is what separates a decorated house from a neglected one', severity: 'med' } },
  ],

  tasks: [
    { id: 't_date', milestoneId: 'hw_plan', phase: 'planning', label: 'Pick the date and time to fit the audience — kids parties run early afternoon into dusk; adult parties own the late-October Saturday night', when: 'T-42d' },
    { id: 't_invite', milestoneId: 'hw_invite', phase: 'guest', label: 'Send invitations with the costume ask, the contest categories, the scare level, and the end time — parents plan around all four', when: 'T-28d' },
    { id: 't_trunks', milestoneId: 'hw_neighbors', phase: 'planning', label: 'Sign up the cars: each trunk\'s host, their theme, and who brings their own candy — a trunk-or-treat is only as good as its trunk count', when: 'T-21d', whenChoice: { id: 'audience', in: ['Trunk-or-treat — driveway and street'] } },
    { id: 't_street', milestoneId: 'hw_neighbors', phase: 'planning', label: 'Walk the street plan with the neighbors: where cars park, where they cannot, and how the kids\' walking route stays out of the traffic lane', when: 'T-21d', whenChoice: { id: 'audience', in: ['Trunk-or-treat — driveway and street'] } },
    { id: 't_neighbors', milestoneId: 'hw_neighbors', phase: 'planning', label: 'Tell the near neighbors the date and end time — a heads-up beats a knock at ten', when: 'T-21d', whenChoice: { id: 'audience', in: ['Adults-only costume party', 'Family party — all ages'] } },
    { id: 't_contest_plan', milestoneId: 'hw_program', phase: 'planning', label: 'Set the contest categories and judges, and buy prizes worth winning — one per category plus a spare', when: 'T-14d', whenChoice: { id: 'costume_contest', in: ['Judged — categories and prizes', 'Applause vote — one winner'] } },
    { id: 't_kids_activities', milestoneId: 'hw_program', phase: 'planning', label: 'Plan the kids\' stations: pumpkin decorating, a craft table, a not-scary game — stations beat one big activity because kids arrive and fade at different times', when: 'T-14d', whenChoice: { id: 'audience', in: ['Kids party', 'Family party — all ages'] } },
    { id: 't_spooky_zone', milestoneId: 'hw_program', phase: 'planning', label: 'Design the spooky zone as opt-in: one room or corner the brave enter on purpose, so the little ones own the rest of the party', when: 'T-14d', whenChoice: { id: 'audience', in: ['Family party — all ages'] } },
    { id: 't_playlist', milestoneId: 'hw_program', phase: 'planning', label: 'Build the playlist and the scare-level plan for the room — soundtrack spooky, not haunted-house loud, so people can still talk', when: 'T-14d', whenChoice: { id: 'audience', in: ['Adults-only costume party'] } },
    { id: 't_photo', milestoneId: 'hw_shop_decor', phase: 'decor', label: 'Build a photo corner with good light — costumes people worked on deserve a picture that proves it', when: 'T-10d' },
    { id: 't_teal', milestoneId: 'hw_shop_decor', phase: 'shopping', label: 'Buy non-food treats — stickers, glow bracelets, small toys — and plan the teal-pumpkin table that offers them alongside the candy', when: 'T-10d' },
    { id: 't_costume', milestoneId: 'hw_shop_decor', phase: 'planning', label: 'Sort your own costume now — the host in a great costume sets the room\'s permission level, and it must leave both hands free to run a party', when: 'T-10d' },
    { id: 't_headcount', milestoneId: 'hw_headcount', phase: 'guest', label: 'Confirm the headcount and the kid count separately — candy, prizes, and activity supplies all scale off the kid number', when: 'T-4d' },
    { id: 't_shop_food', milestoneId: 'hw_shop_food', phase: 'shopping', label: 'Buy the candy, food, and drinks — and batch the themed cocktail today so party day is assembly, not mixing', when: 'T-3d' },
    { id: 't_lights', milestoneId: 'hw_build', phase: 'setup', label: 'Light the path: every walkway, step, and door your guests will use in the dark — spooky inside, visible outside', when: 'T-1d' },
    { id: 't_decor', milestoneId: 'hw_build', phase: 'setup', label: 'Decorate with the walking paths kept clear: cobwebs and props off the floor routes, cords taped down, nothing swinging at face height', when: 'T-1d' },
    { id: 't_access', milestoneId: 'hw_build', phase: 'setup', label: 'Walk the route a guest with a stroller, cane, or wheelchair would take — decor moved off it, one step-free way in confirmed', when: 'T-1d' },
    { id: 't_carve', milestoneId: 'hw_build', phase: 'setup', label: 'Carve the pumpkins and light every one with an LED — never a flame where costumes, crepe paper, and kids brush past', when: 'T-1d' },
    { id: 't_treat_table', milestoneId: 'event', phase: 'food', label: 'Set the treat table: candy out, the teal-pumpkin non-food option beside it, and allergy labels on anything homemade', when: 'T0 -2h' },
    { id: 't_contest_run', milestoneId: 'event', phase: 'event', label: 'Run the costume contest mid-party — gather everyone, keep it under fifteen minutes, spread the categories', when: 'T0 +1:30', whenChoice: { id: 'costume_contest', in: ['Judged — categories and prizes', 'Applause vote — one winner'] } },
    { id: 't_car_watch', milestoneId: 'event', phase: 'event', label: 'Keep one adult on the driveway and street edge whenever kids are outside — the visibility watch is a named job, not a vibe', when: 'ongoing', whenChoice: { id: 'audience', in: ['Kids party', 'Family party — all ages', 'Trunk-or-treat — driveway and street'] } },
    { id: 't_rides', milestoneId: 'event', phase: 'event', label: 'Check rides before the wind-down: anyone who drank has a driver or a rideshare, on the one night the streets are full of kids on foot', when: 'T0 +3:30', whenChoice: { id: 'audience', in: ['Adults-only costume party', 'Family party — all ages'] } },
    { id: 't_pumpkins_out', milestoneId: 'hw_pumpkins', phase: 'cleanup', label: 'Get the carved pumpkins off the porch and into the compost or yard waste — a cut pumpkin softens fast, and the ones you leave will be a puddle and a wasp problem by the weekend', when: 'T0 +2d' },
    { id: 't_candy', milestoneId: 'hw_pumpkins', phase: 'food', label: 'Decide the leftover candy now: a bowl kept out, the rest sent home with guests, boxed for the office, or dropped at a candy buy-back — anything still in the kitchen in a week gets eaten by you', when: 'T0 +2d' },
    { id: 't_prizes', milestoneId: 'hw_payoff', phase: 'guest', label: 'Get the costume prizes into the winners\' hands — anyone who was not there to take theirs gets it delivered or mailed, because an announced prize that never shows up is worse than no contest', when: 'T0 +3d', whenChoice: { id: 'costume_contest', in: ['Judged — categories and prizes', 'Applause vote — one winner'] } },
    { id: 't_photos', milestoneId: 'hw_payoff', phase: 'guest', label: 'Share the photo corner pictures in one album link while the costumes are still the thing people are talking about — a week later it is last year\'s party', when: 'T0 +3d' },
    { id: 't_yard_down', milestoneId: 'hw_teardown', phase: 'decor', label: 'Take the yard decor, gravestones, and cobwebs down within the week — cobwebs in particular shred in the weather and catch on everything', when: 'T0 +7d' },
    { id: 't_lights_down', milestoneId: 'hw_teardown', phase: 'decor', label: 'Pull the orange and purple lights and the extension cords, coil them, and box them labeled — anything staying up through November should be the ordinary porch light, not a party leftover', when: 'T0 +7d' },
  ],

  purchases: [
    { id: 'p_candy', item: 'Candy for the treat table (fun-size mix)', category: 'food', qtyPerGuest: 8, unit: 'pieces', where: ['Costco', 'Grocery', 'Target'], unitCostRange: [0.08, 0.25], essential: true, buyAt: 'T-3d', alternatives: ['Warehouse-club variety bag — the floor of the per-piece range', 'A homes-on-the-route buffer bag if trick-or-treaters will also knock'], note: 'A handful per guest covers the table and the take-home; parties on a trick-or-treat route need a separate door bag so the party candy survives. Buy branded mixes people recognize — mystery candy goes home untouched.', provenance: { tier: 'heuristic', confidence: 'low', verificationStatus: 'synthesized', sources: [], note: 'A per-guest handful (about 8 fun-size pieces) is a synthesized party norm — distinct from door-answering trick-or-treat volume, which depends on the street, not the guest list.' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['candy-funsize-2026', 'candy-partysize-target-2026'], lastVerified: '2026-08-21', claim: 'Fun-size candy per piece, 2026, by channel: 150-count minis bulk bags run $13.99-19.97 ($0.09-0.13 a piece), which is this band\'s floor territory; grocery party-size 35-count bags run $9.96-10.29 ($0.28-0.29 a piece) — slightly ABOVE the $0.25 ceiling, so a host buying small bags at grocery lands over this estimate while the warehouse or bulk-bag buyer lands under it. The channel moves the per-piece price about 3x.', sufficientWhen: 'One current warehouse-club per-piece price alongside the bulk-bag and grocery figures confirms the floor.' } },
    { id: 'p_treats_nonfood', item: 'Non-food treats (stickers, glow bracelets, small toys) + a teal pumpkin', category: 'logistics', qtyPerGuest: 2, unit: 'pieces', where: ['Party store', 'Target', 'Amazon'], unitCostRange: [0.2, 0.75], essential: true, buyAt: 'T-10d', note: 'The teal pumpkin signals a food-allergy-safe option — a widely recognized US norm. Glow bracelets do double duty as visibility on kids in the dark.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_spread', item: 'Party spread (themed savory bites, a big pot of chili or soup, veggie tray)', category: 'food', qtyPerGuest: 5, unit: 'bites', where: ['Grocery', 'Costco'], unitCostRange: [0.6, 2], essential: true, buyAt: 'T-3d', note: 'A party crossing dinner needs real food under the sugar. One warm anchor dish plus themed bites covers it; label anything with common allergens.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_treats', item: 'Sweet treats beyond candy (cookies, cupcakes, the monster brownie tray)', category: 'food', qtyPerGuest: 2, unit: 'pieces', where: ['Bakery', 'Grocery'], unitCostRange: [0.5, 1.5], essential: false, buyAt: 'T-1d', note: 'Decorated treats are half the theme. Store-bought plus candy eyeballs reads as homemade effort in a tenth of the time.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_batch_cocktail', item: 'Themed batch cocktail makings (one spirit, dark juice base, garnish)', category: 'beverage', qtyFlat: 1, qtyPer: 12, unit: 'batch per 12 guests', where: ['Liquor store', 'Grocery'], unitCostRange: [30, 55], essential: false, buyAt: 'T-3d', note: 'One batched black-or-orange drink is the whole bar program. Batch it the day you shop; add anything bubbly at serve time, not before.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_beer_wine', item: 'Beer + wine for the adults', category: 'beverage', qtyPerGuest: 1, unit: 'drinks', where: ['Grocery', 'Total Wine'], unitCostRange: [1.2, 3], essential: false, buyAt: 'T-3d', note: 'Plan lighter than a normal party — a costume party with kids in it drinks less than the same crowd at a cookout, and many guests are driving through trick-or-treat streets.', provenance: { tier: 'heuristic', confidence: 'low', verificationStatus: 'synthesized', sources: [], note: 'About one drink per adult guest across the evening — deliberately below the one-per-hour party norm because of the family audience and the driving context.' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['beer-retail-2026', 'wine-retail-2026'], lastVerified: '2026-08-21', claim: 'Per drink at retail 2026: beer runs $0.80-1.20 a 12oz domestic, $1.20-2.50 imported and $1.50-3.00 craft; everyday grocery wine at $8-15 a bottle pours to roughly $1.60-3.00 a glass — which is this $1.20-3.00 band end to end.', sufficientWhen: 'One domestic six-pack and one everyday wine shelf price at the same store confirm the per-drink spread.' } },
    { id: 'p_nonalc', item: 'Kids\' and zero-proof drinks (a spooky punch, juice boxes, water)', category: 'beverage', qtyPerGuest: 3, unit: 'drinks', where: ['Grocery', 'Costco'], unitCostRange: [0.3, 1], essential: true, buyAt: 'T-3d', note: 'A dry-ice-free spooky punch (sherbet does the trick) is the kids\' bar. Keep it visibly separate from any adult batch, and label both.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_pumpkins', item: 'Pumpkins for carving + the porch', category: 'decor', qtyFlat: 1, qtyPer: 4, unit: 'pumpkin per 4 guests', where: ['Grocery', 'Farm stand', 'Pumpkin patch'], unitCostRange: [4, 12], essential: true, buyAt: 'T-4d', note: 'Carved pumpkins soften within days — buy close to the party. If pumpkin decorating is a kids\' station, add small ones and skip knives for paint and stickers.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_led_candles', item: 'LED tea lights + flameless candles (every pumpkin and luminaria)', category: 'decor', qtyFlat: 12, unit: 'lights', where: ['Amazon', 'Target', 'Dollar store'], unitCostRange: [0.5, 2], essential: true, buyAt: 'T-10d', note: 'No open flame anywhere costumes brush past — billowy costumes and crepe decor near candles are the classic Halloween fire story. LEDs flicker convincingly and survive the wind.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_decor', item: 'Decor (cobwebs, skeletons, window silhouettes, the spooky-zone props)', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Party store', 'Target', 'Dollar store', 'Amazon'], unitCostRange: [40, 150], essential: true, buyAt: 'T-10d', note: 'Concentrate it: one fully committed room or porch beats a thin layer everywhere. Keep floor routes and stairs bare — decor causes the falls, lighting prevents them.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_path_lights', item: 'Walkway + step lighting (string lights, stake lights, a porch bulb that works)', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Hardware store', 'Amazon', 'Target'], unitCostRange: [15, 50], essential: true, buyAt: 'T-10d', note: 'The safety purchase that looks like decor. Every step and path guests use in the dark gets light; orange bulbs count as festive and functional at once.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_prizes', item: 'Costume contest prizes (one per category plus a spare)', category: 'logistics', qtyFlat: 5, unit: 'prizes', where: ['Target', 'Party store', 'Local shops'], unitCostRange: [5, 20], essential: false, buyAt: 'T-10d', note: 'A prize worth holding up in front of the room — a fun trophy photographs better than a gift card and costs less.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_craft', item: 'Kids\' station supplies (pumpkin paint, stickers, craft kit, game pieces)', category: 'logistics', qtyPerGuest: 1, unit: 'kits', where: ['Craft store', 'Dollar store', 'Amazon'], unitCostRange: [1, 3], essential: false, buyAt: 'T-10d', note: 'Scale to the kid count, not the guest count. Paint and stickers over carving knives for the under-tens.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    // costProvenance is the corpus's identical-line disposables citation (same
    // product, same band as Holiday Party p_serveware) — identical-line
    // consistency, not a new claim.
    { id: 'p_tableware', item: 'Themed plates, cups, napkins (sturdy enough for chili)', category: 'logistics', qtyPerGuest: 3, unit: 'pieces', where: ['Party store', 'Costco', 'Dollar store'], unitCostRange: [0.1, 0.4], essential: true, buyAt: 'T-10d', note: 'Name-tag stickers on cups save thirty abandoned identical black cups by hour two.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'medium', verificationStatus: 'cited', sources: ['disposables-bulk-2026', 'disposables-partyqty-2026'], lastVerified: '2026-08-16', claim: 'Disposable tableware runs about 6 cents a plate in bulk packs (roughly $18 per 300) and $0.25-0.40 a plate at a grocery store, with bulk restaurant supply at $0.08-0.15; cups, cutlery and napkins bought in bulk alongside them save $100-200 across a party.', sufficientWhen: 'Current shelf prices for one bulk plate pack and the same item at a grocery store confirm the per-piece spread.' } },
    { id: 'p_first_aid', item: 'First-aid restock (bandages, antiseptic, an ice pack in the freezer)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Pharmacy', 'Grocery'], unitCostRange: [8, 20], essential: true, buyAt: 'T-10d', note: 'Kids running in costumes they cannot see out of, in the dark, near steps — a stocked kit and a host who knows where it is cover the realistic worst case.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_cleanup', item: 'Cleanup kit (trash bags, wipes for face-paint furniture, candy-wrapper sweep)', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [7, 15], essential: true, buyAt: 'T-3d', note: 'Fake cobwebs come down the night of — left up, they catch leaves and look like neglect by the weekend. Wipes handle face paint before it reaches the sofa.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' }, costProvenance: { tier: 'researched', confidence: 'low', verificationStatus: 'cited', sources: ['costco-cleaning-2026', 'trashbags-retail-2026'], lastVerified: '2026-08-21', claim: 'The corpus\'s identical-line cleanup-kit citation: a kit is the SUM of its parts — trash and recycling bags at 10-15 cents each by channel, paper towels about $1.97 a roll warehouse, a wipes canister about $4.27 — which is the $7-15 envelope.', sufficientWhen: 'CONFIDENCE IS LOW ON PURPOSE: nobody sells a cleanup kit; the band is a component sum and a host who already owns wipes and towels lands under the floor.' } },
  ],

  rentalsGap: [
    { item: 'A folding table for the treat and craft stations', qtyFlat: 2, note: 'The treat table and the kids\' station each need their own surface — the dining table is for the food.' },
    { item: 'Outdoor string-light power (extension cords rated for outside, taped down)', qtyFlat: 1, note: 'Indoor cords outdoors and cords across walking paths are the two cheap mistakes. Rated cords, taped or covered where anyone walks.' },
    { item: 'Traffic cones or sawhorses (trunk-or-treat)', qtyFlat: 4, note: 'The kids\' walking lane gets a physical edge, not an honor system. Many towns lend cones for registered block events — ask.' },
  ],

  vendors: [
    { category: 'Face painter / balloon artist (kids and family parties)', required: false, altToDIY: 'A confident friend with a face-paint kit and a printed sheet of six simple designs covers an hour of kid entertainment', when: 'T-21d', costRange: [150, 350], costUnit: 'flat' },
    { category: 'Photographer (or a self-serve photo corner)', required: false, altToDIY: 'A ring light, a themed backdrop, and a phone tripod make the photo corner self-serve all night', when: 'T-14d', costRange: [200, 500], costUnit: 'flat' },
    { category: 'Yard-decor install / takedown', required: false, altToDIY: 'A ladder, a Saturday, and restraint — takedown within the week is what separates decor from neglect', when: 'T-14d', costRange: [150, 600], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_flame', trigger: 'An open flame near costumes, wigs, or crepe decor', severity: 'critical', mitigation: 'No real candles anywhere at this party — LED lights in every pumpkin and luminaria. Billowy costumes and synthetic wigs near a flame are the classic Halloween injury story, and decor fires are the classic property one.' },
    { id: 'r_trip', trigger: 'A guest falls on a dark walkway, a step, or a decoration in the path', severity: 'high', mitigation: 'Light every step and path guests use, keep decor off the floor routes and stairs, tape cords down, and walk the whole guest route in the dark the night before — masks cut peripheral vision, so what is visible to you is invisible to a kid in a costume.' },
    { id: 'r_cars', trigger: 'Kids on foot in the dark near moving cars', severity: 'critical', mitigation: 'For kids\' and trunk-or-treat events: driveway blocked or watched, a coned walking lane the cars cannot enter, glow bracelets on every kid, and one named adult on the street edge the whole time. This party happens on the highest-risk pedestrian night of the year for children.' },
    { id: 'r_allergy', trigger: 'A candy or treat reaches a kid with a food allergy', severity: 'high', mitigation: 'A teal-pumpkin table of non-food treats beside the candy, labels on anything homemade, no loose unwrapped candy, and the kid count question at RSVP includes allergies. Parents manage the rest when the information is visible.' },
    { id: 'r_scare', trigger: 'The scare level lands wrong — little kids in tears, or adults bored at a tame party', severity: 'med', mitigation: 'Publish the scare level in the invitation, make the spooky zone opt-in with a clear threshold, and keep the main rooms friendly. One startled toddler resets a family party\'s whole mood.' },
    { id: 'r_drunk_driving', trigger: 'A guest who drank drives home through streets full of trick-or-treaters', severity: 'critical', mitigation: 'The rides check happens before wind-down, not at the door: rideshare, a sober driver, or the couch. The one-drink-per-guest buying plan and a real zero-proof option keep this manageable by design.' },
    { id: 'r_candy_out', trigger: 'The candy or treat table runs empty mid-party', severity: 'low', mitigation: 'Hold a reserve bag back from the initial table fill, and let the take-home moment at the end distribute whatever survived.' },
    { id: 'r_weather', trigger: 'Rain or cold moves an outdoor plan indoors', severity: 'med', mitigation: 'Late October is genuinely cold after dark in most of the country. Check the forecast three days out, plan the indoor fallback for every outdoor station, and for a trunk-or-treat set the rain date in the invitation itself.' },
  ],

  contingencies: [
    { id: 'c_flame', when: 'r_flame', plan: 'If someone lights a real candle anyway, swap it for an LED the moment you see it — no discussion needed, just the swap. Keep the spare LEDs in your pocket during setup.' },
    { id: 'c_trip', when: 'r_trip', plan: 'If a guest falls: first-aid kit, ice pack, and an honest look at whether it needs more than that. Then fix the cause immediately — more light or the decoration comes down — because the second fall in the same spot is on the host.' },
    { id: 'c_cars', when: 'r_cars', plan: 'If a car needs to move during a kids\' event, one adult walks ahead of it the entire way and the kids are held at the stations until it is done. No exceptions for a slow, careful driver — slow careful drivers are what the statistics are made of.' },
    { id: 'c_scare', when: 'r_scare', plan: 'A crying kid gets out of the spooky zone, a calm adult, and a good treat, in that order. If it keeps happening, the zone\'s threshold moves up: door closed, older-kids-only sign, or the scariest prop unplugged for the night.' },
    { id: 'c_weather', when: 'r_weather', plan: 'The garage is the rain plan most houses forget they have: cars out, string lights up, and the trunk-or-treat becomes a garage-to-garage walk. Indoors, the craft station absorbs the outdoor stations\' kids.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-10d', what: 'Decor, walkway lighting, LED candles, prizes, non-food treats, craft supplies, tableware, first-aid restock' },
      { when: 'T-4d', what: 'Pumpkins — close to the party so carved faces survive to the night' },
      { when: 'T-3d', what: 'Candy, party food, drinks; batch the themed cocktail the same day' },
    ],
    preparation: [
      { when: 'T-1d evening', what: 'Carve and LED-light the pumpkins, decorate with paths kept clear, hang the walkway lights, walk the whole guest route in the dark as the final check' },
    ],
    setup: [
      { when: 'T0 -4h', what: 'Food prep: the warm anchor dish on, themed bites assembled, treat trays built' },
      { when: 'T0 -2:30', what: 'Stations built: treat table with the teal pumpkin beside the candy, kids\' craft stations stocked, photo corner lit and tested' },
      { when: 'T0 -1:30', what: 'Outside pass: walkway and step lights on, porch lit, cones out for the street lane, decor secured against wind' },
      { when: 'T0 -0:45', what: 'Costume on, playlist started low, spooky zone armed, first-aid kit placed where you can name its spot' },
    ],
    program: [
      { when: 'T0 +15m', what: 'Arrivals: costumes admired at the door, kids pointed to the stations, adults to the drinks' },
      { when: 'T0 +45m', what: 'Food out in full; the photo corner starts working the room' },
      { when: 'T0 +1:30', what: 'The costume contest: gather everyone, run the categories, keep it under fifteen minutes' },
      { when: 'T0 +1:50', what: 'Prizes handed out and the winners photographed while the room is still assembled' },
      { when: 'T0 +2:30', what: 'The shift: kids\' games wind down, the spooky zone and the dancing take over — or the kids party ends here, on time, as promised' },
      { when: 'T0 +3:30', what: 'Rides check on everyone who drank; take-home candy bags out' },
      { when: 'T0 +4h', what: 'Wind-down: music down, porch light bright for the walk to the cars' },
    ],
    cleanup: [
      { when: 'during', what: 'Candy-wrapper and cup sweep each hour; face-paint wipes deployed on sight; the treat table consolidated as it empties' },
      { when: 'T0 +4:45', what: 'The night-of teardown: food away, outdoor candy and breakables in, cobwebs down from anywhere weather reaches, trash out' },
    ],
  },

  // Day-of readiness — the audit's universal blind spots (lighting, first aid,
  // accessibility) are not fine print at this party; they are the party.
  dayOfChecklist: [
    { id: 'paths', label: 'Walkways lit and clear', detail: 'Every step and path a guest uses in the dark has light and nothing to trip on — cords taped, decor off the floor routes, and the route walked in the dark to prove it.', severity: 'high' },
    { id: 'flame', label: 'No open flames anywhere', detail: 'Every pumpkin and luminaria runs on an LED. Costumes, wigs, and crepe decor near a real candle is the classic Halloween injury — spare LEDs in your pocket for the candle someone lights anyway.', severity: 'high' },
    { id: 'cars', label: 'The car plan is running (kids outside)', detail: 'Driveway blocked or watched, the walking lane coned, glow bracelets on the kids, and one named adult on the street edge — tonight is the highest-risk pedestrian night of the year for children.', severity: 'high' },
    { id: 'allergy', label: 'The allergy-aware table is set', detail: 'Non-food treats beside the candy at the teal pumpkin, labels on anything homemade, nothing unwrapped — visible enough that a parent manages the rest without asking.', severity: 'high' },
    { id: 'rides', label: 'Rides plan for anyone drinking', detail: 'Rideshare, a sober driver, or the couch — settled before wind-down, because guests leave through streets full of trick-or-treaters.', severity: 'med' },
    { id: 'firstaid', label: 'First aid where you can name it', detail: 'Stocked kit, ice pack in the freezer, and the host knows the spot without searching — kids in vision-limiting costumes near steps make this the realistic scenario, not the paranoid one.', severity: 'med' },
    { id: 'scare', label: 'The scare level matches the crowd', detail: 'The spooky zone is opt-in with a clear threshold, the main rooms stay friendly, and the advertised level is the delivered one.', severity: 'med' },
    { id: 'access', label: 'One step-free route checked', detail: 'A guest with a stroller, cane, or wheelchair has a clear way in and a place at the party — checked by the host, not discovered by the guest.', severity: 'low' },
    { id: 'weather', label: 'Cold and rain fallback ready', detail: 'Late-October dark is cold. The indoor fallback for each outdoor station is decided, and the garage is cleared if it is the rain plan.', severity: 'low' },
  ],

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'partial',
    note: 'GROUNDING PASS 2026-08-21 (same day as authoring): the NRF/Prosper 2025 figures are verified against the NRF release itself (nrf-halloween-2025): record $13.1 billion total, $114.45 per person of which $34.24 is candy, candy $3.9B, 66% handing out candy — NOTE the release states 32% plan to THROW OR ATTEND a party, so the study\'s "29% of hosts host" figure is not the NRF number and stays attributed to the seasonal study only. The child-pedestrian risk claim is now cited (cdc-halloween-peds): CDC/FARS measured a FOURFOLD rate of child pedestrian deaths in Halloween-evening hours, the 42-year JAMA replication +43% overall with the largest increase at ages 4-8, and NHTSA ranks Oct 31 with Jan 1 as the two deadliest pedestrian days — so "highest-risk pedestrian night of the year for children" is a cited claim. Open-flame/candle risk cites nfpa-candles-ilsfm; the rides check cites nhtsa-drunk-driving. Costs: candy (channel-split per piece), beer and wine per drink, the first-aid kit and the cleanup kit now carry cited costProvenance; the 42-day planning start carries sourced timingProvenance (partychecklist-timeline-2026). Candy-per-guest, food and drink QUANTITIES remain synthesized heuristics, and the food_model/drinks cost ratios remain synthesized — no fetched source states them. ORIGINAL AUTHORING NOTE: authored 2026-08-21 off the seasonal-demand study (Q6.1): Halloween is the largest US fall event by spending (a record $13.1 billion in 2025 per NRF/Prosper Insights) and 29% of hosts host a Halloween gathering, yet no playbook covered it. The operating model: the audience decision (adults / kids / family / trunk-or-treat) gates the task list because those are four different events sharing decorations; the costume contest is the shared program beat; and the safety content is the documented Halloween failure set rather than boilerplate — open flame near costumes and crepe decor, dark-walkway falls amplified by vision-limiting masks, child pedestrian risk around cars on the year\'s highest-risk night for it, food-allergy exposure at the treat table (the Teal Pumpkin non-food-treat norm), and impaired driving through trick-or-treat streets. Lead times follow the study\'s host-guide findings — planning starts six to eight weeks out and invitations go three to four weeks out because late-October weekends fill — taken at the conservative end since no corpus playbook models a date-competitive holiday weekend. Candy (a per-guest handful, separate from door trick-or-treat volume), food, and drink quantities (deliberately below the one-drink-per-hour party norm, for the family audience and the driving context) are synthesized heuristics labeled as such. No fabricated sources.',
    sources: ['nrf-halloween-2025', 'cdc-halloween-peds', 'nhtsa-drunk-driving', 'nfpa-candles-ilsfm', 'candy-funsize-2026'],
  },
};

export default halloweenParty;
