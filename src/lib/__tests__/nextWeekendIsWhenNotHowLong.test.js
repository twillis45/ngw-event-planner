// ─── "NEXT WEEKEND" SAYS WHEN, NOT HOW LONG ─────────────────────────────────
//
// Found 11/15/2026 driving the owner's own event through the built app:
// "Friendsgiving next weekend Saturday at Vida's … for 15 people" saved
// statedNights: 2 and passRequired: true (reason "multi-day") — a one-evening
// dinner silently became a two-night event that needs the $39 pass, and no
// screen showed it. The nights rule counts any "weekend" as two nights, which is
// right for a trip ("weekend in Anaheim", "bachelorette weekend trip") and wrong
// for "this weekend" / "next weekend", which name a date.
import { parseSmartEventText } from '../smartParseEvent';

const NOW = new Date('2026-11-15T12:00:00');
const p = (s) => parseSmartEventText(s, { now: NOW });

describe('a weekend named as a date is not two nights', () => {
  test.each([
    "Friendsgiving next weekend Saturday at Vida's for 15 people",
    'Friendsgiving next weekend at my place, 12 people',
    'game night this weekend, 6 people',
    'dinner party the coming weekend for 8',
  ])('%s → no nights', (s) => {
    expect(p(s).nights).toBe(null);
  });
});

describe('negative controls — a weekend trip or stay is still two nights', () => {
  test.each([
    'Bachelorette weekend in Anaheim for 10',
    'girls trip next weekend to Nashville, 8 of us',
    'reunion next weekend, everyone staying at the cabin, 20 people',
  ])('%s → 2 nights', (s) => {
    expect(p(s).nights).toBe(2);
  });
});
