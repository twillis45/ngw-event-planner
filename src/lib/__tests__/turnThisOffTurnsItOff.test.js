// "TURN THIS OFF" TURNS IT OFF (owner call B, live hunt item 3, 11/16/2026).
// The first-open analytics notice's one action read "Turn this off" and only
// opened Settings — nothing was turned off. Now the action itself opts out.
// The notice never renders in e2e (analytics is off on localhost), so the
// action is pinned here, where it lives.
import { analyticsNoticeAction, isAnalyticsOptedOut, setAnalyticsOptOut } from '../analytics';

afterEach(() => { setAnalyticsOptOut(false); });

test('the action is labeled "Turn this off" and turns analytics off', () => {
  setAnalyticsOptOut(false);
  const done = jest.fn();
  const a = analyticsNoticeAction(done);
  expect(a.label).toBe('Turn this off');
  expect(isAnalyticsOptedOut()).toBe(false);
  a.fn();
  expect(isAnalyticsOptedOut()).toBe(true);
  expect(done).toHaveBeenCalledTimes(1);
});
