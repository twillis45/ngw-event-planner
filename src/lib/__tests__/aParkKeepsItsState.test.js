// A park she named keeps its state (batch 11, #233 Left). #233 stopped
// "Sandy Point State Park, MD" reading as a town, and the ", MD" went with it:
// creation saved venue "Sandy Point State Park" with no state at all, so
// weather, prices and the town ask had nothing to work from. The state she
// typed is a fact; the town is still asked (a park is not a town).
import { parseSmartEventText } from '../smartParseEvent';
import { townFieldsToPersist } from '../townFieldsToPersist';

describe('a park she named keeps its state', () => {
  for (const [text, state] of [
    ['Surprise proposal at Sandy Point State Park, MD on June 5 2027', 'MD'],
    ['Proposal at Sandy Point State Park, Maryland June 5 2027', 'MD'],
    ['Picnic at Patapsco Valley State Park, MD for 30 on July 4', 'MD'],
  ]) {
    test(text, () => {
      const p = parseSmartEventText(text);
      expect(p.venue).toMatch(/State Park$/);
      expect(p.venueCity).toBeNull();
      expect(p.venueState).toBe(state);
    });
  }
  test('a town is still a town (College Park is not a park)', () => {
    const p = parseSmartEventText('Cookout in College Park, MD for 30 on July 4');
    expect(p.venueCity).toBe('College Park');
    expect(p.venueState).toBe('MD');
  });
});

describe('creation saves the state it heard', () => {
  test('a park with a state: the state is saved and no town is invented', () => {
    const p = parseSmartEventText('Surprise proposal at Sandy Point State Park, MD on June 5 2027');
    expect(townFieldsToPersist('', p)).toEqual({ venueCity: '', venueState: 'MD' });
  });
  test('"in Maryland" alone saves the state too', () => {
    const p = parseSmartEventText('cookout in Maryland for 30 on July 4');
    expect(townFieldsToPersist('', p)).toEqual({ venueCity: '', venueState: 'MD' });
  });
  test('a City, ST is saved as before', () => {
    const p = parseSmartEventText('Cookout in College Park, MD for 30 on July 4');
    expect(townFieldsToPersist('', p)).toEqual({ venueCity: 'College Park', venueState: 'MD' });
  });
  test('a town she typed herself wins, and a bare town is kept as heard', () => {
    const p = parseSmartEventText('Surprise proposal at Sandy Point State Park, MD on June 5 2027');
    expect(townFieldsToPersist('Annapolis, MD', p)).toEqual({ venueCity: 'Annapolis', venueState: 'MD' });
    expect(townFieldsToPersist('Annapolis', p)).toEqual({ venueCity: '', cityHeard: 'Annapolis' });
  });
  test('a ZIP is a ZIP', () => {
    expect(townFieldsToPersist('21401', {})).toEqual({ venueCity: '21401', venueZip: '21401' });
  });
});
