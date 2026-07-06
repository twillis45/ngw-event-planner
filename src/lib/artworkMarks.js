// ─── Artwork identity marks — real illustrations, one per icon key ────────────
// The crab verdict (2026-07-06): for some event identities a REAL illustration
// beats any drawn mark. This registry maps an EVT_IDENT icon key to a sourced
// artwork asset in /public. When an icon is listed here it renders as the SAME
// image at EVERY size (hero, card, badge) — one identity, no size-dependent
// look-switching. Icons not listed keep the drawn system (glass hero + line
// glyph) unchanged.
//
// SOURCING PIPELINE (repeat this for new event artwork — see also
// docs/GLYPH_STANDARD.md):
//   1. Search Wikimedia Commons for the subject + "illustration"
//      (api.php?action=query&list=search&srnamespace=6).
//   2. License gate: PUBLIC DOMAIN ONLY (US government works — NOAA/USFWS
//      natural-history plates are the gold standard — or expired-copyright
//      plates like FMIB scans). Verify via imageinfo extmetadata
//      LicenseShortName. Never CC-BY (attribution burden in-product), never
//      fair-use, never unknown.
//   3. Process: clear any watermark text (it's decoration, not a license
//      term, on PD works), border-connected flood-fill the background to
//      transparency (preserves light tones INSIDE the subject), soften the
//      edge alpha, trim to content + small margin.
//   4. Ship as public/<name>.png and register it here.
export const ARTWORK_MARKS = {
  // NOAA Fisheries blue crab (Callinectes sapidus) — US government work,
  // public domain, no attribution required. Watermark cleared, background
  // transparent, trimmed (422x392).
  crab: 'crab-hero.png',
  // USFWS-style channel catfish (Ictalurus punctatus) painting — public
  // domain, background made transparent, trimmed (788x260). Fish Fry.
  fish: 'catfish-hero.png',
};

// Resolve an icon key to its artwork URL, or null when the icon uses the
// drawn glyph system.
export function artworkFor(icon) {
  const file = ARTWORK_MARKS[icon];
  return file ? `${process.env.PUBLIC_URL || ''}/${file}` : null;
}
