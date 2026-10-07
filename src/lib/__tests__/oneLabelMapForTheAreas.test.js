/* ─── ONE MAP TURNS ENGINE IDS INTO HOST COPY ───────────────────────────────
 *
 * C3 replaced raw `{c.id}` with a label lookup on the plan-parts list, and the
 * commit message said the map had been "hoisted to module scope". A review
 * bench opened it and that was false: the ORIGINAL in-render map was still
 * there, and what I had actually added was a SECOND copy. The built bundle
 * carried "Where it happens" twice.
 *
 * The two agreed wherever they overlapped, which is why nothing looked wrong.
 * They did not overlap everywhere: the in-render copy had 15 keys and the new
 * one 18, so `lodging`, `budget` and `moment` fell through the capitalize
 * fallback and rendered as "Lodging" / "Budget" / "Moment" — raw engine ids as
 * host copy, which is the exact defect C3 was written to remove, still
 * shipping one screen over from the fix.
 *
 * So this gate is not "a map exists". It is TWO claims that together are the
 * thing that broke: there is exactly ONE map, and it covers every id the
 * engine can emit.
 */
const fs = require('fs');
const path = require('path');

const SHELL = fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
const ENGINE = fs.readFileSync(path.join(__dirname, '../phaseProgress.js'), 'utf8');

const areaLabelKeys = () => {
  const m = /const AREA_LABELS\s*=\s*/.exec(SHELL);
  if (!m) return null;
  const start = SHELL.indexOf('{', m.index + m[0].length);
  let depth = 0;
  for (let i = start; i < SHELL.length; i += 1) {
    if (SHELL[i] === '{') depth += 1;
    else if (SHELL[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        return [...SHELL.slice(start, i).matchAll(/([a-zA-Z_][\w]*)\s*:/g)].map((k) => k[1]);
      }
    }
  }
  return null;
};

// The engine names a part two ways: `add('<id>', …)` for the standing plan
// dimensions and a literal `id: '<id>'` for the phase cues. Both reach the
// same rows, so both have to be covered.
const emittedIds = () => [...new Set([
  ...[...ENGINE.matchAll(/add\('([a-z-]+)'/g)].map((m) => m[1]),
  ...[...ENGINE.matchAll(/id: '([a-z]+)'/g)].map((m) => m[1]),
])];

describe('one map turns engine ids into host copy', () => {
  // PREMISE FIRST. Both halves below are regex censuses over source text, and
  // a regex that matches nothing passes every assertion built on it. This is
  // the failure that let a corpus sweep in this same repo scan an empty list
  // and report clean while an offender sat in it.
  test('(premise) both censuses actually found something', () => {
    const keys = areaLabelKeys();
    // No message argument: this repo's jest `expect` takes exactly one, and
    // passing a label the way Playwright allows throws before it asserts.
    expect(keys).not.toBeNull();
    expect(keys.length).toBeGreaterThanOrEqual(15);
    expect(emittedIds().length).toBeGreaterThanOrEqual(10);
  });

  test('every id the engine can emit has host copy', () => {
    const keys = new Set(areaLabelKeys());
    const missing = emittedIds().filter((id) => !keys.has(id) && id !== 'ros-next');
    // `ros-next` is excluded by name, not by accident: it ships its own
    // `label`, so it never reaches the lookup.
    expect(missing).toEqual([]);
  });

  test('THE POINT: there is exactly one such map in the shell', () => {
    // The fallback expression is the map's signature — it is what a lookup
    // does when it misses, and a second map means a second fallback.
    // Matches both the bare `id.charAt(0)` form and the `String(id).charAt(0)`
    // form — the deleted copy used the first and the survivor uses the second,
    // and a regex that only knew one of them read 0 and failed for the wrong
    // reason the first time this gate ran.
    const fallbacks = SHELL.match(/(?:String\()?id\)?\.charAt\(0\)\.toUpperCase\(\)/g) || [];
    expect(fallbacks.length).toBe(1);

    // And named from the other direction, so a copy written WITHOUT the
    // fallback still fails: `venueaddress` is a key no other kind of object in
    // this shell carries.
    const maps = SHELL.match(/venueaddress\s*:/g) || [];
    expect(maps.length).toBe(1);
  });
});
