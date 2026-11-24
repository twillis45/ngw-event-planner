// ─── THE SMALL SHEETS SAY IT PLAINLY (cohesion batch G, owner 11/24/2026) ────
//
// The owner-approved renders and old → new copy table for batch G
// (renders/cohesion-g/README.md), measured on the built-in Wanda sample:
//   G5, #50  You & settings: a toggle says "On" or "Off" (the control shows the
//            state; the words name the setting). Hero "Your setup".
//   #41      its two fields are labeled, with made-up examples.
//   #27      Messages: an empty history says "Nothing yet" and what will be
//            listed; a load failure is its own row, never "Below is only…".
//   G1, #26  What could go wrong: grouped by the tag each card wears; "Keep an
//            eye on it" and "Minor" fold with their counts; the constructive act
//            is always first ("Plan for this ›" / "Add it to my checklist"),
//            then "I've covered this" (Undo in its toast).
//   G2, G3   Travel & where everyone stays: the door and the title share one
//            name; each stay is a row that opens in place to edit; names in ink.
//   #52      Make it yours: the intro names where her words go.
import { test, expect } from '@playwright/test';
import { settled, openSectionByName, sheetSettled } from './fixtures.mjs';

const boot = async (browser, [w, h, touch] = [390, 844, true], custom = null) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch });
  const page = await ctx.newPage();
  await page.route('https://e2e-mock.invalid/**', (r) => r.fulfill({ status: 200, json: { ok: true } }));
  await page.addInitScript((c) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    if (c) localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([c]));
    localStorage.setItem('ngw-hostv2-last-event', c ? c.id : 'ev-x-wanda');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString()); localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.setItem('ngw-theme', 'light');
  }, custom);
  await page.goto('./?elegant=1&noanalytics=1&theme=light');
  await settled(page);
  await page.waitForTimeout(600);
  return { ctx, page };
};
const open = async (page, name) => { await openSectionByName(page, name); await sheetSettled(page); };

test('You & settings: toggles say On or Off, the hero is "Your setup", and both fields are labeled with examples', async ({ browser }) => {
  const { ctx, page } = await boot(browser);
  await open(page, 'You & settings');
  const sheet = page.locator('.sheet').last();
  await expect(sheet).toContainText('Your setup');
  await expect(sheet).toContainText('How you host, your area and your data. Nothing is guessed about you.');
  await expect(sheet).not.toContainText('Nothing remembered yet');
  for (const row of ['Sound', 'Light mode', 'Help improve the app']) {
    const btn = sheet.locator('.later-row', { has: page.locator('.t', { hasText: new RegExp(`^${row}$`) }) }).locator('button').first();
    await expect(btn, row).toHaveText(/^(On|Off)$/);
    await expect(btn, row).toHaveAttribute('aria-pressed', /true|false/);
  }
  await expect(sheet.locator('.later-row', { has: page.locator('.t', { hasText: /^Light mode$/ }) }).locator('button')).toHaveText('On');
  await expect(sheet.getByLabel('Your name — it signs the notes we draft for you')).toHaveAttribute('placeholder', 'For example: Rosa Delgado');
  await expect(sheet.getByLabel('Your town or city')).toHaveAttribute('placeholder', 'For example: Springfield, VA');
  await expect(sheet).toContainText('Your plans are saved on this device only.');
  await ctx.close();
});

test('Make it yours: the intro names where her words go, and every placeholder is an example', async ({ browser }) => {
  const { ctx, page } = await boot(browser);
  await open(page, 'Make it yours');
  const sheet = page.locator('.sheet').last();
  await expect(sheet).toContainText('Your words go into the run of show, the toast and the note we draft the day before. Nothing here is required.');
  const phs = await sheet.locator('input.field, textarea.field').evaluateAll((els) => els.filter((e) => e.getClientRects().length && e.placeholder).map((e) => e.placeholder));
  expect(phs.length).toBeGreaterThan(4);
  for (const ph of phs) expect(ph).toMatch(/^For example: /);
  await ctx.close();
});

test('Venue and Ask No Guesswork: their one field each is labeled, with an example', async ({ browser }) => {
  const own = { id: 'g-own-venue', name: 'Rosa’s 40th', type: 'Birthday', date: '2027-04-17', guests: [], vendors: [], budget: [], timeline: [] };
  const { ctx, page } = await boot(browser, [390, 844, true], own);
  await open(page, 'Venue');
  await expect(page.locator('.sheet').last().getByLabel('The place’s name or street address')).toHaveAttribute('placeholder', 'For example: Elm Court Hall, or 42 Elm Ct');
  await open(page, 'Ask No Guesswork');
  await expect(page.locator('.sheet').last().getByLabel('Your question')).toHaveAttribute('placeholder', 'For example: will $2,000 cover it?');
  await ctx.close();
});

test('Messages: an empty history says "Nothing yet" and what will be listed; a load failure is its own row', async ({ browser }) => {
  const { ctx, page } = await boot(browser);
  await open(page, 'Messages');
  const sheet = page.locator('.sheet').last();
  await expect(sheet.locator('[data-messages-empty]')).toContainText('Sent from this plan');
  await expect(sheet.locator('[data-messages-empty]')).toContainText('Nothing yet');
  await expect(sheet.locator('[data-messages-empty]')).toContainText('When you send the invite, a nudge or an update, it’s listed here: what went out, to whom, and when.');
  // Never a pointer to something below that is not there.
  await expect(sheet).not.toContainText('Below is only');
  const note = sheet.locator('[data-messages-note]');
  if (await note.count()) {
    await expect(note.locator('.t, strong').first()).toHaveText('Email history');
    await expect(note).toContainText(/Anything sent from this device still shows here\./);
  }
  await ctx.close();
});

test('What could go wrong: grouped by its tags, the quiet groups folded with their counts, the constructive act first', async ({ browser }) => {
  const { ctx, page } = await boot(browser);
  await open(page, 'What could go wrong');
  const sheet = page.locator('.sheet').last();
  const groups = sheet.locator('[data-risk-group]');
  const names = await groups.evaluateAll((gs) => gs.map((g) => g.getAttribute('data-risk-group')));
  // In the tags' own order; the two quiet ones are present on Wanda.
  expect(names.filter((n) => ['Keep an eye on it', 'Minor'].includes(n))).toEqual(['Keep an eye on it', 'Minor']);
  let total = 0;
  for (const n of names) {
    const g = sheet.locator(`[data-risk-group="${n}"]`);
    const rows = g.locator('[data-risk-row]');
    const count = await rows.count();
    total += count;
    const quiet = n === 'Keep an eye on it' || n === 'Minor';
    // A folded group says its count, and its summary is a 44px tap.
    await expect(g.locator('[data-risk-count]')).toHaveText(String(count));
    if (quiet) {
      expect(await g.evaluate((d) => d.tagName === 'DETAILS' && !d.open), `${n} is folded`).toBe(true);
      expect((await g.locator('summary').boundingBox()).height).toBeGreaterThanOrEqual(44);
      await g.locator('summary').click();
    }
    for (let i = 0; i < count; i++) {
      const btns = rows.nth(i).locator('.actions-row button');
      await expect(btns.nth(0)).toHaveText(/^(Plan for this ›|Add it to my checklist)$/);
      await expect(btns.nth(1)).toHaveText('I’ve covered this');
    }
  }
  // The hero's number is the rows' number.
  await expect(sheet).toContainText(`${total} to know about`);
  await expect(sheet).not.toContainText('Handled — stop showing this');
  await expect(sheet).not.toContainText('Guest expectations for ceremony');
  // "I've covered this" says so, with Undo.
  await sheet.locator('[data-risk-row] .actions-row button', { hasText: 'I’ve covered this' }).first().click();
  await expect(page.locator('.toast')).toContainText('Undo');
  await ctx.close();
});

test('Travel & where everyone stays: one name with its door, the address said once, and each stay edits in place', async ({ browser }) => {
  const { ctx, page } = await boot(browser);
  await open(page, 'Travel & where everyone stays');
  await expect(page.locator('#sheet-title')).toHaveText('Travel & where everyone stays');
  const sheet = page.locator('.sheet').last();
  const stays = sheet.locator('[data-lodging-stay]');
  await expect(stays).toHaveCount(2);
  // The address once (the hero), never repeated over the rows.
  expect((await sheet.innerText()).split('4604 Grazin Way').length - 1).toBe(1);
  // Names in ink, not link blue; each row is a button that opens in place (▸).
  const first = stays.first();
  expect(await first.evaluate((b) => b.tagName)).toBe('BUTTON');
  const inkOk = await first.evaluate((b) => { const n = b.querySelector('.stay-who'); const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim(); const probe = document.createElement('i'); probe.style.color = ink; document.body.appendChild(probe); const want = getComputedStyle(probe).color; probe.remove(); return getComputedStyle(n).color === want; });
  expect(inkOk, 'the name is in ink').toBe(true);
  await first.click();
  const ed = sheet.locator('[data-stay-editor]');
  await expect(ed).toBeVisible();
  await expect(ed.getByLabel('Who’s staying')).toHaveValue('Marcus + Nia + the 2 boys (in from Denver, CO)');
  await expect(ed.getByLabel('Where')).toHaveValue('4604 Grazin Way, Upper Marlboro, MD');
  await ed.getByLabel('Who’s staying').fill('Marcus + Nia + the boys');
  await ed.getByRole('button', { name: 'Save this stay' }).click();
  await expect(stays.first().locator('.stay-who')).toHaveText('Marcus + Nia + the boys');
  const stored = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('ngw-hostv2-patch-ev-x-wanda') || '{}');
    return (p.lodging || []).map((r) => r.who);
  });
  expect(stored[0]).toBe('Marcus + Nia + the boys');
  // One quiet way to add another.
  await expect(sheet.getByRole('button', { name: 'Add a stay' })).toHaveClass(/mini/);
  await ctx.close();
});

test('Reconfirm your vendors: a ready row says "Read it first", and the draft is where it is sent and recorded (#31)', async ({ browser }) => {
  const d = (n) => { const x = new Date(); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const trip = { id: 'g-sweep', name: 'Nashville Weekend', type: 'Group Trip', date: d(2), endDate: d(4),
    createdAt: new Date(Date.now() - 60 * 864e5).toISOString(), venue: 'Nashville, TN', venueCity: 'Nashville', venueState: 'TN',
    guestMode: 'count', guestEstimate: 6, guestCountSource: 'host', guests: [], budget: [], foodChoices: {},
    lodging: { hotelName: 'The Gulch House', from: 'typed off the confirmation' },
    vendors: [{ id: 'v1', name: 'Husk dinner', category: 'Restaurant', status: 'Booked', phone: '615-555-0142' }], timeline: [] };
  const { ctx, page } = await boot(browser, [390, 844, true], trip);
  await page.locator('.sweepcard').getByRole('button', { name: 'Draft a reconfirm for each' }).click();
  await sheetSettled(page);
  const sheet = page.locator('.sheet').last();
  const row = sheet.locator('.sweep-row', { hasText: 'Husk dinner' });
  await expect(row.locator('.sweep-state')).toHaveText('draft ready', { timeout: 10_000 });
  await expect(row.locator('.actions-row').first().locator('a, button')).toHaveText(['Read it first']);
  await row.getByRole('button', { name: 'Read it first' }).click();
  await sheetSettled(page);
  await expect(page.locator('.sheet').last().getByRole('button', { name: 'Mark it sent — I sent it myself' })).toBeVisible();
  await ctx.close();
});

test('#43: a primary with nothing to save is a quiet button at full contrast, never a dimmed lit one', async ({ browser }) => {
  const { ctx, page } = await boot(browser);
  await open(page, 'Make it yours');
  const save = page.locator('.sheet').last().getByRole('button', { name: 'Save it' });
  await expect(save).toBeDisabled();
  const m = await save.evaluate((b) => {
    const probe = document.createElement('div'); probe.style.backgroundImage = 'var(--cta-grad)'; document.body.appendChild(probe);
    const lit = getComputedStyle(probe).backgroundImage; probe.remove();
    const cs = getComputedStyle(b);
    const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const lum = ([r, g, bb]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bb); };
    // The button's own fill, or the sheet behind it when it has none.
    let bgEl = b; let bg = cs.backgroundColor;
    while (bgEl && (/rgba\(0, 0, 0, 0\)|transparent/.test(bg))) { bgEl = bgEl.parentElement; bg = bgEl ? getComputedStyle(bgEl).backgroundColor : 'rgb(255,255,255)'; }
    const a = lum(rgb(cs.color)), z = lum(rgb(bg));
    return { lit: cs.backgroundImage === lit, opacity: Number(cs.opacity), ratio: (Math.max(a, z) + 0.05) / (Math.min(a, z) + 0.05) };
  });
  expect(m.lit, 'not lit while there is nothing to save').toBe(false);
  expect(m.opacity, 'not dimmed').toBe(1);
  expect(m.ratio, 'its words clear 4.5:1').toBeGreaterThanOrEqual(4.5);
  await ctx.close();
});
