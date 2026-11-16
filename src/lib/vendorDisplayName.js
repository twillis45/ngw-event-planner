// ─── vendorDisplayName — the name a host reads in a list (11/16/2026) ────────
// Vendor names are stored as the host (or the seed) typed them, often with the
// town on the end: "Beltway Sound Collective — Arlington, VA". In a sentence or a
// list ("Still waiting: …", "Hi …,") the town is noise and its comma reads as a
// list separator. The stored name is never rewritten; only what is shown drops a
// trailing " — City, ST" / ", City, ST" (splitTrailingPlace's strict gate).
import { splitTrailingPlace } from './cityText';

const clean = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

export function vendorDisplayName(vendor) {
  const raw = clean(vendor && vendor.name);
  if (!raw) return clean(vendor && vendor.category);
  const split = splitTrailingPlace(raw);
  return (split && split.name) || raw;
}
