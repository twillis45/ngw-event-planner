// Curated host-playbook demo event (Sprint 55D / Part 1).
//
// A ready-made, well-scaffolded Dinner Party so the playbook engine's effects
// are visible immediately without the user creating an event:
//   • Client Intake → Budget Overview shows engine-derived "Typical setup" rows
//     (food / drinks / flowers / linens / supplies / cleanup — no venue line).
//   • The next-step surfaces a sized operational buy once it enters the shopping
//     window (the host injects it with a near-term date — see App.js injectExtra).
//
// Scaffolded so readiness reads ON_TRACK (done timeline, a confirmed+contracted
// vendor, a signed contract doc) — otherwise the soft "needs follow-up" tier
// pre-empts the operational candidate on the Home Spine.
//
// `date` is intentionally omitted here and stamped relative to "today" at
// injection time so the demo stays inside its shopping window whenever first
// seen. Its id is registered in SEED_EVENT_IDS so it behaves as sample data
// (filtered for signed-in users, auto-purged on the first real event).

export const SAMPLE_HOST_DINNER_DEMO_ID = 'ev-demo-dinner-party';

export const SAMPLE_HOST_DINNER_DEMO = {
  id: SAMPLE_HOST_DINNER_DEMO_ID,
  rsvpCode: 'dinnr8',
  name: 'Friendsgiving Dinner (sample)',
  type: 'Dinner Party',
  // date stamped at injection (today + a few days) — see App.js injectExtra.
  venue: "The Hosts' Home",
  guestEstimate: '12',
  guestCount: 12,
  secondaryType: '',
  catererCount: 12,
  budget: [
    { id: 'ev-demo-dinner-party-b1', category: 'Food & groceries', budgeted: 180, actual: 0, notes: 'Host-cooked 3 courses for 12.' },
    { id: 'ev-demo-dinner-party-b2', category: 'Drinks & bar', budgeted: 200, actual: 0, notes: 'Wine + a signature cocktail + zero-proof.' },
    { id: 'ev-demo-dinner-party-b3', category: 'Flowers & decor', budgeted: 70, actual: 0, notes: 'Centerpiece + candles.' },
  ],
  guests: Array.from({ length: 12 }, (_, i) => ({
    id: `ev-demo-dinner-party-g${i + 1}`,
    name: `Guest ${i + 1}`,
    group: 'Friends',
    rsvp: i < 11 ? 'Yes' : 'Maybe',
    meal: i % 4 === 0 ? 'Vegetarian' : 'Standard',
    table: 1,
    plusOne: '',
    plusOneMeal: '—',
    kids: 0,
    needs: i === 3 ? 'Nut allergy' : '',
    email: `guest${i + 1}@example.com`,
    phone: '',
    address: '',
    giftReceived: false,
    thankYouSent: false,
    partyNotes: '',
  })),
  vendors: [
    {
      id: 'ev-demo-dinner-party-v1',
      name: 'Bloom & Stem Florals',
      category: 'Florals',
      budgetCategory: 'Flowers & decor',
      status: 'Confirmed',
      contractSigned: true,
      coiStatus: 'received',
      coiVerified: true,
      coiExpiryDate: '2026-12-31',
      cost: 70,
      depositAmt: 35,
      depositPaid: true,
      balancePaid: true,
      arrivalTime: '15:00',
      contact: 'hello@bloomstem.example',
      phone: '',
      contractSignedDate: '2026-05-20',
      notes: 'Centerpiece + 6 taper candles. Drop-off 3h before.',
      log: [{ id: 'ev-demo-dinner-party-vl1', date: '2026-05-20', text: 'Booked centerpiece; deposit paid; COI on file.' }],
    },
  ],
  timeline: [
    { id: 'ev-demo-dinner-party-t1', task: 'Set date + guest count + budget', week: '1 Month Out', done: true, owner: 'host' },
    { id: 'ev-demo-dinner-party-t2', task: 'Send invites + collect dietary/allergy', week: '2 Weeks Out', done: true, owner: 'host' },
    { id: 'ev-demo-dinner-party-t3', task: 'Lock the menu (with a veg main)', week: '2 Weeks Out', done: true, owner: 'host' },
    { id: 'ev-demo-dinner-party-t4', task: 'Confirm serveware / glassware / seating', week: 'Week Of', done: true, owner: 'host' },
    { id: 'ev-demo-dinner-party-t5', task: 'Confirm final headcount', week: 'Week Of', done: true, owner: 'host' },
  ],
  documents: [
    { id: 'ev-demo-dinner-party-d1', kind: 'contract', status: 'signed', name: 'Bloom & Stem Florals — agreement' },
  ],
};
