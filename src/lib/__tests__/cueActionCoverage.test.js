// ─── EVERY AXIS NAMES ITS OWN ACT ──────────────────────────────────────────
//
// Found on a live drive (2026-08-03, ?stage=phone, Santa Fe 80th): the hero
// read "Add the location." directly above a button labelled "Open the plan".
// A CTA that names no act is exactly what the CTAs-name-the-act rule forbids.
//
// The cause was not a bad label — it was a SILENT FALLBACK. `CUE_ACTIONS` had
// no entry for the `lodging` axis (nor `crabs`, nor `moment`), and the lookup
// ended in `|| 'Open the plan'`. A missing label therefore produced a
// plausible-looking button instead of an obvious break, so nobody saw it.
//
// This gate removes the silence: every axis phaseProgress can raise must carry
// a label of its own, and no label may be the generic fallback.
const fs = require('fs');
const path = require('path');
const { CUE_ACTION_IDS, CUE_ACTION_LABELS } = require('../phaseProgress');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'phaseProgress.js'), 'utf8');

// The axes are declared as add('<id>', …) inside phaseProgress itself.
const declaredAxes = Array.from(new Set(
  (SRC.match(/add\('([a-z-]+)'/g) || []).map((m) => m.replace("add('", '').replace("'", ''))
));

describe('every phase axis names its own act', () => {
  it('finds the axes to check', () => {
    expect(declaredAxes.length).toBeGreaterThan(5);
    expect(declaredAxes).toContain('lodging');
  });

  it('has an action label for every axis — no silent fallback', () => {
    const missing = declaredAxes.filter((a) => !CUE_ACTION_IDS.includes(a));
    expect(missing).toEqual([]);
  });

  it('never lets an axis label be the generic fallback', () => {
    // Asserted against the exported map, not by parsing source — the first cut
    // of this test scraped quoted strings out of the file and tripped over an
    // apostrophe in a comment.
    const generic = Object.entries(CUE_ACTION_LABELS)
      .filter(([, l]) => /^open the plan$/i.test(String(l)));
    expect(generic).toEqual([]);
  });
});
