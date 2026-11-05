// Seen in Creation on 11/5/2026: "Planning around 3 — likely 3–3 make it."
// A band whose ends meet is one number; printing it as a range reads as a bug.
import { likelyAttendancePhrase } from '../attendanceModel';

test.each([
  [{ planned: 3, low: 3, high: 3 }, 'all 3'],
  [{ planned: 10, low: 9, high: 11 }, '9–11'],
  [{ planned: 4, low: 3, high: 3 }, '3'],
])('%o → %s', (band, out) => { expect(likelyAttendancePhrase(band)).toBe(out); });

test('no band, no phrase', () => {
  expect(likelyAttendancePhrase(null)).toBe('');
});
