// ─── WHAT CREATION SAVES OF THE TOWN SHE GAVE ──────────────────────────────
//
// Moved out of the creation seam (HostShellV2, `createEvent`) so jest can run
// it (batch 11, 11/23/2026), the same move startTimeFieldsToPersist made.
//
// The rule is the strict one the seam always applied: a town is committed only
// through parseVenueLocation ("City, ST" or a ZIP). A bare town is kept as heard
// (`cityHeard`) and never as a located place.
//
// THE STATE SHE SAID IS KEPT (batch 11, #233 Left). "Sandy Point State Park,
// MD" is a park, not a town (#233), so the parser hands back a state with no
// city, and so does "cookout in Maryland". The seam read only the city text,
// found none, and wrote `venueCity: ''`: the state went nowhere. With no town
// typed and no city parsed, the parsed state is saved on its own. The town is
// still asked; nothing is guessed.
//
// WHAT SHE TYPES IN THE TOWN CHIP IS READ BY THE SENTENCE'S READER (11/24/2026).
// The chip's text went straight to parseVenueLocation, which refuses digits, so
// a full street address saved no town and no street. It now goes through
// readPlace (parseSmartEventText's own place fields): the street, the town and
// the state land exactly where the same words in the sentence put them. What it
// cannot place is kept: the street it read, and the rest as `cityHeard`.
import { parseVenueLocation } from './cityText';
import { readPlace } from './readPlace';

function typedFields(typed) {
  const place = readPlace(typed);
  const street = place.venueAddress ? { venueAddress: place.venueAddress } : {};
  const zip = place.venueZip ? { venueZip: place.venueZip } : {};
  if (place.located) {
    return { ...street, ...(place.venueState ? { venueCity: place.venueCity, venueState: place.venueState } : { venueCity: place.venueCity }), ...zip };
  }
  const rest = place.venueAddress
    ? typed.split(place.venueAddress).join(' ').replace(/^[\s,]+|[\s,]+$/g, '').replace(/\s+/g, ' ')
    : typed;
  const heard = place.venueCity || rest;
  return {
    ...street,
    venueCity: '',
    ...(place.venueState ? { venueState: place.venueState } : {}),
    ...(heard ? { cityHeard: heard } : {}),
  };
}

export function townFieldsToPersist(typedCity, parsed) {
  const typed = String(typedCity || '').trim();
  if (typed) return typedFields(typed);
  const p = parsed || {};
  const text = typed || (p.venueCity ? (p.venueState ? p.venueCity + ', ' + p.venueState : p.venueCity) : '');
  const loc = text ? parseVenueLocation(text) : null;
  // The ZIP she gave is kept in venueZip (owner ruling 11/24/2026). A bare ZIP
  // also stays in venueCity, where InviteV2's geocode passthrough reads it.
  const zipSaid = String(p.venueZip || '').trim();
  if (loc) return loc.zip ? { venueCity: loc.zip, venueZip: loc.zip } : { venueCity: loc.city, venueState: loc.state, ...(zipSaid ? { venueZip: zipSaid } : {}) };
  const stateOnly = !typed && !p.venueCity && p.venueState ? { venueState: p.venueState } : {};
  return { venueCity: '', ...stateOnly, ...(text ? { cityHeard: text } : {}) };
}

// ─── A BARE CITY TYPED AS THE VENUE IS THE TOWN (cohesion G4, owner 11/24/2026) ─
// The Venue box saved "Springfield, VA" as the place's NAME, so guests read a
// city as a place to go. When the whole text is only a town ("City, ST") or a
// ZIP — parseVenueLocation's strict gate, over the WHOLE text — it is the
// town, saved where the town chip saves it; the name stays empty. A place name,
// a street, or a place in a town is not a bare town: null.
export function bareTownFields(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  const loc = parseVenueLocation(t);
  if (!loc) return null;
  if (loc.zip) return /^\d{5}(-\d{4})?$/.test(t) ? { venueCity: loc.zip, venueZip: loc.zip } : null;
  if (!loc.city || !loc.state) return null;
  // The whole text is the town and nothing else ("Elm Court Hall, Springfield,
  // VA" names a place in it).
  const said = t.replace(/\s+/g, ' ').toLowerCase();
  if (said !== `${loc.city}, ${loc.state}`.toLowerCase() && said !== `${loc.city} ${loc.state}`.toLowerCase()) return null;
  return { venueCity: loc.city, venueState: loc.state };
}

/** The toast for a bare town: "Springfield, VA noted. Add the place’s name when you have it." */
export function bareTownNote(f) {
  const where = f && (f.venueState ? `${f.venueCity}, ${f.venueState}` : (f.venueZip || f.venueCity));
  return `${where} noted. Add the place’s name when you have it.`;
}
