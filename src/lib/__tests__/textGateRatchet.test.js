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
// 36 -> 37 on 2026-09-18 for creationAddressCarries.test.js, with the reason
// this ratchet asks for: it asserts FILE CONTENT, not behavior. The claim is
// "no line in HostShellV2 re-derives 'is the venue set?' from `vf.name`" — a
// property of the source text, which is what a text gate can prove and a
// runtime test cannot. That distinction is not theoretical here: SIX copies of
// that rule existed, a behavior test only reaches the branches it renders, and
// the first fix reached exactly one of them.
//
// The BEHAVIOR half is not smuggled in. It lives in hostv2/e2e/ryanWay.spec.mjs,
// which drives creation and asserts no surface asks for a venue the plan
// already knows — with a negative control proving the ask still fires when
// there is genuinely no location.
// 37 -> 38 on 2026-09-18 for difmTruthfulness.test.js, with the reason this
// ratchet asks for: three of its four subjects are WRITES and CTA copy in a
// shell jest cannot execute (the reconfirm sweep's removed setTimeout staging,
// Skip writing thankYouSkipped rather than thankYouSent, and the draft sheet's
// unfilled-blank warning). Those are claims about the source, and a source
// assertion is the only thing that can hold them from here.
//
// The fourth subject — a drafted contact is never "silent" — is a real
// behavioural test against src/lib/vendorContact.js in the same file, and needs
// no shell text at all.
// 38 -> 39 on 2026-09-18 for choiceProvenance.test.js. THIRD bump in one day,
// which is worth naming rather than quietly adding: each was a shell WRITE or a
// shell LABEL, and jest cannot execute the shell. That is the ratchet working —
// it is making a real cost visible — not a loophole being leaned on.
//
// Of this file's 13 tests only 3 read shell text; the other 10 are genuine
// behaviour tests against src/lib/choiceProvenance.js, which is where the logic
// was deliberately put so it could be executed. The 3 assert the WIRING: that
// settleDecision builds its patch through the one write builder, that exactly
// one call site records an app pick, and that the settled card asks the
// accessor instead of asserting "Your call". Those are claims about the source,
// and no runtime test can make them — a behaviour test only reaches the
// branches it renders, which is exactly how six copies of the venue verdict
// survived a green suite earlier today.
// 39 -> 40 on 2026-09-18 for guestFacing.test.js. FOURTH bump in one day. The
// pattern is now the finding, not the exception: every one of the four was a
// claim about a hostv2 WRITE, LABEL or RENDER, and jest cannot execute hostv2.
// The ratchet is doing its job — making a real cost visible — but four in a day
// says the seam needs widening, not that the baseline should keep climbing.
// Logged in the tracker as its own item rather than absorbed silently again.
//
// This one guards the InviteV2 render that printed `event.parkingNotes`
// verbatim — the page GUESTS actually read, over a field that can hold the
// app's own bracketed template. The gate itself (guestFacing.js) is pure and
// fully behaviour-tested in the same file; only the "no surface reads it raw"
// sweep needs the shell's source.
// 40 -> 41 on 2026-09-18 for budgetIsSetOnce.test.js. FIFTH bump in one day, and
// the note above stands: the seam needs widening, logged as its own item. This
// one is not the shell-write case the other four were, though, and the
// distinction matters for whether the ratchet is being leaned on or used.
//
// 21 of its 22 tests are genuine behaviour against src/lib — the accessor itself,
// hostSpending, phaseProgress, taskEngine, budgetSwap, and the Reveal's rendered
// copy, all executed, with a negative control on each direction. Only the closing
// sweep reads source, and its claim is literally about source: "no engine keeps a
// private copy of the rule". Six did. Five of the six are library files a
// behaviour test could reach one branch of; the sixth is hostv2, and it is where
// the copy had drifted furthest — the fold and the editor it folds asked the same
// question two hundred lines apart, in different words. A behaviour test only
// reaches the branches it renders, which is exactly how six copies survived a
// green suite.
// 41 -> 42 on 2026-09-18 for calmNeverOverOverdue.test.js — a HOST-REPORTED
// defect ("Nothing needs you today. Not matching todos, have items overdue"),
// reproduced in jest against the real engine before a line was changed.
//
// 10 of its 14 tests are executed behaviour, including both premises and a
// negative control that ticks the rows off and proves the quiet comes back. The
// 4 source tests exist because the first fix was INCOMPLETE and the sweep is what
// found it: vetoing the calm pole left the verdict line under it still reading
// the unvetoed predicate, so "All quiet — you're genuinely set for now" would
// have rendered over three past-due rows anyway. Same fact, three authors in one
// file. A behaviour test reaches the branches it renders; this claim is about
// which predicate each of three branches READS, which is source by nature.
//
// One of the four is a claim about what the fix did NOT do — no `snoozedUntil` is
// written onto a task row — and that one can only ever be a source assertion: it
// pins the absence of the easier, dishonest fix.
// 42 -> 43 on 2026-09-23 for theBrandStringThatIsAlsoAStoredValue.test.js, with
// the reason this ratchet asks for. The product rename swept 17 files, and one
// string could not be renamed: `RSVP_METHODS` renders as an <option> whose text
// IS the value written to `client.rsvpMethod`, so changing it orphans every
// record already saved. The value is now frozen at the old wording and only the
// LABEL is renamed.
//
// The claim is that a specific literal in the source has NOT drifted — an
// absence, and absences are source by nature. An e2e could drive the select and
// read the rendered value attribute, but that proves the option currently
// offered, not that the stored constant is unchanged, and it is the constant
// that existing records match against. The CRA planner shell is also outside the
// hostv2 e2e harness entirely, so standing one up for a frozen surface scheduled
// for deletion would cost more than the claim is worth.
//
// It is a tripwire on a find-and-replace, which is exactly the failure that
// created it: the array reads as pure display copy at the call site, and the
// next person sweeping the brand has no reason to think otherwise. It is deleted
// with the CRA shell.
const MAX_HOSTV2_TEXT_GATES = 43;

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
