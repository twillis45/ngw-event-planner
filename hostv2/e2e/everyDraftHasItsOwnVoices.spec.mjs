// ─── EVERY DRAFT HAS ITS OWN VOICES (owner, 11/19/2026) ─────────────────────
// "Rewrite the other drafts' voices the same way." Before, a draft's voices were
// word swaps, and Tighter dropped middle paragraphs. Each voice now gives the
// draft its own greeting and closing for its reader, Tighter takes out only
// pleasantries, and the facts are kept word for word (lib/draftVoice). This
// drives the real "Draft note" on a vendor and reads what the host would send.
import { test, expect, settled, openSectionByName, dateIn } from './fixtures.mjs';

const EV = { id: 'cust-voices', name: 'My Friendsgiving', type: 'Friendsgiving', date: dateIn(10),
  guestEstimate: 12, guestMode: 'count', guestCountSource: 'host', budget: [], guests: [], timeline: [],
  vendors: [{ id: 'v-cat', name: 'Harvest Table Catering', category: 'Catering', status: 'Considering', contactName: 'Dana' }] };

test('a note to a vendor reads differently in every voice, and keeps every fact', async ({ page }) => {
  await page.addInitScript((e) => {
    localStorage.setItem('ngw-hostv2-custom-events', JSON.stringify([e]));
    localStorage.setItem('ngw-hostv2-last-event', e.id);
    localStorage.setItem('ngw-v2-splash-seen', new Date().toISOString());
    localStorage.setItem('ngw-welcomed', '1'); localStorage.setItem('ngw-v2-welcomed', '1');
    localStorage.removeItem('ngw-hostv2-voice');
  }, EV);
  await page.goto('?elegant=1');
  await settled(page);
  await openSectionByName(page, 'People you’re hiring');
  await settled(page);
  const card = page.locator('.vcard', { hasText: 'Harvest Table Catering' }).first();
  await card.evaluate((c) => c.click());
  await card.getByRole('button', { name: 'Draft a note instead', exact: true }).click();
  const draft = page.locator('.sheet').last();
  const box = draft.getByLabel('Edit the draft');
  const asWritten = await box.inputValue();
  const date = asWritten.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), [A-Z][a-z]+ \d{1,2}/)[0];
  const texts = {};
  for (const voice of ['As written', 'Tighter', 'Warmer', 'Playful', 'Formal']) {
    await draft.getByRole('radio', { name: voice, exact: true }).click();
    texts[voice] = await box.inputValue();
    expect(texts[voice], voice).toContain(date);
    expect(texts[voice], voice).toContain('12');
    expect(texts[voice], voice).toMatch(/Dana/);
  }
  expect(new Set(Object.values(texts)).size).toBe(5);
  expect(texts.Tighter.length).toBeLessThan(texts['As written'].length);
  expect(texts.Warmer).toContain('Thank you for your time — I’d love to work with you on this.');
  expect(texts.Formal).not.toMatch(/!/);
  expect(texts.Formal).toMatch(/^Dear Dana,|\nDear Dana,/m);
});
