// ─── THE INVITATION IS FROM HER, ONE SOURCE (owner, 11/21/2026) ──────────────
// Item 13 of the single-source audit. lib/hostNameFor.js.
import { hostNameFor } from '../hostNameFor';

test('a blank event line is filled from her profile name', () => {
  expect(hostNameFor({ hostName: '' }, { name: 'Dana Whitfield' })).toBe('Dana Whitfield');
});
test('the event’s own line wins over the profile', () => {
  expect(hostNameFor({ hostName: 'Dana & Lee' }, { name: 'Dana Whitfield' })).toBe('Dana & Lee');
});
test('control: neither leaves it blank, never a placeholder', () => {
  expect(hostNameFor({}, null)).toBe('');
});
