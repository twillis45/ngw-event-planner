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
import { parseVenueLocation } from './cityText';

export function townFieldsToPersist(typedCity, parsed) {
  const typed = String(typedCity || '').trim();
  const p = parsed || {};
  const text = typed || (p.venueCity ? (p.venueState ? p.venueCity + ', ' + p.venueState : p.venueCity) : '');
  const loc = text ? parseVenueLocation(text) : null;
  if (loc) return loc.zip ? { venueCity: loc.zip } : { venueCity: loc.city, venueState: loc.state };
  const stateOnly = !typed && !p.venueCity && p.venueState ? { venueState: p.venueState } : {};
  return { venueCity: '', ...stateOnly, ...(text ? { cityHeard: text } : {}) };
}
