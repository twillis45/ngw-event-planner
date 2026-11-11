jest.mock('../sentry', () => ({ captureError: jest.fn() }));
jest.mock('../analytics', () => ({ ...jest.requireActual('../analytics'), track: jest.fn(async () => {}) }));
const { captureError } = require('../sentry');
const { track } = require('../analytics');
const { reportFailure, recordPassFunnel } = require('../failureTelemetry');

beforeEach(() => jest.clearAllMocks());

test.each(['save', 'provider', 'route', 'pass_checkout', 'pass_verify', 'brief_mint'])('%s failure reports sanitized context to both existing transports', async kind => {
  await reportFailure(kind, { where: 'test.seam', eventId: 'Alice-personal-event', reason: 'request-failed', name: 'Alice', body: 'private notes' });
  expect(captureError).toHaveBeenCalledTimes(1);
  expect(track).toHaveBeenCalledTimes(1);
  expect(track.mock.calls[0][0]).toBe(kind + '_failed');
  const serialized = JSON.stringify([captureError.mock.calls, track.mock.calls]);
  expect(serialized).not.toMatch(/Alice|personal-event|private notes/);
  expect(captureError.mock.calls[0][1]).toMatchObject({ where: 'test.seam', tags: { failure_class: kind, release_sha: expect.any(String), release_profile: expect.any(String) } });
});

test('pass sheet and checkout intent use the existing opt-out-respecting analytics transport', async () => {
  await recordPassFunnel('sheet_viewed', 'Alice-personal-event');
  await recordPassFunnel('checkout_started', 'Alice-personal-event');
  expect(track.mock.calls.map(row => row[0])).toEqual(['pass_sheet_viewed', 'pass_checkout_started']);
  expect(captureError).not.toHaveBeenCalled();
  expect(JSON.stringify(track.mock.calls)).not.toContain('Alice');
});

test('telemetry failure never rejects into the save or checkout action', async () => {
  captureError.mockImplementationOnce(() => { throw new Error('reporter unavailable'); });
  await expect(reportFailure('save', { where: 'test.seam' })).resolves.toBeUndefined();
});

test('event correlation uses a one-way hash when the browser supports it', async () => {
  const original = Object.getOwnPropertyDescriptor(global, 'crypto');
  const encoder = global.TextEncoder;
  Object.defineProperty(global, 'crypto', { configurable: true, value: require('crypto').webcrypto });
  global.TextEncoder = require('util').TextEncoder;
  try {
    await reportFailure('save', { where: 'test.hash', eventId: 'Alice-personal-event' });
    expect(track.mock.calls[0][1].event_id_hash).toMatch(/^[a-f0-9]{16}$/);
    expect(captureError.mock.calls[0][1].tags.event_id_hash).toBe(track.mock.calls[0][1].event_id_hash);
  } finally {
    if (original) Object.defineProperty(global, 'crypto', original);
    else delete global.crypto;
    global.TextEncoder = encoder;
  }
});

test('the canonical local writer reports a real quota failure', async () => {
  const { saveCustomEvents } = require('../customEventStore');
  localStorage.clear();
  const original = Storage.prototype.setItem;
  const writer = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(function(key, value) {
    if (key === 'ngw-hostv2-custom-events') throw new Error('private event contents');
    return original.call(this, key, value);
  });
  try {
    expect(saveCustomEvents([{ id: 'Alice-event' }], { eventId: 'Alice-event' }).ok).toBe(false);
    await Promise.resolve();
    expect(captureError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ where: 'customEventStore.save', reason: 'write-failed' }));
    expect(JSON.stringify(captureError.mock.calls)).not.toMatch(/Alice|private event/);
  } finally { writer.mockRestore(); }
});

test('a configured provider HTTP failure reports while retaining its honest fallback', async () => {
  process.env.REACT_APP_API_BASE_URL = 'https://provider-mock.invalid';
  const { getFoodPriceFactor } = require('../foodPrices');
  global.fetch = jest.fn(async () => ({ ok: false, status: 503 }));
  const result = await getFoodPriceFactor({ state: 'MD', eventId: 'Alice-event' });
  expect(result.factor).toBe(1);
  expect(captureError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ where: 'foodPrices.get', reason: 'http-503' }));
  delete global.fetch;
});

test('a brief mint failure carries only a status class from the fixed set', async () => {
  await reportFailure('brief_mint', { where: 'hostv2.vendor-brief', reason: 'failed', statusClass: '5xx', eventId: 'Alice-personal-event' });
  expect(track.mock.calls[0][0]).toBe('brief_mint_failed');
  expect(track.mock.calls[0][1]).toMatchObject({ where: 'hostv2.vendor-brief', reason: 'failed', status_class: '5xx' });
  jest.clearAllMocks();
  await reportFailure('brief_mint', { where: 'hostv2.vendor-brief', reason: 'failed', statusClass: 'Alice 500 body' });
  expect(track.mock.calls[0][1]).not.toHaveProperty('status_class');
});
