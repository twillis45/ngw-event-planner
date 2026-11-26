// ─── THE GUEST PHOTOS CLIENT NAMES ITS FAILURES ──────────────────────────────
//
// Mirrors guestMessages/helperLink API tests. Writes THROW so a page never says
// "Shared" for a photo the server refused; reads return a named result so a
// refused request is never shown as an empty album.
jest.mock('../apiAuth', () => ({ authHeaders: async () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer t' }), isSignedIn: async () => true }));

const API = 'https://guest-photos-mock.invalid';
const CODE = 'abcdefghij1234567890xy';
const KEY = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PID = '9b2f0c1e-1111-4222-8333-444455556666';
const reply = (status, body = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

describe('guest photos client — not configured', () => {
  let mod;
  beforeEach(() => { delete process.env.REACT_APP_API_BASE_URL; jest.isolateModules(() => { mod = require('../api/guestPhotos'); }); });

  test('nothing is fetched; reads name it, writes throw', async () => {
    global.fetch = jest.fn();
    expect(mod.isGuestPhotosApiConfigured()).toBe(false);
    await expect(mod.fetchMyGuestPhotos(CODE, KEY)).resolves.toEqual({ ok: false, reason: 'not-configured' });
    await expect(mod.fetchApprovedGuestPhotos(CODE)).resolves.toEqual({ ok: false, reason: 'not-configured' });
    await expect(mod.fetchEventGuestPhotos('e1')).resolves.toEqual({ ok: false, reason: 'not-configured' });
    await expect(mod.uploadGuestPhoto(CODE, { guestKey: KEY, name: 'Jordan', file: new Blob(['x']) })).rejects.toThrow();
    await expect(mod.approveGuestPhoto('e1', PID)).rejects.toThrow();
    expect(global.fetch).not.toHaveBeenCalled();
    delete global.fetch;
  });
});

describe('guest photos client — configured', () => {
  let mod;
  beforeEach(() => {
    process.env.REACT_APP_API_BASE_URL = API;
    jest.isolateModules(() => { mod = require('../api/guestPhotos'); });
  });
  afterEach(() => { delete process.env.REACT_APP_API_BASE_URL; delete global.fetch; });

  test('upload sends the raw file with the device key and an encoded name', async () => {
    const photo = { id: PID, status: 'pending', created_at: '2026-11-16T12:00:00Z', url: 'https://signed' };
    global.fetch = jest.fn(async () => reply(200, { ok: true, photo }));
    const file = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
    await expect(mod.uploadGuestPhoto(CODE, { guestKey: KEY, name: 'Zoë Park', file })).resolves.toEqual({ ok: true, photo });
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe(API + '/api/public/photos/' + CODE);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(file);
    expect(init.headers['Content-Type']).toBe('image/jpeg');
    expect(init.headers['X-Guest-Key']).toBe(KEY);
    expect(decodeURIComponent(init.headers['X-Guest-Name'])).toBe('Zoë Park');
  });

  test('a refused upload THROWS with the status and the server message', async () => {
    global.fetch = jest.fn(async () => reply(415, { detail: "HEIC photos can't be shared here yet." }));
    const err = await mod.uploadGuestPhoto(CODE, { guestKey: KEY, name: 'J', file: new Blob(['x'], { type: 'image/heic' }) })
      .catch((e) => e);
    expect(err.status).toBe(415);
    expect(err.message).toMatch(/HEIC/);
    for (const status of [403, 413, 429, 503]) {
      global.fetch = jest.fn(async () => reply(status, {}));
      await expect(mod.uploadGuestPhoto(CODE, { guestKey: KEY, name: 'J', file: new Blob(['x']) }))
        .rejects.toMatchObject({ status });
    }
  });

  test('her own photos come back with status, remaining and whether sharing is open', async () => {
    global.fetch = jest.fn(async () => reply(200, { ok: true, photos: [{ id: PID, status: 'pending' }], remaining: 9, uploads_open: true }));
    await expect(mod.fetchMyGuestPhotos(CODE, KEY)).resolves.toEqual({
      ok: true, photos: [{ id: PID, status: 'pending' }], remaining: 9, uploadsOpen: true, keepPrivate: false });
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe(API + '/api/public/photos/' + CODE + '/mine');
    const sent = JSON.parse(init.body);
    expect(sent.guest_key).toBe(KEY);
    expect(Number.isInteger(sent.tz_offset_min)).toBe(true);   // this machine's own zone by default
  });

  test('reads name their failures instead of looking empty', async () => {
    global.fetch = jest.fn(async () => reply(404, {}));
    await expect(mod.fetchMyGuestPhotos(CODE, KEY)).resolves.toEqual({ ok: false, reason: 'not-found' });
    await expect(mod.fetchApprovedGuestPhotos(CODE)).resolves.toEqual({ ok: false, reason: 'not-found' });
    global.fetch = jest.fn(async () => { throw new TypeError('offline'); });
    await expect(mod.fetchApprovedGuestPhotos(CODE)).resolves.toEqual({ ok: false, reason: 'unavailable' });
    for (const [status, reason] of [[401, 'signed-out'], [403, 'forbidden'], [500, 'unavailable']]) {
      global.fetch = jest.fn(async () => reply(status, {}));
      await expect(mod.fetchEventGuestPhotos('e1')).resolves.toEqual({ ok: false, reason });
    }
  });

  test('deleting her own: gone is ok, not-hers is deleted:false, a server failure throws', async () => {
    global.fetch = jest.fn(async () => reply(200, { ok: true, deleted: true }));
    await expect(mod.deleteMyGuestPhoto(CODE, KEY, PID)).resolves.toEqual({ ok: true, deleted: true });
    expect(global.fetch.mock.calls[0][0]).toBe(API + '/api/public/photos/' + CODE + '/' + PID + '/delete');
    global.fetch = jest.fn(async () => reply(404, {}));
    await expect(mod.deleteMyGuestPhoto(CODE, KEY, PID)).resolves.toEqual({ ok: true, deleted: false });
    global.fetch = jest.fn(async () => reply(502, {}));
    await expect(mod.deleteMyGuestPhoto(CODE, KEY, PID)).rejects.toMatchObject({ status: 502 });
  });

  test('host actions carry the session and hit the event-scoped routes', async () => {
    global.fetch = jest.fn(async () => reply(200, { ok: true, photos: [], event_max: 300 }));
    await expect(mod.fetchEventGuestPhotos('e1')).resolves.toEqual({ ok: true, photos: [], eventMax: 300 });
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer t');
    global.fetch = jest.fn(async () => reply(200, { ok: true }));
    await mod.approveGuestPhoto('e1', PID);
    await mod.hideGuestPhoto('e1', PID);
    await mod.deleteGuestPhoto('e1', PID);
    const calls = global.fetch.mock.calls.map(([u, i]) => `${i.method} ${u.replace(API, '')}`);
    expect(calls).toEqual([
      `POST /api/events/e1/guest-photos/${PID}/approve`,
      `POST /api/events/e1/guest-photos/${PID}/hide`,
      `DELETE /api/events/e1/guest-photos/${PID}`,
    ]);
    global.fetch = jest.fn(async () => reply(403, {}));
    await expect(mod.approveGuestPhoto('e1', PID)).rejects.toMatchObject({ status: 403 });
  });

  // ── Owner rulings 11/16/2026: the window opens at the event's end in the
  // guest's zone, and the board's consent switches (option C). ──
  test('upload and her own list carry this phone’s zone, and the private switch rides the upload', async () => {
    global.fetch = jest.fn(async () => reply(200, { ok: true, photo: { id: PID } }));
    await mod.uploadGuestPhoto(CODE, { guestKey: KEY, name: 'J', file: new Blob(['x'], { type: 'image/jpeg' }), tzOffsetMin: 300, keepPrivate: true });
    expect(global.fetch.mock.calls[0][1].headers['X-Guest-Tz-Offset']).toBe('300');
    expect(global.fetch.mock.calls[0][1].headers['X-Guest-Private']).toBe('1');
    global.fetch = jest.fn(async () => reply(200, { ok: true, photo: { id: PID } }));
    await mod.uploadGuestPhoto(CODE, { guestKey: KEY, name: 'J', file: new Blob(['x'], { type: 'image/jpeg' }) });
    expect(global.fetch.mock.calls[0][1].headers['X-Guest-Private']).toBe('0');
    expect(global.fetch.mock.calls[0][1].headers['X-Guest-Tz-Offset']).toMatch(/^-?\d+$/);   // this machine's own

    global.fetch = jest.fn(async () => reply(200, { ok: true, photos: [{ id: PID, shareable: true }], remaining: 9, uploads_open: false, keep_private: true }));
    await expect(mod.fetchMyGuestPhotos(CODE, KEY, { tzOffsetMin: 480 })).resolves.toEqual({
      ok: true, photos: [{ id: PID, shareable: true }], remaining: 9, uploadsOpen: false, keepPrivate: true });
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ guest_key: KEY, tz_offset_min: 480 });
  });

  test('"Keep my photos private" and the host’s "Don’t allow sharing" hit their routes and throw on refusal', async () => {
    global.fetch = jest.fn(async () => reply(200, { ok: true, private: true }));
    await expect(mod.setMyPhotosPrivate(CODE, KEY, true)).resolves.toEqual({ ok: true, private: true });
    expect(global.fetch.mock.calls[0][0]).toBe(API + '/api/public/photos/' + CODE + '/privacy');
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ guest_key: KEY, private: true });

    global.fetch = jest.fn(async () => reply(200, { ok: true, photo: { id: PID, share_blocked: true } }));
    await mod.setGuestPhotoSharing('e1', PID, false);
    const [url, init] = global.fetch.mock.calls[0];
    expect(`${init.method} ${url.replace(API, '')}`).toBe(`POST /api/events/e1/guest-photos/${PID}/sharing`);
    expect(JSON.parse(init.body)).toEqual({ allowed: false });
    expect(init.headers.Authorization).toBe('Bearer t');

    global.fetch = jest.fn(async () => reply(404, {}));
    await expect(mod.setMyPhotosPrivate(CODE, KEY, true)).rejects.toMatchObject({ status: 404 });
    await expect(mod.setGuestPhotoSharing('e1', PID, true)).rejects.toMatchObject({ status: 404 });
  });
});
