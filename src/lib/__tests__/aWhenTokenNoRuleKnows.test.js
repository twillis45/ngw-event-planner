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
// WHAT THIS DOES NOT CLAIM. An empty bin does not mean every row reaches a
// host — the BY RULE bin is large and where those rows surface is a separate
// question. It means no row is being dropped for a reason nobody chose.
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
    expect(rows.length).toBeGreaterThan(700);
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

  test('the day-after rows really are a POPULATED bin, not an empty rule', () => {
    // If `T0 +Nd` ever stopped matching, the guard above would go quiet and
    // fourteen rows would move into a bin this test says is empty. This holds
    // the rule itself honest.
    const after = everyRow().filter((r) => /^T0\s*[+-]\s*\d+\s*d\b/i.test(r.when));
    expect(after.length).toBeGreaterThanOrEqual(14);
    for (const r of after) expect(classify(r.when)).toBe('by-rule');
    // Housewarming's morning-after row was the corpus's only dialect spelling
    // (`T+1 morning`) and is now in this bin with the rest.
    expect(after.some((r) => r.type === 'Housewarming')).toBe(true);
  });

  test('and so is the pre-day bin — much the largest of the three', () => {
    const before = everyRow().filter((r) => /^T-\d+d/i.test(r.when));
    expect(before.length).toBeGreaterThanOrEqual(70);
    for (const r of before) expect(classify(r.when)).toBe('by-rule');
  });
});
