// Pipeline sample clients — populates every CRM stage (Inquiry / Proposal /
// Contracted / Complete); the original seed clients are all "Active". Hand-authored.
// Wired into SEED_CLIENTS + SEED_CLIENT_IDS with a one-time injection for onboarded users.
export const SAMPLE_CLIENTS_EXTRA = [
  // ── INQUIRY ───────────────────────────────────────────────
  {
    id: 'cl-x-inq1', name: 'Bianca Flores', email: 'bianca.flores@gmail.com', phone: '(615) 555-7001',
    referral: 'Instagram', status: 'Inquiry', plannerFee: '', feeSchedule: [],
    style: 'Quinceañera — traditional Mass + ballroom reception. Blush + gold.',
    notes: 'Found us via Instagram reel. Date target April 2027. ~150 guests. Wants full-service incl. court coordination.',
    log: [{ id: 'clx-i1a', date: '2026-06-08', text: 'Inquiry via Instagram DM. Sent intake form + pricing guide. Awaiting reply.' }],
    eventIds: [],
  },
  {
    id: 'cl-x-inq2', name: 'Devon & Maya Wright', email: 'devon.wright@email.com', phone: '(615) 555-7002',
    referral: 'The Knot', status: 'Inquiry', plannerFee: '', feeSchedule: [],
    style: 'Wedding — modern minimalist, fall 2027. Guest count TBD.',
    notes: 'Submitted contact form on The Knot. Brief call done; sending proposal next week.',
    log: [{ id: 'clx-i2a', date: '2026-06-10', text: 'Contact form via The Knot. 15-min intro call — budget ~$28k, 120 guests. Proposal to follow.' }],
    eventIds: [],
  },
  // ── PROPOSAL ──────────────────────────────────────────────
  {
    id: 'cl-x-prop1', name: 'Aspen Tech (Holiday Party)', email: 'events@aspentech.io', phone: '(615) 555-7003',
    referral: 'LinkedIn', status: 'Proposal', plannerFee: 6500,
    feeSchedule: [{ id: 'clx-p1f1', label: 'Coordination fee', amount: 6500, due: '2026-09-01', paid: false, paymentMethod: '' }],
    style: 'Corporate holiday party, ~200 staff. Upscale-casual, December.',
    notes: 'People Ops lead requested a proposal for a Dec holiday party. Proposal sent; decision expected by month-end.',
    log: [
      { id: 'clx-p1a', date: '2026-06-02', text: 'Discovery call with People Ops. 200 headcount, $40k event budget.' },
      { id: 'clx-p1b', date: '2026-06-09', text: 'Proposal + coordination fee ($6,500) sent. Awaiting committee sign-off.' },
    ],
    eventIds: [],
  },
  {
    id: 'cl-x-prop2', name: 'Grace & Liam OConnor', email: 'grace.oconnor@email.com', phone: '(615) 555-7004',
    referral: 'Venue Referral', status: 'Proposal', plannerFee: 2800,
    feeSchedule: [{ id: 'clx-p2f1', label: 'Engagement party coordination', amount: 2800, due: '2026-07-15', paid: false, paymentMethod: '' }],
    style: 'Engagement party — garden cocktail, late summer.',
    notes: 'Referred by The Greenhouse Loft. Proposal sent for an August engagement party; follow-up call booked.',
    log: [
      { id: 'clx-p2a', date: '2026-06-05', text: 'Venue referral. Couple wants a 60-guest engagement party in August.' },
      { id: 'clx-p2b', date: '2026-06-11', text: 'Proposal sent. Follow-up call scheduled for 6/18.' },
    ],
    eventIds: [],
  },
  // ── CONTRACTED ────────────────────────────────────────────
  {
    id: 'cl-x-con1', name: 'Lincoln High Class of 2005', email: 'reunion2005@lincolnalumni.org', phone: '(615) 555-7005',
    referral: 'Word of Mouth', status: 'Contracted', plannerFee: 4200,
    feeSchedule: [
      { id: 'clx-c1f1', label: 'Booking retainer', amount: 1400, due: '2026-05-20', paid: true, paymentMethod: 'Zelle' },
      { id: 'clx-c1f2', label: 'Midpoint', amount: 1400, due: '2027-01-15', paid: false, paymentMethod: '' },
      { id: 'clx-c1f3', label: 'Final', amount: 1400, due: '2027-06-15', paid: false, paymentMethod: '' },
    ],
    style: '20-year class reunion, summer 2027. Casual, nostalgic, family-friendly.',
    notes: 'Reunion committee (5 members). Contract signed; just kicking off the long-lead attendee outreach.',
    log: [
      { id: 'clx-c1a', date: '2026-05-12', text: 'Committee call. Booked us for the 7/2027 reunion.' },
      { id: 'clx-c1b', date: '2026-05-20', text: 'Contract signed, retainer paid. Starting attendee-locating outreach.' },
    ],
    eventIds: ['ev-x-reunion'],
  },
  {
    id: 'cl-x-con2', name: 'Vertex Labs (Product Launch)', email: 'marketing@vertexlabs.com', phone: '(615) 555-7006',
    referral: 'LinkedIn', status: 'Contracted', plannerFee: 9000,
    feeSchedule: [
      { id: 'clx-c2f1', label: 'Booking retainer', amount: 4500, due: '2026-06-01', paid: true, paymentMethod: 'Check' },
      { id: 'clx-c2f2', label: 'Balance', amount: 4500, due: '2026-09-01', paid: false, paymentMethod: '' },
    ],
    style: 'Product launch + press event, September. Sleek, demo-forward.',
    notes: 'Signed for a September launch. Demo readiness is the watch item.',
    log: [
      { id: 'clx-c2a', date: '2026-05-25', text: 'Signed SOW for the launch. Retainer paid via check.' },
      { id: 'clx-c2b', date: '2026-06-03', text: 'Kickoff. Flagged keynote/demo timeline risk to their PMM.' },
    ],
    eventIds: ['ev-x-product-launch'],
  },
  // ── COMPLETE ──────────────────────────────────────────────
  {
    id: 'cl-x-comp1', name: 'The Harris Family (25th Anniversary)', email: 'harris.fam@email.com', phone: '(615) 555-7007',
    referral: 'Friend / Family', status: 'Complete', plannerFee: 3200,
    feeSchedule: [
      { id: 'clx-cp1f1', label: 'Retainer', amount: 1600, due: '2026-02-01', paid: true, paymentMethod: 'Zelle' },
      { id: 'clx-cp1f2', label: 'Final', amount: 1600, due: '2026-04-20', paid: true, paymentMethod: 'Zelle' },
    ],
    style: 'Surprise 25th anniversary dinner. Delivered April 2026.',
    notes: 'Event delivered + paid in full. Thank-you sent. Strong referral source — sent us the OConnors.',
    log: [
      { id: 'clx-cp1a', date: '2026-04-18', text: 'Anniversary dinner executed flawlessly. Client thrilled.' },
      { id: 'clx-cp1b', date: '2026-04-25', text: 'Final payment received. Thank-you note + photo gallery delivered.' },
    ],
    eventIds: [],
  },
  {
    id: 'cl-x-comp2', name: 'Cedar Foundation (Spring Gala)', email: 'dev@cedarfoundation.org', phone: '(615) 555-7008',
    referral: 'Vendor Referral', status: 'Complete', plannerFee: 12000,
    feeSchedule: [
      { id: 'clx-cp2f1', label: 'Retainer', amount: 6000, due: '2025-11-01', paid: true, paymentMethod: 'Check' },
      { id: 'clx-cp2f2', label: 'Final', amount: 6000, due: '2026-03-15', paid: true, paymentMethod: 'Check' },
    ],
    style: 'Annual fundraising gala, 300 guests. Delivered March 2026.',
    notes: 'Gala raised a record total. Paid in full. Verbal commitment to rebook for next year + a written testimonial.',
    log: [
      { id: 'clx-cp2a', date: '2026-03-08', text: 'Gala delivered. Auction + paddle raise exceeded goal by 18%.' },
      { id: 'clx-cp2b', date: '2026-03-20', text: 'Final invoice paid. Testimonial received; rebook conversation for next year started.' },
    ],
    eventIds: [],
  },
];

export const SAMPLE_CLIENT_IDS_EXTRA = SAMPLE_CLIENTS_EXTRA.map(c => c.id);
