// ─── LANDMARKS: THE PARK A HOST NAMES INSTEAD OF THE TOWN IT SITS IN ─────────
//
// THE DEFECT THIS EXISTS TO NAME. Measured 2026-09-25 against
// smartParseEvent (probe in landmarkGazetteer.test.js): the sentence
//
//     "50th birthday nov 2027 8 couples 5 nights Disneyland"
//
// parsed to isDestination: false, venueCity: null. Eight couples, five nights,
// and the app answered "Local event" — which silently removes the lodging
// axis, group transport, the reveal's lodging stage and foodSpanNote, all of
// which are gated on isDestination === true. Change the one word to "in
// Anaheim" and every one of them comes back. Hosts name the PARK. The park is
// the single most specific fact in that sentence and it was the one fact the
// parser threw away.
//
// ── WHY A FACT TABLE, AND WHY IT LIVES IN knowledge/ ─────────────────────────
//
// Same reason ZIP3_TO_STATE does (geoCostIndex.js): "Knott's Berry Farm is in
// Buena Park, CA" is a PUBLISHED FACT, not an estimate. Every row below was
// read off the operator's own site — its directions page, its park page, or
// the PostalAddress its own markup publishes — and the URL is on the row. No
// row was written from memory, and nothing here is geocoded at runtime (the
// never-build list holds, same as vacationAreas.js).
//
// This is the sibling of lib/vacationAreas.js, which already does exactly this
// for areas that are not cities ("Deep Creek Lake" -> McHenry, MD). A theme
// park is the same shape of problem — a name a host recognizes, sitting in a
// real town — so it gets the same three honest facts and none of a fourth.
//
// ── WHAT THIS REFUSES, WHICH IS THE POINT ────────────────────────────────────
//
//  1. AN AMBIGUOUS BARE BRAND RESOLVES TO NOTHING. "Six Flags" is nineteen
//     parks, "Busch Gardens" is two, "SeaWorld" is three, "Legoland" is two,
//     and a bare "Disney" is two resorts on opposite coasts. Guessing one
//     would relocate a host's entire plan — weather, market band, maps, the
//     travel lane — to a city she never named, and it would do it
//     confidently. Only a disambiguated name resolves. The bare brands are
//     listed in AMBIGUOUS_BARE below so the refusal is testable rather than
//     merely absent.
//
//  2. A PARK WE COULD NOT VERIFY IS NOT HERE. Universal Studios Hollywood,
//     Universal Orlando, Dollywood, Silver Dollar City, Kennywood and The
//     Great Escape are all parks hosts name, and all six sites either serve a
//     JavaScript shell with no address in it or answer 403 to a plain fetch.
//     Their cities are easy to recall and recall is exactly what this file
//     refuses. They stay out until someone reads them off a primary source.
//
//  3. NO STATE IS EVER INFERRED FROM A CITY NAME. Every state below came off
//     the same source line as its city.
//
// ── THE THREE ROWS THAT ARE GENUINELY TRICKY ─────────────────────────────────
//
// WALT DISNEY WORLD IS NOT IN ORLANDO. The parks sit in Bay Lake and Lake
// Buena Vista, two incorporated cities outside Orlando's limits — and Disney's
// own site says BOTH things: the homepage title reads "Orlando, Florida –
// Official Site" while the Magic Kingdom page's own PostalAddress markup reads
// `"addressLocality":"Lake Buena Vista","postalCode":"32830"`. We carry Lake
// Buena Vista, because it is the address Disney itself publishes for the park
// rather than the metro it markets to; it geocodes to the resort, the marketed
// name geocodes twenty miles away downtown. The town is a PRE-FILL the host
// sees and can edit (HostShellV2 town field), so the precise answer costs her
// one edit at worst and the vague one costs her a wrong weather reading.
//
// SIX FLAGS MAGIC MOUNTAIN IS VALENCIA, NOT SANTA CLARITA. Valencia is a
// community within the city of Santa Clarita, so both are defensible in
// English — but the park prints "26101 Magic Mountain Pkwy, Valencia, CA
// 91355" on its own directions page, so Valencia is what we carry.
//
// CAROWINDS STRADDLES THE NC/SC STATE LINE. Its own directions page prints
// "14523 Carowinds Blvd, Charlotte, NC 28273", so the NC side is the address
// the operator claims and the one we carry.
//
// SOURCES, all read 2026-09-25:
//   Disneyland Resort ............ https://disneyland.disney.go.com/
//   Walt Disney World ............ https://disneyworld.disney.go.com/destinations/magic-kingdom/
//   Knott's Berry Farm ........... https://www.sixflags.com/knotts/park-map-and-directions
//   Six Flags Magic Mountain ..... https://www.sixflags.com/magicmountain/directions
//   Cedar Point .................. https://www.sixflags.com/cedarpoint/directions
//   Carowinds .................... https://www.sixflags.com/carowinds/directions
//   Six Flags Great Adventure .... https://www.sixflags.com/greatadventure/directions
//   Six Flags Over Texas ......... https://www.sixflags.com/overtexas/directions
//   Six Flags Great America ...... https://www.sixflags.com/greatamerica/directions
//   Six Flags Over Georgia ....... https://www.sixflags.com/overgeorgia/directions
//   Six Flags Fiesta Texas ....... https://www.sixflags.com/fiestatexas/directions
//   SeaWorld Orlando ............. https://seaworld.com/orlando/park-info/directions/
//   SeaWorld San Diego ........... https://seaworld.com/san-diego/park-info/directions/
//   SeaWorld San Antonio ......... https://seaworld.com/san-antonio/park-info/directions/
//   Busch Gardens Williamsburg ... https://buschgardens.com/williamsburg/park-info/directions/
//   Busch Gardens Tampa Bay ...... https://buschgardens.com/tampa/park-info/directions/
//   LEGOLAND California .......... https://www.legoland.com/california/
//   LEGOLAND Florida ............. https://www.legoland.com/florida/
//   Hersheypark .................. https://www.hersheypark.com/

// ─── 2026-09-25 (same day, second pass): BEYOND THEME PARKS ──────────────────
//
// The defect above was never about theme parks. It was about a host naming a
// DESTINATION instead of a town, and theme parks were only the first family of
// them. A milestone birthday names Vegas; a 40th names a ski mountain; a family
// reunion names Gatlinburg or a national park. All of them parsed to "Local
// event" for the same reason Disneyland did.
//
// FOUR NEW FAMILIES, same three honest facts and the same sourcing rule.
//
// ── THE PARADISE QUESTION, AND WHY IT IS THE DISNEY QUESTION INVERTED ────────
//
// Most of the Strip is not in Las Vegas. Bellagio, MGM Grand, Aria, Mandalay
// Bay and the Cosmopolitan all sit in Paradise, an unincorporated town in Clark
// County outside the city limits, and by the Walt Disney World reasoning above
// — "carry the address the operator publishes, not the metro it markets" — you
// might expect us to carry Paradise.
//
// We carry Las Vegas, and it is the SAME rule, not an exception to it. The rule
// was never "prefer the smaller place"; it was "carry what the operator
// publishes." Disney publishes Lake Buena Vista on the Magic Kingdom page while
// marketing Orlando, so we carry Lake Buena Vista. Every Strip property
// publishes "Las Vegas, NV" — read off each property's own address block below
// — and not one of them publishes Paradise anywhere. Paradise is a fact about
// Clark County's incorporation map, not an address any of these operators
// claims. Carrying it would also read wrong to the host and geocode to a
// polygon rather than a door.
//
// ── NATIONAL PARKS: THREE RESOLVE, TWO ARE REFUSED ───────────────────────────
//
// A park with no single gateway town has no honest city. The test applied to
// each was narrow: does the park's OWN NPS page name one place?
//
//   Zion          -> Springdale, UT. nps.gov/zion directions says it plainly:
//                    "travel to Springdale, Utah", "found next to the town of
//                    Springdale". One gateway, named by NPS.
//   Acadia        -> Bar Harbor, ME. NPS contacts publishes the park's address
//                    as Bar Harbor, ME 04609.
//   Grand Canyon  -> Grand Canyon, AZ. NPS contacts publishes Grand Canyon, AZ
//                    86023 — that is Grand Canyon Village on the South Rim.
//                    CAVEAT ON THE ROW: the North Rim is a four-hour drive away
//                    through different gateway towns. We carry the one address
//                    NPS itself publishes for the park and let the host edit.
//
//   Yellowstone   -> REFUSED. The park spans WY, MT and ID across five entrance
//                    towns (West Yellowstone, Gardiner, Cooke City, Cody,
//                    Jackson) and NPS names none of them as THE gateway; its
//                    own mailing address is "Yellowstone National Park, WY",
//                    which is the park, not a town a host can book lodging in.
//   Yosemite      -> REFUSED for the same reason. NPS publishes "Yosemite, CA
//                    95389" — again the park itself. The gateways (El Portal,
//                    Mariposa, Oakhurst, Groveland) are four different towns on
//                    three different highways and NPS elevates none of them.
//
//   Great Smoky Mountains is not here at all: lib/vacationAreas.js has resolved
//   it to Gatlinburg, TN since 2026-07-27, and that registry is read FIRST by
//   smartParseEvent. A row here would be dead code and a second source of truth.
//
// ── WHAT usCities.js ALREADY COVERED, AND WHY SOME ROWS STILL EXIST ──────────
//
// cityText.js:resolveSpokenCity admits a bare town only if it appears in the
// curated lib/usCities.js list, and then deliberately returns state: null,
// because list membership is not a source. Napa, Sedona, Key West, Savannah,
// Charleston, Aspen, Vail, Park City, Stowe and Las Vegas are all already on
// that list and already come back as the host's own word.
//
// So these two layers answer different questions and cannot disagree:
//
//   resolveSpokenCity  "did she name a town at all?"  -> her word, no state.
//   this gazetteer     "what place is that, per a
//                       page we read?"                -> city + state + source.
//
// smartParseEvent (~1133) already prefers the gazetteer, and a gazetteer row
// only ever ADDS the state and the destination flag on top of the carry — it
// never contradicts it. A row is therefore not a second source of truth; for
// the state it is the first one. But a row is written only when it carries
// something the whitelist structurally cannot, which is why ordinary metros
// (Houston, Cleveland) get nothing here and never will.
//
// ALREADY HANDLED ELSEWHERE, DELIBERATELY NOT DUPLICATED:
//   Outer Banks  -> vacationAreas.js, hub town Nags Head, NC
//   Branson      -> vacationAreas.js, hub town Branson, MO
//   Smoky Mtns   -> vacationAreas.js, hub town Gatlinburg, TN
//   Lake Tahoe   -> vacationAreas.js, hub town South Lake Tahoe, CA
//
// ── FIVE NEW REFUSALS, THREE OF THEM MEASURED IN THIS REPO ───────────────────
//
// The hard rule is that a false positive does not degrade a plan, it RELOCATES
// it. These are the words that would have done exactly that, and three were
// caught by grepping this repo's own seed data rather than by imagination:
//
//   "Zion"      MEASURED. src/data/repastSampleEvent.js:27 — the venue is
//               "Mount Zion Baptist Church — Fellowship Hall" in Petersburg,
//               VA. A bare /zion/ would have moved a repast to Utah. The row
//               requires "Zion National Park".
//   "Strip"     MEASURED. src/data/sampleEventsDMV.js:3417 — a lodging note
//               reads "Strip beds per host request, take out trash." A bare
//               /strip/ would have sent that event to Nevada. Only "Las Vegas
//               Strip" and "Vegas Strip" match.
//   "Aspen"     MEASURED. src/data/sampleEventsExtra.js:6258 — "Aspen Hall" is
//               a venue in the sample data, and src/data/sampleClientsExtra.js
//               :24 has a client named "Aspen Tech". A bare /aspen/ would have
//               relocated a plan to Colorado twice over in seeded data alone.
//               The row requires "Aspen Snowmass" or "Aspen Mountain", the
//               operator's own two names for the resort.
//   "Savannah"  A top-40 US girls' name. "Savannah's 30th" is a far likelier
//               sentence in this app than a trip to Georgia, and the
//               destination reading is already covered twice without us:
//               parseVenueLocation resolves "Savannah, Georgia" (tested,
//               spokenCityGate.test.js:97) and resolveSpokenCity carries a bare
//               "in Savannah". No row.
//   "Charleston" Two real US cities, and BOTH are in usCities.js — Charleston,
//               SC and Charleston, WV. Refused exactly like "Six Flags".
//
// And three more that are refused for the older reason — the bare word names
// more than one thing: "Mammoth" (an adjective before it is a mountain),
// "Acadia" (a region of Louisiana, a Parish, and a car) and "Aria" (an opera
// term and a common given name). Each requires its disambiguated form.
//
// ── WHAT WE COULD NOT VERIFY, AND SO LEFT OUT ────────────────────────────────
//
// CAESARS PALACE and THE VENETIAN are both among the most-named properties on
// the Strip and neither is here. caesars.com answers a redirect loop to any
// plain fetch, and venetianlasvegas.com serves its pages with no postal address
// in them. Their city is trivially easy to recall, and recall is what this file
// refuses. They are the first two rows for whoever reads a primary source next.
//
// NEW SOURCES, all read 2026-09-25:
//   City of Las Vegas ............ https://www.lasvegasnevada.gov/
//   Bellagio ..................... https://bellagio.mgmresorts.com/en.html
//   MGM Grand .................... https://mgmgrand.mgmresorts.com/en.html
//   ARIA ......................... https://aria.mgmresorts.com/en.html
//   Mandalay Bay ................. https://mandalaybay.mgmresorts.com/en.html
//   The Cosmopolitan ............. https://cosmopolitanlasvegas.mgmresorts.com/en.html
//   Wynn Las Vegas ............... https://www.wynnlasvegas.com/
//   Town of Vail ................. https://www.vail.gov/
//   Town of Breckenridge ......... https://www.townofbreckenridge.com/
//   Park City Municipal .......... https://www.parkcity.org/
//   City of Aspen ................ https://www.cityofaspen.com/
//   Jackson Hole Mountain Resort . https://www.jacksonhole.com/contact
//   Big Bear Mountain Resort ..... https://www.bigbearmountainresort.com/
//   Town of Mammoth Lakes ........ https://www.townofmammothlakes.ca.gov/
//   Town of Stowe ................ https://www.townofstowevt.org/
//   Town of Killington ........... https://www.killingtontown.com/contact
//   Zion National Park ........... https://www.nps.gov/zion/planyourvisit/directions.htm
//   Grand Canyon National Park ... https://www.nps.gov/grca/contacts.htm
//   Acadia National Park ......... https://www.nps.gov/acad/contacts.htm
//   City of Gatlinburg ........... https://www.gatlinburgtn.gov/
//   City of Pigeon Forge ......... https://www.mypigeonforge.com/
//   City of Myrtle Beach ......... https://www.cityofmyrtlebeach.com/
//   City of Destin ............... https://www.cityofdestin.com/
//   City of Sedona ............... https://www.sedonaaz.gov/
//   City of Key West ............. https://www.cityofkeywest-fl.gov/
//   City of Napa ................. https://www.cityofnapa.org/

// Each `match` must be a DISTINCTIVE multi-word phrase or an unambiguous single
// word. A short generic fragment is never enough: a false positive here does
// not degrade the plan, it relocates it, which is the worse failure of the two.
const LANDMARKS = [
  // "Disneyland" is unambiguous in US host speech; a bare "Disney" is not (see
  // AMBIGUOUS_BARE). "Disneyland Resort" and "California Adventure" are the
  // same gate town.
  { id: 'disneyland', label: 'Disneyland Resort', city: 'Anaheim', state: 'CA',
    match: /\bdisneyland\b|\bdisney\s*california\s+adventure\b/i,
    source: 'https://disneyland.disney.go.com/' },

  // Ordered before nothing in particular — "disney world" cannot collide with
  // "disneyland", the two share no substring at a word boundary.
  { id: 'walt-disney-world', label: 'Walt Disney World Resort', city: 'Lake Buena Vista', state: 'FL',
    match: /\b(?:walt\s+)?disney\s*world\b|\bwdw\b|\bmagic\s+kingdom\b|\bepcot\b/i,
    source: 'https://disneyworld.disney.go.com/destinations/magic-kingdom/' },

  { id: 'knotts-berry-farm', label: "Knott's Berry Farm", city: 'Buena Park', state: 'CA',
    match: /\bknott['’]?s\s+berry\s+farm\b/i,
    source: 'https://www.sixflags.com/knotts/park-map-and-directions' },

  // "Magic Mountain" alone is also a Vermont ski area and a Six Flags water
  // park name, so the brand word is required. Hosts who write only "Magic
  // Mountain" get no match, which is the right answer, not a miss.
  { id: 'six-flags-magic-mountain', label: 'Six Flags Magic Mountain', city: 'Valencia', state: 'CA',
    match: /\bsix\s*flags\s+magic\s+mountain\b/i,
    source: 'https://www.sixflags.com/magicmountain/directions' },

  { id: 'six-flags-great-adventure', label: 'Six Flags Great Adventure', city: 'Jackson', state: 'NJ',
    match: /\bsix\s*flags\s+great\s+adventure\b/i,
    source: 'https://www.sixflags.com/greatadventure/directions' },

  // "Great America" alone is ambiguous with California's Great America in
  // Santa Clara, so the brand word is required here too.
  { id: 'six-flags-great-america', label: 'Six Flags Great America', city: 'Gurnee', state: 'IL',
    match: /\bsix\s*flags\s+great\s+america\b/i,
    source: 'https://www.sixflags.com/greatamerica/directions' },

  { id: 'six-flags-over-texas', label: 'Six Flags Over Texas', city: 'Arlington', state: 'TX',
    match: /\bsix\s*flags\s+over\s+texas\b/i,
    source: 'https://www.sixflags.com/overtexas/directions' },

  { id: 'six-flags-over-georgia', label: 'Six Flags Over Georgia', city: 'Austell', state: 'GA',
    match: /\bsix\s*flags\s+over\s+georgia\b/i,
    source: 'https://www.sixflags.com/overgeorgia/directions' },

  { id: 'six-flags-fiesta-texas', label: 'Six Flags Fiesta Texas', city: 'San Antonio', state: 'TX',
    match: /\bsix\s*flags\s+fiesta\s+texas\b/i,
    source: 'https://www.sixflags.com/fiestatexas/directions' },

  { id: 'cedar-point', label: 'Cedar Point', city: 'Sandusky', state: 'OH',
    match: /\bcedar\s+point\b/i,
    source: 'https://www.sixflags.com/cedarpoint/directions' },

  { id: 'carowinds', label: 'Carowinds', city: 'Charlotte', state: 'NC',
    match: /\bcarowinds\b/i,
    source: 'https://www.sixflags.com/carowinds/directions' },

  { id: 'seaworld-orlando', label: 'SeaWorld Orlando', city: 'Orlando', state: 'FL',
    match: /\bsea\s*world\s+orlando\b/i,
    source: 'https://seaworld.com/orlando/park-info/directions/' },

  { id: 'seaworld-san-diego', label: 'SeaWorld San Diego', city: 'San Diego', state: 'CA',
    match: /\bsea\s*world\s+san\s+diego\b/i,
    source: 'https://seaworld.com/san-diego/park-info/directions/' },

  { id: 'seaworld-san-antonio', label: 'SeaWorld San Antonio', city: 'San Antonio', state: 'TX',
    match: /\bsea\s*world\s+san\s+antonio\b/i,
    source: 'https://seaworld.com/san-antonio/park-info/directions/' },

  { id: 'busch-gardens-williamsburg', label: 'Busch Gardens Williamsburg', city: 'Williamsburg', state: 'VA',
    match: /\bbusch\s+gardens\s+williamsburg\b/i,
    source: 'https://buschgardens.com/williamsburg/park-info/directions/' },

  { id: 'busch-gardens-tampa', label: 'Busch Gardens Tampa Bay', city: 'Tampa', state: 'FL',
    match: /\bbusch\s+gardens\s+tampa(?:\s+bay)?\b/i,
    source: 'https://buschgardens.com/tampa/park-info/directions/' },

  { id: 'legoland-california', label: 'LEGOLAND California', city: 'Carlsbad', state: 'CA',
    match: /\blegoland\s+california\b/i,
    source: 'https://www.legoland.com/california/' },

  { id: 'legoland-florida', label: 'LEGOLAND Florida', city: 'Winter Haven', state: 'FL',
    match: /\blegoland\s+florida\b/i,
    source: 'https://www.legoland.com/florida/' },

  { id: 'hersheypark', label: 'Hersheypark', city: 'Hershey', state: 'PA',
    match: /\bhershey\s*park\b/i,
    source: 'https://www.hersheypark.com/' },

  // ── LAS VEGAS ────────────────────────────────────────────────────────────
  // The single most-named US destination for a milestone birthday. Every row
  // here carries Las Vegas, NV because that is the locality the property's own
  // address block publishes — see the Paradise note in the header.

  // "the Strip" is NOT matched bare: src/data/sampleEventsDMV.js:3417 says
  // "Strip beds per host request". The qualified forms are unambiguous.
  { id: 'las-vegas', label: 'Las Vegas', city: 'Las Vegas', state: 'NV',
    match: /\blas\s+vegas\b|\b(?:las\s+)?vegas\s+strip\b/i,
    source: 'https://www.lasvegasnevada.gov/' },

  { id: 'bellagio', label: 'Bellagio', city: 'Las Vegas', state: 'NV',
    match: /\bbellagio\b/i,
    source: 'https://bellagio.mgmresorts.com/en.html' },

  { id: 'mgm-grand', label: 'MGM Grand', city: 'Las Vegas', state: 'NV',
    match: /\bmgm\s+grand\b/i,
    source: 'https://mgmgrand.mgmresorts.com/en.html' },

  // "Aria" bare is an opera term and a top-20 US girls' name, so the property
  // word is required — same shape of refusal as "Magic Mountain".
  { id: 'aria-las-vegas', label: 'Aria Las Vegas', city: 'Las Vegas', state: 'NV',
    match: /\baria\s+(?:resort|casino|las\s+vegas)\b/i,
    source: 'https://aria.mgmresorts.com/en.html' },

  { id: 'mandalay-bay', label: 'Mandalay Bay', city: 'Las Vegas', state: 'NV',
    match: /\bmandalay\s+bay\b/i,
    source: 'https://mandalaybay.mgmresorts.com/en.html' },

  // "Cosmopolitan" bare is a cocktail hosts actually serve and a magazine.
  { id: 'cosmopolitan-las-vegas', label: 'The Cosmopolitan of Las Vegas', city: 'Las Vegas', state: 'NV',
    match: /\bcosmopolitan\s+(?:of\s+)?las\s+vegas\b/i,
    source: 'https://cosmopolitanlasvegas.mgmresorts.com/en.html' },

  // "Wynn" bare is a surname a guest may have; the property word is required.
  { id: 'wynn-las-vegas', label: 'Wynn Las Vegas', city: 'Las Vegas', state: 'NV',
    match: /\bwynn\s+las\s+vegas\b|\bwynn\s+resort\b/i,
    source: 'https://www.wynnlasvegas.com/' },

  // ── SKI RESORTS ──────────────────────────────────────────────────────────
  // For most of these the resort and the town share a name, so the town's own
  // government publishes the address we carry. Where they do not share a name
  // (Jackson Hole, Big Bear, Mammoth) the row says so.

  { id: 'vail', label: 'Vail', city: 'Vail', state: 'CO',
    match: /\bvail\b/i,
    source: 'https://www.vail.gov/' },

  { id: 'breckenridge', label: 'Breckenridge', city: 'Breckenridge', state: 'CO',
    match: /\bbreckenridge\b|\bbreck\b/i,
    source: 'https://www.townofbreckenridge.com/' },

  { id: 'park-city', label: 'Park City', city: 'Park City', state: 'UT',
    match: /\bpark\s+city\b/i,
    source: 'https://www.parkcity.org/' },

  // Bare "Aspen" is REFUSED — measured against this repo's own seed data, where
  // "Aspen Hall" is a venue and "Aspen Tech" is a client. Only the resort's own
  // two names resolve.
  { id: 'aspen-snowmass', label: 'Aspen Snowmass', city: 'Aspen', state: 'CO',
    match: /\baspen\s+(?:snowmass|mountain|highlands)\b/i,
    source: 'https://www.cityofaspen.com/' },

  // THE RESORT IS NOT IN JACKSON. Jackson Hole Mountain Resort publishes Teton
  // Village, WY 83025 on its own contact page — twelve miles from the town of
  // Jackson, and the place a host actually books beds in.
  { id: 'jackson-hole', label: 'Jackson Hole', city: 'Teton Village', state: 'WY',
    match: /\bjackson\s+hole\b/i,
    source: 'https://www.jacksonhole.com/contact' },

  // The resort is "Big Bear"; the incorporated city is Big Bear Lake, which is
  // what the operator's own site prints.
  { id: 'big-bear', label: 'Big Bear', city: 'Big Bear Lake', state: 'CA',
    match: /\bbig\s+bear\b/i,
    source: 'https://www.bigbearmountainresort.com/' },

  // Bare "Mammoth" is an ordinary adjective ("a mammoth cake"), so the second
  // word is required. Both of its real names land on the same town.
  { id: 'mammoth', label: 'Mammoth Mountain', city: 'Mammoth Lakes', state: 'CA',
    match: /\bmammoth\s+(?:mountain|lakes)\b/i,
    source: 'https://www.townofmammothlakes.ca.gov/' },

  { id: 'stowe', label: 'Stowe', city: 'Stowe', state: 'VT',
    match: /\bstowe\b/i,
    source: 'https://www.townofstowevt.org/' },

  { id: 'killington', label: 'Killington', city: 'Killington', state: 'VT',
    match: /\bkillington\b/i,
    source: 'https://www.killingtontown.com/contact' },

  // ── NATIONAL PARKS ───────────────────────────────────────────────────────
  // Three resolve because NPS itself names one place. Yellowstone and Yosemite
  // are refused — see NO_SINGLE_GATEWAY below and the header for why.

  // Bare "Zion" is REFUSED — measured: repastSampleEvent.js carries "Mount Zion
  // Baptist Church" in Petersburg, VA.
  { id: 'zion-national-park', label: 'Zion National Park', city: 'Springdale', state: 'UT',
    match: /\bzion\s+national\s+park\b/i,
    source: 'https://www.nps.gov/zion/planyourvisit/directions.htm' },

  // "Acadia" bare is also a region of Louisiana, a Parish and a car.
  { id: 'acadia-national-park', label: 'Acadia National Park', city: 'Bar Harbor', state: 'ME',
    match: /\bacadia\s+national\s+park\b/i,
    source: 'https://www.nps.gov/acad/contacts.htm' },

  // CAVEAT: this is the SOUTH RIM. NPS publishes one address for the park and
  // it is Grand Canyon, AZ 86023 (Grand Canyon Village); the North Rim is four
  // hours away through other towns. The host sees the town and can edit it.
  { id: 'grand-canyon', label: 'Grand Canyon', city: 'Grand Canyon', state: 'AZ',
    match: /\bgrand\s+canyon\b/i,
    source: 'https://www.nps.gov/grca/contacts.htm' },

  // ── DESTINATION TOWNS HOSTS NAME ─────────────────────────────────────────
  // Outer Banks, Branson and the Smokies are absent on purpose: vacationAreas
  // .js already resolves all three and is read first. Savannah and Charleston
  // are absent on purpose too — see the refusals in the header.

  { id: 'gatlinburg', label: 'Gatlinburg', city: 'Gatlinburg', state: 'TN',
    match: /\bgatlinburg\b/i,
    source: 'https://www.gatlinburgtn.gov/' },

  { id: 'pigeon-forge', label: 'Pigeon Forge', city: 'Pigeon Forge', state: 'TN',
    match: /\bpigeon\s+forge\b/i,
    source: 'https://www.mypigeonforge.com/' },

  { id: 'myrtle-beach', label: 'Myrtle Beach', city: 'Myrtle Beach', state: 'SC',
    match: /\bmyrtle\s+beach\b/i,
    source: 'https://www.cityofmyrtlebeach.com/' },

  // "Destin" cannot match inside "destination" or "destiny" — the word boundary
  // does that work — but the negative control asserts it rather than assuming.
  { id: 'destin', label: 'Destin', city: 'Destin', state: 'FL',
    match: /\bdestin\b/i,
    source: 'https://www.cityofdestin.com/' },

  { id: 'sedona', label: 'Sedona', city: 'Sedona', state: 'AZ',
    match: /\bsedona\b/i,
    source: 'https://www.sedonaaz.gov/' },

  { id: 'key-west', label: 'Key West', city: 'Key West', state: 'FL',
    match: /\bkey\s+west\b/i,
    source: 'https://www.cityofkeywest-fl.gov/' },

  // NAPA CABBAGE. This is a food-planning app: menus, shopping lists and
  // vendor briefs all carry ingredient strings, and "napa cabbage slaw" is an
  // ordinary one. Nothing in the repo says it today, which is exactly why the
  // guard goes in now rather than after a host's cookout moves to California.
  { id: 'napa', label: 'Napa', city: 'Napa', state: 'CA',
    match: /\bnapa\s+valley\b|\bnapa\b(?!\s+cabbage)/i,
    source: 'https://www.cityofnapa.org/' },
];

// The brands that name more than one place. Listed so the refusal is a fact the
// tests can assert, not an accident of which rows happened to be written.
export const AMBIGUOUS_BARE = Object.freeze([
  // Brands that name more than one place.
  'Disney', 'Six Flags', 'Busch Gardens', 'SeaWorld', 'Legoland', 'Universal Studios',
  // Chains that exist in every town in the country. A host who writes "at the
  // Hilton" has named a building, not a city, and there is no city to name.
  'Hilton', 'Marriott', 'Holiday Inn', 'Hyatt', 'Sheraton', 'Best Western',
  // Town names that are two real US cities, or a city and a common given name.
  // Each is refused for a reason written out in the header.
  'Springfield', 'Charleston', 'Savannah', 'Aspen', 'Zion', 'Mammoth', 'Acadia',
  'Aria', 'Wynn', 'Cosmopolitan',
]);

// Parks whose own NPS page names no single gateway town. Listed so the refusal
// is a fact the tests assert rather than a row somebody forgot to write.
// Yellowstone spans WY/MT/ID across five entrance towns; Yosemite's gateways
// are four towns on three highways. Both publish the PARK as their address.
export const NO_SINGLE_GATEWAY = Object.freeze([
  'Yellowstone', 'Yellowstone National Park', 'Yosemite', 'Yosemite National Park',
]);

// Places hosts name that we could not read off a primary source this session.
// They are NOT rows. Listed so the gap is visible work rather than an absence
// nobody can see, and so a test proves we did not quietly add them from memory.
export const UNVERIFIED_KNOWN_GAPS = Object.freeze([
  'Caesars Palace',   // caesars.com answers a redirect loop to a plain fetch
  'The Venetian',     // venetianlasvegas.com serves no postal address
]);

export const LANDMARK_PROVENANCE = Object.freeze({
  tier: 'researched',
  note: 'Curated US landmark gazetteer: each entry maps a distinctive park name to the city and state the operator itself publishes, with the source URL on the row. Ambiguous bare brand names resolve to nothing. Expand on host misses; never guessed at runtime.',
});

/** Every row, for tests and for anything that needs to enumerate coverage. */
export const ALL_LANDMARKS = Object.freeze(LANDMARKS.map((l) => Object.freeze({ ...l })));

/**
 * First landmark named in free text, or null.
 * -> { id, label, city, state, source } — never a partial, never a guess.
 */
export function matchLandmark(text) {
  const t = String(text || '');
  if (!t.trim()) return null;
  for (const l of LANDMARKS) if (l.match.test(t)) return l;
  return null;
}
