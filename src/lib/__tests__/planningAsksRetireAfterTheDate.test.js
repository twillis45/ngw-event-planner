// ─── PLANNING ASKS DO NOT OUTLIVE THE DAY (audit 2 lane C P0-5, P0-7) ─────────
//
// After the date: the permit question ("Does this need a city or park
// permit?") was still up, Calls to make read "5–12 open", and "Nothing needs
// you now" sat above "Needs you — 7 open". A call is a planning call — once the
// day has passed there is nothing left to decide, so the board holds no open
// calls. A question worth finding out BEFORE the day is not one to ask on it.
// Every clock is fixed.
import { playbookDecisionBoard } from '../playbooks';
import { placeQuestionsFor } from '../placeQuestions';

const WEDDING = {
  id: 'aud-wedding', name: 'Maya & Jordan’s Wedding', type: 'Wedding', date: '2027-10-16',
  startTime: '16:00', startTimeSource: 'host', venue: 'Bluemont Vineyard', venueCity: 'Bluemont, VA',
  guestMode: 'count', guestCount: 150, guestEstimate: 150, totalBudget: 45000,
  budget: [], guests: [], timeline: [], vendors: [], createdAt: '2026-12-20T15:00:00.000Z',
};
const TRIP = {
  id: 'aud-trip', name: 'Girls Trip to Nashville', type: 'Group Trip', date: '2027-05-13', endDate: '2027-05-16',
  isDestination: true, venueCity: 'Nashville', guestMode: 'count', guestCount: 8, guestEstimate: 8, totalBudget: 8000,
  budget: [], vendors: [], guests: [], timeline: [], createdAt: '2026-07-17T14:00:00.000Z',
};

beforeEach(() => { jest.useFakeTimers('modern'); });
afterEach(() => { jest.useRealTimers(); });
const at = (y, mo, d, h = 10) => jest.setSystemTime(new Date(y, mo - 1, d, h));

describe('the decision board', () => {
  test('before the day the wedding has open calls (unchanged)', () => {
    at(2027, 10, 1);
    expect(playbookDecisionBoard(WEDDING).open.length).toBeGreaterThan(0);
  });

  test('the day after and a week after, no call is open', () => {
    for (const d of [17, 23]) {
      at(2027, 10, d);
      const b = playbookDecisionBoard(WEDDING);
      expect(b.open).toEqual([]);
      expect(b.deferred).toEqual([]);
    }
  });

  test('a trip’s calls close once its last day has passed', () => {
    at(2027, 5, 17);
    expect(playbookDecisionBoard(TRIP).open).toEqual([]);
  });
});

describe('worth finding out', () => {
  test('the outdoor permit is asked before the day, not on it or after', () => {
    const ev = { ...WEDDING, venueKind: 'outdoor', isOutdoor: true, venue: 'Meadow Park' };
    at(2027, 9, 1);
    const before = placeQuestionsFor(ev).map((q) => q.id);
    at(2027, 10, 16);
    const onTheDay = placeQuestionsFor(ev).map((q) => q.id);
    at(2027, 10, 18);
    const after = placeQuestionsFor(ev).map((q) => q.id);
    // Only meaningful if the question exists at all before the day.
    if (before.length) {
      expect(onTheDay).toEqual([]);
      expect(after).toEqual([]);
    } else {
      throw new Error('fixture raises no place question before the day');
    }
  });
});
