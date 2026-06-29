// Food sourcing → tasks: a sourcing CHOICE must reshape the host task list, using the
// SAME choiceShown predicate the food spread uses. These lock the new behavior:
//   • choiceShown / choicePickFor read event.foodChoices, falling back to the decision default
//   • playbookChecklist projects playbook.tasks filtered by choiceShown, with stable ids
//   • the Crab Feast steam-vs-order split swaps which tasks appear
import { choiceShown, choicePickFor, playbookChecklist } from '../index';

const CRAB = (over = {}) => ({ id: 'e1', type: 'Crab Feast', date: '2026-07-15', ...over });
const ASOF = '2026-07-01';
const labels = (ev) => playbookChecklist(ev, ASOF).map((r) => r.task);
const has = (ev, re) => labels(ev).some((l) => re.test(l));

describe('choicePickFor / choiceShown', () => {
  test('untagged item always shows', () => {
    expect(choiceShown(CRAB(), undefined)).toBe(true);
    expect(choiceShown(CRAB(), { id: '' })).toBe(true);
  });
  test('pick falls back to the decision default', () => {
    expect(choicePickFor(CRAB(), 'steam_vs_order')).toBe('Order steamed for pickup');
  });
  test('explicit foodChoices override the default', () => {
    expect(choicePickFor(CRAB({ foodChoices: { steam_vs_order: 'Steam them myself' } }), 'steam_vs_order')).toBe('Steam them myself');
  });
  test('tagged item shows only when the pick is in the set', () => {
    const ev = CRAB();
    expect(choiceShown(ev, { id: 'steam_vs_order', in: ['Order steamed for pickup'] })).toBe(true);
    expect(choiceShown(ev, { id: 'steam_vs_order', in: ['Steam them myself'] })).toBe(false);
  });
});

describe('playbookChecklist projects playbook tasks, choice-filtered', () => {
  test('returns renderable rows with stable pbt- ids and a task label', () => {
    const rows = playbookChecklist(CRAB(), ASOF);
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((r) => {
      expect(r.id).toMatch(/^pbt-e1-/);
      expect(typeof r.task).toBe('string');
      expect(r.task.length).toBeGreaterThan(0);
    });
  });

  test('default (order steamed) shows the pickup task, not the rent-a-pot task', () => {
    const ev = CRAB();
    expect(has(ev, /pickup slot/i)).toBe(true);
    expect(has(ev, /rack steamer pot/i)).toBe(false);
    expect(has(ev, /Pick up the hot steamed crabs/i)).toBe(true);
    expect(has(ev, /Steam your own/i)).toBe(false);
  });

  test('choosing steam-yourself swaps the task list', () => {
    const ev = CRAB({ foodChoices: { steam_vs_order: 'Steam them myself' } });
    expect(has(ev, /rack steamer pot/i)).toBe(true);
    expect(has(ev, /pickup slot/i)).toBe(false);
    expect(has(ev, /Steam your own/i)).toBe(true);
    expect(has(ev, /Pick up the hot steamed crabs/i)).toBe(false);
  });

  test('"buy live, steam in batches" is also a steam-yourself path', () => {
    const ev = CRAB({ foodChoices: { steam_vs_order: 'Buy live, steam in batches' } });
    expect(has(ev, /rack steamer pot/i)).toBe(true);
    expect(has(ev, /pickup slot/i)).toBe(false);
  });

  test('empty / no-date / non-playbook events return []', () => {
    expect(playbookChecklist(null, ASOF)).toEqual([]);
    expect(playbookChecklist(CRAB({ date: undefined }), ASOF)).toEqual([]);
    expect(playbookChecklist(CRAB({ type: 'Other' }), ASOF)).toEqual([]);
  });
});
