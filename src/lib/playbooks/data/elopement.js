// Elopement — Event OS host playbook (data only).
//
// A small, intimate wedding: just the couple, or the couple + a handful of
// witnesses. Frequently travel-led / destination (a mountain, a coast, a
// national park, a courthouse town). Registered under the canonical
// 'Elopement' type. This is a DECISION- and RISK-weighted playbook, not a
// shopping list: the load is the marriage license (location-specific lead
// time + witness rules — a real HIGH risk), the location + any permit, the
// officiant, and the elopement photographer (the #1 spend and the only
// lasting keepsake). Purchases are deliberately minimal. Quantities reflect
// common US norms (see `knowledge`), authored honestly and labeled
// `synthesized` until a foreground verification pass attaches citations.
// ESM default export.

const elopement = {
  type: 'Elopement',
  solveFamily: 'elopement',
  family: 'travel_led',
  recordKind: 'client',
  version: '1.0.0',
  meta: {
    summary: 'A small, intimate wedding — the couple, or the couple plus a few witnesses — often travel-led to a meaningful place. The work is not scale, it is sequence: a location-specific marriage license (lead time + witnesses), the location and any permit, an officiant, and a photographer to keep the day. Everything else is light: travel, lodging, attire, a small celebratory meal, champagne, and written vows.',
    typicalGuests: { low: 0, default: 2, high: 12 },
    typicalDurationHours: 6,
    leadTimeDays: 90,
    hostDifficulty: 'medium',
    perGuestCost: { low: 0, high: 250, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  decisions: [
    { id: 'location', label: 'Where will you elope?', options: ['National / state park', 'Beach / coast', 'Mountain / wilderness', 'Courthouse', 'Destination (out of state / abroad)', 'Private property / Airbnb'], default: 'National / state park', when: 'T-90d', blocks: ['permit', 'license', 'travel', 'photographer'], why: 'The single most-blocking decision. Location sets which marriage-license rules apply, whether a permit is required, and how far everyone has to travel.' },
    { id: 'license_jurisdiction', label: 'Which county/state issues your marriage license?', options: ['County of the ceremony location', 'Home county (if same state)', 'Self-solemnize state (e.g. Colorado)', 'Destination/abroad — research separately'], default: 'County of the ceremony location', when: 'T-75d', blocks: ['license'], why: 'License is governed by where you MARRY, not where you live. Waiting periods (0–6 days), validity windows (often ~90 days), and witness counts (0, 1, or 2) all vary by state. Get this wrong and the marriage is not legal.' },
    { id: 'witnesses', label: 'Who (if anyone) comes?', options: ['Just the two of us', 'Couple + officiant only', '1–2 witnesses (family/friends)', 'Small group (up to ~10)'], default: 'Just the two of us', when: 'T-60d', blocks: ['license', 'travel', 'meal'], why: 'Some states require 1–2 witnesses to sign the license. If you are eloping truly alone, confirm your state allows it (or that the officiant/a stranger can witness) BEFORE the day.' },
    { id: 'officiant', label: 'Who marries you?', options: ['Hired officiant', 'Friend ordained online', 'Courthouse judge/clerk', 'Self-solemnize (where legal)'], default: 'Hired officiant', when: 'T-60d', blocks: ['license'], why: 'Someone legally empowered must solemnize and sign. Online ordination is fine in most states but NOT all — verify the location accepts it.' },
    { id: 'tell_family', label: 'Whether / how to tell family', options: ['Tell beforehand', 'Tell after (announcement)', 'Invite a few to attend', 'Private — share photos later'], default: 'Tell after (announcement)', when: 'T-60d', why: 'The emotional core of an elopement. Decide intentionally: who hears before, who hears after, and how — so the choice feels owned, not like an accident someone discovers.' },
    { id: 'photography', label: 'Photographer / how you keep the day', options: ['Hire elopement photographer', 'Hire photo + video', 'Friend with a camera', 'Self/timer + phone'], default: 'Hire elopement photographer', when: 'T-75d', blocks: ['photographer'], why: 'With no guests and no reception, the photos ARE the event afterward — the #1 spend and the only thing that lasts. Elopement photographers book out months ahead and often double as the day-of guide.' },
  ],

  milestones: [
    { id: 'elope_decide', name: 'Choose location, date, and who comes', offsetDays: 90, owner: 'couple', category: 'planning', risk: { ifDelayed: 'Permit/photographer windows close', severity: 'med' } },
    { id: 'elope_license_research', name: 'Research marriage-license rules for the jurisdiction', offsetDays: 75, owner: 'couple', dependsOn: ['elope_decide'], category: 'legal', risk: { ifDelayed: 'Discover a waiting period or witness requirement too late', severity: 'high' } },
    { id: 'elope_book_photographer', name: 'Book photographer + officiant', offsetDays: 75, owner: 'couple', dependsOn: ['elope_decide'], category: 'vendor', risk: { ifDelayed: 'First-choice photographer booked; no keepsake of the day', severity: 'high' } },
    { id: 'elope_permit', name: 'Apply for park/location permit', offsetDays: 60, owner: 'couple', dependsOn: ['elope_decide'], category: 'legal', risk: { ifDelayed: 'Permit denied or unavailable; ceremony is not allowed on site', severity: 'high' } },
    { id: 'elope_travel', name: 'Book travel + lodging', offsetDays: 60, owner: 'couple', dependsOn: ['elope_decide'], category: 'logistics', risk: { ifDelayed: 'Lodging near the site sells out; prices spike', severity: 'med' } },
    { id: 'elope_attire', name: 'Choose + fit attire; write vows', offsetDays: 30, owner: 'couple', dependsOn: ['elope_decide'], category: 'planning', risk: { ifDelayed: 'No time for alterations; rushed vows', severity: 'low' } },
    { id: 'elope_get_license', name: 'Obtain marriage license in person', offsetDays: 7, owner: 'couple', dependsOn: ['elope_license_research'], category: 'legal', risk: { ifDelayed: 'License waiting period not satisfied; cannot legally marry on the day', severity: 'high' } },
    { id: 'elope_confirm', name: 'Confirm vendors, weather, timeline, meal', offsetDays: 1, owner: 'couple', dependsOn: ['elope_book_photographer', 'elope_travel'], category: 'logistics', risk: { ifDelayed: 'No-show or weather surprise with no fallback', severity: 'med' } },
    { id: 'event', name: 'The elopement', offsetDays: 0, owner: 'couple', dependsOn: ['elope_get_license', 'elope_confirm'], category: 'event', risk: null },
  ],

  tasks: [
    { id: 't_research_license', milestoneId: 'elope_license_research', phase: 'legal', label: 'Look up the county clerk: waiting period, validity window, witness count, ID + fee, whether online-ordained officiants are accepted', when: 'T-75d' },
    { id: 't_book_photog', milestoneId: 'elope_book_photographer', phase: 'vendor', label: 'Book elopement photographer (and officiant); confirm they know the location + permit', when: 'T-75d' },
    { id: 't_permit', milestoneId: 'elope_permit', phase: 'legal', label: 'Submit special-use permit for the park/site; note any monitor fee and per-vehicle entrance fee', when: 'T-60d' },
    { id: 't_travel', milestoneId: 'elope_travel', phase: 'logistics', label: 'Book flights/drive plan + lodging near the site; build buffer days for weather', when: 'T-60d' },
    { id: 't_attire_vows', milestoneId: 'elope_attire', phase: 'planning', label: 'Choose attire + any alterations; write and practice vows', when: 'T-30d' },
    { id: 't_get_license', milestoneId: 'elope_get_license', phase: 'legal', label: 'Appear in person at the clerk\'s office for the license (both parties, valid ID); confirm it covers the ceremony date', when: 'T-7d' },
    { id: 't_confirm', milestoneId: 'elope_confirm', phase: 'logistics', label: 'Confirm photographer/officiant arrival, check the forecast, set the day-of timeline, order/pick up the small meal + champagne', when: 'T-1d' },
    { id: 't_sign', milestoneId: 'event', phase: 'legal', label: 'Sign the license with officiant + witnesses; photographer captures it; mail/return to the clerk', when: 'T0' },
    { id: 't_reset', milestoneId: 'event', phase: 'cleanup', label: 'Pack out everything (leave no trace), recycle bottles, send announcement if telling family after', when: 'T0 +6:00' },
  ],

  purchases: [
    { id: 'p_champagne', item: 'Champagne / sparkling for the toast', category: 'beverage', qtyFlat: 1, unit: 'bottle', where: ['Liquor store', 'Grocery', 'Lodging concierge'], unitCostRange: [18, 60], essential: false, buyAt: 'T-1d', note: 'One 750ml bottle pours ~5–6 toast glasses — plenty for the couple alone or a few witnesses. Add a second bottle near the high end (~10+ people). Confirm alcohol is allowed at the site (many parks restrict it).' },
    { id: 'p_meal', item: 'Small celebratory meal (picnic, reservation, or to-go)', category: 'food', qtyPerGuest: 1, unit: 'meal', where: ['Restaurant', 'Caterer', 'Grocery / deli'], unitCostRange: [25, 120], essential: true, buyAt: 'T-1d', note: 'No reception — this is the celebration. A reservation for two, a curated picnic, or a private chef all work. Reserve ahead if dining out.' },
    { id: 'p_bouquet', item: 'Bouquet / boutonniere / simple florals', category: 'decor', qtyFlat: 1, unit: 'set', where: ['Florist', 'Grocery', 'Farmers market'], unitCostRange: [40, 150], essential: false, buyAt: 'T-1d', note: 'The one styling element that reads in every photo. Keep it small and packable for travel.' },
    { id: 'p_rings', item: 'Wedding rings', category: 'logistics', qtyFlat: 2, unit: 'rings', where: ['Jeweler', 'Online'], unitCostRange: [100, 2000], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN day-of: pack the rings and the license folder FIRST. Order/size rings weeks ahead; carry them on your person when traveling, never checked.' },
    { id: 'p_keepsakes', item: 'Vow books, marriage license folder, ring box', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Online', 'Stationery store'], unitCostRange: [15, 50], essential: false, buyAt: 'T-3d', note: 'Vow books photograph beautifully and keep written vows safe. A document folder protects the license in a pack/pocket.' },
    { id: 'p_glasses', item: 'Two toast glasses (packable/unbreakable)', category: 'rental', qtyFlat: 2, unit: 'glasses', where: ['Online', 'Outdoor store', 'Home'], unitCostRange: [10, 40], essential: false, buyAt: 'T-3d', note: 'Bring your own — remote sites have nothing. Unbreakable/stemless travels best.' },
    { id: 'p_packout', item: 'Trash bag + reusable tote for leave-no-trace pack-out', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Grocery', 'Outdoor store'], unitCostRange: [5, 15], essential: true, buyAt: 'T-1d', note: 'Pack out every bottle, wrapper, and petal — leave-no-trace is required at most natural sites and is often a permit condition.' },
  ],

  rentalsGap: [
    { item: 'Officiant (if not a hired vendor)', qtyFlat: 1, note: 'someone legally empowered to solemnize + sign — confirm the jurisdiction accepts them' },
    { item: 'Witness(es)', qtyFlat: 2, note: 'only if your state requires 1–2 signatures; a hired vendor or guide can often serve' },
    { item: 'Cooler / insulated tote', qtyFlat: 1, note: 'keeps the champagne and picnic cold on a hike or drive to the site' },
  ],

  vendors: [
    { category: 'Elopement photographer', required: false, altToDIY: 'Friend with a camera or tripod + timer', when: 'T-75d', costRange: [1500, 6000], costUnit: 'flat' },
    { category: 'Officiant', required: false, altToDIY: 'Friend ordained online, or self-solemnize where legal', when: 'T-60d', costRange: [150, 600], costUnit: 'flat' },
    { category: 'Permit (park/site special-use)', required: false, altToDIY: 'Choose a courthouse or private property that needs no permit', when: 'T-60d', costRange: [50, 500], costUnit: 'flat' },
    { category: 'Hair / makeup', required: false, altToDIY: 'DIY at the lodging', when: 'T-30d', costRange: [150, 500], costUnit: 'flat' },
    { category: 'Florist', required: false, altToDIY: 'Grocery / farmers-market stems, self-arranged', when: 'T-14d', costRange: [40, 300], costUnit: 'flat' },
    { category: 'Adventure guide / driver (remote sites)', required: false, altToDIY: 'Self-drive + hike; photographer often guides', when: 'T-30d', costRange: [100, 500], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_license', trigger: 'Marriage license waiting period, witness requirement, or validity window not satisfied', severity: 'high', mitigation: 'Research the issuing county at T-75d; appear in person at T-7d (inside the validity window, past any waiting period); confirm witness count and that your officiant type is accepted.' },
    { id: 'r_permit', trigger: 'No permit (or denied) for a park/site that requires one', severity: 'high', mitigation: 'Apply at T-60d; many parks cap permits and need 3–4+ weeks lead. Keep a no-permit fallback location (courthouse, private property) ready.' },
    { id: 'r_photographer', trigger: 'Photographer unavailable or books out', severity: 'high', mitigation: 'Book at T-75d — top elopement photographers fill months ahead. Hold a backup, and a tripod+timer plan as last resort.' },
    { id: 'r_weather', trigger: 'Storm, road/trail closure, or wildfire smoke at an outdoor site', severity: 'med', mitigation: 'Build buffer days into travel; pick a flexible date; pre-scout an indoor/lower-elevation alternate; check forecast + park alerts at T-1d.' },
    { id: 'r_witness', trigger: 'State requires witnesses and the couple is eloping alone', severity: 'med', mitigation: 'Confirm the witness rule early; arrange the officiant, photographer, guide, or a willing stranger to sign — or choose a self-solemnize state.' },
    { id: 'r_family', trigger: 'Family hurt by being excluded or surprised', severity: 'med', mitigation: 'Decide the tell-plan intentionally at T-60d; consider a heartfelt note, a video call into the moment, or a small gathering after.' },
  ],

  contingencies: [
    { id: 'c_license', when: 'r_license', plan: 'If the waiting period cannot be met, marry legally at the home/courthouse first and hold the location ceremony as a symbolic one; or shift the date within the license validity window.' },
    { id: 'c_permit', when: 'r_permit', plan: 'Switch to the pre-held no-permit fallback (courthouse, private land, or a non-permit overlook just outside park boundaries); notify photographer/officiant of the new spot.' },
    { id: 'c_photographer', when: 'r_photographer', plan: 'Activate the backup shooter; if none, set up a tripod + interval timer and a phone, and ask the officiant or a witness to grab candids.' },
    { id: 'c_weather', when: 'r_weather', plan: 'Slide to a buffer day, drop to the lower-elevation/indoor alternate, or hold the vows under cover at the lodging and shoot portraits when the weather breaks.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-3d', what: 'Rings, vow books + license folder, toast glasses, ring box' },
      { when: 'T-1d', what: 'Champagne, the celebratory meal (or confirm reservation), bouquet/florals, pack-out kit' },
      { when: 'T0', what: 'Ice for the cooler; any last fresh items for the picnic' },
    ],
    preparation: [
      { when: 'T-7d', what: 'Obtain the marriage license in person; pack the rings + license folder' },
      { when: 'T-1d', what: 'Confirm vendors + forecast; practice vows; lay out attire; chill champagne' },
    ],
    setup: [
      { when: 'T0 -2h', what: 'Hair/makeup + dress at the lodging; load rings, license, vows, champagne, glasses, florals into the pack' },
      { when: 'T0 -0:30', what: 'Arrive at the site, meet officiant + photographer, set the picnic/toast spot' },
    ],
    cleanup: [
      { when: 'T0 +0:30', what: 'Officiant + witnesses sign the license; photographer captures the signing; secure the document' },
      { when: 'T0 +6h', what: 'Leave-no-trace pack-out (bottles, florals, wrappers); mail/return the signed license to the clerk; send the announcement if telling family after' },
    ],
  },

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'This playbook is weighted toward decisions, milestones, vendors, and risks rather than purchases, because an elopement\'s real difficulty is legal and logistical sequencing, not scale. Three claims drive the structure and reflect widely-published US norms: (1) marriage-license rules are set by the issuing state/county and vary materially — waiting periods commonly range 0–6 days, witness requirements are 0, 1, or 2 (some states permit self-solemnizing), and licenses often expire in ~90 days — so the license is modeled as a HIGH risk obtained in person near the date; (2) most US national/state parks require a special-use permit to hold a ceremony, with fees commonly ~$50–$500 plus possible monitor and per-vehicle entrance fees and multi-week lead times; (3) a 750ml bottle of sparkling pours roughly 5–6 toast glasses, so one bottle covers the couple or a few witnesses and two covers ~10+. Cost ranges for photography, officiants, and permits are typical-market estimates. All figures are authored as established-consensus and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default elopement;
