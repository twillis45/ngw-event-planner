// ─── DOT CITY-PAIR FARES — WHAT WAS PAID, SIX MONTHS AGO ───────────────────
//
// WHAT THIS IS. The distribution of average market fares for every
// contiguous-state city-pair market a city takes part in, derived from the
// U.S. DOT Consumer Airfare Report, Table 6:
//
//   https://data.transportation.gov/resource/yj5y-b2ir.csv
//   pulled 2026-09-27 for year=2026 quarter=1 — 6,313 market rows, which is
//   the row count that dataset reports for the quarter
//
// WHAT IT IS NOT, IN DOT'S OWN WORDS. The report's source note: "A
// ten-percent sample of passenger tickets... Airlines tend to offer a wide
// variety of prices in any given market and it is unlikely that the average
// fares from this report will be the same as any particular fare offered."
// Averages include first-class fares but exclude free and award tickets.
//
// So this is a historical blend of what a sample of people actually paid —
// business, first, advance-purchase and walk-up together — not a quotable
// price and not a forecast. It is reported as a BAND, never a point.
//
// ── THE LAG IS REAL AND MUST BE SAID ──────────────────────────────────────
//
// Quarterly, and slow. 2026 Q1 is the freshest quarter published and its
// rows were last updated 2026-09-03: about five months from quarter end to
// publication. A host reading this in September 2026 is being shown
// January–March. There is also no seasonality WITHIN a quarter, so a spring
// break fare and a quiet March Tuesday are averaged together.
//
// SCOPE. Contiguous states only, by the table's definition — Alaska and
// Hawaii are out. A city with no commercial service is simply absent:
// Annapolis is not here, and mapping it to Baltimore would be a guess about
// which airport a guest picks, which is the class of guess lodgingIntel
// already refuses.
//
// LICENSE. The dataset declares licenseId USGOV_WORKS, "Public Domain U.S.
// Government" (https://www.usa.gov/government-works). Redistribution of this
// derived table is unrestricted; no DOT seal or logo is used.
//
// ─── SHAPE ──────────────────────────────────────────────────────────────────
//
//   [dotCityName, marketCount, p25, median, p75]
//
// Each figure is a whole dollar, one-way, from the distribution of market
// averages the city appears in.
//
// THE FLOOR: only cities in 8 or more markets are kept — 184 of the 317 in
// the quarter. A quartile drawn from three fares is noise wearing a
// statistic's clothes, and the 133 dropped cities return null rather than a
// number nobody should act on.
//
// MEASURED at derivation: p25–p75 spread runs $4 to $210, median $68. That
// width is the honest content of this table; anything that renders it as a
// single number has thrown the finding away.

/** Fewest markets a city must appear in to get a band at all. */
export const MIN_MARKETS = 8;

/** The quarter these fares cover, and when DOT last updated the rows. */
export const DOT_PERIOD = Object.freeze({ year: 2026, quarter: 1, updated: '2026-09-03' });

/** [dotCityName, marketCount, p25, median, p75] */
export const DOT_CITY_FARES = Object.freeze([
  ["Abilene, TX",12,357,375,398],
  ["Albany, NY",71,269,309,345],
  ["Albuquerque, NM",95,278,302,324],
  ["Alexandria, LA",10,332,352,374],
  ["Allentown/Bethlehem/Easton, PA",27,136,296,346],
  ["Amarillo, TX",29,290,342,376],
  ["Appleton, WI",47,227,293,324],
  ["Asheville, NC",49,236,291,311],
  ["Aspen, CO",40,373,430,487],
  ["Atlanta, GA (Metropolitan Area)",167,293,345,386],
  ["Augusta, GA",34,318,336,383],
  ["Austin, TX",147,263,295,318],
  ["Bakersfield, CA",23,295,340,375],
  ["Bangor, ME",24,258,300,362],
  ["Baton Rouge, LA",50,309,324,342],
  ["Belleville, IL",9,100,106,108],
  ["Bellingham, WA",9,151,191,261],
  ["Bend/Redmond, OR",36,265,309,364],
  ["Billings, MT",37,278,317,338],
  ["Birmingham, AL",82,320,335,365],
  ["Bismarck/Mandan, ND",23,320,340,363],
  ["Bloomington/Normal, IL",15,292,324,365],
  ["Boise, ID",86,288,329,366],
  ["Boston, MA (Metropolitan Area)",155,248,307,355],
  ["Bozeman, MT",77,261,301,347],
  ["Bristol/Johnson City/Kingsport, TN",28,300,335,376],
  ["Brownsville, TX",12,297,302,334],
  ["Buffalo, NY",68,243,291,326],
  ["Burlington, VT",52,286,317,357],
  ["Casper, WY",8,276,301,365],
  ["Cedar Rapids/Iowa City, IA",52,255,285,311],
  ["Charleston, SC",99,259,307,340],
  ["Charleston/Dunbar, WV",22,315,331,382],
  ["Charlotte, NC",137,302,335,362],
  ["Charlottesville, VA",32,287,313,357],
  ["Chattanooga, TN",50,305,331,358],
  ["Chicago, IL",177,229,260,309],
  ["Cincinnati, OH",100,266,303,328],
  ["Cleveland, OH (Metropolitan Area)",105,251,305,329],
  ["Colorado Springs, CO",71,261,284,310],
  ["Columbia, SC",57,285,315,361],
  ["Columbus, OH",111,268,302,328],
  ["Concord, NC",8,82,84,86],
  ["Corpus Christi, TX",38,296,332,358],
  ["Dallas/Fort Worth, TX",199,279,328,365],
  ["Dayton, OH",55,280,301,337],
  ["Daytona Beach, FL",43,277,330,378],
  ["Denver, CO",192,225,257,311],
  ["Des Moines, IA",74,268,302,328],
  ["Detroit, MI",135,287,331,371],
  ["Duluth, MN",17,351,372,397],
  ["Durango, CO",28,256,276,329],
  ["Eagle, CO",43,343,388,418],
  ["El Paso, TX",82,286,315,350],
  ["Eugene, OR",46,251,294,347],
  ["Evansville, IN",19,336,367,386],
  ["Fargo, ND",43,300,338,357],
  ["Fayetteville, AR",67,298,325,359],
  ["Fayetteville, NC",22,296,326,368],
  ["Flint, MI",14,129,145,210],
  ["Fort Myers, FL",130,259,329,370],
  ["Fort Wayne, IN",38,293,322,351],
  ["Fresno, CA",65,281,329,365],
  ["Gainesville, FL",32,347,361,425],
  ["Grand Junction, CO",31,245,273,322],
  ["Grand Rapids, MI",89,271,298,329],
  ["Great Falls, MT",17,276,317,376],
  ["Green Bay, WI",38,297,321,349],
  ["Greensboro/High Point, NC",66,270,293,329],
  ["Greenville/Spartanburg, SC",80,294,317,357],
  ["Gulfport/Biloxi, MS",39,291,314,335],
  ["Gunnison, CO",11,304,357,371],
  ["Harlingen/San Benito, TX",42,219,235,255],
  ["Harrisburg, PA",64,283,310,338],
  ["Hartford, CT",93,253,304,348],
  ["Helena, MT",9,267,279,315],
  ["Houston, TX",170,269,310,347],
  ["Huntsville, AL",57,309,323,354],
  ["Idaho Falls, ID",28,301,346,369],
  ["Indianapolis, IN",113,278,300,331],
  ["Jackson, WY",44,347,390,435],
  ["Jackson/Vicksburg, MS",51,330,344,374],
  ["Jacksonville, FL",117,276,307,342],
  ["Jacksonville/Camp Lejeune, NC",16,293,325,376],
  ["Jefferson City/Columbia, MO",14,319,354,370],
  ["Kalamazoo, MI",10,276,313,341],
  ["Kalispell, MT",41,332,386,423],
  ["Kansas City, MO",129,273,301,324],
  ["Key West, FL",74,318,348,380],
  ["Knoxville, TN",78,279,305,339],
  ["Lafayette, LA",28,326,344,372],
  ["Lake Charles, LA",9,318,347,369],
  ["Lansing, MI",9,223,266,314],
  ["Laredo, TX",13,290,307,347],
  ["Las Vegas, NV",184,218,284,374],
  ["Lexington, KY",51,301,330,363],
  ["Lincoln, NE",11,266,324,341],
  ["Little Rock, AR",70,301,323,345],
  ["Los Angeles, CA (Metropolitan Area)",197,281,344,387],
  ["Louisville, KY",87,283,300,339],
  ["Lubbock, TX",40,295,330,363],
  ["Madison, WI",83,285,299,330],
  ["Medford, OR",32,257,296,331],
  ["Melbourne, FL",32,295,327,383],
  ["Memphis, TN",89,307,328,360],
  ["Miami, FL (Metropolitan Area)",180,234,313,361],
  ["Midland/Odessa, TX",49,323,354,371],
  ["Milwaukee, WI",95,269,288,312],
  ["Minneapolis/St. Paul, MN",152,293,330,369],
  ["Minot, ND",15,299,361,400],
  ["Mission/McAllen/Edinburg, TX",50,255,275,294],
  ["Missoula, MT",34,279,302,350],
  ["Mobile, AL",37,312,341,367],
  ["Monroe, LA",11,334,353,363],
  ["Montgomery, AL",27,302,329,373],
  ["Montrose/Delta, CO",36,262,305,341],
  ["Myrtle Beach, SC",57,203,266,305],
  ["Nashville, TN",147,254,284,322],
  ["New Haven, CT",26,86,98,117],
  ["New Orleans, LA",131,269,294,323],
  ["New York City, NY (Metropolitan Area)",176,251,306,356],
  ["Norfolk, VA (Metropolitan Area)",95,273,296,338],
  ["Oklahoma City, OK",96,295,317,342],
  ["Omaha, NE",91,277,298,322],
  ["Orlando, FL",186,215,293,345],
  ["Palm Springs, CA",88,309,364,427],
  ["Panama City, FL",59,285,307,347],
  ["Pasco/Kennewick/Richland, WA",31,266,313,382],
  ["Paso Robles/San Luis Obispo, CA",32,251,323,380],
  ["Pensacola, FL",85,276,299,324],
  ["Peoria, IL",29,240,284,319],
  ["Philadelphia, PA",135,300,334,364],
  ["Philipsburg/State College, PA",18,313,371,408],
  ["Phoenix, AZ",201,226,303,360],
  ["Pittsburgh, PA",113,261,302,330],
  ["Portland, ME",55,277,314,354],
  ["Portland, OR",127,254,329,370],
  ["Provo, UT",13,100,109,127],
  ["Punta Gorda, FL",48,113,128,143],
  ["Quad Cities, IL (Metropolitan Area)",31,247,301,332],
  ["Raleigh/Durham, NC",125,248,297,334],
  ["Rapid City, SD",34,277,300,316],
  ["Reno, NV",80,294,329,367],
  ["Richmond, VA",96,279,309,340],
  ["Roanoke, VA",35,302,329,345],
  ["Rochester, MN",12,292,311,361],
  ["Rochester, NY",62,236,272,316],
  ["Sacramento, CA",117,283,335,363],
  ["Saginaw/Bay City/Midland, MI",14,313,333,353],
  ["Salinas/Monterey, CA",24,287,395,457],
  ["Salt Lake City, UT",145,307,358,394],
  ["San Antonio, TX",146,290,307,331],
  ["San Diego, CA",158,272,322,366],
  ["San Francisco, CA (Metropolitan Area)",161,297,369,407],
  ["Sanford, FL",57,95,111,125],
  ["Santa Barbara, CA",48,268,336,389],
  ["Santa Fe, NM",17,294,313,382],
  ["Sarasota/Bradenton, FL",95,198,283,334],
  ["Savannah, GA",85,274,303,338],
  ["Scranton/Wilkes-Barre, PA",21,253,293,352],
  ["Seattle, WA",158,229,315,373],
  ["Shreveport, LA",39,301,325,344],
  ["Sioux Falls, SD",54,287,308,322],
  ["South Bend, IN",40,220,291,337],
  ["Spokane, WA",81,276,307,346],
  ["Springfield, MO",57,295,320,338],
  ["St. George, UT",25,280,305,338],
  ["St. Louis, MO",125,271,297,317],
  ["Steamboat Springs, CO",43,278,300,340],
  ["Sun Valley/Hailey/Ketchum, ID",20,331,381,425],
  ["Syracuse, NY",72,260,305,338],
  ["Tallahassee, FL",38,351,367,401],
  ["Tampa, FL (Metropolitan Area)",163,180,238,328],
  ["Traverse City, MI",30,289,326,373],
  ["Tucson, AZ",108,282,328,365],
  ["Tulsa, OK",82,286,319,337],
  ["Valparaiso, FL",66,261,282,323],
  ["Washington, DC (Metropolitan Area)",188,268,314,362],
  ["Wausau/Mosinee/Stevens Point, WI",8,342,346,379],
  ["West Palm Beach/Palm Beach, FL",109,300,332,380],
  ["Wichita, KS",64,291,316,334],
  ["Williston, ND",9,366,395,420],
  ["Wilmington, DE",8,109,112,121],
  ["Wilmington, NC",56,248,292,341],
]);
