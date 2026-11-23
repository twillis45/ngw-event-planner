// A LATE CHECKLIST STEP IS ASKED AS ONE (owner screenshot, 11/18/2026): the board's
// headline read "Decide the menu." over the late step "walk the kitchen with whoever
// lives there: oven size, refrigerator space, serving dishes, and parking".
import { heroAskFor } from '../heroAsk';

const late = (task) => ({ id: 'decision:t1', taskId: 't1', decisionId: 't1', category: 'decision', level: 'attention', title: `Resolve "${task}".` });

test('the kitchen walk-through is not "Decide the menu."', () => {
  const ask = heroAskFor(late('If it is not at your place, walk the kitchen with whoever lives there: oven size, refrigerator space, serving dishes, and parking'), {});
  expect(ask).toBe('Catch up on this step.');
});

test('nor is any other late step read for a topic in its prose', () => {
  expect(heroAskFor(late('Set the budget line for the dessert table'), {})).toBe('Catch up on this step.');
  expect(heroAskFor(late('Text the guests the parking map'), {})).toBe('Catch up on this step.');
});

test('a real menu decision still asks for the menu', () => {
  expect(heroAskFor({ id: 'food', domain: 'food', title: 'Plan the menu' }, {})).toBe('Decide the menu.');
});

// The same step, arriving bunched with others when time got tight (6:24 PM screenshot).
const bunched = (title, leadIsStep = true) => ({ level: 'attention', category: 'compression', title: title + '.', firstAction: title, leadIsStep, moreCount: 5 });

test('a bunch of late steps led by the kitchen walk is not "Decide the menu." either', () => {
  expect(heroAskFor(bunched('If it is not at your place, walk the kitchen with whoever lives there: oven size, refrigerator space, serving dishes, and parking'), {})).toBe('Catch up on this step.');
});

test('a bunch that comes down to the budget still asks for the budget', () => {
  expect(heroAskFor(bunched('Set your budget', false), {})).toBe('Set your budget.');
});

// Owner's phone, 9:09 PM 11/19/2026: "Map the spread." over the late allergy
// step. The bunch of late steps reaches the board through eventPlan's rebuild
// of its top action — a field whitelist that has dropped fields five times
// before — and it dropped `leadIsStep`, so the headline fell to the CTA. Driven
// through the REAL engine on a Friendsgiving 3 days out, as the app builds it.
import { eventPlan } from '../../CommandCenter';

const inDays = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
// Row ids are the engine's (`pbt-<event>-<step>`): a row names its step by id,
// and the step's declared target places it (six root causes, cause 1).
const ROW = (id, task, leadDays) => ({ id: `pbt-late-fg-${id}`, week: '2 weeks out', leadDays, task, done: false, owner: '', category: 'planning', phase: 'planning' });
const FG = {
  id: 'late-fg', name: 'My Friendsgiving', type: 'Friendsgiving', date: inDays(3), createdAt: new Date().toISOString(), startTime: '16:00', startTimeSource: 'host',
  venue: "Vida's", guestEstimate: 15, guestCountSource: 'host', guestMode: 'count', totalBudget: 200,
  guests: [], vendors: [], budget: [],
  timeline: [
    ROW('t_model', 'Decide who cooks what: you make the main and friends bring dishes, everything assigned, you cook most of it, or the group orders in', -21),
    ROW('t_allergy_route', 'Tell each cook what to keep out of their dish, for example: "no nuts in the stuffing, please — someone at the table is allergic"', -14),
    ROW('t_kitchen', 'If it is not at your place, walk the kitchen with whoever lives there: oven size, refrigerator space, serving dishes, and parking', -14),
  ],
};

test('the bunch of late steps reaches the board still saying it is led by a step', () => {
  const late = (eventPlan(FG).nextActions || []).find((a) => a && a.category === 'compression');
  expect(late).toBeTruthy();
  expect(late.leadIsStep).toBe(true);
  expect(heroAskFor(late, FG)).toBe('Catch up on this step.');
});

// Same screenshot: the card read '…for example: "no nuts in the stuffing,
// please — someone at the table is allergic' with no closing quote. heroRecord
// stripped a quote from BOTH ends of every title, which is right only for a
// title that is wholly quoted (Resolve "Sit-down or buffet").
import { heroRecord } from '../heroAsk';

test('a quote that closes an example stays; a wholly quoted name loses its quotes', () => {
  const step = 'Tell each cook what to keep out of their dish, for example: "no nuts in the stuffing, please — someone at the table is allergic".';
  expect(heroRecord({ title: step }, 'Catch up on this step.')).toBe('Tell each cook what to keep out of their dish, for example: "no nuts in the stuffing, please — someone at the table is allergic"');
  expect(heroRecord({ title: 'Resolve "Sit-down or buffet".' }, 'Choose how the food is served.')).toBe('Sit-down or buffet');
});
