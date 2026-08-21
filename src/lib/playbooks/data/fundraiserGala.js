// Fundraiser / Gala — Event OS host playbook (data only).
//
// Authored 2026-08-21 to replace the Wedding borrow the floor installed (see
// `BORROWED_PLAYBOOK` in ../index.js). The borrow was right that a gala is the
// most operationally involved thing in the corpus, and it carried the venue,
// the caterer, the AV, the seating chart and the run of show correctly. What a
// wedding has NO model for is the entire reason a gala exists: a REVENUE SIDE.
//
//   • a fundraising target the whole night is measured against;
//   • ticket or table sales with a close date and a pacing problem;
//   • sponsors with deliverables and recognition obligations you owe back;
//   • auction or raffle logistics — procurement, display, bidding, checkout;
//   • payment processing on the night, at scale, at the same moment;
//   • donor data capture that has to reach the CRM the next morning;
//   • tax-receipting, where the fair market value of what the donor received
//     comes off the deductible amount and getting it wrong is a real problem;
//   • and a program that has to hit the giving moment at the right time.
//
// It also carries the PERMIT exposure the 2026-08-21 coverage audit says the
// corpus is systematically blind to (silent in 33 of 39): an alcohol licence,
// and in most US states a raffle is regulated gaming that needs its own permit
// and printed drawing rules. ACCESSIBILITY (silent in 32 of 39) matters more
// here than almost anywhere, because the guest list skews older and the room is
// usually a hotel ballroom with a long walk from the door. LOAD-IN (silent in
// 37 of 39) is authored because a ballroom gives you a dock window and an
// elevator, and vendors who do not know theirs collide in it. FIRST AID (silent
// in 34 of 39) is authored because a long evening, a bar, and an older room is
// exactly where a medical incident happens.
//
// Lead times are derived from the corpus rather than guessed. The runway is
// anchored between Conference (T-180d) and Wedding (T-365d) at T-270d, because
// a gala shares the wedding's venue-first problem and the conference's
// revenue-pacing problem but rarely books eighteen months out. Sponsorship and
// procurement open at T-240d/T-210d, ahead of Conference's T-150d prospectus,
// because auction procurement is a solicitation campaign rather than a sale and
// needs the longer tail. T-14d final headcount matches Wedding exactly. Where a
// lead was genuinely uncertain the CONSERVATIVE (earlier) figure was taken —
// most notably the T-180d licensing row: state raffle and alcohol permit
// processing times vary from two weeks to several months, so this playbook
// assumes the slow end rather than the median.
//
// "offsetDays" are POSITIVE = days before the gala. Authored honestly against
// widely-published nonprofit-events and fundraising practice and labeled
// `synthesized`. No fabricated sources. ESM default export.

const fundraiserGala = {
  type: 'Fundraiser / Gala',
  vegMain: 'Wild mushroom and root vegetable wellington',
  solveFamily: 'gala',
  family: 'full_service',
  recordKind: 'client',
  version: '1.0.0',
  meta: {
    summary: 'A benefit gala: everything a wedding carries — venue, caterer, AV, seating chart, run of show — plus a revenue side nothing else in the corpus has. A fundraising target, table and ticket sales with a close date, sponsors owed recognition, auction or raffle logistics from procurement through checkout, payment processing at scale on the night, donor data that has to reach the CRM, tax receipts that must be calculated correctly, and a program built so the giving moment lands while the room is warm. Success is not a lovely evening. Success is a number.',
    typicalGuests: { low: 100, default: 300, high: 800 },
    typicalDurationHours: 5,
    leadTimeDays: 270,
    hostDifficulty: 'high',
    perGuestCost: { low: 100, high: 400, currency: 'USD' },
    scaleBy: 'guestCount',
  },

  heartMoments: [
    'The mission speaker finishes and the room is completely silent for a beat before anyone claps.',
    'The first paddle goes up, and then the second, and the auctioneer does not have to work for the third.',
    'A table host you talked into buying in leans over and says they are buying two next year.',
    'The number goes up on the screen and the room realizes it beat the target.',
    'The committee, at midnight, in an empty ballroom, counting it up.',
  ],

  decisions: [
    { id: 'target', label: 'What is the fundraising target, and what does it fund?', options: ['Under $50k', '$50k–$150k', '$150k–$500k', '$500k+'], default: '$50k–$150k', when: 'T-270d', blocks: ['revenue_model', 'sponsors', 'auction', 'budget'], weight: 'high', reversibility: 'costly', emotionalWeight: 'med', difmCapable: 'needs-host', priorityBasis: { rationale: 'Every other decision back-solves from the number and from what it pays for — the venue you can justify, the sponsors you must land, whether an auction is worth the labor — and only the organization can set it.', tier: 'reasoned' }, why: 'The number the whole night is measured against. It sets the expense budget you can defend (a gala costing more than about half of what it raises is a hard conversation with a board), how many tables you must sell, and whether an auction is worth the several hundred hours it costs. Name what the money funds in one sentence — every ask you make all year uses it.' },
    { id: 'revenue_model', label: 'How does the night raise money?', options: ['Table sales to sponsors and hosts', 'Individual ticketed seats', 'Ticketed seats plus a live ask', 'Free to attend with a direct ask'], default: 'Table sales to sponsors and hosts', when: 'T-270d', dependsOn: ['target'], blocks: ['pricing', 'sales_deadline', 'seating', 'invitations'], weight: 'high', reversibility: 'costly', emotionalWeight: 'low', difmCapable: 'needs-host', priorityBasis: { rationale: 'Selling tables to hosts is a fundamentally different campaign from selling individual seats — different asks, different deadline, different seating chart — and switching late strands the work already done.', tier: 'reasoned' }, why: 'Table sales put a host between you and ten guests: they fill the seats and they bring people who already trust them. Individual ticketing reaches wider but leaves you chasing singles into a seating chart. A free event with a direct ask can out-raise a ticketed one when the room is right, because nobody has already "paid" and feels done.',
      optionNotes: {
        'Table sales to sponsors and hosts': 'Fewest conversations, largest cheques · you depend on a handful of hosts',
        'Individual ticketed seats': 'Widest reach · the seating chart becomes a puzzle',
        'Ticketed seats plus a live ask': 'Two revenue lines · the ask must be staged properly or it reads as a second bill',
        'Free to attend with a direct ask': 'Nobody arrives feeling paid-up · all revenue rides on one moment',
      },
      defaultWhy: 'Table sales are the default because a host who commits to a table also fills it, which is the hardest part of the job. Change it if you have no committee and no table hosts to call.' },
    { id: 'auction', label: 'Auction, raffle, or neither?', options: ['Silent auction only', 'Live auction only', 'Silent plus live', 'Raffle only', 'None — direct ask only'], default: 'Silent plus live', when: 'T-240d', dependsOn: ['target'], blocks: ['procurement', 'licensing', 'checkout', 'run_of_show'], weight: 'high', reversibility: 'costly', emotionalWeight: 'low', difmCapable: 'needs-host', priorityBasis: { rationale: 'An auction is a months-long procurement campaign, a display, a bidding mechanism, a checkout queue and — for a raffle — a gaming licence. Deciding it late strands the whole revenue plan.', tier: 'reasoned' }, why: 'Decide early, because procurement is a solicitation campaign that takes months and the licensing follows the format. A raffle is regulated gaming in most US states and needs a permit and printed drawing rules; a live auction needs an auctioneer and a moment in the program; a silent auction needs display space, a bidding mechanism and a checkout that does not trap people at the coat check. "None" is a legitimate answer — a well-staged direct ask can out-raise a mediocre auction with a fraction of the labor.',
      optionNotes: {
        'Silent auction only': 'Runs alongside the reception · needs display space and a clean checkout',
        'Live auction only': 'Highest per-item revenue · needs a real auctioneer and a warm room',
        'Silent plus live': 'Most revenue lines · the most work by a distance',
        'Raffle only': 'Simple and popular · regulated gaming in most states, so permit it early',
        'None — direct ask only': 'All the labor goes into one moment · often the right call',
      },
      defaultWhy: 'Silent plus live is the default for a gala at this scale because the two formats capture different givers — browsers at the reception and the room at its peak. Change it to "None" if you do not have a procurement lead.' },
    { id: 'venue', label: 'Which venue, and what date?', options: ['Hotel ballroom', 'Museum or cultural venue', 'Tented outdoor site', 'Own facility'], default: 'Hotel ballroom', when: 'T-270d', dependsOn: ['target'], blocks: ['catering', 'av', 'accessibility', 'permits', 'load_in'], weight: 'high', reversibility: 'locked', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'The date and the room are the hardest things to get and everything else anchors to them; once a deposit is signed on a ballroom with a food-and-beverage minimum, it does not move.', tier: 'reasoned' }, why: 'Book first — everything else anchors here. A hotel ballroom folds in catering, AV, load-in and accessibility, and charges you a food-and-beverage minimum for the privilege. A museum buys you a room people want to be photographed in and usually bars outside catering, restricts what can touch the walls, and closes hard at a fixed hour. A tent means you are also buying power, flooring, restrooms and a weather plan.' },
    { id: 'bar', label: 'How does the bar work?', options: ['Wine and beer with dinner', 'Open bar included in the ticket', 'Two drink tickets, then cash', 'Cash bar', 'Dry'], default: 'Wine and beer with dinner', when: 'T-150d', dependsOn: ['venue', 'target'], blocks: ['bar_purchases', 'licensing'], weight: 'med', reversibility: 'reversible', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'Usually the second-largest expense line after catering, and it directly reduces the number the night is measured against — but wine and beer with dinner is a safe, adjustable default.', tier: 'reasoned' }, why: 'Every dollar behind the bar is a dollar that does not reach the mission, and the board will ask. Wine and beer with dinner is the defensible middle. Whichever model you choose, confirm who actually holds the liquor licence — you, the venue, or the caterer — because at an off-site or tented event that is a permit you may have to pull yourself.' },
    { id: 'payments', label: 'How do guests give and pay on the night?', options: ['Mobile bidding and giving platform', 'Card readers at a checkout desk', 'Paper bid sheets and a manual checkout', 'Pledge cards, invoiced afterwards'], default: 'Mobile bidding and giving platform', when: 'T-120d', dependsOn: ['auction', 'revenue_model'], blocks: ['checkout', 'donor_data', 'run_of_show'], weight: 'high', reversibility: 'costly', emotionalWeight: 'low', difmCapable: 'can-derive', priorityBasis: { rationale: 'This decides whether three hundred people leave through one checkout queue at eleven at night, and whether their giving data reaches the CRM at all — it is the difference between raising money and collecting it.', tier: 'reasoned' }, why: 'Raising a pledge and collecting it are two different things, and the gap between them is where gala revenue disappears. A mobile platform with a card captured at check-in turns checkout into a signature and lands the donor data in one place. Paper bid sheets are cheap, work without wifi, and cost you a forty-minute queue and a week of transcription. Whatever you pick, test a real card transaction on the venue’s actual network before the night.' },
    { id: 'program_ask', label: 'Where does the giving moment sit in the program?', options: ['After the mission story, mid-program', 'Between dinner and dessert', 'Before dinner is served', 'At the very end'], default: 'After the mission story, mid-program', when: 'T-60d', dependsOn: ['revenue_model', 'auction'], blocks: ['run_of_show'], weight: 'high', reversibility: 'reversible', emotionalWeight: 'high', difmCapable: 'can-derive', deliversHeartMoment: true, priorityBasis: { rationale: 'The single placement decision that moves the number most — the ask has to land while the room is warm, seated and still present, and that window is narrow.', tier: 'reasoned' }, why: 'The ask lands while the room is warm, seated, and still there. Directly after the mission story is the warmest the room will ever be. At the very end is the worst placement in fundraising: people have started leaving, the servers are clearing, and you make the biggest ask of the night to a half-empty room. Keep the whole program under forty-five minutes and hold every speaker to their time.' },
  ],

  milestones: [
    { id: 'g_target', name: 'Set the target, the budget, and the committee', offsetDays: 270, owner: 'host', category: 'planning', risk: { ifDelayed: 'No number to sell against; sponsorship and procurement cannot start', severity: 'high' } },
    { id: 'g_venue', name: 'Book venue and lock the date', offsetDays: 270, owner: 'host', dependsOn: ['g_target'], category: 'venue', risk: { ifDelayed: 'Ballroom gone for the season; forced into a worse room or a worse date', severity: 'high' } },
    { id: 'g_sponsors', name: 'Open sponsorship and table sales', offsetDays: 240, owner: 'committee', dependsOn: ['g_target', 'g_venue'], category: 'revenue', risk: { ifDelayed: 'Corporate giving budgets are already committed; the largest line comes in short', severity: 'high' } },
    { id: 'g_procurement', name: 'Open auction procurement', offsetDays: 210, owner: 'committee', dependsOn: ['g_target'], category: 'revenue', risk: { ifDelayed: 'A thin auction with nothing anyone wants to bid on', severity: 'high' } },
    { id: 'g_licensing', name: 'Secure alcohol licence, raffle or gaming permit, and insurance', offsetDays: 180, owner: 'host', dependsOn: ['g_venue'], category: 'compliance', risk: { ifDelayed: 'A revenue line becomes illegal on the night, or the bar cannot open', severity: 'high' } },
    { id: 'g_vendors', name: 'Contract caterer, AV and production, entertainment, photographer', offsetDays: 180, owner: 'host', dependsOn: ['g_venue'], category: 'vendor', risk: { ifDelayed: 'Best production crews booked; the program has no one to run it', severity: 'high' } },
    { id: 'g_payments', name: 'Stand up the bidding, payment and donor-data platform', offsetDays: 120, owner: 'host', dependsOn: ['g_procurement'], category: 'revenue', risk: { ifDelayed: 'Pledges raised on the night are never collected', severity: 'high' } },
    { id: 'g_invites', name: 'Mail invitations and open registration', offsetDays: 90, owner: 'host', dependsOn: ['g_sponsors'], category: 'guest', risk: { ifDelayed: 'The sales window compresses; tables go unsold', severity: 'high' } },
    { id: 'g_access', name: 'Walk the venue for accessibility and confirm what has to be added', offsetDays: 90, owner: 'host', dependsOn: ['g_venue'], category: 'venue', risk: { ifDelayed: 'A donor cannot reach their own table; the fix is impossible on the night', severity: 'high' } },
    { id: 'g_program', name: 'Lock the run of show and place the giving moment', offsetDays: 60, owner: 'producer', dependsOn: ['g_vendors'], category: 'program', risk: { ifDelayed: 'The ask lands cold, late, or to a half-empty room', severity: 'high' } },
    { id: 'g_salesclose', name: 'Close table and ticket sales; chase the unsold', offsetDays: 30, owner: 'committee', dependsOn: ['g_invites'], category: 'revenue', risk: { ifDelayed: 'Empty seats you have already paid the caterer for', severity: 'high' } },
    { id: 'g_sponsor_deliver', name: 'Collect sponsor assets and confirm every recognition item owed', offsetDays: 30, owner: 'host', dependsOn: ['g_sponsors'], category: 'sponsorship', risk: { ifDelayed: 'A promised logo or stage mention is missed; the renewal is gone', severity: 'high' } },
    { id: 'g_headcount', name: 'Final headcount, dietary list, and seating chart', offsetDays: 14, owner: 'host', dependsOn: ['g_salesclose'], category: 'guest', risk: { ifDelayed: 'You are billed on the wrong guarantee and the chart is built twice', severity: 'high' } },
    { id: 'g_loadin', name: 'Load in, set the room, stage the auction, rehearse the program', offsetDays: 1, owner: 'producer', dependsOn: ['g_headcount', 'g_program'], category: 'setup', risk: { ifDelayed: 'Vendors collide in the dock; the program is unrehearsed', severity: 'high' } },
    { id: 'event', name: 'The gala', offsetDays: 0, owner: 'producer', dependsOn: ['g_loadin'], category: 'event', risk: null },
    { id: 'g_reconcile', name: 'Reconcile the money, receipt every donor, thank everyone owed', offsetDays: 0, owner: 'host', dependsOn: ['event'], category: 'revenue', risk: { ifDelayed: 'Pledges go uncollected and receipts go out wrong or late', severity: 'high' } },
  ],

  tasks: [
    { id: 't_target', milestoneId: 'g_target', phase: 'planning', label: 'Set the fundraising target and write the case for support that every ask this year will use', when: 'T-270d' },
    { id: 't_budget', milestoneId: 'g_target', phase: 'planning', label: 'Build the expense budget against the target, and agree with the board what ratio of cost to raise is acceptable', when: 'T-270d' },
    { id: 't_venue', milestoneId: 'g_venue', phase: 'venue', label: 'Tour and compare venues, then sign the contract and deposit; read the food-and-beverage minimum and the hard-out time before you sign', when: 'T-270d' },
    { id: 't_committee', milestoneId: 'g_target', phase: 'planning', label: 'Recruit the host committee and name who owns table sales, sponsorship, and auction procurement', when: 'T-260d' },
    { id: 't_prospectus', milestoneId: 'g_sponsors', phase: 'sponsorship', label: 'Write the sponsorship prospectus stating exactly what each tier receives, and open sponsor sales', when: 'T-240d' },
    { id: 't_tables', milestoneId: 'g_sponsors', phase: 'revenue', label: 'Open table and ticket sales with a named close date, and set a weekly pacing check against the target', when: 'T-240d' },
    { id: 't_procure', milestoneId: 'g_procurement', phase: 'revenue', label: 'Open auction procurement: solicit items and log the donor, the fair market value, and any restrictions on each one', when: 'T-210d', whenChoice: { id: 'auction', in: ['Silent auction only', 'Live auction only', 'Silent plus live'] } },
    { id: 't_licence_alcohol', milestoneId: 'g_licensing', phase: 'compliance', label: 'Confirm in writing who holds the liquor licence for the night — you, the venue, or the caterer — and pull a special-occasion permit if it falls to you', when: 'T-180d' },
    { id: 't_licence_raffle', milestoneId: 'g_licensing', phase: 'compliance', label: 'Apply for the raffle or gaming licence your state requires, and confirm the drawing rules you must print on the ticket', when: 'T-180d', whenChoice: { id: 'auction', in: ['Raffle only'] } },
    { id: 't_insurance', milestoneId: 'g_licensing', phase: 'compliance', label: 'Bind event liability and liquor-liability insurance, and collect a certificate of insurance from every vendor the venue requires one from', when: 'T-180d' },
    { id: 't_vendors', milestoneId: 'g_vendors', phase: 'vendor', label: 'Contract the caterer, the AV and production partner, and the entertainment', when: 'T-180d' },
    { id: 't_auctioneer', milestoneId: 'g_vendors', phase: 'vendor', label: 'Book the auctioneer and the emcee, and brief each on the target and the exact ask', when: 'T-180d', whenChoice: { id: 'auction', in: ['Live auction only', 'Silent plus live'] } },
    { id: 't_payments', milestoneId: 'g_payments', phase: 'revenue', label: 'Stand up the bidding and payment platform, and run a real card transaction end to end on the venue’s own network', when: 'T-120d' },
    { id: 't_donordata', milestoneId: 'g_payments', phase: 'revenue', label: 'Decide what you capture about each guest at registration and how it reaches the donor record the next morning', when: 'T-120d' },
    { id: 't_receipt_rules', milestoneId: 'g_payments', phase: 'compliance', label: 'Calculate the fair market value of what each ticket and each auction item gives the donor, so the tax receipts state the right deductible amount', when: 'T-120d' },
    { id: 't_invites', milestoneId: 'g_invites', phase: 'guest', label: 'Mail invitations and open online registration; track table hosts and the guest names they owe you', when: 'T-90d' },
    // ACCESSIBILITY — silent in 32 of 39 playbooks, and this is the room where
    // it matters most: an older guest list and a long ballroom walk.
    { id: 't_access', milestoneId: 'g_access', phase: 'venue', label: 'Walk the venue for step-free entry, accessible restrooms, wheelchair spaces at real tables rather than at the back, and captioning or a hearing loop for the program', when: 'T-90d' },
    { id: 't_access_ask', milestoneId: 'g_access', phase: 'guest', label: 'Add the accessibility and dietary ask to the invite and the registration form, and give one person the job of acting on every answer', when: 'T-90d' },
    { id: 't_display', milestoneId: 'g_procurement', phase: 'revenue', label: 'Design the auction display and the bidding layout so an item is easy to find, easy to understand, and easy to bid on while holding a drink', when: 'T-60d', whenChoice: { id: 'auction', in: ['Silent auction only', 'Silent plus live'] } },
    { id: 't_program', milestoneId: 'g_program', phase: 'program', label: 'Build the run of show and place the giving moment straight after the mission story, while the room is warmest', when: 'T-60d' },
    { id: 't_speakers', milestoneId: 'g_program', phase: 'program', label: 'Confirm the emcee, the mission speaker, and every honoree; send each one their time slot and the exact words of their ask', when: 'T-60d' },
    { id: 't_salesclose', milestoneId: 'g_salesclose', phase: 'revenue', label: 'Close table and ticket sales, then call every unsold table personally rather than waiting on the form', when: 'T-30d' },
    { id: 't_sponsor_deliver', milestoneId: 'g_sponsor_deliver', phase: 'sponsorship', label: 'Collect sponsor logos and confirm every recognition item you promised: signage, program listing, stage mention, and table placement', when: 'T-30d' },
    { id: 't_print', milestoneId: 'g_sponsor_deliver', phase: 'production', label: 'Order programs, signage, bid sheets, paddles and pledge cards, and proof every sponsor name against the contract', when: 'T-30d' },
    { id: 't_headcount', milestoneId: 'g_headcount', phase: 'catering', label: 'Give the caterer the final headcount and the dietary list, and confirm the guarantee number you will be billed on', when: 'T-14d' },
    { id: 't_seating', milestoneId: 'g_headcount', phase: 'guest', label: 'Build the seating chart around the asks: put table hosts, prospects and board members where they do the most good', when: 'T-14d' },
    { id: 't_volunteers', milestoneId: 'g_headcount', phase: 'planning', label: 'Name a point person for every role on the night: registration, auction desk, checkout, room captain, and one person who only handles problems', when: 'T-14d' },
    { id: 't_dryrun', milestoneId: 'g_payments', phase: 'revenue', label: 'Dry-run registration and checkout with real volunteers and a real card payment, so nobody learns the software on the night', when: 'T-7d' },
    // LOAD-IN — silent in 37 of 39. A ballroom gives you a dock window and one
    // elevator; vendors who do not know theirs collide in it.
    { id: 't_loadin', milestoneId: 'g_loadin', phase: 'setup', label: 'Confirm the load-in window with the venue and send every vendor their own hour, the dock address, and the elevator they may use', when: 'T-1d' },
    { id: 't_setroom', milestoneId: 'g_loadin', phase: 'setup', label: 'Set the room: tables to the chart, place cards down, auction display staged, sponsor signage placed where it was promised', when: 'T-1d' },
    { id: 't_rehearse', milestoneId: 'g_loadin', phase: 'program', label: 'Rehearse the run of show on the actual stage: mic check, slide cues, the auctioneer’s handoff, and the moment the ask begins', when: 'T-1d' },
    // FIRST AID — silent in 34 of 39. A five-hour evening, a bar, and an older
    // room is exactly where this is needed.
    { id: 't_firstaid', milestoneId: 'g_loadin', phase: 'setup', label: 'Stage a first-aid kit at the registration desk and walk the venue’s medical and evacuation plan with the room captain', when: 'T-1d' },
    { id: 't_checkin', milestoneId: 'event', phase: 'event', label: 'Open registration and capture a card at check-in, so checkout at the end of the night is a signature rather than a queue', when: 'T0' },
    { id: 't_showcall', milestoneId: 'event', phase: 'event', label: 'Call the program from the run of show: hold every speaker to their time and protect the giving moment', when: 'T0' },
    { id: 't_checkout', milestoneId: 'event', phase: 'event', label: 'Run auction checkout: reconcile winning bids, take payment, and release each item with a receipt stating its fair market value', when: 'T0', whenChoice: { id: 'auction', in: ['Silent auction only', 'Live auction only', 'Silent plus live', 'Raffle only'] } },
    { id: 't_count', milestoneId: 'g_reconcile', phase: 'revenue', label: 'Count and secure the night’s takings before anyone leaves, with two people present and both signing the total', when: 'T0' },
    { id: 't_reconcile', milestoneId: 'g_reconcile', phase: 'revenue', label: 'Reconcile the night: total raised by revenue line against the target, and settle every vendor invoice', when: 'T0 +1d' },
    { id: 't_pledges', milestoneId: 'g_reconcile', phase: 'revenue', label: 'Chase every unpaid pledge and unsettled auction win, by name, within the first week', when: 'T0 +3d' },
    { id: 't_receipts', milestoneId: 'g_reconcile', phase: 'compliance', label: 'Send tax receipts stating the deductible amount, with the fair market value of what the donor received taken off the top', when: 'T0 +3d' },
    { id: 't_thanks', milestoneId: 'g_reconcile', phase: 'sponsorship', label: 'Thank sponsors, item donors, table hosts and the committee, and send each sponsor proof that their recognition ran', when: 'T0 +3d' },
    { id: 't_debrief', milestoneId: 'g_reconcile', phase: 'planning', label: 'Debrief the committee while it is fresh, and write down what to change before next year’s date is booked', when: 'T0 +7d' },
  ],

  // Vendor-led: catering, AV and production are contracted, not bought. These
  // are the things the host's own team actually buys and prints.
  purchases: [
    { id: 'p_programs', item: 'Printed programs with sponsor listings', category: 'logistics', qtyPerGuest: 1, unit: 'program', where: ['Print shop'], unitCostRange: [1, 4], essential: true, buyAt: 'T-3d', note: 'Proof every sponsor name and tier against the signed contract — a misspelled sponsor is a lost renewal.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_placecards', item: 'Place cards and table numbers', category: 'logistics', qtyPerGuest: 1, unit: 'card', where: ['Print shop', 'Office supply'], unitCostRange: [0.5, 2], essential: true, buyAt: 'T-1d', note: 'Proofread against the FINAL seating chart, not the one from the week before.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_pledgecards', item: 'Pledge cards and pens for every seat', category: 'logistics', qtyPerGuest: 1, unit: 'card', where: ['Print shop', 'Office supply'], unitCostRange: [0.25, 1], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN. A guest who is moved during the ask and has nothing to write on has been moved for nothing.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_paddles', item: 'Bidder paddles or numbered cards', category: 'logistics', qtyPerGuest: 1, unit: 'paddle', where: ['Print shop', 'Amazon'], unitCostRange: [0.5, 3], essential: false, buyAt: 'T-3d', dependsOnDecision: 'auction', note: 'Numbered to the registration list so the auctioneer calls a number the checkout desk can find.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_bidsheets', item: 'Silent auction bid sheets, item cards and display stands', category: 'logistics', qtyFlat: 1, unit: 'set', where: ['Print shop', 'Office supply'], unitCostRange: [75, 400], essential: false, buyAt: 'T-3d', dependsOnDecision: 'auction', note: 'Every item card states the donor and the fair market value — you need both for the receipts afterwards.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_signage', item: 'Sponsor, wayfinding and auction signage package', category: 'decor', qtyFlat: 1, unit: 'sign package', where: ['Sign/print shop'], unitCostRange: [500, 3000], essential: true, buyAt: 'T-3d', note: 'Scales with sponsor count and room size: entry, registration, auction, restrooms, and every recognition item you contracted.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_centerpieces', item: 'Table centerpieces', category: 'decor', qtyFlat: 1, qtyPer: 10, unit: 'centerpiece per table', where: ['Florist', 'Wholesale floral'], unitCostRange: [40, 150], essential: false, buyAt: 'T-1d', note: 'Keep them low. A tall centerpiece your guests cannot see the stage over costs you the ask.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_checkout_kit', item: 'Registration and checkout kit (card readers, receipt printer, cash box, power)', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Payment vendor', 'Office supply'], unitCostRange: [150, 800], essential: true, buyAt: 'T-1d', note: 'Card readers, a charged backup, receipt stock, a lockable cash box, power strips and gaffer tape. Test on the venue network, not the office one.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_firstaid', item: 'First-aid kit for the registration desk', category: 'logistics', qtyFlat: 1, unit: 'kit', where: ['Pharmacy', 'Amazon'], unitCostRange: [25, 60], essential: true, buyAt: 'T-3d', note: 'COMMONLY FORGOTTEN. A long evening, a bar, and a guest list that skews older is exactly where this gets used.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_wine', item: 'Wine and beer (only if the bar is self-supplied)', category: 'beverage', qtyPerGuest: 3, unit: 'drinks', where: ['Liquor store', 'Costco', 'Warehouse'], unitCostRange: [2, 6], essential: false, buyAt: 'T-3d', dependsOnDecision: 'bar', note: 'Only if you supply the bar rather than the venue. Plan about one drink per guest per hour, heavier in the first. Confirm corkage and who holds the licence before you buy a single case.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_nonalc', item: 'Zero-proof drinks for the reception and the tables', category: 'beverage', qtyPerGuest: 2, unit: 'drinks', where: ['Grocery', 'Venue F&B'], unitCostRange: [0.75, 3], essential: true, buyAt: 'T-3d', note: 'A real option, not soda water. A significant share of this room is not drinking and some of them are your largest donors.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
    { id: 'p_cleanup', item: 'Teardown kit (bags, boxes for unsold auction items, labels, tape)', category: 'cleanup', qtyFlat: 1, unit: 'kit', where: ['Office supply', 'Grocery'], unitCostRange: [20, 60], essential: true, buyAt: 'T-3d', note: 'Unsold and uncollected auction items have to leave the room labeled with their donor, or they become somebody’s problem in March.', provenance: { tier: 'estimate', confidence: 'low', verificationStatus: 'synthesized' } },
  ],

  rentalsGap: [
    { item: 'Round tables and chairs set to the seating chart', qtyPerGuest: 1, note: 'Ten to a round is standard; the chart, not the room capacity, sets the count.' },
    { item: 'Stage, lectern, screens and confidence monitor', qtyFlat: 1, note: 'The program is the revenue event. Usually on the AV and production contract.' },
    { item: 'Auction display tables, risers and lighting', qtyFlat: 1, note: 'Items nobody can see are items nobody bids on. Size to the item count, not the guest count.' },
    { item: 'Registration and checkout counters', qtyFlat: 1, note: 'Plan roughly one check-in line per 100 guests, and a separate checkout desk so the two queues never merge.' },
    { item: 'Accessible seating positions and a ramp to the stage', qtyFlat: 1, note: 'A wheelchair space at a real table, not at the back — and an honoree who uses a chair still has to reach the lectern.' },
    { item: 'Power distribution and lighting for a tented site', qtyFlat: 1, note: 'A tent means you are also buying power, flooring and restrooms. Not needed in a ballroom.' },
  ],

  vendors: [
    { category: 'Venue / ballroom', required: true, altToDIY: 'Your own facility, if it seats the room and can be licensed', when: 'T-270d', proofRequired: ['signed contract', 'food-and-beverage minimum', 'hard-out time', 'load-in window'], costRange: [5000, 100000], costUnit: 'flat' },
    { category: 'Caterer (usually the venue’s exclusive)', required: true, altToDIY: 'Outside catering is contractually barred at most ballrooms and museums', when: 'T-180d', proofRequired: ['headcount guarantee terms', 'dietary handling'], costRange: [75, 250], costUnit: 'per guest' },
    { category: 'AV / production (stage, screens, audio, show-calling)', required: true, altToDIY: 'House AV for a small room only — the ask cannot fail on a bad microphone', when: 'T-180d', costRange: [5000, 75000], costUnit: 'flat' },
    { category: 'Auctioneer / benefit auctioneer', required: false, altToDIY: 'A board member with a personality — reliably raises less than a professional', when: 'T-180d', costRange: [2000, 15000], costUnit: 'flat' },
    { category: 'Bidding, payment and donor-data platform', required: true, altToDIY: 'Paper bid sheets and manual card entry — cheap, and it costs you the checkout queue', when: 'T-120d', costRange: [1000, 15000], costUnit: 'flat' },
    { category: 'Entertainment (band, DJ, or performance)', required: false, altToDIY: 'A playlist and a rented PA — fine for a reception, thin for a ballroom', when: 'T-180d', costRange: [1500, 20000], costUnit: 'flat' },
    { category: 'Photographer / videographer', required: false, altToDIY: 'Volunteer with a good camera — you lose the sponsor-proof images you owe', when: 'T-120d', costRange: [1000, 8000], costUnit: 'flat' },
    { category: 'Florals and decor', required: false, altToDIY: 'Committee-built low centerpieces from a wholesale market', when: 'T-120d', costRange: [2000, 25000], costUnit: 'flat' },
    { category: 'Event and liquor-liability insurance', required: true, altToDIY: 'No DIY — the venue will require a certificate before you load in', when: 'T-180d', costRange: [300, 3000], costUnit: 'flat' },
    { category: 'Security and coat check', required: false, altToDIY: 'Venue security for a small room; contract guards where cash and auction items are held', when: 'T-90d', costRange: [500, 6000], costUnit: 'flat' },
  ],

  risks: [
    { id: 'r_target', trigger: 'Table and ticket sales pacing well below the target with under two months to go', severity: 'high', mitigation: 'Set a weekly pacing check from the day sales open; call unsold tables personally at 30 days out rather than emailing; and reforecast the expense budget so you can cut scope before you are committed to it.' },
    { id: 'r_sponsor_deliver', trigger: 'A recognition item you sold a sponsor is not delivered on the night', severity: 'high', mitigation: 'Keep a line-by-line list of what every tier was promised, check it against the room at load-in, and send each sponsor photographic proof afterwards. A missed logo costs the renewal, which is worth more than the gala.' },
    { id: 'r_permit', trigger: 'The alcohol licence or the raffle permit is not in hand, so a revenue line is illegal on the night', severity: 'high', mitigation: 'Confirm in writing at six months out who holds the liquor licence, and apply for the state raffle or gaming permit at the same time — processing runs from two weeks to several months depending on the state. Print the required drawing rules on the ticket.' },
    { id: 'r_uncollected', trigger: 'Pledges and winning bids raised on the night are never actually collected', severity: 'high', mitigation: 'Capture a card at check-in so checkout is a signature; reconcile the night before anyone leaves; then chase every unpaid pledge by name inside the first week, while the evening is still a good memory.' },
    { id: 'r_receipt', trigger: 'Tax receipts state the wrong deductible amount', severity: 'high', mitigation: 'Calculate the fair market value of the ticket and of every auction item before the night, print it on the item card, and state the deductible amount on the receipt. Getting this wrong is a problem for the donor as well as for you.' },
    { id: 'r_ask_placement', trigger: 'The giving moment lands late, cold, or to a room that has started leaving', severity: 'high', mitigation: 'Place the ask straight after the mission story while the room is warm and seated; hold the whole program under forty-five minutes; and never make the largest ask of the night at the very end.' },
    { id: 'r_av', trigger: 'The microphone or the screen fails during the mission story or the ask', severity: 'high', mitigation: 'Contract a real production partner, rehearse on the actual stage the day before, keep a redundant handheld microphone at the lectern, and have the emcee briefed to hold the room while it is fixed.' },
    { id: 'r_access', trigger: 'A guest cannot reach their table, the restroom, or the stage', severity: 'high', mitigation: 'Walk the venue at three months out for step-free entry, accessible restrooms and a stage ramp; put wheelchair spaces at real tables rather than at the back; and put the accessibility ask on the registration form where someone will act on it.' },
    { id: 'r_checkout_queue', trigger: 'Three hundred guests leave through one checkout desk at eleven at night', severity: 'med', mitigation: 'Card on file at check-in, a checkout desk separate from the coat check, and enough volunteers that the last table out waits under five minutes.' },
    { id: 'r_cash', trigger: 'Cash, cards, or auction items go missing during the evening', severity: 'high', mitigation: 'A lockable box in a staffed room, two people present for every count, both signing the total, and contracted security wherever items are held. Never leave the takings with one volunteer.' },
    { id: 'r_loadin', trigger: 'Vendors collide in the loading dock and the room is not set in time', severity: 'med', mitigation: 'Get the load-in window from the venue in writing, give every vendor their own hour, name the dock and the elevator, and put one person on the dock who owns the sequence.' },
    { id: 'r_procurement', trigger: 'The auction is thin and nothing in it is worth bidding on', severity: 'med', mitigation: 'Open procurement at seven months out, set an item target and a floor value, and cut weak items rather than padding the display. Six good lots beat thirty mediocre ones.' },
    { id: 'r_overserve', trigger: 'A guest is over-served across a five-hour evening with an open bar', severity: 'med', mitigation: 'Carry liquor-liability insurance, use licensed bartenders who are briefed to cut off, close the bar before the program ends rather than after, and have rideshare or car service arranged at the door.' },
    { id: 'r_count_wrong', trigger: 'The headcount guarantee is submitted on a stale number', severity: 'med', mitigation: 'Reconcile registration against the guarantee at two weeks out, know the venue’s overset percentage so you can flex up on the night, and remember most contracts will not let the number come down.' },
  ],

  contingencies: [
    { id: 'c_target', when: 'r_target', plan: 'Convert unsold tables into sponsored tables filled with mission guests — a full room raises more than a half-empty one — and trigger a matching-gift challenge from a board member to lift the live ask above the shortfall.' },
    { id: 'c_av', when: 'r_av', plan: 'Cut to the redundant handheld microphone; the emcee holds the room and tells one story while production resets. If the screen dies, the mission speaker continues without it — the story works without slides and the ask has never depended on them.' },
    { id: 'c_permit', when: 'r_permit', plan: 'If the raffle permit has not landed, cancel the raffle and refund it rather than running it — an unlicensed drawing is a regulatory problem, not a small one. If the liquor licence is in doubt, move the bar onto the venue’s own licence even at a worse rate.' },
    { id: 'c_uncollected', when: 'r_uncollected', plan: 'Run the unpaid list within forty-eight hours while the evening is still warm, call rather than email, and offer to split a large pledge across the quarter. A pledge chased in week one collects; one chased in month three usually does not.' },
    { id: 'c_checkout_queue', when: 'r_checkout_queue', plan: 'Open a second checkout station with a volunteer taking card details on paper for later processing, and let anyone with a card already on file leave immediately with an emailed receipt.' },
    { id: 'c_ask_placement', when: 'r_ask_placement', plan: 'If the program is running long, cut a speaker rather than moving the ask. The ask holds its place; everything around it is compressible.' },
  ],

  schedules: {
    purchasing: [
      { when: 'T-30d', what: 'Order programs, signage, bid sheets, paddles and pledge cards — mind the print lead times' },
      { when: 'T-3d', what: 'Collect signage and printed items; pledge cards and pens; first-aid kit; teardown kit; self-supplied bar if any' },
      { when: 'T-1d', what: 'Place cards to the final chart, centerpieces, registration and checkout kit staged and tested' },
      { when: 'T0', what: 'Ice and anything the caterer did not bring' },
    ],
    preparation: [
      { when: 'T-90d', what: 'Invitations mailed; registration open; accessibility walk done and the ask on the form' },
      { when: 'T-60d', what: 'Run of show locked; giving moment placed; speakers confirmed with their exact ask' },
      { when: 'T-30d', what: 'Sales closed and unsold tables called; sponsor recognition list confirmed against contracts' },
      { when: 'T-14d', what: 'Final headcount and dietary list to the caterer; seating chart built; night roles assigned by name' },
      { when: 'T-7d', what: 'Dry-run registration and checkout with real volunteers and real cards' },
    ],
    setup: [
      { when: 'T-1d', what: 'Load in to the vendor sequence; set tables to the chart; stage the auction display; place sponsor signage' },
      { when: 'T-1d PM', what: 'Rehearse the run of show on stage: mic check, slide cues, auctioneer handoff, the moment the ask begins' },
      { when: 'T0 -4h', what: 'Place cards down; pledge cards and pens at every seat; bid sheets and item cards checked against the list' },
      { when: 'T0 -3h', what: 'Registration and checkout stations built and tested on the venue network; first-aid kit staged' },
      { when: 'T0 -2h', what: 'Walk the room with the venue: accessible routes clear, fire lanes clear, stage ramp in place' },
      { when: 'T0 -1h', what: 'Brief every volunteer on their station; brief the bartenders; confirm the hard-out time with the venue' },
    ],
    program: [
      { when: 'T0 +5m', what: 'Doors and registration: card captured at check-in, paddles issued, guests into the reception' },
      { when: 'T0 +15m', what: 'Reception and silent auction bidding open; sponsors visible; the room fills' },
      { when: 'T0 +1h', what: 'Room called to dinner; guests seated to the chart' },
      { when: 'T0 +1:30', what: 'Welcome and the thank-you to sponsors, by name and briefly' },
      { when: 'T0 +2h', what: 'The mission story — the warmest the room will be all night' },
      { when: 'T0 +2:15', what: 'The giving moment: the ask, made once, clearly, with the pledge cards already on the table' },
      { when: 'T0 +2:45', what: 'Live auction while the room is still with you; silent bidding closes' },
      { when: 'T0 +3:15', what: 'Dessert, the total announced, and the thanks' },
      { when: 'T0 +3:30', what: 'Checkout opens; entertainment and dancing carry the rest of the evening' },
      { when: 'T0 +5h', what: 'Last call before the hard-out; cars for anyone who needs one' },
    ],
    cleanup: [
      { when: 'during', what: 'Room captain holds the run of show; auction desk logs winners live; nobody handles cash alone' },
      { when: 'T0 +4h', what: 'Auction checkout run down; items released with receipts; unsold items boxed and labeled by donor' },
      { when: 'T0 +5:30', what: 'Count and secure the takings with two people present, both signing; strike the room; rentals staged for collection' },
      { when: 'T0 +1d', what: 'Reconcile the total by revenue line against the target; settle vendor invoices' },
      { when: 'T0 +3d', what: 'Chase unpaid pledges; send tax receipts with the correct deductible amount; thank sponsors with proof their recognition ran' },
      { when: 'T0 +7d', what: 'Debrief the committee and write down what to change before next year’s date is booked' },
    ],
  },

  // Day-of readiness, authored for a ballroom gala. Heavier than any other list
  // in the corpus because this event carries money, alcohol, a stage, a crowd,
  // and a guest list that skews older — all in one room, for five hours.
  dayOfChecklist: [
    { id: 'money', label: 'Money handling secured', detail: 'Card readers tested on the venue network, a lockable box in a staffed room, two people for every count, and nobody handling cash alone at any point in the night.', severity: 'critical' },
    { id: 'permits', label: 'Licences and insurance in hand', detail: 'Alcohol licence, raffle or gaming permit, and the certificates of insurance the venue requires — physically present, not "on file somewhere".', severity: 'high' },
    { id: 'access', label: 'Accessible routes clear', detail: 'Step-free entry open, accessible restrooms unlocked and signed, wheelchair spaces set at real tables, stage ramp in place before the first honoree needs it.', severity: 'high' },
    { id: 'medical', label: 'First aid and evacuation', detail: 'First-aid kit at the registration desk, the venue’s medical and evacuation plan walked with the room captain, and fire lanes and exits clear of auction tables.', severity: 'high' },
    { id: 'av', label: 'Program AV proven', detail: 'Microphones tested on the actual stage, a redundant handheld at the lectern, slides cued, and the emcee briefed on what to do if it fails mid-ask.', severity: 'high' },
    { id: 'food', label: 'Food safety and dietary plates', detail: 'Hot held hot and cold held cold across a long service, and every dietary plate matched to the right seat number rather than to a raised hand.', severity: 'high' },
    { id: 'auction', label: 'Auction items secured and logged', detail: 'Items accounted for against the procurement list, values on the cards, display attended, and a plan for how each one leaves the room.', severity: 'med' },
    { id: 'bar', label: 'Bar service briefed', detail: 'Licensed bartenders briefed to cut off, a real zero-proof option out, bar closing before the program ends, and rideshare or car service arranged at the door.', severity: 'med' },
    { id: 'roles', label: 'Every role filled by name', detail: 'Registration, auction desk, checkout, room captain, and one person whose only job is problems — each one knows they hold it.', severity: 'med' },
    { id: 'sponsors', label: 'Sponsor recognition in the room', detail: 'Walk the room against the contracted list: signage, program listing, table placement, and the stage mentions the emcee owes.', severity: 'med' },
  ],

  knowledge: {
    governanceVersion: '1.0.0',
    verificationStatus: 'synthesized',
    note: 'Authored 2026-08-21 to replace the Wedding borrow. The borrow carried the venue, caterer, AV, seating chart and run of show correctly and had no model at all for the revenue side, which is the entire reason a gala exists. That side is authored here in full: a fundraising target the night is measured against, table or ticket sales with a close date and weekly pacing, sponsors owed contractual recognition, auction procurement through display and bidding to checkout, payment processing at scale on the night, donor data capture routed to the CRM, tax receipting where the fair market value of what the donor received is deducted from the receiptable amount, and a program whose giving moment is placed straight after the mission story rather than at the end. The runway is anchored between Conference (180 days out) and Wedding (365 days out) at 270 days out, because a gala shares the wedding’s venue-first problem and the conference’s revenue-pacing problem but rarely books eighteen months ahead. Sponsorship opens at 240 days out and auction procurement at 210 days out, ahead of Conference’s 150 days out prospectus, because procurement is a solicitation campaign rather than a sale and needs the longer tail; the 14 days out final headcount matches Wedding exactly. Where a lead was genuinely uncertain the CONSERVATIVE (earlier) figure was taken — most notably the 180 days out licensing row, because state raffle and gaming permit processing times range from about two weeks to several months and the playbook should not assume the fast end. Four of the coverage audit’s universal blind spots are authored because they genuinely apply here: PERMITS (an alcohol licence, and a raffle is regulated gaming in most US states, requiring a permit and printed drawing rules), ACCESSIBILITY (this room matters most — an older guest list, a long ballroom walk, and a stage an honoree may need a ramp to reach), LOAD-IN (a ballroom gives you one dock window and one elevator, and vendors who do not know their hour collide in it), and FIRST AID (five hours, a bar, and a crowd). Fundraising ratios, drink-volume heuristics and pacing practice reflect widely-published nonprofit-events consensus rather than any single source; specific state raffle-licensing requirements are named as a thing to check, never asserted, because they differ by jurisdiction and the app holds no jurisdiction data. Authored as established-consensus trade practice and labeled synthesized until a foreground verification pass attaches citations. No fabricated sources.',
    sources: [],
  },
};

export default fundraiserGala;
