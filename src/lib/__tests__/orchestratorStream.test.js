// Streaming (B3) — a TRANSPORT concern and nothing else.
//
// THE INVARIANT under test: a streamed turn must reassemble into the byte-identical
// { content, stop_reason } a buffered turn returns. If that holds, the tool-calling
// loop and the grounding check cannot tell the two apart, and streaming can never
// become a second code path with its own subtly different honesty properties.
// No key, no backend, no network — the SSE is scripted.

import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from 'util';
import { accumulateSSE, orchestratorStreamTransport, OrchestratorUnavailable } from '../orchestratorClient';

// jsdom (this CRA version) ships neither global. Browsers have had both for years,
// so this is an environment gap, not a product one — polyfill the TEST, don't add a
// fallback to the product that only ever runs here.
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = NodeTextDecoder;
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = NodeTextEncoder;

const sse = (events) => events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('');

// A text-only turn, exactly as Claude frames it.
const TEXT_STREAM = sse([
  { type: 'message_start', message: { id: 'msg_1' } },
  { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'You have ' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '$1,100 ' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'uncommitted.' } },
  { type: 'content_block_stop', index: 0 },
  { type: 'message_delta', delta: { stop_reason: 'end_turn' } },
  { type: 'message_stop' },
]);

// The buffered turn the relay would have returned for that same generation.
const TEXT_BUFFERED = {
  content: [{ type: 'text', text: 'You have $1,100 uncommitted.' }],
  stop_reason: 'end_turn',
};

// A tool-calling turn: text, then a tool_use whose input streams as partial JSON.
const TOOL_STREAM = sse([
  { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
  { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Let me check.' } },
  { type: 'content_block_stop', index: 0 },
  { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'toolu_1', name: 'get_money' } },
  { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{}' } },
  { type: 'content_block_stop', index: 1 },
  { type: 'message_delta', delta: { stop_reason: 'tool_use' } },
]);

const TOOL_BUFFERED = {
  content: [
    { type: 'text', text: 'Let me check.' },
    { type: 'tool_use', id: 'toolu_1', name: 'get_money', input: {} },
  ],
  stop_reason: 'tool_use',
};

describe('accumulateSSE — streamed reassembles to the buffered shape', () => {
  test('a text turn deep-equals the buffered turn', () => {
    const out = accumulateSSE(TEXT_STREAM);
    expect(out.content).toEqual(TEXT_BUFFERED.content);
    expect(out.stop_reason).toBe(TEXT_BUFFERED.stop_reason);
  });

  test('a tool_use turn deep-equals the buffered turn, input JSON parsed', () => {
    const out = accumulateSSE(TOOL_STREAM);
    expect(out.content).toEqual(TOOL_BUFFERED.content);
    expect(out.stop_reason).toBe('tool_use');
  });

  test('onDelta fires for prose only — never raw tool JSON', () => {
    const seen = [];
    accumulateSSE(TOOL_STREAM, (t) => seen.push(t));
    expect(seen.join('')).toBe('Let me check.');
    expect(seen.join('')).not.toMatch(/\{|partial_json/);
  });

  test('a delta arriving before its content_block_start still lands (no dropped text)', () => {
    const out = accumulateSSE(sse([
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'orphan' } },
    ]));
    expect(out.content).toEqual([{ type: 'text', text: 'orphan' }]);
  });

  test('an unparseable frame is skipped, never guessed at', () => {
    const out = accumulateSSE('data: {not json\n\n' + TEXT_STREAM);
    expect(out.content).toEqual(TEXT_BUFFERED.content);
  });

  test('a render that throws inside onDelta cannot kill the stream', () => {
    const out = accumulateSSE(TEXT_STREAM, () => { throw new Error('render blew up'); });
    expect(out.content).toEqual(TEXT_BUFFERED.content);
  });

  test('an SSE error event surfaces as OrchestratorUnavailable (caller falls back)', () => {
    expect(() => accumulateSSE('data: {"type":"error","error":{"type":"overloaded_error"}}\n\n'))
      .toThrow(OrchestratorUnavailable);
  });
});

describe('orchestratorStreamTransport — same contract as the buffered transport', () => {
  const streamRes = (text) => ({
    ok: true,
    body: {
      getReader() {
        const chunks = [text.slice(0, 40), text.slice(40, 120), text.slice(120)];
        let i = 0;
        return { read: async () => (i < chunks.length ? { done: false, value: new TextEncoder().encode(chunks[i++]) } : { done: true }) };
      },
    },
  });

  test('asks the server to stream, and returns the buffered-identical shape', async () => {
    let sentBody = null;
    const fetchImpl = async (_u, o) => { sentBody = JSON.parse(o.body); return streamRes(TEXT_STREAM); };
    const t = orchestratorStreamTransport({ base: 'http://x', fetchImpl });
    const out = await t({ messages: [{ role: 'user', content: 'hi' }], tools: [] });
    expect(sentBody.stream).toBe(true);
    expect(out.content).toEqual(TEXT_BUFFERED.content);
    expect(out.stop_reason).toBe('end_turn');
  });

  test('a frame split across chunk boundaries never corrupts the final content', async () => {
    // The chunking above deliberately slices mid-frame.
    const seen = [];
    const fetchImpl = async () => streamRes(TEXT_STREAM);
    const t = orchestratorStreamTransport({ base: 'http://x', fetchImpl, onDelta: (d) => seen.push(d) });
    const out = await t({ messages: [], tools: [] });
    expect(out.content[0].text).toBe('You have $1,100 uncommitted.');
  });

  test('no streaming body (proxy buffered it) → same answer, just no typing effect', async () => {
    const fetchImpl = async () => ({ ok: true, text: async () => TEXT_STREAM });
    const t = orchestratorStreamTransport({ base: 'http://x', fetchImpl });
    const out = await t({ messages: [], tools: [] });
    expect(out.content).toEqual(TEXT_BUFFERED.content);
  });

  test('a non-OK response degrades to OrchestratorUnavailable, never a fabricated answer', async () => {
    const t = orchestratorStreamTransport({ base: 'http://x', fetchImpl: async () => ({ ok: false, status: 503 }) });
    await expect(t({ messages: [], tools: [] })).rejects.toThrow(OrchestratorUnavailable);
  });
});
