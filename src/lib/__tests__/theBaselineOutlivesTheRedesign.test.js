// ─── THE PRE-REDESIGN BASELINE OUTLIVES THE REDESIGN ────────────────────────
//
// OWNER REQUIREMENT, 2026-10-20: *"The existing Host V2 product must be
// preserved as a runnable, inspectable pre-redesign baseline throughout the
// redesign. Do NOT treat Git history alone as sufficient preservation."*
//
// ── WHY A TEST AND NOT A NOTE ──────────────────────────────────────────────
//
// The mechanism that satisfies this already exists and costs nothing: `?people=1`
// is OPT-IN, so the default URL *is* the pre-redesign People surface, running on
// the same shell, the same event blob and the same localStorage as the redesign.
// No Host V3, no duplicated shell, no second application.
//
// But "it happens to be opt-in" is not preservation — it is a property one
// character can delete. `peopleMode = q.get('people') === '1'` becomes
// `!== '0'` in a four-character edit, and the baseline stops existing at the
// same moment, silently, with every test still green because they all pass the
// flag explicitly. That is precisely the failure the repo keeps finding: a
// guarantee recorded in prose while the runtime moves.
//
// So the guarantee is a ratchet. It asserts the two things that actually keep
// the baseline runnable, and it fails loudly if either goes:
//
//   1. THE DEFAULT IS THE BASELINE — the flag is opt-in, not opt-out.
//   2. THE LEGACY BODY IS STILL THERE — the redesign is additive, so the old
//      surface has not been quietly deleted out from under the comparison.
//
// ── NOT ENFORCED HERE ──────────────────────────────────────────────────────
//
// That the baseline RENDERS is a browser fact, and jest cannot execute hostv2.
// `thePeopleZoneTellsTheTruth.spec.mjs`'s negative control covers it: with no
// flag, the redesigned sentences are absent from the sheet. This file guards the
// source-level invariants that make that control possible at all.
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const SHELL = path.join(ROOT, 'hostv2/src/HostShellV2.jsx');
const src = () => fs.readFileSync(SHELL, 'utf8');

// Block comments first, then line comments — the same strip order
// textGateRatchet and theClauseReadersAreNotOptional use, and for the same
// reason: this shell discusses its own flags in prose constantly, and a naive
// scan reports a paragraph as code.
const stripComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n')
  .map((l) => (/^\s*\/\//.test(l) ? '' : l.replace(/\/\/.*$/, '')))
  .join('\n');

describe('the redesign is opt-in, so the default is the baseline', () => {
  test('?people=1 is read as OPT-IN — an exact match, never a negation', () => {
    const code = stripComments(src());
    // The opt-in form. `=== '1'` means absent → false → legacy body.
    expect(code).toMatch(/peopleMode\s*=\s*q\.get\('people'\)\s*===\s*'1'/);
    // The opt-OUT forms, which would make the redesign the default and delete
    // the baseline as a runnable thing. `?elegant` uses `!== '0'` legitimately
    // because its cut is finished and host-approved; People's is not.
    expect(code).not.toMatch(/peopleMode\s*=\s*q\.get\('people'\)\s*!==/);
    expect(code).not.toMatch(/peopleMode\s*=\s*true/);
  });

  test('EVERY STRUCTURAL SWITCH CARRIES THE FLAG — not just the zone', () => {
    // FOUND BY AN AUDIT, NOT BY A TEST, AND THAT IS THE POINT.
    // `peopleRailUp` decides whether the whole guests sheet is wrapped in the
    // two-column `.people-grid` and whether the guest editor is hoisted out of
    // `.roster` into a rail. It shipped as `railUp && bp === 'desktop'` — no
    // flag term — so at desktop the PRE-REDESIGN surface was recomposed too,
    // losing 340px to a column that is always empty on that branch.
    //
    // Every test in the suite passed, because every test passes `?people=1`
    // explicitly. The opt-in assertion above cannot see this: the flag was read
    // correctly and then simply not consulted by the second switch. So the
    // guarantee is per-SWITCH, not per-flag.
    const code = stripComments(src());
    expect(code).toMatch(/peopleRailUp\s*=\s*peopleMode\s*&&/);
    // And the switches that consume it must not reintroduce the gap by
    // defaulting the other way.
    expect(code).not.toMatch(/peopleRailUp\s*=\s*railUp/);
  });

  test('THE GATE BITES — the flag really is in this file', () => {
    // Guard against a dead ratchet: if the flag is renamed or moved, the
    // assertions above would pass forever on an absent pattern.
    expect(stripComments(src())).toMatch(/\bpeopleMode\b/);
  });
});

describe('the legacy People surface is still there to compare against', () => {
  // Markers chosen from the legacy body's OWN distinctive strings and anchors —
  // things the redesign does not reproduce, so their presence means the old
  // surface still exists rather than that something merely looks similar.
  const LEGACY_MARKERS = [
    ['guests-counting-anchor', 'the by-list / by-headcount counting control'],
    ['Add names — one per line', 'the roster quick-add'],
    ['guests-entry-anchor', 'the headcount-mode stepper'],
    ['Share &amp; invite', 'the share/QR/draft block'],
    ['By headcount', 'the guestMode chips'],
  ];

  test('every legacy marker survives', () => {
    const code = src();
    const gone = LEGACY_MARKERS.filter(([m]) => !code.includes(m)).map(([m, what]) => `${m} (${what})`);
    // If this fails: a legacy People capability was deleted rather than
    // superseded. Retirement is NOT authorized — the owner requirement is that
    // a capability reaching parity is reported ELIGIBLE FOR RETIREMENT and
    // removed only on explicit approval. Restore it, or get that approval and
    // delete this row with the approval recorded beside it.
    expect(gone).toEqual([]);
  });

  test('the redesigned zones are ADDITIVE — both live in the same door', () => {
    const code = stripComments(src());
    // One Guests door either way (the Duplicate Surface Rule), with the new
    // zone composed inside it rather than replacing it.
    // The composed zones, by their current names. This list has moved twice —
    // AttendanceZone/NeedsZone -> AttendanceTruth/StillUnknown when the
    // art-direction references arrived, then AttendanceTruth ->
    // AttendanceDecision when the owner ruled that the estimate state "visually
    // becomes a configuration form… the decision is the story". The gate caught
    // both, which is the point: a rename is fine, a DELETION is what must not
    // pass quietly. AttendanceTruth is gone from PeopleSurface.jsx too, rather
    // than left behind as a second attendance component nothing renders.
    expect(code).toMatch(/<PeopleHero/);
    expect(code).toMatch(/<AttendanceDecision/);
    expect(code).toMatch(/<StillUnknown/);
    expect(code).toMatch(/\{peopleZone\}/);
    // And exactly one guests sheet RENDER, not a forked second one. Counting
    // every mention would be wrong and was: the shell also tests this kind in a
    // focus-scroll effect, which is a read, not a door.
    expect((code.match(/\{sheet\.kind === 'guests' && \(/g) || []).length).toBe(1);
  });
});
