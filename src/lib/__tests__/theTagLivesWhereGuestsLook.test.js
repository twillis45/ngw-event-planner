// ─── THE TAG LIVES WHERE GUESTS LOOK (owner, 11/16/2026) ────────────────────
// "Where are all places hashtags should live." With the host's tag on, the
// guest brief, the day-of "Update everyone" notes and the thank-you carry one
// line; with it off, none do. Never on a vendor note, a parking or time
// update, or a memorial's thank-you.
import { hashtagLine } from '../eventHashtag';
import { draftGuestBrief, draftGuestUpdate, draftThankYou, draftVendorOutreach } from '../doItForMe';

const TAG = '#VidasFriendsgiving2026';
const LINE = `Sharing photos from the day? Tag them ${TAG}.`;
const EV = { id: 'e1', name: 'Vida’s Friendsgiving', type: 'Friendsgiving', date: '2026-11-21', hashtag: TAG };
const OFF = { ...EV, hashtag: '' };

test('the line is exactly the stored tag, or nothing', () => {
  expect(hashtagLine(EV)).toBe(LINE);
  expect(hashtagLine(OFF)).toBe('');
  expect(hashtagLine({ hashtag: 'not a tag' })).toBe('');
  expect(hashtagLine(null)).toBe('');
});

test('the guest brief carries it before the day-of contact', () => {
  const b = draftGuestBrief(EV, { name: 'Vida' }).body;
  expect(b).toContain(LINE);
  expect(b.indexOf(LINE)).toBeLessThan(b.indexOf('Text Vida'));
  expect(draftGuestBrief(OFF, { name: 'Vida' }).body).not.toMatch(/Tag them/);
});

test('"Update everyone" carries it on the general and arrival notes only', () => {
  expect(draftGuestUpdate(EV, {}).body).toContain(LINE);
  expect(draftGuestUpdate(EV, { type: 'arrival' }).body).toContain(LINE);
  for (const type of ['parking', 'rain', 'location', 'time']) {
    expect(draftGuestUpdate(EV, { type }).body).not.toMatch(/Tag them/);
  }
  expect(draftGuestUpdate(OFF, {}).body).not.toMatch(/Tag them/);
});

test('the thank-you carries it; a memorial’s never does', () => {
  expect(draftThankYou(EV, { name: 'Vida' }).body).toContain(LINE);
  expect(draftThankYou({ ...EV, type: 'Memorial', honoree: 'Grace' }, { name: 'Vida' }).body).not.toMatch(/Tag them|#/);
  expect(draftThankYou(OFF, {}).body).not.toMatch(/Tag them/);
});

test('a vendor note never carries the tag', () => {
  const v = { id: 'v1', name: 'Harvest Table Catering', category: 'Catering', status: 'Considering' };
  const d = draftVendorOutreach(EV, v, { name: 'Vida' });
  expect(JSON.stringify(d)).not.toContain(TAG);
});
