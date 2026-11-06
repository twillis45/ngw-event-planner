import { expect, it, vi } from 'vitest';
vi.mock('@app/lib/failureTelemetry', () => ({ reportFailure: vi.fn() }));
import { reportFailure } from '@app/lib/failureTelemetry';

it('a stale event pointer reports a failed route while still landing on a usable event', async () => {
  const values = { 'ngw-hostv2-last-event': 'missing-event-pointer' };
  globalThis.localStorage = {
    getItem: key => values[key] || null,
    setItem: (key, value) => { values[key] = String(value); },
    removeItem: key => { delete values[key]; },
  };
  const { BOOT_EVENT_ID, FALLBACK } = await import('../src/eventPool.js?failed-route');
  expect(BOOT_EVENT_ID).toBe(FALLBACK.id);
  expect(reportFailure).toHaveBeenCalledWith('route', { where: 'eventPool.boot', reason: 'event-not-found', eventId: 'missing-event-pointer' });
});
