// ─── THE REPORTER SWITCH, EXECUTED RATHER THAN READ ──────────────────────────
//
// CI shards the e2e matrix across two runners (2026-09-18) and recombines the
// halves with `playwright merge-reports`, which can only read the `blob`
// format. So the config has to emit `blob` under CI's PW_BLOB and `list`
// everywhere else — get that backwards and either the merge has nothing to
// merge, or every local run stops printing the progress it always printed.
//
// THIS LIVES IN VITEST ON PURPOSE. The first version asserted it from jest with
// a regex over the config's source text, and `textGateRatchet` correctly
// refused it: jest cannot execute the hostv2 tree, so a text gate there proves
// the file CONTAINS a ternary, not that the ternary evaluates. The ratchet's
// own message says what to do instead — "the seam exists, so a text gate is
// never the ONLY option" — and this is that. It imports the config and reads
// what it actually produced.
//
// `vi.resetModules()` before each import, because ESM caches a module after its
// first evaluation and the config reads `process.env.PW_BLOB` at that moment.
// (A cache-busting query string was the first attempt and vite rejected it:
// "Unknown variable dynamic import" — it needs the specifier to be statically
// analysable.)
import { describe, it, expect, afterEach, vi } from 'vitest';

const load = async () => {
  vi.resetModules();
  return (await import('../playwright.config.mjs')).default;
};

const saved = process.env.PW_BLOB;
afterEach(() => {
  if (saved === undefined) delete process.env.PW_BLOB;
  else process.env.PW_BLOB = saved;
});

describe('the sharded reporter switch', () => {
  it('emits blob when CI asks, so merge-reports has something to merge', async () => {
    process.env.PW_BLOB = '1';
    const cfg = await load();
    expect(cfg.reporter).toEqual([['blob']]);
  });

  it('emits list otherwise, so a local run still prints progress', async () => {
    delete process.env.PW_BLOB;
    const cfg = await load();
    expect(cfg.reporter).toEqual([['list']]);
  });

  it('and the rest of the config is untouched by the switch', async () => {
    // `workers: 2` is the 2026-08-06 flake fix and sharding must not disturb
    // it — each shard still runs two workers on its own machine, which is the
    // entire reason sharding was chosen over raising the worker count.
    delete process.env.PW_BLOB;
    const cfg = await load();
    expect(cfg.workers).toBe(2);
    expect(cfg.retries).toBe(1);
    expect(cfg.projects.length).toBe(7);
  });
});
