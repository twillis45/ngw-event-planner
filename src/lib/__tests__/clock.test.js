// One reader for a stored clock time, both forms (found live 11/19/2026:
// a helper ask said "4:00 AM" for a 4 PM party).
import { clock12, parseClock } from '../clock';

test.each([
  ['16:00', '4:00 PM'], ['4:00 PM', '4:00 PM'], ['4:00 pm', '4:00 PM'], ['4:00PM', '4:00 PM'],
  ['12:00 PM', '12:00 PM'], ['12:00 AM', '12:00 AM'], ['00:15', '12:15 AM'], ['9:05', '9:05 AM'],
])('%s reads %s', (stored, said) => { expect(clock12(stored)).toBe(said); });

test.each(['', null, 'evening', 'in the afternoon', '4pm'])('%p is not guessed at', (t) => {
  expect(clock12(t)).toBe('');
  expect(parseClock(t)).toBeNull();
});
