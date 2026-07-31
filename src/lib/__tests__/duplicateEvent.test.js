// ─── A DUPLICATE MUST NOT LIE ABOUT WHAT HAPPENED ────────────────────────────
//
// duplicateEvent copies the PLAN and resets the STATE. The failure this gate
// exists to prevent is a copy that arrives already "knowing" things it cannot:
// last year's RSVPs shown as this year's replies, last year's paid deposits shown
// as paid, last year's checklist shown as done. That is manufactured knowledge,
// and it is the exact thing the honesty doctrine forbids everywhere else.
//
// The reset list is an ALLOW-LIST ON STATE, so a NEW state field added to the
// event model carries forward silently unless someone adds it here. These tests
// name the specific fields that matter today; the trade-off is documented at the
// top of duplicateEvent.js and is deliberate.
const { duplicateEvent, isDuplicate } = require('../duplicateEvent');

const source = {
  id: 'ev-2025-reunion',
  name: 'Family Reunion',
  type: 'Reunion',
  date: '2025-08-09',
  createdAt: '2025-01-02T00:00:00.000Z',
  venue: { name: 'Fort Smallwood Park', city: 'Pasadena' },
  guestEstimate: 40,
  totalBudget: 3000,
  isDestination: true,
  rainPlan: 'Pavilion is covered',
  picks: { 'food-model': 'Potluck (assigned by household)' },
  startTime: '15:00', startTimeSource: 'derived', startTimeWhy: 'Most reunions are afternoon',
  rosDone: { 'r1': true }, rosEdited: true,
  lodging: { hotelName: 'Somewhere Inn' },
  lodgingOptions: [{ id: 'lo1' }],
  photos: ['a.jpg'],
  guests: [
    { id: 'g1', name: 'Denise & Ray', contact: 'denise@x.com', diet: 'no shellfish', rsvp: 'Yes', seat: 'T1' },
    { id: 'g2', name: 'Marcus', rsvp: 'Maybe' },
  ],
  vendors: [
    { id: 'v1', name: 'Fired Up BBQ', category: 'Catering', cost: 4200, contact: 'Reggie',
      depositPaid: true, balancePaid: true, contractSigned: true, coiStatus: 'received',
      coiVerified: true, arrivalTime: '4:00 PM' },
  ],
  timeline: [{ id: 't1', task: 'Book the pavilion', leadDays: -60, done: true }],
  ros: [{ id: 'r1', segment: 'Doors', time: '15:00', done: true }],
  budget: [{ id: 'b1', label: 'Food', budgeted: 900, spent: 870, bought: true }],
};

const dup = () => duplicateEvent(source, { id: 'ev-2026-reunion', now: '2026-07-30T00:00:00.000Z' });

describe('the plan carries — that is why the host duplicated it', () => {
  const d = dup();
  it('keeps the identity of the event', () => {
    expect(d.name).toBe('Family Reunion');
    expect(d.type).toBe('Reunion');
    expect(d.venue).toEqual({ name: 'Fort Smallwood Park', city: 'Pasadena' });
    expect(d.isDestination).toBe(true);
    expect(d.rainPlan).toBe('Pavilion is covered');
    expect(d.totalBudget).toBe(3000);
  });

  it('keeps the guest LIST — names, contacts and dietary notes were real work', () => {
    expect(d.guests.map(g => g.name)).toEqual(['Denise & Ray', 'Marcus']);
    expect(d.guests[0].contact).toBe('denise@x.com');
    expect(d.guests[0].diet).toBe('no shellfish');
  });

  it('keeps who you hired and what they cost', () => {
    expect(d.vendors[0].name).toBe('Fired Up BBQ');
    expect(d.vendors[0].category).toBe('Catering');
    expect(d.vendors[0].cost).toBe(4200);
    expect(d.vendors[0].contact).toBe('Reggie');
  });

  it('keeps SETTLED DECISIONS — re-answering them yearly is the friction this removes', () => {
    expect(d.picks).toEqual({ 'food-model': 'Potluck (assigned by household)' });
  });

  it('keeps the checklist and the run of show as structure', () => {
    expect(d.timeline.map(t => t.task)).toEqual(['Book the pavilion']);
    expect(d.ros.map(r => r.segment)).toEqual(['Doors']);
    expect(d.budget.map(b => b.label)).toEqual(['Food']);
  });
});

describe('the state resets — a copy must not claim last year happened again', () => {
  const d = dup();
  it('has no date, so every date-relative engine says "not yet" instead of computing on last year', () => {
    expect(d.date).toBe('');
  });
  it('drops the derived start time with the date that justified it', () => {
    expect(d.startTime).toBeUndefined();
    expect(d.startTimeSource).toBeUndefined();
    expect(d.startTimeWhy).toBeUndefined();
  });
  it('resets every RSVP — nobody has been asked yet', () => {
    expect(d.guests.some(g => 'rsvp' in g)).toBe(false);
    expect(d.guests.some(g => 'seat' in g)).toBe(false);
  });
  it('resets vendor money and paperwork — showing a deposit as paid could cost the booking', () => {
    const v = d.vendors[0];
    for (const k of ['depositPaid', 'balancePaid', 'contractSigned', 'coiStatus', 'coiVerified', 'arrivalTime']) {
      expect(v[k]).toBeUndefined();
    }
  });
  it('un-ticks the checklist and the run of show', () => {
    expect(d.timeline[0].done).toBe(false);
    expect(d.ros[0].done).toBeUndefined();
    expect(d.rosDone).toBeUndefined();
    expect(d.rosEdited).toBeUndefined();
  });
  it('drops per-line spend but keeps the budgeted amount', () => {
    expect(d.budget[0].budgeted).toBe(900);
    expect(d.budget[0].spent).toBeUndefined();
    expect(d.budget[0].bought).toBeUndefined();
  });
  it('drops date-specific lodging and last year’s photos', () => {
    expect(d.lodging).toBeUndefined();
    expect(d.lodgingOptions).toBeUndefined();
    expect(d.photos).toBeUndefined();
  });
  it('does not mutate the source', () => {
    expect(source.guests[0].rsvp).toBe('Yes');
    expect(source.vendors[0].depositPaid).toBe(true);
    expect(source.timeline[0].done).toBe(true);
  });
});

describe('identity and provenance', () => {
  it('takes the caller’s id and stamps its own createdAt', () => {
    const d = dup();
    expect(d.id).toBe('ev-2026-reunion');
    expect(d.createdAt).toBe('2026-07-30T00:00:00.000Z');
  });
  it('records where it came from, so a surface can say so rather than guess', () => {
    const d = dup();
    expect(d.duplicatedFrom).toBe('ev-2025-reunion');
    expect(isDuplicate(d)).toBe(true);
    expect(isDuplicate(source)).toBe(false);
  });
  it('refuses to invent an id — the caller owns id generation', () => {
    expect(() => duplicateEvent(source, {})).toThrow(/id is required/);
  });
  it('survives a junk source without throwing', () => {
    const d = duplicateEvent(null, { id: 'x', now: 'n' });
    expect(d.id).toBe('x');
    expect(d.date).toBe('');
  });
});
