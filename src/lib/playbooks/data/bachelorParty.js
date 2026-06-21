// Bachelor Party — Event OS host playbook (data only).
//
// A best-man-run bachelor party for the groom-to-be — the HOSTED portion of a
// night out or short trip: a base (a house / Airbnb / hotel suite), a marquee
// activity (golf, poker, a sports/steakhouse night, or a night out), hearty
// food, a beer/whiskey-forward bar, and TRANSPORT. ~6–15 guys, organized by the
// best man, who fronts costs and runs a cost-split. It is alcohol-forward, so
// the playbook treats a real safe-rides + buddy plan and "get the groom home
// safe" as first-class operational risks — not an afterthought. Quantities are
// common US hosting rules of thumb (~0.6–0.75 lb hearty food/guest, ~1 drink/
// guest/hour with water alongside, ~1.5–2 lb ice/guest), authored honestly as
// established-consensus / trade-heuristic and labeled `synthesized` until a
// foreground verification pass attaches citations. ESM default export — no CJS
// in src/ (prod-bundle-safe). No fabricated sources.

const bachelorParty = {
  type: 'Bachelor Party',
  solveFamily: 'bachelorette',
  family: 'host_driven',
  recordKind: 'client',
  version: '1.0.0',
  meta: {
    summary: 'A best-man-run bachelor party for the groom — the hosted portion of a night out or short trip: a base (house / Airbnb / suite), a marquee activity (golf, poker, a sports/steakhouse night, or a night out), hearty food, a beer + whiskey-forward bar, and transport. Small crew (~6–15). It is alcohol-forward, so the playbook front-loads the date/guest list/activity + the cost-split and back-loads a calm itinerary built around ONE non-negotiable: every guy — especially the groom — gets home safe. Drinking with a safe-rides + buddy plan is treated as a real risk, not a footnote.',
    typicalGuests: { low: 6, default: 10, high: 15 },
    typicalDurationHours: 8,
    leadTimeDays: 30,
    hostDifficulty: 'moderate',
    perGuestCost: { low: 75, high: 350, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The toast — the one where the best man says the thing he\'d never say sober.',
    'The whole crew finally together, first round in hand, and nobody checks their phone.',
    'The groom\'s face when he realizes the night is exactly what he would have picked.',
    'The quiet end-of-night moment when everyone agrees it was a good one.',
  ],

  decisions: [
    { id: 'activity', label: 'Marquee activity', options: ['Golf outing', 'Poker night (in)', 'Sports game / tailgate', 'Steakhouse dinner', 'Night out (bars / club)'], default: 'Steakhouse dinner', when: 'T-21d', blocks: ['food', 'logistics', 'transport'], why: 'The activity is the spine of the whole day — it sets the venue, the booking lead time, the transport, and how heavy the bar runs. Confirm what the GROOM actually wants (not what the crew wants) before anything else.' },
    { id: 'costsplit', label: 'Budget + cost-split (the groom never pays)', options: ['Even split among the crew', 'Best man fronts, Venmo settle after', 'Tiered (travel pay more)', 'Pooled kitty up front'], default: 'Best man fronts, Venmo settle after', when: 'T-21d', blocks: ['food', 'beverage_purchases', 'logistics'], why: 'Sets the per-head number and prevents the classic blow-up: hidden costs and an awkward end-of-night reconciliation. Agree the cap AND the method up front, and the groom is comped — the crew covers his share.' },
    { id: 'base', label: 'Home base', options: ['Host\'s house', 'Airbnb / rental', 'Hotel suite', 'No base (dinner → out)'], default: 'Airbnb / rental', when: 'T-21d', blocks: ['logistics'], why: 'Where the crew pre-games, regroups, crashes, and where the groom sobers up. A base with beds removes the late-night "how is everyone getting home" scramble.' },
    { id: 'bar', label: 'Bar style', options: ['Beer + whiskey', 'Beer only / BYOB', 'Full bar', 'Light / pace-it'], default: 'Beer + whiskey', when: 'T-14d', blocks: ['beverage_purchases'], why: 'Drives beer/spirit/mixer volume and ice. Whatever the style, water and food are planned ALONGSIDE the bar, never as an afterthought — pacing is a safety lever.' },
  ],

  milestones: [
    { id: 'bp_setdate', name: 'Set date, guest list, budget cap + cost-split with the crew', offsetDays: 30, owner: 'host', category: 'planning', risk: { ifDelayed: 'Crew can\'t commit / book; per-head number unknown', severity: 'med' } },
    { id: 'bp_book', name: 'Book the activity + base (and a dinner reservation)', offsetDays: 21, owner: 'host', dependsOn: ['bp_setdate'], category: 'logistics', risk: { ifDelayed: 'Tee time / table / suite sold out — the whole plan unravels', severity: 'high' } },
    { id: 'bp_transport', name: 'Lock transport + the safe-rides plan (designated driver or pre-booked rides)', offsetDays: 14, owner: 'host', dependsOn: ['bp_book'], category: 'logistics', risk: { ifDelayed: 'No way home at 1am for a drinking crew — the single highest-stakes gap', severity: 'high' } },
    { id: 'bp_rsvp', name: 'Lock final headcount + collect everyone\'s share', offsetDays: 5, owner: 'host', dependsOn: ['bp_setdate'], category: 'guest', risk: { ifDelayed: 'Over/under-buy; best man eats the shortfall', severity: 'med' } },
    { id: 'bp_shop_nonperish', name: 'Buy beer, whiskey, mixers, water, disposables, snacks', offsetDays: 3, owner: 'host', dependsOn: ['bp_rsvp'], category: 'shopping', risk: null },
    { id: 'bp_shop_fresh', name: 'Buy proteins / wings / pizza order, fresh food, ice plan', offsetDays: 1, owner: 'host', dependsOn: ['bp_rsvp'], category: 'shopping', risk: { ifDelayed: 'Sold-out proteins; no hearty food = a fast-drunk crew', severity: 'med' } },
    { id: 'bp_setup', name: 'Stock the base, set the bar + water station, confirm rides', offsetDays: 0, owner: 'host', dependsOn: ['bp_shop_nonperish', 'bp_shop_fresh', 'bp_transport'], category: 'setup', risk: null },
    { id: 'event', name: 'The bachelor party', offsetDays: 0, owner: 'host', dependsOn: ['bp_setup'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_groomcheck', milestoneId: 'bp_setdate', phase: 'planning', label: 'Confirm with the GROOM: what he actually wants + any hard no\'s', when: 'T-30d' },
    { id: 't_split', milestoneId: 'bp_setdate', phase: 'planning', label: 'Agree the budget cap + cost-split method; groom is comped', when: 'T-30d' },
    { id: 't_book', milestoneId: 'bp_book', phase: 'logistics', label: 'Book tee time / table / suite / tickets; get confirmations in writing', when: 'T-21d' },
    { id: 't_rides', milestoneId: 'bp_transport', phase: 'logistics', label: 'Lock the safe-rides plan: DD or pre-booked rideshare/van + the cash for it', when: 'T-14d' },
    { id: 't_buddy', milestoneId: 'bp_transport', phase: 'planning', label: 'Name a buddy for the groom + a sober point-person; share the plan in the group chat', when: 'T-14d' },
    { id: 't_collect', milestoneId: 'bp_rsvp', phase: 'guest', label: 'Lock headcount; collect each person\'s share (cover the groom)', when: 'T-5d' },
    { id: 't_nonperish_shop', milestoneId: 'bp_shop_nonperish', phase: 'shopping', label: 'Beer, whiskey, mixers, WATER, disposables, snacks', when: 'T-3d' },
    { id: 't_fresh_shop', milestoneId: 'bp_shop_fresh', phase: 'shopping', label: 'Proteins / wings / pizza order, fresh food', when: 'T-1d' },
    { id: 't_setup', milestoneId: 'bp_setup', phase: 'setup', label: 'Stock the base, build the bar + a visible water/food station, confirm rides', when: 'T0 -2h' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Get the groom home/to bed safe, headcount the crew, pack leftovers, bag bottles/cans, settle the split', when: 'T0 +8:00' },
  ],

  purchases: [
    { id: 'p_food', item: 'Hearty food (grill proteins, wings, or a pizza order)', category: 'food', qtyPerGuest: 0.7, unit: 'lb', where: ['Grocery', 'Costco', 'Butcher', 'Wing/pizza spot'], unitCostRange: [5, 11], essential: true, buyAt: 'T-1d', note: 'These guys eat — ~0.6–0.75 lb/guest. Food is also a SAFETY lever: a fed crew drinks slower.', alternatives: ['Frozen pizza (Costco) — cheap, feeds same crowd, no delivery wait', 'Grocery rotisserie chickens — budget pick-up option', 'Costco/Sam\'s jumbo wing tray — cheaper than ordering wings out'], provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: '~0.6–0.75 lb hearty food/guest for a drinking crowd of men.' } },
    { id: 'p_snacks', item: 'Bar snacks (chips, pretzels, jerky, nuts, pizza rolls)', category: 'food', qtyPerGuest: 0.3, unit: 'lb', where: ['Grocery', 'Costco'], unitCostRange: [1, 3], essential: true, buyAt: 'T-3d', note: 'Keep something salty out the WHOLE time — constant grazing paces the drinking.', alternatives: ['Store-brand chips + dip — cheapest per oz', 'Peanuts / mixed nuts in bulk — high protein, keeps people full longer'] },
    { id: 'p_beer', item: 'Beer', category: 'beverage', qtyPerGuest: 6, unit: 'cans/bottles', where: ['Grocery', 'Costco', 'Liquor store'], unitCostRange: [1.5, 3.5], essential: true, buyAt: 'T-3d', note: '~1 drink/guest/hour over the hosted hours; beer is the workhorse. Buy a little long, not short.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: '~1 drink/guest/hour; ~2 in hour one then ~1/hr is the common US party heuristic.' } },
    { id: 'p_whiskey', item: 'Whiskey / spirits', category: 'beverage', qtyPerGuest: 0.2, unit: 'bottle (750ml)', where: ['Liquor store', 'Costco'], unitCostRange: [18, 45], essential: false, buyAt: 'T-3d', note: '~1 bottle per ~5 guests (≈16 pours each, cut with mixers). A whiskey for the groom\'s toast is a nice touch.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: '~1 750ml bottle of spirits per ~5 guests when mixed.' } },
    { id: 'p_mixers', item: 'Mixers (soda, tonic, cola, ginger ale)', category: 'beverage', qtyPerGuest: 1, unit: 'liter', where: ['Grocery', 'Costco'], unitCostRange: [1, 2.5], essential: false, buyAt: 'T-3d' },
    { id: 'p_water', item: 'Water + electrolyte/sports drinks', category: 'beverage', qtyPerGuest: 4, unit: 'bottles', where: ['Grocery', 'Costco'], unitCostRange: [0.3, 0.8], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN — and the single best safety buy. ~1 water between drinks; keep it as visible and stocked as the beer. Sets up the morning-after too.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: 'Alternate-with-water pacing is the standard responsible-hosting practice.' } },
    { id: 'p_nabeer', item: 'Non-alcoholic beer / sodas for the DD and non-drinkers', category: 'beverage', qtyPerGuest: 1, unit: 'drinks', where: ['Grocery'], unitCostRange: [1, 3], essential: true, buyAt: 'T-3d', note: 'The designated driver should never be the only one with an empty hand — stock a real zero-proof option.' },
    { id: 'p_ice', item: 'Ice (coolers + drinks)', category: 'beverage', qtyPerGuest: 2, unit: 'lb', where: ['Grocery', 'Gas station'], unitCostRange: [0.2, 0.4], essential: true, buyAt: 'T0', note: 'COMMONLY FORGOTTEN. ~1.5–2 lb/guest to chill a beer + whiskey bar all night.', provenance: { tier: 'trade-heuristic', confidence: 'medium', verificationStatus: 'synthesized', note: '~1.5–2 lb ice/guest for sustained cooler/bar service.' } },
    { id: 'p_disposables', item: 'Cups, koozies, napkins, plates, bottle opener', category: 'rental', qtyPerGuest: 2, unit: 'set', where: ['Grocery', 'Costco', 'Party store'], unitCostRange: [0.3, 1], essential: true, buyAt: 'T-3d', note: 'Heavy-duty cups + a couple of bottle openers; koozies double as a low-key party favor.' },
    { id: 'p_aftercare', item: 'Morning-after kit (electrolytes, pain reliever, greasy-breakfast plan)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Pharmacy'], unitCostRange: [10, 25], essential: false, buyAt: 'T-3d', note: 'Hydration + a breakfast plan so the groom is human the next day; part of getting everyone home and well.' },
    { id: 'p_decor', item: 'Light decor (sash/hat for the groom, banner)', category: 'decor', qtyFlat: 1, unit: 'kit', where: ['Party store', 'Amazon'], unitCostRange: [10, 30], essential: false, buyAt: 'T-3d', note: 'Keep it tasteful and groom-approved — a hat or sash, not a whole theme.' },
    { id: 'p_cleanup', item: 'Trash + recycling bags, paper towels, foil', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery'], unitCostRange: [8, 15], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN: a recycling bag for the bottles/cans + foil for leftovers. Leave the base / rental as you found it (deposit).' },
  ],

  rentalsGap: [
    { item: 'Coolers', qtyPerGuest: 0.15, note: 'roughly one large cooler per ~7 guys for beer + ice' },
    { item: 'Folding chairs', qtyPerGuest: 0.6, note: 'poker/sports nights need seating; borrow if short' },
    { item: 'Folding tables', qtyFlat: 2, note: 'bar/food station + a poker/card table' },
    { item: 'Bluetooth speaker', qtyFlat: 1, note: 'a playlist carries the night — charge it' },
  ],

  vendors: [
    { category: 'Activity venue (golf / tickets / club table)', required: true, altToDIY: 'Poker night or backyard grill at the base', when: 'T-21d', costRange: [40, 200], costUnit: 'per guest' },
    { category: 'Lodging (Airbnb / hotel suite)', required: false, altToDIY: 'Host\'s house / no overnight base', when: 'T-21d', costRange: [40, 150], costUnit: 'per guest' },
    { category: 'Transport (party bus / van / pre-booked rideshare)', required: true, altToDIY: 'Sober designated driver(s) from the crew', when: 'T-14d', costRange: [25, 100], costUnit: 'per guest' },
    { category: 'Restaurant / steakhouse (private table or large reservation)', required: false, altToDIY: 'Grill at the base', when: 'T-14d', costRange: [40, 120], costUnit: 'per guest' },
  ],

  risks: [
    { id: 'r_overserve', trigger: 'Over-serving — the groom or a guest drinks past safe limits', severity: 'high', mitigation: 'Pace it: ~1 drink/guest/hour, water between rounds, hearty food out the whole time, and a hard stop / switch-to-water near the end. A sober point-person watches the room and is empowered to slow things down. This is the host\'s duty of care, not a buzzkill.' },
    { id: 'r_saferides', trigger: 'No safe way home for a drinking crew — nobody sober, no rides booked', severity: 'high', mitigation: 'Lock transport at T-14d: a designated driver who stays sober (stocked with N/A drinks) OR a pre-booked party bus / van / rideshare with the cash set aside. NOBODY who has been drinking drives. A base with beds means worst case, everyone crashes there.' },
    { id: 'r_groomhome', trigger: 'The groom is too drunk / gets separated — doesn\'t make it home safe', severity: 'high', mitigation: 'Buddy system: one named guy is the groom\'s buddy all night and does not leave his side; the sober point-person has the plan to get him back to the base and to bed. Phones charged, location-share on, meeting spot agreed. Getting the groom home safe is the ONE non-negotiable success metric.' },
    { id: 'r_booking', trigger: 'Activity / table / suite sold out or unconfirmed', severity: 'high', mitigation: 'Book at T-21d and get every confirmation in writing; hold a backup (poker night at the base) that needs no reservation.' },
    { id: 'r_money', trigger: 'Cost blow-up — hidden costs, no split agreed, best man eats it', severity: 'med', mitigation: 'Agree a per-head CAP and the split METHOD up front; collect shares before the day (cover the groom); track spend so the end-of-night Venmo is clean.' },
    { id: 'r_legal', trigger: 'Rowdy crew — noise, property damage, or trouble at a venue', severity: 'med', mitigation: 'Respect the venue/rental rules and the deposit; keep it to the booked spaces; the sober point-person heads off anything that\'s heading sideways before it costs the crew.' },
  ],

  contingencies: [
    { id: 'c_overserve', when: 'r_overserve', plan: 'If someone\'s overdoing it, the point-person quietly switches them to water + food and slows the round; if it\'s a real concern, the night ends early — no one is shamed for calling it.' },
    { id: 'c_saferides', when: 'r_saferides', plan: 'If the DD falls through or rides surge, call a van/cab, split a ride, or everyone sleeps at the base — never let a drinking guest drive. Keep cash + the rideshare app ready as a fallback.' },
    { id: 'c_groomhome', when: 'r_groomhome', plan: 'If the groom is done, his buddy + the point-person take him back to the base, hydrate him, and stay until he\'s settled; the rest of the crew carries on without dragging him along.' },
    { id: 'c_booking', when: 'r_booking', plan: 'If the booking falls through, pivot to the base backup (poker + grill + cards) and refund/redirect any prepaid funds in the split.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Beer, whiskey, mixers, WATER + electrolytes, N/A options, snacks, disposables, decor, aftercare, cleanup kit' },
      { when: 'T-1d', what: 'Proteins / wings / confirm the pizza order, fresh food' },
      { when: 'T0', what: 'Ice (lots) + any last-minute fresh items' },
    ],
    preparation: [
      { when: 'T-1d', what: 'Prep/marinate proteins or stage the pizza order; charge phones + speaker; confirm rides + reservations' },
      { when: 'T0 -2h', what: 'Chill the beer, set up coolers + ice, lay out food + water station, confirm the DD/rides one more time' },
    ],
    setup: [
      { when: 'T0 -2h', what: 'Stock the base, build the bar, set a VISIBLE water + food station next to the bar, stage trash/recycling' },
      { when: 'T0 -0:30', what: 'Brief the crew on the plan + the buddy/point-person + the ride-home plan; start the playlist' },
    ],
    cleanup: [
      { when: 'during', what: 'Point-person keeps water + food flowing and watches the groom; bag bottles/cans as you go' },
      { when: 'T0 +8h', what: 'Get the groom home/to bed safe, headcount the whole crew before anyone leaves, pack leftovers, bag trash/recycling, leave the rental clean, settle the split' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Quantities reflect common US hosting rules of thumb for a small bachelor crew: ~0.6–0.75 lb hearty food/guest (these guys eat — and a fed crew drinks slower), ~1 drink/guest/hour over the hosted hours with water planned ALONGSIDE the bar (~1 water between drinks), ~1 spirits bottle per ~5 guests when mixed, and ~1.5–2 lb ice/guest. On safety: this playbook is deliberately alcohol-aware. Because the event is drinking-forward, over-serving, a safe-rides plan (a sober designated driver or pre-booked transport — nobody who has been drinking drives), and a buddy system to get the GROOM home safe are modeled as first-class, high-severity risks with named owners (a sober point-person + the groom\'s buddy), not etiquette footnotes. The single success metric the playbook holds above the fun is that everyone — especially the groom — gets home safe. The groom is comped; the crew covers his share, and a per-head cap + split method are agreed up front to avoid a money blow-up. Authored as established-consensus / trade-heuristic and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default bachelorParty;
