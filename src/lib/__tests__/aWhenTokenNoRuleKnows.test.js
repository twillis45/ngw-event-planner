// ─── A `when` TOKEN NO RULE KNOWS ────────────────────────────────────────────
//
// This session fixed the same defect three times: a schedule row authored with
// a `when` token the parser does not recognize, which returns null, is dropped
// by every reader, and reaches no host. `End`. `End +30m`. `after the toast`.
// `halftime` — that last one sat in Watch Party's own note as "DISCOVERED, OUT
// OF SCOPE, NOT FIXED" for ten days, because nothing failed when it was written.
//
// EVERY ONE WAS FOUND BY ACCIDENT. Reading a playbook for something else,
// noticing a row on no screen. That is not a process, and the corpus is 30
// playbooks deep — the next one would have been found the same way, or not
// at all.
//
// So this is the guard that makes the class self-policing. It enumerates every
// `when` token in every schedule block and sorts each into one of three bins:
//
//   RESOLVES    the row lands on the day-of board at a known minute
//   BY RULE     the parser recognizes it and deliberately keeps it off that
//               board — pre-day prep (`T-7d`), post-event follow-ups
//               (`T0 +1d`), `during`/`ongoing`, multi-day `Day N`
//   UNKNOWN     nothing recognizes it; it falls off the end of the parser
//
// THE THIRD BIN MUST BE EMPTY, and today it is. The distinction between BY RULE
// and UNKNOWN is the whole point: both return null, both drop the row, and they
// look identical from the outside. One is a decision with a comment explaining
// it. The other is a typo nobody has noticed yet.
//
// WHAT THIS DID NOT CLAIM, AND WHAT THEN HAPPENED. As first written this guard
// was careful to say that an empty UNKNOWN bin does not mean every row reaches a
// host: the BY RULE bin held 98 rows, and where those surfaced was a separate
// question. Asking it turned out to be the bigger finding — they surfaced
// nowhere, along with 152 rows in a `purchasing` block no function read. All 250
// were retired on 2026-09-23 once it was established that `tasks[]` and
// `purchases[]` already carried their content, in better form.
//
// So the BY RULE bins for `T-Nd` and `T0 +Nd` are now asserted EMPTY rather than
// populated, and the calibration test is what keeps that honest — it proves the
// classifier still recognises those tokens, so an empty bin is a fact about the
// corpus rather than a broken predicate.
import { ALL_PLAYBOOKS, rosWhenOffset, rosEndDelta, rosAfterMoment } from '../playbooks';

// The tokens the parser recognizes and deliberately keeps off the day-of board.
// Each mirrors a guard in rosWhenOffset; the comment there is the reason.
const EXCLUDED_BY_RULE = [
  { re: /^T-\d+d/i, why: 'pre-day prep and shopping — not a day-of moment' },
  { re: /during|ongoing/i, why: 'runs all through the day — not a point in time' },
  { re: /^T0\s*[+-]\s*\d+\s*d\b/i, why: 'post-event follow-up — days after, not hours' },
  { re: /^Day\s+\d{1,2}\b/i, why: 'multi-day agenda vocabulary, resolved by its own pass' },
];

const classify = (when) => {
  const w = String(when || '').trim();
  if (!w) return 'blank';
  if (rosWhenOffset(w) !== null) return 'resolves';
  if (rosEndDelta(w) !== null || rosAfterMoment(w) !== null) return 'anchored';
  if (EXCLUDED_BY_RULE.some((r) => r.re.test(w))) return 'by-rule';
  return 'unknown';
};

const everyRow = () => {
  const out = [];
  for (const pb of ALL_PLAYBOOKS) {
    const sch = pb.schedules || {};
    for (const key of Object.keys(sch)) {
      if (!Array.isArray(sch[key])) continue;
      for (const row of sch[key]) {
        if (row && row.when != null) out.push({ type: pb.type, key, when: String(row.when).trim() });
      }
    }
  }
  return out;
};

describe('no schedule row is dropped for a reason nobody chose', () => {
  test('(premise) the sweep actually reaches the corpus, not an empty list', () => {
    // An assertion over nothing passes. This is the guard on the guard.
    const rows = everyRow();
    // Was >700 before the 2026-09-23 retirement took 250 rows out; 674 now.
    expect(rows.length).toBeGreaterThan(600);
    expect(new Set(rows.map((r) => r.type)).size).toBeGreaterThan(25);
    expect(new Set(rows.map((r) => r.key))).toContain('cleanup');
  });

  test('(premise) the classifier can tell the three bins apart', () => {
    // Calibrated against tokens whose bin is not in question, so a classifier
    // that silently collapsed to one answer could not pass the test below.
    expect(classify('T0 +1:45')).toBe('resolves');
    expect(classify('T0 morning')).toBe('resolves');
    expect(classify('End +30m')).toBe('anchored');
    expect(classify('after the cake')).toBe('anchored');
    expect(classify('T-7d')).toBe('by-rule');
    expect(classify('T0 +1d')).toBe('by-rule');
    expect(classify('during')).toBe('by-rule');
    // The two that were real defects, and the shape of the next one.
    expect(classify('halftime')).toBe('unknown');
    expect(classify('T+1 morning')).toBe('unknown');
    expect(classify('after the parade')).toBe('anchored'); // parseable, may still find no beat
  });

  test('THE GUARD: not one token in the corpus is unrecognized', () => {
    // Set at ZERO on purpose. A ratchet with slack in it invites the next row
    // to use the slack; there is nothing legitimate in this bin.
    const bad = everyRow().filter((r) => classify(r.when) === 'unknown');
    // Named, not counted — a failure has to say WHICH row, or the next person
    // has to rebuild this sweep by hand to find out.
    expect(bad.map((r) => `${r.type}/${r.key}: ${JSON.stringify(r.when)}`)).toEqual([]);
  });

  test('…and no row authors a blank `when`, which would resolve to nothing just as quietly', () => {
    expect(everyRow().filter((r) => classify(r.when) === 'blank')).toEqual([]);
  });

  test('THE BY-RULE BINS ARE NOW EMPTY TOO, because those rows were retired', () => {
    // These two bins held 98 rows when this guard was written, and the guard
    // asserted them POPULATED so a regex that stopped matching could not empty
    // the UNKNOWN bin by accident. That reasoning is now inverted: the rows were
    // retired (2026-09-23) once it was established they reached no host and that
    // `tasks[]` and `purchases[]` already carried their content, better.
    //
    // So the assertion flips to zero — and the calibration test above is what
    // keeps it honest, because it proves `classify` still RECOGNISES these
    // tokens. An empty bin because nothing is authored is a fact; an empty bin
    // because the classifier broke would fail there, not here.
    expect(everyRow().filter((r) => /^T-\d+d/i.test(r.when))).toEqual([]);
    expect(everyRow().filter((r) => /^T0\s*[+-]\s*\d+\s*d\b/i.test(r.when))).toEqual([]);
  });

  test('…and `purchasing`, the block nothing read, is gone from every playbook', () => {
    // 152 rows across 45 playbooks, in a key that was not in ROS_SCHEDULE_KINDS
    // and that no other function named. Asserted by ABSENCE OF THE KEY, not by a
    // row count, so re-adding an empty block to "keep the shape" also fails.
    const withBlock = ALL_PLAYBOOKS
      .filter((pb) => pb.schedules && 'purchasing' in pb.schedules)
      .map((pb) => pb.type);
    expect(withBlock).toEqual([]);
  });

  test('what REMAINS is a day sheet that renders almost all of itself', () => {
    // The end state the retirement bought, stated as a fact rather than implied:
    // every schedule row left in the corpus either lands on the day board, runs
    // all through the day, or is gated to a choice this bare event has not made.
    const rows = everyRow();
    expect(rows.length).toBeGreaterThan(600);
    for (const r of rows) expect(['resolves', 'anchored', 'by-rule']).toContain(classify(r.when));
    // `Day N` is the one by-rule form still authored — the multi-day agendas.
    const byRule = rows.filter((r) => classify(r.when) === 'by-rule');
    for (const r of byRule) expect(r.when).toMatch(/^(Day\s+\d|during|ongoing)/i);
  });
});
