// THE CACHE BROUGHT IT BACK (live smoke test, 11/9/2026). After a real account
// deletion the owner's event still showed: every event loaded from the account
// is cached in 'ngw-events' and read back at boot. forgetAccountCache takes the
// account's copies out and leaves plans saved only on this device.
jest.mock('../../supabaseClient', () => ({ isSupabaseConfigured: () => false, supabase: null }));
const { forgetAccountCache } = require('../events');

const cache = () => JSON.parse(localStorage.getItem('ngw-events') || '[]').map((e) => e.id);
beforeEach(() => localStorage.clear());

test('drops the named ids and every copy that came from the account, keeps device-only plans', () => {
  localStorage.setItem('ngw-events', JSON.stringify([
    { id: 'named', name: 'Named' },
    { id: 'from-cloud', name: 'Loaded', _cloudUpdatedAt: '2026-11-08T12:00:00Z' },
    { id: 'device-only', name: 'Only here' },
  ]));
  expect(forgetAccountCache(['named'])).toBe(2);
  expect(cache()).toEqual(['device-only']);
});

test('an empty or unreadable cache is left alone', () => {
  expect(forgetAccountCache(['x'])).toBe(0);
  expect(localStorage.getItem('ngw-events')).toBeNull();
  localStorage.setItem('ngw-events', '{broken');
  expect(forgetAccountCache(['x'])).toBe(0);
  expect(localStorage.getItem('ngw-events')).toBe('{broken');
});
