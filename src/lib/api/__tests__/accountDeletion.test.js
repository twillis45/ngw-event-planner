// Issue #100, D-12: the app had no way to call DELETE /api/account, which both
// app stores require. These pin the client's contract against the backend's
// real responses (captured 11/5/2026 on a local stack): it only reports success
// on {deleted: true}, it sends the typed confirmation as-is, and every failure
// says plainly that the account was NOT deleted.
jest.mock('../../supabaseClient', () => ({
  isSupabaseConfigured: () => true,
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) } },
}));

const load = () => { jest.resetModules(); process.env.REACT_APP_API_BASE_URL = 'https://api.test'; return require('../account'); };
afterEach(() => { delete global.fetch; });

test('success only on the server saying deleted:true, with retained categories passed through', async () => {
  const calls = [];
  global.fetch = async (url, init) => { calls.push({ url, init }); return { ok: true, json: async () => ({ deleted: true, retained_categories: ['payment_receipts'] }) }; };
  const r = await load().deleteAccount('DELETE');
  expect(r).toEqual({ ok: true, retained: ['payment_receipts'] });
  expect(calls[0].url).toBe('https://api.test/api/account');
  expect(calls[0].init.method).toBe('DELETE');
  expect(calls[0].init.headers.Authorization).toBe('Bearer tok');
  expect(JSON.parse(calls[0].init.body)).toEqual({ confirmation: 'DELETE' });
});

test('the server refusing a wrong confirmation is reported, not swallowed', async () => {
  global.fetch = async () => ({ ok: false, json: async () => ({ detail: { code: 'confirmation_required', message: 'Type DELETE to confirm account deletion.' } }) });
  const r = await load().deleteAccount('delete');
  expect(r.ok).toBe(false);
  expect(r.message).toBe('Type DELETE to confirm account deletion.');
});

test('a 200 without deleted:true is not success', async () => {
  global.fetch = async () => ({ ok: true, json: async () => ({}) });
  expect((await load().deleteAccount('DELETE')).ok).toBe(false);
});

test('offline says the account was not deleted', async () => {
  global.fetch = async () => { throw new TypeError('Failed to fetch'); };
  const r = await load().deleteAccount('DELETE');
  expect(r.ok).toBe(false);
  expect(r.message).toMatch(/not deleted/);
});
