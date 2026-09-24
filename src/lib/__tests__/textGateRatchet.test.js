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
// ── 43 -> 44 (2026-09-23) ───────────────────────────────────────────────────
// `theDoorThatKeptTheOldName.test.js` reads hostv2/src/HostShellV2.jsx to assert
// the product's OLD name appears nowhere in shipping code outside a comment.
//
// It qualifies under this file's own rule — it asserts file CONTENT, not
// behavior — and the behavior half was written as e2e rather than bolted on
// here: `hostv2/e2e/whatSurvivedTheRetirement.spec.mjs` opens the app and reads
// the rendered body for "the Boss".
//
// WHY BOTH, rather than the e2e alone. The rename shipped with "Ask the Boss"
// live in five host-visible places precisely because the guard that proved it
// read `src/App.js` and matched the two-word product name only — the right check
// against the wrong half of the product. An e2e proves the screens it opens;
// this gate proves the SOURCE, including render sites no spec happens to visit.
// ── 44 -> 45 (2026-09-23) ───────────────────────────────────────────────────
// `engineReachesTheShippingShell.test.js` reads hostv2 source to build the
// IMPORT GRAPH — it parses `hostv2/src/main.jsx` and the modules it reaches, to
// answer whether a library export is reachable from the shipping entry point.
//
// It is the rare case where reading hostv2 as text is the only way. The claim is
// about the SHAPE OF THE GRAPH, not about behavior, so an e2e cannot make it:
// a browser shows what one screen does, and cannot show that nothing anywhere
// calls a function. That question is what let the air-travel invite floor ship
// into a shell nobody uses while its own tests stayed green.
// ── 45 -> 46 (2026-09-23) ───────────────────────────────────────────────────
// `everyBackendRouteHasACaller.test.js` reads hostv2 source to find the URLs the
// shell BUILDS, so it can tell a backend route with a caller from one without.
//
// An e2e cannot carry this claim for the same reason it could not carry the
// library version: a browser shows that one screen works, and can never show
// that NOTHING anywhere calls a route. The subject is the absence of a caller
// across the whole product, which is a fact about source text.
//
// It found kroger.py — 231 lines and three endpoints that no shell has ever
// called.
// ── 46 -> 47 (2026-09-23) ───────────────────────────────────────────────────
// `theClientAndTheRouterAgree.test.js` reads hostv2 source to assert an
// ABSENCE: no store-banner name ("Harris Teeter", "Fred Meyer", "Ralphs") is
// typed into the shell's own code. The family is named once, in
// lib/storePrices, and every surface imports it.
//
// An e2e cannot carry this. A browser shows the sentence a host reads; it
// cannot show that the same list is not written out a second time somewhere
// else in the file — and a second copy is exactly how the offer text and the
// empty-state message come to name different stores.
//
// It earned its keep immediately: the shell HAD a second copy, in a JSX comment
// listing nine banners, and this gate is what found it.
//
// The behaviour half of the same change — that the host is told the coverage
// limit BEFORE typing a ZIP — is deliberately NOT here. It is a claim about
// what renders, and it is driven in hostv2/e2e/threeLayersOfPrice.spec.mjs at
// all seven viewports.
// 47 -> 48 (2026-09-24): theStampCannotOutliveItsData.test.js.
//
// The price-vintage stamp read a hardcoded `PRICE_TABLE_META.asOf` of '2026-01'
// while NONE of the 533 dated price rows it labelled was older than 2026-08-14.
// The fix derives the label from the rows actually rendered, and the regression
// it has to prevent is STRUCTURAL: someone reintroducing a module-scope
// `PRICE_VINTAGE` constant, or re-importing the price table. A browser cannot
// carry that — it shows a month, and a wrong constant that happens to say the
// right month renders identically to a correct derivation.
//
// The behaviour half is deliberately NOT here. That the stamp renders the
// derived month is a claim about what a host reads, and it is driven in
// hostv2/e2e/priceVintageIsDerived.spec.mjs.
const MAX_HOSTV2_TEXT_GATES = 48;

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
    // ── COMMENTS ARE NOT GATES (2026-09-23) ────────────────────────────────
    // The sweep asks "does this file read hostv2 SOURCE". A file that merely
    // MENTIONS hostv2 in prose does not, and counting it inflates the number
    // this ratchet exists to make meaningful.
    //
    // It surfaced on `releaseProfiles.test.js`, which reads a GitHub workflow
    // YAML and never touches a hostv2 file — it tripped on one word in one
    // comment. That is the same mistake this file made about ITSELF on its
    // first run, recorded twenty lines above; the fix was an exclusion, which
    // worked for one file and not for the class.
    //
    // A ratchet bumped for non-reasons stops being a signal, so the heuristic
    // is narrowed instead: strip comments, then ask. Every genuine gate reads
    // hostv2 in CODE, so none is lost — the premise test below is what proves
    // the population did not collapse.
    const s = fs.readFileSync(f, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ');
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
