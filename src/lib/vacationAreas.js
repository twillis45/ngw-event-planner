// ─── Vacation areas — places that are DESTINATIONS without being cities ──────
// (host ask 2026-07-27: "Deep Creek Lake is not a city in a state, but the app
// should understand it's a vacation area and what that means.")
//
// The city gates (parseVenueLocation: "City, ST" or ZIP) are right to reject
// "Deep Creek Lake" — it isn't a city. But a host who types it has told us
// three real things: it's a DESTINATION event, the area has a name guests
// recognize, and the area has a hub town that honestly powers weather and
// maps. This registry carries those three facts for the well-known US
// vacation areas — curated and RESEARCHED-tier (each hub town is the area's
// actual service town), never guessed at runtime, expandable as hosts hit
// misses. No live geocoding API — the never-build list holds.

import { venueFor } from './venueFor';

const AREAS = [
  { id: 'deep-creek', label: 'Deep Creek Lake', match: /\bdeep\s*creek(\s*lake)?\b/i, state: 'MD', kind: 'lake', hubTown: 'McHenry' },
  { id: 'outer-banks', label: 'Outer Banks', match: /\bouter\s*banks\b|\bobx\b/i, state: 'NC', kind: 'beach', hubTown: 'Nags Head' },
  { id: 'poconos', label: 'The Poconos', match: /\bpoconos?\b/i, state: 'PA', kind: 'mountain', hubTown: 'Mount Pocono' },
  { id: 'lake-tahoe', label: 'Lake Tahoe', match: /\b(lake\s*)?tahoe\b/i, state: 'CA', kind: 'lake', hubTown: 'South Lake Tahoe' },
  { id: 'smoky-mountains', label: 'The Smoky Mountains', match: /\bsmoky\s*mountains?\b|\bsmokies\b/i, state: 'TN', kind: 'mountain', hubTown: 'Gatlinburg' },
  { id: 'finger-lakes', label: 'The Finger Lakes', match: /\bfinger\s*lakes\b/i, state: 'NY', kind: 'lake', hubTown: 'Ithaca' },
  { id: 'hilton-head', label: 'Hilton Head Island', match: /\bhilton\s*head\b/i, state: 'SC', kind: 'beach', hubTown: 'Hilton Head Island' },
  { id: 'lake-of-the-ozarks', label: 'Lake of the Ozarks', match: /\blake\s*of\s*the\s*ozarks\b/i, state: 'MO', kind: 'lake', hubTown: 'Osage Beach' },
  { id: 'gulf-shores', label: 'Gulf Shores', match: /\bgulf\s*shores\b/i, state: 'AL', kind: 'beach', hubTown: 'Gulf Shores' },
  { id: 'wisconsin-dells', label: 'Wisconsin Dells', match: /\bwisconsin\s*dells\b|\bthe\s*dells\b/i, state: 'WI', kind: 'lake', hubTown: 'Wisconsin Dells' },
  { id: 'cape-cod', label: 'Cape Cod', match: /\bcape\s*cod\b/i, state: 'MA', kind: 'beach', hubTown: 'Hyannis' },
  { id: 'lake-george', label: 'Lake George', match: /\blake\s*george\b/i, state: 'NY', kind: 'lake', hubTown: 'Lake George' },
  { id: 'branson', label: 'Branson', match: /\bbranson\b/i, state: 'MO', kind: 'mountain', hubTown: 'Branson' },
  { id: 'door-county', label: 'Door County', match: /\bdoor\s*county\b/i, state: 'WI', kind: 'lake', hubTown: 'Sturgeon Bay' },
  { id: 'blue-ridge', label: 'The Blue Ridge Mountains', match: /\bblue\s*ridge\b/i, state: 'GA', kind: 'mountain', hubTown: 'Blue Ridge' },
];

export const VACATION_AREA_PROVENANCE = {
  tier: 'researched',
  note: 'Curated US vacation-area registry: each entry maps a recognized area name to its state and real hub/service town (the honest anchor for weather and maps). Expand on host misses; never guessed at runtime.',
};

/** First vacation area mentioned in free text, or null. */
export function matchVacationArea(text) {
  const t = String(text || '');
  if (!t.trim()) return null;
  for (const a of AREAS) if (a.match.test(t)) return a;
  return null;
}

/** The area an event is at, matched from its venue name, or null. */
export function areaForEvent(event) {
  // Through the one venue reader (venueSourceProof ratchet) — no raw reads.
  return matchVacationArea(venueFor(event).name);
}
