// ─── A FRESHNESS STAMP THAT IS OLDER THAN ITS DATA IS THE DEFECT ────────────
//
// The shopping hero read "est. prices Jan 2026" from `PRICE_TABLE_META.asOf`, a
// hardcoded constant describing a FALLBACK protein table rather than the rows on
// screen. Measured 2026-09-24 over the 533 dated purchase rows the numbers
// actually come from: earliest 2026-08-14, latest 2026-09-17, and ZERO older
// than the stamp. Every priced row was newer than the date beside it.
//
// The fix derives the label from the rendered rows (src/lib/priceVintage.js), so
// the label and the data are one fact. This guards the three ways that can rot:
// the derivation itself, the corpus staying datable, and the host shell not
// quietly reverting to a constant.
import fs from 'fs';
import path from 'path';
import { priceVintage, formatVintage } from '../priceVintage';
import { PRICE_TABLE_META } from '../sourcing';
import { ALL_PLAYBOOKS, playbookFoodPlan } from '../playbooks';

const row = (lastVerified, extra) => ({
  costProvenance: lastVerified ? { lastVerified } : null, ...extra,
});

describe('the derivation', () => {
  test('OLDEST wins, not newest — the label must be true of every row', () => {
    // With 529 rows in August and 4 in September, "Sep 2026" overclaims for 529
    // of them. "Aug 2026" is true of all. This is the whole argument for oldest,
    // so it is the first thing pinned.
    const v = priceVintage([row('2026-09-17'), row('2026-08-14'), row('2026-09-01')]);
    expect(`${v.asOf} → ${v.label}`).toBe('2026-08-14 → Aug 2026');
  });

  test('NO DATED ROW MEANS NO STAMP — never a fallback constant', () => {
    // The failure this whole file exists for: an old constant standing in for a
    // measurement. Returning null is what lets the surface render nothing.
    expect(priceVintage([row(null), row(null)])).toBeNull();
    expect(priceVintage([])).toBeNull();
    expect(priceVintage(undefined)).toBeNull();
  });

  test('a SKIPPED row is not a claim about what the host is reading', () => {
    // Skipped rows are off the list. If the oldest date belongs to one of them,
    // honouring it would age the stamp for a row nobody can see.
    const v = priceVintage([row('2026-08-14', { skipped: true }), row('2026-09-17')]);
    expect(v.asOf).toBe('2026-09-17');
  });

  test('undated rows are COUNTED, not hidden', () => {
    // The old constant made partial coverage invisible. PTA / Booster Fundraiser
    // renders one dated row against nine undated, and a caller has to be able to
    // see that rather than discover it later.
    const v = priceVintage([row('2026-08-14'), row(null), row(null)]);
    expect(`${v.dated} dated / ${v.undated} undated`).toBe('1 dated / 2 undated');
  });

  test('a junk date is not a date', () => {
    expect(priceVintage([row('soon'), row('2026'), row('')])).toBeNull();
  });

  test('the formatter does not roll back a month across UTC', () => {
    // `new Date('2026-01')` parses as UTC and lands in December in every western
    // timezone. The original constant's own comment warned about this; keeping
    // one formatter means the warning only has to be honoured once.
    expect(formatVintage('2026-01')).toBe('Jan 2026');
    expect(formatVintage('2026-01-04')).toBe('Jan 2026');
    expect(formatVintage('')).toBe('');
  });
});

describe('THE DEFECT ITSELF, re-proved against the live corpus', () => {
  const constantIso = `${PRICE_TABLE_META.asOf}-01`;
  const plan = (type) => playbookFoodPlan({
    id: 'x', type, guestCount: 30, guestCountLocked: true, guestEstimate: 30,
    foodChoices: {}, foodLocked: {}, foodSkip: {},
  }) || {};

  test('the constant the stamp used to read is OLDER than every dated row', () => {
    // If this ever goes green-by-accident — because someone bumped `asOf` — the
    // test below still holds the real line. This one records WHY the change was
    // made, in numbers, so a reader does not have to take the comment on trust.
    const dates = [];
    for (const pb of ALL_PLAYBOOKS) {
      for (const r of (pb.purchases || [])) {
        const d = r.costProvenance && r.costProvenance.lastVerified;
        if (d) dates.push(d);
      }
    }
    dates.sort();
    const older = dates.filter((d) => d < constantIso).length;
    expect(`${dates.length} dated rows, earliest ${dates[0]}, older than ${PRICE_TABLE_META.asOf}: ${older}`)
      // 533 until 2026-09-24, when repast's four bundled food lines became
      // eleven. The seven new rows inherit their parent's costProvenance
      // verbatim, `lastVerified` included, so the row COUNT moved and the two
      // facts this test actually guards — the earliest date, and that nothing
      // predates the old constant — did not.
      .toBe(`540 dated rows, earliest 2026-08-14, older than 2026-01: 0`);
  });

  test('EVERY playbook now derives a stamp its own rows can stand behind', () => {
    // The behaviour check. A derivation that parses but returns the same answer
    // everywhere regardless of input would be the constant with extra steps.
    const labels = {}; const noStamp = []; const notNewer = [];
    for (const pb of ALL_PLAYBOOKS) {
      const v = priceVintage(plan(pb.type).list);
      if (!v) { noStamp.push(pb.type); continue; }
      labels[v.label] = (labels[v.label] || 0) + 1;
      // The point of the fix, per playbook rather than in aggregate: every one
      // now stamps a date NEWER than the constant it used to show.
      if (!(v.asOf > constantIso)) notNewer.push(`${pb.type} (${v.asOf})`);
    }
    expect(notNewer).toEqual([]);
    expect(labels).toEqual({ 'Aug 2026': 43 });
    // Two playbooks have no researched price row at all. They previously showed
    // a confident "Jan 2026" over nothing; they now show no stamp. Named, so
    // that if one gains a priced row this count moves WITH a reason.
    expect(noStamp.sort()).toEqual(['Client Dinner', 'Fundraiser / Gala']);
  });

});

describe('the host shell does not go back to a constant', () => {
  // Line-anchored, not a comment-stripping pass: this repo has already been bitten
  // by a stripper eating 60% of a file because a `//` comment contained `/*`.
  const SRC = fs.readFileSync(path.join(__dirname, '../../../hostv2/src/HostShellV2.jsx'), 'utf8');

  test('it imports the derivation', () => {
    expect(SRC).toMatch(/^\s*import\s*\{\s*priceVintage\s*\}\s*from\s*['"]@app\/lib\/priceVintage['"]/m);
  });

  test('THE REGRESSION: no module-scope PRICE_VINTAGE constant, and no import of the price table', () => {
    // Both halves of the old code. The declaration is what made the label a
    // constant; the import is what made it the WRONG constant.
    expect(SRC).not.toMatch(/^\s*const\s+PRICE_VINTAGE\s*=/m);
    expect(SRC).not.toMatch(/^\s*import\s*\{[^}]*\bPRICE_TABLE_META\b[^}]*\}\s*from/m);
  });

  test('and the stamp renders the derived label', () => {
    // LOOSENED 2026-09-24, deliberately, and only along the axis that is not
    // this test's job. It pinned the exact concatenation
    // `est. prices ${fVintage.label}`, so it failed the moment the label was
    // wrapped to keep "Aug 2026" from breaking across two lines — a typographic
    // change that cannot reintroduce a constant.
    //
    // What this file guards is that the month is DERIVED, never hardcoded, and
    // that property is unchanged: the stamp's own text must still be followed
    // immediately by an interpolation that reads `fVintage.label`. Hardcode the
    // month and there is no `${` to match; read a constant instead and the name
    // does not appear. The formatting inside the braces is free.
    expect(SRC).toMatch(/est\. prices \$\{[^}]*\bfVintage\.label\b/);
  });
});
