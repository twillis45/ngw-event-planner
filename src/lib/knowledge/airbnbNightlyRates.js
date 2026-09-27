// ─── WHAT A WHOLE PLACE IS LISTED AT — ASKING, NOT PAID, BEFORE FEES ──────
//
// WHAT THIS IS. The distribution of nightly asking prices for entire-home
// listings, by how many the place sleeps, in the 34 US cities Inside
// Airbnb currently publishes. Derived from their own quarterly files, all
// 34 downloaded 2026-09-27.
//
// ── ATTRIBUTION IS A LICENCE CONDITION HERE, NOT A COURTESY ───────────────
//
// Unlike GSA and DOT, this is not public domain. Inside Airbnb states:
// "This data is licensed under a Creative Commons Attribution 4.0
// International License." CC BY 4.0 permits commercial use and derivatives
// PROVIDED the source is credited, the licence is identified, and changes
// are indicated. This table is aggregated, which is a change.
//
// So INSIDE_AIRBNB_ATTRIBUTION below is exported rather than written into a
// comment, and airbnbNightlyIndex carries it in every basis string. A
// surface that shows one of these numbers without it is in breach.
//
// A separate risk the licence does not cover: the data was scraped from
// Airbnb, and Airbnb's own terms are between them and Inside Airbnb, not
// something Inside Airbnb can grant onward. Their own posture is "This site
// is not associated with or endorsed by Airbnb" and "Accuracy of the
// information compiled from the Airbnb site is not the responsibility of
// Inside Airbnb."
//
// ── IT EXCLUDES FEES, WHICH WE MEASURED RATHER THAN ASSUMED ───────────────
//
// Inside Airbnb's own data dictionary is stale — it still documents the
// long-removed weekly_price/monthly_price and does not mention the
// price_quote_* fields at all — so whether `price` includes cleaning and
// service fees is not documented anywhere. We read it out of the raw quote
// JSON on the San Francisco file, 2026-09-27:
//
//   cleaning_fee null in 6,196 of 6,196 parsed quotes  (100%)
//   service_fee  null in 6,196 of 6,196                (100%)
//   taxes        set  in     10 of 6,196               (0.16%)
//
// So `price` is a nightly subtotal BEFORE cleaning, service fee and tax,
// essentially always. On a two-night stay an Airbnb cleaning fee is
// routinely 15–30% of the real total, so this table systematically
// understates what a host pays. Every basis string says so.
//
// ── AND IT IS ASKING PRICE, ON ONE ARBITRARY DATE ─────────────────────────
//
// Each row is one scraped quote for one listing over a date window Inside
// Airbnb chose, not a booked rate. Listings that never rent stay in the
// distribution, nothing is weighted by occupancy, and 19% of the San
// Francisco rows carry no price at all and are simply absent here.
//
// Snapshots are quarterly; 121 of their 123 worldwide files are dated June
// 2026, so the US tables here are roughly a quarter stale and each entry
// carries its own snapshot date.
//
// ─── SHAPE ──────────────────────────────────────────────────────────────────
//
//   [city, ST, snapshotDate, { sleepsBucket: [listings, p25, median, p75] }]
//
// NAMES ARE THE SLUG, CLEANED. Inside Airbnb's directory slugs sometimes
// repeat the state ("washington-dc", "salem-or") or carry a census term
// ("twin-cities-msa"). Title-casing them raw produced "Washington Dc, DC"
// and "Salem Or, OR", which no host would ever match. Both suffixes are
// stripped. Their region names are otherwise kept as published, so several
// entries are counties or whole states — "Clark County, NV" is the Las
// Vegas market and "Hawaii, HI" is the state — and a host typing the city
// inside one of those will not match. That is a coverage limit, not a bug
// to paper over with guessed aliases.
//
// Buckets are by `accommodates`: '2' (1–2), '4' (3–4), '6' (5–6),
// '8' (7–8), '9+' (9 and over). Entire homes only — a private room is not
// what a group rents. A bucket with fewer than 20 listings is dropped
// rather than reported, so a band is never drawn from a handful.

/** CC BY 4.0 requires this wherever a number from this table is shown. */
export const INSIDE_AIRBNB_ATTRIBUTION =
  'Inside Airbnb, CC BY 4.0, aggregated';

/** Fewest listings a city+size bucket needs before it gets a band. */
export const MIN_LISTINGS = 20;

/** [city, ST, snapshotDate, {bucket: [listings, p25, median, p75]}] */
export const AIRBNB_NIGHTLY = Object.freeze([
  ["Los Angeles","CA","2026-06-15",{"2":[7430,106,150,236],"4":[8381,158,231,342],"6":[6258,255,363,550],"8":[3478,343,496,834],"9+":[2890,456,737,1390]}],
  ["Oakland","CA","2026-06-27",{"2":[592,116,157,205],"4":[425,155,212,270],"6":[240,218,305,400],"8":[82,324,424,699],"9+":[59,447,550,828]}],
  ["Pacific Grove","CA","2026-06-14",{"2":[24,135,239,440],"4":[61,234,356,625],"6":[80,329,570,942],"8":[22,361,524,954]}],
  ["San Diego","CA","2026-06-27",{"2":[1897,123,170,241],"4":[2925,177,262,369],"6":[2311,307,444,637],"8":[1325,434,607,885],"9+":[1565,596,869,1351]}],
  ["San Francisco","CA","2026-06-14",{"2":[1180,148,200,291],"4":[1324,218,290,432],"6":[664,308,450,746],"8":[206,436,661,1046],"9+":[139,546,993,1750]}],
  ["San Mateo County","CA","2026-06-27",{"2":[494,152,213,298],"4":[475,216,302,400],"6":[414,307,415,560],"8":[236,390,524,714],"9+":[251,490,674,1008]}],
  ["Santa Clara County","CA","2026-06-28",{"2":[888,143,188,252],"4":[881,198,261,352],"6":[586,286,377,534],"8":[300,403,493,657],"9+":[322,504,695,1296]}],
  ["Santa Cruz County","CA","2026-06-30",{"2":[244,147,247,327],"4":[332,242,372,542],"6":[406,462,611,798],"8":[217,632,822,1083],"9+":[134,882,1220,1729]}],
  ["Denver","CO","2026-06-30",{"2":[1089,84,115,180],"4":[1311,118,179,261],"6":[670,183,276,418],"8":[271,256,356,549],"9+":[288,420,559,792]}],
  ["Washington","DC","2026-06-24",{"2":[1221,122,171,240],"4":[1783,160,209,284],"6":[933,216,299,410],"8":[359,311,428,561],"9+":[322,394,524,762]}],
  ["Broward County","FL","2026-06-29",{"2":[2402,123,164,215],"4":[4361,173,217,291],"6":[3708,258,351,452],"8":[1767,344,444,596],"9+":[1556,463,643,999]}],
  ["Hawaii","HI","2026-06-21",{"2":[4798,177,243,334],"4":[12255,252,339,472],"6":[8287,330,460,685],"8":[2834,568,867,1280],"9+":[2185,988,1670,2778]}],
  ["Chicago","IL","2026-06-24",{"2":[1100,134,176,255],"4":[1838,155,208,282],"6":[1455,202,276,396],"8":[677,277,372,516],"9+":[743,396,567,887]}],
  ["New Orleans","LA","2026-06-16",{"2":[1129,76,126,172],"4":[1713,118,174,242],"6":[1291,159,242,350],"8":[376,179,289,401],"9+":[604,340,502,763]}],
  ["Boston","MA","2026-06-15",{"2":[830,196,273,349],"4":[846,226,306,412],"6":[442,315,433,644],"8":[219,375,554,748],"9+":[164,560,676,977]}],
  ["Cambridge","MA","2026-06-29",{"2":[99,161,236,292],"4":[185,242,332,416],"6":[131,301,414,590],"8":[69,426,605,817],"9+":[51,654,855,1282]}],
  ["Twin Cities","MN","2026-06-27",{"2":[551,102,133,184],"4":[975,143,192,246],"6":[913,208,267,354],"8":[533,285,376,514],"9+":[799,394,533,832]}],
  ["Bozeman","MT","2026-06-19",{"2":[82,159,241,297],"4":[195,174,288,372],"6":[120,250,364,462],"8":[46,356,507,632],"9+":[21,546,728,947]}],
  ["Asheville","NC","2026-06-25",{"2":[573,113,155,196],"4":[730,143,199,273],"6":[516,214,285,360],"8":[259,296,368,457],"9+":[296,457,628,852]}],
  ["Jersey City","NJ","2026-06-27",{"2":[145,114,175,237],"4":[465,172,242,311],"6":[396,261,347,449],"8":[230,330,434,558],"9+":[226,422,552,783]}],
  ["Newark","NJ","2026-06-30",{"2":[112,115,154,210],"4":[280,181,229,292],"6":[311,228,299,388],"8":[176,281,338,440],"9+":[134,327,570,908]}],
  ["Clark County","NV","2026-06-27",{"2":[1498,80,122,174],"4":[3704,136,198,272],"6":[2538,174,250,363],"8":[1993,224,306,428],"9+":[2601,301,427,658]}],
  ["Albany","NY","2026-06-16",{"2":[122,99,144,177],"4":[112,125,167,216],"6":[54,159,233,276]}],
  ["New York City","NY","2026-06-14",{"2":[4650,124,177,275],"4":[4093,152,223,323],"6":[1844,202,310,508],"8":[582,235,407,736],"9+":[368,337,585,1072]}],
  ["Rochester","NY","2026-06-27",{"2":[188,99,135,185],"4":[214,131,166,213],"6":[159,183,239,304],"8":[55,228,296,400],"9+":[49,298,387,594]}],
  ["Columbus","OH","2026-06-29",{"2":[382,86,119,165],"4":[630,105,152,204],"6":[576,139,201,272],"8":[265,194,268,351],"9+":[359,280,388,522]}],
  ["Portland","OR","2026-06-15",{"2":[1141,92,131,172],"4":[1172,130,177,240],"6":[505,173,234,340],"8":[125,219,403,526],"9+":[136,400,564,787]}],
  ["Salem","OR","2026-06-28",{"2":[54,86,116,161],"4":[63,122,176,249],"6":[56,187,251,326],"8":[29,214,318,456]}],
  ["Rhode Island","RI","2026-06-30",{"2":[532,171,243,346],"4":[1150,216,324,491],"6":[1177,330,485,682],"8":[654,483,654,956],"9+":[700,670,910,1452]}],
  ["Nashville","TN","2026-06-26",{"2":[805,96,148,211],"4":[1942,146,199,250],"6":[1722,199,255,333],"8":[1070,242,318,427],"9+":[3106,340,454,659]}],
  ["Austin","TX","2026-06-22",{"2":[1513,97,142,185],"4":[2634,140,185,252],"6":[1870,186,252,350],"8":[967,247,343,491],"9+":[1564,360,533,870]}],
  ["Dallas","TX","2026-06-15",{"2":[1127,131,172,237],"4":[1742,160,213,287],"6":[992,236,319,444],"8":[674,292,387,538],"9+":[877,342,472,690]}],
  ["Fort Worth","TX","2026-06-21",{"2":[286,88,133,184],"4":[440,134,187,247],"6":[474,182,265,356],"8":[304,230,324,434],"9+":[209,269,426,656]}],
  ["Seattle","WA","2026-06-15",{"2":[1407,140,203,271],"4":[2024,203,279,370],"6":[1306,302,389,507],"8":[581,379,488,676],"9+":[413,471,609,887]}],
]);
