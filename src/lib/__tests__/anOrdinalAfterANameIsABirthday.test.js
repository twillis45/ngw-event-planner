// Gold run (GOLD-04, 11/5/2026): "Mom's 80th in Santa Fe, 30 people, June 14,
// she uses a walker…" resolved no occasion at all, so Creation asked "Which
// occasion?" — and the Creation box's own example reads "Mom's 80th in Santa
// Fe, 30 people, June 14". A possessive name and an ordinal, with no other
// occasion named, is how people say a milestone birthday.
import { parseSmartEventText } from '../smartParseEvent';

describe('"<Name>\'s Nth" names a milestone birthday', () => {
  test.each([
    ["Mom's 80th in Santa Fe, 30 people, June 14, she uses a walker and the altitude is hard on her", '80th'],
    ['Dad’s 70th at the lake house', '70th'],
    ["Grandma's 90th, about 40 of us", '90th'],
    ["Jaylen's 1st with family", '1st'],
  ])('%s → Birthday, %s', (s, ms) => {
    const p = parseSmartEventText(s);
    expect(p.type).toBe('Birthday');
    expect(p.milestone).toBe(ms);
  });
});

describe('an ordinal that is not a birthday stays what it is (controls)', () => {
  test('an anniversary is still an anniversary', () => {
    expect(parseSmartEventText("Mom and Dad's 50th anniversary").type).not.toBe('Birthday');
  });
  test('a stated occasion wins over the ordinal', () => {
    expect(parseSmartEventText("Lisa's 30th retirement party").type).not.toBe('Birthday');
  });
  test.each([
    "Lisa's 5th grade class party",
    'dinner on 5th Street for 8',
    'our 25th',
  ])('%s → not a milestone birthday', (s) => {
    const p = parseSmartEventText(s);
    expect(p.milestone).not.toBe(s.match(/\d+(?:st|nd|rd|th)/)[0]);
  });
});
