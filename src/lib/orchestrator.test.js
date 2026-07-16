import { runOrchestration, groundingCheck } from './orchestrator';

const EVENT = { id: 'ev-test', type: 'Birthday', guestCount: 40, guestMode: 'count', date: '2027-03-20', totalBudget: 3000 };

// A scripted mock transport: returns the queued Anthropic-shaped response per
// call, and records the messages it saw so we can assert the loop threads
// tool_results back correctly.
function mockTransport(script) {
  let i = 0;
  const seen = [];
  const fn = async ({ messages, tools }) => { seen.push({ messages: JSON.parse(JSON.stringify(messages)), toolCount: tools.length }); return script[i++]; };
  fn.seen = seen;
  return fn;
}

describe('orchestrator loop (B2)', () => {
  test('single tool call → runs it locally, feeds the result back, returns a grounded answer', async () => {
    const transport = mockTransport([
      { stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'tu1', name: 'get_headcount', input: {} }] },
      { stop_reason: 'end_turn', content: [{ type: 'text', text: "You're planning for 40 guests." }] },
    ]);
    const out = await runOrchestration({ question: 'how many are coming?', ctx: { event: EVENT }, transport });
    expect(out.toolsUsed).toEqual(['get_headcount']);
    expect(out.answer).toContain('40');
    expect(out.grounded.ok).toBe(true);          // 40 is the real guestCount → present in the tool result
    expect(out.turns).toBe(2);
    // the second transport call must have received a tool_result for tu1
    const secondCall = transport.seen[1].messages;
    const toolResultTurn = secondCall.find((m) => Array.isArray(m.content) && m.content.some((c) => c.type === 'tool_result'));
    expect(toolResultTurn.content[0].tool_use_id).toBe('tu1');
  });

  test('tools are offered to the model on every turn (schemas passed through)', async () => {
    const transport = mockTransport([{ stop_reason: 'end_turn', content: [{ type: 'text', text: 'ok' }] }]);
    await runOrchestration({ question: 'hi', ctx: { event: EVENT }, transport });
    expect(transport.seen[0].toolCount).toBeGreaterThanOrEqual(9);
  });

  test('multiple tool_use blocks in one turn are all executed', async () => {
    const transport = mockTransport([
      { content: [
        { type: 'tool_use', id: 'a', name: 'get_headcount', input: {} },
        { type: 'tool_use', id: 'b', name: 'get_money', input: {} },
      ] },
      { content: [{ type: 'text', text: 'done' }] },
    ]);
    const out = await runOrchestration({ question: 'status?', ctx: { event: EVENT }, transport });
    expect(out.toolsUsed).toEqual(['get_headcount', 'get_money']);
  });

  test('a fabricated number in the answer is flagged ungrounded', async () => {
    // The model answers with a figure NO tool returned and the host never asked.
    const transport = mockTransport([
      { content: [{ type: 'tool_use', id: 'tu1', name: 'get_headcount', input: {} }] },
      { content: [{ type: 'text', text: 'It will cost exactly $91,317.' }] },
    ]);
    const out = await runOrchestration({ question: 'will it be ok?', ctx: { event: EVENT }, transport });
    expect(out.grounded.ok).toBe(false);
    expect(out.grounded.ungrounded).toContain('91317');
  });

  test('numbers the host asked about are allowed (echoing the question is not fabrication)', () => {
    const g = groundingCheck('Yes, $2,000 should cover it.', [{ ok: true, result: { guests: 50 } }], 'will $2,000 cover 50 people?');
    expect(g.ok).toBe(true);
  });

  test('the loop terminates and reports honestly if the model never settles', async () => {
    const spin = { content: [{ type: 'tool_use', id: 'x', name: 'get_headcount', input: {} }] };
    const transport = mockTransport(Array(10).fill(spin));
    const out = await runOrchestration({ question: 'loop forever', ctx: { event: EVENT }, transport, maxTurns: 3 });
    expect(out.answer).toBeNull();
    expect(out.error).toBe('max_turns_exceeded');
    expect(out.turns).toBe(3);
  });

  test('guards: no transport / empty question throw', async () => {
    await expect(runOrchestration({ question: 'hi', ctx: { event: EVENT } })).rejects.toThrow(/transport/);
    await expect(runOrchestration({ question: '  ', ctx: { event: EVENT }, transport: async () => ({}) })).rejects.toThrow(/empty/);
  });
});
