// Live check, 11/19/2026: the invite batch emailed three alias guests and Resend
// delivered all of them, but the screen said "3 didn't go out". The server
// returns the message row with `metadata` as JSON TEXT (the pool has no jsonb
// codec), so `res.metadata.delivery` was always undefined and every real send
// read as a failure — the invite batch, the one-guest send and "Send it to" a
// vendor alike. createMessage now hands back the metadata as an object.
process.env.REACT_APP_API_BASE_URL = 'https://api.example.test';
jest.mock('../supabaseClient', () => ({ supabase: null, isSupabaseConfigured: () => false }));

const { commApi } = require('../commApi');

const reply = (metadata) => { global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: 'm1', metadata }) })); };

test('metadata the server sends as JSON text is read as the object it is', async () => {
  reply(JSON.stringify({ delivery: { status: 'accepted', provider: 'resend' } }));
  const res = await commApi.createMessage('e1', 'CLIENT', { body: 'hi' });
  expect(res.metadata.delivery.status).toBe('accepted');
});

test('metadata already an object is left as it is, and junk is not a delivery', async () => {
  reply({ delivery: { status: 'failed', error: 'bounced' } });
  expect((await commApi.createMessage('e1', 'CLIENT', {})).metadata.delivery.error).toBe('bounced');
  reply('not json');
  expect((await commApi.createMessage('e1', 'CLIENT', {})).metadata).toEqual({});
});
