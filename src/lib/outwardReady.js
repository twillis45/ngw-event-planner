// ─── NOTHING GOES OUT WITH A PLACEHOLDER (six root causes, cause 6) ──────────
//
// Thanksgiving walkthrough P1-8 (11/23/2026): the invite was titled "My
// Thanksgiving Hosting" (the name creation made when her sentence named no
// honoree) and carried no street address — "my house in Fort Washington, MD"
// is a town, not a door. Every outward surface asks this ONE guard before a
// preview or a send: the invite (and its email and text), the family link,
// a helper's link, a vendor's brief. Missing facts are asked of the host
// first, in plain words; nothing is sent around them.
//
// Server copy: backend/app/outward.py (`outward_gaps`), held to the same
// rules by tests/test_outward_lines.py.
import { venueFor } from './venueFor';
import { getPlaybook } from './playbooks';
import { occasionShortName } from './occasionWords';

export const OUTWARD_SURFACES = Object.freeze(['invite', 'family', 'helper', 'vendor']);

/** A name creation filled in rather than one she gave: empty, "My …", or the bare type. */
export function isPlaceholderName(event) {
  const ev = event || {};
  const name = String(ev.name || '').trim();
  if (!name) return true;
  if (/^my\s/i.test(name)) return true;
  const type = String(ev.type || '').trim();
  const pb = type ? (() => { try { return getPlaybook(type); } catch (_e) { return null; } })() : null;
  const bare = [type, pb && pb.type, pb && pb.meta && pb.meta.label, type && occasionShortName(type)].filter(Boolean).map((x) => String(x).toLowerCase());
  return bare.includes(name.toLowerCase());
}

/** A guest can find the door: a street at home; a named place or a street anywhere else. */
export function hasFindablePlace(event) {
  return !!venueFor(event || {}).findable;
}

const ASKS = {
  name: 'Give your event a name first. It is the title everyone sees.',
  address: 'Add the street address first. Guests need it to find you.',
};

/**
 * outwardGaps(event, surface) → [{ key, ask }] — what must be fixed before
 * this surface goes out. Empty when it may go.
 */
export function outwardGaps(event, surface = 'invite') {
  const gaps = [];
  if (isPlaceholderName(event)) gaps.push({ key: 'name', ask: ASKS.name });
  // A vendor's brief carries the place too (the delivery has to find it).
  if (OUTWARD_SURFACES.includes(surface) && !hasFindablePlace(event)) gaps.push({ key: 'address', ask: ASKS.address });
  return gaps;
}

/** The one sentence a blocked send shows. */
export function outwardPrompt(gaps) {
  return (gaps || []).map((g) => g.ask).join(' ');
}
