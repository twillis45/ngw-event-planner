// ─── THE TOWN CHIP READS A PLACE THE WAY THE SENTENCE DOES (11/24/2026) ──────
//
// Live build 8d1807ea, phone. "Thanksgiving dinner for 14 at my house on
// Thursday 11/26 at 3pm, budget $400" → the chip asks "Which town?". She typed
// "123 Maple St, Springfield, VA 22150" into it; the chip read "… — which
// state?" with the state right there, and creation saved venueCity '' and no
// street. The same address typed in the sentence saved the street, the city and
// the state. Two readers: the chip ran parseVenueLocation alone (it refuses any
// digit), the sentence ran parseSmartEventText. Now the chip reads through
// readPlace, which IS the sentence's reader.
import { parseSmartEventText } from '../smartParseEvent';
import { readPlace } from '../readPlace';
import { townFieldsToPersist } from '../townFieldsToPersist';

const SENTENCE = 'Thanksgiving dinner for 14 at my house on Thursday 11/26 at 3pm, budget $400';
const said = (place) => parseSmartEventText(
  'Thanksgiving dinner for 14 at my house, ' + place + ' on Thursday 11/26 at 3pm, budget $400');

describe('readPlace reads the three shapes', () => {
  test('a full street address', () => {
    expect(readPlace('123 Maple St, Springfield, VA 22150')).toEqual({
      venueAddress: '123 Maple St', venueCity: 'Springfield', venueState: 'VA', venueZip: '22150', located: true, missing: null,
    });
  });
  test('City, ST', () => {
    expect(readPlace('Springfield, VA')).toEqual({
      venueAddress: '', venueCity: 'Springfield', venueState: 'VA', venueZip: '', located: true, missing: null,
    });
  });
  test('a ZIP', () => {
    expect(readPlace('22150')).toEqual({
      venueAddress: '', venueCity: '22150', venueState: '', venueZip: '22150', located: true, missing: null,
    });
  });
  test('a town with no state asks for the state', () => {
    expect(readPlace('Chicago')).toMatchObject({ venueCity: 'Chicago', located: false, missing: 'state' });
  });
  test('a street with no town asks for the town and keeps the street', () => {
    expect(readPlace('123 Maple St')).toMatchObject({ venueAddress: '123 Maple St', venueCity: '', located: false, missing: 'town' });
  });
  test('something it cannot read is not located, and asks for the town', () => {
    expect(readPlace('the blue house past the church')).toMatchObject({ located: false, missing: 'town' });
  });
});

describe('the chip saves what the sentence saves', () => {
  const p = parseSmartEventText(SENTENCE);
  test('premise: the sentence names no town', () => {
    expect(p.venueKind).toBe('home');
    expect(p.venueCity).toBeNull();
  });
  for (const place of ['123 Maple St, Springfield, VA 22150', 'Springfield, VA', 'in 22150']) {
    test(place, () => {
      const s = said(place);
      const fromSentence = {
        ...(s.venueAddress ? { venueAddress: s.venueAddress } : {}),
        ...townFieldsToPersist('', s),
      };
      expect(townFieldsToPersist(place.replace(/^in /, ''), p)).toEqual(fromSentence);
    });
  }
  test('the address, exactly', () => {
    expect(townFieldsToPersist('123 Maple St, Springfield, VA 22150', p)).toEqual({
      venueAddress: '123 Maple St', venueCity: 'Springfield', venueState: 'VA', venueZip: '22150',
    });
  });
  test('City, ST saves no street', () => {
    expect(townFieldsToPersist('Springfield, VA', p)).toEqual({ venueCity: 'Springfield', venueState: 'VA' });
  });
  // A bare ZIP stays in venueCity too: InviteV2's geocode passthrough and
  // saveCity's shape read it there.
  test('a ZIP saves the ZIP', () => {
    expect(townFieldsToPersist('22150', p)).toEqual({ venueCity: '22150', venueZip: '22150' });
  });
});

describe('what it cannot read is kept, never dropped', () => {
  const p = parseSmartEventText(SENTENCE);
  test('an unreadable string is kept as heard', () => {
    expect(townFieldsToPersist('the blue house past the church', p))
      .toEqual({ venueCity: '', cityHeard: 'the blue house past the church' });
  });
  test('a street with a town it cannot place keeps both', () => {
    expect(townFieldsToPersist('123 Maple St, Sprngfeld', p))
      .toEqual({ venueAddress: '123 Maple St', venueCity: '', cityHeard: 'Sprngfeld' });
  });
  test('a street alone keeps the street and asks for the town', () => {
    expect(townFieldsToPersist('123 Maple St', p)).toEqual({ venueAddress: '123 Maple St', venueCity: '' });
  });
});

describe('the ZIP of a full address is kept, in both paths (owner ruling 11/24/2026)', () => {
  test('the sentence keeps it', () => {
    const s = said('123 Maple St, Springfield, VA 22150');
    expect(s.venueZip).toBe('22150');
    expect(townFieldsToPersist('', s)).toEqual({ venueCity: 'Springfield', venueState: 'VA', venueZip: '22150' });
  });
  test('a bare ZIP in the sentence lands in venueZip too', () => {
    expect(townFieldsToPersist('', said('in 22150'))).toEqual({ venueCity: '22150', venueZip: '22150' });
  });
  test('a spelled-out state followed by a ZIP', () => {
    expect(readPlace('123 Maple St, Springfield, Virginia 22150-1234')).toMatchObject({ venueState: 'VA', venueZip: '22150' });
  });
  test('a house number is never a ZIP', () => {
    expect(readPlace('20770 Main St, Greenbelt, MD')).toMatchObject({ venueAddress: '20770 Main St', venueZip: '' });
  });
  test('no ZIP, no venueZip', () => {
    expect(townFieldsToPersist('', said('Springfield, VA'))).toEqual({ venueCity: 'Springfield', venueState: 'VA' });
  });
});
