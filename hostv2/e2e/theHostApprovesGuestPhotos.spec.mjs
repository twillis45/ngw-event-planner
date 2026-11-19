// ─── THE HOST APPROVES GUESTS' PHOTOS IN THE GUEST LIST (11/16/2026) ─────────
//
// Owner rulings B–D and the board's option C. Host side: a "Guest photos"
// section in the existing Guest list sheet (no new tab), waiting-for-approval
// first; Approve / Hide / Delete; "Don't allow sharing" per approved photo; a
// photo its uploader kept private offers no sharing control and no Share
// button. After the event, one line on the event home —
// "N guest photos waiting for you to approve" — opens that section.
//
// The API is mocked at the e2e bundle's fake host. Everything is synthetic.
import { test, expect, settled, sheetSettled, dateIn, openSectionByName } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const EVENT_ID = 'gp-e2e';
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAAIAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCaiiivGPaP/9k=', 'base64');

const EVENT = {
  id: EVENT_ID, name: 'Vida’s Friendsgiving', type: 'friendsgiving', createdAt: '2026-11-01',
  guestMode: 'list', venue: 'Pine Street Commons', startTime: '16:00', startTimeSource: 'host', hostName: 'Vida Ramos',
  rsvpCode: 'gp-e2e-code-000000001', hashtag: '#VidasFriendsgiving2026',
  guests: [{ id: 'g1', name: 'Ana Ruiz', rsvp: 'Yes' }], vendors: [], budget: [], timeline: [],
};

const boot = (page) => page.addInitScript(([ev, iso]) => {
  localStorage.setItem('ngw-events', JSON.stringify([{ ...ev, date: iso }]));
  localStorage.setItem('ngw-hostv2-last-event', ev.id);
  localStorage.setItem('ngw-v2-splash-seen', '1');
  localStorage.setItem('ngw-welcomed', '1');
  localStorage.setItem('ngw-v2-welcomed', '1');
  localStorage.setItem('ngw-profile', JSON.stringify({ name: 'Vida Ramos' }));
}, [EVENT, dateIn(-2)]);

const photo = (id, status, extra = {}) => ({
  id, guest_name: 'Ana Ruiz', status, created_at: '2026-11-16T23:00:00Z', reviewed_at: null, width: 8, height: 8,
  url: `${API}/img/${id}.jpg`, uploader_private: false, share_blocked: false, shareable: status === 'approved', ...extra,
});

const mock = async (page, photos) => {
  const calls = [];
  let list = photos.map((p) => ({ ...p }));
  await page.route(`${API}/img/**`, (r) => r.fulfill({ status: 200, contentType: 'image/jpeg', body: JPEG }));
  await page.route(`${API}/api/events/${EVENT_ID}/guest-photos`, (r) => r.fulfill({ status: 200, json: { ok: true, photos: list, event_max: 300 } }));
  await page.route(`${API}/api/events/${EVENT_ID}/guest-photos/*/*`, (r) => {
    const [, id, act] = /guest-photos\/([^/]+)\/([^/?]+)/.exec(r.request().url());
    calls.push(`${act} ${id} ${r.request().postData() || ''}`.trim());
    list = list.map((p) => {
      if (p.id !== id) return p;
      if (act === 'approve') return { ...p, status: 'approved', shareable: !p.uploader_private && !p.share_blocked };
      if (act === 'hide') return { ...p, status: 'hidden', shareable: false };
      if (act === 'sharing') { const blocked = !r.request().postDataJSON().allowed; return { ...p, share_blocked: blocked, shareable: p.status === 'approved' && !p.uploader_private && !blocked }; }
      return p;
    });
    return r.fulfill({ status: 200, json: { ok: true, photo: list.find((p) => p.id === id) } });
  });
  await page.route(`${API}/api/events/${EVENT_ID}/guest-photos/*`, (r) => {
    if (r.request().method() !== 'DELETE') return r.fallback();
    const id = r.request().url().split('/').pop();
    calls.push(`delete ${id}`);
    list = list.filter((p) => p.id !== id);
    return r.fulfill({ status: 200, json: { ok: true, deleted: true } });
  });
  return calls;
};

const openFromHome = async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('?elegant=1');
  await settled(page);
  const line = page.locator('[data-after-photos]');
  await expect(line).toBeVisible();
  return line;
};

test('after the event, "1 guest photo waiting for you to approve" opens the Guest photos section, waiting first', async ({ page }) => {
  await boot(page);
  await mock(page, [photo('ok1', 'approved'), photo('wait1', 'pending')]);
  const line = await openFromHome(page);
  await expect(line).toHaveText('1 guest photo waiting for you to approve');
  expect((await line.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await line.click();
  await sheetSettled(page);
  const section = page.locator('[data-host-photos]');
  await expect(section).toBeInViewport();
  const cells = section.locator('[data-photo]');
  await expect(cells.first()).toHaveAttribute('data-status', 'pending');
  await expect(cells.first()).toContainText('From Ana Ruiz · Waiting for your approval');
});

test('approve, then "Don’t allow sharing", then delete — each goes to its own route', async ({ page }) => {
  await boot(page);
  const calls = await mock(page, [photo('wait1', 'pending')]);
  const line = await openFromHome(page);
  await line.click();
  await sheetSettled(page);
  const cell = page.locator('[data-host-photos] [data-photo="wait1"]');
  // Not approved yet: no sharing control, no Share.
  await expect(cell.locator('[data-photo-sharing]')).toHaveCount(0);
  await cell.getByRole('button', { name: 'Approve' }).click();
  await expect(page.locator('[data-host-photos] [data-photos-status]')).toHaveText('Approved — guests can see it now.');
  await expect(cell).toHaveAttribute('data-status', 'approved');
  await cell.getByRole('button', { name: 'Don’t allow sharing' }).click();
  await expect(page.locator('[data-host-photos] [data-photos-status]')).toHaveText('Sharing is off for this photo.');
  await expect(cell).toContainText('Sharing off');
  await expect(cell.getByRole('button', { name: 'Allow sharing' })).toBeVisible();
  await cell.getByRole('button', { name: 'Delete photo' }).click();
  await cell.getByRole('button', { name: 'Delete it for good' }).click();
  await expect(page.locator('[data-host-photos] [data-photo="wait1"]')).toHaveCount(0);
  expect(calls).toEqual(['approve wait1', 'sharing wait1 {"allowed":false}', 'delete wait1']);
});

test('a photo its uploader kept private has no sharing control and no Share button', async ({ page }) => {
  await boot(page);
  await mock(page, [photo('priv1', 'approved', { uploader_private: true, shareable: false }), photo('ok1', 'approved')]);
  const line = page.locator('[data-after-photos]');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('?elegant=1');
  await settled(page);
  await expect(line).toHaveCount(0);            // nothing waits: no line
  // Open the Guest list the ordinary way, and find the section in it.
  await openSectionByName(page, 'Guests');
  await sheetSettled(page);
  const priv = page.locator('[data-host-photos] [data-photo="priv1"]');
  await expect(priv).toContainText('Kept private by the guest — no sharing');
  await expect(priv.locator('[data-photo-sharing], [data-photo-share], [data-photo-download]')).toHaveCount(0);
  const ok = page.locator('[data-host-photos] [data-photo="ok1"]');
  await expect(ok.locator('[data-photo-share], [data-photo-download]').first()).toBeVisible();
});

test('the host taps a photo to see it full screen, and can approve it there', async ({ page }) => {
  // GALLERY (11/16/2026): the list shows small thumbnails; the viewer shows the
  // full photo, who sent it, and Approve / Hide.
  await boot(page);
  const calls = await mock(page, [photo('wait1', 'pending')]);
  const line = await openFromHome(page);
  await line.click();
  await sheetSettled(page);
  // The host's tag heads the section, with the way to see public posts.
  const tag = page.locator('[data-host-photos-tag]');
  await expect(tag).toContainText('#VidasFriendsgiving2026');
  await expect(tag.getByRole('link', { name: 'See posts with this tag on Instagram' })).toHaveAttribute('href', /instagram\.com\/explore\/tags\/vidasfriendsgiving2026/i);
  await page.locator('[data-host-photos] [data-host-photo-open]').first().click();
  const viewer = page.locator('[data-photo-viewer]');
  await expect(viewer).toBeVisible();
  await expect(viewer).toContainText('From Ana Ruiz · Waiting for your approval');
  await viewer.getByRole('button', { name: 'Approve' }).click();
  await expect(viewer).toContainText('Guests can see it');
  expect(calls).toEqual(['approve wait1']);
  await page.keyboard.press('Escape');
  await expect(viewer).toHaveCount(0);
});

// ── THE WAIT AND THE FAILURE SIT ON THE PHOTO (G68, 11/19/2026) ─────────────
// Approve / Hide only greyed out while the server answered, and a failure was
// said once, under the whole grid — or behind the viewer, where it was never
// seen. Now the photo's own cell (and the viewer) says what is happening.
test('while a photo is approved its cell says so and Approve is held; a failed Hide is said on that photo', async ({ page }) => {
  await boot(page);
  await mock(page, [photo('ok1', 'approved'), photo('wait1', 'pending')]);
  let release; const held = new Promise((r) => { release = r; });
  await page.route(`${API}/api/events/${EVENT_ID}/guest-photos/wait1/approve`, async (r) => { await held; return r.fallback(); });
  await page.route(`${API}/api/events/${EVENT_ID}/guest-photos/ok1/hide`, (r) => r.fulfill({ status: 500, json: { ok: false } }));
  const line = await openFromHome(page);
  await line.click();
  await sheetSettled(page);
  const cell = page.locator('[data-host-photos] [data-photo="wait1"]');
  await cell.getByRole('button', { name: 'Approve' }).click();
  await expect(cell.locator('[data-busy-line]')).toHaveText('Approving the photo…');
  await expect(cell.getByRole('button', { name: 'Approve' })).toBeDisabled();
  // The other photo's buttons are held too, so a tap there is never silently dropped (11/19/2026).
  await expect(page.locator('[data-host-photos] [data-photo="ok1"]').getByRole('button', { name: 'Hide' })).toBeDisabled();
  release();
  await expect(cell.locator('[data-busy-line]')).toHaveCount(0);
  await expect(cell).toHaveAttribute('data-status', 'approved');

  const ok = page.locator('[data-host-photos] [data-photo="ok1"]');
  await ok.getByRole('button', { name: 'Hide' }).click();
  await expect(ok.locator('[data-photo-err]')).toHaveText('That didn’t save. Try again.');
  await expect(page.locator('[data-host-photos] [data-photo-err]')).toHaveCount(1);   // only on that photo
});

test('in the full-screen viewer, the wait and a failed Approve show under the photo', async ({ page }) => {
  await boot(page);
  await mock(page, [photo('wait1', 'pending')]);
  let release; const held = new Promise((r) => { release = r; });
  await page.route(`${API}/api/events/${EVENT_ID}/guest-photos/wait1/approve`, async (r) => { await held; return r.fulfill({ status: 500, json: { ok: false } }); });
  const line = await openFromHome(page);
  await line.click();
  await sheetSettled(page);
  await page.locator('[data-host-photos] [data-host-photo-open]').first().click();
  const viewer = page.locator('[data-photo-viewer]');
  await expect(viewer).toBeVisible();
  await viewer.getByRole('button', { name: 'Approve' }).click();
  await expect(viewer.locator('[data-busy-line]')).toHaveText('Approving the photo…');
  await expect(viewer.getByRole('button', { name: 'Approve' })).toBeDisabled();
  release();
  await expect(viewer.locator('[data-photo-err]')).toHaveText('That didn’t save. Try again.');
  await expect(viewer.locator('[data-photo-err]')).toBeInViewport();
});
