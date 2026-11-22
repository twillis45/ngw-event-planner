// ─── WHAT THE CREATION BOX HEARS (audit lane B, 11/22/2026) ──────────────────
//
// Forty-two sentences typed into "Start my event" with the clock fixed at
// Sunday 11/22/2026, noon. Five creation*.test.js files pin the findings,
// one each, every one watched failing before its fix:
//
//   1. A common word is not a month: "maybe 30-35" was May 30 – Jun 4,
//      "married 25 years" was Mar 25, "my junior 17 friends" was Jun 17.
//   2. The occasion she named is the playbook: a celebration of life, a
//      Kwanzaa gathering and a Juneteenth celebration were all Birthdays; a
//      Memorial Day camping trip was a Day Party; a brunch was a cookout; a
//      church fish fry fundraiser was a ballroom gala.
//   3. "after the funeral" does not name the repast's honoree "After".
//   4. Every clause is used or reported: BYOB the playbook cannot hold, a bare
//      weekday, "this/next weekend", places inside a used phrase. "next
//      September" and "sometime in February" are a month to pick from.
//   5. "no kids" is the Halloween audience; "DJ already booked" is booked.
//
// The clock: `now` is passed to the parser, and Date is frozen for the
// clause reader (which takes no clock). Local noon, so the day is Sunday
// 11/22 in every timezone, Kiritimati (UTC+14) and Midway (UTC-11) included.
import { parseSmartEventText } from '../smartParseEvent';
import { getPlaybook } from '../playbooks';

const NOW = new Date(2026, 10, 22, 12, 0, 0);
const p = (text) => parseSmartEventText(text, { now: NOW });

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(NOW); });
afterEach(() => { jest.useRealTimers(); });

test('the clock is Sunday, November 22, 2026, wherever this runs', () => {
  expect([NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), NOW.getDay()]).toEqual([2026, 10, 22, 0]);
});

describe('2 · the occasion she named is the playbook', () => {
  test('a celebration of life is a repast, not a birthday', () => {
    const r = p('Celebration of life for my uncle Ray next Saturday at 2pm at the VFW, 75-100 people');
    expect(r.type).toBe('Repast');
    expect(r.typeBasis).toBe('named');
    expect(r.honoree).toBe('Ray');
  });
  test('Kwanzaa is the Kwanzaa Gathering playbook, however it is said', () => {
    expect(p('Kwanzaa gathering Dec 26 – Jan 1 at our house for family, about 20').type).toBe('Kwanzaa Gathering');
    expect(p('kwanzaa party for 20').type).toBe('Kwanzaa Gathering');
  });
  test('Juneteenth is the Juneteenth Cookout playbook', () => {
    const r = p('Juneteenth celebration at the park June 19, around 75 people, budget about $1,500');
    expect(r.type).toBe('Juneteenth Cookout');
    expect(r.typeBasis).toBe('named');
    // A reunion she joined to it keeps both, reunion first, as before.
    const both = p('Juneteenth cookout and family reunion June 19-21, 2027 in Tulsa, 120 people');
    expect([both.type, both.secondaryType]).toEqual(['Reunion', 'Juneteenth Cookout']);
  });
  test('a Memorial Day weekend camping trip is a group trip, not a Day Party', () => {
    expect(p('Memorial Day weekend camping trip with 4 families').type).toBe('Group Trip');
  });
  test('a brunch is not a cookout: no "Host grills everything"', () => {
    for (const text of ['Easter brunch at my house, 16 people including 6 kids', "Mother's Day brunch for 12 at a restaurant downtown"]) {
      const type = p(text).type;
      expect([text, type]).not.toEqual([text, 'Get-Together']);
      const options = (getPlaybook(type).decisions || []).flatMap((d) => d.options || []);
      expect(options.filter((o) => /grill/i.test(String(o)))).toEqual([]);
    }
  });
  test('a church fish fry fundraiser is a Fish Fry, not a ballroom gala', () => {
    expect(p('fish fry fundraiser at the church april 25, about 200 people').type).toBe('Fish Fry');
    // A gala she names is still a gala.
    expect(p('charity gala at the Hilton, 200 guests').type).toBe('Fundraiser / Gala');
  });
});
