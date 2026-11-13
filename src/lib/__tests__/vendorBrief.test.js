// Vendor Brief privacy whitelist — the payload is base64-encoded into a
// shareable URL/QR, so every field must be explicitly vendor-safe. These tests
// pin the audit: host-private bookkeeping (vendor.notes) and all money/ops
// fields can never reach a vendor-facing brief.

import { buildVendorBriefPayload, vendorRosSlice, briefShowsHeadcount, briefFeedsGuests, briefGuestCount, briefDietCounts, briefDietLine } from '../vendorBrief';
import { getVendorCategoryKey } from '../vendorQuestions';

// A vendor record deliberately loaded with every private field the seed data
// and vendor model carry — the payload must include NONE of them.
const privateVendor = {
  id: 'v1',
  name: 'Capital Rotisserie Catering — Silver Spring, MD',
  contactName: 'Dana Whitfield',
  category: 'Catering',
  arrivalTime: '14:30',
  briefNote: 'Load in through the side gate; tables ready by 2pm.',
  // ── host-private from here down ──
  notes: 'PRIVATE: deposit $800 paid 6/1; balance due 7/3; they miscounted last time — double-check headcount',
  cost: 2400,
  depositAmt: 800,
  depositPaid: true,
  balancePaid: false,
  payDueDate: '2026-07-03',
  backup: 'Fork & Flower as fallback if they cancel',
  contractSigned: false,
  contractUrl: 'https://private.example/contract.pdf',
  coiStatus: 'required',
  eventsCompleted: 12,
  onTimeRate: 71,
  incidentCount: 2,
  plannerRehireCount: 1,
  log: [{ date: '2026-06-01', text: 'Negotiated price down from $2,800' }],
};

const event = { id: 'e1', name: 'Retirement Cookout', date: '2026-07-10', venue: 'Fort Ward Park — Alexandria, VA', totalBudget: 5000 };
const profile = { name: 'Todd', phone: '555-0100', email: 't@example.com', businessName: 'NGW Events' };
const ros = [
  { id: 'r1', time: '14:30', segment: 'Caterer load-in', location: 'Side gate', notes: 'Ask for Dana', vendorName: 'Capital Rotisserie Catering — Silver Spring, MD' },
  { id: 'r2', time: '17:00', segment: 'Dinner service', vendorName: 'Capital Rotisserie Catering — Silver Spring, MD' },
  { id: 'r3', time: '18:00', segment: 'Cake cutting', vendorName: 'Someone Else' },
];

const FORBIDDEN_KEYS = ['notes', 'cost', 'depositAmt', 'depositPaid', 'balancePaid', 'payDueDate', 'backup',
  'contractSigned', 'contractUrl', 'coiStatus', 'eventsCompleted', 'onTimeRate', 'incidentCount',
  'plannerRehireCount', 'log', 'totalBudget'];

describe('buildVendorBriefPayload — privacy whitelist', () => {
  const payload = buildVendorBriefPayload(privateVendor, event, ros, profile);

  test('vendor.notes (host-private bookkeeping) does NOT appear anywhere in the payload', () => {
    expect(payload.notes).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain('PRIVATE: deposit');
    expect(JSON.stringify(payload)).not.toContain('miscounted');
  });

  test('no payment/contract/scoring/backup field appears — whitelist by construction', () => {
    FORBIDDEN_KEYS.forEach(k => expect(payload[k]).toBeUndefined());
    const s = JSON.stringify(payload);
    expect(s).not.toContain('2400');
    expect(s).not.toContain('800');
    expect(s).not.toContain('Fork & Flower');
    expect(s).not.toContain('Negotiated price');
    expect(s).not.toContain('contract.pdf');
  });

  test('vendor.briefNote (vendor-facing copy) DOES appear', () => {
    expect(payload.briefNote).toBe('Load in through the side gate; tables ready by 2pm.');
  });

  test('vendor identity / category / arrival still appear', () => {
    expect(payload.vendorName).toBe(privateVendor.name);
    expect(payload.contactName).toBe('Dana Whitfield');
    expect(payload.category).toBe('Catering');
    expect(payload.arrivalTime).toBe('14:30');
  });

  test('event basics + planner contact/branding still appear', () => {
    expect(payload.eventName).toBe('Retirement Cookout');
    expect(payload.venue).toBe('Fort Ward Park — Alexandria, VA');
    expect(payload.plannerBusiness).toBe('NGW Events');
  });

  test("run-of-show slice: only this vendor's cues, sorted, with cue-level fields only", () => {
    expect(payload.ros).toHaveLength(2);
    // `rel` joined the cue-level whitelist on 2026-07-14, deliberately. The run of show used
    // to MANUFACTURE a clock time when the host had given only "afternoon" (or nothing at all
    // — a bare 15:00), and this payload shipped those invented hours to a real caterer as
    // their load-in time. Times are now null unless the host set a real start time, and `rel`
    // carries what we actually know ("4h before guests arrive") so the brief stays useful
    // without lying. A vendor can plan against "4h before guests arrive". A vendor cannot
    // plan against a made-up 11:00 — they just show up at the wrong hour.
    // It is schedule information, not PII; the FORBIDDEN_KEYS guard above is unchanged.
    expect(payload.ros[0]).toEqual({ time: '14:30', rel: null, segment: 'Caterer load-in', location: 'Side gate', notes: 'Ask for Dana' });
    expect(payload.ros.map(r => r.segment)).not.toContain('Cake cutting'); // other vendors' cues excluded
    expect(payload.ros[0].id).toBeUndefined();
  });

  test('missing briefNote -> empty string, never falls back to vendor.notes', () => {
    const p = buildVendorBriefPayload({ ...privateVendor, briefNote: undefined }, event, ros, profile);
    expect(p.briefNote).toBe('');
    expect(JSON.stringify(p)).not.toContain('PRIVATE');
  });

  test('null inputs never throw (legacy/base64 path resilience)', () => {
    expect(() => buildVendorBriefPayload(null, null, null, null)).not.toThrow();
    expect(buildVendorBriefPayload(null, null, null, null).ros).toEqual([]);
  });
});

describe('vendorRosSlice', () => {
  test('matches by vendorName OR owner and sorts by time', () => {
    const slice = vendorRosSlice(
      [{ time: '18:00', segment: 'B', owner: 'X' }, { time: '09:00', segment: 'A', vendorName: 'X' }],
      { name: 'X' }
    );
    expect(slice.map(r => r.segment)).toEqual(['A', 'B']);
  });
});

// ── Board 2026-11-12, follow-up 1: the host's name, the headcount, and who the
// vendor calls on the day. Every addition is a NUMBER or a host-authored field.
describe('host name, headcount and day-of contact (board 2026-11-12)', () => {
  const ev = {
    ...event, hostName: 'Vida Reyes', guestEstimate: 40, guestCountSource: 'host',
    guests: [{ name: 'Ann Lee', dietary: 'Vegetarian' }, { name: 'Bo Park', dietary: 'Nut allergy' }],
    dietCounts: { Vegetarian: 3, 'Nut allergy': 1, Vegan: 0, "Grandma Lee's no-salt": 1 },
    briefContactName: 'Sam Ortiz', briefContactPhone: '(555) 010-2000',
  };
  const p = buildVendorBriefPayload(privateVendor, ev, ros, profile);

  test('the host name and the day-of contact ride along', () => {
    expect(p.hostName).toBe('Vida Reyes');
    expect(p.briefContactName).toBe('Sam Ortiz');
    expect(p.briefContactPhone).toBe('(555) 010-2000');
    expect(buildVendorBriefPayload(privateVendor, { hostNames: 'Vida & Jo' }, [], {}).hostName).toBe('Vida & Jo');
  });

  test('the headcount is a number and no guest name ever leaves', () => {
    expect(p.guestCount).toBe(40);
    expect(p.dietCounts).toEqual({ Vegetarian: 3, 'Nut allergy': 1 });
    const s = JSON.stringify(p);
    expect(s).not.toContain('Ann Lee');
    expect(s).not.toContain('Bo Park');
    expect(s).not.toContain('Grandma');   // a free-text diet key could name a person
    expect(p.guests).toBeUndefined();
  });

  test('a headcount the APP made up is withheld (guestCountFor outward gate)', () => {
    expect(briefGuestCount({ guestEstimate: 40, guestCountSource: 'playbook-typical' })).toBeNull();
    expect(briefGuestCount({ guestCount: 52, guestEstimate: 40, guestCountSource: 'playbook-typical' })).toBe(52);
    expect(briefGuestCount({})).toBeNull();
  });

  test('diet counts read as one line, in the vocabulary order', () => {
    expect(briefDietLine(briefDietCounts(ev))).toBe('3 vegetarian · 1 nut allergy');
    expect(briefDietLine({ Shellfish: 2, Halal: 1 })).toBe('2 shellfish allergy · 1 Halal');
    expect(briefDietLine(null)).toBe('');
  });

  // Every label in App.js CATEGORY_GROUPS, plus free-text spellings hosts type.
  const LABELS = ['Catering', 'Bar / Beverage', 'Mobile Bar', 'Grazing Table', 'Cake', 'Coffee / Specialty Cart', 'Food Truck',
    'Venue', 'Tent / Structures', 'Rentals', 'Restroom Trailers', 'Generator / Power',
    'Photography', 'Videography', 'Photo Booth', '360 Booth', 'Content Creator',
    'Florals', 'Decor', 'Balloon Décor', 'Lighting', 'Draping', 'Dance Floor / Staging', 'Calligraphy / Stationery', 'Live Painter',
    'DJ', 'Band / Live Music', 'Entertainment', 'MC / Host', 'Choreographer', 'Speakers / Talent', 'Brand Activation', 'Send-off / Sparklers', 'Animals / Petting Zoo', 'Activities',
    'AV / Tech', 'Live Streaming / Hybrid', 'Registration / Badging', 'Event App',
    'Coordinator', 'Officiant', 'Hair & Makeup', 'Facilitator / Trainer', 'Staffing', 'Security', 'Valet / Parking', 'Childcare',
    'Auctioneer', 'Fundraising Platform', 'Sponsor / Exhibitor', 'Awards / Engraving',
    'Transport', 'Lodging / Concierge', 'Invitations', 'Printing / Signage', 'Favors', 'Misc', 'Other',
    'caterer', 'Bartending', 'bartender', 'Bakery', 'Desserts', 'food trucks', 'Linens', 'Furniture rental'];
  const FOOD_KEYS = new Set(['caterer', 'bar', 'cake', 'foodtruck', 'cart']);

  test('who is shown the headcount agrees with the app’s own category map', () => {
    const disagree = LABELS.filter((label) => {
      const key = getVendorCategoryKey({ category: label });
      // Grazing Table has no CATEGORY_MAP entry (a known gap there), and it is food.
      const expectFood = FOOD_KEYS.has(key) || label === 'Grazing Table';
      const expectCount = expectFood || key === 'rentals';
      return briefFeedsGuests(label) !== expectFood || briefShowsHeadcount(label) !== expectCount;
    });
    expect(disagree).toEqual([]);
    expect(briefShowsHeadcount('Catering')).toBe(true);
    expect(briefShowsHeadcount('DJ')).toBe(false);
    expect(briefShowsHeadcount('Rentals')).toBe(true);
    expect(briefFeedsGuests('Rentals')).toBe(false);
  });
});
