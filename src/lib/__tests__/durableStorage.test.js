// ─── ASK THE BROWSER TO KEEP IT ─────────────────────────────────────────────
//
// The review board's ONE THING, named independently by six seats across two
// panels: on a localStorage-only profile the app never asked the browser to
// persist anything, so eviction could take the host's only copy and they would
// learn it at the moment a write failed — after the plan is gone.
//
// The assertions that carry weight are the ones about NOT breaking a write.
// A durability question that delays, blocks or fails a host's save has traded
// a certain harm for a hypothetical one.
import { requestDurableStorage, durabilityStatus, saveCustomEvents, LS_DURABILITY } from '../customEventStore';

const ev = (id) => ({ id, name: `Event ${id}`, date: '2026-10-01' });

const withStorage = (persist, persisted) => {
  global.navigator.storage = {
    ...(persist !== undefined ? { persist } : {}),
    ...(persisted !== undefined ? { persisted } : {}),
  };
};

beforeEach(() => {
  localStorage.clear();
  delete global.navigator.storage;
});

describe('asking once', () => {
  test('a granted request records persisted', async () => {
    withStorage(async () => true, async () => false);
    expect((await requestDurableStorage(1)).state).toBe('persisted');
    expect(durabilityStatus().state).toBe('persisted');
  });

  test('a REFUSAL is recorded as an answer, not as a missing one', async () => {
    // The whole point: a refusal is real information the host is owed. Treating
    // it as "unknown" would re-prompt forever and tell them nothing.
    withStorage(async () => false, async () => false);
    const r = await requestDurableStorage(1);
    expect(r.state).toBe('refused');
    expect(r.asked).toBe(true);
  });

  test('already-persisted needs no prompt', async () => {
    const persist = jest.fn(async () => false);
    withStorage(persist, async () => true);
    expect((await requestDurableStorage(1)).state).toBe('persisted');
    expect(persist).not.toHaveBeenCalled();     // never prompt if we already have it
  });

  test('a refusal is NOT re-asked on every write', async () => {
    const persist = jest.fn(async () => false);
    withStorage(persist, async () => false);
    await requestDurableStorage(1);
    await requestDurableStorage(2);
    await requestDurableStorage(3);
    expect(persist).toHaveBeenCalledTimes(1);
  });

  test('a browser without the API is unsupported, not refused', async () => {
    // Different facts. "This browser cannot promise" is not "this browser said no."
    expect((await requestDurableStorage(1)).state).toBe('unsupported');
  });

  test('a throwing API never propagates', async () => {
    withStorage(async () => { throw new Error('boom'); }, async () => false);
    await expect(requestDurableStorage(1)).resolves.toMatchObject({ state: 'unsupported' });
  });
});

describe('it must never cost a host their write', () => {
  test('a save succeeds when the storage API throws', () => {
    withStorage(() => { throw new Error('boom'); }, () => { throw new Error('boom'); });
    expect(saveCustomEvents([ev('a')], { reason: 'test' })).toMatchObject({ ok: true, wrote: true });
  });

  test('a save succeeds when the API is absent entirely', () => {
    expect(saveCustomEvents([ev('a')], { reason: 'test' })).toMatchObject({ ok: true, wrote: true });
  });

  test('the save returns SYNCHRONOUSLY — it is never awaited', () => {
    let settled = false;
    withStorage(() => new Promise((r) => { setTimeout(() => { settled = true; r(true); }, 50); }), async () => false);
    const res = saveCustomEvents([ev('a')], { reason: 'test' });
    // If saveCustomEvents awaited the durability answer this would be true by
    // now, or the call would not have returned a result at all.
    expect(res.ok).toBe(true);
    expect(settled).toBe(false);
  });

  // THE PRECONDITION, and it was missing. Removing the call from the write path
  // left all twelve tests green — the "refused write does not ask" case below
  // is vacuously true when NOTHING ever asks. Assert the positive first, or the
  // negative asserts nothing.
  test('a SUCCESSFUL write asks for durability', async () => {
    const persist = jest.fn(async () => true);
    withStorage(persist, async () => false);
    expect(saveCustomEvents([ev('a')], { reason: 'test' })).toMatchObject({ ok: true });
    await Promise.resolve(); await Promise.resolve();   // let the fire-and-forget settle
    expect(persist).toHaveBeenCalledTimes(1);
  });

  test('a REFUSED write does not ask — nothing was stored to keep', () => {
    saveCustomEvents([ev('a')], { reason: 'seed' });
    localStorage.removeItem(LS_DURABILITY);
    const persist = jest.fn(async () => true);
    withStorage(persist, async () => false);
    const res = saveCustomEvents([], { reason: 'drops-user-event' });   // guard refuses
    expect(res.ok).toBe(false);
    expect(persist).not.toHaveBeenCalled();
  });
});

describe('reading it back', () => {
  test('unknown before anything is asked', () => {
    expect(durabilityStatus()).toMatchObject({ state: 'unknown', asked: false });
  });

  test('a corrupt record reads as unknown rather than throwing', () => {
    localStorage.setItem(LS_DURABILITY, 'not json');
    expect(durabilityStatus().state).toBe('unknown');
  });
});
