// "DO THE SHOPPING" BUYS ONLY HER LINES (11/26/2026). The live check read
// "Still to get" 28 on the day-before card, then ticked "Do the shopping" and
// was told "40 items marked bought". Still to get counts the lines the host
// buys (lib/playbooks hostBuysLine: not a dish a friend or the guests bring);
// the tick marked every unskipped line, brought dishes included. One rule now:
// a buy step marks only lines she buys, so the two numbers agree.
import { playbookFoodPlan, hostBuysLine } from '../playbooks';
import { stepToggleEdit } from '../stepToggle';
import { itemsBoughtByTask } from '../shopTaskItems';
import { linesLeftToBuy } from '../itemCounts';

const TG = (extra = {}) => ({
  id: 'tg', type: 'Thanksgiving Hosting', guestMode: 'count', guestEstimate: 12, guestCountSource: 'host',
  guests: [], timeline: [{ id: 't1', task: 'Do the shopping', done: false }], ...extra,
});

test('ticking "Do the shopping" marks bought exactly the lines Still to get counts', () => {
  const ev = TG();
  const plan = playbookFoodPlan(ev);
  expect(plan.list.some((i) => !i.skipped && !hostBuysLine(i))).toBe(true); // the fixture has brought dishes
  const left = linesLeftToBuy(plan, ev).length;
  const ed = stepToggleEdit(ev, 0, plan.list);
  const marked = Object.keys(ed.patch.foodGot || {});
  expect(marked.length).toBe(left);
  expect(ed.msg).toContain(left + ' items marked bought');
  expect(linesLeftToBuy(plan, { ...ev, ...ed.patch })).toHaveLength(0);
  expect(marked.every((id) => hostBuysLine(plan.list.find((i) => i.id === id)))).toBe(true);
});

test('a step naming a dish a guest brings does not buy it', () => {
  const plan = playbookFoodPlan(TG());
  const brought = plan.list.find((i) => i.id === 'p_mac');
  expect(hostBuysLine(brought)).toBe(false);
  expect(itemsBoughtByTask('Buy the mac and cheese', plan.list).ids).not.toContain('p_mac');
});
