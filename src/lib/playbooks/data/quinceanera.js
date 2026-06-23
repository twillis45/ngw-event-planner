// Quinceañera host playbook — NGW Event Boss
// Family: quinceanera (Latino milestone — a girl's 15th birthday / coming-of-age).
// Full-service and vendor-led: a salón/venue, a caterer, a DJ or banda, a
// photographer/videographer, a baker, a florist, the ballgown and the court's
// attire, often a choreographer and an MC. Many families open with a Catholic
// Mass or blessing (the misa) and then move to the reception; others hold a
// secular celebration. The honored ceremonial moments — the changing of shoes
// (flats to heels) by the father, the last doll (última muñeca), the crowning,
// the toast (brindis), the father-daughter dance, sometimes the fifteen candles
// or roses — and the choreographed waltz (vals) danced by the quinceañera with
// her court of damas and chambelanes, are the heart of the day.
//
// Traditions differ across the Latino diaspora — Mexican, Central American,
// Caribbean and South American families each carry their own customs, music,
// and order of events, and some celebrate religiously while others do not. This
// playbook treats the family's choices as the source of truth and offers the
// common elements as options, never requirements. Figures are synthesized from
// widely published US event-planning norms applied with planner judgment, and
// are labeled synthesized until a foreground verification pass attaches sources.

const quinceanera = {
  type: 'Quinceañera',
  solveFamily: 'quinceanera',
  family: 'full_service',
  recordKind: 'client',
  version: '1.0.0',

  meta: {
    summary:
      'A quinceañera — the Latino milestone celebrating a girl\'s fifteenth birthday and her passage toward womanhood. Vendor-led and roughly nine months in the making: a salón or banquet hall, a caterer for a seated Latino meal, a DJ or live banda, a photographer and videographer, a tiered cake, flowers, the ballgown ordered and altered months ahead, the court\'s coordinated attire, and often a choreographer and MC. Many families begin with a church Mass or blessing (the misa) and then move to the reception; others celebrate secularly. The day is carried by its ceremonial moments — the changing of the shoes by the father, the last doll, the crowning, the toast, the father-daughter dance, sometimes fifteen candles or roses — and by the choreographed waltz (vals) the quinceañera dances with her court of damas and chambelanes after months of rehearsal. Customs vary across Mexican, Central American, Caribbean and South American traditions; the family\'s choices lead.',
    typicalGuests: { low: 80, default: 150, high: 250 },
    typicalDurationHours: 6,
    leadTimeDays: 270,
    hostDifficulty: 'high',
    perGuestCost: { low: 60, high: 150, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The vals — the quinceañera dances with her court and months of rehearsal become one perfect song.',
    'Her father changes her shoes and neither of them makes it through without tears.',
    'The crowning — the tiara goes on and the whole room sees her as the young woman she is.',
    'The first dance with her father — just the two of them, in the middle of everything.',
    'The brindis lands and she looks around the room at everyone who came for her.',
  ],

  decisions: [
    {
      id: 'religious_or_secular',
      label: 'Will there be a church Mass / blessing (misa), or a secular celebration?',
      options: ['Catholic Mass (misa) then reception', 'Church blessing only, then reception', 'Reception only (secular)'],
      default: 'Catholic Mass (misa) then reception',
      when: 'T-270d',
      blocks: ['ceremony', 'vendors', 'timeline'],
      why: 'This is the first and most defining choice, and it belongs to the family. A full Mass means booking the parish and priest early (popular churches book a year out), arranging readings, padrinos, and sometimes pre-Cana-style preparation, and building the day as church-then-reception. A blessing is lighter; a secular quince skips the church entirely. Mexican, Central American, Caribbean and South American families handle this differently — confirm the family\'s tradition rather than assuming.',
    },
    {
      id: 'venue',
      label: 'Choose the reception venue (salón / banquet hall)',
      options: ['Banquet hall / salón de fiestas', 'Hotel ballroom', 'Community / parish hall', 'Outdoor or tented venue'],
      default: 'Banquet hall / salón de fiestas',
      when: 'T-270d',
      blocks: ['guest_count', 'catering', 'rentals', 'budget'],
      why: 'A quince is a large seated event; the venue sets capacity, whether tables, chairs, linens and a dance floor are included, parking, the curfew, and whether you can bring your own caterer or must use theirs. Salones that host quinces book the best Saturdays a year ahead — lock this first, right alongside the church if there is a Mass.',
    },
    {
      id: 'court_size',
      label: 'How large is the court (damas and chambelanes)?',
      options: ['No formal court', 'Small court (~5-7 pairs)', 'Traditional 14 damas + 14 chambelanes', 'Quinceañera\'s own choice'],
      default: 'Small court (~5-7 pairs)',
      when: 'T-240d',
      blocks: ['attire', 'rehearsals', 'choreography'],
      why: 'The court (corte de honor) walks with the quinceañera and dances the vals. Tradition is 14 damas and 14 chambelanes (with her completing fifteen), but many families choose a smaller court — picking members who will actually commit to months of rehearsals is famously the hardest part of planning. Court size drives attire counts, the choreography, and the rehearsal schedule, so settle it early.',
    },
    {
      id: 'dress',
      label: 'Order the quinceañera ballgown and the court attire',
      options: ['Custom / boutique ballgown', 'Off-the-rack ballgown + alterations', 'Family heirloom / borrowed gown'],
      default: 'Off-the-rack ballgown + alterations',
      when: 'T-240d',
      blocks: ['attire', 'fittings'],
      why: 'The ballgown is the centerpiece and the longest-lead item — custom gowns take months to make and every gown needs fittings and alterations. Order ~6-8 months out so there is room for the final fitting close to the date. The court\'s dresses and the chambelanes\' suits should be coordinated to the gown\'s color story and ordered in the same window.',
    },
    {
      id: 'theme_colors',
      label: 'Pick the theme and color story',
      options: ['Classic / fairytale', 'Single signature color', 'Cultural / regional motif', 'Modern / aesthetic'],
      default: 'Single signature color',
      when: 'T-210d',
      blocks: ['decor', 'florals', 'attire', 'invitations'],
      why: 'The color story ties the gown, the court attire, the flowers, the linens, the cake, and the invitations together. Let the quinceañera own this — it is her celebration and the choice she will care about most. Decide it before ordering attire and booking the florist so everything matches.',
    },
    {
      id: 'vals_song',
      label: 'Choose the vals (waltz) song and music plan',
      options: ['Classical Spanish-language waltz', 'Modern song, waltz-choreographed', 'Surprise dance (baile sorpresa) + vals', 'Live banda for the vals'],
      default: 'Classical Spanish-language waltz',
      when: 'T-180d',
      blocks: ['choreography', 'rehearsals', 'music'],
      why: 'The vals song sets the choreography the court rehearses for months, and many quinces add a high-energy surprise dance (baile sorpresa) right after. Choosing the song early gives the choreographer and the court time to learn it. It also shapes the music plan — a DJ spinning cumbia, banda, and reggaetón, a live banda or mariachi for key moments, or both.',
    },
  ],

  milestones: [
    {
      id: 'lock_date_church_venue',
      name: 'Lock the date, the church (if a Mass), and the venue',
      offsetDays: 270,
      owner: 'host',
      category: 'planning',
      risk: { ifDelayed: 'Parishes and the best salones book a year ahead; a late start forces a worse date, a Friday/Sunday, or a lesser venue.', severity: 'high' },
    },
    {
      id: 'order_gown_court',
      name: 'Order the ballgown and the court attire',
      offsetDays: 240,
      owner: 'host',
      dependsOn: ['lock_date_church_venue'],
      category: 'attire',
      risk: { ifDelayed: 'Custom gowns take months and need alterations; a late order risks no time for fittings or a gown that does not arrive.', severity: 'high' },
    },
    {
      id: 'book_core_vendors',
      name: 'Book caterer, photographer/video, DJ or banda, and baker',
      offsetDays: 180,
      owner: 'host',
      dependsOn: ['lock_date_church_venue'],
      category: 'vendors',
      risk: { ifDelayed: 'In-demand quince vendors book six months to a year out; late booking means weaker vendors or paying a premium.', severity: 'high' },
    },
    {
      id: 'set_court_choreographer',
      name: 'Finalize the court, book the choreographer, set rehearsal schedule',
      offsetDays: 120,
      owner: 'host',
      dependsOn: ['order_gown_court'],
      category: 'planning',
      risk: { ifDelayed: 'The vals and surprise dance need months of rehearsal; a late court or choreographer means an under-rehearsed, stressful dance.', severity: 'high' },
    },
    {
      id: 'florist_decor_invites',
      name: 'Book florist and decor; send invitations',
      offsetDays: 90,
      owner: 'host',
      dependsOn: ['book_core_vendors'],
      category: 'planning',
      risk: { ifDelayed: 'Invitations sent late suppress RSVPs for a large family event; florists book popular dates out months ahead.', severity: 'med' },
    },
    {
      id: 'vals_rehearsals',
      name: 'Vals and surprise-dance rehearsals in progress',
      offsetDays: 60,
      owner: 'host',
      dependsOn: ['set_court_choreographer'],
      category: 'planning',
      risk: { ifDelayed: 'A court that has not rehearsed enough will not be ready; the dance is the emotional center of the reception.', severity: 'high' },
    },
    {
      id: 'final_fitting_count',
      name: 'Final gown fitting, headcount, and vendor confirmations',
      offsetDays: 30,
      owner: 'host',
      dependsOn: ['florist_decor_invites', 'book_core_vendors', 'order_gown_court'],
      category: 'logistics',
      risk: { ifDelayed: 'A gown that does not fit on the day, an unconfirmed caterer count, or a vendor that drops can unravel the event.', severity: 'high' },
    },
    {
      id: 'runofshow_ceremony_prep',
      name: 'Lock the run-of-show and ceremonial items (shoes, doll, crown, candles)',
      offsetDays: 14,
      owner: 'host',
      dependsOn: ['final_fitting_count', 'vals_rehearsals'],
      category: 'planning',
      risk: { ifDelayed: 'Missing the heels, the doll, the crown, or the toast supplies derails the signature moments the family will remember.', severity: 'med' },
    },
    {
      id: 'final_rehearsal_pickups',
      name: 'Final rehearsal; pick up gown, cake, flowers; confirm everyone',
      offsetDays: 7,
      owner: 'host',
      dependsOn: ['runofshow_ceremony_prep'],
      category: 'logistics',
      risk: { ifDelayed: 'A skipped final rehearsal or a forgotten pickup leaves the day improvised; confirm every vendor and court member.', severity: 'med' },
    },
    {
      id: 'event_day',
      name: 'The quinceañera (Mass and/or reception)',
      offsetDays: 0,
      owner: 'host',
      dependsOn: ['final_rehearsal_pickups'],
      category: 'event',
      risk: null,
    },
  ],

  tasks: [
    { id: 't_budget', milestoneId: 'lock_date_church_venue', phase: 'plan', label: 'Set the budget with the family; line up padrinos/sponsors who may cover the cake, gown, flowers, or music', when: 'T-270d' },
    { id: 't_church', milestoneId: 'lock_date_church_venue', phase: 'plan', label: 'If holding a Mass, book the parish and priest; confirm any preparation requirements and readings', when: 'T-268d' },
    { id: 't_venue_walk', milestoneId: 'lock_date_church_venue', phase: 'plan', label: 'Tour venues: capacity, included tables/chairs/linens/floor, parking, curfew, in-house vs outside caterer', when: 'T-265d' },
    { id: 't_gown_order', milestoneId: 'order_gown_court', phase: 'plan', label: 'Order the ballgown; choose and order damas\' dresses and chambelanes\' suits to the color story', when: 'T-240d' },
    { id: 't_vendor_book', milestoneId: 'book_core_vendors', phase: 'plan', label: 'Book caterer, photographer + videographer, DJ/banda, and baker; sign contracts and pay deposits', when: 'T-180d' },
    { id: 't_court', milestoneId: 'set_court_choreographer', phase: 'plan', label: 'Confirm damas and chambelanes who will commit to rehearsals; book the choreographer; set a weekly rehearsal slot', when: 'T-120d' },
    { id: 't_vals_song', milestoneId: 'set_court_choreographer', phase: 'plan', label: 'Finalize the vals song and any surprise-dance track; share with the choreographer', when: 'T-118d' },
    { id: 't_florist', milestoneId: 'florist_decor_invites', phase: 'plan', label: 'Book florist and decor/centerpieces to the color story; reserve a backdrop and entrance arch', when: 'T-90d' },
    { id: 't_invites', milestoneId: 'florist_decor_invites', phase: 'plan', label: 'Send invitations with RSVP date and Mass + reception times; track replies for the count', when: 'T-88d' },
    { id: 't_rehearse', milestoneId: 'vals_rehearsals', phase: 'plan', label: 'Run weekly vals and surprise-dance rehearsals; confirm court attire fittings', when: 'T-60d' },
    { id: 't_fitting', milestoneId: 'final_fitting_count', phase: 'plan', label: 'Final gown and court fittings; lock headcount and give the caterer the final count', when: 'T-30d' },
    { id: 't_ceremony_items', milestoneId: 'runofshow_ceremony_prep', phase: 'plan', label: 'Gather the heels, the last doll, the crown/tiara, the toast glasses, and candles/roses; assign each moment to a person', when: 'T-14d' },
    { id: 't_runofshow', milestoneId: 'runofshow_ceremony_prep', phase: 'plan', label: 'Write the reception run-of-show: entrance, vals, shoes, doll, crowning, toast, father-daughter dance, dinner, open floor', when: 'T-14d' },
    { id: 't_final_rehearsal', milestoneId: 'final_rehearsal_pickups', phase: 'prep', label: 'Hold the final full rehearsal; brief the MC; confirm every vendor and court member by phone', when: 'T-7d' },
    { id: 't_pickups', milestoneId: 'final_rehearsal_pickups', phase: 'prep', label: 'Pick up the gown, confirm cake and flower delivery windows, and stage all ceremonial items', when: 'T-2d' },
    { id: 't_dayof', milestoneId: 'event_day', phase: 'event', label: 'Hair/makeup, Mass, photos, then reception; run the ceremonial moments to the timeline', when: 'T0' },
    { id: 't_cleanup', milestoneId: 'event_day', phase: 'cleanup', label: 'Settle vendor balances and tips, recover rental deposits, gather gifts and the doll/crown, final venue walkthrough', when: 'T0 +6:00' },
  ],

  purchases: [
    {
      id: 'p_dinner',
      item: 'Seated Latino dinner (caterer per-plate, e.g. mole, carne asada, arroz, frijoles, tortillas)',
      category: 'food',
      qtyPerGuest: 1,
      unit: 'plate',
      where: ['Caterer', 'Venue in-house catering'],
      unitCostRange: [18, 45],
      essential: true,
      buyAt: 'T-3d',
      note: 'A quince is a full seated meal, not a buffet of snacks. The menu reflects the family\'s tradition — Mexican, Central American, Caribbean or South American. Give the caterer the final count at T-30d; the per-plate price is set by contract well before.',
      provenance: { tier: 'norm', confidence: 'med', verificationStatus: 'synthesized', note: 'US catered-event norm: ~$18-45/plate for a seated meal.' },
      alternatives: ['Chicken mole instead of beef — cheaper, traditional and impressive', 'Buffet-style rice + beans + chicken — lower cost per head than plated'],
    },
    {
      id: 'p_appetizers',
      item: 'Botanas — chips, salsa & guacamole, taquitos',
      category: 'food',
      qtyPerGuest: 3,
      unit: 'pieces',
      where: ['Caterer', 'Grocery / warehouse club'],
      unitCostRange: [0.75, 2.5],
      essential: false,
      buyAt: 'T-1d',
      note: 'Light bites while guests arrive and photos are taken keeps the room comfortable before the seated dinner.',
      alternatives: ['Chips + salsa + guacamole station — budget appetizer swap', 'Taquitos (frozen) baked tray — cheaper passed app option'],
    },
    {
      id: 'p_cake',
      item: 'Tiered quinceañera cake (to the color story; serves the headcount)',
      category: 'food',
      qtyFlat: 1,
      unit: 'cake',
      where: ['Bakery / pastelería'],
      unitCostRange: [250, 700],
      essential: true,
      buyAt: 'T-1d',
      note: 'A multi-tier cake is a centerpiece and a photo moment, often matched to the gown. Order from the baker at T-180d; pick up or confirm delivery the day before. Some families add a smaller decorative top tier and sheet cakes to serve a large crowd.',
      alternatives: ['Grocery bakery sheet cake with custom decorations — far cheaper', 'Tres leches cake from Latin bakery — traditional, often more affordable'],
    },
    {
      id: 'p_beverages',
      item: 'Aguas frescas, soda & juice (coffee; + alcohol for adults if served)',
      category: 'beverage',
      qtyPerGuest: 4,
      unit: 'servings',
      where: ['Warehouse club', 'Grocery', 'Beverage / liquor supplier'],
      unitCostRange: [0.75, 3],
      essential: true,
      buyAt: 'T-3d',
      note: 'Plan ~1 drink/guest/hr over a 6-hour event. Aguas frescas and soda for everyone; if the family serves alcohol for adults, confirm whether the venue requires a licensed bar and that minors are not served.',
      provenance: { tier: 'norm', confidence: 'med', verificationStatus: 'synthesized', note: 'US beverage norm: ~1 drink/guest/hr over the event.' },
    },
    {
      id: 'p_ice',
      item: 'Ice for drinks and bar service',
      category: 'beverage',
      qtyPerGuest: 1.5,
      unit: 'lb',
      where: ['Grocery', 'Ice supplier / gas station'],
      unitCostRange: [0.25, 0.5],
      essential: true,
      buyAt: 'T0',
      note: 'Buy day-of so it does not melt. ~1-1.5 lb/guest for a long event with a bar; the venue or caterer may supply it — confirm in the contract.',
      provenance: { tier: 'norm', confidence: 'high', verificationStatus: 'synthesized', note: 'US norm: ~1-1.5 lb ice/guest for a full bar event.' },
    },
    {
      id: 'p_florals',
      item: 'Florals: centerpieces, ceremony flowers, bouquet, court accents',
      category: 'decor',
      qtyFlat: 1,
      unit: 'package',
      where: ['Florist', 'Wholesale flower market (DIY)'],
      unitCostRange: [600, 2500],
      essential: true,
      buyAt: 'T-1d',
      note: 'Centerpieces on every table plus the entrance, the head table, and ceremony pieces. Booked with the florist at T-90d to the color story; delivered the day before or the morning of.',
    },
    {
      id: 'p_decor',
      item: 'Decor: backdrop, entrance arch, linens (if not venue-supplied), signage, balloons',
      category: 'decor',
      qtyFlat: 1,
      unit: 'package',
      where: ['Event decorator', 'Party store', 'Online (Etsy/Amazon)'],
      unitCostRange: [300, 1500],
      essential: true,
      buyAt: 'T-3d',
      note: 'The backdrop and entrance set the theme and anchor photos and the grand entrance. Confirm what linens and a dance floor the venue includes so you do not pay twice.',
    },
    {
      id: 'p_doll_crown',
      item: 'Ceremonial items: last doll (última muñeca), tiara/crown, scepter, heels, toast glasses, candles/roses',
      category: 'decor',
      qtyFlat: 1,
      unit: 'set',
      where: ['Quinceañera boutique', 'Online', 'Party store'],
      unitCostRange: [80, 300],
      essential: true,
      buyAt: 'T-3d',
      note: 'COMMONLY FORGOTTEN under the bigger vendor decisions. The heels for the changing of the shoes, the last doll, the crown and scepter, the toast glasses, and any candles or roses are small purchases that carry the most meaningful moments — gather them in one kit at T-14d and assign who hands off each.',
    },
    {
      id: 'p_favors',
      item: 'Recuerdos (favors) for guests',
      category: 'decor',
      qtyPerGuest: 1,
      unit: 'favor',
      where: ['Quinceañera boutique', 'Online', 'Party store'],
      unitCostRange: [1.5, 6],
      essential: false,
      buyAt: 'T-3d',
      note: 'Recuerdos are a warm quince tradition — a small keepsake per guest, often personalized with the quinceañera\'s name and date.',
    },
    {
      id: 'p_tableware',
      item: 'Tableware / disposables (if the venue or caterer does not supply place settings)',
      category: 'rental',
      qtyPerGuest: 2.5,
      unit: 'place settings/cups',
      where: ['Warehouse club', 'Party store', 'Rental company'],
      unitCostRange: [0.4, 1.5],
      essential: false,
      buyAt: 'T-3d',
      note: 'Most halls and caterers include china, glassware, and linens — confirm first. Buy disposables only for a venue that supplies nothing, or for an overflow/kids table.',
    },
    {
      id: 'p_cleanup',
      item: 'Cleanup supplies: trash bags, bins, paper towels, gift transport boxes',
      category: 'cleanup',
      qtyFlat: 1,
      unit: 'kit',
      where: ['Grocery', 'Warehouse club'],
      unitCostRange: [20, 50],
      essential: true,
      buyAt: 'T-3d',
      note: 'COMMONLY FORGOTTEN: boxes to carry home the many gifts, the doll, the crown, and leftover cake at the end of a long night. Confirm whether the venue handles end-of-night trash or you do.',
    },
  ],

  rentalsGap: [
    { item: 'Tables, chairs, and linens', qtyPerGuest: 1, note: 'One seat per guest at a seated dinner; usually included by the salón — rent only the gap if the venue is bare.' },
    { item: 'Dance floor', qtyFlat: 1, note: 'A hard floor for the vals, surprise dance, and open dancing; most halls include one — confirm size for the court.' },
    { item: 'Sound + lighting / uplighting', qtyFlat: 1, note: 'Often supplied by the DJ or banda; rent uplighting and a follow spot for the grand entrance and vals if not.' },
    { item: 'Stage / riser for the court', qtyFlat: 1, note: 'For the ceremonial moments (crowning, shoes, doll) so the room can see; needed for large guest counts.' },
    { item: 'Chair covers / sashes', qtyPerGuest: 1, note: 'To the color story if the venue chairs do not match the theme.' },
  ],

  vendors: [
    { category: 'Venue / salón', required: true, altToDIY: false, when: 'T-270d', costRange: [2000, 8000], costUnit: 'event' },
    { category: 'Church / parish (if a Mass)', required: false, altToDIY: false, when: 'T-268d', costRange: [200, 800], costUnit: 'event' },
    { category: 'Caterer', required: true, altToDIY: false, when: 'T-180d', costRange: [18, 45], costUnit: 'guest' },
    { category: 'DJ or banda / mariachi', required: true, altToDIY: false, when: 'T-180d', costRange: [600, 3000], costUnit: 'event' },
    { category: 'Photographer + videographer', required: true, altToDIY: false, when: 'T-180d', costRange: [1200, 4000], costUnit: 'event' },
    { category: 'Baker (tiered cake)', required: true, altToDIY: true, when: 'T-180d', costRange: [250, 700], costUnit: 'event' },
    { category: 'Florist', required: true, altToDIY: true, when: 'T-90d', costRange: [600, 2500], costUnit: 'event' },
    { category: 'Dress / ballgown boutique', required: true, altToDIY: true, when: 'T-240d', costRange: [400, 2000], costUnit: 'event' },
    { category: 'Choreographer', required: false, altToDIY: true, when: 'T-120d', costRange: [300, 1200], costUnit: 'event' },
    { category: 'MC / event host', required: false, altToDIY: true, when: 'T-120d', costRange: [200, 800], costUnit: 'event' },
    { category: 'Decorator / event design', required: false, altToDIY: true, when: 'T-90d', costRange: [500, 3000], costUnit: 'event' },
  ],

  risks: [
    { id: 'r_late_booking', trigger: 'Date set late — church, salón, or top vendors already booked', severity: 'high', mitigation: 'Lock the date, the church (if a Mass), and the venue at T-270d, then core vendors by T-180d; quince season Saturdays go a year out.' },
    { id: 'r_gown_delay', trigger: 'Ballgown arrives late or does not fit at the final fitting', severity: 'high', mitigation: 'Order the gown by T-240d, schedule alterations early, and hold the final fitting at T-30d with buffer for re-alterations.' },
    { id: 'r_court_unready', trigger: 'Court members drop out or the vals/surprise dance is under-rehearsed', severity: 'high', mitigation: 'Pick a court that will commit, book a choreographer at T-120d, run weekly rehearsals, and keep one or two alternates ready.' },
    { id: 'r_vendor_dropout', trigger: 'A core vendor (caterer, DJ, photographer) cancels or no-shows', severity: 'high', mitigation: 'Sign contracts with deposits, confirm every vendor at T-7d, and keep a backup contact and a phone playlist on a charged device.' },
    { id: 'r_budget_overrun', trigger: 'Costs spiral past the family budget across many vendors', severity: 'med', mitigation: 'Build the budget at T-270d, line up padrinos/sponsors for specific items, and track deposits vs balances as each vendor is booked.' },
    { id: 'r_headcount', trigger: 'Final guest count drifts from RSVPs at a large family event', severity: 'med', mitigation: 'Send invitations by T-88d, chase RSVPs, lock the count at T-30d, and order ~5-10% over for the caterer.' },
    { id: 'r_weather', trigger: 'Outdoor or tented portion hit by rain or heat', severity: 'med', mitigation: 'Have an indoor fallback or a tented backup, move ice up in heat, and confirm a rain plan with the venue a week out.' },
  ],

  contingencies: [
    { id: 'c_late_booking', when: 'r_late_booking', plan: 'If the first-choice church or salón is taken, shift to a Friday or Sunday, expand the venue search to nearby halls, and prioritize locking whichever vendors are scarcest first.' },
    { id: 'c_gown_delay', when: 'r_gown_delay', plan: 'Escalate with the boutique, line up a local seamstress for rush alterations, and keep a backup gown option identified in case the order fails outright.' },
    { id: 'c_court_unready', when: 'r_court_unready', plan: 'Promote an alternate into the court, simplify the choreography to what the group can do confidently, and keep the father-daughter vals as the anchor if the group dance is shaky.' },
    { id: 'c_vendor_dropout', when: 'r_vendor_dropout', plan: 'Activate the backup vendor or, for music, switch to a charged-device playlist on the venue PA with the MC running announcements; pursue the deposit refund afterward.' },
    { id: 'c_headcount', when: 'r_headcount', plan: 'Give the caterer the confirmed count plus a small buffer, add or remove a table, and keep a few favors and place settings in reserve for last-minute guests.' },
    { id: 'c_weather', when: 'r_weather', plan: 'Move the affected portion indoors or under the tent, relocate the dance floor and bar, add ice, and keep the run-of-show order intact.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-240d', what: 'Order the ballgown and court attire' },
      { when: 'T-180d', what: 'Book and deposit caterer, photographer/video, DJ/banda, and baker' },
      { when: 'T-90d', what: 'Book florist and decor; send invitations' },
      { when: 'T-14d', what: 'Buy ceremonial items: heels, last doll, crown/scepter, toast glasses, candles/roses, favors' },
      { when: 'T-3d', what: 'Decor, beverages, cleanup supplies, any tableware the venue does not supply' },
      { when: 'T-1d', what: 'Cake and flower pickup/delivery confirmation; appetizers' },
      { when: 'T0', what: 'Ice (day-of so it does not melt) and any last-minute fresh items' },
    ],
    preparation: [
      { when: 'T-60d', what: 'Weekly vals and surprise-dance rehearsals; court attire fittings' },
      { when: 'T-30d', what: 'Final gown fitting; lock headcount; give the caterer the final count' },
      { when: 'T-7d', what: 'Final full rehearsal; brief the MC; confirm every vendor and court member by phone' },
      { when: 'T-1d', what: 'Stage all ceremonial items; confirm hair/makeup call time and transportation' },
    ],
    setup: [
      { when: 'T0 -5h', what: 'Hair and makeup for the quinceañera and court; photographer for getting-ready shots' },
      { when: 'T0 -4h', what: 'Decorator and florist dress the venue: backdrop, entrance arch, centerpieces, head table' },
      { when: 'T0 -3h', what: 'If a Mass: arrive at the church, line up the court, run the processional order' },
      { when: 'T0 -2h', what: 'DJ/banda sound check and uplighting; place ceremonial items (doll, crown, heels, toast glasses) at the head table' },
      { when: 'T0 -1h', what: 'Caterer sets the buffet/plated stations; MC reviews the run-of-show; court takes entrance positions' },
    ],
    cleanup: [
      { when: 'during', what: 'Caterer buses tables; keep the cake and ceremonial items safe; settle vendor balances and tips as agreed' },
      { when: 'T0 +6h', what: 'Gather all gifts, the last doll, the crown, and leftover cake into boxes; recover rental deposits' },
      { when: 'End +1h', what: 'Tear down decor, return rentals, bag trash, and do a final venue walkthrough with the manager' },
    ],
  },

  // The reception run-of-show — the ceremonial heart of the day — lives here.
  // Times are relative to the reception start (after any Mass and photos):
  //   T0     Grand entrance of the quinceañera and her court
  //   +0:10  The vals (waltz) — first with her father, then the court
  //   +0:25  Surprise dance (baile sorpresa), if planned
  //   +0:35  Changing of the shoes — the father exchanges flats for heels
  //   +0:45  The last doll (última muñeca) presented to her
  //   +0:55  The crowning — the tiara/crown placed by parents/godparents
  //   +1:05  The toast (brindis) and a parent's words
  //   +1:15  Dinner served (seated Latino meal)
  //   +2:15  Father-daughter dance; sometimes 15 candles / 15 roses honoring
  //          the people who shaped her
  //   +2:45  Cake cutting
  //   +3:00  Open dance floor — banda, cumbia, reggaetón until close
  // This order varies by family and regional tradition; the MC and the family
  // set the final sequence.

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note:
      'A quinceañera is a deeply meaningful Latino milestone — a girl\'s fifteenth birthday celebrated as a passage toward womanhood — and this playbook is written to support a family\'s celebration, not to define it. Traditions differ widely across the diaspora: Mexican, Central American (Salvadoran, Guatemalan, Honduran and others), Caribbean (Dominican, Puerto Rican, Cuban) and South American families each carry distinct customs, music, foods, and orders of events, and some celebrate with a Catholic Mass or blessing while others hold a secular party. The ceremonial moments offered here — the misa, the court of damas and chambelanes, the vals, the changing of the shoes, the last doll, the crowning, the toast, the father-daughter dance, and the fifteen candles or roses — are common elements presented as options, never requirements; the family\'s own tradition is always the source of truth, and the quinceañera should own the choices that are hers. The figures (typically ~$60-150 per guest all-in, a ~9-month lead time, a 5-7 hour event, and a seated catered meal) are synthesized from widely published US event-planning norms applied with professional planner judgment, and vary greatly by region, guest count, and how much is sponsored by padrinos. They are planning starting points to confirm with real quotes and the family\'s wishes, labeled synthesized; no sources have been fabricated.',
    sources: [],
  },
};

export default quinceanera;
