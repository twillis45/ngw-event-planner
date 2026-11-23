import { expect, it, vi } from 'vitest';

// THE MODULE LOADS BEFORE THE TEST, NOT INSIDE IT (batch 11, 11/23/2026).
// This test timed out under load on the base build too. The cause was not the
// boot logic: it imported eventPool.js inside the test body, so vitest
// transformed eventPool's whole graph (every playbook, every sample event,
// ~4 s on a quiet machine) on the clock of the 5 s test timeout. Under load the
// transform alone ran past it. With --testTimeout=1500 the old shape fails
// every time; this shape passes, because the import is collected up front.
//
// eventPool reads localStorage at module scope, so the stale pointer has to be
// in place before the import runs: vi.hoisted runs ahead of the static imports.
// Each test file runs in its own module registry, so this is a fresh boot.
vi.hoisted(() => {
  const values = { 'ngw-hostv2-last-event': 'missing-event-pointer' };
  globalThis.localStorage = {
    getItem: key => values[key] || null,
    setItem: (key, value) => { values[key] = String(value); },
    removeItem: key => { delete values[key]; },
  };
});
vi.mock('@app/lib/failureTelemetry', () => ({ reportFailure: vi.fn() }));
import { reportFailure } from '@app/lib/failureTelemetry';
import { BOOT_EVENT_ID, FALLBACK } from '../src/eventPool.js';

it('a stale event pointer reports a failed route while still landing on a usable event', () => {
  expect(BOOT_EVENT_ID).toBe(FALLBACK.id);
  expect(reportFailure).toHaveBeenCalledWith('route', { where: 'eventPool.boot', reason: 'event-not-found', eventId: 'missing-event-pointer' });
});
