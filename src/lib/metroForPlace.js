// ─── WHICH METRO MARKET A TOWN IS IN (11/16/2026) ────────────────────────────
// "Which market" read "National baseline" for an event in Alexandria, VA: there
// was no city-to-metro table, so a host had to know the app's market list and
// pick it by hand. This maps a city + state to one of METRO_MARKETS' ids.
//
// HONESTY RULES. Core cities and well-known close-in suburbs only, each tied to
// its STATE ("Alexandria, LA" is not the DC market). A town not listed returns
// null and the row keeps saying "National baseline". The shell only PROPOSES the
// match; prices change when the host taps to accept it. PURE.

const T = {
  dc:  { DC: ['washington'], VA: ['alexandria', 'arlington', 'fairfax', 'falls church', 'mclean', 'reston', 'herndon', 'vienna', 'tysons', 'springfield', 'annandale', 'centreville', 'chantilly', 'manassas', 'woodbridge', 'leesburg', 'ashburn', 'sterling'], MD: ['bethesda', 'silver spring', 'rockville', 'gaithersburg', 'germantown', 'takoma park', 'chevy chase', 'college park', 'greenbelt', 'hyattsville', 'bowie', 'upper marlboro', 'largo', 'laurel', 'oxon hill', 'fort washington', 'waldorf', 'potomac', 'wheaton', 'landover'] },
  nyc: { NY: ['new york', 'new york city', 'manhattan', 'brooklyn', 'queens', 'bronx', 'the bronx', 'staten island', 'yonkers', 'white plains', 'new rochelle'], NJ: ['jersey city', 'newark', 'hoboken', 'paterson', 'elizabeth', 'bayonne', 'union city', 'fort lee', 'montclair'] },
  sf:  { CA: ['san francisco', 'oakland', 'berkeley', 'san jose', 'palo alto', 'mountain view', 'sunnyvale', 'santa clara', 'fremont', 'hayward', 'daly city', 'san mateo', 'redwood city', 'walnut creek'] },
  la:  { CA: ['los angeles', 'long beach', 'pasadena', 'glendale', 'burbank', 'santa monica', 'inglewood', 'torrance', 'west hollywood', 'beverly hills', 'culver city', 'anaheim', 'santa ana', 'irvine'] },
  bos: { MA: ['boston', 'cambridge', 'somerville', 'brookline', 'newton', 'quincy', 'medford', 'waltham', 'malden', 'everett'] },
  sea: { WA: ['seattle', 'bellevue', 'redmond', 'kirkland', 'renton', 'tacoma', 'everett', 'bothell'] },
  chi: { IL: ['chicago', 'evanston', 'oak park', 'naperville', 'skokie', 'schaumburg', 'aurora', 'joliet', 'cicero'] },
  mia: { FL: ['miami', 'miami beach', 'fort lauderdale', 'hollywood', 'hialeah', 'coral gables', 'pembroke pines', 'boca raton', 'west palm beach'] },
  sd:  { CA: ['san diego', 'chula vista', 'oceanside', 'escondido', 'carlsbad', 'la jolla'] },
  den: { CO: ['denver', 'aurora', 'lakewood', 'boulder', 'littleton', 'arvada', 'westminster', 'thornton'] },
  aus: { TX: ['austin', 'round rock', 'cedar park', 'pflugerville', 'georgetown'] },
  dal: { TX: ['dallas', 'fort worth', 'arlington', 'plano', 'irving', 'garland', 'frisco', 'mckinney', 'grand prairie', 'denton'] },
  atl: { GA: ['atlanta', 'decatur', 'marietta', 'sandy springs', 'alpharetta', 'roswell', 'smyrna', 'dunwoody', 'east point', 'stone mountain'] },
  phi: { PA: ['philadelphia', 'upper darby', 'norristown', 'king of prussia'], NJ: ['camden', 'cherry hill'] },
  por: { OR: ['portland', 'beaverton', 'gresham', 'hillsboro', 'lake oswego'], WA: ['vancouver'] },
  nas: { TN: ['nashville', 'franklin', 'murfreesboro', 'brentwood', 'hendersonville'] },
  min: { MN: ['minneapolis', 'saint paul', 'st. paul', 'st paul', 'bloomington', 'edina', 'plymouth'] },
  phx: { AZ: ['phoenix', 'scottsdale', 'tempe', 'mesa', 'chandler', 'glendale', 'gilbert', 'peoria'] },
  hou: { TX: ['houston', 'pasadena', 'sugar land', 'the woodlands', 'pearland', 'katy', 'baytown'] },
  tam: { FL: ['tampa', 'st. petersburg', 'st petersburg', 'saint petersburg', 'clearwater', 'orlando', 'kissimmee', 'winter park'] },
  cha: { NC: ['charlotte', 'concord', 'gastonia', 'matthews', 'huntersville'] },
  slc: { UT: ['salt lake city', 'west valley city', 'sandy', 'provo', 'orem', 'ogden'] },
  col: { OH: ['columbus', 'dublin', 'westerville', 'upper arlington', 'grove city'] },
  pit: { PA: ['pittsburgh', 'mt. lebanon', 'mount lebanon', 'monroeville'] },
  ind: { IN: ['indianapolis', 'carmel', 'fishers', 'noblesville'] },
  kc:  { MO: ['kansas city', 'independence', "lee's summit", 'lees summit'], KS: ['kansas city', 'overland park', 'olathe', 'lenexa'] },
  stl: { MO: ['st. louis', 'st louis', 'saint louis', 'chesterfield', 'florissant'], IL: ['east st. louis', 'belleville'] },
};

const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

/** @returns {string|null} a METRO_MARKETS id, or null when the town is not listed. */
export function metroForPlace({ city, state } = {}) {
  const c = norm(city).replace(/,.*$/, '');
  const st = String(state || '').trim().toUpperCase();
  if (!c || !/^[A-Z]{2}$/.test(st)) return null;
  for (const [id, byState] of Object.entries(T)) {
    if ((byState[st] || []).includes(c)) return id;
  }
  return null;
}
