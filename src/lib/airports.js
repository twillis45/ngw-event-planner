// ─── Airports reference — nearest-to-the-venue proposal + field autocomplete ──
//
// Host directives (2026-07-28): the "Getting here" sheet should recognize the
// closest airport to the event and default to it; the airport name/code fields
// should autocomplete.
//
// DOCTRINE SHAPE:
//   · Static PUBLIC reference data — U.S. commercial-service airports (FAA
//     NPIAS categories: large/medium/small hubs + notable non-hubs near
//     destination-event country), coordinates from FAA airport records.
//     Reference data, not a claim about THIS event.
//   · "Closest" is stated honestly: straight-line miles from the venue's
//     geocoded point, labeled as such — drive time decides, we never claim it.
//   · The proposal is propose-don't-ask: pre-filled with provenance and a
//     one-tap accept; the host can always type their own.
//
// Entries: [code, name, city, state, lat, lon]

export const AIRPORTS = [
  ['ATL', 'Hartsfield-Jackson Atlanta Intl', 'Atlanta', 'GA', 33.6367, -84.4281],
  ['DFW', 'Dallas/Fort Worth Intl', 'Dallas', 'TX', 32.8968, -97.0380],
  ['DEN', 'Denver Intl', 'Denver', 'CO', 39.8617, -104.6731],
  ['ORD', "Chicago O'Hare Intl", 'Chicago', 'IL', 41.9786, -87.9048],
  ['MDW', 'Chicago Midway Intl', 'Chicago', 'IL', 41.7860, -87.7524],
  ['LAX', 'Los Angeles Intl', 'Los Angeles', 'CA', 33.9425, -118.4081],
  ['JFK', 'John F. Kennedy Intl', 'New York', 'NY', 40.6398, -73.7789],
  ['LGA', 'LaGuardia', 'New York', 'NY', 40.7772, -73.8726],
  ['EWR', 'Newark Liberty Intl', 'Newark', 'NJ', 40.6925, -74.1687],
  ['LAS', 'Harry Reid Intl', 'Las Vegas', 'NV', 36.0840, -115.1537],
  ['MCO', 'Orlando Intl', 'Orlando', 'FL', 28.4294, -81.3090],
  ['MIA', 'Miami Intl', 'Miami', 'FL', 25.7932, -80.2906],
  ['FLL', 'Fort Lauderdale-Hollywood Intl', 'Fort Lauderdale', 'FL', 26.0726, -80.1527],
  ['PBI', 'Palm Beach Intl', 'West Palm Beach', 'FL', 26.6832, -80.0956],
  ['TPA', 'Tampa Intl', 'Tampa', 'FL', 27.9755, -82.5332],
  ['RSW', 'Southwest Florida Intl', 'Fort Myers', 'FL', 26.5362, -81.7552],
  ['JAX', 'Jacksonville Intl', 'Jacksonville', 'FL', 30.4941, -81.6879],
  ['PNS', 'Pensacola Intl', 'Pensacola', 'FL', 30.4734, -87.1866],
  ['VPS', 'Destin-Fort Walton Beach', 'Valparaiso', 'FL', 30.4832, -86.5254],
  ['ECP', 'Northwest Florida Beaches Intl', 'Panama City', 'FL', 30.3571, -85.7955],
  ['SEA', 'Seattle-Tacoma Intl', 'Seattle', 'WA', 47.4490, -122.3093],
  ['SFO', 'San Francisco Intl', 'San Francisco', 'CA', 37.6190, -122.3749],
  ['OAK', 'Oakland Intl', 'Oakland', 'CA', 37.7213, -122.2207],
  ['SJC', 'San Jose Mineta Intl', 'San Jose', 'CA', 37.3626, -121.9291],
  ['SAN', 'San Diego Intl', 'San Diego', 'CA', 32.7336, -117.1897],
  ['SMF', 'Sacramento Intl', 'Sacramento', 'CA', 38.6954, -121.5908],
  ['BUR', 'Hollywood Burbank', 'Burbank', 'CA', 34.2007, -118.3585],
  ['SNA', 'John Wayne (Orange County)', 'Santa Ana', 'CA', 33.6757, -117.8682],
  ['ONT', 'Ontario Intl', 'Ontario', 'CA', 34.0560, -117.6012],
  ['PSP', 'Palm Springs Intl', 'Palm Springs', 'CA', 33.8297, -116.5067],
  ['PHX', 'Phoenix Sky Harbor Intl', 'Phoenix', 'AZ', 33.4343, -112.0116],
  ['TUS', 'Tucson Intl', 'Tucson', 'AZ', 32.1161, -110.9410],
  ['IAH', 'George Bush Intercontinental', 'Houston', 'TX', 29.9844, -95.3414],
  ['HOU', 'William P. Hobby', 'Houston', 'TX', 29.6454, -95.2789],
  ['AUS', 'Austin-Bergstrom Intl', 'Austin', 'TX', 30.1945, -97.6699],
  ['SAT', 'San Antonio Intl', 'San Antonio', 'TX', 29.5337, -98.4698],
  ['DAL', 'Dallas Love Field', 'Dallas', 'TX', 32.8471, -96.8518],
  ['ELP', 'El Paso Intl', 'El Paso', 'TX', 31.8072, -106.3776],
  ['MSY', 'Louis Armstrong New Orleans Intl', 'New Orleans', 'LA', 29.9934, -90.2580],
  ['BNA', 'Nashville Intl', 'Nashville', 'TN', 36.1245, -86.6782],
  ['MEM', 'Memphis Intl', 'Memphis', 'TN', 35.0424, -89.9767],
  ['TYS', 'McGhee Tyson (Knoxville)', 'Knoxville', 'TN', 35.8110, -83.9940],
  ['CLT', 'Charlotte Douglas Intl', 'Charlotte', 'NC', 35.2140, -80.9431],
  ['RDU', 'Raleigh-Durham Intl', 'Raleigh', 'NC', 35.8776, -78.7875],
  ['ILM', 'Wilmington Intl', 'Wilmington', 'NC', 34.2706, -77.9026],
  ['AVL', 'Asheville Regional', 'Asheville', 'NC', 35.4362, -82.5418],
  ['CHS', 'Charleston Intl', 'Charleston', 'SC', 32.8986, -80.0405],
  ['MYR', 'Myrtle Beach Intl', 'Myrtle Beach', 'SC', 33.6797, -78.9283],
  ['GSP', 'Greenville-Spartanburg Intl', 'Greer', 'SC', 34.8957, -82.2189],
  ['SAV', 'Savannah/Hilton Head Intl', 'Savannah', 'GA', 32.1276, -81.2021],
  ['IAD', 'Washington Dulles Intl', 'Dulles', 'VA', 38.9445, -77.4558],
  ['DCA', 'Ronald Reagan Washington National', 'Arlington', 'VA', 38.8521, -77.0377],
  ['RIC', 'Richmond Intl', 'Richmond', 'VA', 37.5052, -77.3197],
  ['ORF', 'Norfolk Intl', 'Norfolk', 'VA', 36.8946, -76.2012],
  ['BWI', 'Baltimore/Washington Intl Thurgood Marshall', 'Baltimore', 'MD', 39.1754, -76.6683],
  ['PIT', 'Pittsburgh Intl', 'Pittsburgh', 'PA', 40.4915, -80.2329],
  ['PHL', 'Philadelphia Intl', 'Philadelphia', 'PA', 39.8719, -75.2411],
  ['MDT', 'Harrisburg Intl', 'Harrisburg', 'PA', 40.1935, -76.7634],
  ['MGW', 'Morgantown Municipal', 'Morgantown', 'WV', 39.6429, -79.9163],
  ['CRW', 'West Virginia Intl Yeager', 'Charleston', 'WV', 38.3731, -81.5932],
  ['CLE', 'Cleveland Hopkins Intl', 'Cleveland', 'OH', 41.4117, -81.8498],
  ['CMH', 'John Glenn Columbus Intl', 'Columbus', 'OH', 39.9980, -82.8919],
  ['CVG', 'Cincinnati/Northern Kentucky Intl', 'Hebron', 'KY', 39.0488, -84.6678],
  ['SDF', 'Louisville Muhammad Ali Intl', 'Louisville', 'KY', 38.1744, -85.7360],
  ['IND', 'Indianapolis Intl', 'Indianapolis', 'IN', 39.7173, -86.2944],
  ['DTW', 'Detroit Metro Wayne County', 'Detroit', 'MI', 42.2124, -83.3534],
  ['GRR', 'Gerald R. Ford Intl', 'Grand Rapids', 'MI', 42.8808, -85.5228],
  ['TVC', 'Cherry Capital (Traverse City)', 'Traverse City', 'MI', 44.7414, -85.5822],
  ['MSP', 'Minneapolis-St. Paul Intl', 'Minneapolis', 'MN', 44.8820, -93.2218],
  ['MKE', 'Milwaukee Mitchell Intl', 'Milwaukee', 'WI', 42.9472, -87.8966],
  ['MSN', 'Dane County Regional', 'Madison', 'WI', 43.1399, -89.3375],
  ['STL', 'St. Louis Lambert Intl', 'St. Louis', 'MO', 38.7487, -90.3700],
  ['MCI', 'Kansas City Intl', 'Kansas City', 'MO', 39.2976, -94.7139],
  ['BOS', 'Boston Logan Intl', 'Boston', 'MA', 42.3643, -71.0052],
  ['PVD', 'Rhode Island T.F. Green Intl', 'Providence', 'RI', 41.7240, -71.4283],
  ['BDL', 'Bradley Intl (Hartford)', 'Windsor Locks', 'CT', 41.9389, -72.6832],
  ['ALB', 'Albany Intl', 'Albany', 'NY', 42.7483, -73.8017],
  ['BUF', 'Buffalo Niagara Intl', 'Buffalo', 'NY', 42.9405, -78.7322],
  ['ROC', 'Frederick Douglass Greater Rochester Intl', 'Rochester', 'NY', 43.1189, -77.6724],
  ['SYR', 'Syracuse Hancock Intl', 'Syracuse', 'NY', 43.1112, -76.1063],
  ['HPN', 'Westchester County', 'White Plains', 'NY', 41.0670, -73.7076],
  ['ISP', 'Long Island MacArthur', 'Islip', 'NY', 40.7952, -73.1002],
  ['ACY', 'Atlantic City Intl', 'Atlantic City', 'NJ', 39.4576, -74.5772],
  ['PWM', 'Portland Intl Jetport', 'Portland', 'ME', 43.6462, -70.3093],
  ['BTV', 'Burlington Intl', 'Burlington', 'VT', 44.4720, -73.1533],
  ['MHT', 'Manchester-Boston Regional', 'Manchester', 'NH', 42.9326, -71.4357],
  ['SLC', 'Salt Lake City Intl', 'Salt Lake City', 'UT', 40.7884, -111.9778],
  ['ABQ', 'Albuquerque Intl Sunport', 'Albuquerque', 'NM', 35.0402, -106.6091],
  ['OKC', 'Will Rogers World', 'Oklahoma City', 'OK', 35.3931, -97.6007],
  ['TUL', 'Tulsa Intl', 'Tulsa', 'OK', 36.1984, -95.8881],
  ['OMA', 'Eppley Airfield', 'Omaha', 'NE', 41.3032, -95.8941],
  ['DSM', 'Des Moines Intl', 'Des Moines', 'IA', 41.5340, -93.6631],
  ['LIT', 'Bill and Hillary Clinton National', 'Little Rock', 'AR', 34.7294, -92.2243],
  ['BHM', 'Birmingham-Shuttlesworth Intl', 'Birmingham', 'AL', 33.5629, -86.7535],
  ['HSV', 'Huntsville Intl', 'Huntsville', 'AL', 34.6372, -86.7751],
  ['MOB', 'Mobile Regional', 'Mobile', 'AL', 30.6912, -88.2428],
  ['JAN', 'Jackson-Medgar Wiley Evers Intl', 'Jackson', 'MS', 32.3112, -90.0759],
  ['GPT', 'Gulfport-Biloxi Intl', 'Gulfport', 'MS', 30.4073, -89.0701],
  ['PDX', 'Portland Intl', 'Portland', 'OR', 45.5887, -122.5975],
  ['BOI', 'Boise Airport', 'Boise', 'ID', 43.5644, -116.2228],
  ['ANC', 'Ted Stevens Anchorage Intl', 'Anchorage', 'AK', 61.1744, -149.9963],
  ['HNL', 'Daniel K. Inouye Intl', 'Honolulu', 'HI', 21.3187, -157.9224],
  ['OGG', 'Kahului (Maui)', 'Kahului', 'HI', 20.8986, -156.4305],
  ['KOA', 'Ellison Onizuka Kona Intl', 'Kailua-Kona', 'HI', 19.7388, -156.0456],
  ['LIH', 'Lihue (Kauai)', 'Lihue', 'HI', 21.9760, -159.3390],
  ['SJU', 'Luis Muñoz Marín Intl', 'San Juan', 'PR', 18.4394, -66.0018],
  ['ASE', 'Aspen/Pitkin County', 'Aspen', 'CO', 39.2232, -106.8688],
  ['EGE', 'Eagle County Regional (Vail)', 'Gypsum', 'CO', 39.6426, -106.9177],
  ['COS', 'Colorado Springs', 'Colorado Springs', 'CO', 38.8058, -104.7008],
  ['JAC', 'Jackson Hole', 'Jackson', 'WY', 43.6073, -110.7377],
  ['BZN', 'Bozeman Yellowstone Intl', 'Bozeman', 'MT', 45.7775, -111.1530],
  ['MSO', 'Missoula Montana', 'Missoula', 'MT', 46.9163, -114.0906],
  ['RNO', 'Reno-Tahoe Intl', 'Reno', 'NV', 39.4991, -119.7681],
  ['SGF', 'Springfield-Branson National', 'Springfield', 'MO', 37.2457, -93.3886],
  ['XNA', 'Northwest Arkansas National', 'Bentonville', 'AR', 36.2819, -94.3068],
  ['GSO', 'Piedmont Triad Intl', 'Greensboro', 'NC', 36.0978, -79.9373],
  ['LEX', 'Blue Grass (Lexington)', 'Lexington', 'KY', 38.0365, -84.6059],
  ['DAY', 'Dayton Intl', 'Dayton', 'OH', 39.9024, -84.2194],
  ['SBN', 'South Bend Intl', 'South Bend', 'IN', 41.7087, -86.3173],
].map(([code, name, city, state, lat, lon]) => ({ code, name, city, state, lat, lon }));

const R_MI = 3958.8;
export function distanceMiles(aLat, aLon, bLat, bLon) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat), dLon = rad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_MI * Math.asin(Math.sqrt(h));
}

/**
 * The n closest airports to a point, each with distanceMi (straight-line,
 * rounded). Honest labeling is the CALLER's job: say "miles as the crow flies —
 * drive time decides."
 */
export function nearestAirports(lat, lon, n = 3) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
  return AIRPORTS
    .map((a) => ({ ...a, distanceMi: Math.round(distanceMiles(lat, lon, a.lat, a.lon)) }))
    .sort((x, y) => x.distanceMi - y.distanceMi)
    .slice(0, n);
}

/**
 * Autocomplete search over code / name / city. Code prefix matches rank first,
 * then name/city word-prefix, then substring. Max `n` results.
 */
export function airportSearch(q, n = 8) {
  const s = String(q || '').trim().toLowerCase();
  if (!s) return [];
  const scored = [];
  for (const a of AIRPORTS) {
    const code = a.code.toLowerCase();
    const hay = (a.name + ' ' + a.city + ' ' + a.state).toLowerCase();
    let score = null;
    if (code === s) score = 0;
    else if (code.startsWith(s)) score = 1;
    else if (new RegExp('\\b' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(hay)) score = 2;
    else if (hay.includes(s)) score = 3;
    if (score != null) scored.push([score, a]);
  }
  return scored.sort((x, y) => x[0] - y[0]).slice(0, n).map(([, a]) => a);
}

/** Exact resolve for autofill: by code (case-insensitive) or exact name. */
export function airportByCodeOrName(v) {
  const s = String(v || '').trim().toLowerCase();
  if (!s) return null;
  return AIRPORTS.find((a) => a.code.toLowerCase() === s)
    || AIRPORTS.find((a) => a.name.toLowerCase() === s)
    || null;
}
