// The ask must not ignore or contradict the event's own facts (audit 2 lane A
// P1-4; lane B #32):
//  · a full-service venue (in-house catering) is the caterer — no "Book your caterer";
//  · a dinner at a restaurant (Harbor Grill, an ale house, a hotel, "a restaurant
//    downtown") is not offered "We'll cook it";
//  · a Fish Fry at the church lot does not propose "Backyard / driveway";
//  · Sandy Point State Park is a park, not a town;
//  · Reunion's permit question names the count she gave, not the planning top.
import { buildVendorPlan, chosenCatererUnbooked } from '../vendorPlan';
import { normalizeCategory } from '../vendorAccountability/playbooks';
import { foodDecisionND } from '../decisionND';
import { placeKindOfName } from '../knownFacts';
import { choicePickFor, decisionSettledByData, getPlaybook } from '../playbooks';
import { venueFor } from '../venueFor';
import { parseVenueLocation } from '../cityText';
import { parseSmartEventText, unusedClauses } from '../smartParseEvent';
import { placeQuestionsFor as derivePlaceQuestions } from '../placeQuestions';

const base = (type, extra = {}) => ({ id: 'ev-' + type.replace(/\W+/g, ''), type, date: '2027-03-20', guestMode: 'count', guestCount: 30, vendors: [], guests: [], budget: [], ...extra });

describe('a full-service venue is the caterer', () => {
  const wed = base('Wedding', { guestCount: 150, totalBudget: 40000, foodChoices: { venue: 'Full-service venue (in-house catering)' } });
  test('no caterer row to book', () => {
    const cats = (buildVendorPlan(wed).categories || []).map((c) => normalizeCategory(String(c.category || '')));
    expect(cats).not.toContain('catering');
    expect(chosenCatererUnbooked(wed)).toBeNull();
  });
  test('a blank-canvas venue still needs its caterer', () => {
    const raw = { ...wed, foodChoices: { venue: 'Raw / blank-canvas venue (bring everything)' } };
    expect((buildVendorPlan(raw).categories || []).map((c) => normalizeCategory(String(c.category || '')))).toContain('catering');
  });
});

describe('a dinner at a restaurant is not offered "We’ll cook it"', () => {
  test('the kind reader knows an ale house', () => {
    expect(placeKindOfName('Pratt Street Ale House')).toBe('restaurant');
    expect(placeKindOfName('Harbor Grill')).toBe('restaurant');
  });
  for (const [type, venue] of [['Client Dinner', 'Harbor Grill, Annapolis, MD'], ['Bachelor Party', 'Pratt Street Ale House, Baltimore, MD'], ['Bachelorette Party', 'The Graduate Hotel, Annapolis, MD'], ['Birthday', 'A restaurant downtown']]) {
    test(`${type} at ${venue}`, () => {
      const nd = foodDecisionND(base(type, { venue }), 30, [], null);
      expect(nd.options.map((o) => o.value)).not.toContain('host cooks');
      expect(nd.options.length).toBeGreaterThan(0);
    });
  }
  test('at home she is still offered it', () => {
    const nd = foodDecisionND(base('Client Dinner', { venue: 'Our place', venueKind: 'home', venueCity: 'Annapolis' }), 12, [], null);
    expect(nd.options.map((o) => o.value)).toContain('host cooks');
  });
  test('"at a restaurant downtown" said at creation is kept as the place', () => {
    const text = "Mother's Day brunch for 12 at a restaurant downtown";
    const p = parseSmartEventText(text);
    expect(p.venue).toBe('A restaurant downtown');
    expect(placeKindOfName(p.venue)).toBe('restaurant');
    expect(unusedClauses(text).join(' · ')).not.toMatch(/restaurant/);
  });
});

describe('a Fish Fry at the church lot is not proposed the backyard', () => {
  const ff = base('Fish Fry', { venue: 'Church lot, Annapolis, MD', foodChoices: { framing: 'Home gathering' } });
  test('the venue answers where the fryer goes', () => {
    const d = getPlaybook('Fish Fry').decisions.find((x) => x.id === 'cooklocation');
    expect((decisionSettledByData(ff, d) || {}).pick).toBe('Church lot / pavilion');
    expect(choicePickFor(ff, 'cooklocation')).toBe('Church lot / pavilion');
  });
  test('at home the backyard still reads as hers', () => {
    expect(choicePickFor(base('Fish Fry', { venue: 'Our backyard', venueKind: 'home', venueCity: 'Annapolis' }), 'cooklocation')).toBe('Backyard / driveway');
  });
});

describe('a state park is a park, not a town', () => {
  test('parseVenueLocation does not read it as a city', () => {
    expect(parseVenueLocation('Sandy Point State Park, MD')).toBeNull();
    expect(parseVenueLocation('College Park, MD')).toEqual({ city: 'College Park', state: 'MD' });
  });
  test('venueFor keeps it as the venue name', () => {
    const v = venueFor({ venue: 'Sandy Point State Park, MD', venueKind: 'venue' });
    expect(v.city).toBe('');
    expect(v.name).toMatch(/Sandy Point State Park/);
  });
});

describe('the permit question names her count', () => {
  test('Reunion at 50 guests outdoors says 50', () => {
    const ev = base('Reunion', { guestCount: 50, venue: 'Quiet Waters Park, Annapolis, MD', indoorOutdoor: 'outdoor' });
    const q = (derivePlaceQuestions(ev) || []).find((x) => x.id === 'outdoor-permit');
    expect(q).toBeTruthy();
    expect(q.because).toMatch(/outdoor event for 50\b/);
  });
});
