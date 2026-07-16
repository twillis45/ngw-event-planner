import { orchestratorTransport, checkOrchestratorReady, OrchestratorUnavailable } from './orchestratorClient';

const okResp = (json) => ({ ok: true, status: 200, json: async () => json });
const errResp = (status) => ({ ok: false, status, json: async () => ({}) });

describe('orchestrator client (B3) — graceful by construction', () => {
  test('checkOrchestratorReady: true only when the server reports the key is set', async () => {
    expect(await checkOrchestratorReady({ base: 'http://x', fetchImpl: async () => okResp({ orchestrator: true }) })).toBe(true);
    expect(await checkOrchestratorReady({ base: 'http://x', fetchImpl: async () => okResp({ orchestrator: false }) })).toBe(false);
  });

  test('checkOrchestratorReady: false when no base, non-OK, or network error', async () => {
    expect(await checkOrchestratorReady({ base: undefined, fetchImpl: async () => okResp({ orchestrator: true }) })).toBe(false);
    expect(await checkOrchestratorReady({ base: 'http://x', fetchImpl: async () => errResp(500) })).toBe(false);
    expect(await checkOrchestratorReady({ base: 'http://x', fetchImpl: async () => { throw new Error('down'); } })).toBe(false);
  });

  test('transport returns Claude content on 200', async () => {
    const claude = { content: [{ type: 'text', text: 'hi' }], stop_reason: 'end_turn' };
    const t = orchestratorTransport({ base: 'http://x', fetchImpl: async () => okResp(claude) });
    expect(await t({ messages: [{ role: 'user', content: 'q' }], tools: [] })).toEqual(claude);
  });

  test('transport throws OrchestratorUnavailable on 503 (no key) — the fallback signal', async () => {
    const t = orchestratorTransport({ base: 'http://x', fetchImpl: async () => errResp(503) });
    await expect(t({ messages: [], tools: [] })).rejects.toBeInstanceOf(OrchestratorUnavailable);
  });

  test('transport throws OrchestratorUnavailable on network error and when unconfigured', async () => {
    const down = orchestratorTransport({ base: 'http://x', fetchImpl: async () => { throw new Error('net'); } });
    await expect(down({ messages: [], tools: [] })).rejects.toBeInstanceOf(OrchestratorUnavailable);
    const noBase = orchestratorTransport({ base: undefined });
    await expect(noBase({ messages: [], tools: [] })).rejects.toBeInstanceOf(OrchestratorUnavailable);
  });

  test('transport posts to the /orchestrate path with messages + tools', async () => {
    let seen = null;
    const t = orchestratorTransport({ base: 'http://api', fetchImpl: async (url, opts) => { seen = { url, body: JSON.parse(opts.body) }; return okResp({ content: [] }); } });
    await t({ messages: [{ role: 'user', content: 'q' }], tools: [{ name: 'get_money' }] });
    expect(seen.url).toBe('http://api/api/ai/orchestrate');
    expect(seen.body.messages[0].content).toBe('q');
    expect(seen.body.tools[0].name).toBe('get_money');
  });
});
