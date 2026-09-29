// THE 11px FLOOR WAS WRITTEN DOWN AND NEVER ENFORCED.
//
// styles.css names --t-caption-min "smallest legal type — the 11px floor".
// Host, 2026-09-29, pointing at the lodging cockpit's tab strip: "is this the
// right font size?" It was 10px — a raw value, one pixel under the floor, on
// the five words a host navigates that whole surface with. The >=1024
// override in the same file already used 12px, so the phone had the smallest
// copy of the most-used labels.
//
// The floor existed as a comment. A rule nobody checks is a preference, and
// this is the second thing today that was true in a comment and false in the
// build (--field, --muted, --danger-text, amber, successGreen were the first
// five). So it is a test now.
//
// It reads the SOURCE, not a rendered page, because that is where a raw value
// is introduced and because no rendered test can visit every breakpoint of
// every surface. Scoped to hostv2's own stylesheets and the cockpit's inline
// block — the two places this shell's type actually comes from.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../../hostv2/src');
const FILES = ['styles.css', 'LodgingCockpit.jsx'];
const FLOOR = 11;

// `font-size: 10px` and the shorthand `font: 500 10px/1 ...` both count.
const SIZES = /(?:font-size\s*:\s*|font\s*:\s*[^;{}]*?\b)(\d+(?:\.\d+)?)px/g;

const scan = (file) => {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const under = [];
  for (const line of src.split('\n')) {
    // Comments are where the history lives — they quote old values on purpose,
    // and a rule that fails on its own changelog is unusable.
    const code = line.replace(/\/\*.*?\*\//g, '').replace(/^\s*(\/\/|\*|\/\*).*$/, '');
    SIZES.lastIndex = 0;
    let m;
    while ((m = SIZES.exec(code))) {
      const px = parseFloat(m[1]);
      if (px > 0 && px < FLOOR) under.push(`${px}px — ${line.trim().slice(0, 80)}`);
    }
  }
  return under;
};

// A RATCHET, NOT A SWEEP. Measured 2026-09-29: the floor is violated in tens
// of places across these two files (8px, 9px, 9.5px, 10px, 10.5px), several of
// them wide-tracked uppercase eyebrows where the choice may well be
// deliberate. Turning the comment into a hard gate today would mean a
// stylesheet-wide sweep nobody asked for, and would most likely end in the
// baseline being raised to make it pass — which is how a gate becomes
// decoration.
//
// So it holds the line instead: the count may fall, never rise. Same shape as
// spacingLadder.test.js, which this repo already runs for exactly this reason.
// The tab strip is one fewer as of today, and this is what stops the next one.
const BASELINE = { 'styles.css': 9, 'LodgingCockpit.jsx': 0 };

describe('type below the stated floor never increases', () => {
  for (const file of FILES) {
    test(`${file}`, () => {
      const under = scan(file);
      const base = BASELINE[file];
      // NOTE: jest here rejects expect(value, message) — that second argument
      // is a Playwright API. Failures carry their detail in the thrown message
      // below instead.
      expect(typeof base).toBe('number');
      if (under.length > base) {
        throw new Error(
          `Type under the ${FLOOR}px floor went UP in ${file}: ${under.length} vs baseline ${base}.\n`
          + `styles.css calls --t-caption-min "smallest legal type". Use a --t-* token.\n`
          + under.slice(0, 8).join('\n'),
        );
      }
      // Went DOWN? Lower the baseline in this file, so the ratchet keeps.
      // Went DOWN? Lower the baseline in this file, so the ratchet keeps.
      if (under.length < base) {
        throw new Error(`${file} improved: ${under.length} under the floor, baseline says ${base}. Lower BASELINE to ${under.length} so the ratchet holds.`);
      }
      expect(under.length).toBe(base);
    });
  }

  test('the floor this test enforces is the one the stylesheet declares', () => {
    const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
    const m = css.match(/--t-caption-min\s*:\s*([0-9.]+)px/);
    // --t-caption-min gone would mean this test enforces a floor nobody declares.
    expect(Boolean(m && m[1])).toBe(true);
    expect(parseFloat(m[1])).toBe(FLOOR);
  });
});
