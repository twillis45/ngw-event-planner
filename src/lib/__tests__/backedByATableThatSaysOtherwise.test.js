// ─── BACKED BY A TABLE THAT SAYS OTHERWISE ───────────────────────────────────
//
// MEASURED 2026-09-19 in src/lib/sourcing.js, recomputing each channel factor
// from CANONICAL_PROTEIN_PRICES (n=10, every line carrying its own retail-guide
// URLs) the several ways the file's own data can honestly be read:
//
//     basis                        costco   grocery
//     mean of per-item ratios       0.706    1.064
//     ratio of the channel means    0.733    1.059
//     median of per-item ratios     0.690    1.048
//     ratio of the low bounds       0.740    1.083
//     ratio of the high bounds      0.730    1.046
//     SHIPPED                       0.85     1.18
//
// BEFORE: the comment above SOURCING_TIERS said the grocery premium (+18%) was
//         "honestly backed by the raw per-channel data below". Not one basis
//         reproduces it — the closest lands 0.097 away on costco and 0.097 on
//         grocery, and the bases disagree with each other by 0.05 / 0.035.
// AFTER:  the claim of backing is withdrawn, the five bases are printed in the
//         file, and NO FACTOR MOVED. 1.0 / 0.85 / 1.18 still ship.
//
// WHY THE FIX IS A WITHDRAWAL AND NOT A NEW NUMBER. Two things had to both be
// true to move a shipped dollar-affecting factor, and neither is.
//   (1) The table supports five answers (costco 0.69-0.74, grocery 1.05-1.08)
//       and the withdrawn sentence never named a basis.
//   (2) POPULATION. playbooks/index.js#srcFactorFor applies these factors ONLY
//       to a protein line that resolves no per-tier range — exactly the lines
//       CANONICAL_PROTEIN_PRICES does not price. Measured across ALL_PLAYBOOKS
//       on a non-default tier: 6 authored, 32 covered by the table, 0 falling
//       through to the factor. The table is the COMPLEMENT of the population
//       these factors reach, so its arithmetic is an analogy, not a derivation.
//
// Locked here too, same defect shape one file over: getRushFactor's comment no
// longer attributes its premiums to "planner surveys + Wedding Wire / The Knot
// patterns" — two publishers with no page, date or figure, which the money
// provenance record already measured as unverifiable. Its three multipliers are
// byte-identical; only the attribution went.
import fs from 'fs';
import path from 'path';
import {
  SOURCING_TIERS, CANONICAL_PROTEIN_PRICES, SOURCING_TIERS_PROVENANCE,
} from '../sourcing';
import { getRushFactor, RUSH_FACTOR_PROVENANCE } from '../vendorEstimator';
import { isGroundedMoneyFactor } from '../budgetEstimator/moneyProvenance';

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
// Comment prose, with the `// ` gutter removed and wrapped lines rejoined, so a
// claim that spans two comment lines is still one sentence to a matcher.
const prose = (src) => src.split('\n')
  .filter((l) => /^\s*\/\//.test(l))
  .map((l) => l.replace(/^\s*\/\/ ?/, ''))
  .join(' ');

const SOURCING_SRC = read('sourcing.js');
const VENDOR_SRC = read('vendorEstimator.js');

const mid = ([lo, hi]) => (lo + hi) / 2;
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const BASES = {
  meanOfRatios: (ch) => mean(CANONICAL_PROTEIN_PRICES.map((p) => mid(p[ch]) / mid(p.butcher))),
  ratioOfMeans: (ch) => mean(CANONICAL_PROTEIN_PRICES.map((p) => mid(p[ch])))
                      / mean(CANONICAL_PROTEIN_PRICES.map((p) => mid(p.butcher))),
  medianOfRatios: (ch) => {
    const s = CANONICAL_PROTEIN_PRICES.map((p) => mid(p[ch]) / mid(p.butcher)).sort((a, b) => a - b);
    const h = s.length / 2;
    return s.length % 2 ? s[Math.floor(h)] : (s[h - 1] + s[h]) / 2;
  },
  loBounds: (ch) => mean(CANONICAL_PROTEIN_PRICES.map((p) => p[ch][0]))
                  / mean(CANONICAL_PROTEIN_PRICES.map((p) => p.butcher[0])),
  hiBounds: (ch) => mean(CANONICAL_PROTEIN_PRICES.map((p) => p[ch][1]))
                  / mean(CANONICAL_PROTEIN_PRICES.map((p) => p.butcher[1])),
};
const shippedFactor = (id) => SOURCING_TIERS.find((t) => t.id === id).factor;
const derivations = (ch) => Object.values(BASES).map((f) => f(ch));

// A CLAIM OF BACKING, present tense: "X is/are (honestly) backed/supported/
// justified by Y". Matched on prose, not on the raw file, so the `// ` gutter
// and a line wrap cannot hide it.
const CLAIMS_BACKING = (text) => /\b(is|are)\s+(honestly\s+)?(backed|supported|justified|borne out)\s+by\b/i
  .test(text);

// ─── (premise) the defect material is still here ────────────────────────────
//
// Every test below describes a specific table and a specific pair of shipped
// numbers. If either is gone, this file is guarding a story rather than code.

describe('(premise) the table and the factors the claim was made about', () => {
  test('(premise) CANONICAL_PROTEIN_PRICES still carries 10 URL-bearing per-channel rows', () => {
    expect(CANONICAL_PROTEIN_PRICES.length).toBe(10);
    for (const p of CANONICAL_PROTEIN_PRICES) {
      for (const ch of ['butcher', 'costco', 'grocery']) {
        expect(Array.isArray(p[ch]) && p[ch].length === 2).toBe(true);
      }
      expect(p.sources.length).toBeGreaterThan(0);
      for (const u of p.sources) expect(u).toMatch(/^https:\/\//);
    }
  });

  test('(premise) the shipped factors are still 0.85 / 1.18, and no basis reaches them', () => {
    expect(shippedFactor('butcher')).toBe(1.0);
    expect(shippedFactor('costco')).toBe(0.85);
    expect(shippedFactor('grocery')).toBe(1.18);

    for (const ch of ['costco', 'grocery']) {
      const gaps = derivations(ch).map((d) => Math.abs(d - shippedFactor(ch)));
      // The CLOSEST honest reading of the table is still nowhere near what ships.
      expect(Math.min(...gaps)).toBeGreaterThan(0.08);
    }
    // ...and the bases do not agree with each other either, which is the second
    // half of why no number could be moved on this evidence.
    const spread = (ch) => Math.max(...derivations(ch)) - Math.min(...derivations(ch));
    expect(spread('costco')).toBeGreaterThan(0.03);
    expect(spread('grocery')).toBeGreaterThan(0.02);
  });
});

// ─── THE DEFECT: a claim of backing the file's own arithmetic refutes ───────

describe('THE DEFECT — sourcing.js claimed a table backed a number the table does not produce', () => {
  test('no present-tense claim of backing survives anywhere in sourcing.js', () => {
    expect(CLAIMS_BACKING(prose(SOURCING_SRC))).toBe(false);
  });

  test('the withdrawn phrase appears only as quoted history, never as an assertion', () => {
    const text = prose(SOURCING_SRC);
    const hits = [...text.matchAll(/honestly backed by/gi)].map((m) => m.index);
    for (const i of hits) {
      const before = text.slice(Math.max(0, i - 140), i);
      expect(`context of quote at ${i}: ${/used to|withdraw/i.test(before) ? 'marked historical' : before}`)
        .toBe(`context of quote at ${i}: marked historical`);
    }
  });

  test('and the arithmetic that replaced the claim is in the file, not just in a test', () => {
    const text = prose(SOURCING_SRC);
    expect(text).toMatch(/EDITORIAL, NOT DERIVED/);
    for (const n of ['0.706', '1.064', '0.733', '1.059', '0.85', '1.18']) {
      expect(text).toContain(n);
    }
    // The population finding is the load-bearing half and must be stated too.
    expect(text).toMatch(/srcFactorFor/);
    expect(text).toMatch(/COMPLEMENT/i);
  });

  test('NO FACTOR MOVED — the fix is a withdrawal, not a re-pricing', () => {
    expect(SOURCING_TIERS.map((t) => t.factor)).toEqual([1.0, 0.85, 1.18]);
  });

  test('the record stays ungrounded, and now says which population the factor reaches', () => {
    expect(SOURCING_TIERS_PROVENANCE.tier).toBe('estimate');
    expect(SOURCING_TIERS_PROVENANCE.sources).toEqual([]);
    expect(isGroundedMoneyFactor(SOURCING_TIERS_PROVENANCE)).toBe(false);
    expect(SOURCING_TIERS_PROVENANCE.note).toMatch(/WRONG POPULATION/);
    expect(SOURCING_TIERS_PROVENANCE.note).toMatch(/0\.706/);
    // ...and it no longer offers "derive it from the table" as a route to
    // promotion, because the table prices the wrong lines.
    expect(SOURCING_TIERS_PROVENANCE.sufficientWhen).toMatch(/would NOT be enough/);
  });
});

// ─── THE SAME DEFECT SHAPE, ONE FILE OVER: an attribution that reads like a citation ─

describe('THE DEFECT — getRushFactor attributed its premiums to two publishers it never cited', () => {
  test('the publisher attribution is gone from the premium ladder', () => {
    const text = prose(VENDOR_SRC);
    expect(text).not.toMatch(/premiums\s*\(planner surveys/i);
    expect(text).not.toMatch(/Wedding ?Wire\s*\/\s*The Knot patterns/i);
    // What replaced it says what the ladder is.
    expect(text).toMatch(/TRADE HEURISTIC, NOT A CITATION/);
  });

  test('NO PREMIUM MOVED — only the attribution went', () => {
    const at = (days) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return getRushFactor(d.toISOString().slice(0, 10)).multiplier;
    };
    expect(at(10)).toBe(1.25);
    expect(at(45)).toBe(1.12);
    expect(at(90)).toBe(1.05);
    expect(at(300)).toBe(1);
    expect(RUSH_FACTOR_PROVENANCE.tier).toBe('trade-heuristic');
    expect(isGroundedMoneyFactor(RUSH_FACTOR_PROVENANCE)).toBe(false);
  });
});

// ─── NEGATIVE CONTROLS ──────────────────────────────────────────────────────

describe('negative controls — the checks above can fail, and do not fire on honest prose', () => {
  test('NEGATIVE CONTROL: the matcher fires on the exact sentence that was removed', () => {
    // If this ever goes false the defect test above is asserting nothing.
    const REMOVED = 'the grocery premium (+18%) is honestly backed by the raw per-channel '
                  + 'data below (grocery runs pricier per lb than butcher/Costco in '
                  + 'CANONICAL_PROTEIN_PRICES)';
    expect(CLAIMS_BACKING(REMOVED)).toBe(true);
    expect(/premiums\s*\(planner surveys/i.test('Industry-typical premiums (planner surveys + Wedding Wire / The Knot patterns):')).toBe(true);
  });

  test('NEGATIVE CONTROL: the same derivation DOES reproduce a factor when the data determines one', () => {
    // butcher is the baseline every ratio is taken against, so all five bases
    // must land on exactly 1.0 — which is exactly what ships. The method is not
    // rigged to disagree with the file; it agrees wherever the table decides.
    for (const d of derivations('butcher')) expect(d).toBeCloseTo(1.0, 10);
    expect(shippedFactor('butcher')).toBe(1.0);
  });

  test('NEGATIVE CONTROL: an honest citation that states its own gap is not flagged', () => {
    // NONPROTEIN_CHANNEL_FACTOR cites a real dated URL and ships 10% where that
    // source says 21%, saying so. That is the shape we want to keep, so the
    // matcher must leave it alone — this check is not a ban on citing things.
    const block = prose(SOURCING_SRC).match(/NON-protein groceries[\s\S]*?consumerreports[^\s]*/i);
    expect(block).not.toBeNull();
    expect(block[0]).toMatch(/consumerreports\.org/);
    expect(CLAIMS_BACKING(block[0])).toBe(false);
  });

  test('NEGATIVE CONTROL: naming the two publishers inside the withdrawal is still allowed', () => {
    // The fix is not a word ban. vendorEstimator.js must still be able to say
    // WHICH attribution was withdrawn, or the next reader re-adds it.
    const text = prose(VENDOR_SRC);
    expect(text).toMatch(/Wedding Wire/);
    expect(text).toMatch(/The Knot/);
    expect(text).toMatch(/withdrawn/i);
  });
});
