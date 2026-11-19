// Owner ruling 11/19/2026 (plan G90): the old self-contained vendor brief
// link works until the event date, then is not live anymore.
import { snapshotStillLive } from '../vendorBriefSunset';

const at = (y, mo, d, h = 12) => new Date(y, mo - 1, d, h);

test('it shows before the event and on the day itself, to the last minute', () => {
  const b = { eventDate: '2026-11-21' };
  expect(snapshotStillLive(b, at(2026, 11, 19))).toBe(true);
  expect(snapshotStillLive(b, at(2026, 11, 21, 23))).toBe(true);
});

test('from the day after, it is not live', () => {
  expect(snapshotStillLive({ eventDate: '2026-11-21' }, at(2026, 11, 22, 0))).toBe(false);
  expect(snapshotStillLive({ eventDate: '2026-11-21T00:00:00Z' }, at(2027, 1, 2))).toBe(false);
});

test('a snapshot with no readable date keeps showing: nothing true to expire it by', () => {
  expect(snapshotStillLive({}, at(2030, 1, 1))).toBe(true);
  expect(snapshotStillLive({ eventDate: 'next Saturday' }, at(2030, 1, 1))).toBe(true);
  expect(snapshotStillLive(null, at(2030, 1, 1))).toBe(true);
});
