// ── HOSTS WERE READING "T-4d" ───────────────────────────────────────────────
//
// The review board's Grandmother seat was asked whether "lock" was jargon. It
// said the word it actually stumbled on was not "lock" at all:
//
//     "Final headcount not locked by T-4d"
//
// `{r.trigger}` renders verbatim in the risks sheet (HostShellV2), and
// `r.mitigation` renders straight under it, so trade notation was reaching the
// host unprocessed in 106 display strings across 36 playbooks. UX_06's
// Time-Relative Language table already specifies plain wording; nothing in the
// playbook corpus honoured it.
//
// THE DISTINCTION THIS TEST EXISTS TO PROTECT. `when` and `buyAt` are NOT
// display copy — they are parsed for lead-time arithmetic by taskLead.js:83,
// knowledge/timingProvenance.js:200 and playbooks/index.js:1380. Rewriting
// those to prose would silently break scheduling while looking like a copy
// improvement. So the rule is per-field, not per-file: prose fields must be
// free of the notation, and the parsed fields must KEEP it.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '../playbooks/data');
const FILES = fs.readdirSync(DIR).filter((f) => f.endsWith('.js'));

const DISPLAY = /(trigger|mitigation|note|rationale|why):\s*'([^']*)'/g;
const PARSED = /(when|buyAt):\s*'([^']*)'/g;
const NOTATION = /\bT-?\d+\s*d?\b/;

const scan = (re) => {
  const found = [];
  for (const f of FILES) {
    const src = fs.readFileSync(path.join(DIR, f), 'utf8');
    for (const line of src.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
      let m;
      const r = new RegExp(re.source, 'g');
      while ((m = r.exec(line))) {
        if (NOTATION.test(m[2])) found.push({ file: f, field: m[1], text: m[2].slice(0, 80) });
      }
    }
  }
  return found;
};

describe('playbook time notation', () => {
  test('no host-visible playbook string shows T-minus notation', () => {
    const leaks = scan(DISPLAY);
    expect({ count: leaks.length, sample: leaks.slice(0, 5) })
      .toEqual({ count: 0, sample: [] });
  });

  test('the PARSED timing fields still carry it (guard against a blanket sweep)', () => {
    // If a future cleanup "fixes" these too, lead-time maths goes quiet-wrong
    // rather than loud-wrong. This is also the premise guard for the test
    // above: it proves the scanner can still see notation when it is present,
    // so a zero result up there means absence, not a broken regex.
    const kept = scan(PARSED);
    expect(kept.length).toBeGreaterThan(500);
  });

  test('the substitutions left no doubled article or stutter behind', () => {
    // "the T-1d grocery run" is adjectival; a naive swap yields "the the day
    // before grocery run". "~1 week out (a week out)" was a gloss OF the
    // notation and became a stutter once the notation was words.
    const bad = [];
    for (const f of FILES) {
      const src = fs.readFileSync(path.join(DIR, f), 'utf8');
      let m;
      const r = new RegExp(DISPLAY.source, 'g');
      while ((m = r.exec(src))) {
        const t = m[2];
        if (/\bthe the\b|\bby the day before\b|\bat the day before\b/.test(t)
            || /\b(?:a|\d+)\s*(?:day|days|week|weeks|month|months) out\s*\((?:a|\d+)\s*(?:day|days|week|weeks|month|months) out\)/.test(t)) {
          bad.push({ file: f, text: t.slice(0, 90) });
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
