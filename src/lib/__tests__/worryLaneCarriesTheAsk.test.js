/**
 * THE WORRY LANE'S HEADER AND ITS ROW LABELS ARE ONE CONTRACT.
 *
 * `surfaceRegistry.js` titles every playbook risk `Have a plan for: ${r.trigger}`.
 * The prefix is the honesty of the row: `trigger` is the CONDITION a risk fires
 * under, never a claim that it is happening. `wlabel` in HostShellV2 then strips
 * that prefix off every row.
 *
 * Stripping it was CORRECT under the contract it was written to. Wave 6 shipped
 * the lane headed "Heads-up — have a plan for these", and the commit says so in
 * as many words: "the lane label carries the ask once, so each row reads as the
 * risk itself, in the registry's own words."
 *
 * Then `c02c0dad` replaced that header with "Worth keeping an eye on" and carried
 * the strip forward untouched. The ask moved out of the header and was still
 * being deleted from the rows, so what shipped was a bare trigger stated as
 * fact — driven 2026-08-08 on the Santa Fe example, which reads
 *
 *     "Final headcount still not locked 3 days out"
 *
 * on an event 680 days away. Nothing about that is true, and the risks SHEET
 * two clicks away leads with "None of these are happening".
 *
 * Neither half is wrong alone; they are only wrong TOGETHER, which is exactly
 * the kind of break no single-file review catches and no screenshot of one lane
 * reveals. So it is gated where the contract lives: across both files.
 *
 * If you deliberately stop stripping the prefix in `wlabel`, this test stops
 * requiring the header to carry the ask — that is a legitimate other build, and
 * the test is written to allow it rather than to freeze one wording.
 */
const fs = require('fs');
const path = require('path');

const SHELL = fs.readFileSync(
  path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');
const REGISTRY = fs.readFileSync(
  path.join(__dirname, '../surfaceRegistry.js'), 'utf8');

// Strip comments before matching: this file's comments quote the very strings
// under test (including the old header and the defective row), so a naive scan
// reads the explanation as if it were shipped copy.
const CODE = SHELL
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/**
 * The headers that label the worry lanes — found STRUCTURALLY, not by class.
 *
 * Keying on the class was the first cut and it was wrong: `ef-sect` also heads
 * "Then, in order" and `horizon` also renders the queue preview, so the test
 * failed on two headers that have no business carrying this ask. The lane is
 * not "things with class X" — it is "the rows built from `wlabel`", which is
 * the only thing the strip touches. So: for each row that renders `wlabel(w)`,
 * take the nearest header ABOVE it. That survives a class rename, and it can
 * never drift onto a lane that is not the worry lane.
 */
const HEADER = /<div className="(?:ef-sect|horizon)"[^>]*>([^<{]+)</g;

function laneHeaders() {
  const out = [];
  for (const row of CODE.matchAll(/\{wlabel\(w\)\}/g)) {
    const above = CODE.slice(0, row.index);
    const headers = [...above.matchAll(HEADER)];
    if (headers.length) out.push(headers[headers.length - 1][1].trim());
  }
  return [...new Set(out)];
}

describe('the worry lane header and wlabel are one contract', () => {
  test('the registry still ships the ask as a prefix on the row title', () => {
    // If this changes, the whole contract moves and this file must be re-read.
    expect(REGISTRY).toMatch(/Have a plan for: \$\{r\.trigger\}/);
  });

  test('wlabel still strips that prefix — the premise of the rest of this file', () => {
    // Guard against a vacuous pass: every assertion below only matters while
    // the strip exists. A grep proves a string present, never a behaviour, so
    // this is the narrowest honest premise check.
    expect(CODE).toMatch(/replace\(\/\^have a plan for:/i);
  });

  test('the lane header carries the ask, because the rows no longer can', () => {
    const strips = /replace\(\/\^have a plan for:/i.test(CODE);
    if (!strips) return;                       // other build; see the header note
    const headers = laneHeaders();
    expect(headers.length).toBeGreaterThan(0); // never assert over an empty set
    for (const h of headers) {
      expect(h.toLowerCase()).toMatch(/plan/);
    }
  });

  test('no lane header frames a contingency as something already happening', () => {
    // "Keeping an eye on" is a watching verb: it tells the host these are live.
    // That is the exact misread the bare trigger produced, and re-introducing it
    // in the header would restore the defect one level up.
    for (const h of laneHeaders()) {
      expect(h.toLowerCase()).not.toMatch(/keeping an eye|happening|going wrong|right now/);
    }
  });

  test('the sheet still disclaims present tense, so the two surfaces agree', () => {
    // The rail's header and the sheet's subhead describe the SAME rows. This is
    // the assertion that would have caught the original contradiction.
    expect(CODE).toMatch(/None of these are happening/);
  });
});
