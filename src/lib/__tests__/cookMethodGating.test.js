// ─── cook_method only reaches a host who is actually cooking ─────────────────
//
// THE DEFECT THIS GUARDS (2026-09-18). A method task needs TWO conditions —
// this host cooks at all, AND the method is this one. `choiceShown` took a
// single gate, and `choicePickFor` resolves a HIDDEN decision's authored
// default, so a Birthday host who picked "Order pizza/trays" (cook_method
// correctly hidden from the board) was still told to plan their oven order,
// and the hero's food cue counted a decision nobody was asked.
//
// Fixed by letting `whenChoice` take an ARRAY meaning AND. These tests assert
// the behaviour, not the mechanism.
import { playbookChecklist, playbookFoodPlan, choiceShown } from '../playbooks/index';

const iso = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const ev = (type, foodChoices) => ({ id: 'cm', type, date: iso(7), guestMode: 'count', guestCount: 20, foodChoices });
const cmTasks = (type, fc) => (playbookChecklist(ev(type, fc)) || []).filter((r) => String(r.id).includes('t_cm_'));

describe('the AND gate itself', () => {
  const e = { type: 'Birthday', foodChoices: { food_style: 'Cook/grill yourself', cook_method: 'Air fryer, in batches' } };
  test('an array passes only when EVERY gate passes', () => {
    expect(choiceShown(e, [{ id: 'food_style', in: ['Cook/grill yourself'] }, { id: 'cook_method', in: ['Air fryer, in batches'] }])).toBe(true);
    expect(choiceShown(e, [{ id: 'food_style', in: ['Cook/grill yourself'] }, { id: 'cook_method', in: ['Oven or stovetop indoors'] }])).toBe(false);
    expect(choiceShown(e, [{ id: 'food_style', in: ['Potluck'] }, { id: 'cook_method', in: ['Air fryer, in batches'] }])).toBe(false);
  });
  test('a plain object still behaves exactly as before', () => {
    expect(choiceShown(e, { id: 'cook_method', in: ['Air fryer, in batches'] })).toBe(true);
    expect(choiceShown(e, { id: 'cook_method', not: ['Air fryer, in batches'] })).toBe(false);
    expect(choiceShown(e, null)).toBe(true);
  });
});

describe('a host who is not cooking is never told how to cook', () => {
  test.each([
    ['Birthday', 'food_style', 'Order pizza/trays'],
    ['Holiday Party', 'food_format', 'Drop-off catering (you set up)'],
    ['Retirement Party', 'food_style', 'Restaurant'],
    ['Baby Shower', 'food_style', 'Potluck'],
  ])('%s · %s = %s → no cook-method tasks', (type, dec, answer) => {
    expect(cmTasks(type, { [dec]: answer })).toHaveLength(0);
  });

  test('the unanswered default path is clean too — a hidden decision must not leak its default', () => {
    // Birthday defaults to 'Order pizza/trays', so cook_method is hidden and
    // must contribute nothing, even though it has a default of its own.
    expect(cmTasks('Birthday', {})).toHaveLength(0);
    const choices = (playbookFoodPlan(ev('Birthday', {})) || {}).choices || [];
    expect(choices.map((c) => c.id)).not.toContain('cook_method');
  });
});

describe('a host who IS cooking gets exactly their method', () => {
  test.each([
    ['Oven or stovetop indoors', /oven/i],
    ['Slow cooker or warming tray', /slow cooker/i],
    ['Air fryer, in batches', /batch order/i],
    ['Store-bought hot or delivered', /pickup or delivery/i],
    ['Grill or smoker outside', /propane or charcoal/i],
  ])('Birthday · %s', (method, re) => {
    const rows = cmTasks('Birthday', { food_style: 'Cook/grill yourself', cook_method: method });
    expect(rows).toHaveLength(1);
    expect(rows[0].task).toMatch(re);
  });

  test('cook_method appears in the food plan choices once the host is cooking', () => {
    const choices = (playbookFoodPlan(ev('Birthday', { food_style: 'Cook/grill yourself' })) || {}).choices || [];
    expect(choices.map((c) => c.id)).toContain('cook_method');
  });
});
