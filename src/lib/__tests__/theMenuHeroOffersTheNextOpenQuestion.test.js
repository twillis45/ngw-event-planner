// ─── THE MENU HERO OFFERS THE NEXT OPEN QUESTION (owner's iPad, 11/21/2026) ──
//
// A Thanksgiving Hosting plan for 12, six days out, "Host cooks the whole meal"
// picked. The food item read "What you're serving · 2 open" and its panel was
// the hosting-model decision, settled — not either open question. The count
// came from openFoodChoices; the panel came from foodApproach alone.
//
// One list now feeds both: the food item carries the records its count names,
// and foodDecisionND offers the first open one of those. The e2e twin is
// hostv2/e2e/theMenuHeroRollsToTheNextQuestion.spec.mjs.
import { eventPlan } from '../../CommandCenter';
import { buildExperienceContext } from '../experienceContext';
import { openFoodChoices, playbookDecisionBoard } from '../playbooks';
import { foodDecisionND } from '../decisionND';
import { isSettledDecision } from '../selectedAction';
import { useFrozenClock, daysFromNow } from '../../testUtils/frozenClock';

useFrozenClock();

const tg = (picks, extra) => ({
  id: 'tg-menu', name: 'Thanksgiving', type: 'Thanksgiving Hosting', date: daysFromNow(6),
  guestMode: 'count', guestEstimate: 12, guestCountSource: 'host',
  venue: 'Home', venueKind: 'home', venueAddress: '12 Oak St, Austin, TX', venueCity: 'Austin, TX',
  startTime: '16:00', startTimeSource: 'host', totalBudget: 60000,
  budget: [], vendors: [], timeline: [], guests: [], createdAt: new Date().toISOString(),
  foodChoices: picks, ...(extra || {}),
});
const OWNER = { hosting_model: 'Host cooks the whole meal' };
const rowsFor = (ev) => { const b = playbookDecisionBoard(ev) || {}; return [...(b.open || []), ...(b.locked || [])]; };
const foodAction = (ev) => ((eventPlan(ev, buildExperienceContext(ev, null, 1)) || {}).nextActions || [])
  .find((a) => a && a.route && a.route.focusField === 'food-plan' && /· \d+ open/.test(String(a.title || '')));

test('the owner\'s case: the food item counts turkey and the table, and names them as its records', () => {
  const ev = tg(OWNER);
  // + the drinks question Thanksgiving asks since 11/26/2026 (owner: "Thanksgiving
  // should definitely offer alcohol"): a third menu question, in its order.
  expect((openFoodChoices(ev) || []).map((c) => c.id)).toEqual(['turkey_method', 'dietary_table', 'drinks']);
  const a = foodAction(ev);
  expect(a).toBeTruthy();
  expect(a.title).toMatch(/· 3 open/);
  expect(a.records).toEqual(['turkey_method', 'dietary_table', 'drinks']);
});

test('with the approach answered, the panel is the first open question — not the settled approach', () => {
  const ev = tg(OWNER);
  const a = foodAction(ev);
  const nd = foodDecisionND(ev, 12, rowsFor(ev), a.records);
  expect(nd.id).toBe('turkey_method');
  expect(nd.ask).toBe('How is the turkey cooked?');
  expect(isSettledDecision(nd)).toBe(false);
  expect(nd.options.map((o) => o.value)).toContain('Smoked');
});

test('answering it moves the panel to the next one, and the count falls with it', () => {
  const ev = tg({ ...OWNER, turkey_method: 'Smoked' });
  const a = foodAction(ev);
  expect(a.title).toMatch(/· 2 open/);
  expect(a.records).toEqual(['dietary_table', 'drinks']);
  expect(foodDecisionND(ev, 12, rowsFor(ev), a.records).id).toBe('dietary_table');
});

test('every menu question answered: no food item counts an open one', () => {
  const ev = tg({ ...OWNER, turkey_method: 'Smoked', dietary_table: 'Nobody — the traditional menu works for everyone', drinks: 'Wine with dinner, sparkling cider for everyone' });
  expect(openFoodChoices(ev)).toEqual([]);
  expect(foodAction(ev)).toBeUndefined();
});

test('a question another card raises is not the food item\'s to show', () => {
  const ev = tg(OWNER);
  // Claimed only the table: the turkey is someone else's card.
  expect(foodDecisionND(ev, 12, rowsFor(ev), ['dietary_table']).id).toBe('dietary_table');
  // An action that claims nothing (the dietary note) keeps the old answer: the approach, settled.
  const bare = foodDecisionND(ev, 12, rowsFor(ev));
  expect(bare.id).toBe('hosting_model');
  expect(isSettledDecision(bare)).toBe(true);
});

test('with the approach still open, the approach leads, as before', () => {
  const ev = tg({});
  const a = foodAction(ev);
  const nd = foodDecisionND(ev, 12, rowsFor(ev), a && a.records);
  expect(nd.id).toBe('hosting_model');
  expect(isSettledDecision(nd)).toBe(false);
});
