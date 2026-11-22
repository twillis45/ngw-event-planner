// "Decide the menu." headlined asks that are not about the menu — the bartender,
// the grill master, the Super Bowl, "Who is this party for…" (audit 2 lane A
// P2-1). When the food item's hero shows a playbook call, the headline is that
// call's own question; only the generic cook / cater / potluck trio, which has
// no question of its own, keeps the ladder's wording.
import { resolveSelection } from '../selectedAction';

const action = { id: 'phase:food', category: 'phase', domain: 'food', title: 'What you’re serving' };
const fallback = () => 'Decide the menu.';
const opts = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }];

describe('the food hero speaks the call it shows', () => {
  test('a call with an authored ask is headlined by it', () => {
    const sel = resolveSelection(action, { decisionND: () => ({ id: 'grill_master', options: opts, ask: 'Who runs the grill?' }), boardRow: () => null, actionAsk: fallback });
    expect(sel.ask).toBe('Who runs the grill?');
  });
  test('a call with only a label is asked as its question', () => {
    const sel = resolveSelection(action, { decisionND: () => ({ id: 'help', options: opts, label: 'Hire a bartender or cleaner' }), boardRow: () => null, actionAsk: fallback });
    expect(sel.ask).toBe('Hire a bartender or cleaner?');
  });
  test('the generic trio keeps the ladder’s wording', () => {
    const sel = resolveSelection(action, { decisionND: () => ({ id: 'phase:food', options: opts }), boardRow: () => null, actionAsk: fallback });
    expect(sel.ask).toBe('Decide the menu.');
  });
});
