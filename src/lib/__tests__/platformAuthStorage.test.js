let storage;
beforeEach(() => { jest.resetModules(); storage = require('../platformAuthStorage'); });

test('web authentication keeps the existing browser storage', () => {
  expect(storage.getPlatformAuthStorage()).toBe(window.localStorage);
});

test('native bootstrap supplies its secure asynchronous storage before auth starts', async () => {
  const adapter = { getItem: jest.fn(async () => 'session'), setItem: jest.fn(async () => {}), removeItem: jest.fn(async () => {}) };
  storage.installPlatformAuthStorage(adapter);
  expect(storage.getPlatformAuthStorage()).toBe(adapter);
  await expect(storage.getPlatformAuthStorage().getItem('session-key')).resolves.toBe('session');
});

test('an incomplete native adapter cannot silently fall back to browser token storage', () => {
  expect(() => storage.installPlatformAuthStorage({ getItem: () => null })).toThrow('authentication storage');
});
