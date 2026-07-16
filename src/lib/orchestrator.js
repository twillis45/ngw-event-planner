// ─── Orchestrator loop — Sprint 2 · B2 ──────────────────────────────────────
//
// The client-side tool-calling loop (D1: Claude alongside OpenAI). Claude runs
// server-side behind a thin relay (/api/ai/orchestrate — key stays server-side,
// system prompt server-owned); the ENGINES run here as pure JS (B1). So the LOOP
// is client-side: send messages → if Claude asks for a tool, run it locally via
// runTool() and feed the result back → repeat until a final text answer.
//
// The grounding guarantee, enforced not just prompted: after the final answer, a
// post-check confirms every number in it traces to a tool result (or the host's
// own question). Anything else is flagged — the model can prompt-drift, so we
// verify rather than trust. Coarse by design: it errs toward flagging (a false
// positive prompts a human glance; a false negative would ship a fabricated
// figure), which is the safe direction for a money/headcount surface.
//
// `transport` is injectable: production POSTs to the relay; tests pass a scripted
// mock — so the whole loop is testable with no key, no backend, no network.

import { toolSchemas, runTool } from './orchestratorTools';

// Numeric tokens (prices, counts, dates-as-numbers) for the grounding check.
function numbersIn(text) {
  return (String(text || '').match(/\d[\d,]*(?:\.\d+)?/g) || []).map((s) => s.replace(/,/g, ''));
}

// Every number in the answer must appear in a tool result OR in the host's own
// question (echoing what they asked is legitimate). Returns the ungrounded ones.
export function groundingCheck(answer, toolResults, question = '') {
  const nums = numbersIn(answer);
  if (nums.length === 0) return { ok: true, checked: 0, ungrounded: [] };
  const allowed = new Set([
    ...numbersIn(question),
    ...numbersIn(toolResults.map((r) => JSON.stringify(r)).join(' ')),
  ]);
  const ungrounded = [...new Set(nums.filter((n) => !allowed.has(n)))];
  return { ok: ungrounded.length === 0, checked: nums.length, ungrounded };
}

// Run one grounded conversation turn-set. Returns
//   { answer, toolsUsed, grounded, turns }  on a final answer, or
//   { answer:null, error:'max_turns_exceeded', ... }  if the model never settles.
export async function runOrchestration({ question, ctx, transport, maxTurns = 6 }) {
  if (typeof transport !== 'function') throw new Error('orchestrator: a transport function is required');
  if (!question || !String(question).trim()) throw new Error('orchestrator: empty question');
  const tools = toolSchemas();
  const messages = [{ role: 'user', content: String(question) }];
  const toolResults = [];
  const toolsUsed = [];

  for (let turn = 0; turn < maxTurns; turn++) {
    const resp = await transport({ messages, tools });
    const content = (resp && Array.isArray(resp.content)) ? resp.content : [];
    const toolUses = content.filter((b) => b && b.type === 'tool_use');

    if (toolUses.length === 0) {
      const answer = content.filter((b) => b && b.type === 'text').map((b) => b.text).join('').trim();
      return { answer, toolsUsed, grounded: groundingCheck(answer, toolResults, question), turns: turn + 1 };
    }

    // Record the assistant's tool-request turn, then run each tool locally and
    // hand the results back as the next user turn (Anthropic tool_result shape).
    messages.push({ role: 'assistant', content });
    const results = toolUses.map((tu) => {
      const out = runTool(tu.name, ctx);
      toolsUsed.push(tu.name);
      toolResults.push(out);
      return {
        type: 'tool_result',
        tool_use_id: tu.id,
        content: JSON.stringify(out.ok ? out.result : out),
        is_error: !out.ok,
      };
    });
    messages.push({ role: 'user', content: results });
  }

  return { answer: null, toolsUsed, grounded: { ok: false, reason: 'max_turns' }, turns: maxTurns, error: 'max_turns_exceeded' };
}
