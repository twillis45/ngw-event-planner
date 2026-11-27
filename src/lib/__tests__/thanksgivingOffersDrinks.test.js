// THANKSGIVING OFFERS ALCOHOL, AND ASKS HOW (owner, 11/26/2026: "Thanksgiving
// should definitely offer alcohol"). The menu already listed red wine, white
// wine and sparkling cider, but Thanksgiving was the one holiday meal with no
// drinks question, so a host could not say "guests bring the wine" or "no
// alcohol", and the plan could not follow her. Now it asks, with wine as the
// default, through the same drinks rule every other type uses (drinksCall).
import { getPlaybook, playbookFoodPlan, servesAlcohol, playbookDayOfChecklist } from '../playbooks';

const TG = (pick) => ({
  id: 'tg', type: 'Thanksgiving', date: '2026-11-26', guestEstimate: 14, venueKind: 'home', guests: [], vendors: [], timeline: [],
  ...(pick ? { foodChoices: { drinks: pick }, choiceSource: { drinks: 'host' } } : {}),
});
const names = (ev) => ((playbookFoodPlan(ev) || {}).list || []).map((l) => l.name || l.item || l.label || '');
const has = (ev, re) => names(ev).some((n) => re.test(n));
const rides = (ev) => ((playbookDayOfChecklist(ev) || {}).items || []).some((i) => (i.key || i.id) === 'rides');

const call = () => (getPlaybook('Thanksgiving').decisions || []).filter((d) => d && d.drinksCall === true);

test('Thanksgiving has one drinks question, wine by default', () => {
  expect(call()).toHaveLength(1);
  const d = call()[0];
  expect(d.options.length).toBeGreaterThanOrEqual(3);
  expect(d.default).toMatch(/wine/i);
});

test('by default the table has wine and cider, and the sober-ride check is on the day’s list', () => {
  expect(has(TG(), /Red wine/)).toBe(true);
  expect(has(TG(), /White wine/)).toBe(true);
  expect(has(TG(), /Sparkling cider/)).toBe(true);
  expect(servesAlcohol(TG())).toBe(true);
  expect(rides(TG())).toBe(true);
});

test('guests bring the wine: the host buys none, keeps the cider, and the ride check stays', () => {
  const ev = TG(call()[0].options.find((o) => /guests bring/i.test(o)));
  expect(has(ev, /Red wine|White wine/)).toBe(false);
  expect(has(ev, /Sparkling cider/)).toBe(true);
  expect(servesAlcohol(ev)).toBe(true);
  expect(rides(ev)).toBe(true);
});

test('no alcohol: no wine, the cider stays, and no ride check', () => {
  const ev = TG(call()[0].options.find((o) => /no alcohol/i.test(o)));
  expect(has(ev, /Red wine|White wine/)).toBe(false);
  expect(has(ev, /Sparkling cider/)).toBe(true);
  expect(servesAlcohol(ev)).toBe(false);
  expect(rides(ev)).toBe(false);
});
