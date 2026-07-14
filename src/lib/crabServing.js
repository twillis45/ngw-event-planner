// ─── How many crabs does one picker eat, and how many are in a bushel? ONE table.
//
// Researched 2026-07-14 against primary vendor sources. Read the provenance notes
// before changing a number here: several of the numbers this table REPLACES were
// invented, and were sitting behind a `sources:` array that made them look researched.
//
// ── What was here before, and why it was wrong ────────────────────────────────
// The app carried FOUR answers to "how many crabs":
//
//   1. crabFeast.js  p_crabs.qtyPerGuest = 0.75 dozen → 9 crabs a guest. Size-blind,
//      kid-blind, and higher than EVERY published figure. The food row multiplied it.
//   2. crabFeast.js  p_crabs.servingGuide.bySize — per-size, cited... and partly fabricated.
//   3. crabPlan.js   TARGET_BY_ROLE = { main: 6 } — a size-blind snapshot of (2), under a
//      comment admitting it was copied. recommendCrabOrder() hardcodes size='large', so it
//      bought LARGE crabs at the MEDIUM rate.
//   4. crabFeast.js  priceLadder.approxPerBushel (84/72/60/48) vs crabPlan.js
//      DEFAULT_PER_BUSHEL (84/72/60/**52**). The 52 matches no source on earth.
//
// The host saw (1) and (3) disagree on one screen: the food row said "12.6 dozens ·
// ¾ dozen/guest × 18 guests" (~151 crabs) while the crab plan, one tap away, said
// "1 bushel + 1 half-bushel — about 108 crabs · 18 pickers at ~6 each."
//
// ── What the research actually found (and what it destroyed) ──────────────────
// • Cameron's URL we cited 301-redirects — the stored link was dead as written.
// • Crab Dynasty's ordering guide, our OTHER cited source, publishes NO size-specific
//   per-person numbers at all. Citing it for "medium 6 / large 5 / XL 4 / jumbo 3" was
//   a false provenance claim. The size table was never sourced the way it claimed.
// • large withSides was 5. Cameron's says 4. The 5 appears in no source.
// • The whole XL per-person row was FABRICATED. No vendor — Cameron's, Crab Dynasty,
//   Harbour House, Linton's — publishes an "extra large" per-person figure. It is kept
//   below ONLY as an explicitly interpolated row.
// • jumbo mainOnly was 5 and colossal mainOnly was 4 — both UNDER every published
//   figure (sources say 6–8 and 5–6). The old table's main-only column actually went
//   DOWN as crabs got bigger, which is backwards.
// • crabPlan's jumbo bushel count of 52 was invented. The sourced 4th tier is 48.
//
// ── Rules for this file ───────────────────────────────────────────────────────
// • Vendor size NAMES are not standardized (Harbour House "Large" = 6–6.5"; Linton's
//   "Jumbo" = 6–6.75"; Cameron's "#1 Male" = 5.5–6.25"). Tiers are therefore keyed to
//   INCHES, and the name is a label on top of that.
// • Every row carries `source` and `tier`. `tier: 'interpolated'` means NO source
//   publishes it and we filled the gap — surfaces must be able to say so.
// • Sources disagree (Harbour House puts a medium bushel at 60–72, a full tier below
//   Crab Dynasty and Linton's). Where they do, the range is preserved, not averaged.

/** A crab feast HAS sides (the playbook buys corn, slaw, potato salad, hush puppies),
 *  so `withSides` is the default planning column. `mainOnly` is the crabs-are-the-
 *  whole-meal column, which every source prices noticeably higher. */
export const CRAB_SERVING_GUIDE = Object.freeze({
  sources: Object.freeze({
    camerons: "Cameron's Seafood — https://www.cameronsseafood.com/blogs/recipes/how-much-crab-should-i-order",
    crabDynastyGuide: 'Crab Dynasty ordering guide — https://www.crabdynasty.com/how-to-order-the-right-amount-of-seafood.html',
    crabDynastyJumbo: 'Crab Dynasty jumbo males — https://www.crabdynasty.com/jumbo-male-hard-crabs.html',
    harbourHouse: 'Harbour House Crabs — https://www.ilovecrabs.com/faq/about-maryland-blue-crabs/crabfest-quantity',
    lintons: "Linton's Seafood — https://www.lintonseafood.com/jumbo-blue-crabs-bushel-maryland-steamed.html",
    marylandDNR: 'Maryland DNR crab measures conversion — https://dnr.maryland.gov/fisheries/documents/crab_measures_conversion-chart.pdf',
    captainWhites: "Captain White's Seafood — https://captainwhitesseafood.com/products/male-blue-crabs (observed 2026-07-14)",
  }),

  // ── The DMV vendors a DC host would actually call, researched 2026-07-14 ──────
  // Recorded because the SPREAD is the finding, and because two of the three publish
  // nothing at all — which is itself the honest thing to tell a host.
  dmvVendors: Object.freeze({
    captainWhites: Object.freeze({
      // Their own product pages, verbatim: "For adults 2-4 crabs per person is recommended."
      perPerson: [2, 4], tier: 'cited',
      // The correction that matters: this playbook told hosts Captain White's was at the
      // Maine Ave Fish Market. It LEFT in November 2021 (Washingtonian 2021-11-04; DCist
      // 2023-09-12) and now trades from Oxon Hill, MD — a drive, not a walk from the Wharf.
      location: 'Oxon Hill, MD — left the Maine Ave Fish Market / DC Wharf in Nov 2021',
      note: "2–4 is NOTICEABLY lower than Cameron's 4 for the same size. Recorded as a real vendor spread, NOT averaged into the table above. Their published prices are SHIPPING prices; their own site says counter prices are in-store only.",
    }),
    jessieTaylor: Object.freeze({
      // The vendor actually on the barges at the Wharf now.
      perPerson: null, tier: 'silent',
      location: 'Maine Ave Fish Market / DC Wharf — 1100 Maine Ave SW. Steams on site.',
      note: 'Publishes NO per-person guidance and no dated price list. The only dated prices found are WTOP, 2018 — a 2018 price is not a 2026 price. Call to confirm.',
    }),
    captainBillys: Object.freeze({
      perPerson: null, tier: 'silent',
      location: "Popes Creek / Newburg, MD. SEASONAL — closed each winter, reopens ~mid-April.",
      note: 'Publishes nothing: no crab price, no size grades, no per-person figure. Their own menu says "ASK YOUR SERVER FOR OUR SELECTION" and "Blue crab prices are market rate and vary daily." A dine-in crab house, not a documented bushel supplier — do not present a number for them. (301) 932-4323.',
    }),
  }),
  note: 'Per ADULT picker. With-sides is the crab-feast case. Sources disagree by a crab or so; the ranges below are the published spread, not an average.',

  bySize: Object.freeze({
    // Cameron's "Standard Crabs": "average about 6 crabs per person, with additional
    // menu items, and about 8 crabs per person without".
    medium: Object.freeze({
      inches: '5–5.5"', withSides: [6, 6], mainOnly: [8, 8],
      perBushel: [84, 84], perBushelDissent: [60, 72], // Harbour House puts medium a tier lower
      tier: 'cited', source: 'camerons + crabDynasty/lintons (bushel)',
    }),
    // Cameron's "Premium Large": "Lean towards the '4 crabs' per person if there are
    // other munchies on the menu, increase that to the 5-6 per person allotment if
    // crabs will be the featured fare."  ← this is the row the old table got wrong (had 5).
    large: Object.freeze({
      inches: '5.5–6"', withSides: [4, 4], mainOnly: [5, 6],
      perBushel: [72, 72], perBushelDissent: [48, 60],
      tier: 'cited', source: 'camerons + crabDynasty/lintons (bushel)',
    }),
    // NO SOURCE PUBLISHES AN "EXTRA LARGE" PER-PERSON FIGURE. Not one. This row is
    // interpolated between large and jumbo so the size vocabulary stays complete, and
    // it is labelled so callers can disclose it. Do not present it as researched.
    xl: Object.freeze({
      inches: '6–6.5"', withSides: [3, 4], mainOnly: [6, 7],
      perBushel: [60, 66],
      tier: 'interpolated', source: 'none — interpolated between large and jumbo',
    }),
    // Crab Dynasty jumbo males: "about 3-4 jumbo male crabs per person. If you will be
    // eating crabs solely as your main course, then... six to eight crabs per person."
    jumbo: Object.freeze({
      inches: '6–6.75"', withSides: [3, 4], mainOnly: [6, 8],
      perBushel: [60, 60],
      tier: 'cited', source: 'crabDynastyJumbo + lintons (bushel)',
    }),
    // Cameron's "Colossal Jumbo": "3-4 colossal blue crabs per person, if you plan on
    // serving additional menu items... Or, 5-6 colossals per person if crabs are the
    // only main item."
    colossal: Object.freeze({
      inches: '6.75"+', withSides: [3, 4], mainOnly: [5, 6],
      perBushel: [48, 48],
      tier: 'cited', source: 'camerons + crabDynasty (bushel)',
    }),
  }),

  // Cameron's is the ONLY source that addresses children at all; Crab Dynasty, Harbour
  // House, Linton's and DNR are silent. "under the age of 10, average about 1-2 crabs
  // per kiddo. Novice preteens or teenagers, average about 2-4."
  children: Object.freeze({
    under10: [1, 2],
    teen: [2, 4],
    tier: 'cited', source: 'camerons',
    note: 'Kids eat 1–2 whatever the size; teenagers 2–4. Size barely matters for children.',
  }),
});

// The crab engine's size words and the guide's are not the same words. The mapping
// lives here so no caller has to invent one — which is how the last four tables happened.
const SIZE_ALIAS = Object.freeze({
  medium: 'medium', standard: 'medium',
  large: 'large',
  extra_large: 'xl', xl: 'xl',
  jumbo: 'jumbo',
  colossal: 'colossal',
  // 'mixed' / 'unknown' / unrecognized → the playbook's default size.
});

/** The crab_size decision defaults to Large Males. */
export const DEFAULT_CRAB_SIZE = 'large';

export function normalizeCrabSize(size) {
  return SIZE_ALIAS[String(size || '').toLowerCase()] || DEFAULT_CRAB_SIZE;
}

function entryFor(size) {
  return CRAB_SERVING_GUIDE.bySize[normalizeCrabSize(size)] || CRAB_SERVING_GUIDE.bySize[DEFAULT_CRAB_SIZE];
}

/**
 * Crabs one ADULT picker eats. Returns the PLANNING number — the top of the published
 * range, because the failure mode at a crab feast is running out of crabs, and the
 * spread is a crab wide, not a bushel wide. Use crabsPerPickerRange() to disclose it.
 * @param {string} size
 * @param {{mainOnly?: boolean}} [opts] crabs are the whole meal (no sides)
 */
export function crabsPerPicker(size, opts = {}) {
  const r = crabsPerPickerRange(size, opts);
  return r[1];
}

/** The published [low, high] for this size — for surfaces that show the spread. */
export function crabsPerPickerRange(size, opts = {}) {
  const e = entryFor(size);
  return opts.mainOnly ? e.mainOnly : e.withSides;
}

/** Crabs in a bushel of this size. Sourced except where `tier` says interpolated. */
export function crabsPerBushel(size) {
  return entryFor(size).perBushel[0];
}

/** Is this size's guidance actually published, or did we fill the gap ourselves? */
export function crabServingProvenance(size) {
  const e = entryFor(size);
  return { tier: e.tier, source: e.source, inches: e.inches };
}

/** Crabs one child eats — plan the top of Cameron's under-10 range. */
export function crabsPerChild() {
  return CRAB_SERVING_GUIDE.children.under10[1];
}
