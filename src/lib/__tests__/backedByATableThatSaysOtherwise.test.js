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
  SOURCING_TIERS, CANONICAL_PROTEIN_PRICES, comparableRows, rowBreadth, SOURCING_TIERS_PROVENANCE,
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
// A CHANNEL RATIO NEEDS BOTH SIDES. `fryfish` and `crawfish` (2026-09-26) carry
// `grocery` only — a butcher does not sell live crawfish by the sack and Costco
// does not stock whiting or porgy, and no source was found for either, so those
// tiers are deliberately absent rather than invented. A row missing a side
// cannot contribute a ratio; including it crashed on destructuring undefined.
// Every derivation below therefore runs over the rows that HAVE both.
const pairs = comparableRows;
const BASES = {
  meanOfRatios: (ch) => mean(pairs(ch).map((p) => mid(p[ch]) / mid(p.butcher))),
  ratioOfMeans: (ch) => mean(pairs(ch).map((p) => mid(p[ch])))
                      / mean(pairs(ch).map((p) => mid(p.butcher))),
  medianOfRatios: (ch) => {
    const s = pairs(ch).map((p) => mid(p[ch]) / mid(p.butcher)).sort((a, b) => a - b);
    const h = s.length / 2;
    return s.length % 2 ? s[Math.floor(h)] : (s[h - 1] + s[h]) / 2;
  },
  loBounds: (ch) => mean(pairs(ch).map((p) => p[ch][0]))
                  / mean(pairs(ch).map((p) => p.butcher[0])),
  hiBounds: (ch) => mean(pairs(ch).map((p) => p[ch][1]))
                  / mean(pairs(ch).map((p) => p.butcher[1])),
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

// ── BREADTH AGAINST SOURCES, FROZEN ────────────────────────────────────────
//
// `seafood` priced NINE species — crawfish, crab, lobster, oyster, scallop,
// salmon and three fish words — from ONE citation, and that citation was a
// Costco SHRIMP guide. It was wrong by 2x on every row anyone measured, and
// nothing in this repo could see it, because no check related how MUCH a row
// claims to price to how much evidence stands behind it.
//
// WHY THIS IS A CENSUS AND NOT A THRESHOLD. The obvious gate is "no row may
// span more than N terms on one source." It does not work: `sausage` spans 8
// on one source and is FINE, because every sausage really does cost about the
// same, while `seafood` spanning 9 was not fine, because whiting and Chilean
// sea bass do not. Breadth alone cannot tell those apart, so a threshold would
// be a proxy metric — the exact shape the 2026-09-25 board rejected in the
// research ratchet — and it would license the next 9-term row at N=9.
//
// So this pins the actual pairs. It cannot be satisfied by refactoring: the
// only way to lower a row's breadth is to genuinely narrow its regex, and the
// only way to raise its source count is to add a real URL. Widening a row or
// adding a broad one CHANGES THIS TABLE, in the diff, where a reviewer sees
// the ratio and has to defend it.
//
// The four rows with breadth >= 6 on a single source are named, not hidden.
// They are not claimed to be correct — they are claimed to be KNOWN.
describe('how much each row claims to price, against how much backs it', () => {
  test('breadth and source count are what they were, row by row', () => {
    const census = Object.fromEntries(
      CANONICAL_PROTEIN_PRICES.map((p) => [p.key, `${rowBreadth(p)} terms / ${p.sources.length} src`]),
    );
    expect(census).toEqual({
      ribs:     '5 terms / 2 src',
      brisket:  '1 terms / 2 src',
      chicken:  '6 terms / 1 src',   // broad, single-sourced — UNMEASURED
      sausage:  '8 terms / 1 src',   // broad, single-sourced — UNMEASURED
      beef:     '7 terms / 2 src',
      pork:     '6 terms / 1 src',   // broad, single-sourced — UNMEASURED
      shrimp:   '2 terms / 1 src',
      fryfish:  '8 terms / 2 src',   // split out of seafood 2026-09-26, fetched
      crawfish: '3 terms / 3 src',   // split out of seafood 2026-09-26, fetched
      seafood:  '9 terms / 1 src',   // STILL the shrimp page, for crab/lobster/
                                     // oyster/clam/mussel/scallop/salmon. The
                                     // measured species came out; these did not,
                                     // because nobody has priced them.
      turkey:   '1 terms / 1 src',
      lamb:     '3 terms / 1 src',
    });
  });

  test('every row carries at least one real source, whatever its breadth', () => {
    // The floor. Breadth is a judgment; having ANY evidence is not.
    for (const p of CANONICAL_PROTEIN_PRICES) {
      expect(p.sources.length).toBeGreaterThan(0);
      for (const u of p.sources) expect(u).toMatch(/^https:\/\//);
    }
  });
});

describe('(premise) the table and the factors the claim was made about', () => {
  test('(premise) CANONICAL_PROTEIN_PRICES still carries 12 URL-bearing rows, 10 of them full', () => {
    // 10 -> 12 on 2026-09-26: `seafood` priced eleven species off one Costco
    // SHRIMP page, so `fryfish` and `crawfish` were split out with their own
    // fetched sources. Both carry `grocery` ONLY, on purpose — see the note on
    // `pairs` above. EVERY row still carries a real https source, which is the
    // property this premise exists to hold; the per-channel completeness check
    // now applies to the rows that claim a channel.
    expect(CANONICAL_PROTEIN_PRICES.length).toBe(12);
    expect(CANONICAL_PROTEIN_PRICES.filter((p) => p.butcher && p.costco && p.grocery).length).toBe(10);
    for (const p of CANONICAL_PROTEIN_PRICES) {
      expect(Array.isArray(p.grocery) && p.grocery.length === 2).toBe(true);
      for (const ch of ['butcher', 'costco', 'grocery']) {
        if (p[ch] === undefined) continue;
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
