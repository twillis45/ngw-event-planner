// Ask history kept on the event (owner, 11/12/2026). Bounded, clipped, and
// holding only what the host was shown.
import { askExchange, appendAskExchange, attachBroaderLook, ASK_HISTORY_MAX } from '../askHistory';

const result = { answer: 'About $1,200 for food.', basis: ['24 guests', '$50 a head'], matched: true, route: 'food' };

describe('askHistory', () => {
  test('an exchange keeps the question, the answer shown, its basis and route', () => {
    const e = askExchange('  How much food do I need?  ', result, 1000);
    expect(e).toMatchObject({ at: 1000, q: 'How much food do I need?', answer: result.answer, basis: result.basis, matched: true, route: 'food' });
    expect(typeof e.id).toBe('string');
  });

  test('it never carries anything else the answer object holds', () => {
    const e = askExchange('q', { ...result, toolResults: [{ guests: ['Ana — wheelchair'] }], partial: 'x' }, 1);
    expect(Object.keys(e).sort()).toEqual(['answer', 'at', 'basis', 'id', 'matched', 'q', 'route']);
  });

  test(`keeps only the newest ${ASK_HISTORY_MAX}`, () => {
    let h = [];
    for (let i = 0; i < ASK_HISTORY_MAX + 7; i += 1) h = appendAskExchange(h, askExchange(`q${i}`, result, i));
    expect(h).toHaveLength(ASK_HISTORY_MAX);
    expect(h[0].q).toBe('q7');
    expect(h[h.length - 1].q).toBe(`q${ASK_HISTORY_MAX + 6}`);
  });

  test('clips long text so one answer cannot bloat the event', () => {
    const e = askExchange('q'.repeat(5000), { answer: 'a'.repeat(5000), basis: [] }, 1);
    expect(e.q.length).toBe(2000);
    expect(e.answer.length).toBe(2000);
  });

  test('a junk history is read as empty rather than thrown on', () => {
    expect(appendAskExchange('nope', askExchange('q', result, 1))).toHaveLength(1);
    expect(appendAskExchange([null, 3, { q: 'ok' }], null)).toEqual([{ q: 'ok' }]);
  });

  test('the broader look attaches to its own exchange, flagged when a figure failed the check', () => {
    const a = askExchange('one', result, 1); const b = askExchange('two', result, 2);
    const h = attachBroaderLook([a, b], b.id, { answer: 'Broader.', grounded: { ok: false } });
    expect(h[0].broader).toBeUndefined();
    expect(h[1].broader).toEqual({ answer: 'Broader.', flagged: true });
    expect(attachBroaderLook([a], a.id, { answer: '' })[0].broader).toBeUndefined();
  });
});
