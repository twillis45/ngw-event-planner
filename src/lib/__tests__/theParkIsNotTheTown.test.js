// ─── THE PARK IS NOT THE TOWN, AND THE BRAND IS NOT A PLACE ──────────────────
//
// THE REPORTED DEFECT, reproduced before anything was written (2026-09-25):
//
//   "50th birthday nov 2027 8 couples 5 nights Disneyland"
//     -> isDestination false, venueCity null, destinationBasis null
//   "50th birthday nov 2027 8 couples 5 nights in Anaheim"
//     -> isDestination true,  venueCity 'Anaheim'
//
// One word apart, and the first answers "Local event" for a five-night trip —
// which removes the lodging axis, group transport, the reveal's lodging stage
// and foodSpanNote, all gated on isDestination === true. Hosts name the PARK.
//
// WHAT THIS FILE HOLDS DOWN is not coverage — it is the two refusals that make
// the gazetteer safe to widen later:
//
//   1. AN AMBIGUOUS BARE BRAND RESOLVES TO NOTHING. "Six Flags" is nineteen
//      parks, "Busch Gardens" two, "SeaWorld" three, "Legoland" two, "Disney"
//      two resorts on opposite coasts. Guessing one would not degrade a plan,
//      it would RELOCATE it — weather, market band, maps and the travel lane
//      all move to a city the host never named, confidently and silently.
//
//   2. AN ORDINARY SENTENCE IS NEVER A PARK. Every match is a distinctive
//      multi-word phrase or an unambiguous single word; no short generic
//      fragment is admitted. The negative control below is the standing proof.
//
// A NOTE ON WHAT THIS FILE DOES NOT ASSERT. Guest count and night count on the
// reported sentence are a separate fix landing in the same file this session;
// asserting them here would couple this gate to work that is not its subject.
// The three fields this owns are isDestination, venueCity and venueState.
import { parseSmartEventText } from '../smartParseEvent';
import {
  matchLandmark, ALL_LANDMARKS, AMBIGUOUS_BARE, NO_SINGLE_GATEWAY, UNVERIFIED_KNOWN_GAPS,
} from '../knowledge/landmarkGazetteer';

const REPORTED = '50th birthday nov 2027 8 couples 5 nights Disneyland';

describe('the park a host names resolves to the town the operator publishes', () => {
  test('the reported sentence reaches the travel stack with Anaheim, CA on it', () => {
    const r = parseSmartEventText(REPORTED);
    expect(r.isDestination).toBe(true);
    expect(r.venueCity).toBe('Anaheim');
    expect(r.venueState).toBe('CA');
    // Reported as itself, not dressed up as the host's own travel wording and
    // not as the bare-city guess HostShellV2 declines to commit.
    expect(r.destinationBasis).toBe('landmark-named');
  });

  test('the same sentence with the city instead of the park is unchanged', () => {
    // The pre-existing path still works — this fix adds a door, it does not
    // move the one that was already open.
    const r = parseSmartEventText('50th birthday nov 2027 8 couples 5 nights in Anaheim');
    expect(r.isDestination).toBe(true);
    expect(r.venueCity).toBe('Anaheim');
  });

  test('Walt Disney World resolves to the address Disney publishes, not the metro it markets', () => {
    // Disney's own site says both: the homepage title reads "Orlando, Florida
    // – Official Site" while the Magic Kingdom page's PostalAddress markup
    // reads "addressLocality":"Lake Buena Vista". The parks are in Bay Lake and
    // Lake Buena Vista, outside Orlando's city limits. We carry the published
    // address, because it geocodes to the resort and "Orlando" geocodes twenty
    // miles away downtown.
    const r = parseSmartEventText('Family reunion at Disney World July 2027, 5 nights');
    expect(r.venueCity).toBe('Lake Buena Vista');
    expect(r.venueState).toBe('FL');
    expect(r.isDestination).toBe(true);
  });

  test('a park inside a wider brand resolves only when the name is disambiguated', () => {
    expect(matchLandmark('Six Flags Magic Mountain')).toMatchObject({ city: 'Valencia', state: 'CA' });
    expect(matchLandmark('Busch Gardens Williamsburg')).toMatchObject({ city: 'Williamsburg', state: 'VA' });
    expect(matchLandmark('Busch Gardens Tampa')).toMatchObject({ city: 'Tampa', state: 'FL' });
    expect(matchLandmark('SeaWorld San Diego')).toMatchObject({ city: 'San Diego', state: 'CA' });
    expect(matchLandmark('Legoland Florida')).toMatchObject({ city: 'Winter Haven', state: 'FL' });
    expect(matchLandmark('Carowinds')).toMatchObject({ city: 'Charlotte', state: 'NC' });
    expect(matchLandmark('Cedar Point')).toMatchObject({ city: 'Sandusky', state: 'OH' });
  });
});

describe('an ambiguous brand name resolves to nothing rather than to a guess', () => {
  test.each(AMBIGUOUS_BARE)('bare "%s" names no city', (brand) => {
    expect(matchLandmark(brand)).toBeNull();
  });

  test('a bare brand in a whole sentence still commits no city', () => {
    // The failure this prevents: a Texas host planning a Six Flags day trip
    // being handed Valencia, California — weather, market band and maps all
    // wrong, with no visible reason why.
    const r = parseSmartEventText('Birthday party at Six Flags in July for 20 kids');
    expect(r.venueCity).toBeNull();
    expect(r.venueState).toBeNull();
  });

  test('"Magic Mountain" and "Great America" need the brand word, because each names more than one place', () => {
    // Magic Mountain is also a Vermont ski area; Great America is also
    // California's Great America in Santa Clara. A miss here is the right
    // answer, not a gap.
    expect(matchLandmark('Magic Mountain')).toBeNull();
    expect(matchLandmark('Great America')).toBeNull();
  });
});

describe('NEGATIVE CONTROL — an ordinary sentence is never read as a park', () => {
  // Each of these contains a word or fragment that a careless matcher would
  // grab. None of them names a park, and none may produce a city.
  const ORDINARY = [
    'Backyard cookout June 14 for 40 people, burgers and a cedar plank salmon',
    'Kids party at the park Saturday, 15 kids, pizza and cake',
    'Movie night, we are doing a Disney marathon in the living room',
    'Dessert table: Hershey bars, s’mores, brownies',
    'Retirement dinner for 30, the flags come down at sunset',
    'Garden party for 25 in the afternoon',
    'Anniversary dinner at the point overlooking the water',
    'Sea food boil for 18 people in August',
  ];
  test.each(ORDINARY)('no landmark in: %s', (text) => {
    expect(matchLandmark(text)).toBeNull();
  });

  test('and none of them commits a venue city through the parser either', () => {
    for (const text of ORDINARY) {
      const r = parseSmartEventText(text);
      expect([null, '']).toContain(r.venueCity);
    }
  });
});

describe('every row is a sourced fact, not a recollection', () => {
  test('each entry carries a real two-letter state and a primary source URL', () => {
    // The sourcing rule is the whole value of the table. A row that cannot say
    // where its city came from is the row that silently relocates a plan.
    expect(ALL_LANDMARKS.length).toBeGreaterThan(0);
    for (const l of ALL_LANDMARKS) {
      expect(l.city).toEqual(expect.any(String));
      expect(l.city.trim().length).toBeGreaterThan(1);
      expect(l.state).toMatch(/^[A-Z]{2}$/);
      expect(l.source).toMatch(/^https:\/\//);
      expect(l.match.test(l.label)).toBe(true);  // the row matches its own name
    }
  });

  test('no two rows share an id', () => {
    const ids = ALL_LANDMARKS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ─── SECOND PASS 2026-09-25: THE DESTINATION IS NOT THE TOWN EITHER ──────────
//
// The gazetteer was widened past theme parks to the four families a milestone
// birthday or a family reunion actually names: Las Vegas properties, ski
// resorts, national parks and destination towns. Same defect, same shape — the
// host names the PLACE and the parser answered "Local event".
//
// These blocks hold down the widened table's three properties, in the order
// they cost the most if they break:
//
//   1. THE NEW REFUSALS. Three of them are MEASURED against this repo's own
//      seed data, not imagined: "Mount Zion Baptist Church" (Petersburg, VA),
//      "Strip beds per host request" and the venue "Aspen Hall". Each bare word
//      would have relocated a real seeded plan to another state.
//   2. THE TWO PARKS WITH NO GATEWAY. Yellowstone and Yosemite resolve to
//      nothing, because NPS names no single town for either and inventing one
//      is the same failure as guessing which Six Flags.
//   3. NO SECOND SOURCE OF TRUTH. Outer Banks, Branson and the Smokies belong
//      to vacationAreas.js, which smartParseEvent reads FIRST. A row here would
//      be dead code today and a contradiction the day either file changed.

describe('Las Vegas — the property a host names resolves to the city it publishes', () => {
  // Bellagio, MGM Grand, Aria, Mandalay Bay and the Cosmopolitan all sit in
  // unincorporated Paradise, NV, and not one of them publishes Paradise. We
  // carry what the operator publishes, which is the same rule that gave Walt
  // Disney World "Lake Buena Vista" rather than the "Orlando" it markets.
  test.each([
    ['Bellagio'],
    ['MGM Grand'],
    ['Mandalay Bay'],
    ['Aria Resort'],
    ['The Cosmopolitan of Las Vegas'],
    ['Wynn Las Vegas'],
    ['Las Vegas Strip'],
    ['Vegas Strip'],
    ['Las Vegas'],
  ])('%s -> Las Vegas, NV', (text) => {
    expect(matchLandmark(text)).toMatchObject({ city: 'Las Vegas', state: 'NV' });
  });

  test('the milestone-birthday sentence reaches the travel stack', () => {
    // The reported defect's exact shape, one family over.
    const r = parseSmartEventText('40th birthday 3 nights at the Bellagio, 10 of us');
    expect(r.isDestination).toBe(true);
    expect(r.venueCity).toBe('Las Vegas');
    expect(r.venueState).toBe('NV');
  });
});

describe('ski resorts resolve to the town, including when the two have different names', () => {
  test.each([
    ['Vail', 'Vail', 'CO'],
    ['Breckenridge', 'Breckenridge', 'CO'],
    ['Park City', 'Park City', 'UT'],
    ['Aspen Snowmass', 'Aspen', 'CO'],
    ['Killington', 'Killington', 'VT'],
    ['Stowe', 'Stowe', 'VT'],
  ])('%s -> %s, %s', (text, city, state) => {
    expect(matchLandmark(text)).toMatchObject({ city, state });
  });

  test('the three whose resort name is NOT the town name', () => {
    // These are the rows worth a test of their own: a host who books lodging in
    // "Jackson" is twelve miles from the mountain, and the resort's own contact
    // page says Teton Village.
    expect(matchLandmark('Jackson Hole')).toMatchObject({ city: 'Teton Village', state: 'WY' });
    expect(matchLandmark('Big Bear')).toMatchObject({ city: 'Big Bear Lake', state: 'CA' });
    expect(matchLandmark('Mammoth Mountain')).toMatchObject({ city: 'Mammoth Lakes', state: 'CA' });
  });

  test('a ski week reaches the travel stack with the state on it', () => {
    // usCities.js already carries the bare word "Vail" through
    // resolveSpokenCity, but deliberately with state: null. The gazetteer is
    // the sourced layer that can supply CO, and the parser prefers it.
    const r = parseSmartEventText('50th birthday ski week Breckenridge, 6 couples, 5 nights');
    expect(r.isDestination).toBe(true);
    expect(r.venueCity).toBe('Breckenridge');
    expect(r.venueState).toBe('CO');
  });
});

describe('national parks — three gateways NPS names, two it does not', () => {
  test('a park whose own NPS page names one town resolves to that town', () => {
    expect(matchLandmark('Zion National Park')).toMatchObject({ city: 'Springdale', state: 'UT' });
    expect(matchLandmark('Acadia National Park')).toMatchObject({ city: 'Bar Harbor', state: 'ME' });
    expect(matchLandmark('Grand Canyon')).toMatchObject({ city: 'Grand Canyon', state: 'AZ' });
  });

  test.each(NO_SINGLE_GATEWAY)('"%s" resolves to nothing, because NPS names no gateway town', (name) => {
    // Yellowstone spans three states across five entrance towns; Yosemite's
    // gateways are four towns on three highways. NPS publishes the PARK as its
    // own address for both. Picking one entrance would relocate a host to a
    // different state from the one she meant, exactly like guessing a Six Flags.
    expect(matchLandmark(name)).toBeNull();
    expect(matchLandmark(`Family reunion at ${name} next July, 5 nights`)).toBeNull();
  });
});

describe('destination towns resolve, and the ones another file owns are not duplicated', () => {
  test.each([
    ['Gatlinburg', 'Gatlinburg', 'TN'],
    ['Pigeon Forge', 'Pigeon Forge', 'TN'],
    ['Myrtle Beach', 'Myrtle Beach', 'SC'],
    ['Destin', 'Destin', 'FL'],
    ['Sedona', 'Sedona', 'AZ'],
    ['Key West', 'Key West', 'FL'],
    ['Napa', 'Napa', 'CA'],
    ['Napa Valley', 'Napa', 'CA'],
  ])('%s -> %s, %s', (text, city, state) => {
    expect(matchLandmark(text)).toMatchObject({ city, state });
  });

  test('ONE SOURCE OF TRUTH — the areas vacationAreas.js owns get no row here', () => {
    // smartParseEvent reads matchVacationArea BEFORE matchLandmark, so a row
    // for any of these would be dead code today and a contradiction the day
    // either file changed. The parser must still land them, through that file.
    for (const id of ['outer-banks', 'branson', 'smoky-mountains', 'lake-tahoe']) {
      expect(ALL_LANDMARKS.map((l) => l.id)).not.toContain(id);
    }
    expect(parseSmartEventText('Family reunion in Gatlinburg, 5 nights').venueCity).toBe('Gatlinburg');
    expect(parseSmartEventText('Family reunion in the Smoky Mountains, 5 nights').venueCity).toBe('Gatlinburg');
    expect(parseSmartEventText('Reunion at the Outer Banks for a week').venueCity).toBe('Nags Head');
  });

  test('what we could not verify is named, not quietly recalled', () => {
    // Caesars Palace and the Venetian are two of the most-named properties on
    // the Strip and their city is trivially easy to recall. Recall is what this
    // file refuses, so they are a listed gap and NOT rows.
    expect(UNVERIFIED_KNOWN_GAPS.length).toBeGreaterThan(0);
    for (const name of UNVERIFIED_KNOWN_GAPS) expect(matchLandmark(name)).toBeNull();
  });
});

describe('NEGATIVE CONTROL II — the words that would have relocated a real plan', () => {
  // The first three are MEASURED against this repo's own seed data. They are
  // not hypotheticals: each string (or its near neighbour) is in src/data
  // today, and a bare match would have moved that event to another state.
  const MEASURED = [
    ['Mount Zion Baptist Church — Fellowship Hall, Petersburg VA', 'repastSampleEvent.js:27'],
    ['Late checkout granted. Strip beds per host request, take out trash.', 'sampleEventsDMV.js:3417'],
    ['Weather-dependent; indoor backup in Aspen Hall held via contingency.', 'sampleEventsExtra.js:6329'],
    ['Holiday party for Aspen Tech, 80 people', 'sampleClientsExtra.js:24'],
  ];
  test.each(MEASURED)('no landmark in seeded string: %s', (text) => {
    expect(matchLandmark(text)).toBeNull();
  });

  // The rest are ordinary host sentences containing a word the widened table
  // could have grabbed. None names a place and none may produce a city.
  const ORDINARY_II = [
    'Cookout in the backyard Saturday for 30',
    'Dinner party at my house Friday, 12 people',
    'Birthday at the park, 15 kids, pizza and cake',
    'Savannah turns 30 in March, dinner for 20',
    'Destination wedding planning starts next spring',
    'A mammoth cake for 60 people and a chocolate fountain',
    'Cosmopolitan cocktails at the bar, plus a mocktail option',
    'Napa cabbage slaw for 30, plus cornbread',
    'Aria sang at the ceremony and everyone cried',
    'Room block at the Hilton, Marriott as the backup',
    'Grand ballroom for the reception, 120 seated',
    'The wynn column on the scoreboard',
    'Key lime pie and a west-facing tent',
    'Big cake, bear-themed decorations for a 2nd birthday',
  ];
  test.each(ORDINARY_II)('no landmark in: %s', (text) => {
    expect(matchLandmark(text)).toBeNull();
  });

  test('and none of them commits a venue city or state through the parser', () => {
    for (const text of ORDINARY_II) {
      const r = parseSmartEventText(text);
      expect([null, '']).toContain(r.venueCity);
      expect([null, '']).toContain(r.venueState);
    }
  });
});
