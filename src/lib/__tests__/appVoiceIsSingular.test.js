// ── THE APP HAD TWO SELVES ──────────────────────────────────────────────────
//
// Review board ruling, 2026-08-07. Asked whether the app should say "I" or
// "we", all three seats converged on ONE self, and the Grandmother seat cast
// the deciding vote: "a single helper is a person I can trust; 'we' is a
// company, and I don't know how many people are reading my party."
//
// The evidence was not the raw count — that was ~4.5x overstated by comments
// and by host-voice draft copy. It was three places where a single expression
// rendered EITHER self depending on one boolean, e.g.
//     derived ? 'We pencilled the times — not you' : 'Want me to pencil in times?'
// That is not a style preference; it is the product's identity flipping on a
// flag.
//
// THE LICENSING RULE (Rafanelli's dissent, adopted as the guardrail): first
// person is licensed in exactly three cases — the app is acting on the host's
// behalf, admitting a limit, or offering its own recommendation. For a bare
// state report, use second person or no pronoun. `nextActionRenderer.js` is
// already the model; these engines have been migrated toward it.
//
// SCOPE, DELIBERATELY NARROW. This gates the four engines that are purely
// app-voice. It does NOT sweep the whole tree, because the majority of
// first-person copy in this codebase is the HOST's voice in drafts the app
// composes for them — doItForMe.js ("We're getting married and can't imagine
// the day without you"), InviteV2.jsx, the vendor interview questions, and
// picker options the host selects about themselves ("A house we rent"). All of
// that is correct and a blanket gate would wreck it. Widen this list only with
// a file that has been read and confirmed app-voice throughout.
const fs = require('fs');
const path = require('path');

const APP_VOICE_FILES = [
  'assembleRevealEngines.js',
  'workflowCompression.js',
  'disclosure.js',
  'decisionConfidence.js',
];

const STRING = /'((?:[^'\\\n]|\\')+)'|"([^"\\\n]+)"|`([^`\\\n]+)`/g;
const PLURAL_SELF = /\b(we|our|ours|us)\b/i;

const prose = (file) => {
  const src = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const out = [];
  src.split('\n').forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith('//') || t.startsWith('*')) return;
    let m;
    const re = new RegExp(STRING.source, 'g');
    while ((m = re.exec(line))) {
      const s = m[1] || m[2] || m[3];
      // Prose only: a bare identifier or path is not copy.
      if (s && s.includes(' ') && /[a-z]/.test(s)) out.push({ line: i + 1, text: s });
    }
  });
  return out;
};

describe('the app speaks as one self', () => {
  test.each(APP_VOICE_FILES)('%s carries no app-voice we/our/us', (file) => {
    const offenders = prose(file)
      .filter((s) => PLURAL_SELF.test(s.text))
      .map((s) => `${file}:${s.line} ${s.text.slice(0, 70)}`);
    expect({ file, pluralSelf: offenders }).toEqual({ file, pluralSelf: [] });
  });

  test('the scanner actually reads these files (premise check)', () => {
    // Without this, a broken path or regex would report four clean files and
    // the suite would look like it was enforcing something. That exact failure
    // produced ten dead tests earlier in this sprint.
    // Per-file counts vary a lot — disclosure.js is a small table with 4 prose
    // strings while assembleRevealEngines.js has 93 — so the floor is "this
    // file yielded something" plus a corpus-wide total that a broken path or
    // regex could not produce. (My first attempt asserted >20 everywhere and
    // failed honestly on disclosure.js, which is the check doing its job.)
    const counts = APP_VOICE_FILES.map((f) => ({ file: f, n: prose(f).length }));
    expect(counts.filter((c) => c.n === 0)).toEqual([]);
    expect(counts.reduce((a, c) => a + c.n, 0)).toBeGreaterThan(150);
  });

  test('the confidence label is a label, not an opinion', () => {
    // 'We think so' sat as the sibling of 'High confidence' in one ternary — an
    // opinion where its twin was a label. Both are labels now.
    const src = fs.readFileSync(path.join(__dirname, '../assembleRevealEngines.js'), 'utf8');
    expect(src).not.toMatch(/'We think so'/);
    expect(src).toMatch(/'Fairly confident'/);
  });

  test('the seating blocker no longer hardcodes the planner verb', () => {
    // decisionConfidence exports a persona COPY map whose `lock` verb is
    // "Settle it" for a host and "Lock" for a planner, and the ready_to_lock
    // branch correctly reads `c.lock`. The blocked branch 4 lines above it
    // hardcoded "Lock guest count first", leaking planner voice into a live
    // host session. It now names the act instead, per UX_06's CTA rule.
    const src = fs.readFileSync(path.join(__dirname, '../decisionConfidence.js'), 'utf8');
    expect(src).not.toMatch(/'Lock guest count first'/);
    expect(src).toMatch(/'Set the guest count first'/);
  });
});
