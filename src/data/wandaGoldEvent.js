// ─── Wanda Mundy — Gold Retirement + Birthday Event (canonical demo) ─────────
//
// A DUAL celebration: Wanda's 30-year Army retirement AND her birthday, at the
// VFW, Black-&-Gold theme, ~75 guests on a tight $5,000 budget — the real
// budget-stretch scenario the "Wanda dogfood" notes were about. Host is Wanda
// herself, with Vida Haynes helping. Built to the same schema as the other
// roster seeds; registered in hostv2/src/eventPool.js (ALL_SAMPLES + ROSTER_IDS).
//
// Faithful to the host's brief (2026-07-16):
//  • Dual: 30-yr Army retirement + birthday. Evening. Black-&-Gold, guests in all black.
//  • Brother Marcus (from Denver, wife + 2 boys) gives the Army retirement presentation.
//  • Cory (husband) arranged a SECRET singer from church. Dance floor.
//  • Wanda changes from Army ceremonial dress into a gold dress mid-event.
//  • A friend shoots a PRE-EVENT photoshoot at 4604 Grazin Way so 6-ft image
//    decorations can be printed in time. Marcus's family + Wanda's Mom lodge at 4604.
//  • Open bar, catering, decorations, DJ, photobooth, event photographer, desserts.

const WANDA_GOLD_EVENT = {
  id: 'ev-x-wanda',
  rsvpCode: 'wanda',
  name: 'Wanda’s 50th & 30-Year Army Retirement — Black & Gold',
  type: 'Retirement Party',
  secondaryType: 'Birthday',
  milestoneBirthday: 50,
  honoree: 'Wanda Mundy',
  story: '30 years in the Army, turning 50',
  host: 'Wanda Mundy',
  date: '2027-03-20',
  startTime: '18:30',
  startTimeSource: 'host',
  venue: 'Freedom Hall at VFW Post 1847',
  venueCity: 'Upper Marlboro, MD',
  theme: 'Black & Gold',
  dressCode: 'All black — she’s the only gold in the room',
  catererCount: 75,
  guestMode: 'count',
  guestCount: 75,
  guestEstimate: 75,
  meaning: 'Thirty years of Army service AND her milestone 50th birthday in one night — the family wants Wanda to feel honored, then surprised, then celebrated. Two peaks: her brother’s retirement presentation, and Cory’s secret singer.',
  // Out-of-town lodging (host brief): brother Marcus's family + Wanda's Mom stay here;
  // it's also where the pre-event photoshoot happens so the 6-ft prints are ready in time.
  lodging: [
    { id: 'ev-x-wanda-lodge-1', address: '4604 Grazin Way, Upper Marlboro, MD', who: 'Marcus + Nia + the 2 boys (in from Denver, CO)', notes: 'Family stay — arriving 2 days ahead for the presentation + photoshoot.' },
    { id: 'ev-x-wanda-lodge-2', address: '4604 Grazin Way, Upper Marlboro, MD', who: 'Wanda’s Mom (Gloria)', notes: 'Same house as Marcus’s family.' },
  ],
  budget: [
    { id: 'ev-x-wanda-b1', category: 'Venue', budgeted: 400, actual: 400, notes: 'Freedom Hall, member rate — Post waives most of the fee for a retiring member. Paid.' },
    { id: 'ev-x-wanda-b2', category: 'Catering', budgeted: 1500, actual: 0, notes: 'Buffet for 75 at ~$20/head — cut to the bone to fit the $5,000. Still comparing two caterers. Desserts handled separately.' },
    { id: 'ev-x-wanda-b3', category: 'Open Bar', budgeted: 700, actual: 0, notes: 'The single biggest stretch on a $5,000 budget. Beer/wine + a black-&-gold signature; NOT a full liquor bar. Not booked.' },
    { id: 'ev-x-wanda-b4', category: 'DJ + Dance Floor', budgeted: 550, actual: 200, notes: 'DJ for the evening + rented dance floor. Deposit down on the DJ; floor rental still to confirm.' },
    { id: 'ev-x-wanda-b5', category: 'Photobooth', budgeted: 450, actual: 0, notes: 'Black-&-gold backdrop photobooth, 4-hr. Quote came in at $500 — $50 over. Not booked.' },
    { id: 'ev-x-wanda-b6', category: 'Event Photography', budgeted: 500, actual: 0, notes: 'Photographer for the night — must catch the presentation and the gold-dress reveal. Separate from the pre-event photoshoot friend.' },
    { id: 'ev-x-wanda-b7', category: 'Photoshoot + 6-ft Prints', budgeted: 550, actual: 150, notes: 'THE decor centerpiece — Wanda’s friend shoots her BEFORE the event at 4604; images printed at least 6 ft tall. Deposit paid; printing must be ordered ~10 days out. Don’t let this slip — everything else hangs on the images.' },
    { id: 'ev-x-wanda-b8', category: 'Decor — Black & Gold', budgeted: 200, actual: 90, notes: 'Balloon columns, gold linens, memory table, guidon display, “30 Years” signage. Mostly DIY to protect the budget; the 6-ft prints do the heavy lifting.' },
    { id: 'ev-x-wanda-b9', category: 'Desserts + Cake', budgeted: 150, actual: 0, notes: 'Black-&-gold cake + dessert table. Wanda’s Mom may make part of it to save cost.' },
  ],
  guests: [
    { id: 'ev-x-wanda-g1', name: 'Cory Mundy', group: 'Family', rsvp: 'Yes', meal: 'Beef', table: 1, plusOne: '', notes: 'Husband — arranged the SECRET singer. Keep him in the loop on the reveal timing.' },
    { id: 'ev-x-wanda-g2', name: 'Gloria (Wanda’s Mom)', group: 'Family', rsvp: 'Yes', meal: 'Chicken', table: 1, plusOne: '', notes: 'Staying at 4604. Helping with desserts.' },
    { id: 'ev-x-wanda-g3', name: 'Marcus (brother)', group: 'Family', rsvp: 'Yes', meal: 'Beef', table: 2, plusOne: '+3 (Nia + 2 boys)', notes: 'In from Denver, CO — giving the Army retirement presentation. Family at 4604.' },
    { id: 'ev-x-wanda-g4', name: 'Diane (Cory’s Mom) + family', group: 'Family', rsvp: 'Yes', meal: 'Chicken', table: 2, plusOne: '+2', notes: '' },
    { id: 'ev-x-wanda-g5', name: 'Vida Haynes', group: 'Help', rsvp: 'Yes', meal: 'Vegetarian', table: 1, plusOne: '', notes: 'Helping Wanda run the day — day-of point person.' },
    { id: 'ev-x-wanda-g6', name: 'The Jersey Crew', group: 'NJ Friends', rsvp: 'Yes', meal: '', table: 4, plusOne: '+5', notes: 'Wanda’s friends driving down from New Jersey.' },
    { id: 'ev-x-wanda-g7', name: 'SFC Boyd + unit', group: 'The Unit', rsvp: 'Maybe', meal: '', table: null, plusOne: '', notes: 'Current + retired unit — Marcus is coordinating the color detail.' },
    { id: 'ev-x-wanda-g8', name: 'Chaplain Ellis', group: 'The Unit', rsvp: 'Yes', meal: 'Gluten-free', table: 5, plusOne: '', notes: '' },
    { id: 'ev-x-wanda-g9', name: 'The Church Friends', group: 'Church', rsvp: 'Pending', meal: '', table: null, plusOne: '', notes: 'Cory’s church — the secret singer is one of theirs.' },
  ],
  vendors: [
    {
      id: 'ev-x-wanda-v1', name: 'VFW Post 1847 — Freedom Hall', category: 'Venue', budgetCategory: 'Venue',
      status: 'Confirmed', cost: 400, depositAmt: 200, depositPaid: true, balancePaid: true, payDueDate: '2027-02-20',
      coiStatus: 'received', coiVerified: true, arrivalTime: '3:00 PM', contact: 'Hank Delgado, Post Quartermaster',
      phone: '555-0182', website: 'vfw1847.org', contractSigned: true, backup: '',
      notes: 'Evening block 6–11 PM + 3 PM setup for the 6-ft prints and dance floor. Member rate. Paid in full.',
      serviceArea: '', insuranceStatus: 'Insured & verified', log: [],
    },
    {
      id: 'ev-x-wanda-v2', name: 'Semper Catering Co.', category: 'Catering', budgetCategory: 'Catering',
      status: 'Quoted', cost: 1500, depositAmt: 0, depositPaid: false, balancePaid: false, payDueDate: '2027-03-13',
      coiStatus: 'none', coiVerified: false, arrivalTime: '4:30 PM', contact: 'Gina Marsh',
      phone: '555-0355', website: 'sempercatering.com', contractSigned: false, backup: 'Second quote pending from Post kitchen',
      notes: 'Buffet for 75 at ~$20/head to fit the budget. Comparing against the Post kitchen. Final headcount + choice due ~3/13.',
      serviceArea: '', insuranceStatus: 'Unknown', log: [],
    },
    {
      id: 'ev-x-wanda-v3', name: 'Gold Standard Bar Service', category: 'Bar', budgetCategory: 'Open Bar',
      status: 'Considering', cost: 0, depositAmt: 0, depositPaid: false, balancePaid: false, payDueDate: '',
      coiStatus: 'none', coiVerified: false, arrivalTime: '5:30 PM', contact: '',
      phone: '555-0620', website: '', contractSigned: false, backup: 'Beer/wine only if the full open bar breaks the budget',
      notes: 'Open bar is the biggest budget stretch. Scoping beer/wine + a black-&-gold signature cocktail rather than full liquor. NOT booked.',
      serviceArea: '', insuranceStatus: 'Unknown', log: [],
    },
    {
      id: 'ev-x-wanda-v4', name: 'DJ Marcus Kane + dance floor', category: 'DJ', budgetCategory: 'DJ + Dance Floor',
      status: 'Deposit Paid', cost: 550, depositAmt: 200, depositPaid: true, balancePaid: false, payDueDate: '2027-03-17',
      coiStatus: 'received', coiVerified: false, arrivalTime: '5:00 PM', contact: 'Marcus Kane',
      phone: '555-0711', website: '', contractSigned: true, backup: '',
      notes: 'DJ for the evening + rented dance floor. Needs the reveal + presentation cues in the run of show. Floor delivery to confirm.',
      serviceArea: '', insuranceStatus: 'Insured', log: [],
    },
    {
      id: 'ev-x-wanda-v5', name: 'Snap Booth Co.', category: 'Photobooth', budgetCategory: 'Photobooth',
      status: 'Considering', cost: 500, depositAmt: 0, depositPaid: false, balancePaid: false, payDueDate: '',
      coiStatus: 'none', coiVerified: false, arrivalTime: '5:45 PM', contact: '',
      phone: '555-0733', website: '', contractSigned: false, backup: '',
      notes: 'Black-&-gold backdrop, 4-hr. Quote $500 — $50 over the line. Decide vs. trimming the bar.',
      serviceArea: '', insuranceStatus: 'Unknown', log: [],
    },
    {
      id: 'ev-x-wanda-v6', name: 'Event Photographer (night-of)', category: 'Photography', budgetCategory: 'Event Photography',
      status: 'Considering', cost: 0, depositAmt: 0, depositPaid: false, balancePaid: false, payDueDate: '',
      coiStatus: 'none', coiVerified: false, arrivalTime: '6:00 PM', contact: '',
      phone: '', website: '', contractSigned: false, backup: '',
      notes: 'Must catch the retirement presentation AND the gold-dress reveal. Separate from the pre-event photoshoot friend. Not booked.',
      serviceArea: '', insuranceStatus: 'Unknown', log: [],
    },
    {
      id: 'ev-x-wanda-v7', name: 'Photoshoot friend + 6-ft prints', category: 'Photography', budgetCategory: 'Photoshoot + 6-ft Prints',
      status: 'Deposit Paid', cost: 550, depositAmt: 150, depositPaid: true, balancePaid: false, payDueDate: '2027-03-10',
      coiStatus: 'n/a', coiVerified: false, arrivalTime: '', contact: 'Wanda’s friend (photographer)',
      phone: '', website: '', contractSigned: false, deliversHeartMoment: true, backup: '',
      notes: 'THE decor. Shoots Wanda at 4604 Grazin Way BEFORE the event; images printed at least 6 ft tall for the hall. Prints must be ORDERED ~10 days out (by ~3/10) to be ready. This gates the whole look — do not let it slip.',
      serviceArea: 'Upper Marlboro, MD', insuranceStatus: 'n/a', log: [
        { id: 'ev-x-wanda-vl7-1', date: '2027-02-14', text: 'Locked the photoshoot for the weekend before; confirmed the printer can do 6-ft panels with ~5-day turnaround.' },
      ],
    },
    {
      id: 'ev-x-wanda-v8', name: 'Church singer (Cory’s surprise)', category: 'Entertainment', budgetCategory: '',
      status: 'Confirmed', cost: 0, depositAmt: 0, depositPaid: false, balancePaid: false, payDueDate: '',
      coiStatus: 'n/a', coiVerified: false, arrivalTime: '7:30 PM', contact: 'Cory (keeping it secret)',
      phone: '', website: '', contractSigned: false, isInformal: true, deliversHeartMoment: true, backup: '',
      notes: 'SURPRISE — a singer from Cory’s church performs a dedication. Wanda doesn’t know. Only the run-of-show and the DJ need the cue; keep it off any guest-facing note.',
      serviceArea: '', insuranceStatus: 'n/a', log: [],
    },
    {
      id: 'ev-x-wanda-v9', name: 'Vida Haynes (day-of helper)', category: 'Helper', budgetCategory: '',
      status: 'Confirmed', cost: 0, depositAmt: 0, depositPaid: false, balancePaid: false, payDueDate: '',
      coiStatus: 'n/a', coiVerified: false, arrivalTime: '3:00 PM', contact: 'Vida Haynes',
      phone: '', website: '', contractSigned: false, isInformal: true, backup: '',
      notes: 'Not a paid vendor — Wanda’s friend helping run the day (setup, vendor wrangling, cueing the reveal + secret singer with the DJ).',
      serviceArea: '', insuranceStatus: 'n/a', log: [],
    },
  ],
  timeline: [
    { id: 'ev-x-wanda-t1', week: 'Week of Feb 8', task: 'Book the pre-event photoshoot friend + confirm the 6-ft print turnaround (everything decorative hangs on this)', done: true, owner: 'Wanda' },
    { id: 'ev-x-wanda-t2', week: 'Week of Feb 22', task: 'Lock catering — pick Semper vs. the Post kitchen to fit the $5,000, then book the open bar (or drop to beer/wine)', done: false, owner: 'Wanda' },
    { id: 'ev-x-wanda-t3', week: 'Week of Mar 1', task: 'Book photobooth + night-of photographer, or trim to fit budget', done: false, owner: 'Vida Haynes' },
    { id: 'ev-x-wanda-t4', week: 'Week of Mar 8', task: 'Do the photoshoot at 4604 and ORDER the 6-ft prints (~10 days out so they’re ready)', done: false, owner: 'Wanda' },
    { id: 'ev-x-wanda-t5', week: 'Week of Mar 8', task: 'Set up the rooms at 4604 for Marcus’s family + Mom (arriving 2 days early)', done: false, owner: 'Cory' },
    { id: 'ev-x-wanda-t6', week: 'Week of Mar 8', task: 'Coordinate the secret singer + gold-dress reveal cues with the DJ — keep it off Wanda’s radar', done: false, owner: 'Cory' },
    { id: 'ev-x-wanda-t7', week: 'Week of Mar 15', task: 'Final headcount to the caterer (~75), confirm run of show, all-black dress reminder in the invite', done: false, owner: 'Vida Haynes' },
  ],
  ros: [
    { id: 'ev-x-wanda-ros-1', time: '6:30 PM', label: 'Doors — guests in all black; 6-ft prints + memory table on display' },
    { id: 'ev-x-wanda-ros-2', time: '6:45 PM', label: 'Wanda arrives in Army ceremonial dress' },
    { id: 'ev-x-wanda-ros-3', time: '7:00 PM', label: 'Buffet dinner' },
    { id: 'ev-x-wanda-ros-4', time: '7:45 PM', label: 'Army retirement presentation — Marcus (brother)' },
    { id: 'ev-x-wanda-ros-5', time: '8:15 PM', label: 'SURPRISE: church singer’s dedication (Cory’s doing)' },
    { id: 'ev-x-wanda-ros-6', time: '8:30 PM', label: 'Wardrobe change — Wanda returns in the gold dress' },
    { id: 'ev-x-wanda-ros-7', time: '8:45 PM', label: 'Toast + black-&-gold cake' },
    { id: 'ev-x-wanda-ros-8', time: '9:00 PM', label: 'Dance floor opens — DJ + photobooth' },
  ],
};

export default WANDA_GOLD_EVENT;
export { WANDA_GOLD_EVENT };
