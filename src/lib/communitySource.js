// ─── A PERSON IS NOT A SHOP ──────────────────────────────────────────────────
//
// A purchase's `where` array is a list of places to get the thing, and the
// shopping sheet reads `where[0]` as the default store to group the line under.
// For most of the corpus that is right — `['Grocery', 'Costco']`.
//
// It is wrong for the repast, and wrongest where it matters most. Four of its
// lines are authored `where: ['Brought by the community', 'Grocery', ...]`, so
// the store picker offered a grieving family a shop called **"Brought by the
// community"**, sat it in the same chip row as Grocery and Caterer, and would
// have printed "Shopping at Brought by the community" above their list.
//
// Found by the review board 2026-09-24 alongside the deletion bug in
// `playbooks/index.js` — the two are the same mistake at opposite ends: one
// treated the community as nobody, this one treats it as a storefront.
//
// WHY A MODULE. The predicate is needed by the shell (which store heads this
// line) and by anything later that groups or attributes a line, and this repo's
// recurring defect is a fact owned by one accessor and re-derived by the
// consumer beside it. Written inline in HostShellV2 it would be copy one of
// several; `playbooks/index.js` already carries a sibling regex for the
// DECISION text ("Ask the repast committee to carry it"), which is a different
// string in a different field and deliberately stays separate.

/**
 * Community/bringer phrases that appear in a `where` list. Deliberately narrow:
 * this only has to catch the authored sources, and a loose pattern that swallowed
 * a real shop name would hide a store the host actually needs.
 */
const COMMUNITY_SOURCE_RE = /brought by|repast committee|\bcommittee\b|church|neighbou?rs|sign.?up|guests bring|potluck/i;

/** Is this `where` entry a group of people rather than a place to shop? */
export function isCommunitySource(where) {
  const s = String(where == null ? '' : where).trim();
  return !!s && COMMUNITY_SOURCE_RE.test(s);
}

/**
 * The first entry in a `where` list that is actually a SHOP.
 *
 * Returns null when every option is a community source — which is the honest
 * answer for a line nobody is buying, and lets the caller leave it out of the
 * store grouping rather than inventing a storefront for it.
 */
export function firstStoreIn(where) {
  if (!Array.isArray(where)) return null;
  for (const w of where) {
    const s = String(w == null ? '' : w).trim();
    if (s && !isCommunitySource(s)) return s;
  }
  return null;
}
