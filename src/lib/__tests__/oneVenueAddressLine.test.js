// ONE VENUE ADDRESS LINE (owner report, iPad, 11/21/2026).
//
// "The venue input for addresses doesn't geocode correctly. Should find city
// and state with zip. Then on space seats and helpers, the state is not being
// picked up. Also in invite not picking up all of address."
//
// Every reader builds the place from formatVenueAddress (venueFor.js): street,
// city, ST ZIP when known, never an invented part. The Venue input reuses the
// app's one address lookup (fetchAddressSuggestions, OpenStreetMap), whose
// results are now read whole: street, town, state, ZIP and coordinates.
import { venueFor, formatVenueAddress, setVenue } from '../venueFor';
import { nominatimToSuggestion } from '../addressSuggest';
import { derivePlaceIntelligence } from '../placeIntelligence';
import { inviteCardModel } from '../inviteCard';
import { buildVendorDetailsMessage } from '../vendorDetailsMessage';

const spaceLine = (ev) => derivePlaceIntelligence(ev).sections.find((s) => s.key === 'venue').detail;
const inviteWhere = (ev) => (inviteCardModel(ev).facts.find((f) => f.label === 'Where') || {}).value;

// The owner's shape: a street typed as the venue, her home, confirmed, with the
// town and state known and no ZIP.
const LEGACY = {
  id: 'e', type: 'Game Night', recordKind: 'host_event', venueKind: 'home', venueConfirmed: true,
  venue: '100 Example Ln', venueCity: 'Ft Washington', venueState: 'MD',
};
// What a picked suggestion stores.
const RESOLVED = {
  id: 'e', type: 'Game Night', recordKind: 'host_event', venueKind: 'home', venueConfirmed: true,
  venue: '', venueStreet: '100 Example Ln', venueCity: 'Annapolis', venueState: 'MD', venueZip: '21401',
  venueAddress: '100 Example Ln, Annapolis, MD 21401',
};

describe('formatVenueAddress', () => {
  test('a complete address reads street, city, ST ZIP', () => {
    expect(formatVenueAddress(RESOLVED)).toBe('100 Example Ln, Annapolis, MD 21401');
    expect(formatVenueAddress(RESOLVED, { style: 'address' })).toBe('100 Example Ln, Annapolis, MD 21401');
    expect(formatVenueAddress(RESOLVED, { style: 'town' })).toBe('Annapolis, MD 21401');
  });

  test('structured parts compose without a stored line', () => {
    const { venueAddress, ...parts } = RESOLVED;
    expect(formatVenueAddress(parts)).toBe('100 Example Ln, Annapolis, MD 21401');
  });

  test('a legacy street typed as the venue keeps its state', () => {
    expect(formatVenueAddress(LEGACY)).toBe('100 Example Ln, Ft Washington, MD');
  });

  test('a legacy line that already holds its town is not repeated', () => {
    expect(formatVenueAddress({ ...LEGACY, venue: '100 Example Ln, Ft Washington MD' }))
      .toBe('100 Example Ln, Ft Washington MD');
  });

  test('a ZIP already in a typed line is read, never invented', () => {
    const ev = { venueKind: 'venue', venueAddress: '12 Elm St, Decatur, GA 30030' };
    expect(venueFor(ev).zip).toBe('30030');
    expect(formatVenueAddress(ev)).toBe('12 Elm St, Decatur, GA 30030');
    expect(venueFor({ venueKind: 'venue', venueAddress: '12 Elm St' }).zip).toBe('');
  });

  test('a named venue shows its town with the state', () => {
    expect(formatVenueAddress({ venue: 'VFW Post 3150', venueCity: 'Alexandria', venueState: 'VA' }))
      .toBe('VFW Post 3150 · Alexandria, VA');
  });

  test('a named venue with a street shows both', () => {
    expect(formatVenueAddress({ venue: 'The Boathouse', venueKind: 'venue', venueStreet: '9 Dock Rd', venueCity: 'Annapolis', venueState: 'MD', venueZip: '21401' }))
      .toBe('The Boathouse · 9 Dock Rd, Annapolis, MD 21401');
  });

  test('a town alone at home names the state', () => {
    expect(formatVenueAddress({ venueKind: 'home', venueCity: 'Decatur', venueState: 'GA' })).toBe('At home in Decatur, GA');
  });
});

describe('every reader shows the state', () => {
  test('Space, seats & helpers', () => {
    expect(spaceLine(LEGACY)).toBe('Set: 100 Example Ln, Ft Washington, MD');
    expect(spaceLine(RESOLVED)).toBe('Set: 100 Example Ln, Annapolis, MD 21401');
  });

  test('the invite', () => {
    expect(inviteWhere(LEGACY)).toBe('100 Example Ln, Ft Washington, MD');
    expect(inviteWhere(RESOLVED)).toBe('100 Example Ln, Annapolis, MD 21401');
  });

  test('the vendor brief', () => {
    const msg = buildVendorDetailsMessage({ vendor: { name: 'DJ Example', category: 'DJ' }, event: { ...LEGACY, date: '2027-03-06' }, profile: {} });
    expect(msg.body).toMatch(/at 100 Example Ln, Ft Washington, MD\b/);
  });
});

describe('the lookup is read whole', () => {
  const HIT = {
    lat: '38.97', lon: '-76.49', name: '', display_name: '100, Example Lane, Annapolis, Anne Arundel County, Maryland, 21401, United States',
    address: { house_number: '100', road: 'Example Lane', town: 'Annapolis', county: 'Anne Arundel County', state: 'Maryland', 'ISO3166-2-lvl4': 'US-MD', postcode: '21401', country_code: 'us' },
  };

  test('street, town, state, ZIP and coordinates', () => {
    const s = nominatimToSuggestion(HIT);
    expect(s).toMatchObject({ street: '100 Example Lane', cityName: 'Annapolis', stateCode: 'MD', zip: '21401', lat: 38.97, lon: -76.49 });
    expect(s.line).toBe('100 Example Lane, Annapolis, MD 21401');
    expect(s.city).toBe('Annapolis, Maryland');   // the field older callers read
  });

  test('no postcode, no ZIP', () => {
    const { postcode, ...noZip } = HIT.address;
    const s = nominatimToSuggestion({ ...HIT, address: noZip });
    expect(s.zip).toBe('');
    expect(s.line).toBe('100 Example Lane, Annapolis, MD');
  });

  test('a picked suggestion stores the structured parts', () => {
    const patch = setVenue(LEGACY, { resolved: nominatimToSuggestion(HIT) });
    expect(patch).toMatchObject({
      venue: '', venueStreet: '100 Example Lane', venueCity: 'Annapolis', venueState: 'MD', venueZip: '21401',
      venueAddress: '100 Example Lane, Annapolis, MD 21401', venueLat: 38.97, venueLon: -76.49,
    });
    const after = { ...LEGACY, ...patch };
    expect(spaceLine(after)).toBe('Set: 100 Example Lane, Annapolis, MD 21401');
  });

  test('re-picking the same home keeps "your home, confirmed"', () => {
    const home = { ...LEGACY, venue: '100 Example Lane' };
    const patch = setVenue(home, { resolved: nominatimToSuggestion(HIT) });
    expect(patch.venueConfirmed).toBe(true);
    expect(patch.venueKind).toBe('home');
    // A different street is a new question.
    const other = setVenue(home, { resolved: nominatimToSuggestion({ ...HIT, address: { ...HIT.address, house_number: '200' } }) });
    expect(other.venueConfirmed).toBe(false);
  });

  test('a lookup with no town keeps the town the event already has in that state', () => {
    const { town, ...noTown } = HIT.address;
    const patch = setVenue({ ...LEGACY, venueCity: 'Annapolis' }, { resolved: nominatimToSuggestion({ ...HIT, address: noTown }) });
    expect(patch.venueCity).toBe('Annapolis');
    expect(patch.venueAddress).toBe('100 Example Lane, Annapolis, MD 21401');
  });

  test('saving as typed clears the old place\'s parts', () => {
    const patch = setVenue(RESOLVED, { name: '9 Other St' });
    expect(patch).toMatchObject({ venue: '9 Other St', venueStreet: '', venueZip: '', venueAddress: '' });
    expect(formatVenueAddress({ ...RESOLVED, ...patch })).not.toMatch(/21401/);
  });
});
