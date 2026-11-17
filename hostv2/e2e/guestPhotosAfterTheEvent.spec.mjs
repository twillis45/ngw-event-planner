// ─── GUESTS' PHOTOS ON THE INVITE, AFTER THE EVENT (owner rulings B–E, 11/16) ─
//
//   B  Free, inside the caps; the HOST approves each photo; the server decides
//      when uploads open. The false recap line "Got photos? Share them so
//      everyone can relive it." is gone: an upload button when uploads are
//      open, "Photos open after the event." before that.
//   C  The upload screen says plainly what sharing means and that a post can't
//      be pulled back from here; "Keep my photos private to this event" is off
//      by default; a photo the server marks not shareable has NO Share button.
//   D  Share = copy the caption, then hand the photo FILE to the phone's share
//      sheet; "Caption copied — paste it in Instagram." Never "posted". Where
//      a browser can't hand over a file: "Download photo" + "Copy caption".
//   E  The host's hashtag shows quietly on the invite and rides the caption.
//
// The guest is a stranger on her own phone: the invite and the photo routes
// come from the (mocked) backend at the e2e bundle's fake host. Synthetic.
import { test, expect, dateIn } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const CODE = 'guest-photos-0000001';
const EVENT_ID = 'ev-guest-photos';
const EVENT = {
  id: EVENT_ID, name: 'Vida’s Friendsgiving', type: 'friendsgiving', date: dateIn(-2), startTime: '16:00',
  venue: 'Pine Street Commons', rsvpCode: CODE, hostNames: 'Vida Ramos', goingCount: 12, hashtag: '#VidasFriendsgiving2026',
};
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAAIAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCaiiivGPaP/9k=', 'base64');
const IMG = (id) => `${API}/img/${id}.jpg`;

const serve = async (page, { open = true, mine = [], approved = [], keepPrivate = false } = {}) => {
  const calls = { upload: [], privacy: [], del: [] };
  // THE BYTES, MEASURED WHERE BOTH ENGINES CAN SEE THEM (WebKit full run,
  // 11/17/2026). Playwright's WebKit interception reports a Blob or File body as
  // 0 bytes (probe: blob 0, file 0, arraybuffer 632; Chromium 632 for all
  // three) although the upload is sent. So the page records the size of the
  // body it hands to fetch; the route's own count stays primary where visible.
  await page.addInitScript(() => {
    const real = window.fetch;
    window.fetch = (u, o) => {
      if (String(u).includes('/api/public/photos/') && o && o.body instanceof Blob) window.__photoBytes = o.body.size;
      return real(u, o);
    };
  });
  let mineNow = [...mine];
  await page.route(`${API}/**`, (r) => r.fulfill({ status: 404, json: { detail: 'not found' } }));
  await page.route(`${API}/img/**`, (r) => r.fulfill({ status: 200, contentType: 'image/jpeg', body: JPEG }));
  await page.route(`${API}/api/public/invite/${CODE}`, (r) => r.fulfill({ status: 200, json: { ok: true, event: EVENT } }));
  await page.route(`${API}/api/public/invite/${CODE}/opened`, (r) => r.fulfill({ status: 200, json: { ok: true } }));
  await page.route(`${API}/api/public/photos/${CODE}/mine`, (r) => r.fulfill({ status: 200, json: {
    ok: true, photos: mineNow, remaining: 10 - mineNow.length, uploads_open: open, keep_private: keepPrivate } }));
  await page.route(`${API}/api/public/photos/${CODE}`, (r) => {
    if (r.request().method() === 'GET') return r.fulfill({ status: 200, json: { ok: true, photos: approved } });
    const h = r.request().headers();
    calls.upload.push({ key: h['x-guest-key'], name: decodeURIComponent(h['x-guest-name'] || ''), tz: h['x-guest-tz-offset'],
      private: h['x-guest-private'], type: h['content-type'], bytes: (r.request().postDataBuffer() || Buffer.alloc(0)).length });
    const p = { id: `p${mineNow.length + 1}`, status: 'pending', created_at: '2026-11-16T23:00:00Z', url: IMG(`p${mineNow.length + 1}`), shareable: false };
    mineNow = [p, ...mineNow];
    return r.fulfill({ status: 200, json: { ok: true, photo: p } });
  });
  await page.route(`${API}/api/public/photos/${CODE}/privacy`, (r) => {
    calls.privacy.push(r.request().postDataJSON());
    return r.fulfill({ status: 200, json: { ok: true, private: r.request().postDataJSON().private } });
  });
  await page.route(`${API}/api/public/photos/${CODE}/*/delete`, (r) => {
    calls.del.push(r.request().url());
    mineNow = mineNow.slice(1);
    return r.fulfill({ status: 200, json: { ok: true, deleted: true } });
  });
  return calls;
};

// A phone's share sheet that can take files, recorded instead of opened.
const phoneShare = (page) => page.addInitScript(() => {
  window.__shared = []; window.__clip = [];
  Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: (d) => !!(d && d.files && d.files.length) });
  Object.defineProperty(Navigator.prototype, 'share', { configurable: true, value: async (d) => {
    window.__shared.push({ text: d.text, url: d.url, files: (d.files || []).map((f) => ({ name: f.name, type: f.type, size: f.size })) });
  } });
  Object.defineProperty(Navigator.prototype, 'clipboard', { configurable: true, get: () => ({ writeText: async (t) => { window.__clip.push(t); } }) });
});
const desktopShare = (page) => page.addInitScript(() => {
  window.__clip = [];
  Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: () => false });
  Object.defineProperty(Navigator.prototype, 'clipboard', { configurable: true, get: () => ({ writeText: async (t) => { window.__clip.push(t); } }) });
});

const open = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('?rsvp=' + CODE);
  await expect(page.locator('[data-guest-photos]')).toBeVisible();
};

test('the recap tells the truth about photos and the old promise is gone', async ({ page }) => {
  await serve(page);
  await open(page);
  await expect(page.getByText('Got photos? Share them so everyone can relive it.')).toHaveCount(0);
  await expect(page.locator('[data-recap-add-photos]')).toHaveText('Add your photos');
  await expect(page.locator('[data-invite-hashtag]')).toHaveText('#VidasFriendsgiving2026');
});

test('before uploads open, both places say "Photos open after the event." and offer no upload', async ({ page }) => {
  await serve(page, { open: false });
  await open(page);
  await expect(page.locator('[data-photos-closed]')).toHaveText('Photos open after the event.');
  await expect(page.locator('[data-recap-photos-closed]')).toHaveText('Photos open after the event.');
  await expect(page.locator('[data-photo-input]')).toHaveCount(0);
  await expect(page.locator('[data-recap-add-photos]')).toHaveCount(0);
});

test('the upload screen says what sharing means; "keep private" starts off; an upload carries her choice and zone', async ({ page }) => {
  const calls = await serve(page);
  await open(page);
  const card = page.locator('[data-guest-photos]');
  await expect(card.locator('[data-photo-consent]')).toHaveText('Approved photos can be shared by your host and other guests. Once someone shares a photo to Instagram or Facebook, deleting it here doesn’t remove that post.');
  const keep = card.locator('[data-keep-private]');
  await expect(keep).toContainText('Keep my photos private to this event');
  await expect(keep.getByRole('checkbox')).not.toBeChecked();

  await card.getByRole('textbox', { name: 'Name to go with your photos' }).fill('Ana Ruiz');
  await card.locator('[data-photo-input]').setInputFiles({ name: 'pie.jpg', mimeType: 'image/jpeg', buffer: JPEG });
  await expect(card.locator('[data-photos-status]')).toContainText('your host approves each one before other guests see it');
  expect(calls.upload).toHaveLength(1);
  expect(calls.upload[0]).toMatchObject({ name: 'Ana Ruiz', private: '0', type: 'image/jpeg' });
  expect(calls.upload[0].tz).toMatch(/^-?\d+$/);
  expect(calls.upload[0].key.length).toBeGreaterThanOrEqual(16);
  expect(calls.upload[0].bytes || await page.evaluate(() => window.__photoBytes || 0)).toBe(JPEG.length);
  // Her photo, with what it is waiting for — never a bare "pending": a
  // "Waiting" badge on the tile, and the full sentence in its name and viewer.
  const tile = card.locator('[data-my-photos] .photo-tile-btn');
  await expect(tile).toHaveCount(1);
  await expect(tile).toHaveAttribute('aria-label', 'Your photo 1: Waiting for your host to approve it');
  await expect(tile.locator('.photo-badge')).toHaveText('Waiting');
  await expect(card).not.toContainText(/\bpending\b/i);

  // The switch, with a photo already there, goes to the server.
  await keep.click();
  await expect.poll(() => calls.privacy.length).toBe(1);
  expect(calls.privacy[0]).toMatchObject({ private: true });
});

test('Share copies the caption, then hands the photo FILE to the share sheet; a kept-back photo has no Share button', async ({ page }) => {
  await phoneShare(page);
  await serve(page, { approved: [
    { id: 'a1', url: IMG('a1'), thumb: IMG('a1t'), created_at: '2026-11-16T23:00:00Z', shareable: true },
    { id: 'a2', url: IMG('a2'), thumb: IMG('a2t'), created_at: '2026-11-16T23:05:00Z', shareable: false },
  ] });
  await open(page);
  const gallery = page.locator('[data-approved-photos]');
  // THE GRID IS PICTURES ONLY (11/16/2026): small thumbnails, no buttons under them.
  await expect(gallery.locator('.photo-tile')).toHaveCount(2);
  await expect(gallery.locator('img').first()).toHaveAttribute('src', IMG('a1t'));
  await expect(gallery.locator('[data-photo-share]')).toHaveCount(0);
  await gallery.locator('.photo-tile-btn').first().click();
  const viewer = page.locator('[data-photo-viewer]');
  await expect(viewer).toBeVisible();
  await expect(viewer.locator('img.pv-full')).toHaveAttribute('src', IMG('a1'));   // the full photo, not the thumbnail
  await viewer.locator('[data-photo-share]').click();
  await expect(viewer.locator('[data-viewer-status]')).toHaveText('Caption copied — paste it in Instagram.');
  const shared = await page.evaluate(() => window.__shared);
  const clip = await page.evaluate(() => window.__clip);
  expect(clip).toEqual(['Vida’s Friendsgiving #VidasFriendsgiving2026']);
  expect(shared).toHaveLength(1);
  expect(shared[0].text).toBe('Vida’s Friendsgiving #VidasFriendsgiving2026');
  expect(shared[0].files).toHaveLength(1);
  expect(shared[0].files[0].type).toBe('image/jpeg');
  expect(shared[0].files[0].size).toBe(JPEG.length);
  // The next photo was kept back: no Share, and the viewer says why.
  await page.keyboard.press('ArrowRight');
  await expect(viewer.locator('[data-pv-count]')).toHaveText('2 of 2');
  await expect(viewer.locator('[data-photo-share]')).toHaveCount(0);
  await expect(viewer).toContainText('Kept to this event — no sharing.');
  await expect(page.locator('body')).not.toContainText(/\bposted\b/i);
});

test('where a browser can’t hand over a file: "Download photo" and "Copy caption"', async ({ page }) => {
  await desktopShare(page);
  await serve(page, { approved: [{ id: 'a1', url: IMG('a1'), created_at: '2026-11-16T23:00:00Z', shareable: true }] });
  await open(page);
  await page.locator('[data-approved-photos] .photo-tile-btn').first().click();
  const viewer = page.locator('[data-photo-viewer]');
  await expect(viewer.locator('[data-photo-share]')).toHaveCount(0);
  await expect(viewer.getByRole('button', { name: 'Download photo' })).toBeVisible();
  await viewer.getByRole('button', { name: 'Copy caption' }).click();
  await expect(viewer.locator('[data-viewer-status]')).toHaveText('Caption copied.');
  expect(await page.evaluate(() => window.__clip)).toEqual(['Vida’s Friendsgiving #VidasFriendsgiving2026']);
});

test('at 390px the wall is three-up, the viewer fills the screen and swipes, and nothing runs off the side', async ({ page }) => {
  await phoneShare(page);
  await serve(page, {
    mine: [{ id: 'm1', status: 'approved', created_at: '2026-11-16T23:00:00Z', url: IMG('m1'), shareable: true }],
    approved: ['a1', 'a2', 'a3', 'a4'].map((id, i) => ({ id, url: IMG(id), thumb: IMG(id + 't'), created_at: `2026-11-16T23:0${i}:00Z`, shareable: true })),
  });
  await open(page);
  const tiles = page.locator('[data-approved-photos] .photo-tile-btn');
  const [a, b, c, d] = await Promise.all([0, 1, 2, 3].map((n) => tiles.nth(n).boundingBox()));
  expect(Math.abs(a.y - c.y)).toBeLessThan(1);           // three on the first row…
  expect(d.y).toBeGreaterThan(a.y + a.height - 1);       // …and the fourth wraps
  expect(Math.abs(a.width - a.height)).toBeLessThan(1);  // square tiles
  expect(b.x).toBeGreaterThan(a.x + a.width - 1);
  await expect(page.locator('[data-approved-photos]').locator('..')).toContainText('From everyone · 4');
  const small = await page.evaluate(() => [...document.querySelectorAll('[data-guest-photos] button, [data-guest-photos] label.cta, [data-guest-photos] label.guest-optin')]
    .map((n) => n.getBoundingClientRect()).filter((r) => r.width && (r.height < 44 || r.width < 44)).length);
  expect(small).toBe(0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.locator('[data-my-photos] .photo-tile-btn')).toHaveAttribute('aria-label', 'Your photo 1: Approved — other guests can see it');

  // The viewer: the whole screen, a count, swipe to the next, Escape back.
  await tiles.nth(0).click();
  const viewer = page.locator('[data-photo-viewer]');
  const box = await viewer.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(389); expect(box.height).toBeGreaterThanOrEqual(843);
  await expect(viewer.locator('[data-pv-count]')).toHaveText('1 of 4');
  const stage = await viewer.locator('.pv-stage').boundingBox();
  const y = stage.y + stage.height / 2;
  await page.mouse.move(stage.x + stage.width * 0.8, y); await page.mouse.down();
  await page.mouse.move(stage.x + stage.width * 0.2, y, { steps: 6 }); await page.mouse.up();
  await expect(viewer.locator('[data-pv-count]')).toHaveText('2 of 4');
  await expect(viewer.locator('img.pv-full')).toHaveAttribute('src', IMG('a2'));
  const acts = await page.evaluate(() => [...document.querySelectorAll('[data-photo-viewer] button')]
    .filter((n) => n.offsetParent).map((n) => n.getBoundingClientRect()).filter((r) => r.height < 44 || r.width < 44).length);
  expect(acts).toBe(0);
  await page.keyboard.press('Escape');
  await expect(viewer).toHaveCount(0);
  await expect(tiles.nth(0)).toBeFocused();               // focus returns to where she was
});
