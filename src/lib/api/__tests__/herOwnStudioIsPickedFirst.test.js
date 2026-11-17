// Security self-test M5 (11/17/2026): with two owner memberships, currentStudioId
// took the first row in whatever order Postgres returned. The query now asks for
// the oldest membership first, so her own studio (made at sign-up) wins.
const calls = [];
const rows = [
  { studio_id: '10000000-0000-0000-0000-000000000001', role: 'owner', created_at: '2026-01-01' },
  { studio_id: '20000000-0000-0000-0000-000000000002', role: 'owner', created_at: '2026-11-17' },
];
jest.mock('../../supabaseClient', () => {
  const chain = {
    select() { calls.push('select'); return chain; },
    eq() { calls.push('eq'); return chain; },
    order(col, opts) {
      calls.push(['order', col, opts]);
      const sorted = [...rows].sort((a, b) => (opts && opts.ascending === false ? -1 : 1) * a.created_at.localeCompare(b.created_at));
      return Promise.resolve({ data: sorted, error: null });
    },
    then(res) { return Promise.resolve({ data: [...rows].reverse(), error: null }).then(res); },
  };
  return {
    isSupabaseConfigured: () => true,
    supabase: {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u-1' } } } }) },
      from: () => chain,
      rpc: async () => ({ data: null, error: null }),
    },
  };
});

test('the oldest owner membership is picked, whatever order the database returns', async () => {
  const { currentStudioId } = require('../studio');
  expect(await currentStudioId()).toBe('10000000-0000-0000-0000-000000000001');
  expect(calls).toContainEqual(['order', 'created_at', { ascending: true }]);
});
