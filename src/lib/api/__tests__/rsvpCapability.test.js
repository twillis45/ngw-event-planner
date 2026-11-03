jest.mock('../../supabaseClient', () => ({ supabase: null, isSupabaseConfigured: () => false }));
process.env.REACT_APP_API_BASE_URL = 'https://rsvp-test.invalid';
const { checkRsvpCapability } = require('../rsvp');
const event = { id: 'cust-rsvp', rsvpCode: 'long-public-rsvp-code' };
afterEach(() => { delete global.fetch; jest.useRealTimers(); });

describe('RSVP capability requires a public event, not a configured proxy', () => {
  it('refuses an unpublished local event', async () => {
    global.fetch = jest.fn(async () => ({ status: 404, ok: false }));
    expect(await checkRsvpCapability(event)).toMatchObject({ ready: false, reason: 'unpublished' });
  });
  it('refuses uncertainty and a different event', async () => {
    global.fetch = jest.fn(async () => { throw new Error('offline'); });
    expect(await checkRsvpCapability(event)).toMatchObject({ ready: false, reason: 'unavailable' });
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, event: { id: 'other', rsvpCode: event.rsvpCode } }) });
    expect(await checkRsvpCapability(event)).toMatchObject({ ready: false, reason: 'unpublished' });
  });
  it('accepts only the matching public event and code', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ ok: true, event }) }));
    expect(await checkRsvpCapability(event)).toEqual({ ready: true, code: event.rsvpCode });
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, event: { ...event, rsvpCode: 'different-public-code' } }) });
    expect((await checkRsvpCapability(event)).ready).toBe(false);
  });
  it('never substitutes the guessable event id for a missing invite code', async () => {
    global.fetch = jest.fn();
    expect((await checkRsvpCapability({ id: event.id })).ready).toBe(false);
    expect((await checkRsvpCapability({ ...event, rsvpCode: 'short' })).ready).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});

it('a configuration-free build cannot offer online RSVP', async () => {
  jest.resetModules();
  delete process.env.REACT_APP_API_BASE_URL;
  const { checkRsvpCapability: check } = require('../rsvp');
  global.fetch = jest.fn();
  expect(await check(event)).toEqual({ ready: false, reason: 'not-configured' });
  expect(fetch).not.toHaveBeenCalled();
});

it('a stalled public lookup becomes retryable uncertainty after eight seconds', async () => {
  jest.useFakeTimers();
  jest.resetModules();
  process.env.REACT_APP_API_BASE_URL = 'https://rsvp-test.invalid';
  const { checkRsvpCapability: check } = require('../rsvp');
  global.fetch = jest.fn((url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  const pending = check(event);
  jest.advanceTimersByTime(8000);
  await expect(pending).resolves.toEqual({ ready: false, reason: 'unavailable' });
  jest.useRealTimers();
});


it('a successful HTTP response must actually acknowledge the RSVP', async () => {
  jest.resetModules();
  process.env.REACT_APP_API_BASE_URL = 'https://rsvp-test.invalid';
  const { submitRsvp } = require('../rsvp');
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ ok: false }) }));
  await expect(submitRsvp(event.rsvpCode, { name: 'Guest', rsvp: 'Yes' })).rejects.toThrow('not accepted');
  fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, submitted_at: '2026-11-03' }) });
  await expect(submitRsvp(event.rsvpCode, { name: 'Guest', rsvp: 'Yes' })).resolves.toMatchObject({ ok: true });
});

it('an unacknowledged retry stays in the existing outbox', async () => {
  jest.resetModules();
  process.env.REACT_APP_API_BASE_URL = 'https://rsvp-test.invalid';
  const { flushRsvpOutbox } = require('../rsvp');
  const key = 'ngw-rsvp-queue-' + event.id;
  localStorage.setItem(key, JSON.stringify([{ name: 'Guest', rsvp: 'Yes', idempotencyKey: 'same-key', submittedAt: Date.now() }]));
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ ok: false }) }));
  await expect(flushRsvpOutbox(event.id, event.rsvpCode)).resolves.toEqual({ flushed: 0, remaining: 1 });
  expect(JSON.parse(localStorage.getItem(key))).toEqual([expect.objectContaining({ idempotencyKey: 'same-key', _attempts: 1 })]);
  localStorage.removeItem(key);
});
