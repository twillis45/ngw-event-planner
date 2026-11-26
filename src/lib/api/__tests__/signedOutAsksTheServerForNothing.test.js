// SIGNED OUT ASKS THE SERVER FOR NOTHING (live check of 2981924, 11/26/2026).
// Signed out, hostv2 and hostv4 asked for guest-threads (every plan open and
// window focus), invite-opens, announcements, guest-photos, communication/sent
// and stripe/pass. With no account token the server can only answer 401, and
// every caller already reads that as "signed out". So the reads now return
// that same answer without a request: one rule in the API layer, every screen.
// With a token they ask exactly as before.
let mockSession = null;
let mockConfigured = true;
jest.mock('../../supabaseClient', () => ({
  isSupabaseConfigured: () => mockConfigured,
  supabase: { auth: { getSession: async () => ({ data: { session: mockSession } }) } },
}));
jest.mock('../../sentry', () => ({ captureError: () => {} }));

process.env.REACT_APP_API_BASE_URL = 'https://api.example.test';
const { fetchGuestThreads, fetchInviteOpens, fetchGuestThread } = require('../guestMessages');
const { fetchEventGuestPhotos } = require('../guestPhotos');
const { listAnnouncements } = require('../announcements');
const { listSentMessages } = require('../../commApi');
const { fetchEventPass } = require('../../stripeApi');

const ok = (body) => ({ ok: true, status: 200, json: async () => body });
beforeEach(() => { global.fetch = jest.fn(async () => ok({})); });

describe('signed out, the host reads ask the server for nothing', () => {
  beforeEach(() => { mockSession = null; });
  it('guest-threads, one thread and invite-opens answer signed-out', async () => {
    expect(await fetchGuestThreads('e1')).toEqual({ ok: false, reason: 'signed-out' });
    expect(await fetchGuestThread('e1', 't1')).toEqual({ ok: false, reason: 'signed-out' });
    expect(await fetchInviteOpens('e1')).toEqual({ ok: false, reason: 'signed-out' });
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('guest-photos, announcements and the sent log answer signed-out', async () => {
    expect(await fetchEventGuestPhotos('e1')).toEqual({ ok: false, reason: 'signed-out' });
    expect(await listAnnouncements('e1')).toEqual({ ok: false, status: 401, reason: 'signed-out' });
    expect(await listSentMessages('e1')).toEqual({ status: 'signed-out' });
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('the pass lookup throws as a 401 does, so a paid pass is never read as revoked', async () => {
    await expect(fetchEventPass('e1')).rejects.toThrow('Pass lookup error 401');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('signed in, the same reads ask the server', () => {
  beforeEach(() => { mockSession = { access_token: 'tok' }; });
  it('each read makes one request with the token', async () => {
    global.fetch = jest.fn(async () => ok({ guests: [], days: [], photos: [], emails: [], limits: {}, announcements: [] }));
    await fetchGuestThreads('e1'); await fetchInviteOpens('e1'); await fetchEventGuestPhotos('e1');
    await listAnnouncements('e1'); await listSentMessages('e1'); await fetchEventPass('e1');
    expect(global.fetch).toHaveBeenCalledTimes(6);
    for (const [, init] of global.fetch.mock.calls) expect(init.headers.Authorization).toBe('Bearer tok');
  });
});

// A build with no account system at all (the e2e suite: a fake API host, every
// route mocked, no Supabase) can't know who is signed in, so it asks as it
// always did and the server decides. Only a build WITH accounts and nobody
// signed in skips the request (CI, #277: the e2e Updates sheet went blank).
describe('a build without accounts still asks', () => {
  beforeEach(() => { mockConfigured = false; mockSession = null; });
  afterEach(() => { mockConfigured = true; });
  it('reads go to the server, which decides', async () => {
    global.fetch = jest.fn(async () => ok({ guests: [], days: [], photos: [], emails: [], limits: {}, announcements: [] }));
    await fetchGuestThreads('e1'); await fetchInviteOpens('e1'); await fetchEventGuestPhotos('e1');
    await listAnnouncements('e1'); await listSentMessages('e1'); await fetchEventPass('e1');
    expect(global.fetch).toHaveBeenCalledTimes(6);
  });
});
