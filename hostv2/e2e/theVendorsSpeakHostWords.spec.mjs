// ─── THE VENDORS SPEAK HOST WORDS (cohesion batch B, 11/24/2026) ────────────
//
// UX_11 rules 4 and 8 (owner-approved 11/24/2026). The audit read, on the
// People you're hiring sheet and its cards (#23): "Contact channels
// available.", "Payment state not tracked yet.", "Closeout activates after
// the event.", "5 of 6 checks passing · 1 not tracked yet (closeout).",
// "the vendor's own brief covers the rest", "National baseline", "Download
// the vendor list (CSV)". And one card said "Quoted — needs decision before
// booking." four times (#61).
//
// One destination, one name (#24): the host presses "Send Semper Catering
// Co. the details", and the page the vendor opens said "VENDOR BRIEF",
// "Copy the brief" and "Print the brief". The page now says what the button
// says: the details.
import { test, expect, settled, sheetSettled, openSectionByName, dateIn } from './fixtures.mjs';

const ENGINE = /\bbrief\b|baseline|\bCSV\b|not tracked|activates|channels|\bROI\b|checks passing|needs decision|not fully clear/i;

const boot = async (page) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('ngw-hostv2-last-event', 'ev-x-wanda');
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
  });
  await page.route('https://e2e-mock.invalid/**', (route) => route.fulfill({ status: 404, json: { detail: 'not found' } }));
  await page.goto('?elegant=1');
  await settled(page);
};

const engineLines = (text) => text.split('\n').map((l) => l.trim()).filter((l) => ENGINE.test(l));

test('the vendor sheet, and every vendor opened, has no engine words', async ({ page }) => {
  test.setTimeout(90_000);
  await boot(page);
  await openSectionByName(page, 'People you’re hiring', { settle: 600 });
  await sheetSettled(page);
  const found = engineLines(await page.locator('.sheet').innerText());
  const cards = page.locator('.sheet .vcard');
  const n = await cards.count();
  expect(n, 'premise: Wanda has vendors').toBeGreaterThan(3);
  for (let i = 0; i < n; i++) {
    const card = cards.nth(i);
    await card.locator('.vc-head').click();
    await expect(card).toHaveClass(/\bopen\b/);
    found.push(...engineLines(await card.innerText()).map((l) => `card ${i + 1}: ${l}`));
    await card.locator('.vc-head').click();
  }
  expect([...new Set(found)]).toEqual([]);
});

test('an opened vendor says each thing once', async ({ page }) => {
  test.setTimeout(90_000);
  await boot(page);
  await openSectionByName(page, 'People you’re hiring', { settle: 600 });
  await sheetSettled(page);
  const cards = page.locator('.sheet .vcard');
  const repeats = [];
  for (let i = 0; i < await cards.count(); i++) {
    const card = cards.nth(i);
    await card.locator('.vc-head').click();
    await expect(card).toHaveClass(/\bopen\b/);
    // Every sentence (a run of words ending in a period) on the card, counted.
    const text = await card.innerText();
    const counts = {};
    for (const s of text.match(/[A-Z][^.\n]{12,}\./g) || []) counts[s] = (counts[s] || 0) + 1;
    for (const [s, c] of Object.entries(counts)) if (c > 1) repeats.push(`card ${i + 1}: "${s}" x${c}`);
    await card.locator('.vc-head').click();
  }
  expect(repeats).toEqual([]);
});

test('the page a vendor opens is called what the host\'s button calls it', async ({ page }) => {
  const CODE = 'abcdefghij1234567890hw';
  await page.route(`https://e2e-mock.invalid/api/public/vendor-brief/${CODE}`, (r) => r.fulfill({ status: 200, json: { ok: true, brief: {
    vendorId: 'v1', vendorName: 'Elm Court Catering', contactName: 'Dana Cole', category: 'Catering', arrivalTime: '14:30',
    eventId: 'e1', eventName: 'Jordan’s Retirement Party', eventDate: dateIn(30), venue: '42 Elm Ct, Springfield, VA 22150',
    ros: [], hostName: 'Casey Morgan', guestCount: 40, confirmState: null } } }));
  await page.goto('?vendor=' + CODE);
  await expect(page.locator('[data-surface="vendor-brief-v2"]')).toBeVisible();
  const text = await page.locator('[data-surface="vendor-brief-v2"]').innerText();
  expect(engineLines(text)).toEqual([]);
  await expect(page.getByRole('button', { name: 'Copy the details' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print the details' })).toBeVisible();
});
