// Issue #100, D-8: a revoked session made the host's guest list read "No reply"
// for everyone, because the read-back mapped a 401 to []. readEventRsvps keeps
// the reason; fetchEventRsvps (still used by the frozen CRA shell) keeps [].
let mockToken = 'tok';
jest.mock('../../supabaseClient', () => ({
  isSupabaseConfigured: () => true,
  supabase: { auth: { getSession: async () => ({ data: { session: mockToken ? { access_token: mockToken } : null } }) } },
}));
const load = () => { jest.resetModules(); process.env.REACT_APP_API_BASE_URL = 'https://api.test'; return require('../rsvp'); };
afterEach(() => { delete global.fetch; mockToken = 'tok'; });
const respond = (status, body = []) => { global.fetch = async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }); };

test('a 401 is "signed-out", not an empty list', async () => {
  respond(401, { detail: 'Planner authentication required' });
  expect(await load().readEventRsvps('e1')).toEqual({ ok: false, reason: 'signed-out' });
});
test('no session at all is "signed-out" without a request', async () => {
  mockToken = null; let called = false; global.fetch = async () => { called = true; return { ok: true, status: 200, json: async () => [] }; };
  expect(await load().readEventRsvps('e1')).toEqual({ ok: false, reason: 'signed-out' });
  expect(called).toBe(false);
});
test('a 403 is "forbidden"', async () => {
  respond(403, { detail: "You don't have access to this event." });
  expect((await load().readEventRsvps('e1')).reason).toBe('forbidden');
});
test('a 5xx or offline is "unavailable"', async () => {
  respond(500, {});
  expect((await load().readEventRsvps('e1')).reason).toBe('unavailable');
  global.fetch = async () => { throw new TypeError('Failed to fetch'); };
  expect((await load().readEventRsvps('e1')).reason).toBe('unavailable');
});
test('rows come back on success, and an empty list is a real empty list', async () => {
  respond(200, [{ guest_name: 'Ava', rsvp: 'Yes' }]);
  expect(await load().readEventRsvps('e1')).toEqual({ ok: true, rows: [{ guest_name: 'Ava', rsvp: 'Yes' }] });
  respond(200, []);
  expect(await load().readEventRsvps('e1')).toEqual({ ok: true, rows: [] });
});
test('the legacy read still returns [] on failure', async () => {
  respond(401, {});
  expect(await load().fetchEventRsvps('e1')).toEqual([]);
});
