// ─── THE PARSER SEED CORPUS ──────────────────────────────────────────────────
//
// WHY THIS FILE EXISTS. Every real sentence a host types is evidence, and until
// now each one was spent once and thrown away: someone drove the app, found a
// defect, wrote a single targeted test for that one defect, and the sentence
// itself was gone. One sentence typed by the owner on 2026-09-18 — "Big game
// this Sunday at 1 pm at 8100 Ryan Way, Greenbelt MD. For 5 people." — found
// TWO defects that 446 green suites had missed. Sentences are the scarce
// resource. This file keeps them.
//
// ─── HOW TO ADD ONE (the whole workflow) ─────────────────────────────────────
//
//   1. Paste the sentence you just watched a host type. Append ONE line to
//      PARSE_CORPUS below.
//   2. Say where it came from in `from` — "owner seed 2026-09-18", "alpha
//      tester, 2026-09-20", "derived variant of #1". Provenance is what lets
//      the next person tell a real sentence from an invented one.
//   3. Fill `expect` with ONLY the fields that sentence actually supports. A
//      sentence with no budget in it does not get a `budget` expectation — it
//      gets one ONLY if the absence is the point, in which case write
//      `budget: null` deliberately (see the NEGATIVE entries below).
//   4. Run it:
//        CI=1 npx react-scripts test --watchAll=false \
//          --testPathPattern="parseCorpusGolden"
//      The golden test prints a per-field diff naming the sentence.
//   5. READ THE DIFF BEFORE YOU BELIEVE IT. If what the parser produced is
//      wrong, that is a defect — record it here with a `suspect` note and hand
//      it to whoever owns parser edits. Do not silently write the wrong value
//      into `expect` and move on; write it with the `suspect` note so the file
//      says out loud what it is preserving.
//
// ─── RULES THIS FILE OBEYS ───────────────────────────────────────────────────
//
//   * `now` is FIXED (corpusNow, below). Relative dates — "this Sunday",
//     "tomorrow", "in 2 weeks" — are only reproducible against a frozen clock.
//     Fri 18 Sep 2026 is the day the owner seed was typed.
//   * Expectations were DERIVED BY RUNNING the parser and then reviewed by
//     hand, one field at a time. Nothing here is a guess about what the parser
//     "probably" does.
//   * `suspect` marks an expectation that records CURRENT behaviour which
//     review judged WRONG. It is documentation, not an assertion: the golden
//     test still asserts the recorded value so the suite stays honest about
//     what ships today, and the note is the handoff. When the parser is fixed,
//     the golden test fails on that entry — which is the point.
//
// The entry shape:
//   { text, from, expect: { <parser field>: <value>, … }, suspect?: '…' }

// The frozen reference clock. A function, not a shared Date, so no test can
// mutate the corpus out from under another.
export function corpusNow() {
  return new Date(2026, 8, 18, 9, 0, 0); // Fri 18 Sep 2026, 09:00 local
}

// Every field parseSmartEventText returns. The golden test uses this to reject
// a typo'd field name in an `expect` block — an expectation on a field that
// does not exist would otherwise pass forever by comparing undefined.
export const PARSER_FIELDS = [
  'type', 'secondaryType', 'theme', 'guests', 'budget', 'date', 'endDate', 'monthYear',
  'milestone', 'isDestination', 'destinationBasis', 'travelMode', 'overnight', 'overnightBasis',
  'timeOfDay', 'startTime', 'startTimeBasis', 'venueAddress', 'honoree', 'venueKind', 'venue',
  'venueCity', 'venueState', 'vacationArea', 'kidsPolicy',
];

export const PARSE_CORPUS = [
  // ── The owner seed, and the two variants it demanded ──────────────────────
  { text: "Big game this Sunday at 1 pm at 8100 Ryan Way, Greenbelt MD. For 5 people.", from: 'owner seed 2026-09-18', expect: { type: 'Watch Party', date: '2026-09-20', startTime: '1:00 PM', startTimeBasis: 'said-exact', guests: 5, venueAddress: '8100 Ryan Way', venueCity: 'Greenbelt', venueState: 'MD', isDestination: true, destinationBasis: 'place-named' }, suspect: 'isDestination true for a street address in a named town with no travel language — a house number is the strongest "not a trip" signal there is, but namedPrivateHome only counts `home`/`venuePhrase`, so the bare-city fire-by-default rule wins and the budget band blends toward travel_led.' },
  { text: "The big game this Sunday at 1 pm at 8100 Ryan Way, Greenbelt MD. For 5 people.", from: 'derived variant of the owner seed — the article form', expect: { type: 'Watch Party', date: '2026-09-20', startTime: '1:00 PM', startTimeBasis: 'said-exact', guests: 5, venueAddress: '8100 Ryan Way', venueCity: 'Greenbelt', venueState: 'MD' } },
  { text: "Watch party this Sunday at 1 pm at 8100 Ryan Way, Greenbelt MD. For 5 people.", from: 'derived variant — the occasion named outright', expect: { type: 'Watch Party', date: '2026-09-20', startTime: '1:00 PM', startTimeBasis: 'said-exact', guests: 5, venueAddress: '8100 Ryan Way', venueCity: 'Greenbelt', venueState: 'MD' } },
  { text: "The big game this Sunday for 5 people", from: 'derived variant — the seed stripped to type + relative date', expect: { type: 'Watch Party', date: '2026-09-20', guests: 5, startTime: null, venueAddress: null, venueCity: null } },
  { text: "Big game at 8100 Ryan Way, Greenbelt MD for 5 people", from: 'derived variant — the seed with no time at all', expect: { type: 'Watch Party', guests: 5, venueAddress: '8100 Ryan Way', venueCity: 'Greenbelt', venueState: 'MD', date: null, startTime: null } },

  // ── Street addresses: suffix variants, unit tails, the ones that go wrong ──
  { text: "Party at 8100 Ryan Way, Greenbelt MD", from: 'derived variant — occasion word only', expect: { venueAddress: '8100 Ryan Way', venueCity: 'Greenbelt', venueState: 'MD', guests: null, date: null, startTime: null, type: 'Birthday' }, suspect: 'a bare "party" routes to Birthday. Nothing in the sentence names an occasion; the app commits to one anyway.' },
  { text: "Cookout at 7 pm at 1500 Anacostia Dr SE", from: 'derived variant — abbreviated suffix + DC quadrant', expect: { type: 'The Cookout', startTime: '7:00 PM', startTimeBasis: 'said-exact', venueAddress: '1500 Anacostia Dr', venueCity: null }, suspect: 'the "SE" quadrant is dropped. In DC the quadrant is what distinguishes four different real addresses, so the string that rides into the invite and the Maps link is ambiguous.' },
  { text: "Dinner at 6pm at 231 6th Avenue North, Nashville TN", from: 'derived variant — unspaced time, numbered street, spelled suffix', expect: { type: 'Dinner Party', startTime: '6:00 PM', startTimeBasis: 'said-exact', timeOfDay: 'evening', venueAddress: '231 6th Avenue', venueCity: 'Nashville', venueState: 'TN' } },
  { text: "Shower on Saturday at 2 pm at 418 King Street Apt 4B, Alexandria VA", from: 'derived variant — apartment tail', expect: { venueAddress: '418 King Street Apt 4B', venueCity: 'Alexandria', venueState: 'VA', startTime: '2:00 PM', startTimeBasis: 'said-exact', type: 'Day Party', date: null }, suspect: 'TWO. (1) type "Day Party" — the fallback substring match reads the "day" inside "Saturday". (2) date null — a bare weekday with no "this"/"next" is never parsed, so the one day she named is dropped.' },
  { text: "Housewarming at 77 Maple Ct Unit 12, Raleigh NC for 25 people", from: 'derived variant — unit tail, abbreviated suffix', expect: { type: 'Housewarming', guests: 25, venueAddress: '77 Maple Ct Unit 12', venueCity: 'Raleigh', venueState: 'NC' } },
  { text: "Graduation party at 4400 Massachusetts Avenue NW, Washington DC for 60", from: 'derived variant — a street named after a state, in a city named after a state', expect: { type: 'Graduation', guests: 60, venueAddress: '4400 Massachusetts Avenue', venueCity: 'Massachusetts Avenue NW', venueState: 'WA' }, suspect: 'the STREET LINE became the town: venueCity "Massachusetts Avenue NW", venueState "WA" (Washington STATE, from "Washington DC"). Weather, the venue check and the home comparison all read this.' },
  { text: "Baby shower at 1600 Pennsylvania Ave, Washington DC for 30", from: 'derived variant — same shape as the Massachusetts Ave case, shorter street', expect: { type: 'Baby Shower', guests: 30, venueAddress: '1600 Pennsylvania Ave', venueCity: 'Pennsylvania Ave', venueState: 'WA' }, suspect: 'same defect as the Massachusetts Avenue entry — street read as city, "Washington DC" read as Washington state.' },
  { text: "Retirement dinner at 6:30 PM at 12 Harbor Road, Annapolis MD", from: 'derived variant — :30 clock, spelled suffix', expect: { type: 'Retirement Party', startTime: '6:30 PM', startTimeBasis: 'said-exact', timeOfDay: 'evening', venueAddress: '12 Harbor Road', venueCity: 'Annapolis', venueState: 'MD' } },
  { text: "Graduation at 8100 Ryan Way Apt 2, Greenbelt, MD at 5:30pm", from: 'derived variant — unit tail AND a comma before the state', expect: { type: 'Graduation', venueAddress: '8100 Ryan Way Apt 2', venueCity: 'Greenbelt', venueState: 'MD', startTime: '5:30 PM', startTimeBasis: 'said-exact' } },
  { text: "Dinner party at 5 pm at 900 F St NW for 12", from: 'derived variant — single-letter street name', expect: { type: 'Dinner Party', guests: 12, startTime: '5:00 PM', venueAddress: '900 F St', venueCity: null }, suspect: 'quadrant "NW" dropped again — see the Anacostia Dr SE entry.' },

  // ── NEGATIVE: a number that is not an address, a budget or a guest count ───
  { text: "Birthday at 3 pm for 12 people", from: 'negative case — a bare time is not an address', expect: { venueAddress: null, venueCity: null, date: null, guests: 12, startTime: '3:00 PM', startTimeBasis: 'said-exact' } },
  { text: "Watch party for 20 guests", from: 'negative case — a guest count is not an address', expect: { type: 'Watch Party', guests: 20, venueAddress: null, budget: null, date: null, startTime: null, venueCity: null } },
  { text: "Cookout on Aug 2 for 30", from: 'negative case — a date is not an address', expect: { type: 'The Cookout', date: '2027-08-02', guests: 30, venueAddress: null, endDate: null } },
  { text: "Cookout for 8 people at my place", from: 'negative case — "my place" is a venue, not a street line', expect: { type: 'The Cookout', guests: 8, venueAddress: null, venueCity: null, venue: 'Home', venueKind: 'home' } },
  { text: "Party with 3 kegs and a taco truck", from: 'negative case — "3 kegs" is not a headcount', expect: { guests: null, budget: null, venueAddress: null, date: null, type: 'Birthday' }, suspect: 'a bare "party" routes to Birthday — same as the Ryan Way "Party at …" entry.' },
  { text: "Graduation cookout, 3 kegs, 40 people", from: 'negative case — the counting noun decides which number is the headcount', expect: { type: 'Graduation', guests: 40, budget: null } },
  { text: "Reunion in June for 30", from: 'negative case — a month with no year commits to nothing', expect: { type: 'Reunion', guests: 30, date: null, monthYear: null, endDate: null } },
  { text: "Cookout for 20 people", from: 'negative case — the minimum sentence; everything else must stay null', expect: { type: 'The Cookout', guests: 20, date: null, endDate: null, monthYear: null, budget: null, startTime: null, startTimeBasis: null, venueAddress: null, venueCity: null, venueState: null, honoree: null, theme: null, kidsPolicy: null, isDestination: false, destinationBasis: null, travelMode: null, overnight: null, milestone: null, secondaryType: null, vacationArea: null } },
  { text: "Bridal shower on Saturday for 20", from: 'negative case — a bare weekday is not parsed as a date', expect: { type: 'Bridal Shower', guests: 20, date: null }, suspect: 'the host named a day and it is dropped. "on Saturday" only resolves when written "this Saturday"/"next Saturday".' },
  { text: "Zoom baby shower for 20", from: 'negative case — "Zoom" is not a town', expect: { type: 'Baby Shower', guests: 20, venueCity: null, venueState: null, isDestination: false } },

  // ── Times: spaced, unspaced, a.m., 24-hour, bucket-disambiguated, bare ────
  { text: "Dinner at 7 PM for 10", from: 'derived variant — spaced uppercase meridiem', expect: { startTime: '7:00 PM', startTimeBasis: 'said-exact', timeOfDay: 'evening', guests: 10 } },
  { text: "Team tailgate at 11 a.m. for 15 people", from: 'derived variant — dotted a.m.', expect: { type: 'Watch Party', startTime: '11:00 AM', startTimeBasis: 'said-exact', guests: 15 } },
  { text: "Dinner party at 19:30 for 8", from: 'derived variant — 24-hour clock needs no reading', expect: { type: 'Dinner Party', startTime: '7:30 PM', startTimeBasis: 'said-exact', guests: 8 } },
  { text: "Wedding at 12 pm for 150", from: 'derived variant — noon, the meridiem edge', expect: { type: 'Wedding', startTime: '12:00 PM', startTimeBasis: 'said-exact', guests: 150 } },
  { text: "After party at 12 am for 30", from: 'derived variant — midnight, the other meridiem edge', expect: { startTime: '12:00 AM', startTimeBasis: 'said-exact', guests: 30 } },
  { text: "Cookout in the afternoon at 1 for 20", from: "derived variant — the host's own bucket disambiguates a bare hour", expect: { type: 'The Cookout', timeOfDay: 'afternoon', startTime: '1:00 PM', startTimeBasis: 'said-with-bucket', guests: 20 } },
  { text: "Birthday brunch at 10 for 24", from: 'derived variant — morning bucket keeps the bare hour in the AM', expect: { timeOfDay: 'morning', startTime: '10:00 AM', startTimeBasis: 'said-with-bucket', guests: 24, type: 'Get-Together', secondaryType: 'Birthday' }, suspect: 'the PRIMARY occasion is the birthday; "brunch" is the descriptor. It resolves the other way round, so the reveal names the event a Get-Together.' },
  { text: "Sunset cocktail party at 7 for 40", from: 'derived variant — "sunset" is an evening bucket', expect: { timeOfDay: 'evening', startTime: '7:00 PM', startTimeBasis: 'said-with-bucket', guests: 40 } },
  { text: "Cookout at my place at 4 for 20, no kids", from: 'derived variant — no meridiem, no bucket: the weakest basis', expect: { type: 'The Cookout', startTime: '4:00 PM', startTimeBasis: 'said-hour-only', guests: 20, kidsPolicy: 'adults_only', venue: 'Home', venueKind: 'home' } },
  { text: "Crab feast next Saturday at noon for 40 in the backyard", from: 'derived variant — "noon" is a bucket word, not a clock', expect: { type: 'Crab Feast', date: '2026-09-19', guests: 40, timeOfDay: 'afternoon', startTime: null, venue: 'Backyard', venueKind: 'home' } },

  // ── Dates: relative, absolute, ranges, month-only, season ─────────────────
  { text: "Baby shower tomorrow at 11am for 18 people", from: 'derived variant — "tomorrow"', expect: { type: 'Baby Shower', date: '2026-09-19', guests: 18, startTime: '11:00 AM', startTimeBasis: 'said-exact' } },
  { text: "Cookout today at 3pm in the backyard for 20, no kids", from: "derived variant — \"today\", the parser's own header sentence", expect: { type: 'The Cookout', date: '2026-09-18', startTime: '3:00 PM', guests: 20, kidsPolicy: 'adults_only', venue: 'Backyard', venueKind: 'home' } },
  { text: "Birthday party in 2 weeks for 30, $3,000 budget", from: 'derived variant — "in N weeks" + a comma-grouped budget', expect: { type: 'Birthday', date: '2026-10-02', guests: 30, budget: 3000, endDate: null } },
  { text: "Anniversary dinner on March 20 2027, budget 5000", from: 'regression sentence, host report 2026-07-16 (the year became the budget)', expect: { type: 'Anniversary', date: '2027-03-20', budget: 5000, timeOfDay: 'evening' } },
  { text: "Quinceanera on May 2 2027 for 120, budget $15,000", from: 'derived variant — absolute date, large comma budget, accented type', expect: { type: 'Quinceañera', date: '2027-05-02', guests: 120, budget: 15000 } },
  { text: "Holiday party December 12 2026 at 7pm, 80 people, adults only", from: 'derived variant — full month name, explicit year, time and policy', expect: { type: 'Holiday Party', date: '2026-12-12', startTime: '7:00 PM', guests: 80, kidsPolicy: 'adults_only' } },
  { text: "Picnic at the park for 40 on 7/4", from: 'derived variant — bare numeric date, rolled forward past today', expect: { date: '2027-07-04', guests: 40, venue: 'The park' } },
  { text: "Family reunion June 12-14, 2028 in Asheville NC for 24 people", from: 'regression sentence, board-confirmed 2026-07-26 (range end was dropped)', expect: { type: 'Reunion', date: '2028-06-12', endDate: '2028-06-14', guests: 24, overnight: true, overnightBasis: 'multi-day-span', venueCity: 'Asheville', venueState: 'NC', isDestination: true } },
  { text: "Birthday for 20 on June 12-14", from: 'derived variant — same range with no year, rolled forward', expect: { type: 'Birthday', date: '2027-06-12', endDate: '2027-06-14', guests: 20 } },
  { text: "Anniversary June 14-12 for 20", from: 'negative case — a backwards range is noise, never a span', expect: { type: 'Anniversary', date: '2027-06-14', endDate: null, guests: 20 } },
  { text: "Reunion Dec 30 to Jan 2 for 40", from: 'derived variant — the year-straddling range', expect: { type: 'Reunion', date: '2026-12-30', endDate: '2027-01-02', guests: 40, overnight: true, overnightBasis: 'multi-day-span' } },
  { text: "Reunion in Asheville Aug 3 to Aug 7 2027, 24 people", from: 'regression sentence, live probe 2026-08-03 (destination stack was dropped)', expect: { type: 'Reunion', date: '2027-08-03', endDate: '2027-08-07', guests: 24, isDestination: true, destinationBasis: 'place-named', venueCity: null } },
  { text: "Rehearsal dinner 11/13/2026 - 11/16/2026 in Charleston SC", from: 'regression sentence, host live report 2026-07-27 (numeric range end dropped)', expect: { date: '2026-11-13', endDate: '2026-11-16', overnight: true, overnightBasis: 'multi-day-span', venueCity: 'Charleston', venueState: 'SC', type: 'Dinner Party' } },
  { text: "Wedding weekend of June 12 2027 in Charleston, SC, 18 people flying in", from: 'derived variant — "weekend of" a Saturday extends forward to the Sunday', expect: { type: 'Wedding', date: '2027-06-12', endDate: '2027-06-13', guests: 18, travelMode: 'fly', isDestination: true, destinationBasis: 'travel-language', venueCity: 'Charleston', venueState: 'SC' } },
  { text: "Wedding in June of 2028 in Savannah, Georgia", from: 'derived variant — month + year is OPTIONS, never a committed day', expect: { type: 'Wedding', date: null, monthYear: { year: 2028, month: 5, label: 'Jun 2028' }, venueCity: 'Savannah', venueState: 'GA' } },
  { text: "Graduation party next month, about 45 people", from: 'derived variant — bare "next month"', expect: { type: 'Graduation', date: null, monthYear: { year: 2026, month: 9, label: 'Oct 2026' }, guests: 45 } },
  { text: "Holiday party this winter for 60, budget $8k", from: 'derived variant — a season, plus the $Nk budget shorthand', expect: { type: 'Holiday Party', budget: 8000, guests: 60, date: null, monthYear: { year: 2026, month: 0, label: 'Winter 2026' } }, suspect: 'from 18 Sep 2026, "this winter" resolves to JANUARY 2026 — eight months in the PAST. The date options offered to the host are all dates that already happened.' },

  // ── Destination / travel language ─────────────────────────────────────────
  { text: "Bachelorette weekend trip to Nashville for 10 of us, $200 a person", from: 'regression sentence, host report 2026-07-27 (per-person money read as a total)', expect: { type: 'Bachelorette Party', guests: 10, budget: 2000, isDestination: true, destinationBasis: 'travel-language', venueCity: null } },
  { text: "Destination 80th birthday celebration in Santa Fe, New Mexico, 10 of us", from: 'regression sentence, DESTINATION-1 + live drive 2026-08-04', expect: { type: 'Birthday', milestone: '80th', guests: 10, isDestination: true, destinationBasis: 'travel-language', venueCity: 'Santa Fe', venueState: 'NM' } },
  { text: "Family reunion at Deep Creek Lake for 30, 3 nights", from: 'regression sentence, host ask 2026-07-27 (a vacation AREA is not a City, ST)', expect: { type: 'Reunion', guests: 30, vacationArea: 'deep-creek', venue: 'Deep Creek Lake', venueCity: 'McHenry', venueState: 'MD', overnight: true, overnightBasis: 'said-so', isDestination: true } },
  { text: "Beach house getaway for 12, 4 nights, driving down", from: 'derived variant — a rented roof is a venue, not home', expect: { type: null, guests: 12, travelMode: 'drive', overnight: true, overnightBasis: 'said-so', isDestination: true, destinationBasis: 'travel-language', venueKind: 'venue' } },
  { text: "Retirement party for 60, out-of-town guests flying in", from: 'regression sentence, live drive 2026-08-05 ("flying in" did not match the bare stem)', expect: { type: 'Retirement Party', guests: 60, travelMode: 'fly', isDestination: true, destinationBasis: 'travel-language' } },
  { text: "Family reunion in Asheville for 24, hotel room block", from: 'derived variant — lodging words alone say overnight', expect: { type: 'Reunion', guests: 24, overnight: true, overnightBasis: 'said-so', isDestination: true, destinationBasis: 'place-named', venueCity: null } },
  { text: "Backyard BBQ at my brother's house in Greenbelt, MD", from: 'regression sentence, live-drive find 2026-09-13 (a named private home is not a trip)', expect: { type: 'The Cookout', isDestination: false, destinationBasis: null, venue: "My brother's house", venueKind: 'home', venueCity: 'Greenbelt', venueState: 'MD' } },
  { text: "Graduation cookout in Greenbelt, MD for 35", from: 'derived variant — the same town with NO named home', expect: { type: 'Graduation', guests: 35, isDestination: true, destinationBasis: 'place-named', venueCity: 'Greenbelt', venueState: 'MD' } },

  // ── Type routing, honoree, milestone, theme, kids policy ──────────────────
  { text: "Engagement party at the clubhouse for 50, adults only", from: 'derived variant — a public venue phrase kept verbatim', expect: { type: 'Engagement Party', guests: 50, venue: 'The clubhouse', kidsPolicy: 'adults_only' } },
  { text: "Kids birthday party at my brother's backyard on Saturday, kids welcome", from: 'derived variant — the other kids policy, and a possessive that is not an honoree', expect: { type: 'Birthday', kidsPolicy: 'kids_welcome', venue: "My brother's backyard", venueKind: 'home', honoree: null, date: null } },
  { text: "Bridal shower at 2 pm, black and gold theme, 30 people", from: 'derived variant — theme phrase captured, not dropped', expect: { type: 'Bridal Shower', theme: 'black and gold', startTime: '2:00 PM', guests: 30 } },
  { text: "Birthday celebration for Vida, 20 people, $2500 budget", from: 'regression sentence, host report 2026-07-27 (the honoree was dropped)', expect: { type: 'Birthday', honoree: 'Vida', guests: 20, budget: 2500 } },
  { text: "50th birthday and 30 year Army retirement for Wanda", from: 'regression sentence — a dual event, host report (birthday was dropped)', expect: { type: 'Retirement Party', secondaryType: 'Birthday', milestone: '50th', honoree: 'Wanda' } },
  { text: "Sweet 16 for 25 people", from: 'derived variant — a numeric type name is not a guest count', expect: { type: 'Sweet 16', guests: 25 } },
  { text: "Crab feast for 20 in the backyard", from: 'regression sentence — the oldest type-routing case in the suite', expect: { type: 'Crab Feast', secondaryType: null, guests: 20, venue: 'Backyard', venueKind: 'home' } },
];
