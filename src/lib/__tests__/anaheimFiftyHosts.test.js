// 50 synthetic hosts planned Jordan's 50th in Anaheim from the creation screen
// (owner, 11/16/2026: "this venue business needs less friction and keep in mind
// where everyone stays is part of some workflows"). These are the sentences
// that broke, each read the way its host meant it.
import { parseSmartEventText } from '../smartParseEvent';

const p = (s) => parseSmartEventText(s);

describe('a hotel that is the PARTY is not a place to sleep', () => {
  // "Staying overnight · heard" lit up because the venue's own name holds the
  // word "Hotel", and the party became a trip: lodging, travel, the pass pitch.
  test.each([
    "Jordan's 50th at Anaheim Majestic Garden Hotel, Anaheim, CA, June 12, 2027, 50 guests",
    "Jordan's 50th birthday at Hotel Fera in Anaheim, CA June 12 2027",
  ])('%s', (s) => {
    const r = p(s);
    expect(r.overnight).not.toBe(true);
    // A town with its state is still the parser's 'place-named' guess, which the
    // shell never commits; what must not fire is a real travel signal.
    expect([null, 'place-named']).toContain(r.destinationBasis);
  });
  test('guests who really stay there still count', () => {
    const r = p('50th birthday weekend at Hotel Fera in Anaheim, CA, June 11-13 2027, 40 people, everyone staying at the hotel');
    expect(r.overnight).toBe(true);
  });
  test('"room block" outside the name still counts', () => {
    expect(p("Jordan's 50th at Embassy Suites Anaheim South, Anaheim, CA, June 12 2027, 60 guests, room block for travelers").overnight).toBe(true);
  });
});

describe('a street named for a landmark is not a trip there', () => {
  test('1530 S Disneyland Dr, Anaheim is an address, not Disneyland', () => {
    const r = p('50th birthday party, 1530 S Disneyland Dr, Anaheim, CA 92802, June 12 2027, 70 guests');
    expect(r.venueAddress).toBe('1530 S Disneyland Dr');
    expect([null, 'place-named']).toContain(r.destinationBasis);
  });
  test('(control) a trip TO Disneyland is still a trip', () => {
    const r = p('Family trip to Disneyland for my 50th birthday, June 11-14 2027, 12 of us');
    expect(r.isDestination).toBe(true);
    expect(r.destinationBasis).not.toBe('place-named');
  });
});

describe('the occasion and the person, said the ordinary ways', () => {
  test('"Surprise 50th for my husband Jordan" is a birthday', () => {
    const r = p('Surprise 50th for my husband Jordan at Anaheim Majestic Garden Hotel, Anaheim, CA, June 12, 2027, 50 guests');
    expect(r.type).toBe('Birthday');
    expect(r.milestone).toBe('50th');
  });
  test('"Jordan turns 50!" names Jordan', () => {
    expect(p('Jordan turns 50! Party at the Phoenix Club in Anaheim, CA, Saturday 6/12/2027, 75 guests').honoree).toBe('Jordan');
  });
  test('(control) a 50th for a couple is still an anniversary', () => {
    expect(p("My parents' 50th anniversary at the Phoenix Club, Anaheim, CA, June 12 2027").type).toBe('Anniversary');
  });
});

describe('more of what the 50 hosts typed', () => {
  test('"50th birthday BBQ in my backyard" is a 50th birthday, served as a BBQ', () => {
    const r = p('50th birthday BBQ in my backyard, Anaheim, CA, June 12, 2027, 50 people');
    expect(r.type).toBe('Birthday');
    expect(r.milestone).toBe('50th');
    expect(r.venueKind).toBe('home');
  });
  test('a venue followed straight by its date is kept', () => {
    expect(p('50th birthday party at Anaheim Majestic Garden Hotel June 12-13 2027 for 50, family staying overnight there').venue)
      .toBe('Anaheim Majestic Garden Hotel');
  });
});
