// ─── THE RULE THE DISSENT SAID HAD NO INSTRUMENT ───────────────────────────
//
// Board ruling 2026-09-03, step 1: "a behavior claim needs an e2e; a
// source-text gate is a tripwire and is never cited as behavior coverage."
//
// The verification-honesty seat dissented that this is unenforced prose —
// nothing fails if someone reaches for a text gate tomorrow. It was right, and
// it was right FAST: the census published "35 hostv2 text gates", and within
// the same session the number was 36, because seamRunsInCi.test.js was added
// and nobody noticed the count move. A rule that cannot survive one session is
// a preference.
//
// So this is a RATCHET, not a ban. Adding a text gate is still allowed — it
// just cannot happen silently. Bump the number here, in the same commit, and
// say why the claim could not be an e2e. That is the whole enforcement: the
// choice becomes deliberate and reviewable.
//
// WHY A TEXT GATE IS THE RIGHT INSTRUMENT FOR THIS TEST, given what it polices:
// the claim here is about the CONTENTS OF THE REPO — how many files match a
// pattern. Reading files is direct evidence of that, not a proxy for it. The
// census's distinction is that text is wrong when it stands in for BEHAVIOR.
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..', '..');

// ── THE BASELINE ───────────────────────────────────────────────────────────
// Raise this ONLY with a line below saying what was added and why an e2e could
// not carry the claim. Lowering it needs no ceremony — that is the direction
// the ratchet wants to go.
//
//  36  2026-09-03  baseline at the ruling. 35 in the census + seamRunsInCi
//                  (which asserts checks.yml declares the vitest step — a
//                  claim about file content, so text IS the direct evidence).
const MAX_HOSTV2_TEXT_GATES = 36;

const walk = (d, out = []) => {
  if (!fs.existsSync(d)) return out;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
};

// THIS FILE EXCLUDES ITSELF, and it found that out the hard way: the first run
// reported 37 against a baseline of 36 because the ratchet reads files and says
// "hostv2", so it counted itself. That is a good sign — the sweep is real — but
// a meta-gate ON the gates is not one OF them.
//
// Excluded by exact path, not by a name pattern: a pattern like /ratchet/ would
// be a hole anyone could step through by naming a file well.
const SELF = path.join(ROOT, 'src', 'lib', '__tests__', 'textGateRatchet.test.js');

const hostv2TextGates = () => walk(path.join(ROOT, 'src'))
  .filter((f) => f.endsWith('.test.js'))
  .filter((f) => f !== SELF)
  .filter((f) => {
    const s = fs.readFileSync(f, 'utf8');
    return s.includes('readFileSync') && s.includes('hostv2');
  });

describe('text gates on hostv2 do not grow silently', () => {
  test('the sweep finds the known population — the probe is real', () => {
    // A broken sweep returning 0 would pass the ratchet forever.
    expect(hostv2TextGates().length).toBeGreaterThan(20);
  });

  test('no new source-text gate on hostv2 without bumping the baseline', () => {
    const found = hostv2TextGates().map((f) => path.relative(ROOT, f));
    if (found.length > MAX_HOSTV2_TEXT_GATES) {
      // Name them, so the author does not have to go hunting.
      throw new Error(
        `${found.length} hostv2 text gates, baseline ${MAX_HOSTV2_TEXT_GATES}.\n`
        + 'jest CANNOT execute hostv2, so these cannot catch a parse error or a\n'
        + 'runtime composition. If the new one makes a BEHAVIOR claim, write an\n'
        + 'e2e in hostv2/e2e/ instead. If it genuinely asserts file CONTENT,\n'
        + 'raise MAX_HOSTV2_TEXT_GATES and say why in the log above it.\n\n'
        + found.join('\n'),
      );
    }
    expect(found.length).toBeLessThanOrEqual(MAX_HOSTV2_TEXT_GATES);
  });

  test('the seam exists, so a text gate is never the ONLY option', () => {
    // The ratchet is only fair while an alternative is actually available.
    const seam = path.join(ROOT, 'hostv2', 'test');
    expect(fs.existsSync(seam)).toBe(true);
    expect(walk(seam).filter((f) => f.endsWith('.test.mjs')).length).toBeGreaterThan(0);
  });
});
