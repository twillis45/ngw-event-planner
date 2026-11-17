// Owner, 11/16/2026 (approved): a town typed without its state is PROPOSED with
// its state for one tap — only when the app's own city list has exactly one.
import { proposeTownFromHeard } from '../cityText';

test('Anaheim → Anaheim, CA (one in the list)', () => {
  expect(proposeTownFromHeard('Anaheim')).toEqual({ city: 'Anaheim', state: 'CA', label: 'Anaheim, CA' });
  expect(proposeTownFromHeard('  anaheim ')).toEqual({ city: 'Anaheim', state: 'CA', label: 'Anaheim, CA' });
});
test.each(['Springfield', 'Columbus', 'Kansas City'])('%s has more than one — nothing proposed', (t) => {
  expect(proposeTownFromHeard(t)).toBe(null);
});
test.each(['', 'Smallville', 'Anaheim, CA', '92805'])('"%s" — nothing proposed', (t) => {
  expect(proposeTownFromHeard(t)).toBe(null);
});
