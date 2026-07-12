// DESTINATION-5 — the multi-day pacing template. Same doctrine as the rest of
// the destination modifier (DESTINATION-1/4): gated ONLY on event.isDestination
// (never event type), purely additive authored content, and honest about what
// the guest data actually carries — kids are COUNTS (roster g.kids /
// event.kidsCount), never ages, so the kids lines must stay age-generic.
import { playbookPacing } from '../index';

const future = (() => { const d = new Date('2026-01-01T00:00:00'); d.setDate(d.getDate() + 300); return d.toISOString().slice(0, 10); })();
const ev = (extra) => ({ id: 'e', type: 'Birthday', date: future, guestCount: 30, ...extra });

const allCopy = (plan) => plan.days.map((d) => `${d.label} ${d.focus} ${d.guidance}`).join(' | ');

describe('playbookPacing is gated on isDestination only', () => {
  test('no isDestination flag → null (the template never leaks into a regular event)', () => {
    expect(playbookPacing(ev())).toBeNull();
    expect(playbookPacing(ev({ isDestination: false }))).toBeNull();
    expect(playbookPacing(null)).toBeNull();
  });

  test('isDestination: true → the 3-day rhythm, in arrival → main → departure order', () => {
    const plan = playbookPacing(ev({ isDestination: true }));
    expect(plan).toBeTruthy();
    expect(plan.count).toBe(3);
    expect(plan.days.map((d) => d.id)).toEqual(['dest_p_arrival', 'dest_p_main', 'dest_p_depart']);
    expect(plan.days.map((d) => d.label)).toEqual(['Arrival day', 'Main event day', 'Departure day']);
    for (const d of plan.days) {
      expect(d.focus).toBeTruthy();
      expect(d.guidance.length).toBeGreaterThan(20);
    }
    expect(plan.because).toMatch(/rested/);
  });

  test('works on any base type — the modifier is type-independent, not hardcoded', () => {
    const a = playbookPacing({ id: 'e', type: 'Anniversary', date: future, guestCount: 20, isDestination: true });
    const r = playbookPacing({ id: 'e', type: 'Reunion', date: future, guestCount: 40, isDestination: true });
    expect(a.days.map((d) => d.id)).toEqual(r.days.map((d) => d.id));
  });

  test('the day rhythm reads arrival-easy / main-day-slow-morning / departure-optional', () => {
    const plan = playbookPacing(ev({ isDestination: true }));
    expect(plan.days[0].guidance).toMatch(/keep the first night loose/i);
    expect(plan.days[1].guidance).toMatch(/keep the morning slow/i);
    expect(plan.days[2].guidance).toMatch(/make the last morning optional/i);
  });
});

describe('kids lines join their day only when kids are actually coming (eventHasKids)', () => {
  test('no kids signal → no kids copy anywhere (never inferred from event type)', () => {
    const plan = playbookPacing(ev({ isDestination: true }));
    expect(allCopy(plan)).not.toMatch(/kids/i);
  });

  test('kidsCount > 0 (headcount mode) → arrival + main days carry the kids pacing lines', () => {
    const plan = playbookPacing(ev({ isDestination: true, kidsCount: 3 }));
    expect(plan.days[0].guidance).toMatch(/kids come off a travel day/);
    expect(plan.days[1].guidance).toMatch(/downtime/);
  });

  test('roster kids ("Children in Party") trigger it too — same sources as the food plan', () => {
    const plan = playbookPacing(ev({ isDestination: true, guestCount: undefined, guests: [{ name: 'A', rsvp: 'yes', kids: 2 }] }));
    expect(plan.days[0].guidance).toMatch(/kids come off a travel day/);
  });

  test('a declined row\'s kids never count — no kids line', () => {
    const plan = playbookPacing(ev({ isDestination: true, guestCount: undefined, guests: [{ name: 'A', rsvp: 'no', kids: 2 }] }));
    expect(allCopy(plan)).not.toMatch(/kids/i);
  });
});

describe('the health rest-block line fires ONLY on an answered Yes (same gate as dest_t_health)', () => {
  const mainDay = (extra) => playbookPacing(ev({ isDestination: true, ...extra })).days[1].guidance;

  test('unanswered / Not sure / No → no health copy (an unanswered question never claims a health need)', () => {
    expect(mainDay({})).not.toMatch(/heart or lung/);
    expect(mainDay({ foodChoices: { dest_health: 'Not sure' } })).not.toMatch(/heart or lung/);
    expect(mainDay({ foodChoices: { dest_health: 'No' } })).not.toMatch(/heart or lung/);
  });

  test('answered Yes → the main event day carries the rest-block line', () => {
    const g = mainDay({ foodChoices: { dest_health: 'Yes' } });
    expect(g).toMatch(/heart or lung conditions/);
    expect(g).toMatch(/rest block/);
  });
});

describe('data honesty — the copy never claims data the model does not carry', () => {
  test('kids copy stays age-generic: the model has kid COUNTS only, so no age brackets are ever named', () => {
    const plan = playbookPacing(ev({ isDestination: true, kidsCount: 4, foodChoices: { dest_health: 'Yes' } }));
    expect(allCopy(plan)).not.toMatch(/toddler|teen|school[- ]age|little kids|\bages?\b\s*\d|year[- ]old/i);
  });

  test('plain host language — no hospitality jargon in any day\'s copy', () => {
    const plan = playbookPacing(ev({ isDestination: true, kidsCount: 4, foodChoices: { dest_health: 'Yes' } }));
    expect(allCopy(plan)).not.toMatch(/attrition|contracted|courtesy block|itinerary|turndown|F&B/i);
  });
});
