// ─── THE HOST CHOOSES HER INVITE (owner-approved renders r3, 11/24/2026) ─────
//
// What the owner approved, driven in a real browser:
//   1. two layouts, the host picks one: "Classic" (today's, full countdown)
//      and "At a glance" (fact rows, "In N days" up top, the reply higher).
//      Stored as event.inviteLayout; the paper color (inviteStyle) is separate.
//   2. her message replaces "It wouldn't be the same without you": one field
//      (deckLine), signed "— Dana" only when she wrote it; empty, the
//      suggested line, unsigned.
//   3. the bold rule: the date and the street bold, the time and the town
//      regular, measured with computed font-weight.
//   4. links that send nothing: the address opens Maps, "Add to calendar"
//      before a reply, "Message Dana" by the host contact.
//   5. the preview notice's new words.
//   6. the "Your invite" panel with a LIVE preview that is the real invite.
//   7. the host's photo: Add / Remove in You & settings (the signed-in
//      harness, every request answered here), and on the guest's invite.
// Every name, address and number below is made up. Nothing is sent: every
// request to the API or the auth project is answered by this file.
import { test, expect } from './fixtures.mjs';
import { previewUrl } from '../deployBase.mjs';
import { dateIn, settled, sheetSettled } from './fixtures.mjs';

const API = 'https://e2e-mock.invalid';
const CODE = 'choose-invite-code-000001';
const SUGGESTED = 'It wouldn’t be the same without you';
const MINE = 'Come hungry, and bring a story from your year.';
const NOTICE = 'Just a preview — replies here stay on this phone. To answer, use the invite link you were sent, or message Dana.';

const EVENT = (over = {}) => ({
  id: 'cust-choose-invite', rsvpCode: CODE,
  name: 'Mom Linda’s Thanksgiving', type: 'Thanksgiving', date: dateIn(12), startTime: '18:00', startTimeSource: 'host',
  venueAddress: '42 Elm Ct', venueCity: 'Springfield', venueState: 'VA', venueZip: '22150',
  hostName: 'Dana Reyes', hostContact: '(703) 555-0142', rsvpDeadline: dateIn(6),
  guestEstimate: 12, guestMode: 'count', guests: [], vendors: [], budget: [], timeline: [], ...over,
});

const seed = async (page, ev) => {
  await page.addInitScript((e) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  }, ev);
  await page.route(`${API}/**`, (route) => route.fulfill({ status: 404, json: { detail: 'not found' } }));
};

const openPanel = async (page, over) => {
  await seed(page, EVENT(over));
  await page.goto('?open=invite');
  await expect(page.locator('#sheet-title')).toHaveText('Invite page', { timeout: 10_000 });
  await sheetSettled(page);
  await expect(page.locator('[data-invite-preview] .inv2-sheet')).toBeVisible();
};

// The guest's invite, past its staged entrance (theInviteReplyLeads' wait).
const settledInvite = async (page) => {
  await expect(page.getByRole('radio', { name: /Yes, I.m in/i }).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const beats = [...document.querySelectorAll('.inv2 .rv')];
    return beats.length > 0 && beats.every((el) => el.classList.contains('in') && getComputedStyle(el).opacity === '1');
  }), { timeout: 10_000 }).toBe(true);
};
const openGuestInvite = async (page, over) => {
  await seed(page, EVENT(over));
  await page.goto('?rsvp=' + CODE);
  await settledInvite(page);
};

const preview = (page) => page.locator('[data-invite-preview]');

test('the picker switches the live preview between the two layouts', async ({ page }) => {
  await openPanel(page);
  const picker = page.getByRole('radiogroup', { name: 'Layout' });
  await expect(picker.getByRole('radio')).toHaveCount(2);
  await expect(picker.getByRole('radio', { name: /Classic/ })).toHaveAttribute('aria-checked', 'true');
  await expect(preview(page).locator('.inv2-sheet')).toHaveAttribute('data-invite-layout', 'classic');
  // Classic keeps the full countdown and the month in the masthead.
  await expect(preview(page).locator('.inv2-count')).toHaveText('12');
  await picker.getByRole('radio', { name: /At a glance/ }).click();
  await expect(preview(page).locator('.inv2-sheet')).toHaveAttribute('data-invite-layout', 'glance');
  await expect(preview(page).locator('[data-fact]')).toHaveCount(3);
  await expect(preview(page).locator('.inv2-count')).toHaveCount(0);
  await expect(preview(page).locator('.inv2-mast')).toContainText(/In 12 days/i);
  // The preview IS the invite component, not a copy: the guest page's own reply row.
  await expect(preview(page).locator('.inv2-replies [role=radio]')).toHaveCount(3);
  // Saved: the guest's invite opens in the layout she picked.
  await page.getByRole('button', { name: 'Save your invite page' }).click();
  await page.goto('?rsvp=' + CODE);
  await settledInvite(page);
  await expect(page.locator('.inv2-sheet')).toHaveAttribute('data-invite-layout', 'glance');
});

test('her message replaces the old line in the preview and on the guest invite, signed only when she wrote it', async ({ page }) => {
  await openPanel(page);
  const box = page.getByLabel('Message', { exact: true });
  await expect(box).toHaveValue(SUGGESTED);
  await expect(box).toHaveAttribute('maxlength', '200');
  const msg = preview(page).locator('[data-invite-message]');
  await expect(msg).toContainText(SUGGESTED);
  await expect(msg.locator('[data-invite-sig]')).toHaveCount(0);
  await box.fill(MINE);
  await expect(page.locator('[data-message-count]')).toHaveText(`${MINE.length} / 200`);
  await expect(msg).toContainText(MINE);
  await expect(msg).not.toContainText(SUGGESTED);
  await expect(msg.locator('[data-invite-sig]')).toContainText('— Dana');
  await page.getByRole('button', { name: 'Save your invite page' }).click();

  await page.goto('?rsvp=' + CODE);
  await settledInvite(page);
  await expect(page.locator('[data-invite-message]')).toContainText(MINE);
  await expect(page.locator('[data-invite-message] [data-invite-sig]')).toContainText('— Dana');
  await expect(page.getByText(SUGGESTED)).toHaveCount(0);
});

test('an empty message falls back to the suggested line, unsigned, and Start over brings it back', async ({ page }) => {
  await openPanel(page, { deckLine: MINE });
  const box = page.getByLabel('Message', { exact: true });
  await expect(box).toHaveValue(MINE);
  await page.getByRole('button', { name: 'Start over' }).click();
  await expect(box).toHaveValue(SUGGESTED);
  await expect(preview(page).locator('[data-invite-message] [data-invite-sig]')).toHaveCount(0);
  await box.fill('');
  await expect(preview(page).locator('[data-invite-message]')).toContainText(SUGGESTED);
  await expect(preview(page).locator('[data-invite-message] [data-invite-sig]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save your invite page' }).click();
  await page.goto('?rsvp=' + CODE);
  await settledInvite(page);
  await expect(page.locator('[data-invite-message]')).toContainText(SUGGESTED);
  await expect(page.locator('[data-invite-message] [data-invite-sig]')).toHaveCount(0);
});

for (const layout of ['classic', 'glance']) {
  test(`${layout}: the address opens Maps, Add to calendar is there before a reply, and Message reaches the host`, async ({ page }) => {
    await openGuestInvite(page, { inviteLayout: layout });
    const maps = page.locator('[data-invite-maps]').first();
    await expect(maps).toBeVisible();
    const href = await maps.getAttribute('href');
    expect(href).toMatch(/^https:\/\/www\.google\.com\/maps\//);
    expect(decodeURIComponent(href)).toContain('42 Elm Ct');
    // Before any reply: the calendar door is on the invite, and it opens the
    // same Google and Apple links the confirmation always had.
    const cal = page.locator('[data-invite-calendar]').first();
    await expect(cal).toBeVisible();
    await cal.click();
    await expect(page.getByRole('link', { name: 'Google Calendar' }).first()).toHaveAttribute('href', /calendar\.google\.com/);
    await expect(page.getByRole('link', { name: 'Apple Calendar' }).first()).toHaveAttribute('href', /^data:text\/calendar/);
    const msgHost = page.locator('[data-invite-host-message]').first();
    await expect(msgHost).toHaveAttribute('href', 'sms:7035550142');
    await expect(msgHost).toContainText(layout === 'glance' ? 'Message Dana' : 'Message');
  });

  test(`${layout}: the bold rule, measured`, async ({ page }) => {
    await openGuestInvite(page, { inviteLayout: layout });
    const w = await page.evaluate(() => {
      const fw = (sel) => { const el = document.querySelector(sel); return el ? Number(getComputedStyle(el).fontWeight) : null; };
      const tx = (sel) => { const el = document.querySelector(sel); return el ? el.textContent.trim() : null; };
      return {
        date: fw('[data-invite-date]'), street: fw('[data-invite-street]'), time: fw('[data-invite-time]'), town: fw('[data-invite-town]'),
        replyBy: fw('[data-invite-replyby] b'), name: fw('.inv2-name'),
        streetText: tx('[data-invite-street]'), townText: tx('[data-invite-town]'), timeText: tx('[data-invite-time]'),
      };
    });
    expect(w.streetText).toBe('42 Elm Ct');
    expect(w.townText).toBe('Springfield, VA 22150');
    expect(w.timeText).toMatch(/6:00 PM/);
    expect(w.date, 'the date is not bold').toBeGreaterThanOrEqual(600);
    expect(w.street, 'the street is not bold').toBeGreaterThanOrEqual(600);
    expect(w.replyBy, 'the reply-by date is not bold').toBeGreaterThanOrEqual(600);
    expect(w.time, 'the time is bold').toBeLessThanOrEqual(500);
    expect(w.town, 'the town is bold').toBeLessThanOrEqual(500);
    expect(w.name).toBeGreaterThanOrEqual(700);
  });
}

test('the preview notice says it in the new words, and "message Dana" is the host-contact link', async ({ page }) => {
  await openGuestInvite(page);
  const notice = page.locator('.inv2-delivery');
  await expect(notice).toHaveText(NOTICE);
  await expect(notice.getByRole('link', { name: 'message Dana' })).toHaveAttribute('href', 'sms:7035550142');
  await expect(page.getByText(/Online reply delivery has not been verified/)).toHaveCount(0);
});

// ── The guest's invite from the server: the layout and the photo ─────────────
const PUBLIC = (over = {}) => ({
  id: 'cust-choose-invite', rsvpCode: CODE, name: 'Mom Linda’s Thanksgiving', type: 'Thanksgiving',
  date: dateIn(12), startTime: '18:00', venueAddress: '42 Elm Ct', venueCity: 'Springfield', venueState: 'VA', venueZip: '22150',
  hostName: 'Dana Reyes', hostContact: '(703) 555-0142', deckLine: MINE, goingCount: 0, ...over,
});
const serveGuest = async (page, ev) => {
  const photoHits = [];
  await page.route(`${API}/**`, async (route) => {
    const url = route.request().url();
    if (url.includes(`/api/public/invite/${CODE}`) && !url.includes('/opened')) return route.fulfill({ status: 200, json: { ok: true, event: ev } });
    if (url.includes(`/api/public/host-photo/${CODE}`)) {
      photoHits.push(url);
      // A plain made-up image: one flat color, drawn here, never a person.
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4v2wfAAWGAqXAy6KZAAAAAElFTkSuQmCC', 'base64');
      return route.fulfill({ status: 200, contentType: 'image/png', body: png });
    }
    return route.fulfill({ status: 404, json: { detail: 'not found' } });
  });
  await page.goto('?rsvp=' + CODE);
  await settledInvite(page);
  return photoHits;
};

for (const layout of ['classic', 'glance']) {
  test(`${layout}: the host's photo shows where the layout puts it, and initials when there is none`, async ({ page }) => {
    const hits = await serveGuest(page, PUBLIC({ inviteLayout: layout, hostPhoto: 'abc123def456' }));
    const where = layout === 'glance' ? '[data-fact="host"]' : '[data-invite-message]';
    const img = page.locator(`${where} img[data-host-avatar]`);
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute('src', `${API}/api/public/host-photo/${CODE}?v=abc123def456`);
    expect(hits.length).toBeGreaterThan(0);
    await expect(page.locator('.inv2-sheet')).toHaveAttribute('data-invite-layout', layout);
  });
}

test('no photo: the guest sees the host’s initials', async ({ page }) => {
  await serveGuest(page, PUBLIC({ inviteLayout: 'glance' }));
  await expect(page.locator('[data-fact="host"] [data-host-avatar]')).toHaveText('DR');
  await expect(page.locator('img[data-host-avatar]')).toHaveCount(0);
});

// ── You & settings: Add, then Remove (the signed-in harness on 5277) ─────────
test.describe('the host photo in You & settings', () => {
  const BASE = previewUrl(Number(process.env.PW_RSVPSYNC_PORT || 5277));
  const PROJECT = 'https://rsvpsync.supabase.co';
  const SYNC_API = 'https://rsvpsync-mock.invalid';
  const STUDIO = '11111111-2222-3333-4444-555555555555';
  const session = () => ({
    access_token: 'fake.access.token', refresh_token: 'fake-refresh', token_type: 'bearer',
    expires_in: 999999, expires_at: Math.floor(Date.now() / 1000) + 999999,
    user: { id: '99999999-8888-7777-6666-555555555555', email: 'dana@example.invalid', aud: 'authenticated', role: 'authenticated' },
  });

  test('Add crops square and uploads; the version, not the image, is kept; Remove deletes it', async ({ page }) => {
    const calls = [];
    let stored = null;
    await page.route(`${PROJECT}/**`, (route) => {
      const url = route.request().url();
      const json = (b) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(b) });
      if (url.includes('/rest/v1/studio_members')) return json([{ studio_id: STUDIO, role: 'owner' }]);
      if (url.includes('/rest/v1/events') && route.request().method() === 'GET') return json([]);
      return json(url.includes('/auth/v1/') ? {} : []);
    });
    await page.route(`${SYNC_API}/**`, async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (url.pathname === '/api/host-photo') {
        calls.push({ method: req.method(), type: req.headers()['content-type'] || '', auth: req.headers().authorization || '', size: (req.postDataBuffer() || Buffer.alloc(0)).length });
        if (req.method() === 'POST') { stored = req.postDataBuffer(); return route.fulfill({ status: 200, json: { ok: true, version: 'abc123def456' } }); }
        if (req.method() === 'DELETE') { stored = null; return route.fulfill({ status: 200, json: { ok: true } }); }
        if (req.method() === 'GET') return stored ? route.fulfill({ status: 200, contentType: 'image/jpeg', body: stored }) : route.fulfill({ status: 404, json: { detail: 'not found' } });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.addInitScript(([sess, ev]) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('sb-rsvpsync-auth-token', JSON.stringify(sess));
      localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([ev]));
      localStorage.setItem('ngw-hostv2-last-event', ev.id);
      localStorage.setItem('ngw-profile', JSON.stringify({ name: 'Dana Reyes' }));
      localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
      localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    }, [session(), EVENT()]);
    await page.goto(BASE + '?open=settings');
    await settled(page);
    await expect(page.locator('#sheet-title')).toHaveText('You & settings', { timeout: 10_000 });
    await sheetSettled(page);
    const row = page.locator('[data-host-photo-row]').first();
    await expect(row).toContainText('initials');
    // A plain made-up image, drawn in the page: one flat color, never a person.
    const b64 = await page.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 900; c.height = 600;
      const x = c.getContext('2d'); x.fillStyle = '#c89f7a'; x.fillRect(0, 0, 900, 600);
      return c.toDataURL('image/png').split(',')[1];
    });
    await row.locator('input[type=file]').setInputFiles({ name: 'plain.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') });
    // The square crop comes first; nothing is sent until she says so.
    const crop = page.locator('[data-photo-crop]');
    await expect(crop).toBeVisible();
    const box = await crop.locator('[data-crop-frame]').boundingBox();
    expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1);
    expect(calls.length).toBe(0);
    await crop.getByRole('button', { name: 'Use this photo' }).click();
    await expect(row.locator('img[data-host-avatar]')).toBeVisible({ timeout: 10_000 });
    const post = calls.find((c) => c.method === 'POST');
    expect(post.type).toBe('image/jpeg');
    expect(post.auth).toBe('Bearer fake.access.token');
    expect(post.size).toBeGreaterThan(0);
    const prof = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-profile')));
    expect(prof.hostPhoto).toBe('abc123def456');
    expect(JSON.stringify(prof)).not.toMatch(/data:image|base64/);

    await row.getByRole('button', { name: 'Remove' }).click();
    await expect(row.locator('img[data-host-avatar]')).toHaveCount(0);
    expect(calls.some((c) => c.method === 'DELETE')).toBe(true);
    const after = await page.evaluate(() => JSON.parse(localStorage.getItem('ngw-profile')));
    expect(after.hostPhoto || null).toBe(null);
  });
});

// OWNER REPORT, 11/24/2026 (iPad): "See the full invite" didn't show the full
// invite. The preview frame clipped the bottom of the invite (its reply
// buttons), and the button opened the PUBLIC link in a new tab, which shows the
// SAVED invite, not the one being edited (Classic while At a glance was picked).
// The full invite is the same draft, opened in place, whole.
test('"See the full invite" shows the whole invite being edited, in place, in the layout picked', async ({ page, context }) => {
  await openPanel(page);
  await page.getByRole('radio', { name: /At a glance/ }).click();
  await expect(preview(page).locator('[data-invite-layout="glance"]')).toBeVisible();
  let popups = 0;
  context.on('page', () => { popups += 1; });
  const seeFull = page.getByRole('button', { name: 'See the full invite' });
  expect((await seeFull.boundingBox()).height, 'the button is a 44px target').toBeGreaterThanOrEqual(44);
  await seeFull.click();
  // Nothing opens elsewhere; the preview itself is the full invite now.
  await page.waitForTimeout(400);
  expect(popups, 'no new tab').toBe(0);
  await expect(preview(page).locator('[data-invite-layout="glance"]')).toBeVisible();
  const clip = await preview(page).evaluate((f) => ({ sh: f.scrollHeight, ch: f.clientHeight }));
  expect(clip.sh - clip.ch, `nothing cut off: ${clip.sh} of content in ${clip.ch}`).toBeLessThanOrEqual(1);
  // The reply buttons, the bottom of the invite, are inside the frame.
  const fb = await preview(page).boundingBox();
  const yes = await preview(page).getByRole('radio', { name: /Yes, I.m in/i }).first().boundingBox();
  expect(yes.y + yes.height, 'the reply buttons sit inside the frame').toBeLessThanOrEqual(fb.y + fb.height + 1);
  // The guest-facing notice, at the invite's very foot, is inside it too.
  const note = await preview(page).getByText(/Just a preview/).first().boundingBox();
  expect(note.y + note.height, 'the preview notice sits inside the frame').toBeLessThanOrEqual(fb.y + fb.height + 1);
  // And it folds back to the window it was.
  await page.getByRole('button', { name: 'Show less' }).click();
  await expect(page.getByRole('button', { name: 'See the full invite' })).toBeVisible();
  expect((await preview(page).boundingBox()).height, 'back to the 440px window').toBeLessThanOrEqual(441);
});
